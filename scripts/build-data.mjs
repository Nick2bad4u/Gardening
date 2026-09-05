import { readdir, readFile } from "node:fs/promises";

/**
 * Shared shapes for the checked-in photo archives and build records. JSON is
 * validated at the read boundary; the publication checker retains the more
 * specific copyright, identity, URL, date, and inventory invariants.
 *
 * @typedef {{ [key: string]: unknown }} JsonRecord
 *
 * @typedef {(value: unknown) => boolean} Validator
 *
 * @typedef {{ [key: string]: Validator }} Fields
 *
 * @typedef {{ [trackerId: string]: [slug: string, title: string][] }} ProfileData
 *
 * @typedef {{ id: string; url: string }} GyazoCollection
 *
 * @typedef {{ app: string; title: string; url: string; desc: string }} UploadMetadata
 *
 * @typedef {{ image_id: string; image_url: string; alt: string }} GyazoImage
 *
 * @typedef {GyazoImage & {
 *     kind: string;
 *     view: string;
 *     caption: string;
 *     publication_name: string;
 *     provider: string;
 *     page_url: string;
 *     upload_metadata: UploadMetadata;
 *     captured_on?: string;
 *     provided_on?: string;
 *     source_file?: string;
 *     source_note?: string;
 *     derived_note?: string;
 *     crop_geometry?: string;
 *     derivation_note?: string;
 * }} CollectionPhoto
 *
 * @typedef {{
 *     plant_slug: string;
 *     gyazo_collection?: GyazoCollection | null;
 *     photos: CollectionPhoto[];
 *     pending_note?: string;
 * }} CollectionRecord
 *
 * @typedef {{
 *     schema_version: number;
 *     copyright_notice: string;
 *     gyazo_collection: GyazoCollection;
 *     collection_overviews: CollectionPhoto[];
 *     plants: CollectionRecord[];
 *     nursery_label_archive_evidence: {
 *         file: string;
 *         captured_on: string;
 *         description: string;
 *     }[];
 * }} CollectionManifest
 *
 * @typedef {{
 *     plant_id: string;
 *     plant_slug: string;
 *     scientific_name: string;
 *     common_name: string;
 *     scope_note: string;
 *     file: string;
 *     subject: string;
 *     title: string;
 *     description: string;
 *     source: string;
 *     source_url: string;
 *     author: string;
 *     license: string;
 *     license_url: string;
 *     observed_on: string;
 *     location: string;
 *     sha256: string;
 * }} ReferencePhoto
 *
 * @typedef {{
 *     schema_version: number;
 *     generated_at: string;
 *     policy: string;
 *     photos: ReferencePhoto[];
 * }} PhotoManifest
 *
 * @typedef {{ schema_version: number; sources: Record<string, string> }} PrivateSourceMap
 *
 * @typedef {{
 *     key: "cacti" | "succulents" | "rehab" | "houseplants";
 *     title: string;
 *     description: string;
 *     eyebrow: string;
 *     directories: string[];
 * }} ProfileGroup
 *
 * @typedef {({ external: true; src: string } & GyazoImage)
 *     | { external: false; src: string; alt: string }} PlantAvatar
 *
 * @typedef {{
 *     acquiredFromMarkdown: string;
 *     acquiredOnMarkdown: string;
 *     bodyMarkdown: string;
 *     eyebrow: string;
 *     fileName: string;
 *     group: ProfileGroup["key"];
 *     groupTitle: string;
 *     historical: boolean;
 *     identificationMarkdown: string;
 *     interestingFactMarkdown: string;
 *     inventoryId: string;
 *     labelMarkdown: string;
 *     orderedFromMarkdown: string;
 *     receiptUnverified: boolean;
 *     scientificMarkdown: string;
 *     sellerProductLink: { href: string; label: string } | undefined;
 *     slug: string;
 *     sourceDirectory: string;
 *     statusMarkdown: string;
 *     title: string;
 *     trackerId: string | undefined;
 *     visualDescriptionMarkdown: string;
 * }} ParsedProfile
 *
 * @typedef {ParsedProfile & {
 *     acquiredFromHtml: string;
 *     acquiredOnHtml: string;
 *     allPhotos: ReferencePhoto[];
 *     avatar: PlantAvatar | undefined;
 *     bodyHtml: string;
 *     collectionRecord: CollectionRecord;
 *     drawerLabel: { primary: string; detail: string };
 *     identificationHtml: string;
 *     interestingFactHtml: string;
 *     labelHtml: string;
 *     orderedFromHtml: string;
 *     photoCount: number;
 *     scientificHtml: string;
 *     scopeNote: string;
 *     selectedPhotos: ReferencePhoto[];
 *     sheetUrl: string | undefined;
 *     statusHtml: string;
 *     visualDescriptionHtml: string;
 * }} Profile
 */

