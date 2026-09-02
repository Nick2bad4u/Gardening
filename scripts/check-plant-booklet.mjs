import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
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
    "young",
    "habit",
    "flower",
    "fruit-seed",
    "habitat",
    "detail",
]);
const allowedLicense =
    /^(?:CC0|CC BY(?: SA|-SA)?|CC BY-SA \d|Public domain|No restrictions)/i;
const allowedCollectionKinds = new Set(["collection", "nursery-label"]);
const allowedCollectionViews = new Set([
    "side",
    "top",
    "detail",
    "three-quarter",
    "opposite-side",
    "context",
    "receipt-condition",
    "receipt-context",
    "overview",
    "label-front",
    "label-back",
]);
const expectedTrackedProfiles = 35;
const expectedProfileCount = 36;
const expectedPresentProfiles = 35;
const expectedUnverifiedReceiptProfiles = 0;
const expectedHistoricalProfiles = 1;
const expectedCollectionOverviews = 3;
const expectedCollectionPlacements = 170;
const expectedUniqueGyazoImages = 124;
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
        "tephrocactus-articulatus-papyracanthus",
        { inventoryId: "Cactus-08", labelId: "G2", trackerId: "P23" },
    ],
    [
        "sempervivum-coconut-crystal",
        { inventoryId: "Succulent-08", labelId: "H1", trackerId: "P24" },
    ],
    [
        "echeveria-raindrops",
        { inventoryId: "Succulent-07", labelId: "H2", trackerId: "P25" },
    ],
    [
        "austrocylindropuntia-subulata",
        { inventoryId: "Cactus-07", labelId: "H3", trackerId: "P26" },
    ],
    [
        "gymnocalycium-mihanovichii-black-widow",
        { inventoryId: "Cactus-09", labelId: "G1", trackerId: "P27" },
    ],
    [
        "pleiospilos-nelii-royal-flush",
        { inventoryId: "Succulent-06", labelId: "G3", trackerId: "P28" },
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
function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function fileHash(filePath) {
    const bytes = await readFile(filePath);
    return createHash("sha256").update(bytes).digest("hex");
}

async function discoverProfiles() {
    const profiles = [];
    for (const group of profileGroups) {
        const directory = path.join(repositoryRoot, "docs", "plants", group);
        for (const fileName of await readdir(directory)) {
            if (!fileName.endsWith(".md")) continue;
            profiles.push({
                group,
                slug: path.basename(fileName, ".md"),
                markdown: await readFile(
                    path.join(directory, fileName),
                    "utf8"
                ),
            });
        }
    }
    return profiles.sort((left, right) => left.slug.localeCompare(right.slug));
}

function localReferences(html) {
    return [
        ...html.matchAll(
            /\b(?:href|src)="((?:\.\.?\/)[^"#?]+)(?:[?#][^"]*)?"/g
        ),
    ].map((match) => match[1]);
}

function htmlAttribute(tag, attributeName) {
    const match = tag.match(
        new RegExp(`\\b${attributeName}=(['\"])(.*?)\\1`, "s")
    );
    return match?.[2];
}

function htmlClasses(tag) {
    return new Set(
        (htmlAttribute(tag, "class") ?? "").split(/\s+/).filter(Boolean)
    );
}

function tagsWithClass(html, tagName, className) {
    return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "g"))]
        .map((match) => match[0])
        .filter((tag) => htmlClasses(tag).has(className));
}

function collectionPhotoDate(photo) {
    return photo.captured_on ?? photo.provided_on;
}

function isIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return (
        !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
    );
}

function compareCollectionPhotosNewestFirst(left, right) {
    const dateDifference = collectionPhotoDate(right).localeCompare(
        collectionPhotoDate(left)
    );
    const viewPriority = new Map([
        ["detail", 0],
        ["side", 1],
        ["top", 2],
        ["context", 3],
        ["overview", 4],
        ["label-front", 5],
        ["label-back", 6],
    ]);
    return (
        dateDifference ||
        (viewPriority.get(left.view) ?? 9) - (viewPriority.get(right.view) ?? 9)
    );
}

function assertGyazoCollection(collection, context) {
    assert(
        collection &&
            typeof collection === "object" &&
            !Array.isArray(collection),
        `${context} needs a Gyazo Collection object.`
    );
    assert(
        JSON.stringify(Object.keys(collection).sort()) ===
            JSON.stringify(["id", "url"]),
        `${context} Gyazo Collection must contain only id and url.`
    );
    assert(
        /^[a-f0-9]{32}$/.test(collection.id ?? ""),
        `${context} has an invalid Gyazo Collection ID.`
    );
    assert(
        collection.url === `https://gyazo.com/collections/${collection.id}`,
        `${context} Gyazo Collection URL does not agree with its ID.`
    );
    return collection.id;
}

function captureMetadata(photo) {
    return JSON.stringify({
        kind: photo.kind,
        provider: photo.provider,
        image_id: photo.image_id,
        image_url: photo.image_url,
        page_url: photo.page_url,
        captured_on: photo.captured_on ?? null,
        provided_on: photo.provided_on ?? null,
        view: photo.view,
        source_file: photo.source_file ?? null,
        source_note: photo.source_note ?? null,
        crop_geometry: photo.crop_geometry ?? null,
        derived_note: photo.derived_note ?? null,
        derivation_note: photo.derivation_note ?? null,
        upload_metadata: photo.upload_metadata ?? null,
    });
}

function profilePageSections(html) {
    const starts = [...html.matchAll(/<article\b[^>]*>/g)].filter((match) => {
        const classes = htmlClasses(match[0]);
        return classes.has("book-page") && classes.has("profile-page");
    });
    return new Map(
        starts.map((match, index) => [
            htmlAttribute(match[0], "id"),
            html.slice(match.index, starts[index + 1]?.index ?? html.length),
        ])
    );
}

function renderedCollectionFigures(html) {
    return [...html.matchAll(/<figure\b[^>]*>[\s\S]*?<\/figure>/g)]
        .filter((match) => htmlClasses(match[0]).has("collection-photo"))
        .map((match) => {
            const imageTag = match[0].match(/<img\b[^>]*>/)?.[0] ?? "";
            return {
                imageId: htmlAttribute(imageTag, "data-image-id"),
                kind: htmlAttribute(match[0], "data-photo-kind"),
                latest: htmlClasses(match[0]).has("collection-photo--latest"),
            };
        });
}

function sortedStrings(values) {
    return [...values].sort((left, right) => left.localeCompare(right));
}

