import { randomUUID } from "node:crypto";
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
    isCollectionManifest,
    isPhotoManifest,
    readJson,
} from "./build-data.mjs";
import {
    publishCollectionPreviews,
    rewriteCollectionPreviews,
    rewriteUnavailableCollectionPreviews,
} from "./collection-previews.mjs";

/** @typedef {{ bytes: number; path: string; width: number }} PlantImageVariant */
/** @typedef {{ relativePath: string; variants: PlantImageVariant[] }} PlantImage */
/** @typedef {Map<string, PlantImage>} PlantImages */

const { env } = process;
const scriptDirectory = import.meta.dirname;
const repositoryRoot = path.resolve(scriptDirectory, "..");
const artworkDirectory = path.join(repositoryRoot, "assets", "artwork");
const publicDirectory = path.join(repositoryRoot, ".cache", "site-public");
const layoutsDirectory = path.join(repositoryRoot, "docs", "layouts");
const outputDirectory = path.resolve(
    repositoryRoot,
    env["GARDENING_SITE_OUT_DIR"] ?? ".pages-site"
);
const pagesUrl = "https://nick2bad4u.github.io/Gardening/";
const googleTagManagerId = "GTM-T8J6HPLF";
const optimizedPlantImageWidths = [
    480,
    960,
    1440,
];

/**
 * @param {string} html
 * @param {string} url
 */
function addCanonical(html, url) {
    const output = html.replace(
        /<\/title\s*>/iv,
        (closingTag) =>
            `${closingTag}\n        <link rel="canonical" href="${url}">`
    );
    if (output === html)
        throw new Error(
            "Could not insert the canonical URL after the page title."
        );
    return output;
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
    const relative = path.relative(directory, resolved);
    if (
        relative === "" ||
        relative === ".." ||
        relative.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relative)
    ) {
        throw new Error(`Asset path leaves its directory: ${relativePath}`);
    }
    return resolved;
}

/**
 * @param {string} relativePath
 * @param {string} [destinationDirectory]
 */
async function copyRelativeFile(
    relativePath,
    destinationDirectory = outputDirectory
) {
    const source = containedPath(repositoryRoot, relativePath);
    const destination = containedPath(destinationDirectory, relativePath);
    const sourceStats = await stat(source);

    if (!sourceStats.isFile()) {
        throw new Error(`Pages asset is not a file: ${relativePath}`);
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
    return sourceStats.size;
}

/** @param {string} directory @returns {Promise<string[]>} */
async function filesUnder(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
        entries.map(async (entry) => {
            const filename = containedPath(directory, entry.name);
            if (entry.isSymbolicLink())
                throw new Error(
                    `Publication input cannot be a symlink: ${filename}`
                );
            if (entry.isDirectory()) return filesUnder(filename);
            return entry.isFile() ? [filename] : [];
        })
    );
    return nested.flat();
}

/**
 * Optimize only images actually rendered by Astro, then add production-only
 * analytics. Compatibility redirects never receive a pageview installation.
 *
 * @param {{ analytics?: boolean }} [options]
 */
