import assert from "node:assert/strict";
/**
 * @import {
 *   CollectionPhoto,
 *   GyazoCollection
 * } from "./build-data.mjs"
 */
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import * as path from "node:path";
import { compileFunction } from "node:vm";

import { sheetUrls } from "../docs/layouts/plant-tracker-data.js";
import {
    collectionPhotoDate,
    compareText,
    fulfilledValue,
    isCollectionManifest,
    isNonemptyString,
    isPhotoManifest,
    isProfileData,
    readJson,
    required,
} from "./build-data.mjs";

const nurseryLabelKind = "nursery-label";
const captureContext = "regular-expression capture";

const scriptDirectory = import.meta.dirname;
const repositoryRoot = path.resolve(scriptDirectory, "..");
const bookletDirectory = path.join(repositoryRoot, "docs", "plant-booklet");
const bookletPath = path.join(bookletDirectory, "index.html");
const iconSpritePath = path.join(bookletDirectory, "plant-icons.svg");
const photoAlbumDirectory = path.join(repositoryRoot, "docs", "layouts");
const photoAlbumPath = path.join(photoAlbumDirectory, "photo-album.html");
const manifestPath = path.join(
    repositoryRoot,
    "assets",
    "plants",
    "photo-manifest.json"
);
const collectionManifestPath = path.join(
    repositoryRoot,
    "assets",
    "collection-photos",
    "photo-manifest.json"
);
const collectionPhotosDirectory = path.dirname(collectionManifestPath);
const plantProfileDataPath = path.join(
    repositoryRoot,
    "docs",
    "layouts",
    "plant-profile-data.json"
);
const nurseryLabelsDirectory = path.join(
    repositoryRoot,
    "assets",
    "nursery-labels"
);
const profileGroups = [
    "starter",
    "cacti",
    "succulents",
    "rehab",
    "houseplants",
];
const allowedSubjects = new Set([
    "detail",
    "flower",
    "fruit-seed",
    "habit",
    "habitat",
    "young",
]);
const allowedLicense =
    /^(?:cc by(?: sa|-sa)?|cc0|no restrictions|public domain)/iv;
const allowedCollectionKinds = new Set(["collection", nurseryLabelKind]);
const allowedCollectionViews = new Set([
    "context",
    "detail",
    "label-back",
    "label-front",
    "opposite-side",
    "overview",
    "receipt-condition",
    "receipt-context",
    "side",
    "three-quarter",
    "top",
]);
const expectedTrackedProfiles = 35;
const expectedProfileCount = 36;
const expectedPresentProfiles = 35;
const expectedUnverifiedReceiptProfiles = 0;
const expectedHistoricalProfiles = 1;
const expectedCollectionOverviews = 3;
const expectedCollectionPlacements = 174;
const expectedUniqueGyazoImages = 128;
const expectedGyazoApplicationName = "Fenton Garden Field Guide";
const expectedGyazoThumbnailWidths = [
    480,
    960,
    1600,
];
const expectedPrivateSourceNote =
    "The publication is rendered from a full-resolution Google Photos export retained in the private source cache; its path is intentionally excluded from the public manifest.";
const publicFieldGuideUrl = "https://nick2bad4u.github.io/Gardening/";
const publicPhotoAlbumUrl = `${publicFieldGuideUrl}layouts/photo-album.html`;
const historicalCollectionSlug = "mammillaria-bombycina";
const expectedMountainCrestProfiles = new Map([
    [
        "austrocylindropuntia-subulata",
        { inventoryId: "Cactus-07", labelId: "H3", trackerId: "P26" },
    ],
    [
        "echeveria-raindrops",
        { inventoryId: "Succulent-07", labelId: "H2", trackerId: "P25" },
    ],
    [
        "gymnocalycium-mihanovichii-black-widow",
        { inventoryId: "Cactus-09", labelId: "G1", trackerId: "P27" },
    ],
    [
        "pleiospilos-nelii-royal-flush",
        { inventoryId: "Succulent-06", labelId: "G3", trackerId: "P28" },
    ],
    [
        "sempervivum-coconut-crystal",
        { inventoryId: "Succulent-08", labelId: "H1", trackerId: "P24" },
    ],
    [
        "tephrocactus-articulatus-papyracanthus",
        { inventoryId: "Cactus-08", labelId: "G2", trackerId: "P23" },
    ],
]);
const expectedHomeDepotProfiles = new Map([
    [
        "faucaria-tuberculosa",
        { inventoryId: "Succulent-09", labelId: "#5", trackerId: "P29" },
    ],
    [
        "tiny-mixed-succulent-planter",
        { inventoryId: "Succulent-10", labelId: "#6", trackerId: "P30" },
    ],
]);

/**
 * @param {GyazoCollection | null | undefined} collection
 * @param {string} context
 */
function assertGyazoCollection(collection, context) {
    assert.ok(
        collection &&
            typeof collection === "object" &&
            !Array.isArray(collection),
        `${context} needs a Gyazo Collection object.`
    );
    assert.ok(
        JSON.stringify(Object.keys(collection).toSorted(compareText)) ===
            JSON.stringify(["id", "url"]),
        `${context} Gyazo Collection must contain only id and url.`
    );
    assert.ok(
        /^[0-9a-f]{32}$/v.test(collection.id),
        `${context} has an invalid Gyazo Collection ID.`
    );
    assert.ok(
        collection.url === `https://gyazo.com/collections/${collection.id}`,
        `${context} Gyazo Collection URL does not agree with its ID.`
    );
    return collection.id;
}

/**
 * @param {CollectionPhoto} photo
 */
function captureMetadata(photo) {
    return JSON.stringify({
        captured_on: photo.captured_on ?? null,
        crop_geometry: photo.crop_geometry ?? null,
        derivation_note: photo.derivation_note ?? null,
        derived_note: photo.derived_note ?? null,
        image_id: photo.image_id,
        image_url: photo.image_url,
        kind: photo.kind,
        page_url: photo.page_url,
        provided_on: photo.provided_on ?? null,
        provider: photo.provider,
        source_file: photo.source_file ?? null,
        source_note: photo.source_note ?? null,
        upload_metadata: photo.upload_metadata,
        view: photo.view,
    });
}

/**
 * @param {CollectionPhoto} left
 * @param {CollectionPhoto} right
 */
function compareCollectionPhotosNewestFirst(left, right) {
    const dateDifference = collectionPhotoDate(right).localeCompare(
        collectionPhotoDate(left)
    );
    const viewPriority = new Map([
        ["context", 3],
        ["detail", 0],
        ["label-back", 6],
        ["label-front", 5],
        ["overview", 4],
        ["side", 1],
        ["top", 2],
    ]);
    return (
        dateDifference ||
        (viewPriority.get(left.view) ?? 9) - (viewPriority.get(right.view) ?? 9)
    );
}

async function discoverProfiles() {
    const profilesByGroup = await Promise.all(
        profileGroups.map(async (group) => {
            const directory = path.join(
                repositoryRoot,
                "docs",
                "plants",
                group
            );
            const fileNames = await readdir(directory);
            const markdownFiles = fileNames.filter((name) =>
                name.endsWith(".md")
            );
            return Promise.all(
                markdownFiles.map(async (fileName) => ({
                    group,
                    markdown: await readFile(
                        path.join(directory, fileName),
                        "utf8"
                    ),
                    slug: path.basename(fileName, ".md"),
                }))
            );
        })
    );
    return profilesByGroup
        .flat()
        .toSorted((left, right) => left.slug.localeCompare(right.slug));
}

/**
 * @param {import("node:fs").PathLike | import("node:fs/promises").FileHandle} filePath
 */
async function fileHash(filePath) {
    const bytes = await readFile(filePath);
    return createHash("sha256").update(bytes).digest("hex");
}

/**
 * @param {string} tag
 * @param {string} attributeName
 */
function htmlAttribute(tag, attributeName) {
    const pattern1 = new RegExp(
        String.raw`\b${attributeName}=(['"])(.*?)\1`,
        "s"
    );
    const match = pattern1.exec(tag);
    return match?.[2];
}

/**
 * @param {string} tag
 */
function htmlClasses(tag) {
    return new Set(
        (htmlAttribute(tag, "class") ?? "").split(/\s+/v).filter(Boolean)
    );
}

/**
 * @param {string | undefined} value
 */
function isIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/v.test(value ?? "")) return false;
    if (value === undefined) return false;
    try {
        return Temporal.PlainDate.from(value).toString() === value;
    } catch (error) {
        if (error instanceof RangeError) return false;
        throw error;
    }
}

/**
 * @param {string} html
 */
function localReferences(html) {
    return html
        .matchAll(/\b(?:href|src)="(?<href>\.\.?\/[^"]+)"/gv)
        .map((match) =>
            required(
                required(match.groups?.["href"], captureContext).split(
                    /[#?]/v,
                    1
                )[0],
                "local reference path"
            )
        )
        .filter((reference) => reference !== "./" && reference !== "../")
        .toArray();
}

