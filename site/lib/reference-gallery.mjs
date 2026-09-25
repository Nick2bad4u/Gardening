import {
    isNonemptyString,
    isPhotoManifest,
    isRecord,
    readJson,
} from "../../scripts/build-data.mjs";

/** @typedef {"whole-plant" | "detail" | "flowers" | "habitat"} GalleryTopic */
/** @typedef {{ file: string; topic: GalleryTopic; caption: string }} GalleryAnnotation */
/** @typedef {import("./content.mjs").SiteProfile["allPhotos"][number]} ReferencePhoto */

const topics = [
    { id: "whole-plant", title: "Form and growth" },
    { id: "detail", title: "Look closer" },
    { id: "flowers", title: "Flowers and buds" },
    { id: "habitat", title: "In the landscape" },
];

/** @type {{ promise?: Promise<Map<string, GalleryAnnotation>> }} */
const annotationsCache = {};

/**
 * Group a profile's existing references without dropping images or changing
 * their attribution, scope, or scientific identity.
 *
 * @param {readonly ReferencePhoto[]} photos
 */
export async function getReferenceGallery(photos) {
    annotationsCache.promise ??= loadAnnotations();
    const annotations = await annotationsCache.promise;
    return topics
        .map((topic) => ({
            ...topic,
            photos: photos.flatMap((photo) => {
                const annotation = annotations.get(photo.file);
                if (!annotation)
                    throw new Error(
                        `Missing reference-gallery annotation: ${photo.file}`
                    );
                return annotation.topic === topic.id
                    ? [{ annotation, photo }]
                    : [];
            }),
        }))
        .filter((group) => group.photos.length > 0);
}

/**
 * @param {unknown} value @returns {value is { version: 1; photos:
 *   GalleryAnnotation[] }}
 */
export function isGalleryTopics(value) {
    return (
        isRecord(value) &&
        value["version"] === 1 &&
        Array.isArray(value["photos"]) &&
        value["photos"].every(
            (entry) =>
                isRecord(entry) &&
                typeof entry["file"] === "string" &&
                /^assets\/plants\/[\w\-\/]+\.(?:jpe?g|png|webp)$/iv.test(
                    entry["file"]
                ) &&
                topics.some((topic) => topic.id === entry["topic"]) &&
                isNonemptyString(entry["caption"])
        )
    );
}

/** Keep curation separate from the immutable licensed-photo metadata. */
async function loadAnnotations() {
    const [curation, manifest] = await Promise.all([
        readJson("assets/plants/gallery-topics.json", isGalleryTopics),
        readJson("assets/plants/photo-manifest.json", isPhotoManifest),
    ]);
    const files = new Set(manifest.photos.map((photo) => photo.file));
    const annotations = new Map(
        curation.photos.map((photo) => [photo.file, photo])
    );
    if (annotations.size !== curation.photos.length)
        throw new Error("Duplicate reference-gallery annotation.");
    if (
        files.size !== annotations.size ||
        [...files].some((file) => !annotations.has(file))
    )
        throw new Error(
            "Reference-gallery curation differs from the licensed archive."
        );
    return annotations;
}
