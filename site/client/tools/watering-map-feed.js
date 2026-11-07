import { createSheetSnapshotCache } from "../../../docs/layouts/plant-sheet-cache.js";
import {
    fetchCsv,
    parseCsv,
    sheetUrls,
} from "../../../docs/layouts/plant-tracker-data.js";
import { isWateringObservationDate } from "./watering-map-data.js";

/** @typedef {import("../../../docs/layouts/plant-tracker-data.js").HistoryEvent} HistoryEvent */
/** @typedef {{ history: HistoryEvent[]; version: 1 | 2 }} WateringFeed */

const legacyHistoryFields = [
    "Date",
    "Plant ID",
    "Event",
    "Record status",
    "New location",
];
const historyFields = [
    ...legacyHistoryFields,
    "Nutrients used",
    "Pot setup",
    "Observation ID",
    "Corrects observation ID",
];
const envelopeFields = [
    "Feed version",
    "Feed status",
    "Record count",
];
const feedSchemas = [
    { fields: legacyHistoryFields, version: /** @type {const} */ (1) },
    { fields: historyFields, version: /** @type {const} */ (2) },
];

const invalidFeedCause = "invalid-watering-feed";

/** @param {unknown} error */
export function isWateringFeedError(error) {
    return error instanceof Error && error.cause === invalidFeedCause;
}

const feedCache = createSheetSnapshotCache({
    load: async () =>
        decodeWateringFeed(await fetchCsv(sheetUrls.wateringMapCsv)),
    sourceKey: JSON.stringify({
        feed: sheetUrls.wateringMapCsv,
        schema: "watering-map-feed-v2",
    }),
    storageKey: "gardening-public-watering-map-snapshot-v2",
    validate: isWateringFeed,
});

/**
 * Require the complete atomic projection, including its terminal marker. A
 * matching row count alone cannot detect a response cut inside its final field.
 * Version 1 remains readable during staged publication; it supplies no
 * fertilizer evidence and must not acquire inferred nutrient fields.
 *
 * @param {string} csv
 *
 * @returns {WateringFeed}
 */
export function decodeWateringFeed(csv) {
    let hasUnpairedQuote = false;
    for (const character of csv) {
        if (character === '"') hasUnpairedQuote = !hasUnpairedQuote;
    }
    const rows = parseCsv(csv);
    const [headers, metadata] = rows;
    const footer = rows.at(-1);
    const schema = feedSchemas.find(
        ({ fields }) =>
            headers?.length === fields.length + envelopeFields.length &&
            [...fields, ...envelopeFields].every(
                (field, index) => headers[index] === field
            )
    );
    if (
        hasUnpairedQuote ||
        !schema ||
        rows.length < 3 ||
        rows.some((row) => row.length !== schema.fields.length + 3) ||
        !isBoundaryRow(metadata, "Ready", schema) ||
        !isBoundaryRow(footer, "End", schema) ||
        metadata[schema.fields.length + 2] !==
            footer[schema.fields.length + 2] ||
        Number(metadata[schema.fields.length + 2]) !== rows.length - 3
    ) {
        throw new Error(
            "The published watering map feed is incomplete or invalid.",
            { cause: invalidFeedCause }
        );
    }
    const records = rows.slice(2, -1);
    const history = records.map((row, index) => ({
        ...Object.fromEntries(
            schema.fields.map((field, column) => [field, row[column] ?? ""])
        ),
        _index: index,
    }));
    const feed = { history, version: schema.version };
    if (
        records.some((row) =>
            row.slice(schema.fields.length).some((field) => field !== "")
        ) ||
        !isWateringFeed(feed)
    ) {
        throw new Error(
            "The published watering map feed contains invalid observations.",
            { cause: invalidFeedCause }
        );
    }
    return feed;
}

/** Return a dated compact preview; it never authorizes showing watering counts. */
export function getSavedWateringMapData() {
    const snapshot = feedCache.saved();
    return snapshot
        ? { history: snapshot.data.history, readAt: snapshot.readAt }
        : null;
}

/**
 * Fetch the compact projection; readAt records this successful network read
 * only.
 */
export async function loadWateringMapSnapshot() {
    const snapshot = await feedCache.refresh();
    return { history: snapshot.data.history, readAt: snapshot.readAt };
}

/**
 * @param {string[] | undefined} row @param {"Ready" | "End"} status
 * @param {{ fields: string[]; version: 1 | 2 }} schema
 *
 * @returns {row is string[]}
 */
function isBoundaryRow(row, status, schema) {
    const countIndex = schema.fields.length + 2;
    return (
        row !== undefined &&
        row.slice(0, schema.fields.length).every((field) => field === "") &&
        row[schema.fields.length] === String(schema.version) &&
        row[schema.fields.length + 1] === status &&
        /^(?:0|[1-9]\d*)$/v.test(row[countIndex] ?? "") &&
        Number.isSafeInteger(Number(row[countIndex]))
    );
}

/** @param {unknown} value @returns {value is WateringFeed} */
function isWateringFeed(value) {
    if (
        typeof value !== "object" ||
        value === null ||
        !("version" in value) ||
        (value.version !== 1 && value.version !== 2) ||
        !("history" in value) ||
        !Array.isArray(value.history)
    )
        return false;
    const fields = value.version === 1 ? legacyHistoryFields : historyFields;
    return value.history.every((event, index) =>
        isWateringRecord(event, index, fields)
    );
}

/**
 * @param {unknown} value
 * @param {number} index
 * @param {string[]} historyFieldsForVersion
 *
 * @returns {value is HistoryEvent}
 */
function isWateringRecord(value, index, historyFieldsForVersion) {
    if (typeof value !== "object" || value === null || !("_index" in value))
        return false;
    const { _index: rowIndex } = value;
    if (rowIndex !== index) return false;
    const fields = Object.entries(value);
    if (
        fields.length !== historyFieldsForVersion.length + 1 ||
        fields.some(
            ([field, entry]) =>
                field !== "_index" &&
                (!historyFieldsForVersion.includes(field) ||
                    typeof entry !== "string")
        )
    )
        return false;
    return (
        "Date" in value &&
        isWateringObservationDate(value.Date) &&
        "Plant ID" in value &&
        typeof value["Plant ID"] === "string" &&
        /^P\d{2}$/v.test(value["Plant ID"].trim()) &&
        "Event" in value &&
        typeof value.Event === "string" &&
        ["move", "water"].includes(value.Event.trim().toLowerCase())
    );
}