async function main() {
    const [
        html,
        photoAlbumHtml,
        iconSprite,
        clientScript,
        manifest,
        collectionManifest,
        profiles,
        fieldGuideProfiles,
    ] = await Promise.all([
        readFile(bookletPath, "utf8"),
        readFile(photoAlbumPath, "utf8"),
        readFile(iconSpritePath, "utf8"),
        readFile(path.join(bookletDirectory, "booklet.js"), "utf8"),
        readJson(manifestPath, isPhotoManifest),
        readJson(collectionManifestPath, isCollectionManifest),
        discoverProfiles(),
        readJson(plantProfileDataPath, isProfileData),
    ]);
    const serializedCollectionManifest = JSON.stringify(collectionManifest);
    assert.ok(
        !serializedCollectionManifest.includes(".private-photo-sources") &&
            !/[A-Za-z]:\\\\/v.test(serializedCollectionManifest),
        "Collection-photo manifest must not expose private or absolute Windows source paths."
    );
    assert.ok(
        !serializedCollectionManifest.includes('"evidence_file"'),
        "Collection-photo manifest must use source_file for preserved public evidence."
    );
    const profileSlugs = profiles.map((profile) => profile.slug);
    validateIconSprite(iconSprite, profileSlugs, html, photoAlbumHtml);
    const profileStates = validateProfileInventory(
        profiles,
        fieldGuideProfiles
    );
    const collectionValidation = await validateCollectionManifest(
        collectionManifest,
        profileSlugs,
        profileStates
    );
    const { collectionOverviews, profileStateBySlug } = collectionValidation;
    const archivedNurseryLabels =
        await validateNurseryArchive(collectionManifest);
    const pageSlugs = validateProfilePages(html, profileSlugs);
    /** @type {[string, string][]} */
    const documents = [
        ["field guide", html],
        ["photo Collections index", photoAlbumHtml],
    ];
    for (const [documentName, documentHtml] of documents) {
        validateExternalPreviews(documentHtml, documentName);
    }
    validateProfileSources(profiles);
    const ids = validateBookletAnchors(html);
    const { coverageLines, photoRecords } = await validateReferenceArchive(
        manifest,
        profileSlugs,
        html
    );
    validateRenderedCollectionCounts(
        html,
        profiles.length,
        collectionValidation
    );
    validateProfilePhotoPlacements(
        html,
        profiles,
        collectionManifest,
        profileStateBySlug
    );
    validatePhotoAlbum(photoAlbumHtml, collectionManifest);
    for (const generatedHtml of [html, photoAlbumHtml]) {
        assert.ok(
            !generatedHtml.includes("collection-history-details") &&
                !generatedHtml.includes("history-summary-icon"),
            "Generated photo UI must not contain an expandable archive or history-summary icon."
        );
        assert.ok(
            !/assets[\/\\]collection-photos[\/\\]/iv.test(generatedHtml),
            "Generated HTML must not reference assets/collection-photos binaries."
        );
    }
    validateContentsNavigation(html, profiles);
    validateProfileSectionsAndLinks(html, profiles);
    const photoAlbumIds = validatePhotoAlbumAnchors(photoAlbumHtml);
    await validateLocalReferences(html, photoAlbumHtml);
    for (const script of html.matchAll(
        /<script>(?<script>[\s\S]*?)<\/script>/gv
    )) {
        compileFunction(required(script.groups?.["script"], "inline script"));
    }
    for (const script of photoAlbumHtml.matchAll(
        /<script>(?<script>[\s\S]*?)<\/script>/gv
    )) {
        compileFunction(required(script.groups?.["script"], "inline script"));
    }
    compileFunction(clientScript);

    process.stdout.write(
        `Plant booklet verified: ${pageSlugs.length} profiles, ${photoRecords.length} licensed reference photos, ${expectedCollectionPlacements} Gyazo placements using ${expectedUniqueGyazoImages} unique captures, ${collectionOverviews.length} collection overviews, ${archivedNurseryLabels.length} archived nursery labels, ${ids.length} unique booklet IDs, and ${photoAlbumIds.length} unique photo-album IDs.\n`
    );
    process.stdout.write(`${coverageLines.join("\n")}\n`);
}

/**
 * @param {string} html
 */
function profilePageSections(html) {
    const starts = html
        .matchAll(/<article\b[^>]*>/gv)
        .filter((match) => {
            const classes = htmlClasses(required(match[0], captureContext));
            return classes.has("book-page") && classes.has("profile-page");
        })
        .toArray();
    return new Map(
        starts.map((match, index) => [
            htmlAttribute(required(match[0], captureContext), "id"),
            html.slice(match.index, starts[index + 1]?.index ?? html.length),
        ])
    );
}

/**
 * @param {string} markdown
 */
function readProfileIdentity(markdown) {
    const title =
        /^#[^\S\n\r]+(?<heading>\S[^\n\r]*)$/mv
            .exec(markdown)
            ?.groups?.["heading"]?.trim() ?? "";
    const inventoryId =
        /^- Inventory:\s*(?<inventoryId>\S+)\s/mv.exec(markdown)?.groups?.[
            "inventoryId"
        ] ?? "";
    const labelId =
        /^- Label ID:\s*`(?<labelId>[^`]+)`/mv.exec(markdown)?.groups?.[
            "labelId"
        ] ?? "";
    const trackerId =
        /^- Tracker ID:\s*`(?<trackerId>[^`]+)`/mv.exec(markdown)?.groups?.[
            "trackerId"
        ] ?? "";
    const orderStatus =
        /^- Order status:[^\S\n\r]*(?<status>\S[^\n\r]*)$/mv.exec(markdown)
            ?.groups?.["status"] ?? "";
    const status =
        /^- Status:[^\S\n\r]*(?<status>\S[^\n\r]*)$/mv.exec(markdown)?.groups?.[
            "status"
        ] ?? "";
    return { inventoryId, labelId, orderStatus, status, title, trackerId };
}

/**
 * @param {string} html
 */
function renderedCollectionFigures(html) {
    return html
        .matchAll(/<figure\b[^>]*>[\s\S]*?<\/figure>/gv)
        .filter((match) =>
            htmlClasses(required(match[0], captureContext)).has(
                "collection-photo"
            )
        )
        .map((match) => {
            const imageTag =
                /<img\b[^>]*>/v.exec(required(match[0], captureContext))?.[0] ??
                "";
            return {
                imageId: required(
                    htmlAttribute(imageTag, "data-image-id"),
                    "figure image ID"
                ),
                kind: htmlAttribute(
                    required(match[0], captureContext),
                    "data-photo-kind"
                ),
                latest: htmlClasses(required(match[0], captureContext)).has(
                    "collection-photo--latest"
                ),
            };
        })
        .toArray();
}

/**
 * @param {string} markdown
 */
function sellerProductLinks(markdown) {
    const allowedHosts = new Set([
        "costafarms.com",
        "mountaincrestgardens.com",
        "shopaltmanplants.com",
        "www.lowes.com",
    ]);

    return markdown
        .matchAll(/\[(?<label>[^\n\r\[\]]+)\]\((?<href>https?:\/\/[^\)]+)\)/gv)
        .filter((match) => {
            const label = required(match.groups?.["label"], "seller label");
            const href = required(match.groups?.["href"], "seller URL");
            const url = new URL(href);
            return (
                allowedHosts.has(url.hostname) &&
                /altman reserve|feather cactus|seller listing/iv.test(label)
            );
        })
        .map((match) => required(match.groups?.["href"], "seller URL"))
        .toArray();
}

/**
 * @param {Iterable<string>} values
 */
function sortedStrings(values) {
    // eslint-disable-next-line canonical/no-use-extend-native -- Array.toSorted is native in the required Node 26.7 runtime; the rule's registry is stale.
    return [...values].toSorted((left, right) => left.localeCompare(right));
}

/**
 * @param {string} html
 * @param {string} tagName
 * @param {string} className
 */
function tagsWithClass(html, tagName, className) {
    return html
        .matchAll(new RegExp(String.raw`<${tagName}\b[^>]*>`, "g"))
        .map((match) => required(match[0], captureContext))
        .filter((tag) => htmlClasses(tag).has(className))
        .toArray();
}

/**
 * @param {string} html
 */
function validateBookletAnchors(html) {
    const ids = html
        .matchAll(/\sid="(?<id>[^"]+)"/gv)
        .map((match) => required(match.groups?.["id"], captureContext))
        .toArray();
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    assert.ok(
        duplicateIds.length === 0,
        `Duplicate HTML IDs: ${[...new Set(duplicateIds)].join(", ")}`
    );

    const hashTargets = html
        .matchAll(/href="#(?<href>[^"]+)"/gv)
        .map((match) => required(match.groups?.["href"], captureContext))
        .toArray();
    const missingHashTargets = hashTargets.filter(
        (target) => !ids.includes(target)
    );
    assert.ok(
        missingHashTargets.length === 0,
        `Missing hash targets: ${[...new Set(missingHashTargets)].join(", ")}`
    );
    return ids;
}

/**
 * @param {import("./build-data.mjs").CollectionManifest} collectionManifest
 * @param {string[]} profileSlugs
 * @param {ReturnType<typeof validateProfile>[]} profileStates
 */
