import { createSheetSnapshotCache } from "../../../docs/layouts/plant-sheet-cache.js";
import {
    fetchCsv,
    parseCsv,
    sheetUrls,
} from "../../../docs/layouts/plant-tracker-data.js";
import { isWateringObservationDate } from "./watering-map-data.js";

/** @typedef {import("../../../docs/layouts/plant-tracker-data.js").HistoryEvent} HistoryEvent */
/** @typedef {{ history: HistoryEvent[]; version: 1 }} WateringFeed */

const feedHeaders = [
    "Date",
    "Plant ID",
    "Event",
    "Record status",
    "New location",
    "Feed version",
    "Feed status",
    "Record count",
];
const historyFields = feedHeaders.slice(0, 5);
const feedCache = createSheetSnapshotCache({
    load: async () =>
        decodeWateringFeed(await fetchCsv(sheetUrls.wateringMapCsv)),
    sourceKey: JSON.stringify({
        feed: sheetUrls.wateringMapCsv,
        schema: "watering-map-feed-v1",
    }),
    storageKey: "gardening-public-watering-map-snapshot-v1",
    validate: isWateringFeed,
});

/**
 * Require the complete atomic projection, including its terminal marker. A
 * matching row count alone cannot detect a response cut inside its final
 * field.
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
    if (
        hasUnpairedQuote ||
        !headers ||
        rows.length < 3 ||
        rows.some((row) => row.length !== feedHeaders.length) ||
        feedHeaders.some((field, index) => headers[index] !== field) ||
        !isBoundaryRow(metadata, "Ready") ||
        !isBoundaryRow(footer, "End") ||
        metadata[7] !== footer[7] ||
        Number(metadata[7]) !== rows.length - 3
    ) {
        throw new Error(
            "The published watering map feed is incomplete or invalid."
        );
    }
    const records = rows.slice(2, -1);
    const history = records.map((row, index) => ({
        ...Object.fromEntries(
            historyFields.map((field, column) => [field, row[column] ?? ""])
        ),
        _index: index,
    }));
    const feed = { history, version: /** @type {const} */ (1) };
    if (
        records.some((row) => row.slice(5).some((field) => field !== "")) ||
        !isWateringFeed(feed)
    ) {
        throw new Error(
            "The published watering map feed contains invalid observations."
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
 * @param {string[] | undefined} row @param {"Ready" | "End"} status @returns
 *   {row is string[]}
 */
function isBoundaryRow(row, status) {
    return (
        row !== undefined &&
        row.slice(0, 5).every((field) => field === "") &&
        row[5] === "1" &&
        row[6] === status &&
        /^(?:0|[1-9]\d*)$/v.test(row[7] ?? "") &&
        Number.isSafeInteger(Number(row[7]))
    );
}

/** @param {unknown} value @returns {value is WateringFeed} */
function isWateringFeed(value) {
    if (
        typeof value !== "object" ||
        value === null ||
        !("version" in value) ||
        value.version !== 1 ||
        !("history" in value) ||
        !Array.isArray(value.history)
    )
        return false;
    return value.history.every((event, index) =>
        isWateringRecord(event, index)
    );
}

/** @param {unknown} value @param {number} index @returns {value is HistoryEvent} */
function isWateringRecord(value, index) {
    if (typeof value !== "object" || value === null || !("_index" in value))
        return false;
    const { _index: rowIndex } = value;
    if (rowIndex !== index) return false;
    const fields = Object.entries(value);
    if (
        fields.length !== 6 ||
        fields.some(
            ([field, entry]) =>
                field !== "_index" &&
                (!historyFields.includes(field) || typeof entry !== "string")
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
