import { access } from "node:fs/promises";

import {
    isNonemptyString,
    isRecord,
    readJson,
} from "../../scripts/build-data.mjs";

/** @typedef {{ text: string; sourceIds: string[] }} SourcedText */
/** @typedef {{ label: string; function: string }} AnatomyPart */
/** @typedef {{ title: string; text: string }} GrowthStage */
/** @typedef {{ name: string; text: string; profileSlug: string | null }} Lookalike */
/**
 * @typedef {{
 *     date: string;
 *     title: string;
 *     text: string;
 *     sourcePath: string;
 * }} Milestone
 */
/** @typedef {{ id: string; title: string; url: string; accessed: string }} DiscoverySource */
/**
 * @typedef {{
 *     slug: string;
 *     habitat: SourcedText;
 *     anatomy: { intro: string; parts: AnatomyPart[]; sourceIds: string[] };
 *     growth: { stages: GrowthStage[]; note: string; sourceIds: string[] };
 *     flowers: SourcedText;
 *     mature: SourcedText;
 *     lookalikes: Lookalike[];
 *     comparisonSourceIds: string[];
 *     nameStory: SourcedText | null;
 *     milestones: Milestone[];
 *     sources: DiscoverySource[];
 *     image: {
 *         file: string;
 *         alt: string;
 *         prompt: string;
 *         generatedOn: string;
 *         reviewed: true;
 *     };
 * }} PlantDiscovery
 */
/** @typedef {import("../../scripts/build-data.mjs").CollectionPhoto} CollectionPhoto */
/**
 * @typedef {{
 *     photo: CollectionPhoto;
 *     date: string;
 *     basis: "Photographed" | "Provided";
 * }} DatedPhoto
 */

/**
 * Compare distinct dates only; provided dates remain explicitly labelled as
 * such. Unknown dates and nursery labels cannot create a growth comparison.
 *
 * @param {readonly CollectionPhoto[]} photos
 *
 * @returns {{ earliest: DatedPhoto; latest: DatedPhoto } | null}
 */
export function getPhotoComparison(photos) {
    /** @type {DatedPhoto[]} */
    const dated = [];
    const seen = new Set();
    for (const photo of photos) {
        const date = photo.captured_on ?? photo.provided_on;
        if (
            photo.kind !== "collection" ||
            seen.has(photo.image_id) ||
            !isDate(date)
        )
            continue;
        seen.add(photo.image_id);
        dated.push({
            basis:
                photo.captured_on === undefined ? "Provided" : "Photographed",
            date,
            photo,
        });
    }
    dated.sort((left, right) => left.date.localeCompare(right.date));
    const earliest = dated[0];
    const latest = dated.at(-1);
    if (!earliest || !latest || earliest.date === latest.date) return null;
    return { earliest, latest };
}

/**
 * Read maintained discovery content, refusing broken citations or unpublished
 * artwork.
 *
 * @param {string} slug
 * @param {ReadonlySet<string>} knownProfileSlugs
 *
 * @returns {Promise<PlantDiscovery>}
 */
export async function getPlantDiscovery(slug, knownProfileSlugs) {
    if (!isSlug(slug) || !knownProfileSlugs.has(slug))
        throw new Error(`Unknown discovery profile: ${slug}`);
    const record = await readJson(
        `docs/plants/discovery/${slug}.json`,
        isPlantDiscovery
    );
    if (record.slug !== slug)
        throw new Error(`Discovery slug mismatch: ${slug}`);
    const ids = new Set(record.sources.map((source) => source.id));
    if (ids.size !== record.sources.length)
        throw new Error(`Duplicate discovery sources: ${slug}`);
    const biologicalSections = [
        record.habitat,
        record.anatomy,
        record.growth,
        record.flowers,
        record.mature,
        ...(record.nameStory ? [record.nameStory] : []),
    ];
    const references = [
        ...biologicalSections.flatMap((section) => section.sourceIds),
        ...record.comparisonSourceIds,
    ];
    for (const id of references) {
        if (!ids.has(id))
            throw new Error(`Unknown discovery source ${id}: ${slug}`);
    }
    for (const lookalike of record.lookalikes) {
        if (
            lookalike.profileSlug !== null &&
            !knownProfileSlugs.has(lookalike.profileSlug)
        )
            throw new Error(
                `Unknown lookalike profile ${lookalike.profileSlug}: ${slug}`
            );
    }
    await Promise.all(
        [
            record.image.file,
            ...new Set(
                record.milestones.map((milestone) => milestone.sourcePath)
            ),
        ].map((file) => access(file))
    );
    return record;
}