async function validateCollectionManifest(
    collectionManifest,
    profileSlugs,
    profileStates
) {
    assert.ok(
        collectionManifest.schema_version === 3,
        "Collection-photo manifest must use schema version 3."
    );
    assert.ok(
        /all rights reserved/iv.test(collectionManifest.copyright_notice),
        "Collection-photo manifest must preserve the user-photo copyright notice."
    );
    assert.ok(
        Array.isArray(collectionManifest.plants),
        "Collection-photo manifest has no plants array."
    );
    assert.ok(
        Array.isArray(collectionManifest.collection_overviews) &&
            collectionManifest.collection_overviews.length ===
                expectedCollectionOverviews,
        `Collection-photo manifest must contain exactly ${expectedCollectionOverviews} collection overviews.`
    );

    const overviewCollectionId = assertGyazoCollection(
        collectionManifest.gyazo_collection,
        "Collection overview"
    );
    const collectionSlugs = collectionManifest.plants.map(
        (record) => record.plant_slug
    );
    const uniqueValues4 = new Set(collectionSlugs);
    assert.ok(
        uniqueValues4.size === collectionSlugs.length,
        "Collection-photo manifest contains duplicate plant records."
    );
    assert.ok(
        JSON.stringify(sortedStrings(collectionSlugs)) ===
            JSON.stringify(profileSlugs),
        "Collection-photo manifest does not match the Markdown profile files."
    );

    const profileStateBySlug = new Map(
        profileStates.map((profile) => [profile.slug, profile])
    );
    const historicalProfiles = profileStates.filter(
        (profile) => profile.historical
    );
    assert.ok(
        historicalProfiles.length === 1 &&
            historicalProfiles[0]?.slug === historicalCollectionSlug,
        `${historicalCollectionSlug} must remain the only historical profile.`
    );

    const collectionIds = new Set([overviewCollectionId]);
    /** @type {Map<string, string>} */
    const publicationMetadataByName = new Map();
    /** @type {Map<string, string>} */
    const publicationNameByImageId = new Map();
    /** @type {Map<string, string>} */
    const imageIdByPublicationName = new Map();
    const allPlacements = [];
    let expectedPendingPhotos = 0;
    let expectedHistoryPreviewPhotos = 0;
    let expectedInlineCollectionPhotos = 0;
    let expectedNurseryEvidenceSections = 0;
    let expectedViewBadges = 0;
    /** @type {Map<string, number>} */
    const photoReferenceCounts = new Map();
    /** @type {Map<string, Set<string>>} */
    const photoAltTextsByImageId = new Map();
    const allCollectionPhotos = Iterator.concat(
        collectionManifest.collection_overviews,
        collectionManifest.plants.flatMap((record) => record.photos)
    );
    for (const photo of allCollectionPhotos) {
        if (photo.provider !== "gyazo") continue;
        photoReferenceCounts.set(
            photo.image_id,
            (photoReferenceCounts.get(photo.image_id) ?? 0) + 1
        );
        if (!photoAltTextsByImageId.has(photo.image_id)) {
            photoAltTextsByImageId.set(photo.image_id, new Set());
        }
        required(
            photoAltTextsByImageId.get(photo.image_id),
            "photo alt-text set"
        ).add(photo.alt.trim());
    }

    /**
     * @param {CollectionPhoto} photo
     * @param {string} context
     */
    async function validatePublishedPhoto(photo, context) {
        const publicationExtension = validatePhotoPublication(photo, context);
        validatePhotoDescription(photo, context);
        validatePhotoUploadMetadata(
            photo,
            context,
            photoReferenceCounts,
            photoAltTextsByImageId
        );
        await validatePhotoSource(photo, context, publicationExtension);
        return captureMetadata(photo);
    }

    /**
     * @param {CollectionPhoto} photo
     * @param {string} metadata
     */
    function recordPublishedPhoto(photo, metadata) {
        const previousMetadata = publicationMetadataByName.get(
            photo.publication_name
        );
        assert.ok(
            previousMetadata === undefined || previousMetadata === metadata,
            `${photo.publication_name} is reused with different Gyazo capture metadata.`
        );
        publicationMetadataByName.set(photo.publication_name, metadata);

        const previousImageId = imageIdByPublicationName.get(
            photo.publication_name
        );
        assert.ok(
            previousImageId === undefined || previousImageId === photo.image_id,
            `${photo.publication_name} maps to more than one Gyazo image ID.`
        );
        imageIdByPublicationName.set(photo.publication_name, photo.image_id);

        const previousPublicationName = publicationNameByImageId.get(
            photo.image_id
        );
        assert.ok(
            previousPublicationName === undefined ||
                previousPublicationName === photo.publication_name,
            `${photo.image_id} maps to more than one publication name.`
        );
        publicationNameByImageId.set(photo.image_id, photo.publication_name);
        allPlacements.push(photo);
    }

    // Read independent photo evidence concurrently, then consume results in the
    // original plant/photo order before updating the shared publication maps.
    const plantPhotoResults = await Promise.all(
        collectionManifest.plants.map(async (record) =>
            Promise.allSettled(
                record.photos.map(async (photo, index) =>
                    validatePublishedPhoto(
                        photo,
                        `${record.plant_slug} photo ${index + 1}`
                    )
                )
            )
        )
    );
    for (const [recordIndex, record] of collectionManifest.plants.entries()) {
        const profileState = profileStateBySlug.get(record.plant_slug);
        if (!profileState) {
            throw new Error(
                `${record.plant_slug} has no matching generated profile state.`
            );
        }
        assert.ok(
            Array.isArray(record.photos),
            `${record.plant_slug} has no collection photos array.`
        );

        if (profileState.historical) {
            assert.ok(
                record.plant_slug === historicalCollectionSlug &&
                    record.gyazo_collection === undefined &&
                    record.photos.length === 0,
                `${historicalCollectionSlug} must have no Gyazo Collection or photo placements.`
            );
            assert.ok(
                typeof record.pending_note === "string" &&
                    record.pending_note.trim().length > 0,
                `${historicalCollectionSlug} must retain its photo-pending note.`
            );
            expectedPendingPhotos += 1;
            continue;
        }

        assert.ok(
            record.pending_note === undefined,
            `${record.plant_slug} has photos but still has a photo-pending note.`
        );
        const collectionId = assertGyazoCollection(
            record.gyazo_collection,
            record.plant_slug
        );
        assert.ok(
            !collectionIds.has(collectionId),
            `${record.plant_slug} reuses another Gyazo Collection ID.`
        );
        collectionIds.add(collectionId);

        const growthPhotos = record.photos
            .filter(
                (/** @type {{ kind: string }} */ photo) =>
                    photo.kind === "collection"
            )
            .toSorted(compareCollectionPhotosNewestFirst);
        const nurseryLabelPhotos = record.photos.filter(
            (/** @type {{ kind: string }} */ photo) =>
                photo.kind === nurseryLabelKind
        );
        assert.ok(
            growthPhotos.length >= 2,
            `${record.plant_slug} needs at least two collection-kind photos.`
        );
        expectedHistoryPreviewPhotos += 2;
        expectedInlineCollectionPhotos += 2 + nurseryLabelPhotos.length;
        expectedNurseryEvidenceSections +=
            nurseryLabelPhotos.length > 0 ? 1 : 0;
        expectedViewBadges += 2 + nurseryLabelPhotos.length;

        const photoResults = required(
            plantPhotoResults[recordIndex],
            "plant photo results"
        );
        for (const [index, photo] of record.photos.entries()) {
            recordPublishedPhoto(
                photo,
                fulfilledValue(
                    required(photoResults[index], "published photo result")
                )
            );
        }
    }

    const collectionOverviews = collectionManifest.collection_overviews;
    const overviewResults = await Promise.allSettled(
        collectionOverviews.map(async (photo, index) => {
            assert.ok(
                photo.kind === "collection",
                `Collection overview ${index + 1} must have collection kind.`
            );
            return validatePublishedPhoto(
                photo,
                `Collection overview ${index + 1}`
            );
        })
    );
    for (const [index, photo] of collectionOverviews.entries()) {
        recordPublishedPhoto(
            photo,
            fulfilledValue(
                required(overviewResults[index], "overview photo result")
            )
        );
    }

    assert.ok(
        collectionIds.size === expectedPresentProfiles + 1,
        `Expected ${expectedPresentProfiles} unique plant Collections plus the overview Collection.`
    );
    assert.ok(
        allPlacements.length === expectedCollectionPlacements,
        `Expected ${expectedCollectionPlacements} total Gyazo placements; found ${allPlacements.length}.`
    );
    assert.ok(
        publicationMetadataByName.size === expectedUniqueGyazoImages &&
            imageIdByPublicationName.size === expectedUniqueGyazoImages &&
            publicationNameByImageId.size === expectedUniqueGyazoImages,
        `Expected ${expectedUniqueGyazoImages} one-to-one publication names and Gyazo image IDs.`
    );
    return {
        collectionOverviews,
        expectedHistoryPreviewPhotos,
        expectedInlineCollectionPhotos,
        expectedNurseryEvidenceSections,
        expectedPendingPhotos,
        expectedViewBadges,
        profileStateBySlug,
    };
}

/**
 * @param {string} html
 * @param {Awaited<ReturnType<typeof discoverProfiles>>} profiles
 */
function validateContentsNavigation(html, profiles) {
    assert.ok(
        (html.match(/class="contents-group(?: contents-group--wide)?"/gv) ?? [])
            .length === 4 &&
            (html.match(/data-group="cacti"/gv) ?? []).length > 0 &&
            !html.includes("Starter cacti") &&
            !html.includes("New individual cacti"),
        "The booklet must present one unified Cacti contents group plus Succulents, Rehab, and Houseplants."
    );
    const cactiContents =
        /<section\b[^>]+class="contents-group contents-group--wide"[^>]*data-group="cacti"[^>]*>(?<contents>[\s\S]*?)<\/section>/v.exec(
            html
        )?.groups?.["contents"];
    const expectedCactiTrackerIds = profiles
        .filter((profile) => ["cacti", "starter"].includes(profile.group))
        .map(
            (profile) =>
                /^- Tracker ID:\s*`(?<trackerId>P\d{2})`/mv.exec(
                    profile.markdown
                )?.groups?.["trackerId"]
        )
        .filter((value) => value !== undefined)
        .toSorted(
            (left, right) => Number(left.slice(1)) - Number(right.slice(1))
        );
    const renderedCactiTrackerIds = isNonemptyString(cactiContents)
        ? cactiContents
              .matchAll(
                  /<span class="contents-id"[^>]*>\s*<strong[^>]*>(?<content>P\d{2})<\/strong/gv
              )
              .map((match) =>
                  required(match.groups?.["content"], captureContext)
              )
              .toArray()
        : [];
    assert.ok(
        JSON.stringify(renderedCactiTrackerIds) ===
            JSON.stringify(expectedCactiTrackerIds),
        "The unified Cacti contents group is not in permanent P-ID order."
    );
    for (const variant of ["contents", "drawer"]) {
        const iconCount = html
            .matchAll(new RegExp(`plant-nav-icon--${variant}`, "g"))
            .reduce((count) => count + 1, 0);
        assert.ok(
            iconCount === profiles.length,
            `Expected ${profiles.length} ${variant} plant icons; found ${iconCount}.`
        );
    }
    assert.ok(
        (html.match(/plant-avatar--hero/gv) ?? []).length === profiles.length,
        `Expected ${profiles.length} hero plant avatars.`
    );
    assert.ok(
        !/<img\b[^>]+class="[^"]*plant-avatar--(?:contents|drawer)/iv.test(
            html
        ),
        "Contents and drawer navigation must use lightweight icons, not photograph avatars."
    );
    const plantNavigationIconUses =
        html.match(
            /class="plant-nav-icon[^"]*"[\s\S]*?<use\b[^>]+href="\.\/plant-icons\.svg#icon-plant-[\-a-z]+"[\s\S]*?<\/span>/gv
        ) ?? [];
    assert.ok(
        !html.includes("plant-nav-icon-sprite") &&
            plantNavigationIconUses.length === profiles.length * 2,
        "Navigation icons must use the local plant-specific multicolor SVG portraits."
    );
    for (const profile of profiles) {
        const portraitUseCount = html
            .matchAll(
                new RegExp(
                    String.raw`plant-icons\.svg#icon-plant-${profile.slug}(?=["#])`,
                    "g"
                )
            )
            .reduce((count) => count + 1, 0);
        assert.ok(
            portraitUseCount === 4,
            `${profile.slug} must use its portrait in the contents, drawer, hero fallback, and Photo scope metadata; found ${portraitUseCount} uses.`
        );
    }
}

