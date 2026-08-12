import {
    copyFile,
    mkdir,
    readFile,
    rm,
    stat,
    writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const bookletDirectory = path.join(repositoryRoot, "docs", "plant-booklet");
const layoutsDirectory = path.join(repositoryRoot, "docs", "layouts");
const outputDirectory = path.join(repositoryRoot, ".pages-site");
const repositoryBlobUrl = "https://github.com/Nick2bad4u/Gardening/blob/main";
const pagesUrl = "https://nick2bad4u.github.io/Gardening/";

async function copyRelativeFile(relativePath) {
    const source = path.join(repositoryRoot, relativePath);
    const destination = path.join(outputDirectory, relativePath);
    const sourceStats = await stat(source);

    if (!sourceStats.isFile()) {
        throw new Error(`Pages asset is not a file: ${relativePath}`);
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
    return sourceStats.size;
}

function githubBlob(relativePath) {
    return `${repositoryBlobUrl}/${relativePath}`;
}

function addCanonical(html, url) {
    return html.replace(
        "</title>",
        `</title>\n        <link rel="canonical" href="${url}">`
    );
}

async function publishLayout(fileName) {
    const sourceHtml = await readFile(
        path.join(layoutsDirectory, fileName),
        "utf8"
    );
    const publishedHtml = addCanonical(
        sourceHtml,
        `${pagesUrl}layouts/${fileName}`
    )
        .replaceAll("../plant-booklet/", "../")
        .replaceAll(
            /href="\.\.\/equipment\/([^"?#]+\.md)"/g,
            (_match, relativePath) =>
                `href="${githubBlob(`docs/equipment/${relativePath}`)}"`
        );

    if (/\.\.\/plant-booklet\//.test(publishedHtml)) {
        throw new Error(
            `${fileName} still contains an unpublished booklet path.`
        );
    }

    const destination = path.join(outputDirectory, "layouts", fileName);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, publishedHtml, "utf8");
}

async function main() {
    const sourceHtml = await readFile(
        path.join(bookletDirectory, "index.html"),
        "utf8"
    );
    const assetReferences = new Set(
        [
            ...sourceHtml.matchAll(
                /\bsrc="\.\.\/\.\.\/(assets\/(?:plants|collection-photos)\/[^"?#]+)"/g
            ),
        ].map((match) => match[1])
    );

    let publishedHtml = addCanonical(sourceHtml, pagesUrl)
        .replaceAll(/href="\.\.\/layouts\//g, 'href="./layouts/')
        .replaceAll(
            /href="\.\.\/plants\/([^"?#]+)"/g,
            (_match, relativePath) =>
                `href="${githubBlob(`docs/plants/${relativePath}`)}"`
        )
        .replaceAll(
            /href="\.\.\/\.\.\/assets\/plants\/([^"?#]+\/README\.md)"/g,
            (_match, relativePath) =>
                `href="${githubBlob(`assets/plants/${relativePath}`)}"`
        )
        .replaceAll(
            /href="\.\.\/\.\.\/(assets\/(?:measurements|nursery-labels)\/[^"?#]+)"/g,
            (_match, relativePath) => `href="${githubBlob(relativePath)}"`
        )
        .replaceAll(
            /\b(src|href)="\.\.\/\.\.\/(assets\/collection-photos\/[^"?#]+)"/g,
            '$1="./$2"'
        )
        .replaceAll(
            /\b(src|href)="\.\.\/\.\.\/(assets\/plants\/[^"?#]+)"/g,
            '$1="./$2"'
        );

    if (/\.\.\/\.\.\/assets\//.test(publishedHtml)) {
        throw new Error(
            "The Pages HTML still contains an unpublished asset reference."
        );
    }

    await rm(outputDirectory, { recursive: true, force: true });
    await mkdir(outputDirectory, { recursive: true });
    await mkdir(path.join(outputDirectory, "layouts"), { recursive: true });

    let assetBytes = 0;
    for (const relativePath of assetReferences) {
        assetBytes += await copyRelativeFile(relativePath);
    }

    await Promise.all([
        copyFile(
            path.join(bookletDirectory, "booklet.css"),
            path.join(outputDirectory, "booklet.css")
        ),
        copyFile(
            path.join(bookletDirectory, "booklet.js"),
            path.join(outputDirectory, "booklet.js")
        ),
        copyFile(
            path.join(bookletDirectory, "favicon.svg"),
            path.join(outputDirectory, "favicon.svg")
        ),
        writeFile(
            path.join(outputDirectory, "index.html"),
            publishedHtml,
            "utf8"
        ),
        writeFile(
            path.join(outputDirectory, "404.html"),
            publishedHtml,
            "utf8"
        ),
        writeFile(path.join(outputDirectory, ".nojekyll"), "", "utf8"),
        publishLayout("grow-spot-layout.html"),
        publishLayout("indoor-acclimation-calendar.html"),
        publishLayout("plant-tracker.html"),
        publishLayout("plant-history.html"),
        copyFile(
            path.join(layoutsDirectory, "plant-tracker.css"),
            path.join(outputDirectory, "layouts", "plant-tracker.css")
        ),
        copyFile(
            path.join(layoutsDirectory, "plant-tracker-data.js"),
            path.join(outputDirectory, "layouts", "plant-tracker-data.js")
        ),
        copyFile(
            path.join(layoutsDirectory, "plant-tracker.js"),
            path.join(outputDirectory, "layouts", "plant-tracker.js")
        ),
        copyFile(
            path.join(layoutsDirectory, "plant-history.js"),
            path.join(outputDirectory, "layouts", "plant-history.js")
        ),
        copyFile(
            path.join(layoutsDirectory, "plant-charts.js"),
            path.join(outputDirectory, "layouts", "plant-charts.js")
        ),
    ]);

    console.log(
        `Built GitHub Pages artifact with the field guide, four collection tools, and ${assetReferences.size} images (${(assetBytes / 1024 / 1024).toFixed(1)} MiB).`
    );
}

await main();