/**
 * @template T @param {(value: unknown) => value is T} validate @returns
 *   {(value: unknown) => value is T[]}
 */
export function arrayOf(validate) {
    return (value) =>
        Array.isArray(value) && value.every((entry) => validate(entry));
}

/** @param {CollectionPhoto} photo */
export function collectionPhotoDate(photo) {
    return required(
        photo.captured_on ?? photo.provided_on,
        `evidence date for ${photo.image_id}`
    );
}

/**
 * Compare using the code-unit order used by JavaScript's default string sort.
 *
 * @param {string} left
 * @param {string} right
 */
export function compareText(left, right) {
    // eslint-disable-next-line sonarjs/strings-comparison -- Preserve JavaScript UTF-16 sort order; numeric coercion and localeCompare change it.
    return left === right ? 0 : left < right ? -1 : 1;
}

/**
 * Read settled results in input order so parallel I/O preserves the first
 * error.
 *
 * @template T
 *
 * @param {PromiseSettledResult<T>} result
 *
 * @returns {T}
 */
export function fulfilledValue(result) {
    if (result.status === "rejected") throw result.reason;
    return result.value;
}

/**
 * @param {unknown} value @param {Fields} requiredFields @param {Fields}
 *   [optional]
 */
export function hasFields(value, requiredFields, optional = {}) {
    return (
        isRecord(value) &&
        Object.entries(requiredFields).every(
            ([key, validate]) =>
                Object.hasOwn(value, key) && validate(value[key])
        ) &&
        Object.entries(optional).every(
            ([key, validate]) =>
                !Object.hasOwn(value, key) || validate(value[key])
        )
    );
}

/** @param {unknown} value @returns {value is CollectionManifest} */
export function isCollectionManifest(value) {
    return hasFields(value, {
        collection_overviews: arrayOf(isCollectionPhoto),
        copyright_notice: isString,
        gyazo_collection: isGyazoCollection,
        nursery_label_archive_evidence: arrayOf(isNurseryEvidence),
        plants: arrayOf(isCollectionRecord),
        schema_version: isNumber,
    });
}

/** @param {unknown} value @returns {value is string} */
export function isNonemptyString(value) {
    return typeof value === "string" && value.length > 0;
}

/** @param {unknown} value @returns {value is number} */
export function isNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}

/** @param {unknown} value @returns {value is PhotoManifest} */
export function isPhotoManifest(value) {
    return hasFields(value, {
        generated_at: isString,
        photos: arrayOf(isReferencePhoto),
        policy: isString,
        schema_version: isNumber,
    });
}

/** @param {unknown} value @returns {boolean} */
export function isPlantSlug(value) {
    return (
        isString(value) &&
        value.split("-").every((part) => /^[0-9a-z]+$/v.test(part))
    );
}

/** @param {unknown} value @returns {value is PrivateSourceMap} */
export function isPrivateSourceMap(value) {
    return hasFields(value, {
        schema_version: isNumber,
        sources: isStringRecord,
    });
}

/** @param {unknown} value @returns {value is ProfileData} */
export function isProfileData(value) {
    return (
        isRecord(value) && Object.values(value).every(arrayOf(isProfileEntry))
    );
}

/** @param {unknown} value @returns {value is JsonRecord} */
export function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** @param {unknown} value @returns {value is string} */
export function isString(value) {
    return typeof value === "string";
}