/**
 * @param {string} documentHtml
 * @param {string} documentName
 */
function validateExternalPreviews(documentHtml, documentName) {
    const escapedGyazoThumbnailOrigin = String.raw`https://thumb\.gyazo\.com`;
    const externalImageTags = documentHtml
        .matchAll(/<img\b[^>]+data-external-image[^>]*>/gv)
        .map((match) => required(match[0], captureContext))
        .toArray();
    assert.ok(
        externalImageTags.length > 0,
        `${documentName} has no external image previews.`
    );
    for (const tag of externalImageTags) {
        const imageId = required(
            htmlAttribute(tag, "data-image-id"),
            "Gyazo preview image ID"
        );
        const source = htmlAttribute(tag, "src") ?? "";
        const srcset = htmlAttribute(tag, "srcset") ?? "";
        const sizes = htmlAttribute(tag, "sizes") ?? "";
        const pattern8 = new RegExp(
            String.raw`^${escapedGyazoThumbnailOrigin}/thumb/960/${imageId}\.[a-z0-9]+$`,
            "i"
        );
        assert.ok(
            pattern8.test(source),
            `${documentName} must display Gyazo capture ${imageId} through its 960px thumbnail.`
        );
        for (const width of expectedGyazoThumbnailWidths) {
            const pattern9 = new RegExp(
                String.raw`${escapedGyazoThumbnailOrigin}/thumb/${width}/${imageId}\.[a-z0-9]+\s+${width}w`,
                "i"
            );
            assert.ok(
                pattern9.test(srcset),
                `${documentName} Gyazo capture ${imageId} is missing its ${width}px responsive source.`
            );
        }
        assert.ok(
            sizes.trim(),
            `${documentName} Gyazo capture ${imageId} needs a sizes rule.`
        );
    }
    assert.ok(
        !/<img\b[^>]+src="https:\/\/i\.gyazo\.com\//iv.test(documentHtml),
        `${documentName} still displays a full-resolution Gyazo source.`
    );
}

/**
 * @param {string} iconSprite
 * @param {string[]} profileSlugs
 * @param {string} html
 * @param {string} photoAlbumHtml
 */
function validateIconSprite(iconSprite, profileSlugs, html, photoAlbumHtml) {
    const iconSymbols = iconSprite
        .matchAll(/<symbol\s+id="icon-(?<icon>[\-a-z]+)"/gv)
        .map((match) => required(match.groups?.["icon"], captureContext))
        .toArray();
    const iconSymbolSet = new Set(iconSymbols);
    const requiredIconSymbols = [
        "airflow",
        "arrow-down",
        "arrow-left",
        "arrow-right",
        "arrow-up",
        "botanical",
        "cable",
        "cactus",
        "calendar",
        "care",
        "caution",
        "check",
        "clock",
        "dimensions",
        "download",
        "edit",
        "expand",
        "external",
        "feeding",
        "field-guide",
        "flower",
        "growth",
        "habitat",
        "handling",
        "history",
        "houseplant",
        "identity",
        "inventory",
        "label",
        "layout",
        "light",
        "menu",
        "minus",
        "mobile",
        "observation",
        "photos",
        "plant",
        "pot",
        "print",
        "rehab",
        "refresh",
        "reset",
        "search",
        "seller",
        "sheets",
        "source",
        "status",
        "story",
        "succulent",
        "temperature",
        "theme",
        "tracker",
        "water",
        "weight",
        "eye",
        "eye-off",
    ];

    assert.ok(
        iconSymbols.length === iconSymbolSet.size &&
            requiredIconSymbols.every((name) => iconSymbolSet.has(name)),
        "The shared icon sprite is missing a required symbol or contains duplicate IDs."
    );
    const expectedPlantIconSymbols = [
        ...profileSlugs.map((slug) => `plant-${slug}`),
        "plant-shared-rehab-cactus-planter",
        "plant-shared-succulent-planter",
    ];
    const renderedPlantIconSymbols = iconSymbols.filter((name) =>
        name.startsWith("plant-")
    );
    assert.ok(
        renderedPlantIconSymbols.length === expectedPlantIconSymbols.length &&
            expectedPlantIconSymbols.every((name) => iconSymbolSet.has(name)),
        "The sprite must contain one portrait per profile plus the two shared-planter portraits."
    );
    const plantPortraitBodies = expectedPlantIconSymbols.map((name) => {
        const escapedName = name.replaceAll("-", String.raw`\-`);
        const pattern2 = new RegExp(
            String.raw`<symbol\s+id="icon-${escapedName}"[^>]*>([\s\S]*?)<\/symbol>`
        );
        return pattern2.exec(iconSprite)?.[1]?.replaceAll(/\s+/gv, " ").trim();
    });
    const uniqueValues3 = new Set(plantPortraitBodies);
    assert.ok(
        plantPortraitBodies.every(Boolean) &&
            uniqueValues3.size === expectedPlantIconSymbols.length,
        "Every profile must use distinct morphology-led SVG portrait artwork."
    );
    assert.ok(
        !/<script\b/iv.test(iconSprite) && !/currentcolor/iv.test(iconSprite),
        "The shared icon sprite must remain script-free and use explicit multicolor artwork."
    );
    for (const match of iconSprite.matchAll(
        /<symbol id="icon-(?<icon>[\-a-z]+)"[\s\S]*?<\/symbol>/gv
    )) {
        const colors = new Set(
            required(match[0], captureContext)
                .matchAll(/#[0-9a-f]{6}/giv)
                .map((color) => color[0].toLowerCase())
        );
        assert.ok(
            colors.size >= 2,
            `Icon ${required(match.groups?.["icon"], captureContext)} must contain at least two explicit colors.`
        );
    }
    for (const generatedHtml of [html, photoAlbumHtml]) {
        for (const match of generatedHtml.matchAll(
            /plant-icons\.svg#icon-(?<icon>[\-a-z]+)/gv
        )) {
            assert.ok(
                iconSymbolSet.has(
                    required(match.groups?.["icon"], captureContext)
                ),
                `Generated HTML references missing icon ${required(match.groups?.["icon"], captureContext)}.`
            );
        }
    }
}

/**
 * @param {string} html
 * @param {string} photoAlbumHtml
 */
async function validateLocalReferences(html, photoAlbumHtml) {
    const bookletResults = await Promise.allSettled(
        [...new Set(localReferences(html))].map(async (reference) => {
            const absolutePath = path.resolve(bookletDirectory, reference);
            try {
                await stat(absolutePath);
            } catch (error) {
                throw new Error(
                    `Broken local booklet reference: ${reference}`,
                    {
                        cause: error,
                    }
                );
            }
        })
    );
    for (const result of bookletResults) {
        fulfilledValue(result);
    }
    const albumResults = await Promise.allSettled(
        [...new Set(localReferences(photoAlbumHtml))].map(async (reference) => {
            const absolutePath = path.resolve(photoAlbumDirectory, reference);
            try {
                await stat(absolutePath);
            } catch (error) {
                throw new Error(
                    `Broken local photo-album reference: ${reference}`,
                    { cause: error }
                );
            }
        })
    );
    for (const result of albumResults) {
        fulfilledValue(result);
    }
}

/**
 * @param {import("./build-data.mjs").CollectionManifest} collectionManifest
 */
async function validateNurseryArchive(collectionManifest) {
    const directoryEntries6 = await readdir(nurseryLabelsDirectory);
    const archivedNurseryLabels = directoryEntries6
        .filter((fileName) => /\.(?:jpe?g|png|webp)$/iv.test(fileName))
        .toSorted(compareText);
    const nurseryLabelArchiveEvidence =
        collectionManifest.nursery_label_archive_evidence;
    assert.ok(
        Array.isArray(nurseryLabelArchiveEvidence),
        "Collection-photo nursery-label archive evidence must be an array."
    );
    const evidenceResults = await Promise.allSettled(
        nurseryLabelArchiveEvidence.map(async (evidence) => {
            assert.ok(
                typeof evidence.file === "string" &&
                    /^assets\/nursery-labels\/[^\/]+\.(?:jpe?g|png|webp)$/iv.test(
                        evidence.file
                    ),
                "Unplaced nursery-label archive evidence must name an image in assets/nursery-labels/."
            );
            assert.ok(
                isIsoDate(evidence.captured_on),
                `${evidence.file} must have a captured date.`
            );
            assert.ok(
                typeof evidence.description === "string" &&
                    evidence.description.trim().length > 0,
                `${evidence.file} must explain why it is not a booklet placement.`
            );
            const evidenceStats = await stat(
                path.join(repositoryRoot, evidence.file)
            );
            assert.ok(
                evidenceStats.size > 1024,
                `${evidence.file} is unexpectedly small.`
            );
        })
    );
    for (const result of evidenceResults) {
        fulfilledValue(result);
    }
    const collectionNurseryLabelSources = collectionManifest.plants
        .flatMap((record) => record.photos)
        .filter(
            (/** @type {{ kind: string }} */ photo) =>
                photo.kind === nurseryLabelKind
        )
        .map((photo) => photo.source_file)
        .filter(isNonemptyString);
    const manifestedNurseryLabelSources = [
        ...collectionNurseryLabelSources,
        ...nurseryLabelArchiveEvidence.map((evidence) => evidence.file),
    ];
    const uniqueValues7 = new Set(manifestedNurseryLabelSources);
    assert.ok(
        uniqueValues7.size === manifestedNurseryLabelSources.length,
        "A nursery-label source file is used more than once in the collection-photo manifest."
    );
    const manifestedNurseryLabels = manifestedNurseryLabelSources
        .map((file) => path.basename(file))
        .toSorted(compareText);
    assert.ok(
        JSON.stringify(manifestedNurseryLabels) ===
            JSON.stringify(archivedNurseryLabels),
        "Every archived nursery-label image must have exactly one booklet photo-manifest entry."
    );

    const collectionPhotoDirectoryEntries = sortedStrings(
        await readdir(collectionPhotosDirectory)
    );
    assert.ok(
        JSON.stringify(collectionPhotoDirectoryEntries) ===
            JSON.stringify(sortedStrings(["photo-manifest.json", "README.md"])),
        "assets/collection-photos must contain only README.md and photo-manifest.json after Gyazo cleanup."
    );
    return archivedNurseryLabels;
}

/**
 * @param {string} photoAlbumHtml
 * @param {import("./build-data.mjs").CollectionManifest} collectionManifest
 */
function validatePhotoAlbum(photoAlbumHtml, collectionManifest) {
    const collectionOverviews = collectionManifest.collection_overviews;
    const albumCards = photoAlbumHtml
        .matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/gv)
        .filter((match) =>
            htmlClasses(required(match[0], captureContext)).has(
                "photo-collection-card"
            )
        )
        .toArray();
    assert.ok(
        albumCards.length === expectedPresentProfiles,
        `Expected ${expectedPresentProfiles} plant Collection cards in the generated photo album; found ${albumCards.length}.`
    );
    const collectionRecordByUrl = new Map(
        collectionManifest.plants
            .filter((record) => record.gyazo_collection)
            .map((record) => [
                required(record.gyazo_collection, "Gyazo collection").url,
                record,
            ])
    );
    const albumProfileCollectionUrls = new Set();
    for (const card of albumCards) {
        const cardCollectionUrls = new Set(
            card[0]
                .matchAll(
                    /<a\b[^>]+href="(?<href>https:\/\/gyazo\.com\/collections\/[0-9a-f]{32})"/gv
                )
                .map((match) =>
                    required(match.groups?.["href"], captureContext)
                )
        );
        assert.ok(
            cardCollectionUrls.size === 1,
            "Each generated photo-album card must link exactly one Gyazo Collection."
        );
        const cardCollectionUrl = required(
            [...cardCollectionUrls][0],
            "card collection URL"
        );
        const collectionRecord = collectionRecordByUrl.get(cardCollectionUrl);
        const cardImageTag = /<img\b[^>]*>/v.exec(card[0])?.[0] ?? "";
        const expectedNewestImageId = collectionRecord?.photos
            .filter(
                (/** @type {{ kind: string }} */ photo) =>
                    photo.kind === "collection"
            )
            .toSorted(compareCollectionPhotosNewestFirst)[0]?.image_id;
        assert.ok(
            collectionRecord &&
                htmlAttribute(cardImageTag, "data-image-id") ===
                    expectedNewestImageId,
            "Each photo-album card must preview its plant Collection's newest image."
        );
        albumProfileCollectionUrls.add(cardCollectionUrl);
    }
    const overviewSections = photoAlbumHtml
        .matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/gv)
        .filter((match) =>
            htmlClasses(required(match[0], captureContext)).has(
                "overview-collection"
            )
        )
        .toArray();
    assert.ok(
        overviewSections.length === 1,
        "The generated photo album needs exactly one overview Collection section."
    );
    const albumOverviewCollectionUrls = new Set(
        required(overviewSections[0], "overview section")[0]
            .matchAll(
                /<a\b[^>]+href="(?<href>https:\/\/gyazo\.com\/collections\/[0-9a-f]{32})"/gv
            )
            .map((match) => required(match.groups?.["href"], captureContext))
    );
    assert.ok(
        albumOverviewCollectionUrls.size === 1 &&
            albumOverviewCollectionUrls.has(
                collectionManifest.gyazo_collection.url
            ),
        "The generated photo album overview must link only the overview Gyazo Collection."
    );
    const overviewImageTag = /<img\b[^>]*>/v.exec(
        required(overviewSections[0], "overview section")[0]
    )?.[0];
    const expectedNewestOverviewId = collectionOverviews.toSorted(
        compareCollectionPhotosNewestFirst
    )[0]?.image_id;
    assert.ok(
        htmlAttribute(overviewImageTag ?? "", "data-image-id") ===
            expectedNewestOverviewId,
        "The generated photo album overview must preview the newest overview image."
    );
    const expectedAlbumProfileCollectionUrls = new Set(
        collectionManifest.plants
            .filter(
                (/** @type {{ plant_slug: string }} */ record) =>
                    record.plant_slug !== historicalCollectionSlug
            )
            .map(
                (record) =>
                    required(record.gyazo_collection, "Gyazo collection").url
            )
    );
    assert.ok(
        JSON.stringify(sortedStrings(albumProfileCollectionUrls)) ===
            JSON.stringify(sortedStrings(expectedAlbumProfileCollectionUrls)),
        "The generated photo album must link all 35 plant Collections, with no missing or extra cards."
    );
    const allAlbumCollectionUrls = new Set(
        photoAlbumHtml
            .matchAll(
                /<a\b[^>]+href="(?<href>https:\/\/gyazo\.com\/collections\/[0-9a-f]{32})"/gv
            )
            .map((match) => required(match.groups?.["href"], captureContext))
    );
    const expectedAlbumCollectionUrls = new Set([
        collectionManifest.gyazo_collection.url,
        ...expectedAlbumProfileCollectionUrls,
    ]);
    assert.ok(
        JSON.stringify(sortedStrings(allAlbumCollectionUrls)) ===
            JSON.stringify(sortedStrings(expectedAlbumCollectionUrls)),
        "The generated photo album contains an unexpected Gyazo Collection link."
    );
}

