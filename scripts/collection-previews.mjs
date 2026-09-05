import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import sharp from "sharp";

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
 *
 * @returns {Promise<CollectionPreviews>} Responsive variants by capture ID.
 */
export async function publishCollectionPreviews(
    documents,
    repositoryRoot,
    outputDirectory
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
                    const response = await fetch(
                        `https://thumb.gyazo.com/thumb/960/${id}.${extension}`,
                        {
                            signal: AbortSignal.timeout(60_000),
                        }
                    );
                    if (!response.ok)
                        throw new Error(
                            `Collection preview ${id}: HTTP ${response.status}.`
                        );
                    bytes = Buffer.from(await response.arrayBuffer());
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
