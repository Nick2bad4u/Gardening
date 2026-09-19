import { readFile, stat } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const fixtureRoot = fileURLToPath(
    new URL("../.cache/storybook-pages", import.meta.url)
);
const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const fixturePrefix = "/Gardening/storybook/preview/";
const contentTypes = /** @type {Record<string, string>} */ ({
    ".css": "text/css",
    ".html": "text/html",
    ".jpg": "image/jpeg",
    ".js": "text/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
});

/**
 * Resolve only maintained browser modules, including the two Astro wrappers
 * whose explicit initializer calls must survive coverage instrumentation.
 *
 * @param {string} filename
 * @param {readonly unknown[]} sources
 */
export function sourceMapModule(filename, sources) {
    const entry = sources.at(-1);
    if (typeof entry !== "string") return undefined;
    const entryPath = entry.split("?", 1)[0] ?? "";
    const source = path.resolve(path.dirname(filename), entryPath);
    const relative = path
        .relative(repositoryRoot, source)
        .replaceAll("\\", "/");
    const initializers =
        /** @type {Record<string, { module: string; name: string }>} */ ({
            "site/client/profile-navigation.ts": {
                module: "site/client/profile-navigation.ts",
                name: "initializeProfileNavigation",
            },
            "site/client/profile.ts": {
                module: "site/client/profile.ts",
                name: "initializeProfilePhotos",
            },
            "site/components/PlantProfile.astro": {
                module: "site/client/profile.ts",
                name: "initializeProfilePhotos",
            },
            "site/components/ProfileNavigation.astro": {
                module: "site/client/profile-navigation.ts",
                name: "initializeProfileNavigation",
            },
        });
    const initializer = Object.hasOwn(initializers, relative)
        ? initializers[relative]
        : undefined;
    if (initializer) {
        const module = viteFileSystemUrl(
            path.join(repositoryRoot, initializer.module)
        );
        return `import { ${initializer.name} } from ${JSON.stringify(module)};\n${initializer.name}();`;
    }
    if (!/\.[jt]s$/v.test(entryPath)) return undefined;
    if (
        !/^(?:docs\/layouts\/|site\/client\/)[\w\-.\/]+\.[jt]s$/v.test(relative)
    ) {
        throw new Error(
            "Fixture source map is not a maintained browser module."
        );
    }
    return `export * from ${JSON.stringify(viteFileSystemUrl(source))};`;
}

/**
 * Vite's filesystem URL already supplies the POSIX root slash. A doubled slash
 * loads the module but gives browser coverage a different source ID.
 *
 * @param {string} source
 */
export function viteFileSystemUrl(source) {
    return path.posix.join("/@fs/", source.replaceAll("\\", "/"));
}

/**
 * Use the maintained module through Vite's browser coverage pipeline. Static
 * Storybook serves the ordinary Astro bundles unchanged.
 *
 * @param {string} filename
 */
async function originalModule(filename) {
    let sourceMap;
    try {
        sourceMap = await readFile(`${filename}.map`, "utf8");
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "ENOENT"
        )
            return undefined;
        throw error;
    }
    const map = /** @type {unknown} */ (JSON.parse(sourceMap));
    if (
        typeof map !== "object" ||
        map === null ||
        !("sources" in map) ||
        !Array.isArray(map.sources)
    )
        return undefined;
    return sourceMapModule(filename, map.sources);
}

/**
 * @param {import("node:http").IncomingMessage} request
 * @param {import("node:http").ServerResponse} response
 */
async function serveFixture(request, response) {
    const url = new URL(request.url ?? "/", "https://fixture.test");
    let filename = path.resolve(
        fixtureRoot,
        decodeURIComponent(url.pathname.slice(fixturePrefix.length))
    );
    if (
        filename !== fixtureRoot &&
        !filename.startsWith(`${fixtureRoot}${path.sep}`)
    ) {
        response.writeHead(403).end();
        return;
    }
    const info = await stat(filename);
    if (info.isDirectory()) filename = path.join(filename, "index.html");
    if (
        filename.endsWith(".js") &&
        filename.includes(`${path.sep}_astro${path.sep}`)
    ) {
        const sourceModule = await originalModule(filename);
        if (sourceModule !== undefined) {
            response.writeHead(200, { "Content-Type": "text/javascript" });
            response.end(sourceModule);
            return;
        }
    }
    const body = await readFile(filename);
    response.writeHead(200, {
        "Content-Type":
            contentTypes[path.extname(filename)] ?? "application/octet-stream",
    });
    response.end(body);
}

// Generated reports and builds must not reload previews or restart test watchers.
/** @type {import("vite").UserConfig} */
export const storybookViteConfig = {
    plugins: [
        {
            configureServer(server) {
                server.middlewares.use((request, response, next) => {
                    if (request.url?.startsWith(fixturePrefix) !== true) {
                        next();
                        return;
                    }
                    async function respond() {
                        try {
                            await serveFixture(request, response);
                        } catch {
                            response.writeHead(404).end();
                        }
                    }
                    void respond();
                });
            },
            name: "gardening-storybook-fixture-base",
        },
    ],
    server: {
        watch: {
            ignored: [
                "**/.cache/**",
                "**/.pages-site/**",
                "**/coverage/**",
                "**/storybook-static/**",
            ],
        },
    },
};