/** @param {unknown} value @returns {value is Record<string, string>} */
export function isStringRecord(value) {
    return (
        isRecord(value) &&
        Object.values(value).every((entry) => isString(entry))
    );
}

/**
 * @template T @param {string} source @param {(value: unknown) => value is T}
 *   validate @param {string} context @returns {T}
 */
export function parseJson(source, validate, context) {
    /** @type {unknown} */
    const value = JSON.parse(source);
    if (!validate(value))
        throw new TypeError(`Invalid data structure in ${context}.`);
    return value;
}

/** @param {string} directory */
export async function readDirectoryIfPresent(directory) {
    try {
        return await readdir(directory);
    } catch (error) {
        if (isMissingFile(error)) return [];
        throw error;
    }
}

/**
 * @template T @param {string} filePath @param {(value: unknown) => value is T}
 *   validate @returns {Promise<T>}
 */
export async function readJson(filePath, validate) {
    const source = await readFile(filePath, "utf8");
    return parseJson(source, validate, filePath);
}

/** @param {string} filePath */
export async function readTextIfPresent(filePath) {
    try {
        return await readFile(filePath, "utf8");
    } catch (error) {
        if (isMissingFile(error)) return "";
        throw error;
    }
}

/**
 * @template T @param {T | undefined | null} value @param {string} context
 *
 * @returns {T}
 */
export function required(value, context) {
    if (value === undefined || value === null)
        throw new Error(`Missing ${context}.`);
    return value;
}

/** @param {unknown} value @returns {value is CollectionPhoto} */
function isCollectionPhoto(value) {
    return hasFields(
        value,
        {
            alt: isString,
            caption: isString,
            image_id: isString,
            image_url: isString,
            kind: isString,
            page_url: isString,
            provider: isString,
            publication_name: isString,
            upload_metadata: isUploadMetadata,
            view: isString,
        },
        {
            captured_on: isString,
            crop_geometry: isString,
            derivation_note: isString,
            derived_note: isString,
            provided_on: isString,
            source_file: isString,
            source_note: isString,
        }
    );
}

/** @param {unknown} value @returns {value is CollectionRecord} */
function isCollectionRecord(value) {
    return hasFields(
        value,
        { photos: arrayOf(isCollectionPhoto), plant_slug: isPlantSlug },
        {
            gyazo_collection: isNullableGyazoCollection,
            pending_note: isString,
        }
    );
}

/** @param {unknown} value @returns {value is GyazoCollection} */
function isGyazoCollection(value) {
    return hasFields(value, { id: isString, url: isString });
}

/** @param {unknown} error */
function isMissingFile(error) {
    return isRecord(error) && error["code"] === "ENOENT";
}

/** @param {unknown} value @returns {value is GyazoCollection | null} */
function isNullableGyazoCollection(value) {
    return value === null || isGyazoCollection(value);
}
/**
 * @param {unknown} value @returns {value is
 *   CollectionManifest['nursery_label_archive_evidence'][number]}
 */
function isNurseryEvidence(value) {
    return hasFields(value, {
        captured_on: isString,
        description: isString,
        file: isString,
    });
}

/** @param {unknown} value @returns {value is [string, string]} */
function isProfileEntry(value) {
    return (
        Array.isArray(value) &&
        value.length === 2 &&
        isPlantSlug(value[0]) &&
        isString(value[1])
    );
}

/** @param {unknown} value @returns {value is ReferencePhoto} */
function isReferencePhoto(value) {
    return hasFields(value, {
        author: isString,
        common_name: isString,
        description: isString,
        file: isString,
        license: isString,
        license_url: isString,
        location: isString,
        observed_on: isString,
        plant_id: isString,
        plant_slug: isPlantSlug,
        scientific_name: isString,
        scope_note: isString,
        sha256: isString,
        source: isString,
        source_url: isString,
        subject: isString,
        title: isString,
    });
}

/** @param {unknown} value @returns {value is UploadMetadata} */
function isUploadMetadata(value) {
    return hasFields(value, {
        app: isString,
        desc: isString,
        title: isString,
        url: isString,
    });
}
