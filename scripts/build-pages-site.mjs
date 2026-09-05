import {
    copyFile,
    mkdir,
    readdir,
    readFile,
    rm,
    stat,
    writeFile,
} from "node:fs/promises";
import * as path from "node:path";
import sharp from "sharp";

import {
    publishCollectionPreviews,
    rewriteCollectionPreviews,
} from "./collection-previews.mjs";

/** @typedef {{ bytes?: number; path: string; width: number }} PlantImageVariant */
/** @typedef {{ relativePath: string; variants: PlantImageVariant[] }} PlantImage */
/** @typedef {Map<string, PlantImage>} PlantImages */

const scriptDirectory = import.meta.dirname;
const repositoryRoot = path.resolve(scriptDirectory, "..");
const bookletDirectory = path.join(repositoryRoot, "docs", "plant-booklet");
const layoutsDirectory = path.join(repositoryRoot, "docs", "layouts");
const outputDirectory = path.join(repositoryRoot, ".pages-site");
const plantIconDirectory = path.join(repositoryRoot, "assets", "plant-icons");
const repositoryBlobUrl = "https://github.com/Nick2bad4u/Gardening/blob/main";
const pagesUrl = "https://nick2bad4u.github.io/Gardening/";
const googleTagManagerId = "GTM-T8J6HPLF";
const optimizedPlantImageWidths = [
    480,
    960,
    1440,
];
const layoutFileNames = [
    "grow-spot-layout.html",
    "indoor-acclimation-calendar.html",
    "plant-tracker.html",
    "plant-history.html",
    "photo-album.html",
];

/**
 * @param {string} html
 * @param {string} url
 */
function addCanonical(html, url) {
    return html.replace(
        "</title>",
        () => `</title>\n        <link rel="canonical" href="${url}">`
    );
}

/**
 * @param {string} html
 * @param {string} context
 */
function assertPublishedAnalytics(html, context) {
    const containerReferences = html.match(
        new RegExp(googleTagManagerId, "gv")
    );
    const hasScriptLoader =
        html.includes("//www.googletagmanager.com") &&
        html.includes('"/gtm.js?id="');
    if (
        !hasScriptLoader ||
        containerReferences?.length !== 2 ||
        !html.includes("googletagmanager.com/ns.html")
    ) {
        throw new Error(`${context} does not contain exactly one GTM install.`);
    }
}

/** @param {string} directory @param {string} relativePath */
function containedPath(directory, relativePath) {
    const resolved = path.resolve(directory, relativePath);
    if (!resolved.startsWith(`${directory}${path.sep}`)) {
        throw new Error(`Asset path leaves its directory: ${relativePath}`);
    }
    return resolved;
}

/**
 * @param {string} relativePath
 */