/**
 * @param {string} photoAlbumHtml
 */
function validatePhotoAlbumAnchors(photoAlbumHtml) {
    const photoAlbumIds = photoAlbumHtml
        .matchAll(/\sid="(?<id>[^"]+)"/gv)
        .map((match) => required(match.groups?.["id"], captureContext))
        .toArray();
    const duplicatePhotoAlbumIds = photoAlbumIds.filter(
        (id, index) => photoAlbumIds.indexOf(id) !== index
    );
    assert.ok(
        duplicatePhotoAlbumIds.length === 0,
        `Duplicate photo-album HTML IDs: ${[
            ...new Set(duplicatePhotoAlbumIds),
        ].join(", ")}`
    );
    const photoAlbumHashTargets = photoAlbumHtml
        .matchAll(/href="#(?<href>[^"]+)"/gv)
        .map((match) => required(match.groups?.["href"], captureContext))
        .toArray();
    const missingPhotoAlbumHashTargets = photoAlbumHashTargets.filter(
        (target) => !photoAlbumIds.includes(target)
    );
    assert.ok(
        missingPhotoAlbumHashTargets.length === 0,
        `Missing photo-album hash targets: ${[
            ...new Set(missingPhotoAlbumHashTargets),
        ].join(", ")}`
    );
    return photoAlbumIds;
}

/**
 * @param {CollectionPhoto} photo
 * @param {string} context
 */
function validatePhotoDescription(photo, context) {
    assert.ok(
        allowedCollectionKinds.has(photo.kind),
        `${context} has unsupported kind ${photo.kind}.`
    );
    assert.ok(
        allowedCollectionViews.has(photo.view),
        `${context} needs a supported view.`
    );
    const evidenceDates = [photo.captured_on, photo.provided_on].filter(
        (value) => typeof value === "string" && value.length > 0
    );
    assert.ok(
        evidenceDates.length === 1 && isIsoDate(evidenceDates[0]),
        `${context} needs exactly one valid captured or provided date.`
    );
    assert.ok(
        typeof photo.alt === "string" && photo.alt.trim().length > 0,
        `${context} is missing alt text.`
    );
    assert.ok(
        typeof photo.caption === "string" && photo.caption.trim().length > 0,
        `${context} is missing a caption.`
    );
}

/**
 * @param {CollectionPhoto} photo
 * @param {string} context
 */
function validatePhotoPublication(photo, context) {
    assert.ok(
        typeof photo === "object" && !Array.isArray(photo),
        `${context} must be a flat photo record.`
    );
    const nestedProperties = Object.entries(photo)
        .filter(([, value]) => typeof value === "object")
        .map(([name]) => name);
    assert.ok(
        JSON.stringify(nestedProperties) ===
            JSON.stringify(["upload_metadata"]),
        `${context} may nest only its verified upload_metadata object.`
    );
    assert.ok(
        !Object.hasOwn(photo, "file"),
        `${context} still has the removed file field.`
    );
    assert.ok(
        typeof photo.publication_name === "string" &&
            photo.publication_name.trim().length > 0,
        `${context} needs a publication name.`
    );
    assert.ok(
        photo.provider === "gyazo",
        `${context} must use the gyazo provider.`
    );
    assert.ok(
        /^[0-9a-f]{32}$/v.test(photo.image_id),
        `${context} has an invalid Gyazo image ID.`
    );
    assert.ok(
        photo.page_url === `https://gyazo.com/${photo.image_id}`,
        `${context} page URL does not agree with its Gyazo image ID.`
    );

    let imageUrl;
    try {
        imageUrl = new URL(photo.image_url);
    } catch {
        throw new Error(`${context} has an invalid Gyazo image URL.`);
    }
    assert.ok(
        imageUrl.protocol === "https:" &&
            (imageUrl.hostname === "gyazo.com" ||
                imageUrl.hostname.endsWith(".gyazo.com")),
        `${context} image URL must use an HTTPS Gyazo host.`
    );
    const pattern5 = new RegExp(
        String.raw`^/${photo.image_id}(?:\.[a-z0-9]+)?$`,
        "i"
    );
    assert.ok(
        pattern5.test(imageUrl.pathname),
        `${context} image URL path does not agree with its Gyazo image ID.`
    );
    const publicationExtension = path
        .extname(photo.publication_name)
        .toLowerCase();
    const directUrlExtension = path.extname(imageUrl.pathname).toLowerCase();
    assert.ok(
        [
            ".jpg",
            ".png",
            ".webp",
        ].includes(publicationExtension) &&
            publicationExtension === directUrlExtension,
        `${context} publication and Gyazo direct URL need the same supported source-quality image type.`
    );
    return publicationExtension;
}