async function finalizePublishedSite({
    analytics = env["GARDENING_SITE_FIXTURES"] !== "1" &&
        env["ASTRO_SITE_ANALYTICS"] !== "off",
} = {}) {
    const isFixtureBuild = env["GARDENING_SITE_FIXTURES"] === "1";
    const outputFiles = await filesUnder(outputDirectory);
    const filenames = outputFiles.filter((filename) =>
        filename.endsWith(".html")
    );
    const sourceDocuments = await Promise.all(
        filenames.map((filename) => readFile(filename, "utf8"))
    );
    const documents = isFixtureBuild
        ? sourceDocuments.map((html) =>
              rewriteFixturePreviews(html, env["GARDENING_SITE_BASE"])
          )
        : sourceDocuments;
    if (isFixtureBuild) {
        const placeholder = containedPath(
            outputDirectory,
            "assets/fixture-collection-preview.svg"
        );
        await mkdir(path.dirname(placeholder), { recursive: true });
        await writeFile(
            placeholder,
            '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640" role="img" aria-label="Synthetic collection photo fixture"><rect width="960" height="640" fill="#dbe5d8"/><circle cx="480" cy="270" r="130" fill="#618468"/><path d="M350 400h260l-35 160H385z" fill="#a97952"/></svg>',
            "utf8"
        );
    }
    const references = new Set(
        documents.flatMap((html) =>
            html
                .matchAll(
                    /\bsrc="\/Gardening\/(?<asset>assets\/plants\/[^"#?]+)"/gv
                )
                .map((match) => {
                    const asset = match.groups?.["asset"];
                    if (asset === undefined)
                        throw new Error("Incomplete reference photo path.");
                    return asset;
                })
                .toArray()
        )
    );
    const optimizedImages = await optimizePlantImages(references);
    /** @type {Set<string>} */
    const unavailableIds = new Set();
    /** @type {import("./collection-previews.mjs").CollectionPreviews} */
    const collectionPreviews = isFixtureBuild
        ? new Map()
        : await publishCollectionPreviews(
              documents,
              repositoryRoot,
              outputDirectory,
              {
                  onUnavailable: (id, error) => {
                      unavailableIds.add(id);
                      console.warn(
                          `Collection preview ${id} unavailable after retries and verified-source fallback: ${error.message}`
                      );
                  },
              }
          );
    await Promise.all(
        filenames.map(async (filename, index) => {
            let html = documents[index];
            if (html === undefined)
                throw new Error(`Missing page: ${filename}`);
            html = rewriteCollectionPreviews(
                rewritePublishedPlantImages(
                    rewriteUnavailableCollectionPreviews(html, unavailableIds),
                    optimizedImages
                ),
                collectionPreviews,
                "/Gardening/"
            );
            const isRedirect = /<meta\s+name=["']gardening-redirect["']/v.test(
                html
            );
            if (analytics && !isFixtureBuild && !isRedirect) {
                html = injectGoogleTagManager(html);
                assertPublishedAnalytics(html, filename);
            }
            if (
                !isRedirect &&
                !/<link\b[^>]+\brel=["']canonical["']/v.test(html)
            ) {
                throw new Error(`Missing canonical URL: ${filename}`);
            }
            if (
                /file:\/\/|C:\\Users\\|source_path|GYAZO_OAUTH_ACCESS_TOKEN/v.test(
                    html
                )
            ) {
                throw new Error(
                    `Private source reference in publication: ${filename}`
                );
            }
            await writeFile(filename, html, "utf8");
        })
    );
    const previewStatusPath = containedPath(
        outputDirectory,
        "assets/collection-preview-status.json"
    );
    await mkdir(path.dirname(previewStatusPath), { recursive: true });
    await writeFile(
        previewStatusPath,
        `${JSON.stringify(
            {
                available: collectionPreviews.size,
                unavailable: [...unavailableIds].map((id) => ({
                    captureUrl: `https://gyazo.com/${id}`,
                    id,
                })),
            },
            null,
            2
        )}\n`,
        "utf8"
    );
    // Originals are only staging inputs; retain named logger evidence assets.
    for (const reference of references) {
        // eslint-disable-next-line no-await-in-loop -- Remove each known single staged file after all pages were rewritten.
        await rm(containedPath(outputDirectory, reference), { force: true });
    }
    return {
        pageCount: filenames.length,
        previewCount: collectionPreviews.size,
        referenceImageCount: references.size,
        unavailablePreviewCount: unavailableIds.size,
    };
}

/** @param {string} source @param {string} [siteBase] */
function findLoggerAssetReferences(source, siteBase = pagesUrl) {
    // Keep historical URL casing compatible while deriving the prefix from
    // the same canonical base used by the published pages.
    // eslint-disable-next-line canonical/no-use-extend-native -- RegExp.escape is native in the required Node 26 runtime.
    const escapedBase = RegExp.escape(siteBase);
    // eslint-disable-next-line security/detect-non-literal-regexp -- The only variable pattern fragment is escaped as literal URL text.
    const pattern = new RegExp(
        String.raw`${escapedBase}(?<reference>assets/(?:collection-photos|nursery-labels)/[^"#?]+\.(?:jpe?g|png|webp))`,
        "giv"
    );
    return source
        .matchAll(pattern)
        .map((match) => {
            const reference = match.groups?.["reference"];
            if (reference === undefined)
                throw new Error("Incomplete logger asset reference.");
            return reference;
        })
        .toArray();
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
                if (d.documentElement.hasAttribute("data-gardening-redirecting")) return;
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
    const withHead = html
        .replace(/<head\b[^>]*>/iv, (openingTag) => `${openingTag}\n`)
        .replace(
            /<\/head\s*>/iv,
            (closingTag) => `${headSnippet}\n${closingTag}`
        );
    const withBody = withHead.replace(
        /<body\b[^>]*>/iv,
        (/** @type {string} */ openingTag) =>
            `${openingTag}\n        ${bodySnippet}`
    );

    if (
        withBody === withHead ||
        !withHead.includes(headSnippet) ||
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
        /<\/head\s*>/iv,
        (closingTag) => `        ${eventSnippet}\n    ${closingTag}`
    );

    if (withEvent === html) {
        throw new Error("Could not inject the page-not-found event.");
    }
    return withEvent;
}