async function copyRelativeFile(relativePath) {
    const source = containedPath(repositoryRoot, relativePath);
    const destination = containedPath(outputDirectory, relativePath);
    const sourceStats = await stat(source);

    if (!sourceStats.isFile()) {
        throw new Error(`Pages asset is not a file: ${relativePath}`);
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
    return sourceStats.size;
}

/**
 * @param {string} relativePath
 */
function githubBlob(relativePath) {
    return `${repositoryBlobUrl}/${relativePath}`;
}

/**
 * @param {string} html
 */
function injectGoogleTagManager(html) {
    if (
        html.includes("<!-- Google Tag Manager -->") ||
        html.includes(`ns.html?id=${googleTagManagerId}`)
    ) {
        throw new Error(
            "Google Tag Manager is already present in source HTML."
        );
    }

    const headSnippet = `<!-- Google Tag Manager -->
        <script>
            ((w, d, s, l, i) => {
                w[l] = w[l] || [];
                w[l].push({ "gtm.start": Date.now(), event: "gtm.js" });
                const firstScript = d.getElementsByTagName(s)[0];
                const tagManagerScript = d.createElement(s);
                const dataLayerQuery = l === "dataLayer" ? "" : "&l=" + l;
                tagManagerScript.async = true;
                tagManagerScript.src =
                    "https:" +
                    "//www.googletagmanager.com" +
                    "/gtm.js?id=" +
                    i +
                    dataLayerQuery;
                firstScript.parentNode.insertBefore(
                    tagManagerScript,
                    firstScript
                );
            })(window, document, "script", "dataLayer", "${googleTagManagerId}");
        </script>
        <!-- End Google Tag Manager -->`;
    const bodySnippet = `<!-- Google Tag Manager (noscript) -->
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${googleTagManagerId}" title="Google Tag Manager" height="0" width="0" style="display: none; visibility: hidden" aria-hidden="true" tabindex="-1"></iframe></noscript>
        <!-- End Google Tag Manager (noscript) -->`;
    const withHead = html.replace(
        "<head>",
        () => `<head>\n        ${headSnippet}`
    );
    const withBody = withHead.replace(
        /<body[^>]*>/v,
        (/** @type {string} */ openingTag) =>
            `${openingTag}\n        ${bodySnippet}`
    );

    if (
        withBody === html ||
        !withBody.includes(`ns.html?id=${googleTagManagerId}`)
    ) {
        throw new Error("Could not inject both Google Tag Manager snippets.");
    }
    return withBody;
}

/**
 * @param {string} html
 */
function injectPageNotFoundEvent(html) {
    if (html.includes('event: "page_not_found"')) {
        throw new Error("The page-not-found event is already present.");
    }

    const eventSnippet = `<script>
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: "page_not_found",
                http_status: 404,
                page_location: window.location.href,
                page_path:
                    window.location.pathname +
                    window.location.search +
                    window.location.hash,
                page_referrer: document.referrer,
                page_title: document.title,
            });
        </script>`;
    const withEvent = html.replace(
        "</head>",
        () => `        ${eventSnippet}\n    </head>`
    );

    if (withEvent === html) {
        throw new Error("Could not inject the page-not-found event.");
    }
    return withEvent;
}

async function main() {
    const [
        sourceHtml,
        loggerSource,
        ...layoutSources
    ] = await Promise.all([
        readFile(path.join(bookletDirectory, "index.html"), "utf8"),
        readFile(
            path.join(
                repositoryRoot,
                "scripts",
                "google-sheets",
                "plant-tracker.gs"
            ),
            "utf8"
        ),
        ...layoutFileNames.map((fileName) =>
            readFile(path.join(layoutsDirectory, fileName), "utf8")
        ),
    ]);
    const pageAssetReferences = [sourceHtml, ...layoutSources]
        .flatMap((html) =>
            html
                .matchAll(
                    /\bsrc="\.\.\/\.\.\/(?<reference>assets\/(?:collection-photos|plants)\/[^"#?]+)"/gv
                )
                .toArray()
        )
        .map((match) => {
            const reference = match.groups?.["reference"];
            if (reference === undefined)
                throw new Error("Incomplete plant asset reference.");
            return reference;
        });
    const loggerAssetReferences = loggerSource
        .matchAll(
            /https:\/\/nick2bad4u\.github\.io\/gardening\/(?<reference>assets\/(?:collection-photos|nursery-labels)\/[^"#?]+\.(?:jpe?g|png|webp))/giv
        )
        .map((match) => {
            const reference = match.groups?.["reference"];
            if (reference === undefined)
                throw new Error("Incomplete logger asset reference.");
            return reference;
        })
        .toArray();
    const plantImageReferences = new Set(
        pageAssetReferences.filter((reference) =>
            reference.startsWith("assets/plants/")
        )
    );
    const assetReferences = new Set(
        Iterator.concat(
            pageAssetReferences.filter(
                (reference) => !reference.startsWith("assets/plants/")
            ),
            loggerAssetReferences
        )
    );

    let publishedHtml = addCanonical(sourceHtml, pagesUrl)
        .replaceAll('href="../layouts/', 'href="./layouts/')
        .replaceAll(
            /href="\.\.\/plants\/(?<relativePath>[^"#?]+)"/gv,
            (
                /** @type {string} */ _match,
                /** @type {string} */ relativePath
            ) => {
                const profilePath = `docs/plants/${relativePath}`;
                return `href="${githubBlob(profilePath)}"`;
            }
        )
        .replaceAll(
            /href="\.\.\/\.\.\/assets\/plants\/(?<relativePath>[^"#?]+\/README\.md)"/gv,
            (
                /** @type {string} */ _match,
                /** @type {string} */ relativePath
            ) => {
                const archivePath = `assets/plants/${relativePath}`;
                return `href="${githubBlob(archivePath)}"`;
            }
        )
        .replaceAll(
            /href="\.\.\/\.\.\/(?<relativePath>assets\/(?:measurements|nursery-labels)\/[^"#?]+)"/gv,
            (
                /** @type {string} */ _match,
                /** @type {string} */ relativePath
            ) => `href="${githubBlob(relativePath)}"`
        )
        .replaceAll(
            /href="\.\.\/\.\.\/(?<relativePath>assets\/collection-photos\/[^"#?]+\.(?:jpe?g|png))"/giv,
            (
                /** @type {string} */ _match,
                /** @type {string} */ relativePath
            ) => `href="${githubBlob(relativePath)}"`
        )
        .replaceAll(
            /\b(?<attribute>href|src)="\.\.\/\.\.\/(?<relativePath>assets\/collection-photos\/[^"#?]+)"/gv,
            '$<attribute>="./$<relativePath>"'
        )
        .replaceAll(
            /\b(?<attribute>href|src)="\.\.\/\.\.\/(?<relativePath>assets\/plants\/[^"#?]+)"/gv,
            '$<attribute>="./$<relativePath>"'
        );

    if (publishedHtml.includes("../../assets/")) {
        throw new Error(
            "The Pages HTML still contains an unpublished asset reference."
        );
    }

    await rm(outputDirectory, { force: true, recursive: true });
    await mkdir(outputDirectory, { recursive: true });
    await mkdir(path.join(outputDirectory, "layouts"), { recursive: true });

    const optimizedImages = await optimizePlantImages(plantImageReferences);
    const collectionPreviews = await publishCollectionPreviews(
        [sourceHtml, ...layoutSources],
        repositoryRoot,
        outputDirectory
    );
    publishedHtml = rewritePublishedPlantImages(publishedHtml, optimizedImages);
    publishedHtml = rewriteCollectionPreviews(
        publishedHtml,
        collectionPreviews,
        "./"
    );
    publishedHtml = injectGoogleTagManager(publishedHtml);
    assertPublishedAnalytics(publishedHtml, "field-guide index");
    const notFoundHtml = injectPageNotFoundEvent(publishedHtml).replace(
        "<head>",
        () => `<head>\n        <base href="${pagesUrl}">`
    );
    assertPublishedAnalytics(notFoundHtml, "field-guide 404");

    for (const reference of plantImageReferences) {
        if (publishedHtml.includes(`src="./${reference}"`)) {
            throw new Error(
                `The Pages HTML still loads an original plant image: ${reference}`
            );
        }
    }

    let assetBytes = optimizedImages
        .values()
        .flatMap((record) => record.variants)
        .reduce((sum, variant) => sum + variant.bytes, 0);
    const evidenceSizes = await mapWithConcurrency(
        [...assetReferences],
        4,
        copyRelativeFile
    );
    assetBytes += evidenceSizes.reduce((sum, size) => sum + size, 0);
    assetBytes += Iterator.concat(...collectionPreviews.values()).reduce(
        (sum, variant) => sum + (variant.bytes ?? 0),
        0
    );

    const plantIconEntries = await readdir(plantIconDirectory, {
        withFileTypes: true,
    });
    const plantIconRelativePaths = plantIconEntries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".svg"))
        .map((entry) => path.join("assets", "plant-icons", entry.name))
        .toSorted((left, right) => left.localeCompare(right));
    if (plantIconRelativePaths.length !== 38) {
        throw new Error(
            `Expected 36 profile and two shared-planter portraits for Pages but found ${plantIconRelativePaths.length}.`
        );
    }
    const plantIconSizes = await mapWithConcurrency(
        plantIconRelativePaths,
        4,
        copyRelativeFile
    );
    assetBytes += plantIconSizes.reduce((sum, size) => sum + size, 0);

    const uiIconNames = await readdir(
        path.join(repositoryRoot, "assets", "ui-icons")
    );
    const uiIconRelativePaths = uiIconNames
        .filter((name) => name.endsWith(".svg"))
        .map((name) => path.join("assets", "ui-icons", name))
        .toSorted((left, right) => left.localeCompare(right));
    if (uiIconRelativePaths.length !== 83) {
        throw new Error(
            `Expected 83 shared interface SVG exports for Pages but found ${uiIconRelativePaths.length}.`
        );
    }
    const uiIconSizes = await mapWithConcurrency(
        uiIconRelativePaths,
        4,
        copyRelativeFile
    );
    assetBytes += uiIconSizes.reduce((sum, size) => sum + size, 0);

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
        copyFile(
            path.join(bookletDirectory, "plant-icons.svg"),
            path.join(outputDirectory, "plant-icons.svg")
        ),
        copyFile(
            path.join(bookletDirectory, "cactus-cursor.svg"),
            path.join(outputDirectory, "cactus-cursor.svg")
        ),
        writeFile(
            path.join(outputDirectory, "index.html"),
            publishedHtml,
            "utf8"
        ),
        writeFile(path.join(outputDirectory, "404.html"), notFoundHtml, "utf8"),
        writeFile(path.join(outputDirectory, ".nojekyll"), "", "utf8"),
        publishLegacyBookletRedirect(),
        ...layoutFileNames.map((fileName) =>
            publishLayout(fileName, optimizedImages, collectionPreviews)
        ),
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
        publishPlantHistoryClient(),
        copyFile(
            path.join(layoutsDirectory, "plant-charts.js"),
            path.join(outputDirectory, "layouts", "plant-charts.js")
        ),
        copyFile(
            path.join(layoutsDirectory, "plant-profile-data.json"),
            path.join(outputDirectory, "layouts", "plant-profile-data.json")
        ),
    ]);

    console.log(
        `Built GitHub Pages artifact with GTM ${googleTagManagerId}, the field guide, five collection tools, ${optimizedImages.size} responsive plant-image sets, ${plantIconRelativePaths.length} standalone plant portraits, and ${assetReferences.size} copied evidence images (${(assetBytes / 1024 / 1024).toFixed(1)} MiB total).`
    );
}

