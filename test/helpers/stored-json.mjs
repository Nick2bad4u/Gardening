import { required } from "./required.mjs";

/** @param {unknown} value @returns {Record<string, unknown>} */
export function jsonRecord(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new TypeError("Expected a JSON object");
    }
    return /** @type {Record<string, unknown>} */ (value);
}

/** @param {string | null} serialized @returns {unknown} */
export function parseStoredJson(serialized) {
    return JSON.parse(required(serialized, "stored JSON"));
}

/**
 * Read the persisted queue using the client's serializable payload contract.
 *
 * @param {string | null} serialized
 *
 * @returns {import("../logger-fixtures.d.ts").QueuedObservation[]}
 */
export function parseStoredQueue(serialized) {
    const value = parseStoredJson(serialized);
    if (!Array.isArray(value)) throw new TypeError("Expected a stored queue");
    /** @type {unknown[]} */
    const entries = value;
    return entries.map((entry) => {
        assertQueuedObservation(entry);
        return entry;
    });
}

/** @param {string | null} serialized @returns {Record<string, unknown>} */
export function parseStoredRecord(serialized) {
    return jsonRecord(parseStoredJson(serialized));
}

/** @param {string} key @param {unknown} field */
function assertPayloadField(key, field) {
    if (key === "events" || key === "plantIds") {
        if (!isStringArray(field)) throw new TypeError(`Invalid ${key}`);
        return;
    }
    if (key === "expectedCount") {
        if (typeof field !== "number" || !Number.isFinite(field))
            throw new TypeError("Invalid expected observation count");
        return;
    }
    if (typeof field !== "string")
        throw new TypeError(`Invalid queue payload field: ${key}`);
}

/**
 * @param {unknown} entry
 *
 * @returns {asserts entry is import("../logger-fixtures.d.ts").QueuedObservation}
 */
function assertQueuedObservation(entry) {
    const record = jsonRecord(entry);
    if (
        typeof record["requestId"] !== "string" ||
        typeof record["addedAt"] !== "string"
    ) {
        throw new TypeError("Queue entries need an ID and added time");
    }
    if (
        record["attemptedAt"] !== undefined &&
        typeof record["attemptedAt"] !== "string"
    ) {
        throw new TypeError("Invalid queue attempt time");
    }
    if (record["error"] !== undefined && typeof record["error"] !== "string") {
        throw new TypeError("Invalid queue error");
    }
    const fields = Object.entries(jsonRecord(record["payload"]));
    for (const [key, field] of fields) {
        assertPayloadField(key, field);
    }
}

/** @param {unknown} value @returns {value is string[]} */
function isStringArray(value) {
    return (
        Array.isArray(value) && value.every((item) => typeof item === "string")
    );
}
