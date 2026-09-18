import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { glob, mkdir, readFile, stat, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const output = new URL(".cache/storybook-pages/", root);
const fixtureBase = "/Gardening/storybook/preview";

/** @param {string} html */
export function injectFixture(html) {
    return html.replace(
        /<head\b[^>]*>/iv,
        (head) =>
            `${head}<script src="${fixtureBase}/storybook-fixture.js"></script>`
    );
}

/** Build the real Astro site with deterministic report and network fixtures. */
export async function preparePages() {
    const fingerprint = await sourceFingerprint();
    const stamp = new URL(".cache/storybook-site.sha256", root);
    let previous = "";
    try {
        previous = await readFile(stamp, "utf8");
    } catch (error) {
        if (!isMissing(error)) throw error;
    }
    if (previous !== fingerprint) {
        await buildFixture();
        await writeChangedFile(
            new URL("storybook-fixture.js", output),
            await readFile(
                new URL("test/stories/fixtures/page-bootstrap.js", root)
            )
        );
        const htmlFiles = glob("**/*.html", { cwd: output });
        for await (const filename of htmlFiles) {
            const destination = new URL(filename.replaceAll("\\", "/"), output);
            const html = await readFile(destination, "utf8");
            await writeChangedFile(destination, injectFixture(html));
        }
        await writeChangedFile(stamp, fingerprint);
    }
    return [
        { from: "../.cache/storybook-pages/assets", to: "/assets" },
        { from: "../.cache/storybook-pages", to: "/preview" },
    ];
}

/**
 * Preserve unchanged fixture files to avoid reloading an active preview.
 *
 * @param {URL} destination
 * @param {string | Uint8Array} content
 */
export async function writeChangedFile(destination, content) {
    const next = Buffer.from(content);
    try {
        const existing = await readFile(destination);
        if (existing.equals(next)) return;
    } catch (error) {
        if (!isMissing(error)) throw error;
    }
    await mkdir(new URL("./", destination), { recursive: true });
    await writeFile(destination, next);
}

/** @returns {Promise<void>} */
async function buildFixture() {
    // Vitest exposes its own Vite built-ins in process.env. They must not
    // override the independent Astro build's configured project base.
    const childEnvironment = { ...process.env };
    delete childEnvironment["BASE_URL"];
    delete childEnvironment["MODE"];
    delete childEnvironment["DEV"];
    delete childEnvironment["PROD"];
    return new Promise((resolve, reject) => {
        execFile(
            process.execPath,
            ["scripts/build-pages-site.mjs"],
            {
                cwd: root,
                env: {
                    ...childEnvironment,
                    ASTRO_SITE_ANALYTICS: "off",
                    GARDENING_REPORT_INPUT: "test/fixtures/daily-report.json",
                    GARDENING_SITE_BASE: fixtureBase,
                    GARDENING_SITE_FIXTURES: "1",
                    GARDENING_SITE_OUT_DIR: ".cache/storybook-pages",
                },
                maxBuffer: 8 * 1024 * 1024,
            },
            (error, stdout, stderr) => {
                if (error) {
                    reject(
                        new Error(
                            `Storybook fixture build failed.\n${stdout}\n${stderr}`,
                            { cause: error }
                        )
                    );
                } else {
                    resolve(undefined);
                }
            }
        );
    });
}

/** @param {unknown} error */
function isMissing(error) {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
    );
}

async function sourceFingerprint() {
    const digest = createHash("sha256");
    const filenames = [];
    const candidates = glob(
        [
            "site/**/*",
            "scripts/*.mjs",
            "docs/**/*.md",
            "docs/layouts/*",
            "docs/daily-reports/*.json",
            "assets/**/*.json",
            "assets/artwork/*.svg",
            "astro.config.ts",
            "package-lock.json",
            ".storybook/*.mjs",
            "test/fixtures/daily-report.json",
            "test/stories/fixtures/page-bootstrap.js",
        ],
        { cwd: root }
    );
    for await (const filename of candidates) {
        const location = new URL(filename.replaceAll("\\", "/"), root);
        const information = await stat(location);
        if (information.isFile()) filenames.push(filename);
    }
    const sorted = filenames.toSorted((left, right) =>
        left.localeCompare(right)
    );
    const contents = await Promise.all(
        sorted.map(async (filename) => {
            const location = new URL(filename.replaceAll("\\", "/"), root);
            return { content: await readFile(location), filename };
        })
    );
    for (const entry of contents) {
        digest.update(entry.filename);
        digest.update(entry.content);
    }
    return digest.digest("hex");
}
