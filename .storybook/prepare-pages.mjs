import { mkdir, readFile, writeFile } from "node:fs/promises";

import { renderReport } from "../scripts/build-daily-report.mjs";
import { validateReport } from "../scripts/daily-report-model.mjs";

// Copy only the public browser surfaces. Production sources remain untouched.
export async function preparePages() {
    const root = new URL("../", import.meta.url);
    const output = new URL(".cache/storybook-pages/", root);
    const photoPlaceholder = `data:image/svg+xml,${encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="#e8e7dd"/><text x="320" y="240" text-anchor="middle" fill="#34483c" font-size="22">Photo preview omitted in Storybook</text></svg>'
    )}`;
    const pages = [
        "plant-booklet/index.html",
        "layouts/plant-tracker.html",
        "layouts/plant-history.html",
        "layouts/photo-album.html",
        "layouts/grow-spot-layout.html",
        "layouts/indoor-acclimation-calendar.html",
        "layouts/daily-report.html",
    ];
    const assets = [
        "plant-booklet/booklet.js",
        "plant-booklet/booklet.css",
        "plant-booklet/plant-icons.svg",
        "plant-booklet/favicon.svg",
        "plant-booklet/cactus-cursor.svg",
        "layouts/plant-tracker.js",
        "layouts/plant-tracker-data.js",
        "layouts/plant-history.js",
        "layouts/plant-charts.js",
        "layouts/plant-tracker.css",
        "layouts/plant-profile-data.json",
        "layouts/daily-report.css",
        "layouts/daily-report.js",
    ];
    await Promise.all(
        ["plant-booklet/", "layouts/"].map(async (directory) => {
            await mkdir(new URL(directory, output), { recursive: true });
            await writeChangedFile(
                new URL(`${directory}storybook-fixture.js`, output),
                await readFile(
                    new URL("test/stories/fixtures/page-bootstrap.js", root)
                )
            );
        })
    );
    await Promise.all(
        pages.map(async (page) => {
            // Report scenarios use a fixed fixture, independent of daily care changes.
            const source =
                page === "layouts/daily-report.html"
                    ? await reportPreview(root)
                    : await readFile(new URL(`docs/${page}`, root), "utf8");
            const html = source
                .replaceAll(
                    /srcset="[^"]*https:\/\/thumb\.gyazo\.com\/[^"]*"/gv,
                    ""
                )
                .replaceAll(
                    /src="https:\/\/thumb\.gyazo\.com\/[^\s"]*"/gv,
                    () => `src="${photoPlaceholder}"`
                )
                .replace(
                    "<head>",
                    '<head><script src="./storybook-fixture.js"></script>'
                );
            await writeChangedFile(new URL(page, output), html);
        })
    );
    await Promise.all(
        assets.map(async (asset) =>
            writeChangedFile(
                new URL(asset, output),
                await readFile(new URL(`docs/${asset}`, root))
            )
        )
    );
    return [
        { from: "../assets", to: "/assets" },
        { from: "../.cache/storybook-pages", to: "/docs" },
    ];
}

/**
 * Preserve unchanged preview files so starting the test worker cannot reload a
 * running story.
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
        if (
            typeof error !== "object" ||
            error === null ||
            !("code" in error) ||
            error.code !== "ENOENT"
        )
            throw error;
    }
    await writeFile(destination, next);
}

/** @param {URL} root */
async function reportPreview(root) {
    const [
        data,
        template,
        profileData,
    ] = await Promise.all([
        readFile(new URL("test/fixtures/daily-report.json", root), "utf8"),
        readFile(new URL("scripts/templates/daily-report.html", root), "utf8"),
        readFile(new URL("docs/layouts/plant-profile-data.json", root), "utf8"),
    ]);
    const parsedProfiles = /** @type {unknown} */ (JSON.parse(profileData));
    const profiles = /** @type {Record<string, [string, string][]>} */ (
        parsedProfiles
    );
    return renderReport(validateReport(JSON.parse(data)), template, profiles);
}