function sellerProductLinks(markdown) {
    const allowedHosts = new Set([
        "costafarms.com",
        "mountaincrestgardens.com",
        "shopaltmanplants.com",
        "www.lowes.com",
    ]);

    return [...markdown.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)]
        .filter(
            ([
                ,
                label,
                href,
            ]) => {
                const url = new URL(href);
                return (
                    allowedHosts.has(url.hostname) &&
                    /seller listing|altman reserve|feather cactus/i.test(label)
                );
            }
        )
        .map(
            ([
                ,
                ,
                href,
            ]) => href
        );
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
        readFile(manifestPath, "utf8").then(JSON.parse),
        readFile(collectionManifestPath, "utf8").then(JSON.parse),
        discoverProfiles(),
        readFile(plantProfileDataPath, "utf8").then(JSON.parse),
    ]);
    const serializedCollectionManifest = JSON.stringify(collectionManifest);
    assert(
        !serializedCollectionManifest.includes(".private-photo-sources") &&
            !/[A-Za-z]:\\\\/.test(serializedCollectionManifest),
        "Collection-photo manifest must not expose private or absolute Windows source paths."
    );
    assert(
        !serializedCollectionManifest.includes('"evidence_file"'),
        "Collection-photo manifest must use source_file for preserved public evidence."
    );
    const fieldGuideProfileEntries = Object.entries(fieldGuideProfiles).flatMap(
        ([trackerId, entries]) =>
            entries.map(([slug, title]) => ({ slug, title, trackerId }))
    );
    const fieldGuideProfileBySlug = new Map(
        fieldGuideProfileEntries.map((entry) => [entry.slug, entry])
    );
    const profileSlugs = profiles.map((profile) => profile.slug);
    const iconSymbols = [
        ...iconSprite.matchAll(/<symbol id="icon-([a-z-]+)"/g),
    ].map((match) => match[1]);
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

    assert(
        iconSymbols.length === iconSymbolSet.size &&
            requiredIconSymbols.every((name) => iconSymbolSet.has(name)),
        "The shared icon sprite is missing a required symbol or contains duplicate IDs."
    );
    const expectedPlantIconSymbols = profileSlugs.map(
        (slug) => `plant-${slug}`
    );
    const renderedPlantIconSymbols = iconSymbols.filter((name) =>
        name.startsWith("plant-")
    );
    assert(
        renderedPlantIconSymbols.length === profiles.length &&
            expectedPlantIconSymbols.every((name) => iconSymbolSet.has(name)),
        "The shared icon sprite must contain exactly one plant-specific portrait for every profile."
    );
    const plantPortraitBodies = expectedPlantIconSymbols.map((name) => {
        const escapedName = name.replaceAll("-", "\\-");
        return iconSprite
            .match(
                new RegExp(
                    `<symbol id="icon-${escapedName}"[^>]*>([\\s\\S]*?)<\\/symbol>`
                )
            )?.[1]
            ?.replaceAll(/\s+/g, " ")
            .trim();
    });
    assert(
        plantPortraitBodies.every(Boolean) &&
            new Set(plantPortraitBodies).size === profiles.length,
        "Every profile must use distinct morphology-led SVG portrait artwork."
    );
    assert(
        !/<script\b/i.test(iconSprite) && !/currentcolor/i.test(iconSprite),
        "The shared icon sprite must remain script-free and use explicit multicolor artwork."
    );
    for (const match of iconSprite.matchAll(
        /<symbol id="icon-([a-z-]+)"[\s\S]*?<\/symbol>/g
    )) {
        const colors = new Set(
            [...match[0].matchAll(/#[0-9a-f]{6}/gi)].map((color) =>
                color[0].toLowerCase()
            )
        );
        assert(
            colors.size >= 2,
            `Icon ${match[1]} must contain at least two explicit colors.`
        );
    }
    for (const generatedHtml of [html, photoAlbumHtml]) {
        for (const match of generatedHtml.matchAll(
            /plant-icons\.svg#icon-([a-z-]+)/g
        )) {
            assert(
                iconSymbolSet.has(match[1]),
                `Generated HTML references missing icon ${match[1]}.`
            );
        }
    }

    assert(
        profiles.length === expectedProfileCount,
        `Expected ${expectedProfileCount} Markdown profiles; found ${profiles.length}.`
    );
    assert(
        [...expectedMountainCrestProfiles.keys()].every((slug) =>
            profileSlugs.includes(slug)
        ),
        "One or more Mountain Crest onboarding profiles are missing."
    );
    assert(
        [...expectedHomeDepotProfiles.keys()].every((slug) =>
            profileSlugs.includes(slug)
        ),
        "One or more September 2 Home Depot profiles are missing."
    );

    const profileStates = profiles.map((profile) => {
        const title = profile.markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
        const inventoryId =
            profile.markdown.match(/^\- Inventory:\s*([^\s]+)\s/m)?.[1] ?? "";
        const labelId =
            profile.markdown.match(/^\- Label ID:\s*`([^`]+)`/m)?.[1] ?? "";
        const trackerId =
            profile.markdown.match(/^\- Tracker ID:\s*`([^`]+)`/m)?.[1] ?? "";
        const orderStatus =
            profile.markdown.match(/^\- Order status:\s*(.+)$/m)?.[1] ?? "";
        const status =
            profile.markdown.match(/^\- Status:\s*(.+)$/m)?.[1] ?? "";
        const receiptUnverified = /\b(?:pending|unverified)\b/i.test(
            orderStatus
        );
        const historical =
            inventoryId === "Rehab-04" || /historical/i.test(status);
        const hasAcquisitionSource =
            /^\- (?:Acquired from|Ordered from):\s*\S/m.test(profile.markdown);
        const expectedFieldGuideProfile = fieldGuideProfileBySlug.get(
            profile.slug
        );

        assert(
            hasAcquisitionSource,
            `${profile.slug} has no Acquired from or Ordered from metadata.`
        );
        assert(
            !receiptUnverified ||
                /^\- Ordered from:\s*\S/m.test(profile.markdown),
            `${profile.slug} has unverified collection receipt without Ordered from metadata.`
        );

        const expectedMountainCrest = expectedMountainCrestProfiles.get(
            profile.slug
        );
        if (expectedMountainCrest) {
            assert(
                inventoryId === expectedMountainCrest.inventoryId &&
                    labelId === expectedMountainCrest.labelId &&
                    trackerId === expectedMountainCrest.trackerId,
                `${profile.slug} must map to ${expectedMountainCrest.inventoryId}/${expectedMountainCrest.labelId}/${expectedMountainCrest.trackerId}; found ${inventoryId}/${labelId}/${trackerId}.`
            );
        }

        const expectedHomeDepot = expectedHomeDepotProfiles.get(profile.slug);
        if (expectedHomeDepot) {
            assert(
                inventoryId === expectedHomeDepot.inventoryId &&
                    labelId === expectedHomeDepot.labelId &&
                    trackerId === expectedHomeDepot.trackerId,
                `${profile.slug} must map to ${expectedHomeDepot.inventoryId}/${expectedHomeDepot.labelId}/${expectedHomeDepot.trackerId}; found ${inventoryId}/${labelId}/${trackerId}.`
            );
        }

        assert(
            historical ? trackerId === "" : /^P\d{2}$/.test(trackerId),
            historical
                ? `${profile.slug} is historical and must not have a Tracker ID.`
                : `${profile.slug} needs a P01-P30 Tracker ID.`
        );
        assert(
            historical
                ? !expectedFieldGuideProfile
                : expectedFieldGuideProfile?.trackerId === trackerId &&
                      expectedFieldGuideProfile.title === title,
            historical
                ? `${profile.slug} is historical and must not appear in the current field-guide map.`
                : `${profile.slug} must match its canonical field-guide title and Tracker ID; found ${title}/${trackerId}.`
        );

        return {
            historical,
            inventoryId,
            receiptUnverified,
            slug: profile.slug,
            trackerId,
        };
    });
    const presentProfileCount = profileStates.filter(
        (profile) => !profile.historical && !profile.receiptUnverified
    ).length;
    const unverifiedReceiptProfileCount = profileStates.filter(
        (profile) => profile.receiptUnverified
    ).length;
    const historicalProfileCount = profileStates.filter(
        (profile) => profile.historical
    ).length;

    assert(
        presentProfileCount === expectedPresentProfiles,
        `Expected ${expectedPresentProfiles} physically present profiles; found ${presentProfileCount}.`
    );
    assert(
        unverifiedReceiptProfileCount === expectedUnverifiedReceiptProfiles,
        `Expected ${expectedUnverifiedReceiptProfiles} profiles with unverified collection receipt; found ${unverifiedReceiptProfileCount}.`
    );
    assert(
        historicalProfileCount === expectedHistoricalProfiles,
        `Expected ${expectedHistoricalProfiles} historical profile; found ${historicalProfileCount}.`
    );
    const trackerIds = profileStates
        .map((profile) => profile.trackerId)
        .filter(Boolean);
    assert(
        fieldGuideProfileBySlug.size === fieldGuideProfileEntries.length &&
            fieldGuideProfileEntries.length === expectedTrackedProfiles,
        "The canonical field-guide profile map must contain 35 unique current-profile slugs."
    );
    const expectedTrackerIds = Array.from(
        { length: 30 },
        (_, index) => `P${String(index + 1).padStart(2, "0")}`
    );
    assert(
        JSON.stringify([...new Set(trackerIds)].sort()) ===
            JSON.stringify(expectedTrackerIds),
        "Current profiles must cover every permanent Tracker ID from P01 through P30."
    );
    assert(
        trackerIds.filter((id) => id === "P19").length === 3 &&
            trackerIds.filter((id) => id === "P20").length === 4 &&
            trackerIds.filter((id) => !["P19", "P20"].includes(id)).length ===
                28,
        "Tracker IDs must preserve the intentional three-profile P19 and four-profile P20 shared-planter mappings."
    );

    assert(
        collectionManifest.schema_version === 3,
        "Collection-photo manifest must use schema version 3."
    );
    assert(
        /all rights reserved/i.test(collectionManifest.copyright_notice ?? ""),
        "Collection-photo manifest must preserve the user-photo copyright notice."
    );
    assert(
        Array.isArray(collectionManifest.plants),
        "Collection-photo manifest has no plants array."
    );
    assert(
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
    assert(
        new Set(collectionSlugs).size === collectionSlugs.length,
        "Collection-photo manifest contains duplicate plant records."
    );
    assert(
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
    assert(
        historicalProfiles.length === 1 &&
            historicalProfiles[0].slug === historicalCollectionSlug,
        `${historicalCollectionSlug} must remain the only historical profile.`
    );

    const collectionIds = new Set([overviewCollectionId]);
    const publicationMetadataByName = new Map();
    const publicationNameByImageId = new Map();
    const imageIdByPublicationName = new Map();
    const allPlacements = [];
    let expectedPendingPhotos = 0;
    let expectedHistoryPreviewPhotos = 0;
    let expectedInlineCollectionPhotos = 0;
    let expectedNurseryEvidenceSections = 0;
    let expectedViewBadges = 0;
    const photoReferenceCounts = new Map();
    const photoAltTextsByImageId = new Map();
    for (const photo of [
        ...collectionManifest.collection_overviews,
        ...collectionManifest.plants.flatMap((record) => record.photos),
    ]) {
        if (photo.provider !== "gyazo") continue;
        photoReferenceCounts.set(
            photo.image_id,
            (photoReferenceCounts.get(photo.image_id) ?? 0) + 1
        );
        if (!photoAltTextsByImageId.has(photo.image_id)) {
            photoAltTextsByImageId.set(photo.image_id, new Set());
        }
        photoAltTextsByImageId.get(photo.image_id).add(photo.alt.trim());
    }

    async function validatePublishedPhoto(photo, context) {
        assert(
            photo && typeof photo === "object" && !Array.isArray(photo),
            `${context} must be a flat photo record.`
        );
        const nestedProperties = Object.entries(photo)
            .filter(([, value]) => value !== null && typeof value === "object")
            .map(([name]) => name);
        assert(
            JSON.stringify(nestedProperties) ===
                JSON.stringify(["upload_metadata"]),
            `${context} may nest only its verified upload_metadata object.`
        );
        assert(
            !Object.hasOwn(photo, "file"),
            `${context} still has the removed file field.`
        );
        assert(
            typeof photo.publication_name === "string" &&
                photo.publication_name.trim().length > 0,
            `${context} needs a publication name.`
        );
        assert(
            photo.provider === "gyazo",
            `${context} must use the gyazo provider.`
        );
        assert(
            /^[a-f0-9]{32}$/.test(photo.image_id ?? ""),
            `${context} has an invalid Gyazo image ID.`
        );
        assert(
            photo.page_url === `https://gyazo.com/${photo.image_id}`,
            `${context} page URL does not agree with its Gyazo image ID.`
        );

        let imageUrl;
        try {
            imageUrl = new URL(photo.image_url);
        } catch {
            throw new Error(`${context} has an invalid Gyazo image URL.`);
        }
        assert(
            imageUrl.protocol === "https:" &&
                (imageUrl.hostname === "gyazo.com" ||
                    imageUrl.hostname.endsWith(".gyazo.com")),
            `${context} image URL must use an HTTPS Gyazo host.`
        );
        assert(
            new RegExp(`^/${photo.image_id}(?:\\.[a-z0-9]+)?$`, "i").test(
                imageUrl.pathname
            ),
            `${context} image URL path does not agree with its Gyazo image ID.`
        );
        const publicationExtension = path
            .extname(photo.publication_name)
            .toLowerCase();
        const directUrlExtension = path
            .extname(imageUrl.pathname)
            .toLowerCase();
        assert(
            [
                ".jpg",
                ".png",
                ".webp",
            ].includes(publicationExtension) &&
                publicationExtension === directUrlExtension,
            `${context} publication and Gyazo direct URL need the same supported source-quality image type.`
        );
        assert(
            allowedCollectionKinds.has(photo.kind),
            `${context} has unsupported kind ${photo.kind}.`
        );
        assert(
            allowedCollectionViews.has(photo.view),
            `${context} needs a supported view.`
        );
        const evidenceDates = [photo.captured_on, photo.provided_on].filter(
            (value) => typeof value === "string" && value.length > 0
        );
        assert(
            evidenceDates.length === 1 && isIsoDate(evidenceDates[0]),
            `${context} needs exactly one valid captured or provided date.`
        );
        assert(
            typeof photo.alt === "string" && photo.alt.trim().length > 0,
            `${context} is missing alt text.`
        );
        assert(
            typeof photo.caption === "string" &&
                photo.caption.trim().length > 0,
            `${context} is missing a caption.`
        );
        assert(
            photo.upload_metadata &&
                typeof photo.upload_metadata === "object" &&
                !Array.isArray(photo.upload_metadata),
            `${context} needs verified public Gyazo upload metadata.`
        );
        assert(
            JSON.stringify(Object.keys(photo.upload_metadata).sort()) ===
                JSON.stringify([
                    "app",
                    "desc",
                    "title",
                    "url",
                ]),
            `${context} upload_metadata must contain only app, title, url, and desc.`
        );
        assert(
            photo.upload_metadata.app === expectedGyazoApplicationName,
            `${context} has the wrong Gyazo application name.`
        );
        assert(
            photoAltTextsByImageId
                .get(photo.image_id)
                ?.has(photo.upload_metadata.title),
            `${context} Gyazo title must match one accessible description for the shared capture.`
        );
        assert(
            photo.upload_metadata.url === publicPhotoAlbumUrl ||
                (photo.upload_metadata.url.startsWith(
                    `${publicFieldGuideUrl}#`
                ) &&
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
        assert(
            typeof photo.upload_metadata.desc === "string" &&
                expectedDescriptionContexts.some((context) =>
                    photo.upload_metadata.desc.includes(context)
                ) &&
                photo.upload_metadata.desc.includes(`view: ${photo.view}`) &&
                /Copyright Nick; all rights reserved/.test(
                    photo.upload_metadata.desc
                ),
            `${context} Gyazo description must retain its caption, view, and copyright context.`
        );
        if (photo.derived_note !== undefined) {
            assert(
                typeof photo.derived_note === "string" &&
                    photo.derived_note.trim().length > 0,
                `${context} has an empty derivative note.`
            );
            assert(
                typeof photo.provided_on === "string",
                `${context} has a derivative note without a provided date.`
            );
        }
        if (Object.hasOwn(photo, "source_file")) {
            assert(
                typeof photo.source_file === "string" &&
                    /^assets\/(?:measurements|nursery-labels)\/.+\.(?:jpe?g|png|webp)$/i.test(
                        photo.source_file
                    ) &&
                    !photo.source_file.includes("..") &&
                    !photo.source_file.includes("\\"),
                `${context} source_file must point only to preserved repository evidence.`
            );
            const sourceStats = await stat(
                path.join(repositoryRoot, photo.source_file)
            );
            assert(
                sourceStats.size > 1024,
                `${photo.source_file} is unexpectedly small.`
            );
        }
        assert(
            !Object.hasOwn(photo, "evidence_file"),
            `${context} must use source_file for preserved repository evidence.`
        );
        if (Object.hasOwn(photo, "source_note")) {
            assert(
                photo.source_note === expectedPrivateSourceNote &&
                    !photo.source_note.includes(".private-photo-sources") &&
                    !/[A-Za-z]:[\\/]/.test(photo.source_note),
                `${context} has an unsafe or unexpected private-source note.`
            );
        }
        if (Object.hasOwn(photo, "crop_geometry")) {
            assert(
                /^\d+x\d+\+\d+\+\d+$/.test(photo.crop_geometry ?? "") &&
                    publicationExtension === ".png" &&
                    typeof photo.derivation_note === "string" &&
                    photo.derivation_note.trim().length > 0 &&
                    (typeof photo.source_file === "string" ||
                        photo.source_note === expectedPrivateSourceNote),
                `${context} source crop must have valid geometry, a source, a derivation note, and lossless PNG output.`
            );
        }
        if (photo.kind === "nursery-label") {
            assert(
                /^assets\/nursery-labels\//.test(photo.source_file ?? ""),
                `${context} must retain its nursery-label source evidence.`
            );
        }

        const metadata = captureMetadata(photo);
        const previousMetadata = publicationMetadataByName.get(
            photo.publication_name
        );
        assert(
            previousMetadata === undefined || previousMetadata === metadata,
            `${photo.publication_name} is reused with different Gyazo capture metadata.`
        );
        publicationMetadataByName.set(photo.publication_name, metadata);

        const previousImageId = imageIdByPublicationName.get(
            photo.publication_name
        );
        assert(
            previousImageId === undefined || previousImageId === photo.image_id,
            `${photo.publication_name} maps to more than one Gyazo image ID.`
        );
        imageIdByPublicationName.set(photo.publication_name, photo.image_id);

        const previousPublicationName = publicationNameByImageId.get(
            photo.image_id
        );
        assert(
            previousPublicationName === undefined ||
                previousPublicationName === photo.publication_name,
            `${photo.image_id} maps to more than one publication name.`
        );
        publicationNameByImageId.set(photo.image_id, photo.publication_name);
        allPlacements.push(photo);
    }

    for (const record of collectionManifest.plants) {
        const profileState = profileStateBySlug.get(record.plant_slug);
        assert(
            Array.isArray(record.photos),
            `${record.plant_slug} has no collection photos array.`
        );

        if (profileState.historical) {
            assert(
                record.plant_slug === historicalCollectionSlug &&
                    record.gyazo_collection === undefined &&
                    record.photos.length === 0,
                `${historicalCollectionSlug} must have no Gyazo Collection or photo placements.`
            );
            assert(
                typeof record.pending_note === "string" &&
                    record.pending_note.trim().length > 0,
                `${historicalCollectionSlug} must retain its photo-pending note.`
            );
            expectedPendingPhotos += 1;
            continue;
        }

        assert(
            record.pending_note === undefined,
            `${record.plant_slug} has photos but still has a photo-pending note.`
        );
        const collectionId = assertGyazoCollection(
            record.gyazo_collection,
            record.plant_slug
        );
        assert(
            !collectionIds.has(collectionId),
            `${record.plant_slug} reuses another Gyazo Collection ID.`
        );
        collectionIds.add(collectionId);

        const growthPhotos = record.photos
            .filter((photo) => photo.kind === "collection")
            .sort(compareCollectionPhotosNewestFirst);
        const nurseryLabelPhotos = record.photos.filter(
            (photo) => photo.kind === "nursery-label"
        );
        assert(
            growthPhotos.length >= 2,
            `${record.plant_slug} needs at least two collection-kind photos.`
        );
        expectedHistoryPreviewPhotos += 2;
        expectedInlineCollectionPhotos += 2 + nurseryLabelPhotos.length;
        expectedNurseryEvidenceSections +=
            nurseryLabelPhotos.length > 0 ? 1 : 0;
        expectedViewBadges += 2 + nurseryLabelPhotos.length;

        for (const [index, photo] of record.photos.entries()) {
            await validatePublishedPhoto(
                photo,
                `${record.plant_slug} photo ${index + 1}`
            );
        }
    }

    const collectionOverviews = collectionManifest.collection_overviews;
    for (const [index, photo] of collectionOverviews.entries()) {
        assert(
            photo.kind === "collection",
            `Collection overview ${index + 1} must have collection kind.`
        );
        await validatePublishedPhoto(photo, `Collection overview ${index + 1}`);
    }

    assert(
        collectionIds.size === expectedPresentProfiles + 1,
        `Expected ${expectedPresentProfiles} unique plant Collections plus the overview Collection.`
    );
    assert(
        allPlacements.length === expectedCollectionPlacements,
        `Expected ${expectedCollectionPlacements} total Gyazo placements; found ${allPlacements.length}.`
    );
    assert(
        publicationMetadataByName.size === expectedUniqueGyazoImages &&
            imageIdByPublicationName.size === expectedUniqueGyazoImages &&
            publicationNameByImageId.size === expectedUniqueGyazoImages,
        `Expected ${expectedUniqueGyazoImages} one-to-one publication names and Gyazo image IDs.`
    );

    const archivedNurseryLabels = (await readdir(nurseryLabelsDirectory))
        .filter((fileName) => /\.(?:jpe?g|png|webp)$/i.test(fileName))
        .sort();
    const nurseryLabelArchiveEvidence =
        collectionManifest.nursery_label_archive_evidence ?? [];
    assert(
        Array.isArray(nurseryLabelArchiveEvidence),
        "Collection-photo nursery-label archive evidence must be an array."
    );
    for (const evidence of nurseryLabelArchiveEvidence) {
        assert(
            typeof evidence.file === "string" &&
                /^assets\/nursery-labels\/[^/]+\.(?:jpe?g|png|webp)$/i.test(
                    evidence.file
                ),
            "Unplaced nursery-label archive evidence must name an image in assets/nursery-labels/."
        );
        assert(
            isIsoDate(evidence.captured_on),
            `${evidence.file} must have a captured date.`
        );
        assert(
            typeof evidence.description === "string" &&
                evidence.description.trim().length > 0,
            `${evidence.file} must explain why it is not a booklet placement.`
        );
        const evidenceStats = await stat(
            path.join(repositoryRoot, evidence.file)
        );
        assert(
            evidenceStats.size > 1024,
            `${evidence.file} is unexpectedly small.`
        );
    }
    const manifestedNurseryLabelSources = collectionManifest.plants
        .flatMap((record) => record.photos)
        .filter((photo) => photo.kind === "nursery-label")
        .map((photo) => photo.source_file ?? null)
        .filter(Boolean)
        .concat(nurseryLabelArchiveEvidence.map((evidence) => evidence.file));
    assert(
        new Set(manifestedNurseryLabelSources).size ===
            manifestedNurseryLabelSources.length,
        "A nursery-label source file is used more than once in the collection-photo manifest."
    );
    const manifestedNurseryLabels = manifestedNurseryLabelSources
        .map((file) => path.basename(file))
        .sort();
    assert(
        JSON.stringify(manifestedNurseryLabels) ===
            JSON.stringify(archivedNurseryLabels),
        "Every archived nursery-label image must have exactly one booklet photo-manifest entry."
    );

    const collectionPhotoDirectoryEntries = sortedStrings(
        await readdir(collectionPhotosDirectory)
    );
    assert(
        JSON.stringify(collectionPhotoDirectoryEntries) ===
            JSON.stringify(sortedStrings(["photo-manifest.json", "README.md"])),
        "assets/collection-photos must contain only README.md and photo-manifest.json after Gyazo cleanup."
    );

    const pageSlugs = [...html.matchAll(/<article\b[^>]*>/g)]
        .map((match) => match[0])
        .filter((tag) => {
            const classes = htmlAttribute(tag, "class")?.split(/\s+/) ?? [];
            return (
                classes.includes("book-page") &&
                classes.includes("profile-page")
            );
        })
        .map((tag) => htmlAttribute(tag, "id"))
        .filter(Boolean);
    assert(
        pageSlugs.length === profiles.length,
        `Expected ${profiles.length} profile pages; found ${pageSlugs.length}.`
    );
    assert(
        JSON.stringify([...pageSlugs].sort()) === JSON.stringify(profileSlugs),
        "The booklet profile pages do not match the Markdown profile files."
    );
    const templateSlugs = [
        ...html.matchAll(
            /<template\b[^>]*data-profile-template="([^"]+)"[^>]*>/g
        ),
    ].map((match) => match[1]);
    assert(
        JSON.stringify(sortedStrings(templateSlugs)) ===
            JSON.stringify(profileSlugs),
        "Every profile must have exactly one lazy-mount template."
    );
    const emptyProfilePlaceholders = [
        ...html.matchAll(
            /<article\b[^>]*class="[^"]*\bprofile-page\b[^"]*"[^>]*>\s*<\/article>/g
        ),
    ];
    assert(
        emptyProfilePlaceholders.length === expectedProfileCount,
        `Expected ${expectedProfileCount} empty profile placeholders; found ${emptyProfilePlaceholders.length}.`
    );
    const coverTag = html.match(/<section\b[^>]*id="cover"[^>]*>/)?.[0] ?? "";
    assert(
        /\shidden(?:\s|>)/.test(coverTag),
        "The cover must start hidden so direct profile links do not fetch its collage."
    );
    const coverHtml = html.slice(
        html.indexOf(coverTag),
        html.indexOf('id="contents"')
    );
    assert(
        !coverHtml.includes('loading="eager"') &&
            (coverHtml.match(/loading="lazy"/g) ?? []).length === 6,
        "The hidden cover must keep all six collage images lazy until selected."
    );

    for (const [documentName, documentHtml] of [
        ["field guide", html],
        ["photo Collections index", photoAlbumHtml],
    ]) {
        const escapedGyazoThumbnailOrigin = "https:" + "//thumb\\.gyazo\\.com";
        const externalImageTags = [
            ...documentHtml.matchAll(/<img\b[^>]*data-external-image[^>]*>/g),
        ].map((match) => match[0]);
        assert(
            externalImageTags.length > 0,
            `${documentName} has no external image previews.`
        );
        for (const tag of externalImageTags) {
            const imageId = htmlAttribute(tag, "data-image-id");
            const source = htmlAttribute(tag, "src") ?? "";
            const srcset = htmlAttribute(tag, "srcset") ?? "";
            const sizes = htmlAttribute(tag, "sizes") ?? "";
            assert(
                new RegExp(
                    `^${escapedGyazoThumbnailOrigin}/thumb/960/${imageId}\\.[a-z0-9]+$`,
                    "i"
                ).test(source),
                `${documentName} must display Gyazo capture ${imageId} through its 960px thumbnail.`
            );
            for (const width of expectedGyazoThumbnailWidths) {
                assert(
                    new RegExp(
                        `${escapedGyazoThumbnailOrigin}/thumb/${width}/${imageId}\\.[a-z0-9]+\\s+${width}w`,
                        "i"
                    ).test(srcset),
                    `${documentName} Gyazo capture ${imageId} is missing its ${width}px responsive source.`
                );
            }
            assert(
                sizes.trim(),
                `${documentName} Gyazo capture ${imageId} needs a sizes rule.`
            );
        }
        assert(
            !/<img\b[^>]*src="https:\/\/i\.gyazo\.com\//i.test(documentHtml),
            `${documentName} still displays a full-resolution Gyazo source.`
        );
    }

    for (const profile of profiles) {
        const headings = [...profile.markdown.matchAll(/^##\s+(.+)$/gm)].map(
            (match) => match[1].trim()
        );
        const sourceStart = profile.markdown.search(/^## Sources\s*$/m);
        const sourceLinks =
            sourceStart >= 0
                ? [
                      ...profile.markdown
                          .slice(sourceStart)
                          .matchAll(/\]\(https?:\/\/[^)]+\)/g),
                  ]
                : [];

        assert(
            headings.length >= 5,
            `${profile.slug} has only ${headings.length} substantive sections.`
        );
        assert(sourceStart >= 0, `${profile.slug} has no Sources section.`);
        assert(
            sourceLinks.length >= 2,
            `${profile.slug} has fewer than two external research sources.`
        );
        assert(
            headings.some((heading) => /care|rehabilitation/i.test(heading)),
            `${profile.slug} has no care or rehabilitation section.`
        );

        for (const field of [
            "Inventory",
            "Label ID",
            "Identification",
        ]) {
            assert(
                new RegExp(`^- ${field}:\\s*\\S`, "m").test(profile.markdown),
                `${profile.slug} is missing its ${field} metadata.`
            );
        }
    }

    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    assert(
        duplicateIds.length === 0,
        `Duplicate HTML IDs: ${[...new Set(duplicateIds)].join(", ")}`
    );

    const hashTargets = [...html.matchAll(/href="#([^"]+)"/g)].map(
        (match) => match[1]
    );
    const missingHashTargets = hashTargets.filter(
        (target) => !ids.includes(target)
    );
    assert(
        missingHashTargets.length === 0,
        `Missing hash targets: ${[...new Set(missingHashTargets)].join(", ")}`
    );

    const photoRecords = manifest.photos;
    assert(Array.isArray(photoRecords), "Photo manifest has no photos array.");
    const recordsBySlug = Map.groupBy(
        photoRecords,
        (record) => record.plant_slug
    );
    const sourceUrls = new Set();
    const localFiles = new Set();
    const coverageLines = [];

    for (const slug of profileSlugs) {
        const records = recordsBySlug.get(slug) ?? [];
        if (records.length > 0) {
            assert(
                records.length >= 6,
                `${slug} has only ${records.length} archived photos.`
            );
        }
        const subjects = new Set();

        for (const record of records) {
            assert(
                allowedSubjects.has(record.subject),
                `${record.file} has unsupported subject ${record.subject}.`
            );
            assert(
                allowedLicense.test(record.license),
                `${record.file} has unsupported license ${record.license}.`
            );
            assert(
                !sourceUrls.has(record.source_url),
                `Duplicate source URL: ${record.source_url}`
            );
            assert(
                !localFiles.has(record.file),
                `Duplicate local file: ${record.file}`
            );
            sourceUrls.add(record.source_url);
            localFiles.add(record.file);
            subjects.add(record.subject);

            const absolutePath = path.join(repositoryRoot, record.file);
            const fileStats = await stat(absolutePath);
            assert(
                fileStats.size > 1024,
                `${record.file} is unexpectedly small.`
            );
            const hash = await fileHash(absolutePath);
            assert(
                hash === record.sha256,
                `SHA-256 mismatch for ${record.file}.`
            );
        }

        coverageLines.push(
            records.length > 0
                ? `${slug}: ${records.length} photos · ${[...subjects].sort().join(", ")}`
                : `${slug}: 0 photos · archive pending`
        );
    }

    const galleryPhotoCount = (html.match(/class="gallery-photo"/g) ?? [])
        .length;
    assert(
        galleryPhotoCount === photoRecords.length,
        `Expected ${photoRecords.length} gallery figures; found ${galleryPhotoCount}.`
    );

    const collectionPanelCount = tagsWithClass(
        html,
        "section",
        "collection-gallery"
    ).length;
    const collectionPhotoFigures = renderedCollectionFigures(html);
    const collectionPhotoCount = collectionPhotoFigures.length;
    const pendingPhotoCount = (
        html.match(/class="collection-photo-pending"/g) ?? []
    ).length;
    assert(
        collectionPanelCount === profiles.length,
        `Expected ${profiles.length} collection-photo panels; found ${collectionPanelCount}.`
    );
    assert(
        collectionPhotoCount === expectedInlineCollectionPhotos,
        `Expected ${expectedInlineCollectionPhotos} inline collection and nursery-label photos; found ${collectionPhotoCount}.`
    );
    assert(
        pendingPhotoCount === expectedPendingPhotos,
        `Expected ${expectedPendingPhotos} pending-photo panels; found ${pendingPhotoCount}.`
    );
    const collectionOverviewPhotoCount = (
        html.match(/\bcollection-overview-photo\b/g) ?? []
    ).length;
    assert(
        collectionOverviewPhotoCount === 0,
        "Collection overview photographs must remain in the generated photo album, not the booklet."
    );
    const viewBadgeCount = (html.match(/class="photo-view"/g) ?? []).length;
    assert(
        viewBadgeCount === expectedViewBadges,
        `Expected ${expectedViewBadges} collection-photo view badges; found ${viewBadgeCount}.`
    );
    assert(
        !html.includes('id="collection-history"'),
        "The obsolete standalone collection photo-history page is still present."
    );
    const historyPreviewPhotoCount = collectionPhotoFigures.filter(
        (figure) => figure.latest
    ).length;
    assert(
        historyPreviewPhotoCount === expectedHistoryPreviewPhotos,
        `Expected ${expectedHistoryPreviewPhotos} latest-history preview photos; found ${historyPreviewPhotoCount}.`
    );
    const nurseryEvidenceCount = (html.match(/class="nursery-evidence"/g) ?? [])
        .length;
    assert(
        nurseryEvidenceCount === expectedNurseryEvidenceSections,
        `Expected ${expectedNurseryEvidenceSections} nursery-evidence sections; found ${nurseryEvidenceCount}.`
    );

    const collectionRecordBySlug = new Map(
        collectionManifest.plants.map((record) => [record.plant_slug, record])
    );
    const pageHtmlBySlug = profilePageSections(html);
    let profileCollectionLinkCount = 0;
    for (const profile of profiles) {
        const pageHtml = pageHtmlBySlug.get(profile.slug);
        const record = collectionRecordBySlug.get(profile.slug);
        assert(pageHtml, `No rendered profile page found for ${profile.slug}.`);

        const figures = renderedCollectionFigures(pageHtml);
        const latestFigures = figures.filter((figure) => figure.latest);
        const collectionFigures = figures.filter(
            (figure) => figure.kind === "collection"
        );
        const nurseryLabelFigures = figures.filter(
            (figure) => figure.kind === "nursery-label"
        );
        const collectionLinks = tagsWithClass(
            pageHtml,
            "a",
            "gyazo-collection-link"
        );
        profileCollectionLinkCount += collectionLinks.length;

        if (profileStateBySlug.get(profile.slug).historical) {
            assert(
                figures.length === 0 && collectionLinks.length === 0,
                `${profile.slug} must render only its pending note, with no inline Gyazo photos or Collection link.`
            );
            continue;
        }

        const growthPhotos = record.photos
            .filter((photo) => photo.kind === "collection")
            .sort(compareCollectionPhotosNewestFirst);
        const nurseryLabelPhotos = record.photos.filter(
            (photo) => photo.kind === "nursery-label"
        );
        const expectedLatestIds = growthPhotos
            .slice(0, 2)
            .map((photo) => photo.image_id);
        const expectedNurseryLabelIds = nurseryLabelPhotos.map(
            (photo) => photo.image_id
        );

        assert(
            JSON.stringify(latestFigures.map((figure) => figure.imageId)) ===
                JSON.stringify(expectedLatestIds),
            `${profile.slug} must render its latest two collection-kind photos in newest-first order.`
        );
        assert(
            JSON.stringify(
                collectionFigures.map((figure) => figure.imageId)
            ) === JSON.stringify(expectedLatestIds),
            `${profile.slug} renders collection-kind photos outside its latest-two preview.`
        );
        assert(
            nurseryLabelFigures.every((figure) => !figure.latest) &&
                JSON.stringify(
                    sortedStrings(
                        nurseryLabelFigures.map((figure) => figure.imageId)
                    )
                ) === JSON.stringify(sortedStrings(expectedNurseryLabelIds)),
            `${profile.slug} must render every nursery-label placement separately from its latest collection photos.`
        );
        assert(
            collectionLinks.length === 1 &&
                htmlAttribute(collectionLinks[0], "href") ===
                    record.gyazo_collection.url,
            `${profile.slug} needs exactly one link to its Gyazo Collection.`
        );
    }
    assert(
        profileCollectionLinkCount === expectedPresentProfiles,
        `Expected ${expectedPresentProfiles} profile Gyazo Collection links; found ${profileCollectionLinkCount}.`
    );

    const albumCards = [
        ...photoAlbumHtml.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g),
    ].filter((match) => htmlClasses(match[0]).has("photo-collection-card"));
    assert(
        albumCards.length === expectedPresentProfiles,
        `Expected ${expectedPresentProfiles} plant Collection cards in the generated photo album; found ${albumCards.length}.`
    );
    const collectionRecordByUrl = new Map(
        collectionManifest.plants
            .filter((record) => record.gyazo_collection)
            .map((record) => [record.gyazo_collection.url, record])
    );
    const albumProfileCollectionUrls = new Set();
    for (const card of albumCards) {
        const cardCollectionUrls = new Set(
            [
                ...card[0].matchAll(
                    /<a\b[^>]*href="(https:\/\/gyazo\.com\/collections\/[a-f0-9]{32})"/g
                ),
            ].map((match) => match[1])
        );
        assert(
            cardCollectionUrls.size === 1,
            "Each generated photo-album card must link exactly one Gyazo Collection."
        );
        const cardCollectionUrl = [...cardCollectionUrls][0];
        const collectionRecord = collectionRecordByUrl.get(cardCollectionUrl);
        const cardImageTag = card[0].match(/<img\b[^>]*>/)?.[0] ?? "";
        const expectedNewestImageId = collectionRecord?.photos
            .filter((photo) => photo.kind === "collection")
            .sort(compareCollectionPhotosNewestFirst)[0]?.image_id;
        assert(
            collectionRecord &&
                htmlAttribute(cardImageTag, "data-image-id") ===
                    expectedNewestImageId,
            "Each photo-album card must preview its plant Collection's newest image."
        );
        albumProfileCollectionUrls.add(cardCollectionUrl);
    }
    const overviewSections = [
        ...photoAlbumHtml.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g),
    ].filter((match) => htmlClasses(match[0]).has("overview-collection"));
    assert(
        overviewSections.length === 1,
        "The generated photo album needs exactly one overview Collection section."
    );
    const albumOverviewCollectionUrls = new Set(
        [
            ...overviewSections[0][0].matchAll(
                /<a\b[^>]*href="(https:\/\/gyazo\.com\/collections\/[a-f0-9]{32})"/g
            ),
        ].map((match) => match[1])
    );
    assert(
        albumOverviewCollectionUrls.size === 1 &&
            albumOverviewCollectionUrls.has(
                collectionManifest.gyazo_collection.url
            ),
        "The generated photo album overview must link only the overview Gyazo Collection."
    );
    const overviewImageTag = overviewSections[0][0].match(/<img\b[^>]*>/)?.[0];
    const expectedNewestOverviewId = [...collectionOverviews].sort(
        compareCollectionPhotosNewestFirst
    )[0].image_id;
    assert(
        htmlAttribute(overviewImageTag ?? "", "data-image-id") ===
            expectedNewestOverviewId,
        "The generated photo album overview must preview the newest overview image."
    );
    const expectedAlbumProfileCollectionUrls = new Set(
        collectionManifest.plants
            .filter((record) => record.plant_slug !== historicalCollectionSlug)
            .map((record) => record.gyazo_collection.url)
    );
    assert(
        JSON.stringify(sortedStrings(albumProfileCollectionUrls)) ===
            JSON.stringify(sortedStrings(expectedAlbumProfileCollectionUrls)),
        "The generated photo album must link all 35 plant Collections, with no missing or extra cards."
    );
    const allAlbumCollectionUrls = new Set(
        [
            ...photoAlbumHtml.matchAll(
                /<a\b[^>]*href="(https:\/\/gyazo\.com\/collections\/[a-f0-9]{32})"/g
            ),
        ].map((match) => match[1])
    );
    const expectedAlbumCollectionUrls = new Set([
        collectionManifest.gyazo_collection.url,
        ...expectedAlbumProfileCollectionUrls,
    ]);
    assert(
        JSON.stringify(sortedStrings(allAlbumCollectionUrls)) ===
            JSON.stringify(sortedStrings(expectedAlbumCollectionUrls)),
        "The generated photo album contains an unexpected Gyazo Collection link."
    );

    for (const generatedHtml of [html, photoAlbumHtml]) {
        assert(
            !generatedHtml.includes("collection-history-details") &&
                !generatedHtml.includes("history-summary-icon"),
            "Generated photo UI must not contain an expandable archive or history-summary icon."
        );
        assert(
            !/assets[\\/]collection-photos[\\/]/i.test(generatedHtml),
            "Generated HTML must not reference assets/collection-photos binaries."
        );
    }
    assert(
        (html.match(/class="contents-group(?: contents-group--wide)?"/g) ?? [])
            .length === 4 &&
            (html.match(/data-group="cacti"/g) ?? []).length >= 1 &&
            !html.includes("Starter cacti") &&
            !html.includes("New individual cacti"),
        "The booklet must present one unified Cacti contents group plus Succulents, Rehab, and Houseplants."
    );
    const cactiContents = html.match(
        /<section\b[^>]*class="contents-group contents-group--wide"[^>]*data-group="cacti"[^>]*>([\s\S]*?)<\/section>/
    )?.[1];
    const expectedCactiTrackerIds = profiles
        .filter((profile) => ["starter", "cacti"].includes(profile.group))
        .map(
            (profile) =>
                profile.markdown.match(/^\- Tracker ID:\s*`(P\d{2})`/m)?.[1]
        )
        .filter(Boolean)
        .sort((left, right) => Number(left.slice(1)) - Number(right.slice(1)));
    const renderedCactiTrackerIds = cactiContents
        ? [
              ...cactiContents.matchAll(
                  /<span class="contents-id"[^>]*>\s*<strong[^>]*>(P\d{2})<\/strong/g
              ),
          ].map((match) => match[1])
        : [];
    assert(
        JSON.stringify(renderedCactiTrackerIds) ===
            JSON.stringify(expectedCactiTrackerIds),
        "The unified Cacti contents group is not in permanent P-ID order."
    );
    for (const variant of ["contents", "drawer"]) {
        const iconCount = (
            html.match(new RegExp(`plant-nav-icon--${variant}`, "g")) ?? []
        ).length;
        assert(
            iconCount === profiles.length,
            `Expected ${profiles.length} ${variant} plant icons; found ${iconCount}.`
        );
    }
    assert(
        (html.match(/plant-avatar--hero/g) ?? []).length === profiles.length,
        `Expected ${profiles.length} hero plant avatars.`
    );
    assert(
        !/<img\b[^>]*class="[^"]*plant-avatar--(?:contents|drawer)/i.test(html),
        "Contents and drawer navigation must use lightweight icons, not photograph avatars."
    );
    const plantNavigationIconUses =
        html.match(
            /class="plant-nav-icon[^\"]*"[\s\S]*?<use\b[^>]*href="\.\/plant-icons\.svg#icon-plant-[a-z-]+"[\s\S]*?<\/span>/g
        ) ?? [];
    assert(
        !html.includes("plant-nav-icon-sprite") &&
            plantNavigationIconUses.length === profiles.length * 2,
        "Navigation icons must use the local plant-specific multicolor SVG portraits."
    );
    for (const profile of profiles) {
        const portraitUseCount = (
            html.match(
                new RegExp(
                    `plant-icons\\.svg#icon-plant-${profile.slug}(?=[\"#])`,
                    "g"
                )
            ) ?? []
        ).length;
        assert(
            portraitUseCount === 3,
            `${profile.slug} must use its portrait in the contents, drawer, and hero fallback; found ${portraitUseCount} uses.`
        );
    }
    const atAGlanceCount = (html.match(/class="profile-at-a-glance"/g) ?? [])
        .length;
    assert(
        atAGlanceCount === profiles.length,
        `Expected ${profiles.length} at-a-glance sections; found ${atAGlanceCount}.`
    );
    assert(
        (html.match(/What it looks\s+like<\/h2/g) ?? []).length ===
            profiles.length,
        "Every profile needs a visual-description heading."
    );
    assert(
        (html.match(/Did you know\?<\/h2/g) ?? []).length === profiles.length,
        "Every profile needs an interesting-fact heading."
    );
    assert(
        (html.match(/class="profile-history-link"/g) ?? []).length ===
            expectedTrackedProfiles,
        `Expected ${expectedTrackedProfiles} live history links.`
    );
    assert(
        (html.match(/class="profile-sheet-link"/g) ?? []).length ===
            expectedTrackedProfiles &&
            (html.match(/class="drawer-sheet-link"/g) ?? []).length ===
                expectedTrackedProfiles,
        "Every tracked profile needs direct Google Sheets links in both the profile rail and contents drawer."
    );
    assert(
        (html.match(/class="profile-photo-history-link"/g) ?? []).length ===
            profiles.length,
        "Every profile needs an in-page link to its photo history."
    );
    const expectedSellerProductLinks = profiles.flatMap((profile) =>
        sellerProductLinks(profile.markdown)
    ).length;
    assert(
        (html.match(/class="seller-product-link"/g) ?? []).length ===
            expectedSellerProductLinks,
        `Expected ${expectedSellerProductLinks} exact seller-product links.`
    );
    const expectedSellerSnapshots = profiles.filter((profile) =>
        /^## Seller listing snapshot\s*$/m.test(profile.markdown)
    ).length;
    assert(
        (html.match(/class="seller-snapshot"/g) ?? []).length ===
            expectedSellerSnapshots,
        `Expected ${expectedSellerSnapshots} styled seller snapshots.`
    );
    const inaturalistLinks = [
        ...html.matchAll(
            /class="inaturalist-link"[^>]+href="https:\/\/www\.inaturalist\.org\/observations\?taxon_name=[^"]+"[^>]+data-inaturalist-taxon="([^"]+)"/g
        ),
    ];
    assert(
        inaturalistLinks.length === profiles.length,
        `Expected ${profiles.length} iNaturalist observation links; found ${inaturalistLinks.length}.`
    );
    assert(
        inaturalistLinks.every((match) => match[1].trim()),
        "Every iNaturalist observation link needs a non-empty discovery taxon."
    );
    assert(
        html.includes('id="surprise-plant"'),
        "The booklet is missing the random-profile link."
    );
    assert(
        html.includes("localStorage.getItem(themeKey)"),
        "The booklet does not use the shared site theme key."
    );

    const photoAlbumIds = [...photoAlbumHtml.matchAll(/\sid="([^"]+)"/g)].map(
        (match) => match[1]
    );
    const duplicatePhotoAlbumIds = photoAlbumIds.filter(
        (id, index) => photoAlbumIds.indexOf(id) !== index
    );
    assert(
        duplicatePhotoAlbumIds.length === 0,
        `Duplicate photo-album HTML IDs: ${[
            ...new Set(duplicatePhotoAlbumIds),
        ].join(", ")}`
    );
    const photoAlbumHashTargets = [
        ...photoAlbumHtml.matchAll(/href="#([^"]+)"/g),
    ].map((match) => match[1]);
    const missingPhotoAlbumHashTargets = photoAlbumHashTargets.filter(
        (target) => !photoAlbumIds.includes(target)
    );
    assert(
        missingPhotoAlbumHashTargets.length === 0,
        `Missing photo-album hash targets: ${[
            ...new Set(missingPhotoAlbumHashTargets),
        ].join(", ")}`
    );

    for (const reference of new Set(localReferences(html))) {
        const absolutePath = path.resolve(bookletDirectory, reference);
        await stat(absolutePath).catch(() => {
            throw new Error(`Broken local booklet reference: ${reference}`);
        });
    }
    for (const reference of new Set(localReferences(photoAlbumHtml))) {
        const absolutePath = path.resolve(photoAlbumDirectory, reference);
        await stat(absolutePath).catch(() => {
            throw new Error(`Broken local photo-album reference: ${reference}`);
        });
    }

    for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
        new Function(script[1]);
    }
    for (const script of photoAlbumHtml.matchAll(
        /<script>([\s\S]*?)<\/script>/g
    )) {
        new Function(script[1]);
    }
    new Function(clientScript);

    console.log(
        `Plant booklet verified: ${pageSlugs.length} profiles, ${photoRecords.length} licensed reference photos, ${expectedCollectionPlacements} Gyazo placements using ${expectedUniqueGyazoImages} unique captures, ${collectionOverviews.length} collection overviews, ${archivedNurseryLabels.length} archived nursery labels, ${ids.length} unique booklet IDs, and ${photoAlbumIds.length} unique photo-album IDs.`
    );
    console.log(coverageLines.join("\n"));
}

await main();
