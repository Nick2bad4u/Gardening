import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import sharp from "sharp";

import { isCollectionManifest, readJson } from "./build-data.mjs";

/** @typedef {{ bytes?: number; path: string; width: number }} PreviewVariant */
/** @typedef {Map<string, PreviewVariant[]>} CollectionPreviews */

const thumbnailPattern =
    /https:\/\/thumb\.gyazo\.com\/thumb\/\d+\/(?<id>[\da-f]{32})\.(?<extension>jpeg|jpg|png|webp)/gv;
const previewWidths = [
    320,
    640,
    960,
];

/**
 * Publish the currently displayed collection previews on the site's own origin.
 * Gyazo capture IDs are immutable, so cached thumbnails can survive later
 * builds.
 *
 * @param {string[]} documents - Generated HTML pages containing selected
 *   previews.
 * @param {string} repositoryRoot - Repository directory containing the private
 *   build cache.
 * @param {string} outputDirectory - Directory containing the Pages artifact.
 * @param {{ onUnavailable?: (id: string, error: Error) => void }} [options]
 *
 * @returns {Promise<CollectionPreviews>} Responsive variants by capture ID.
 */
export async function publishCollectionPreviews(
    documents,
    repositoryRoot,
    outputDirectory,
    { onUnavailable } = {}
) {
    const captures = new Map(
        documents.flatMap((html) =>
            html
                .matchAll(thumbnailPattern)
                .map(
                    /** @returns {[string, string]} */ (match) => {
                        const id = match.groups?.["id"];
                        const extension = match.groups?.["extension"];
                        if (id === undefined || extension === undefined)
                            throw new Error(
                                "Incomplete collection thumbnail reference."
                            );
                        return [id, extension];
                    }
                )
                .toArray()
        )
    );
    const cacheDirectory = path.join(
        repositoryRoot,
        ".cache",
        "collection-previews-v1"
    );
    const assetDirectory = path.join(
        outputDirectory,
        "assets",
        "collection-previews"
    );
    await Promise.all([
        mkdir(cacheDirectory, { recursive: true }),
        mkdir(assetDirectory, { recursive: true }),
    ]);
    /** @type {CollectionPreviews} */
    const previews = new Map();

    // A small bounded batch avoids overwhelming the image provider during a cold build.
    const entries = [...captures];
    for (let index = 0; index < entries.length; index += 4) {
        // eslint-disable-next-line no-await-in-loop -- Limit concurrent downloads and Sharp decoders to four captures.
        await Promise.all(
            entries.slice(index, index + 4).map(async ([id, extension]) => {
                const cachePath = path.join(
                    cacheDirectory,
                    `${id}.${extension}`
                );
                let bytes = await readCachedPreview(cachePath);
                if (bytes === undefined) {
                    bytes = await downloadOptionalCapture(
                        id,
                        extension,
                        repositoryRoot,
                        onUnavailable
                    );
                    if (bytes === undefined) return;
                    // Decode before caching: an HTML error response must never become a saved preview.
                    await sharp(bytes, {
                        limitInputPixels: 40_000_000,
                    }).metadata();
                    await writeFile(cachePath, bytes);
                }
                const metadata = await sharp(bytes, {
                    limitInputPixels: 40_000_000,
                }).metadata();
                const sourceWidth = metadata.autoOrient.width;
                const widths = [
                    ...previewWidths.filter((width) => width < sourceWidth),
                    Math.min(sourceWidth, 960),
                ];
                /** @type {PreviewVariant[]} */
                const variants = [];
                for (const width of widths) {
                    const relativePath = `assets/collection-previews/${id}.w${width}.webp`;
                    // eslint-disable-next-line no-await-in-loop -- Encode one variant per capture at a time to bound memory.
                    const info = await sharp(bytes, {
                        limitInputPixels: 40_000_000,
                    })
                        .rotate()
                        .resize({ width, withoutEnlargement: true })
                        .webp({ effort: 4, quality: 80 })
                        .toFile(path.join(outputDirectory, relativePath));
                    variants.push({
                        bytes: info.size,
                        path: relativePath,
                        width: info.width,
                    });
                }
                previews.set(id, variants);
            })
        );
    }
    return previews;
}

/**
 * Use local responsive previews while preserving Gyazo links and photo
 * attribution.
 *
 * @param {string} html - Published HTML.
 * @param {CollectionPreviews} previews - Prepared variants indexed by capture
 *   ID.
 * @param {string} prefix - Relative path from this page to the site's root.
 *
 * @returns {string} HTML with all selected thumbnails hosted on the Pages
 *   origin.
 */