/**
 * @template T, R
 *
 * @param {T[]} values
 * @param {number} concurrency
 * @param {(value: T) => Promise<R>} operation
 *
 * @returns {Promise<R[]>}
 */
async function mapWithConcurrency(values, concurrency, operation) {
    /** @type {R[]} */
    const results = [];
    const remaining = values.entries();
    async function worker() {
        for (const [index, value] of remaining) {
            // Each worker must finish its item before claiming another one.
            // eslint-disable-next-line no-await-in-loop -- Four workers bound Sharp's memory use.
            results[index] = await operation(value);
        }
    }
    await Promise.all(
        Array.from({ length: Math.min(concurrency, values.length) }, worker)
    );
    return results;
}

/** @param {string} relativePath @param {number} width */
function optimizedPlantImagePath(relativePath, width) {
    const extension = path.posix.extname(relativePath);
    return `${relativePath.slice(0, -extension.length)}.w${width}.webp`;
}

/**
 * @param {string} relativePath
 */
async function optimizePlantImage(relativePath) {
    const sourcePath = containedPath(repositoryRoot, relativePath);
    const metadata = await sharp(sourcePath).metadata();
    const isRotated = [
        5,
        6,
        7,
        8,
    ].includes(metadata.orientation ?? 1);
    const sourceWidth = isRotated ? metadata.height : metadata.width;
    if (sourceWidth === 0) {
        throw new Error(`Could not read image width: ${relativePath}`);
    }
    const maximumOptimizedWidth =
        optimizedPlantImageWidths.at(-1) ?? sourceWidth;

    // eslint-disable-next-line canonical/no-use-extend-native -- Array.prototype.toSorted is a standard ES2023 method.
    const widths = [
        ...new Set([
            ...optimizedPlantImageWidths.filter((width) => width < sourceWidth),
            Math.min(sourceWidth, maximumOptimizedWidth),
        ]),
    ].toSorted((left, right) => left - right);
    const variants = [];

    for (const width of widths) {
        const outputRelativePath = optimizedPlantImagePath(relativePath, width);
        const outputPath = containedPath(outputDirectory, outputRelativePath);
        // eslint-disable-next-line no-await-in-loop -- Finish each variant before starting another Sharp decoder.
        await mkdir(path.dirname(outputPath), { recursive: true });
        // eslint-disable-next-line no-await-in-loop -- Four outer workers bound image processing memory.
        const result = await sharp(sourcePath, { failOn: "warning" })
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .webp({
                alphaQuality: 90,
                effort: 4,
                quality: 80,
                smartSubsample: true,
            })
            .toFile(outputPath);
        variants.push({
            bytes: result.size,
            path: outputRelativePath.replaceAll("\\", "/"),
            width: result.width,
        });
    }

    return { relativePath, variants };
}

