import { isRecord, readJson } from "../../scripts/build-data.mjs";

/** @typedef {[number, number]} LightRange */
/**
 * @typedef {{
 *     slug: string;
 *     reviewedOn: string;
 *     light: {
 *         dli: LightRange | null;
 *         startingDli: LightRange | null;
 *         basis: "collection-trial" | "qualitative-only" | "historical";
 *         description: string;
 *         acclimation: string;
 *         caution: string;
 *     };
 *     moisture: {
 *         regime: string;
 *         check: string;
 *         waterWhen: string;
 *         waitWhen: string;
 *     };
 *     sources: { title: string; url: string; scope: string }[];
 * }} PlantCareReference
 */

/**
 * Require one reference per profile and keep removed plants historical.
 *
 * @param {PlantCareReference[]} records
 * @param {{ slug: string; historical: boolean }[]} profiles
 */
export function assertCareCoverage(records, profiles) {
    const bySlug = new Map(records.map((record) => [record.slug, record]));
    const profileSlugs = new Set(profiles.map((profile) => profile.slug));
    if (
        bySlug.size !== records.length ||
        profileSlugs.size !== profiles.length ||
        records.length !== profiles.length
    )
        throw new Error("Plant care reference coverage differs from profiles");
    for (const profile of profiles) {
        const record = bySlug.get(profile.slug);
        if (
            !record ||
            (record.light.basis === "historical") !== profile.historical
        )
            throw new Error(
                `Plant care reference status mismatch: ${profile.slug}`
            );
    }
}

/** @param {string} slug */
export async function getPlantCareReference(slug) {
    const records = await getPlantCareReferences();
    const record = records.find((item) => item.slug === slug);
    if (!record) throw new Error(`Missing plant care reference: ${slug}`);
    return record;
}

/** Read the two maintained care catalogs; no live measurements are fetched. */
export async function getPlantCareReferences() {
    const catalogs = await Promise.all(
        ["arid", "houseplants"].map((name) =>
            readJson(`docs/plants/care/${name}.json`, isCatalog)
        )
    );
    const records = catalogs.flat();
    const slugs = new Set(records.map((record) => record.slug));
    if (slugs.size !== records.length)
        throw new Error("Duplicate plant care reference slug");
    return records;
}

/**
 * Reject incomplete evidence instead of giving missing values numeric defaults.
 *
 * @param {unknown} value @returns {value is PlantCareReference}
 */
export function isPlantCareReference(value) {
    if (!isRecord(value)) return false;
    const moisture = value["moisture"];
    const sources = value["sources"];
    if (!Array.isArray(sources) || sources.length === 0) return false;
    const sourceUrls = new Set();
    for (const source of sources) {
        if (!isSource(source)) return false;
        sourceUrls.add(source.url);
    }
    return (
        typeof value["slug"] === "string" &&
        value["slug"].split("-").every((part) => /^[0-9a-z]+$/v.test(part)) &&
        isDate(value["reviewedOn"]) &&
        isLight(value["light"]) &&
        isRecord(moisture) &&
        [
            "regime",
            "check",
            "waterWhen",
            "waitWhen",
        ].every((key) => hasText(moisture[key])) &&
        sourceUrls.size === sources.length
    );
}

/**
 * Constant-light comparison, not an installed timer recommendation. The lux
 * envelope uses rounded 55–70 lux/PPFD from selected white LEDs in AGi32's
 * spectral table; it is not a calibration of this collection's fixtures. See
 * docs/light-moisture.md for the primary conversion sources and limitations.
 *
 * @param {PlantCareReference["light"]} light
 * @param {number} [hours]
 */
export function lightComparison(light, hours = 12) {
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24)
        throw new Error(
            "Comparison hours must be greater than zero and at most 24"
        );
    if (!isLight(light)) throw new Error("Invalid plant care light reference");
    /** @param {LightRange | null} dli @returns {LightRange | null} */
    const toPpfd = (dli) =>
        dli
            ? [
                  Math.round(dli[0] / (hours * 0.0036) / 5) * 5,
                  Math.round(dli[1] / (hours * 0.0036) / 5) * 5,
              ]
            : null;
    const ppfd = toPpfd(light.dli);
    /** @type {LightRange | null} */
    const lux = light.dli
        ? [
              Math.round(((light.dli[0] / (hours * 0.0036)) * 55) / 100) * 100,
              Math.round(((light.dli[1] / (hours * 0.0036)) * 70) / 100) * 100,
          ]
        : null;
    return { hours, lux, ppfd, startingPpfd: toPpfd(light.startingDli) };
}

/** @param {unknown} value @returns {value is string} */
function hasText(value) {
    return typeof value === "string" && value.trim().length > 0;
}

/** @param {unknown} value @returns {value is PlantCareReference[]} */
function isCatalog(value) {
    return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((record) => isPlantCareReference(record))
    );
}

/** @param {unknown} value */
function isDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/v.test(value))
        return false;
    try {
        return Temporal.PlainDate.from(value).toString() === value;
    } catch {
        return false;
    }
}

/** @param {unknown} value @returns {value is PlantCareReference["light"]} */
function isLight(value) {
    if (
        !isRecord(value) ||
        [
            "description",
            "acclimation",
            "caution",
        ].some((key) => !hasText(value[key]))
    )
        return false;
    if (
        value["basis"] === "historical" ||
        value["basis"] === "qualitative-only"
    )
        return value["dli"] === null && value["startingDli"] === null;
    if (value["basis"] !== "collection-trial" || !isRange(value["dli"]))
        return false;
    return (
        value["startingDli"] === null ||
        (isRange(value["startingDli"]) &&
            value["startingDli"][1] <= value["dli"][1])
    );
}

/** @param {unknown} value @returns {value is LightRange} */
function isRange(value) {
    return (
        Array.isArray(value) &&
        value.length === 2 &&
        value.every(
            (number) =>
                typeof number === "number" &&
                Number.isFinite(number) &&
                number > 0
        ) &&
        value[0] <= value[1]
    );
}

/**
 * @param {unknown} value @returns {value is
 *   PlantCareReference["sources"][number]}
 */
function isSource(value) {
    if (
        !isRecord(value) ||
        !hasText(value["title"]) ||
        !hasText(value["scope"]) ||
        typeof value["url"] !== "string"
    )
        return false;
    try {
        const url = new URL(value["url"]);
        return (
            url.protocol === "https:" &&
            url.username === "" &&
            url.password === ""
        );
    } catch {
        return false;
    }
}
