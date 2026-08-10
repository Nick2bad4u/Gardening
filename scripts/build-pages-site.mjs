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

    let publishedHtml = sourceHtml
        .replace(
            "</title>",
            `</title>\n  <link rel="canonical" href="${pagesUrl}">`
        )
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
    ]);

    console.log(
        `Built GitHub Pages artifact with ${assetReferences.size} images (${(assetBytes / 1024 / 1024).toFixed(1)} MiB).`
    );
}

await main();