/**
 * @param {CollectionPhoto} photo
 * @param {string} context
 * @param {string} publicationExtension
 */
async function validatePhotoSource(photo, context, publicationExtension) {
    if (photo.derived_note !== undefined) {
        assert.ok(
            typeof photo.derived_note === "string" &&
                photo.derived_note.trim().length > 0,
            `${context} has an empty derivative note.`
        );
        assert.ok(
            typeof photo.provided_on === "string",
            `${context} has a derivative note without a provided date.`
        );
    }
    if (Object.hasOwn(photo, "source_file")) {
        assert.ok(
            typeof photo.source_file === "string" &&
                /^assets\/(?:measurements|nursery-labels)\/.+\.(?:jpe?g|png|webp)$/iv.test(
                    photo.source_file
                ) &&
                !photo.source_file.includes("..") &&
                !photo.source_file.includes("\\"),
            `${context} source_file must point only to preserved repository evidence.`
        );
        const sourceStats = await stat(
            path.join(repositoryRoot, photo.source_file)
        );
        assert.ok(
            sourceStats.size > 1024,
            `${photo.source_file} is unexpectedly small.`
        );
    }
    assert.ok(
        !Object.hasOwn(photo, "evidence_file"),
        `${context} must use source_file for preserved repository evidence.`
    );
    if (Object.hasOwn(photo, "source_note")) {
        assert.ok(
            photo.source_note === expectedPrivateSourceNote &&
                !photo.source_note.includes(".private-photo-sources") &&
                !/[A-Za-z]:[\/\\]/v.test(photo.source_note),
            `${context} has an unsafe or unexpected private-source note.`
        );
    }
    if (Object.hasOwn(photo, "crop_geometry")) {
        assert.ok(
            /^\d+x\d+\+\d+\+\d+$/v.test(photo.crop_geometry ?? "") &&
                publicationExtension === ".png" &&
                typeof photo.derivation_note === "string" &&
                photo.derivation_note.trim().length > 0 &&
                (typeof photo.source_file === "string" ||
                    photo.source_note === expectedPrivateSourceNote),
            `${context} source crop must have valid geometry, a source, a derivation note, and lossless PNG output.`
        );
    }
    if (photo.kind === nurseryLabelKind) {
        assert.ok(
            (photo.source_file ?? "").startsWith("assets/nursery-labels/"),
            `${context} must retain its nursery-label source evidence.`
        );
    }
}

/**
 * @param {CollectionPhoto} photo
 * @param {string} context
 * @param {Map<string, number>} photoReferenceCounts
 * @param {Map<string, Set<string>>} photoAltTextsByImageId
 */
function validatePhotoUploadMetadata(
    photo,
    context,
    photoReferenceCounts,
    photoAltTextsByImageId
) {
    assert.ok(
        typeof photo.upload_metadata === "object" &&
            !Array.isArray(photo.upload_metadata),
        `${context} needs verified public Gyazo upload metadata.`
    );
    assert.ok(
        JSON.stringify(
            Object.keys(photo.upload_metadata).toSorted(compareText)
        ) ===
            JSON.stringify([
                "app",
                "desc",
                "title",
                "url",
            ]),
        `${context} upload_metadata must contain only app, title, url, and desc.`
    );
    assert.ok(
        photo.upload_metadata.app === expectedGyazoApplicationName,
        `${context} has the wrong Gyazo application name.`
    );
    assert.ok(
        photoAltTextsByImageId
            .get(photo.image_id)
            ?.has(photo.upload_metadata.title) ?? false,
        `${context} Gyazo title must match one accessible description for the shared capture.`
    );
    assert.ok(
        photo.upload_metadata.url === publicPhotoAlbumUrl ||
            (photo.upload_metadata.url.startsWith(`${publicFieldGuideUrl}#`) &&
                photo.upload_metadata.url.length >
                    `${publicFieldGuideUrl}#`.length),
        `${context} Gyazo referer must point to the public field guide or photo index.`
    );
    const referenceCount = photoReferenceCounts.get(photo.image_id) ?? 0;
    const expectedDescriptionContexts = [photo.caption.trim()];
    if (referenceCount > 1) {
        expectedDescriptionContexts.push(
            `shared by ${referenceCount} plant profiles`
        );
    }
    assert.ok(
        typeof photo.upload_metadata.desc === "string" &&
            expectedDescriptionContexts.some((description) =>
                photo.upload_metadata.desc.includes(description)
            ) &&
            photo.upload_metadata.desc.includes(`view: ${photo.view}`) &&
            photo.upload_metadata.desc.includes(
                "Copyright Nick; all rights reserved"
            ),
        `${context} Gyazo description must retain its caption, view, and copyright context.`
    );
}

/**
 * @param {Awaited<ReturnType<typeof discoverProfiles>>[number]} profile
 * @param {{ slug: string; title: string; trackerId: string } | undefined} expectedFieldGuideProfile
 */
function validateProfile(profile, expectedFieldGuideProfile) {
    const { inventoryId, labelId, orderStatus, status, title, trackerId } =
        readProfileIdentity(profile.markdown);
    const isReceiptUnverified = /\b(?:pending|unverified)\b/iv.test(
        orderStatus
    );
    const isHistorical =
        inventoryId === "Rehab-04" || /historical/iv.test(status);
    const hasAcquisitionSource =
        /^- (?:Acquired from|Ordered from):\s*\S/mv.test(profile.markdown);
    assert.ok(
        hasAcquisitionSource,
        `${profile.slug} has no Acquired from or Ordered from metadata.`
    );
    assert.ok(
        !isReceiptUnverified ||
            /^- Ordered from:\s*\S/mv.test(profile.markdown),
        `${profile.slug} has unverified collection receipt without Ordered from metadata.`
    );

    const expectedMountainCrest = expectedMountainCrestProfiles.get(
        profile.slug
    );
    if (expectedMountainCrest) {
        assert.ok(
            inventoryId === expectedMountainCrest.inventoryId &&
                labelId === expectedMountainCrest.labelId &&
                trackerId === expectedMountainCrest.trackerId,
            `${profile.slug} must map to ${expectedMountainCrest.inventoryId}/${expectedMountainCrest.labelId}/${expectedMountainCrest.trackerId}; found ${inventoryId}/${labelId}/${trackerId}.`
        );
    }

    const expectedHomeDepot = expectedHomeDepotProfiles.get(profile.slug);
    if (expectedHomeDepot) {
        assert.ok(
            inventoryId === expectedHomeDepot.inventoryId &&
                labelId === expectedHomeDepot.labelId &&
                trackerId === expectedHomeDepot.trackerId,
            `${profile.slug} must map to ${expectedHomeDepot.inventoryId}/${expectedHomeDepot.labelId}/${expectedHomeDepot.trackerId}; found ${inventoryId}/${labelId}/${trackerId}.`
        );
    }

    assert.ok(
        isHistorical ? trackerId === "" : /^P\d{2}$/v.test(trackerId),
        isHistorical
            ? `${profile.slug} is historical and must not have a Tracker ID.`
            : `${profile.slug} needs a P01-P30 Tracker ID.`
    );
    assert.ok(
        isHistorical
            ? !expectedFieldGuideProfile
            : expectedFieldGuideProfile?.trackerId === trackerId &&
                  expectedFieldGuideProfile.title === title,
        isHistorical
            ? `${profile.slug} is historical and must not appear in the current field-guide map.`
            : `${profile.slug} must match its canonical field-guide title and Tracker ID; found ${title}/${trackerId}.`
    );

    return {
        historical: isHistorical,
        inventoryId,
        receiptUnverified: isReceiptUnverified,
        slug: profile.slug,
        trackerId,
    };
}

/**
 * @param {Awaited<ReturnType<typeof discoverProfiles>>} profiles
 * @param {import("./build-data.mjs").ProfileData} fieldGuideProfiles
 */