/**
 * @param {Set<string>} relativePaths
 */
async function optimizePlantImages(relativePaths) {
    const records = await mapWithConcurrency(
        // eslint-disable-next-line canonical/no-use-extend-native -- Array.prototype.toSorted is a standard ES2023 method.
        [...relativePaths].toSorted((left, right) => left.localeCompare(right)),
        4,
        optimizePlantImage
    );
    return new Map(records.map((record) => [record.relativePath, record]));
}

/**
 * @param {string} fileName
 * @param {PlantImages} optimizedImages
 * @param {import("./collection-previews.mjs").CollectionPreviews} collectionPreviews
 */
async function publishLayout(fileName, optimizedImages, collectionPreviews) {
    const sourceHtml = await readFile(
        path.join(layoutsDirectory, fileName),
        "utf8"
    );
    let publishedHtml = addCanonical(
        sourceHtml,
        `${pagesUrl}layouts/${fileName}`
    )
        .replaceAll("../plant-booklet/", "../")
        .replaceAll(
            /\b(?<attribute>href|src)="\.\.\/\.\.\/(?<relativePath>assets\/collection-photos\/[^"#?]+)"/gv,
            '$<attribute>="../$<relativePath>"'
        )
        .replaceAll(
            /href="\.\.\/equipment\/(?<relativePath>[^"#?]+\.md)"/gv,
            (
                /** @type {string} */ _match,
                /** @type {string} */ relativePath
            ) => {
                const equipmentPath = `docs/equipment/${relativePath}`;
                return `href="${githubBlob(equipmentPath)}"`;
            }
        )
        .replaceAll(
            /\b(?<attribute>href|src)="\.\.\/\.\.\/(?<relativePath>assets\/plants\/[^"#?]+)"/gv,
            '$<attribute>="../$<relativePath>"'
        );

    publishedHtml = rewritePublishedPlantImages(publishedHtml, optimizedImages);
    publishedHtml = rewriteCollectionPreviews(
        publishedHtml,
        collectionPreviews,
        "../"
    );
    publishedHtml = injectGoogleTagManager(publishedHtml);
    assertPublishedAnalytics(publishedHtml, fileName);

    if (publishedHtml.includes("../plant-booklet/")) {
        throw new Error(
            `${fileName} still contains an unpublished booklet path.`
        );
    }

    const destination = path.join(outputDirectory, "layouts", fileName);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, publishedHtml, "utf8");
}

