const storageKey = "gardening-public-sheet-snapshot-v1";
const maximumAge = 24 * 60 * 60 * 1000;
const maximumLength = 1024 ** 2;

/** @typedef {Pick<Storage, "getItem" | "setItem" | "removeItem">} SnapshotStorage */
/**
 * @template T @typedef {{ data: T; readAt: number; startedAt: number }}
 *   SheetSnapshot
 */

/**
 * Keep one validated, bounded public-source snapshot. Concurrent callers share
 * one refresh, and a slower older request cannot replace a newer saved read.
 *
 * @template T
 *
 * @param {{
 *     sourceKey: string;
 *     load: () => Promise<T>;
 *     validate: (value: unknown) => value is T;
 *     storage?: () => SnapshotStorage | null;
 *     now?: () => number;
 * }} options
 */
export function createSheetSnapshotCache({
    load,
    now = Date.now,
    sourceKey,
    storage = browserStorage,
    validate,
}) {
    /** @type {SheetSnapshot<T> | null} */
    let memory = null;
    /** @type {Promise<SheetSnapshot<T>> | null} */
    let inFlight = null;

    /** @param {string | null} text @returns {SheetSnapshot<T> | null} */
    const decode = (text) => {
        if (text === null || text.length > maximumLength) return null;
        /** @type {unknown} */
        let envelope;
        try {
            envelope = JSON.parse(text);
        } catch {
            return null;
        }
        if (
            !isRecord(envelope) ||
            envelope["sourceKey"] !== sourceKey ||
            envelope["version"] !== 1
        )
            return null;
        const readAt = envelope["readAt"];
        const startedAt = envelope["startedAt"];
        if (
            typeof readAt !== "number" ||
            typeof startedAt !== "number" ||
            !Number.isFinite(readAt) ||
            !Number.isFinite(startedAt) ||
            startedAt < 0 ||
            startedAt > readAt ||
            readAt > now() ||
            now() - readAt > maximumAge ||
            !validate(envelope["data"])
        )
            return null;
        return { data: envelope["data"], readAt, startedAt };
    };
    const readDisk = () => {
        try {
            return decode(storage()?.getItem(storageKey) ?? null);
        } catch {
            return null;
        }
    };
    const saved = () => {
        if (
            memory &&
            (memory.readAt > now() || now() - memory.readAt > maximumAge)
        )
            memory = null;
        memory = newest(memory, readDisk());
        return memory;
    };
    /** @param {string} text */
    const persist = (text) => {
        const target = storage();
        if (!target) return;
        if (text.length <= maximumLength) target.setItem(storageKey, text);
        else target.removeItem(storageKey);
    };
    /** @param {number} startedAt */
    const readFresh = async (startedAt) => {
        const data = await load();
        if (!validate(data))
            throw new Error(
                "The published Sheet response did not contain the expected columns."
            );
        const snapshot = { data, readAt: now(), startedAt };
        const selected = newest(snapshot, saved()) ?? snapshot;
        const text = JSON.stringify({ ...selected, sourceKey, version: 1 });
        memory = text.length <= maximumLength ? selected : null;
        try {
            persist(text);
        } catch {
            // Denied or full storage must not turn a successful network read into failure.
        }
        return selected;
    };
    /** @param {number} startedAt */
    const performRefresh = async (startedAt) => {
        try {
            // Yield before calling a loader so even synchronous failures release the shared flight.
            await Promise.resolve();
            return await readFresh(startedAt);
        } finally {
            inFlight = null;
        }
    };
    const refresh = () => {
        inFlight ??= performRefresh(now());
        return inFlight;
    };
    return { refresh, saved };
}

/** @param {number} timestamp */
export function sourceReadLabel(timestamp) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "long",
        timeZone: "America/New_York",
    });
    return formatter.format(timestamp);
}

/**
 * Browser storage is optional; synthetic Storybook frames never persist
 * observations.
 */
function browserStorage() {
    if (
        typeof location === "undefined" ||
        location.pathname.includes("/storybook/")
    )
        return null;
    return localStorage;
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @template T @param {SheetSnapshot<T> | null} left @param {SheetSnapshot<T> |
 *   null} right
 */
function newest(left, right) {
    if (!left) return right;
    if (!right) return left;
    return right.startedAt > left.startedAt ||
        (right.startedAt === left.startedAt && right.readAt > left.readAt)
        ? right
        : left;
}
