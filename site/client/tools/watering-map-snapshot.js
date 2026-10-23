/** @typedef {import("../../../docs/layouts/plant-tracker-data.js").HistoryEvent} HistoryEvent */

/**
 * Decode the deliberately small publication fallback. Its original read time is
 * never replaced with the page-load time, even when the snapshot is old.
 *
 * @param {unknown} value
 * @param {number} [now]
 *
 * @returns {{ history: HistoryEvent[]; readAt: number } | null}
 */
export function decodeWateringSnapshot(value, now = Date.now()) {
    if (
        !isRecord(value) ||
        value["version"] !== 1 ||
        value["source"] !== "canonical-history" ||
        typeof value["sourceReadAt"] !== "string" ||
        !Array.isArray(value["plantIds"]) ||
        !Array.isArray(value["observations"])
    ) {
        return null;
    }
    const readAt = Date.parse(value["sourceReadAt"]);
    if (!Number.isFinite(readAt) || readAt < 0 || readAt > now) return null;
    /** @type {unknown[]} */
    const plantIds = value["plantIds"];
    const uniquePlantIds = new Set(plantIds);
    if (
        plantIds.length === 0 ||
        plantIds.some(
            (id) => typeof id !== "string" || !/^P\d{2}$/v.test(id)
        ) ||
        uniquePlantIds.size !== plantIds.length
    ) {
        return null;
    }
    /** @type {unknown[]} */
    const observations = value["observations"];
    if (observations.length > plantIds.length * 2) return null;
    /** @type {HistoryEvent[]} */
    const history = [];
    for (const row of observations) {
        if (!isSnapshotEvent(row, plantIds)) return null;
        history.push({ ...row, _index: history.length });
    }
    return { history, readAt };
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @param {unknown[]} plantIds
 *
 * @returns {value is Record<string, string>}
 */
function isSnapshotEvent(value, plantIds) {
    if (!isRecord(value)) return false;
    const allowedFields = new Set([
        "Date",
        "Event",
        "New location",
        "Plant ID",
        "Record status",
    ]);
    return (
        typeof value["Date"] === "string" &&
        value["Date"].trim() !== "" &&
        (value["Event"] === "Move" || value["Event"] === "Water") &&
        plantIds.includes(value["Plant ID"]) &&
        (value["Record status"] === undefined ||
            (typeof value["Record status"] === "string" &&
                ["", "Active"].includes(value["Record status"]))) &&
        Object.entries(value).every(
            ([key, entry]) =>
                allowedFields.has(key) && typeof entry === "string"
        )
    );
}
