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
    const sources = /** @type {unknown[]} */ (map.sources);
    const entry = sources.at(-1);
    if (typeof entry !== "string" || !entry.endsWith(".js")) return undefined;
    const source = path.resolve(path.dirname(filename), entry);
    const relative = path
        .relative(repositoryRoot, source)
        .replaceAll("\\", "/");
    if (!/^(?:docs\/layouts\/|site\/client\/)[\w\-.\/]+\.js$/v.test(relative)) {
        throw new Error(
            "Fixture source map is not a maintained browser module."
        );
    }
    return viteFileSystemUrl(source);
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
            response.end(`export * from ${JSON.stringify(sourceModule)};`);
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
                "**/.pages-site/**",
                "**/coverage/**",
                "**/storybook-static/**",
            ],
        },
    },
};
