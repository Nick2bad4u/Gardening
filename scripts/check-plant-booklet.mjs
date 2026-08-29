import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const bookletDirectory = path.join(repositoryRoot, "docs", "plant-booklet");
const bookletPath = path.join(bookletDirectory, "index.html");
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
    "context",
    "overview",
]);
const expectedTrackedProfiles = 33;
const expectedProfileCount = 34;
const expectedPresentProfiles = 33;
const expectedUnverifiedReceiptProfiles = 0;
const expectedHistoricalProfiles = 1;
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

async function main() {
    const [
        html,
        clientScript,
        manifest,
        collectionManifest,
        profiles,
    ] = await Promise.all([
        readFile(bookletPath, "utf8"),
        readFile(path.join(bookletDirectory, "booklet.js"), "utf8"),
        readFile(manifestPath, "utf8").then(JSON.parse),
        readFile(collectionManifestPath, "utf8").then(JSON.parse),
        discoverProfiles(),
    ]);
    const profileSlugs = profiles.map((profile) => profile.slug);

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

    const profileStates = profiles.map((profile) => {
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

        return { historical, receiptUnverified };
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

    assert(
        collectionManifest.schema_version === 2,
        "Collection-photo manifest has an unsupported schema version."
    );
    assert(
        /all rights reserved/i.test(collectionManifest.copyright_notice ?? ""),
        "Collection-photo manifest must preserve the user-photo copyright notice."
    );
    assert(
        Array.isArray(collectionManifest.plants),
        "Collection-photo manifest has no plants array."
    );
    const collectionSlugs = collectionManifest.plants.map(
        (record) => record.plant_slug
    );
    assert(
        new Set(collectionSlugs).size === collectionSlugs.length,
        "Collection-photo manifest contains duplicate plant records."
    );
    assert(
        JSON.stringify([...collectionSlugs].sort()) ===
            JSON.stringify(profileSlugs),
        "Collection-photo manifest does not match the Markdown profile files."
    );

    let expectedCollectionPhotos = 0;
    let expectedPendingPhotos = 0;
    let expectedCollectionDateGroups = 0;
    let expectedViewBadges = 0;
    for (const record of collectionManifest.plants) {
        assert(
            Array.isArray(record.photos),
            `${record.plant_slug} has no collection photos array.`
        );
        expectedCollectionPhotos += record.photos.length;
        expectedCollectionDateGroups += new Set(
            record.photos
                .filter((photo) => photo.kind === "collection")
                .map((photo) => photo.captured_on ?? photo.provided_on)
        ).size;
        if (record.photos.length === 0) {
            expectedPendingPhotos += 1;
            assert(
                typeof record.pending_note === "string" &&
                    record.pending_note.trim().length > 0,
                `${record.plant_slug} needs a photo-pending note.`
            );
        } else {
            assert(
                record.pending_note === undefined,
                `${record.plant_slug} has photos but still has a photo-pending note.`
            );
        }

        for (const photo of record.photos) {
            assert(
                allowedCollectionKinds.has(photo.kind),
                `${record.plant_slug} has unsupported collection photo kind ${photo.kind}.`
            );
            if (photo.view !== undefined) {
                assert(
                    allowedCollectionViews.has(photo.view),
                    `${record.plant_slug} has unsupported collection photo view ${photo.view}.`
                );
                expectedViewBadges += 1;
            }
            assert(
                /^assets\/collection-photos\/[a-z0-9.-]+\.webp$/.test(
                    photo.file
                ),
                `${record.plant_slug} has an invalid web-photo path.`
            );
            assert(
                /^assets\/(?:measurements|nursery-labels|collection-photos)\/[a-z0-9._-]+\.(?:jpg|png|webp)$/i.test(
                    photo.source_file
                ),
                `${record.plant_slug} has an invalid source-photo path.`
            );
            const evidenceDates = [photo.captured_on, photo.provided_on].filter(
                (value) => typeof value === "string" && value.length > 0
            );
            assert(
                evidenceDates.length === 1 &&
                    /^\d{4}-\d{2}-\d{2}$/.test(evidenceDates[0]),
                `${record.plant_slug} needs exactly one valid capture or provided date.`
            );
            if (photo.derived_note !== undefined) {
                assert(
                    typeof photo.derived_note === "string" &&
                        photo.derived_note.trim().length > 0,
                    `${record.plant_slug} has an empty derivative note.`
                );
                assert(
                    typeof photo.provided_on === "string",
                    `${record.plant_slug} has a derived crop without a provided date.`
                );
            }
            assert(
                typeof photo.alt === "string" && photo.alt.trim().length > 0,
                `${record.plant_slug} has a collection photo without alt text.`
            );
            assert(
                typeof photo.caption === "string" &&
                    photo.caption.trim().length > 0,
                `${record.plant_slug} has a collection photo without a caption.`
            );

            for (const file of [photo.file, photo.source_file]) {
                const fileStats = await stat(path.join(repositoryRoot, file));
                assert(fileStats.size > 1024, `${file} is unexpectedly small.`);
            }
        }
    }

    const collectionOverviews = collectionManifest.collection_overviews;
    assert(
        Array.isArray(collectionOverviews) && collectionOverviews.length > 0,
        "Collection-photo manifest needs at least one collection overview."
    );
    expectedCollectionDateGroups += new Set(
        collectionOverviews.map(
            (photo) => photo.captured_on ?? photo.provided_on
        )
    ).size;
    expectedViewBadges += collectionOverviews.length;
    for (const photo of collectionOverviews) {
        assert(
            photo.kind === "collection",
            "A collection overview has an unsupported photo kind."
        );
        assert(
            allowedCollectionViews.has(photo.view),
            "A collection overview needs a supported view."
        );
        assert(
            /^assets\/collection-photos\/[a-z0-9.-]+\.webp$/.test(photo.file),
            "A collection overview has an invalid web-photo path."
        );
        assert(
            /^assets\/(?:measurements|nursery-labels|collection-photos)\/[a-z0-9._-]+\.(?:jpg|png|webp)$/i.test(
                photo.source_file
            ),
            "A collection overview has an invalid source-photo path."
        );
        const evidenceDates = [photo.captured_on, photo.provided_on].filter(
            (value) => typeof value === "string" && value.length > 0
        );
        assert(
            evidenceDates.length === 1 &&
                /^\d{4}-\d{2}-\d{2}$/.test(evidenceDates[0]),
            "A collection overview needs exactly one valid capture or provided date."
        );
        assert(
            typeof photo.alt === "string" && photo.alt.trim().length > 0,
            "A collection overview is missing alt text."
        );
        assert(
            typeof photo.caption === "string" &&
                photo.caption.trim().length > 0,
            "A collection overview is missing a caption."
        );
        for (const file of [photo.file, photo.source_file]) {
            const fileStats = await stat(path.join(repositoryRoot, file));
            assert(fileStats.size > 1024, `${file} is unexpectedly small.`);
        }
    }

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
            /^\d{4}-\d{2}-\d{2}$/.test(evidence.captured_on ?? ""),
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
        .map((photo) => photo.source_file)
        .concat(nurseryLabelArchiveEvidence.map((evidence) => evidence.file));
    assert(
        new Set(manifestedNurseryLabelSources).size ===
            manifestedNurseryLabelSources.length,
        "A nursery-label source file is used more than once in the collection-photo manifest."
    );
    const manifestedNurseryLabels = manifestedNurseryLabelSources
        .filter((file) => /\.(?:jpe?g|png|webp)$/i.test(file))
        .map((file) => path.basename(file))
        .sort();
    assert(
        JSON.stringify(manifestedNurseryLabels) ===
            JSON.stringify(archivedNurseryLabels),
        "Every archived nursery-label image must have exactly one booklet photo-manifest entry."
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

    const collectionPanelCount = (
        html.match(/class="collection-gallery"/g) ?? []
    ).length;
    const collectionPhotoCount = (html.match(/class="collection-photo"/g) ?? [])
        .length;
    const pendingPhotoCount = (
        html.match(/class="collection-photo-pending"/g) ?? []
    ).length;
    assert(
        collectionPanelCount === profiles.length,
        `Expected ${profiles.length} collection-photo panels; found ${collectionPanelCount}.`
    );
    assert(
        collectionPhotoCount === expectedCollectionPhotos,
        `Expected ${expectedCollectionPhotos} collection photos; found ${collectionPhotoCount}.`
    );
    assert(
        pendingPhotoCount === expectedPendingPhotos,
        `Expected ${expectedPendingPhotos} pending-photo panels; found ${pendingPhotoCount}.`
    );
    const collectionOverviewPhotoCount = (
        html.match(/class="collection-photo collection-overview-photo"/g) ?? []
    ).length;
    assert(
        collectionOverviewPhotoCount === collectionOverviews.length,
        `Expected ${collectionOverviews.length} collection overview photos; found ${collectionOverviewPhotoCount}.`
    );
    const collectionDateGroupCount = (
        html.match(/class="collection-date-group"/g) ?? []
    ).length;
    assert(
        collectionDateGroupCount === expectedCollectionDateGroups,
        `Expected ${expectedCollectionDateGroups} dated collection-photo groups; found ${collectionDateGroupCount}.`
    );
    const viewBadgeCount = (html.match(/class="photo-view"/g) ?? []).length;
    assert(
        viewBadgeCount === expectedViewBadges,
        `Expected ${expectedViewBadges} collection-photo view badges; found ${viewBadgeCount}.`
    );
    assert(
        html.includes('id="collection-history"'),
        "The booklet is missing its collection photo-history page."
    );
    const atAGlanceCount = (html.match(/class="profile-at-a-glance"/g) ?? [])
        .length;
    assert(
        atAGlanceCount === profiles.length,
        `Expected ${profiles.length} at-a-glance sections; found ${atAGlanceCount}.`
    );
    assert(
        (html.match(/<h2>What it looks like<\/h2>/g) ?? []).length ===
            profiles.length,
        "Every profile needs a visual-description heading."
    );
    assert(
        (html.match(/<h2>Did you know\?<\/h2>/g) ?? []).length ===
            profiles.length,
        "Every profile needs an interesting-fact heading."
    );
    assert(
        (html.match(/Open the live care history/g) ?? []).length ===
            expectedTrackedProfiles,
        `Expected ${expectedTrackedProfiles} live history links.`
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

    for (const reference of new Set(localReferences(html))) {
        const absolutePath = path.resolve(bookletDirectory, reference);
        await stat(absolutePath).catch(() => {
            throw new Error(`Broken local booklet reference: ${reference}`);
        });
    }

    for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
        new Function(script[1]);
    }
    new Function(clientScript);

    console.log(
        `Plant booklet verified: ${pageSlugs.length} profiles, ${photoRecords.length} licensed reference photos, ${expectedCollectionPhotos} per-profile collection-photo placements, ${collectionOverviews.length} collection overviews, ${archivedNurseryLabels.length} archived nursery labels, ${ids.length} unique IDs.`
    );
    console.log(coverageLines.join("\n"));
}

await main();