function validateProfileInventory(profiles, fieldGuideProfiles) {
    const profileSlugs = new Set(profiles.map((profile) => profile.slug));
    const fieldGuideProfileEntries = Object.entries(fieldGuideProfiles).flatMap(
        ([trackerId, entries]) =>
            entries.map(([slug, title]) => ({ slug, title, trackerId }))
    );
    const fieldGuideProfileBySlug = new Map(
        fieldGuideProfileEntries.map((entry) => [entry.slug, entry])
    );
    assert.ok(
        profiles.length === expectedProfileCount,
        `Expected ${expectedProfileCount} Markdown profiles; found ${profiles.length}.`
    );
    assert.ok(
        expectedMountainCrestProfiles
            .keys()
            .every((slug) => profileSlugs.has(slug)),
        "One or more Mountain Crest onboarding profiles are missing."
    );
    assert.ok(
        expectedHomeDepotProfiles
            .keys()
            .every((slug) => profileSlugs.has(slug)),
        "One or more September 2 Home Depot profiles are missing."
    );
    const profileStates = profiles.map((profile) =>
        validateProfile(profile, fieldGuideProfileBySlug.get(profile.slug))
    );
    const presentProfileCount = profileStates.filter(
        (profile) => !profile.historical && !profile.receiptUnverified
    ).length;
    const unverifiedReceiptProfileCount = profileStates.filter(
        (profile) => profile.receiptUnverified
    ).length;
    const historicalProfileCount = profileStates.filter(
        (profile) => profile.historical
    ).length;

    assert.ok(
        presentProfileCount === expectedPresentProfiles,
        `Expected ${expectedPresentProfiles} physically present profiles; found ${presentProfileCount}.`
    );
    assert.ok(
        unverifiedReceiptProfileCount === expectedUnverifiedReceiptProfiles,
        `Expected ${expectedUnverifiedReceiptProfiles} profiles with unverified collection receipt; found ${unverifiedReceiptProfileCount}.`
    );
    assert.ok(
        historicalProfileCount === expectedHistoricalProfiles,
        `Expected ${expectedHistoricalProfiles} historical profile; found ${historicalProfileCount}.`
    );
    const trackerIds = profileStates
        .map((profile) => profile.trackerId)
        .filter(Boolean);
    assert.ok(
        fieldGuideProfileBySlug.size === fieldGuideProfileEntries.length &&
            fieldGuideProfileEntries.length === expectedTrackedProfiles,
        "The canonical field-guide profile map must contain 35 unique current-profile slugs."
    );
    const expectedTrackerIds = Array.from(
        { length: 30 },
        (_, index) => `P${String(index + 1).padStart(2, "0")}`
    );
    assert.ok(
        // eslint-disable-next-line canonical/no-use-extend-native -- Array.toSorted is native in the required Node 26.7 runtime; the rule's registry is stale.
        JSON.stringify([...new Set(trackerIds)].toSorted(compareText)) ===
            JSON.stringify(expectedTrackerIds),
        "Current profiles must cover every permanent Tracker ID from P01 through P30."
    );
    assert.ok(
        trackerIds.filter((id) => id === "P19").length === 3 &&
            trackerIds.filter((id) => id === "P20").length === 4 &&
            trackerIds.filter((id) => !["P19", "P20"].includes(id)).length ===
                28,
        "Tracker IDs must preserve the intentional three-profile P19 and four-profile P20 shared-planter mappings."
    );
    return profileStates;
}

/**
 * @param {string} html
 * @param {string[]} profileSlugs
 */
function validateProfilePages(html, profileSlugs) {
    const pageSlugs = html
        .matchAll(/<article\b[^>]*>/gv)
        .map((match) => required(match[0], captureContext))
        .filter((tag) => {
            const classes = htmlAttribute(tag, "class")?.split(/\s+/v) ?? [];
            return (
                classes.includes("book-page") &&
                classes.includes("profile-page")
            );
        })
        .map((tag) => htmlAttribute(tag, "id"))
        .filter(isNonemptyString)
        .toArray();
    assert.ok(
        pageSlugs.length === profileSlugs.length,
        `Expected ${profileSlugs.length} profile pages; found ${pageSlugs.length}.`
    );
    assert.ok(
        JSON.stringify(pageSlugs.toSorted(compareText)) ===
            JSON.stringify(profileSlugs),
        "The booklet profile pages do not match the Markdown profile files."
    );
    const templateSlugs = html
        .matchAll(
            /<template\b[^>]+data-profile-template="(?<slug>[^"]+)"[^>]*>/gv
        )
        .map((match) => required(match.groups?.["slug"], captureContext))
        .toArray();
    assert.ok(
        JSON.stringify(sortedStrings(templateSlugs)) ===
            JSON.stringify(profileSlugs),
        "Every profile must have exactly one lazy-mount template."
    );
    const emptyProfilePlaceholders = html
        .matchAll(
            /<article\b[^>]+class="[^"]*\bprofile-page\b[^"]*"[^>]*>\s*<\/article>/gv
        )
        .toArray();
    assert.ok(
        emptyProfilePlaceholders.length === expectedProfileCount,
        `Expected ${expectedProfileCount} empty profile placeholders; found ${emptyProfilePlaceholders.length}.`
    );
    const coverTag = /<section\b[^>]+id="cover"[^>]*>/v.exec(html)?.[0] ?? "";
    assert.ok(
        /\shidden(?:\s|>)/v.test(coverTag),
        "The cover must start hidden so direct profile links do not fetch its collage."
    );
    const coverHtml = html.slice(
        html.indexOf(coverTag),
        html.indexOf('id="contents"')
    );
    assert.ok(
        !coverHtml.includes('loading="eager"') &&
            (coverHtml.match(/loading="lazy"/gv) ?? []).length === 6,
        "The hidden cover must keep all six collage images lazy until selected."
    );
    return pageSlugs;
}

/**
 * @param {string} html
 * @param {Awaited<ReturnType<typeof discoverProfiles>>} profiles
 * @param {import("./build-data.mjs").CollectionManifest} collectionManifest
 * @param {Map<string, ReturnType<typeof validateProfile>>} profileStateBySlug
 */
function validateProfilePhotoPlacements(
    html,
    profiles,
    collectionManifest,
    profileStateBySlug
) {
    const collectionRecordBySlug = new Map(
        collectionManifest.plants.map((record) => [record.plant_slug, record])
    );
    const pageHtmlBySlug = profilePageSections(html);
    let profileCollectionLinkCount = 0;
    for (const profile of profiles) {
        const pageHtml = pageHtmlBySlug.get(profile.slug);
        const record = required(
            collectionRecordBySlug.get(profile.slug),
            `collection record for ${profile.slug}`
        );
        assert.ok(
            isNonemptyString(pageHtml),
            `No rendered profile page found for ${profile.slug}.`
        );

        const figures = renderedCollectionFigures(pageHtml);
        const latestFigures = figures.filter((figure) => figure.latest);
        const collectionFigures = figures.filter(
            (figure) => figure.kind === "collection"
        );
        const nurseryLabelFigures = figures.filter(
            (figure) => figure.kind === nurseryLabelKind
        );
        const collectionLinks = tagsWithClass(
            pageHtml,
            "a",
            "gyazo-collection-link"
        );
        profileCollectionLinkCount += collectionLinks.length;

        const profileState = profileStateBySlug.get(profile.slug);
        if (!profileState) {
            throw new Error(
                `${profile.slug} has no matching generated profile state.`
            );
        }
        if (profileState.historical) {
            assert.ok(
                figures.length === 0 && collectionLinks.length === 0,
                `${profile.slug} must render only its pending note, with no inline Gyazo photos or Collection link.`
            );
            continue;
        }

        const growthPhotos = record.photos
            .filter(
                (/** @type {{ kind: string }} */ photo) =>
                    photo.kind === "collection"
            )
            .toSorted(compareCollectionPhotosNewestFirst);
        const nurseryLabelPhotos = record.photos.filter(
            (/** @type {{ kind: string }} */ photo) =>
                photo.kind === nurseryLabelKind
        );
        const expectedLatestIds = growthPhotos
            .slice(0, 2)
            .map((photo) => photo.image_id);
        const expectedNurseryLabelIds = nurseryLabelPhotos.map(
            (photo) => photo.image_id
        );

        assert.ok(
            JSON.stringify(latestFigures.map((figure) => figure.imageId)) ===
                JSON.stringify(expectedLatestIds),
            `${profile.slug} must render its latest two collection-kind photos in newest-first order.`
        );
        assert.ok(
            JSON.stringify(
                collectionFigures.map((figure) => figure.imageId)
            ) === JSON.stringify(expectedLatestIds),
            `${profile.slug} renders collection-kind photos outside its latest-two preview.`
        );
        const renderedNurseryLabelIds = nurseryLabelFigures.map(
            (figure) => figure.imageId
        );
        assert.ok(
            nurseryLabelFigures.every((figure) => !figure.latest) &&
                JSON.stringify(sortedStrings(renderedNurseryLabelIds)) ===
                    JSON.stringify(sortedStrings(expectedNurseryLabelIds)),
            `${profile.slug} must render every nursery-label placement separately from its latest collection photos.`
        );
        assert.ok(
            collectionLinks.length === 1 &&
                htmlAttribute(
                    required(collectionLinks[0], "collection link"),
                    "href"
                ) === required(record.gyazo_collection, "Gyazo collection").url,
            `${profile.slug} needs exactly one link to its Gyazo Collection.`
        );
    }
    assert.ok(
        profileCollectionLinkCount === expectedPresentProfiles,
        `Expected ${expectedPresentProfiles} profile Gyazo Collection links; found ${profileCollectionLinkCount}.`
    );
}

/**
 * @param {string} html
 * @param {Awaited<ReturnType<typeof discoverProfiles>>} profiles
 */