async function main() {
    const directory = path.join(
        repositoryRoot,
        ".cache",
        `site-public-${randomUUID()}`
    );
    await prepareSiteAssets({ directory });
    const { build } = await import("astro");
    await build({ publicDir: directory });
    const summary = await finalizePublishedSite();
    // The exact snapshot was validated under the repository cache by preparation.
    await rm(directory, { force: true, recursive: true });
    console.log(
        `Built ${summary.pageCount} Astro pages, ${summary.referenceImageCount} responsive reference-photo sets and ${summary.previewCount} collection previews.`
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
    const sourceWidth = metadata.autoOrient.width;
    if (!Number.isSafeInteger(sourceWidth) || sourceWidth <= 0) {
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
 * Prepare only reviewed source assets. This command never calls a source
 * generator, reads private photo mappings, or rewrites the logger.
 *
 * @param {{ directory?: string }} [options]
 */
async function prepareSiteAssets({ directory = publicDirectory } = {}) {
    // Both default preview assets and isolated build snapshots stay under .cache.
    if (path.dirname(directory) !== path.join(repositoryRoot, ".cache"))
        throw new Error("Public assets must stay under the repository cache.");
    if (
        directory !== publicDirectory &&
        !/^site-public-[\d\-a-f]{36}$/v.test(path.basename(directory))
    ) {
        throw new Error("Unexpected public asset directory.");
    }
    await rm(directory, { force: true, recursive: true });
    await mkdir(directory, { recursive: true });
    /** @type {Set<string>} */
    const references = new Set();
    const documents = await filesUnder(path.join(repositoryRoot, "docs"));
    const textSources = await Promise.all(
        documents
            .filter(
                (filename) =>
                    filename.endsWith(".md") ||
                    (filename.endsWith(".html") &&
                        path.dirname(filename) === layoutsDirectory)
            )
            .map((filename) => readFile(filename, "utf8"))
    );
    // Only named presentation assets and sanitized nursery derivatives qualify;
    // private camera originals and measurement archives are never glob-copied.
    for (const source of textSources) {
        for (const match of source.matchAll(
            /\b(?<asset>assets\/(?:layouts|nursery-labels)\/[\w\-.\/]+\.(?:csv|jpe?g|png|svg|webp))/giv
        )) {
            const reference = match.groups?.["asset"];
            if (reference !== undefined) references.add(reference);
        }
    }
    const logger = await readFile(
        path.join(repositoryRoot, "scripts/google-sheets/plant-tracker.gs"),
        "utf8"
    );
    for (const reference of findLoggerAssetReferences(logger))
        references.add(reference);
    const manifest = await readJson(
        path.join(repositoryRoot, "assets/plants/photo-manifest.json"),
        isPhotoManifest
    );
    for (const photo of manifest.photos) {
        if (
            !/^assets\/plants\/[\w\-\/]+\.(?:jpe?g|png|webp)$/iv.test(
                photo.file
            )
        ) {
            throw new Error(
                `Invalid licensed reference-photo path: ${photo.file}`
            );
        }
        references.add(photo.file);
    }
    const collectionManifest = await readJson(
        path.join(
            repositoryRoot,
            "assets/collection-photos/photo-manifest.json"
        ),
        isCollectionManifest
    );
    const nurseryFiles = [
        ...collectionManifest.nursery_label_archive_evidence.map(
            (evidence) => evidence.file
        ),
        ...collectionManifest.plants.flatMap((plant) =>
            plant.photos
                .filter((photo) => photo.kind === "nursery-label")
                .map((photo) => photo.source_file)
                .filter((filename) => filename !== undefined)
        ),
    ];
    for (const filename of nurseryFiles) {
        if (
            !/^assets\/nursery-labels\/[\w\-.]+\.(?:jpe?g|png|webp)$/iv.test(
                filename
            )
        )
            throw new Error(`Invalid nursery evidence path: ${filename}`);
        references.add(filename);
    }
    for (const relativeDirectory of ["assets/plant-icons", "assets/ui-icons"]) {
        // eslint-disable-next-line no-await-in-loop -- Only two explicit icon export directories are examined.
        const entries = await readdir(
            containedPath(repositoryRoot, relativeDirectory),
            { withFileTypes: true }
        );
        for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith(".svg"))
                references.add(`${relativeDirectory}/${entry.name}`);
        }
    }
    await mapWithConcurrency([...references], 4, async (reference) => {
        const destination = containedPath(directory, reference);
        await mkdir(path.dirname(destination), { recursive: true });
        if (/\.(?:jpe?g|png|webp)$/iv.test(reference)) {
            // Sharp drops metadata by default, including location-bearing EXIF.
            await sharp(containedPath(repositoryRoot, reference))
                .rotate()
                .toFile(destination);
        } else await copyRelativeFile(reference, directory);
    });
    const runtimeFiles = [
        "plant-tracker.js",
        "plant-tracker-data.js",
        "plant-sheet-cache.js",
        "plant-history.js",
        "plant-charts.js",
        "plant-profile-data.json",
    ];
    await mkdir(path.join(directory, "layouts"), { recursive: true });
    await Promise.all(
        runtimeFiles.map((filename) =>
            copyFile(
                containedPath(layoutsDirectory, filename),
                containedPath(directory, `layouts/${filename}`)
            )
        )
    );
    await Promise.all(
        [
            "plant-icons.svg",
            "favicon.svg",
            "cactus-cursor.svg",
        ].map((filename) =>
            copyFile(
                containedPath(artworkDirectory, filename),
                containedPath(directory, filename)
            )
        )
    );
    await writeFile(path.join(directory, ".nojekyll"), "", "utf8");
    return { assetCount: references.size, directory };
}

/** @param {string} html @param {string} [base] */
function rewriteFixturePreviews(html, base = "/Gardening/") {
    const previewPath = `${base.replace(/\/$/v, "")}/assets/fixture-collection-preview.svg`;
    return html.replaceAll(/<img\b[^>]*>/gv, (imageTag) => {
        if (!/\bsrc="https:\/\/(?:i|thumb)\.gyazo\.com\//v.test(imageTag))
            return imageTag;
        return imageTag
            .replace(/\bsrc="[^"]*"/v, () => `src="${previewPath}"`)
            .replace(/\bsrcset="[^"]*"/v, "");
    });
}

/** @param {string} html @param {PlantImages} optimizedImages */
function rewritePublishedPlantImages(html, optimizedImages) {
    return html.replaceAll(
        /<img\b[^>]*>/gv,
        (/** @type {string} */ imageTag) => {
            const source =
                /\bsrc="(?<prefix>\/Gardening\/|\.\/|\.\.\/|\.\.\/\.\.\/)(?<relativePath>assets\/plants\/[^"#?]+)"/v.exec(
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

if (isDirectRun) {
    if (process.argv.includes("--prepare")) await prepareSiteAssets();
    else await main();
}

export {
    addCanonical,
    containedPath,
    finalizePublishedSite,
    findLoggerAssetReferences,
    injectGoogleTagManager,
    injectPageNotFoundEvent,
    prepareSiteAssets,
    rewriteFixturePreviews,
    rewritePublishedPlantImages,
};