export function rewriteCollectionPreviews(html, previews, prefix) {
    return html.replaceAll(/<img\b[^>]*>/gv, (imageTag) => {
        const match = imageTag.matchAll(thumbnailPattern).next().value;
        const id = match?.groups?.["id"];
        if (id === undefined) return imageTag;
        const variants = previews.get(id);
        const largest = variants?.at(-1);
        if (!variants || !largest)
            throw new Error(`Missing published collection preview: ${id}.`);
        const srcset = variants
            .map((variant) => `${prefix}${variant.path} ${variant.width}w`)
            .join(", ");
        const openingTag = imageTag
            .replace(/\bsrc="[^"]*"/v, () => `src="${prefix}${largest.path}"`)
            .replace(/\bsrcset="[^"]*"/v, "")
            .slice(0, -1)
            .trimEnd()
            .replace(/\/$/v, "")
            .trimEnd();
        return `${openingTag} srcset="${srcset}">`;
    });
}

/**
 * Show an absence state without changing enclosing capture links or captions.
 * Only IDs explicitly reported unavailable qualify; other missing previews
 * fail.
 *
 * @param {string} html @param {Set<string>} unavailableIds
 */
export function rewriteUnavailableCollectionPreviews(html, unavailableIds) {
    return html.replaceAll(/<img\b[^>]*>/gv, (imageTag) => {
        const match = imageTag.matchAll(thumbnailPattern).next().value;
        const id = match?.groups?.["id"];
        if (id === undefined || !unavailableIds.has(id)) return imageTag;
        return `<span class="photo-unavailable" role="img" aria-label="Collection photo preview unavailable" data-unavailable-capture="${id}">Photo preview unavailable</span>`;
    });
}

/** @param {string} id @param {string} extension @param {string} repositoryRoot */
async function downloadCapture(id, extension, repositoryRoot) {
    try {
        return await downloadImage(
            `https://thumb.gyazo.com/thumb/960/${id}.${extension}`
        );
    } catch (error) {
        const manifest = await readJson(
            path.join(
                repositoryRoot,
                "assets/collection-photos/photo-manifest.json"
            ),
            isCollectionManifest
        );
        const photos = Iterator.concat(
            manifest.collection_overviews,
            ...manifest.plants.map((plant) => plant.photos)
        );
        const urls = new Set(
            photos
                .filter((photo) => photo.image_id === id)
                .map((photo) => photo.image_url)
        );
        if (urls.size !== 1)
            throw new Error(
                `No unique reviewed original for collection preview ${id}.`,
                { cause: error }
            );
        const imageUrl = urls.values().next().value;
        if (imageUrl === undefined)
            throw new Error(`Missing original for ${id}.`, { cause: error });
        const parsed = new URL(imageUrl);
        if (
            parsed.origin !== "https://i.gyazo.com" ||
            parsed.pathname !== `/${id}.${extension}` ||
            parsed.search !== "" ||
            parsed.hash !== ""
        ) {
            throw new Error(
                `Untrusted fallback URL for collection preview ${id}.`,
                { cause: error }
            );
        }
        return downloadImage(imageUrl);
    }
}

/** @param {string} url @returns {Promise<Buffer>} */
async function downloadImage(url) {
    let failure;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        if (attempt > 0) {
            // eslint-disable-next-line no-await-in-loop -- Retry backoff must finish before the next network attempt.
            await delay(1000 * attempt);
        }
        let response;
        try {
            // eslint-disable-next-line no-await-in-loop -- Three sequential attempts bound retries per capture.
            response = await fetch(url, {
                signal: AbortSignal.timeout(60_000),
            });
        } catch (error) {
            failure = error;
        }
        if (response !== undefined) {
            if (response.ok) return responseBytes(response);
            failure = new Error(
                `Collection preview download: HTTP ${response.status} (${url}).`
            );
            if (response.status !== 429 && response.status < 500) break;
        }
    }
    throw new DOMException(
        `Collection preview download failed: ${url}: ${String(failure)}`,
        "CollectionPreviewUnavailable"
    );
}

/**
 * @param {string} id @param {string} extension @param {string} repositoryRoot
 * @param {((id: string, error: Error) => void) | undefined} onUnavailable
 */
async function downloadOptionalCapture(
    id,
    extension,
    repositoryRoot,
    onUnavailable
) {
    try {
        return await downloadCapture(id, extension, repositoryRoot);
    } catch (error) {
        if (
            onUnavailable === undefined ||
            !(error instanceof DOMException) ||
            error.name !== "CollectionPreviewUnavailable"
        )
            throw error;
        onUnavailable(id, error);
        return undefined;
    }
}

/** @param {string} filename @returns {Promise<Buffer | undefined>} */
async function readCachedPreview(filename) {
    try {
        return await readFile(filename);
    } catch (error) {
        if (
            // eslint-disable-next-line canonical/no-use-extend-native -- Error.isError is native in the required Node 26 runtime.
            !Error.isError(error) ||
            !("code" in error) ||
            error.code !== "ENOENT"
        )
            throw error;
        return undefined;
    }
}

/** @param {Response} response */
async function responseBytes(response) {
    return Buffer.from(await response.arrayBuffer());
}