/** @param {unknown} value @returns {value is PlantDiscovery} */
export function isPlantDiscovery(value) {
    if (!isRecord(value)) return false;
    return (
        isSlug(value["slug"]) &&
        isSourcedText(value["habitat"]) &&
        isSourcedText(value["flowers"]) &&
        isSourcedText(value["mature"]) &&
        (value["nameStory"] === null || isSourcedText(value["nameStory"])) &&
        isAnatomy(value["anatomy"]) &&
        isGrowth(value["growth"]) &&
        isComparisons(value) &&
        isDiscoveryEvidence(value)
    );
}

/** @param {unknown} anatomy */
function isAnatomy(anatomy) {
    return (
        isRecord(anatomy) &&
        isNonemptyString(anatomy["intro"]) &&
        Array.isArray(anatomy["parts"]) &&
        anatomy["parts"].length === 4 &&
        anatomy["parts"].every((part) => isAnatomyPart(part)) &&
        isSourceIds(anatomy["sourceIds"])
    );
}

/** @param {unknown} value @returns {value is AnatomyPart} */
function isAnatomyPart(value) {
    return (
        isRecord(value) &&
        isNonemptyString(value["label"]) &&
        isNonemptyString(value["function"])
    );
}

/** @param {Record<string, unknown>} value */
function isComparisons(value) {
    return (
        Array.isArray(value["lookalikes"]) &&
        value["lookalikes"].length > 0 &&
        value["lookalikes"].length <= 2 &&
        value["lookalikes"].every((lookalike) => isLookalike(lookalike)) &&
        isSourceIds(value["comparisonSourceIds"])
    );
}

/** @param {unknown} value @returns {value is string} */
function isDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/v.test(value))
        return false;
    try {
        return Temporal.PlainDate.from(value).toString() === value;
    } catch {
        return false;
    }
}

/** @param {Record<string, unknown>} value */
function isDiscoveryEvidence(value) {
    const image = value["image"];
    return (
        Array.isArray(value["milestones"]) &&
        value["milestones"].length > 0 &&
        value["milestones"].length <= 4 &&
        value["milestones"].every((milestone) => isMilestone(milestone)) &&
        Array.isArray(value["sources"]) &&
        value["sources"].length > 0 &&
        value["sources"].every((source) => isSource(source)) &&
        isRecord(image) &&
        isSlug(value["slug"]) &&
        image["file"] === `assets/plant-explainers/${value["slug"]}.webp` &&
        isNonemptyString(image["alt"]) &&
        isNonemptyString(image["prompt"]) &&
        isDate(image["generatedOn"]) &&
        image["reviewed"] === true
    );
}

/** @param {unknown} growth */
function isGrowth(growth) {
    return (
        isRecord(growth) &&
        Array.isArray(growth["stages"]) &&
        growth["stages"].length >= 3 &&
        growth["stages"].length <= 4 &&
        growth["stages"].every((stage) => isGrowthStage(stage)) &&
        isNonemptyString(growth["note"]) &&
        isSourceIds(growth["sourceIds"])
    );
}

/** @param {unknown} value @returns {value is GrowthStage} */
function isGrowthStage(value) {
    return (
        isRecord(value) &&
        isNonemptyString(value["title"]) &&
        isNonemptyString(value["text"])
    );
}

/** @param {unknown} value @returns {value is Lookalike} */
function isLookalike(value) {
    return (
        isRecord(value) &&
        isNonemptyString(value["name"]) &&
        isNonemptyString(value["text"]) &&
        (value["profileSlug"] === null || isSlug(value["profileSlug"]))
    );
}

/** @param {unknown} value @returns {value is Milestone} */
function isMilestone(value) {
    return (
        isRecord(value) &&
        isDate(value["date"]) &&
        isNonemptyString(value["title"]) &&
        isNonemptyString(value["text"]) &&
        typeof value["sourcePath"] === "string" &&
        /^docs\/plants\/(?:cacti|houseplants|rehab|starter|succulents)\/[\-0-9a-z]+\.md$/v.test(
            value["sourcePath"]
        )
    );
}

/** @param {unknown} value @returns {value is string} */
function isSlug(value) {
    return (
        typeof value === "string" &&
        value.split("-").every((part) => /^[0-9a-z]+$/v.test(part))
    );
}

/** @param {unknown} value @returns {value is DiscoverySource} */
function isSource(value) {
    if (
        !isRecord(value) ||
        !isSlug(value["id"]) ||
        !isNonemptyString(value["title"]) ||
        !isDate(value["accessed"]) ||
        typeof value["url"] !== "string"
    )
        return false;
    try {
        const url = new URL(value["url"]);
        return url.protocol === "https:" && !url.username && !url.password;
    } catch {
        return false;
    }
}

/** @param {unknown} value @returns {value is SourcedText} */
function isSourcedText(value) {
    return (
        isRecord(value) &&
        isNonemptyString(value["text"]) &&
        isSourceIds(value["sourceIds"])
    );
}

/** @param {unknown} value @returns {value is string[]} */
function isSourceIds(value) {
    return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((id) => isSlug(id))
    );
}
