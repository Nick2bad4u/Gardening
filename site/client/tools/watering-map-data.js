import {
    isActiveHistoryEvent,
    parseDate,
} from "../../../docs/layouts/plant-tracker-data.js";

/**
 * @typedef {{
 *     id: string;
 *     label: string;
 *     name: string;
 *     zone: "front" | "rear" | "sill" | "other";
 *     position: string;
 *     x: number;
 *     y: number;
 * }} PotPlacement
 */
/** @typedef {import("../../../docs/layouts/plant-tracker-data.js").HistoryEvent} HistoryEvent */
/**
 * @typedef {{
 *     date: string;
 *     day: number;
 *     key: number;
 *     instant: number | null;
 * }} GardenDate
 */

const gardenClock = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: "America/New_York",
    year: "numeric",
});

/**
 * The last active Water event follows the pot across setup changes. A Repot,
 * Mist, or weight reading is not evidence that watering occurred.
 *
 * @param {readonly PotPlacement[]} placements
 * @param {readonly HistoryEvent[]} history
 * @param {Date} [now]
 */
export function buildWateringMap(placements, history, now = new Date()) {
    const today = gardenDate(now);
    /** @type {Map<string, GardenDate>} */
    const waterById = new Map();
    /** @type {Map<string, { date: GardenDate; location: string }>} */
    const locationById = new Map();
    for (const event of history) {
        const date = observationDate(event["Date"]);
        if (!date || !isActiveHistoryEvent(event) || isAfter(date, today))
            continue;
        const id = String(event["Plant ID"] ?? "").trim();
        const kind = String(event["Event"] ?? "")
            .trim()
            .toLowerCase();
        const previousWater = waterById.get(id);
        if (
            kind === "water" &&
            (!previousWater || isAfter(date, previousWater))
        ) {
            waterById.set(id, date);
        }
        const location = String(event["New location"] ?? "").trim();
        const previousLocation = locationById.get(id);
        if (
            kind === "move" &&
            location &&
            (!previousLocation || !isAfter(previousLocation.date, date))
        ) {
            locationById.set(id, { date, location });
        }
    }
    return {
        date: today.date,
        markers: placements.map((placement) => {
            const water = waterById.get(placement.id);
            return {
                ...placement,
                currentLocation: locationById.get(placement.id)?.location ?? "",
                days: water ? today.day - water.day : null,
                lastWater: water?.date ?? null,
            };
        }),
    };
}

/** @param {Date} value @returns {GardenDate} */
function gardenDate(value) {
    const parts = Object.fromEntries(
        gardenClock.formatToParts(value).map((part) => [part.type, part.value])
    );
    const timestamp = Date.UTC(
        Number(parts["year"]),
        Number(parts["month"]) - 1,
        Number(parts["day"]),
        Number(parts["hour"]),
        Number(parts["minute"]),
        Number(parts["second"])
    );
    const calendar = new Date(timestamp);
    const date = calendar.toISOString().slice(0, 10);
    return {
        date,
        day: Date.parse(`${date}T00:00:00Z`) / 86_400_000,
        instant: value.getTime(),
        key: timestamp,
    };
}

/** @param {GardenDate} date @param {GardenDate} reference */
function isAfter(date, reference) {
    return date.instant !== null && reference.instant !== null
        ? date.instant > reference.instant
        : date.key > reference.key;
}

/** @param {string} text */
function isoDateFields(text) {
    const [
        date = "",
        clock,
        extra,
    ] = text.split("T", 3);
    const fields = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/v.exec(
        date
    )?.groups;
    if (!fields || extra !== undefined) return null;
    if (clock === undefined) return fields;
    const time =
        // eslint-disable-next-line security/detect-unsafe-regex -- The caller bounds the entire input to 50 characters; separators delimit every field.
        /^(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})(?:\.\d+)?(?<offset>Z|[+\-]\d{2}:\d{2})?$/v.exec(
            clock
        )?.groups;
    return time ? { ...fields, ...time } : null;
}

/** @param {Record<string, string>} fields @returns {GardenDate | null} */
function localGardenDate(fields) {
    const year = Number(fields["year"]);
    const month = Number(fields["month"]);
    const day = Number(fields["day"]);
    let hour = Number(fields["hour"] ?? 0);
    const minute = Number(fields["minute"] ?? 0);
    const second = Number(fields["second"] ?? 0);
    const meridiem = fields["meridiem"]?.toUpperCase();
    if (meridiem !== undefined) {
        if (hour < 1 || hour > 12) return null;
        hour = (hour % 12) + (meridiem === "PM" ? 12 : 0);
    }
    const midnight = new Date(Date.UTC(year, month - 1, day));
    if (
        midnight.getUTCFullYear() !== year ||
        midnight.getUTCMonth() !== month - 1 ||
        midnight.getUTCDate() !== day ||
        hour > 23 ||
        minute > 59 ||
        second > 59
    )
        return null;
    const date = midnight.toISOString().slice(0, 10);
    return {
        date,
        day: midnight.getTime() / 86_400_000,
        instant: null,
        key:
            midnight.getTime() +
            hour * 3_600_000 +
            minute * 60_000 +
            second * 1000,
    };
}

/**
 * Published Sheet dates without an offset are garden wall-clock readings.
 * Interpret them without the viewer's local timezone or DST-length days.
 *
 * @param {unknown} value
 *
 * @returns {GardenDate | null}
 */
function observationDate(value) {
    if (typeof value !== "string") return null;
    const text = value.trim();
    if (text.length > 50) return null;
    const local =
        // eslint-disable-next-line security/detect-unsafe-regex -- Input is bounded to 50 characters; all numeric fields have a fixed upper bound.
        /^(?<month>\d{1,2})\/(?<day>\d{1,2})\/(?<year>\d{4})(?:\s(?<hour>\d{1,2}):(?<minute>\d{2})(?::(?<second>\d{2}))?\s(?<meridiem>am|pm))?$/iv.exec(
            text
        )?.groups;
    const fields = isoDateFields(text) ?? local;
    if (!fields) return null;
    const result = localGardenDate(fields);
    if (!result) return null;
    if (fields["offset"] !== undefined) {
        const timestamp = parseDate(text);
        return timestamp ? gardenDate(timestamp) : null;
    }
    return result;
}