function validateProfileSectionsAndLinks(html, profiles) {
    // Compare generated destinations with the runtime mapping, not a second
    // source-text parser: numeric separators must never truncate worksheet IDs.
    for (let index = 1; index <= 30; index += 1) {
        const trackerId = `P${String(index).padStart(2, "0")}`;
        assert.ok(
            html.includes(sheetUrls.plantPage(trackerId)),
            `The field guide must retain the complete worksheet ID for ${trackerId}.`
        );
    }
    const atAGlanceCount = (html.match(/class="profile-at-a-glance"/gv) ?? [])
        .length;
    assert.ok(
        atAGlanceCount === profiles.length,
        `Expected ${profiles.length} at-a-glance sections; found ${atAGlanceCount}.`
    );
    assert.ok(
        (html.match(/What it looks\s+like<\/h2/gv) ?? []).length ===
            profiles.length,
        "Every profile needs a visual-description heading."
    );
    assert.ok(
        (html.match(/Did you know\?<\/h2/gv) ?? []).length === profiles.length,
        "Every profile needs an interesting-fact heading."
    );
    assert.ok(
        (html.match(/class="profile-history-link"/gv) ?? []).length ===
            expectedTrackedProfiles,
        `Expected ${expectedTrackedProfiles} live history links.`
    );
    assert.ok(
        (html.match(/class="profile-sheet-link"/gv) ?? []).length ===
            expectedTrackedProfiles &&
            (html.match(/class="drawer-sheet-link"/gv) ?? []).length ===
                expectedTrackedProfiles,
        "Every tracked profile needs direct Google Sheets links in both the profile rail and contents drawer."
    );
    assert.ok(
        (html.match(/class="profile-photo-history-link"/gv) ?? []).length ===
            profiles.length,
        "Every profile needs an in-page link to its photo history."
    );
    const expectedSellerProductLinks = profiles.flatMap((profile) =>
        sellerProductLinks(profile.markdown)
    ).length;
    assert.ok(
        (html.match(/class="seller-product-link"/gv) ?? []).length ===
            expectedSellerProductLinks,
        `Expected ${expectedSellerProductLinks} exact seller-product links.`
    );
    const expectedSellerSnapshots = profiles.filter((profile) =>
        /^## Seller listing snapshot\s*$/mv.test(profile.markdown)
    ).length;
    assert.ok(
        (html.match(/class="seller-snapshot"/gv) ?? []).length ===
            expectedSellerSnapshots,
        `Expected ${expectedSellerSnapshots} styled seller snapshots.`
    );
    const inaturalistLinks = html
        .matchAll(
            /class="inaturalist-link"[^>]+href="https:\/\/w{3}\.inaturalist\.org\/observations\?taxon_name=[^"]+"[^>]+data-inaturalist-taxon="(?<taxon>[^"]+)"/gv
        )
        .toArray();
    assert.ok(
        inaturalistLinks.length === profiles.length,
        `Expected ${profiles.length} iNaturalist observation links; found ${inaturalistLinks.length}.`
    );
    assert.ok(
        inaturalistLinks.every((match) =>
            required(match.groups?.["taxon"], captureContext).trim()
        ),
        "Every iNaturalist observation link needs a non-empty discovery taxon."
    );
    assert.ok(
        html.includes('id="surprise-plant"'),
        "The booklet is missing the random-profile link."
    );
    assert.ok(
        html.includes("localStorage.getItem(themeKey)"),
        "The booklet does not use the shared site theme key."
    );
}

/**
 * @param {Awaited<ReturnType<typeof discoverProfiles>>} profiles
 */
function validateProfileSources(profiles) {
    for (const profile of profiles) {
        const headings = profile.markdown
            .matchAll(/^##[^\S\n\r]+(?<heading>\S[^\n\r]*)$/gmv)
            .map((match) =>
                required(match.groups?.["heading"], captureContext).trim()
            )
            .toArray();
        const sourceStart = profile.markdown.search(/^## Sources\s*$/mv);
        const sourceLinks =
            sourceStart >= 0
                ? profile.markdown
                      .slice(sourceStart)
                      .matchAll(/\]\(https?:\/\/[^\)]+\)/gv)
                      .toArray()
                : [];

        assert.ok(
            headings.length >= 5,
            `${profile.slug} has only ${headings.length} substantive sections.`
        );
        assert.ok(sourceStart >= 0, `${profile.slug} has no Sources section.`);
        assert.ok(
            sourceLinks.length >= 2,
            `${profile.slug} has fewer than two external research sources.`
        );
        assert.ok(
            headings.some((heading) => /care|rehabilitation/iv.test(heading)),
            `${profile.slug} has no care or rehabilitation section.`
        );

        for (const field of [
            "Inventory",
            "Label ID",
            "Identification",
        ]) {
            const pattern10 = new RegExp(String.raw`^- ${field}:\s*\S`, "m");
            assert.ok(
                pattern10.test(profile.markdown),
                `${profile.slug} is missing its ${field} metadata.`
            );
        }
    }
}

/**
 * @param {import("./build-data.mjs").PhotoManifest} manifest
 * @param {string[]} profileSlugs
 * @param {string} html
 */
async function validateReferenceArchive(manifest, profileSlugs, html) {
    const photoRecords = manifest.photos;
    assert.ok(
        Array.isArray(photoRecords),
        "Photo manifest has no photos array."
    );
    // eslint-disable-next-line canonical/no-use-extend-native -- Map.groupBy is native in the required Node 26.7 runtime; the rule's registry is stale.
    const recordsBySlug = Map.groupBy(
        photoRecords,
        (record) => record.plant_slug
    );
    const sourceUrls = new Set();
    const localFiles = new Set();
    const coverageLines = [];
    const orderedRecords = profileSlugs.flatMap(
        (slug) => recordsBySlug.get(slug) ?? []
    );
    const fileStatResults = await Promise.allSettled(
        orderedRecords.map(async (record) =>
            stat(path.join(repositoryRoot, record.file))
        )
    );
    const fileStatsByRecord = new Map(
        orderedRecords.map((record, index) => [
            record,
            required(
                fileStatResults[index],
                "reference file statistics result"
            ),
        ])
    );

    for (const slug of profileSlugs) {
        const records = recordsBySlug.get(slug) ?? [];
        if (records.length > 0) {
            assert.ok(
                records.length >= 6,
                `${slug} has only ${records.length} archived photos.`
            );
        }
        const subjects = new Set();

        /* eslint-disable no-await-in-loop -- Hash one source image at a time because fileHash holds the complete file buffer; metadata reads above are independent. */
        for (const record of records) {
            assert.ok(
                allowedSubjects.has(record.subject),
                `${record.file} has unsupported subject ${record.subject}.`
            );
            assert.ok(
                allowedLicense.test(record.license),
                `${record.file} has unsupported license ${record.license}.`
            );
            assert.ok(
                !sourceUrls.has(record.source_url),
                `Duplicate source URL: ${record.source_url}`
            );
            assert.ok(
                !localFiles.has(record.file),
                `Duplicate local file: ${record.file}`
            );
            sourceUrls.add(record.source_url);
            localFiles.add(record.file);
            subjects.add(record.subject);

            const absolutePath = path.join(repositoryRoot, record.file);
            const fileStats = fulfilledValue(
                required(
                    fileStatsByRecord.get(record),
                    "reference file statistics"
                )
            );
            assert.ok(
                fileStats.size > 1024,
                `${record.file} is unexpectedly small.`
            );
            const hash = await fileHash(absolutePath);
            assert.ok(
                hash === record.sha256,
                `SHA-256 mismatch for ${record.file}.`
            );
        }
        /* eslint-enable no-await-in-loop -- Resume the rule after sequential image hashing. */

        coverageLines.push(
            records.length > 0
                ? // eslint-disable-next-line canonical/no-use-extend-native -- Array.toSorted is native in the required Node 26.7 runtime; the rule's registry is stale.
                  `${slug}: ${records.length} photos · ${[...subjects].toSorted(compareText).join(", ")}`
                : `${slug}: 0 photos · archive pending`
        );
    }
    const galleryPhotoCount = (html.match(/class="gallery-photo"/gv) ?? [])
        .length;
    assert.ok(
        galleryPhotoCount === photoRecords.length,
        `Expected ${photoRecords.length} gallery figures; found ${galleryPhotoCount}.`
    );
    return { coverageLines, photoRecords };
}

/**
 * @param {string} html
 * @param {number} profileCount
 * @param {Awaited<ReturnType<typeof validateCollectionManifest>>} expected
 */
function validateRenderedCollectionCounts(html, profileCount, expected) {
    const {
        expectedHistoryPreviewPhotos,
        expectedInlineCollectionPhotos,
        expectedNurseryEvidenceSections,
        expectedPendingPhotos,
        expectedViewBadges,
    } = expected;
    const collectionPanelCount = tagsWithClass(
        html,
        "section",
        "collection-gallery"
    ).length;
    const collectionPhotoFigures = renderedCollectionFigures(html);
    const collectionPhotoCount = collectionPhotoFigures.length;
    const pendingPhotoCount = (
        html.match(/class="collection-photo-pending"/gv) ?? []
    ).length;
    assert.ok(
        collectionPanelCount === profileCount,
        `Expected ${profileCount} collection-photo panels; found ${collectionPanelCount}.`
    );
    assert.ok(
        collectionPhotoCount === expectedInlineCollectionPhotos,
        `Expected ${expectedInlineCollectionPhotos} inline collection and nursery-label photos; found ${collectionPhotoCount}.`
    );
    assert.ok(
        pendingPhotoCount === expectedPendingPhotos,
        `Expected ${expectedPendingPhotos} pending-photo panels; found ${pendingPhotoCount}.`
    );
    const collectionOverviewPhotoCount = (
        html.match(/\bcollection-overview-photo\b/gv) ?? []
    ).length;
    assert.ok(
        collectionOverviewPhotoCount === 0,
        "Collection overview photographs must remain in the generated photo album, not the booklet."
    );
    const viewBadgeCount = (html.match(/class="photo-view"/gv) ?? []).length;
    assert.ok(
        viewBadgeCount === expectedViewBadges,
        `Expected ${expectedViewBadges} collection-photo view badges; found ${viewBadgeCount}.`
    );
    assert.ok(
        !html.includes('id="collection-history"'),
        "The obsolete standalone collection photo-history page is still present."
    );
    const historyPreviewPhotoCount = collectionPhotoFigures.filter(
        (figure) => figure.latest
    ).length;
    assert.ok(
        historyPreviewPhotoCount === expectedHistoryPreviewPhotos,
        `Expected ${expectedHistoryPreviewPhotos} latest-history preview photos; found ${historyPreviewPhotoCount}.`
    );
    const nurseryEvidenceCount = (
        html.match(/class="nursery-evidence"/gv) ?? []
    ).length;
    assert.ok(
        nurseryEvidenceCount === expectedNurseryEvidenceSections,
        `Expected ${expectedNurseryEvidenceSections} nursery-evidence sections; found ${nurseryEvidenceCount}.`
    );
}

await main();