async function publishLegacyBookletRedirect() {
    const directory = path.join(outputDirectory, "docs", "plant-booklet");
    await mkdir(directory, { recursive: true });
    await writeFile(
        path.join(directory, "index.html"),
        `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>The Fenton Collection · Plant field guide</title>
        <link rel="canonical" href="${pagesUrl}">
        <script>
            const destination = new URL("../../", location.href);
            destination.search = location.search;
            destination.hash = location.hash;
            location.replace(destination.href);
        </script>
    </head>
    <body><p><a href="../../">Open the plant field guide</a></p></body>
</html>
`,
        "utf8"
    );
}

async function publishPlantHistoryClient() {
    const sourcePath = path.join(layoutsDirectory, "plant-history.js");
    const sourceScript = await readFile(sourcePath, "utf8");
    const publishedScript = sourceScript.replaceAll(
        "../plant-booklet/#",
        "../#"
    );

    if (publishedScript.includes("../plant-booklet/")) {
        throw new Error(
            "plant-history.js still contains an unpublished booklet path."
        );
    }

    await writeFile(
        path.join(outputDirectory, "layouts", "plant-history.js"),
        publishedScript,
        "utf8"
    );
}

/** @param {string} html @param {PlantImages} optimizedImages */
function rewritePublishedPlantImages(html, optimizedImages) {
    return html.replaceAll(
        /<img\b[^>]*>/gv,
        (/** @type {string} */ imageTag) => {
            const source =
                /\bsrc="(?<prefix>\.\/|\.\.\/|\.\.\/\.\.\/)(?<relativePath>assets\/plants\/[^"#?]+)"/v.exec(
                    imageTag
                );
            if (!source) return imageTag;

            const prefix = source.groups?.["prefix"];
            const relativePath = source.groups?.["relativePath"];
            if (prefix === undefined || relativePath === undefined) {
                throw new Error("Incomplete responsive plant image reference.");
            }
            const record = optimizedImages.get(relativePath);
            if (record === undefined || record.variants.length === 0) {
                throw new Error(
                    `No optimized publication image exists for ${relativePath}.`
                );
            }
            const largest = record.variants.at(-1);
            if (largest === undefined)
                throw new Error(
                    `Missing plant image variant: ${relativePath}.`
                );
            const srcset = record.variants
                .map((variant) => `${prefix}${variant.path} ${variant.width}w`)
                .join(", ");
            const rewritten = imageTag.replace(
                source[0],
                () => `src="${prefix}${largest.path}"`
            );
            if (/\bsrcset=/v.test(rewritten)) {
                throw new Error(
                    `Plant image already has a srcset: ${relativePath}.`
                );
            }
            const responsiveAttributes = ` srcset="${srcset}"${/\bsizes=/v.test(rewritten) ? "" : ' sizes="100vw"'}`;
            const openingTag = rewritten
                .slice(0, -1)
                .trimEnd()
                .replace(/\/$/v, "")
                .trimEnd();
            return `${openingTag}${responsiveAttributes}>`;
        }
    );
}

const isDirectRun =
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === import.meta.filename;

if (isDirectRun) await main();

export {
    injectGoogleTagManager,
    injectPageNotFoundEvent,
    rewritePublishedPlantImages,
};
