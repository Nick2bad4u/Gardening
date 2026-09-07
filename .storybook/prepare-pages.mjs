import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

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
    ];
    await Promise.all(
        ["plant-booklet/", "layouts/"].map(async (directory) => {
            await mkdir(new URL(directory, output), { recursive: true });
            await copyFile(
                new URL("test/stories/fixtures/page-bootstrap.js", root),
                new URL(`${directory}storybook-fixture.js`, output)
            );
        })
    );
    await Promise.all(
        pages.map(async (page) => {
            const source = await readFile(
                new URL(`docs/${page}`, root),
                "utf8"
            );
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
            await writeFile(new URL(page, output), html);
        })
    );
    await Promise.all(
        assets.map((asset) =>
            copyFile(new URL(`docs/${asset}`, root), new URL(asset, output))
        )
    );
    return [
        { from: "../assets", to: "/assets" },
        { from: "../.cache/storybook-pages", to: "/docs" },
    ];
}
