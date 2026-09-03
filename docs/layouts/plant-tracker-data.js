/** @typedef {Record<string, string>} SheetRow */
/** @typedef {{ [key: string]: string | number; _index: number }} HistoryEvent */
/** @typedef {{ date: Date; event: HistoryEvent; value: number }} MeasurementPoint */
/** @typedef {{ "Current pot label"?: string; "Plant ID"?: string }} PlantLabelRecord */
/**
 * @typedef {{
 *     [key: string]: any;
 *     "Plant ID": string;
 *     "Current pot label": string;
 *     "Plant / planter": string;
 *     "Scientific name / contents": string;
 *     events: HistoryEvent[];
 *     summary: ReturnType<typeof calculateSummary>;
 * }} CollectionPlant
 */
/** @typedef {{ history: HistoryEvent[]; plants: CollectionPlant[] }} CollectionData */

const publishedSheetBase =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlR11VjUWkf8xO7HGvYwpZmxZohxV-wpSTYQRfgLw0UIpXBXJ8O0Rik-ySoNWY-EyqWdQ2kzdXtgZR/pub";

export const sheetUrls = {
    edit: "https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit?gid=1875598047#gid=1875598047",
    editTracker:
        "https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit?gid=0#gid=0",
    editQuickLog:
        "https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit?gid=2015971861#gid=2015971861",
    editHistory:
        "https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit?gid=1465181080#gid=1465181080",
    editBaselines:
        "https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit?gid=1087321540#gid=1087321540",
    trackerCsv: `${publishedSheetBase}?gid=0&single=true&output=csv`,
    historyCsv: `${publishedSheetBase}?gid=1465181080&single=true&output=csv`,
    baselinesCsv: `${publishedSheetBase}?gid=1087321540&single=true&output=csv`,
    /** @param {string} plantId */
    plantPage(plantId) {
        const gid = plantSheetGids[plantId];
        return gid
            ? `https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit?gid=${gid}#gid=${gid}`
            : sheetUrls.edit;
    },
};

/** @type {Readonly<Record<string, number>>} */
const plantSheetGids = Object.freeze({
    P01: 261928558,
    P02: 1627085799,
    P03: 699310456,
    P04: 1703121353,
    P05: 1287025541,
    P06: 722739406,
    P07: 1943607307,
    P08: 1123704267,
    P09: 2108858075,
    P10: 563120069,
    P11: 1651412842,
    P12: 1062910759,
    P13: 1910672724,
    P14: 1338146977,
    P15: 539263221,
    P16: 219034748,
    P17: 1255045536,
    P18: 1489646395,
    P19: 2124393020,
    P20: 1902575014,
    P21: 763232184,
    P22: 294692157,
    P23: 202608230,
    P24: 202608240,
    P25: 202608250,
    P26: 202608260,
    P27: 202608270,
    P28: 202608280,
    P29: 202609290,
    P30: 202609300,
});

// Documented collection pot sizes. The latest Repot observation supersedes
// these starting values on the public history page.
/** @type {Readonly<Record<string, string>>} */
const initialPotSizeByPlant = Object.freeze({
    P01: "4 in",
    P02: "4 in",
    P03: "4 in",
    P04: "4 in",
    P05: "4 in",
    P06: "4 in",
    P07: "4 in",
    P08: "4 in",
    P09: "4 in",
    P10: "4 in",
    P11: "4 in",
    P12: "4 in",
    P13: "4 in",
    P14: "small 4 in",
    P15: "4 in",
    P16: "4 in",
    P17: "small 3 in",
    P18: "4 in",
    P21: "6 in",
    P22: "5 in",
    P23: "4 in",
    P24: "4 in",
    P25: "4 in",
    P26: "4 in",
    P27: "4 in",
    P28: "4 in",
});

const DAY_MS = 86_400_000;

/**
 * @param {string} text
 *
 * @returns {string[][]}
 */
export function parseCsv(text) {
    /** @type {string[][]} */
    const rows = [];
    /** @type {string[]} */
    let row = [];
    let cell = "";
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        const next = text[index + 1];

        if (character === '"' && quoted && next === '"') {
            cell += '"';
            index += 1;
        } else if (character === '"') {
            quoted = !quoted;
        } else if (character === "," && !quoted) {
            row.push(cell);
            cell = "";
        } else if ((character === "\n" || character === "\r") && !quoted) {
            if (character === "\r" && next === "\n") index += 1;
            row.push(cell);
            rows.push(row);
            row = [];
            cell = "";
        } else {
            cell += character;
        }
    }

    if (cell.length > 0 || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }

    return rows;
}

/**
 * @param {string[][]} rows
 *
 * @returns {SheetRow[]}
 */
function rowsToObjects(rows) {
    const [headers, ...data] = rows;
    if (!headers) return [];
    return data
        .filter((row) => row.some((cell) => cell.trim() !== ""))
        .map((row) =>
            Object.fromEntries(
                headers.map((header, index) => [header, row[index] ?? ""])
            )
        );
}

/**
 * @param {string} url
 *
 * @returns {Promise<SheetRow[]>}
 */
async function fetchCsv(url) {
    const response = await fetch(`${url}&refresh=${Date.now()}`);
    if (!response.ok) {
        throw new Error(`Google Sheets returned ${response.status}.`);
    }
    return rowsToObjects(parseCsv(await response.text()));
}

/**
 * @param {unknown} value
 *
 * @returns {Date | null}
 */
export function parseDate(value) {
    if (!value) return null;
    let match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        return new Date(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3])
        );
    }

    match = String(value).match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM))?$/i
    );
    if (match) {
        let hour = Number(match[4] || 0);
        const meridiem = String(match[7] || "").toUpperCase();
        if (meridiem === "AM" && hour === 12) hour = 0;
        if (meridiem === "PM" && hour < 12) hour += 12;
        return new Date(
            Number(match[3]),
            Number(match[1]) - 1,
            Number(match[2]),
            hour,
            Number(match[5] || 0),
            Number(match[6] || 0)
        );
    }
    return null;
}

/**
 * @param {unknown} value
 * @param {string} [fallback]
 */
export function formatDate(value, fallback = "Not logged") {
    const date = parseDate(value);
    return date
        ? new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
          }).format(date)
        : fallback;
}

/**
 * @param {unknown} left
 * @param {unknown} right
 *
 * @returns {number | null}
 */
export function daysBetween(left, right) {
    const leftDate = left instanceof Date ? left : parseDate(left);
    const rightDate = right instanceof Date ? right : parseDate(right);
    if (!leftDate || !rightDate) return null;
    return Math.round((rightDate.getTime() - leftDate.getTime()) / DAY_MS);
}

/** @param {unknown} value */
export function daysSince(value) {
    const date = parseDate(value);
    if (!date) return null;
    const today = new Date();
    const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );
    return Math.max(
        0,
        Math.round((todayStart.getTime() - date.getTime()) / DAY_MS)
    );
}

/**
 * @param {unknown} value
 *
 * @returns {number | null}
 */
export function numericValue(value) {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

/**
 * @param {number | null | undefined} value
 *
 * @returns {value is number}
 */
function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}

/**
 * @param {readonly (number | null | undefined)[]} values
 *
 * @returns {number | null}
 */
export function average(values) {
    const numbers = values.filter(isFiniteNumber);
    if (numbers.length === 0) return null;
    return numbers.reduce((total, value) => total + value, 0) / numbers.length;
}

/**
 * @param {readonly (number | null | undefined)[]} values
 *
 * @returns {number | null}
 */
export function median(values) {
    const numbers = values
        .filter(isFiniteNumber)
        .sort((left, right) => left - right);
    if (numbers.length === 0) return null;
    const middle = Math.floor(numbers.length / 2);
    const upper = numbers[middle];
    if (upper === undefined) return null;
    if (numbers.length % 2 !== 0) return upper;
    const lower = numbers[middle - 1];
    return lower === undefined ? null : (lower + upper) / 2;
}

/**
 * @param {readonly (number | null | undefined)[]} values
 *
 * @returns {number | null}
 */
export function standardDeviation(values) {
    const numbers = values.filter(isFiniteNumber);
    if (numbers.length < 2) return null;
    const mean = average(numbers);
    if (mean === null) return null;
    const variance =
        numbers.reduce((total, value) => total + (value - mean) ** 2, 0) /
        (numbers.length - 1);
    return Math.sqrt(variance);
}

/**
 * @param {HistoryEvent[]} events
 * @param {number} [direction]
 */
function sortEvents(events, direction = 1) {
    return [...events].sort((left, right) => {
        const dateDifference =
            (parseDate(left.Date)?.getTime() ?? 0) -
            (parseDate(right.Date)?.getTime() ?? 0);
        return direction * (dateDifference || left._index - right._index);
    });
}

/**
 * @param {HistoryEvent[]} events
 * @param {(event: HistoryEvent) => boolean} predicate
 *
 * @returns {HistoryEvent | undefined}
 */
function newest(events, predicate) {
    return sortEvents(events.filter(predicate)).at(-1);
}

const estimatedMeasurementMethods = new Set([
    "estimated from photo",
    "estimated visually",
]);

/** @param {HistoryEvent} event */
export function isActiveHistoryEvent(event) {
    return (
        String(event["Record status"] ?? "")
            .trim()
            .toLowerCase() !== "removed"
    );
}

/** @param {HistoryEvent} event */
function isEligibleGrowthMeasurement(event) {
    const quality = String(event["Observation quality"] ?? "")
        .trim()
        .toLowerCase();
    const method = String(event["Measurement method"] ?? "")
        .trim()
        .toLowerCase();
    const status = String(event["Record status"] ?? "")
        .trim()
        .toLowerCase();

    if (status === "removed" || estimatedMeasurementMethods.has(method)) {
        return false;
    }
    return (
        quality === "measured" ||
        (quality === "corrected" && method === "ruler")
    );
}

/**
 * @param {HistoryEvent[]} events
 * @param {string} field
 * @param {(event: HistoryEvent) => boolean} [predicate]
 *
 * @returns {MeasurementPoint[]}
 */
function measurementSeries(events, field, predicate = () => true) {
    return sortEvents(events.filter(predicate))
        .map((event) => ({
            date: parseDate(event.Date),
            event,
            value: numericValue(event[field]),
        }))
        .filter(
            /** @returns {point is MeasurementPoint} */
            (point) => point.date !== null && point.value !== null
        );
}

/** @param {MeasurementPoint[]} series */
function monthlyRate(series) {
    if (series.length < 2) return null;
    const start = series[0].date.getTime();
    const points = series.map((point) => ({
        x: (point.date.getTime() - start) / DAY_MS,
        y: point.value,
    }));
    const xMean = average(points.map((point) => point.x));
    const yMean = average(points.map((point) => point.y));
    if (xMean === null || yMean === null) return null;
    const denominator = points.reduce(
        (total, point) => total + (point.x - xMean) ** 2,
        0
    );
    if (denominator === 0) return null;
    const numerator = points.reduce(
        (total, point) => total + (point.x - xMean) * (point.y - yMean),
        0
    );
    return (numerator / denominator) * 30.4375;
}

/** @param {MeasurementPoint[]} series */
function seriesChange(series) {
    if (series.length < 2) return null;
    const first = series[0];
    const latest = series.at(-1);
    return first && latest ? latest.value - first.value : null;
}

/** @param {readonly (number | null | undefined)[]} values */
function coefficientOfVariation(values) {
    const deviation = standardDeviation(values);
    const mean = average(values);
    return deviation === null || mean === null || mean === 0
        ? null
        : deviation / mean;
}

/** @param {HistoryEvent[]} events */
function wateringDetails(events) {
    const waterEvents = sortEvents(
        events.filter(
            (event) =>
                String(event.Event ?? "")
                    .trim()
                    .toLowerCase() === "water"
        )
    );
    /** @type {{ date: Date; event: HistoryEvent }[]} */
    const unique = [];
    const seen = new Set();
    waterEvents.forEach((event) => {
        const date = parseDate(event.Date);
        if (!date) return;
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        if (seen.has(key)) return;
        seen.add(key);
        unique.push({ date, event });
    });
    const intervals = unique.slice(1).map((entry, index) => ({
        date: entry.date,
        days: Math.max(0, daysBetween(unique[index].date, entry.date) ?? 0),
        from: unique[index].date,
        to: entry.date,
    }));
    const values = intervals.map((interval) => interval.days);
    return {
        events: unique,
        intervals,
        average: average(values),
        median: median(values),
        latest: intervals.at(-1)?.days ?? null,
    };
}

/**
 * @param {HistoryEvent[]} events
 * @param {string} [plantId]
 */
export function calculateSummary(events, plantId = "") {
    const currentEvents = events.filter(isActiveHistoryEvent);
    const activePotSetup = Math.max(
        1,
        ...events.map((event) => numericValue(event["Pot setup"]) ?? 1)
    );
    const activeEvents = events.filter(
        (event) => (numericValue(event["Pot setup"]) ?? 1) === activePotSetup
    );
    const activeWeights = activeEvents.filter(
        (event) => numericValue(event["Weight (g)"]) !== null
    );
    const dryWeights = activeWeights
        .filter(
            (event) =>
                String(event["Weight state"] ?? "")
                    .trim()
                    .toLowerCase() === "dry"
        )
        .map((event) => numericValue(event["Weight (g)"]))
        .filter((value) => value !== null);
    const wetWeights = activeWeights
        .filter(
            (event) =>
                String(event["Weight state"] ?? "")
                    .trim()
                    .toLowerCase() === "wet"
        )
        .map((event) => numericValue(event["Weight (g)"]))
        .filter((value) => value !== null);
    const dryAverage = average(dryWeights);
    const wetAverage = average(wetWeights);
    const latestWeight = newest(
        activeWeights,
        (event) => numericValue(event["Weight (g)"]) !== null
    );
    const latestHeight = newest(
        events,
        (event) => numericValue(event["Height (cm)"]) !== null
    );
    const latestWidth = newest(
        events,
        (event) => numericValue(event["Width (cm)"]) !== null
    );
    const latestCondition = newest(
        events,
        (event) => String(event["Condition / soil"] ?? "").trim() !== ""
    );
    const latestActivity = newest(events, () => true);
    /** @param {string} name */
    const eventNamed = (name) =>
        currentEvents.filter(
            (event) =>
                String(event.Event ?? "")
                    .trim()
                    .toLowerCase() === name.toLowerCase()
        );
    const nutrientEvents = eventNamed("Water").filter(
        (event) =>
            String(event["Nutrients used"] ?? "")
                .trim()
                .toLowerCase() === "yes"
    );
    const repotEvents = eventNamed("Repot");
    const flowerEvents = eventNamed("Flower");
    const photoEvents = eventNamed("Photo").filter((event) =>
        String(event["Photo URL"] ?? "").trim()
    );
    const pestEvents = eventNamed("Pest");
    const checkEvents = eventNamed("Check");
    const rotationEvents = eventNamed("Rotation");
    const cleanEvents = eventNamed("Clean");
    const pruneEvents = eventNamed("Prune");
    const heightSeries = measurementSeries(
        events,
        "Height (cm)",
        isEligibleGrowthMeasurement
    );
    const widthSeries = measurementSeries(
        events,
        "Width (cm)",
        isEligibleGrowthMeasurement
    );
    const weightSeries = measurementSeries(activeEvents, "Weight (g)").map(
        (point) => ({
            ...point,
            state: point.event["Weight state"] || "Routine",
        })
    );
    const capacity =
        dryAverage !== null && wetAverage !== null
            ? wetAverage - dryAverage
            : null;
    const latestWeightValue = latestWeight
        ? numericValue(latestWeight["Weight (g)"])
        : null;
    const remainingFraction =
        capacity !== null &&
        capacity > 0 &&
        latestWeightValue !== null &&
        dryAverage !== null
            ? Math.max(
                  0,
                  Math.min(1, (latestWeightValue - dryAverage) / capacity)
              )
            : null;
    const baselineStatus =
        dryWeights.length >= 2 && wetWeights.length >= 2
            ? capacity !== null && capacity > 0
                ? "Ready"
                : "Check baseline"
            : dryWeights.length > 0 || wetWeights.length > 0
              ? "Provisional"
              : "Needs dry + wet weights";
    const previousWeightValue = weightSeries.at(-2)?.value ?? null;
    const weightChange =
        latestWeightValue !== null && previousWeightValue !== null
            ? latestWeightValue - previousWeightValue
            : null;
    const weightChangePercent =
        weightChange !== null &&
        previousWeightValue !== null &&
        previousWeightValue !== 0
            ? weightChange / previousWeightValue
            : null;
    const watering = wateringDetails(currentEvents);
    const datedEvents = sortEvents(events).filter((event) =>
        parseDate(event.Date)
    );

    return {
        activePotSetup,
        baselineStatus,
        capacity,
        dryAverage,
        dryCoefficientOfVariation: coefficientOfVariation(dryWeights),
        drySamples: dryWeights.length,
        dryStandardDeviation: standardDeviation(dryWeights),
        firstActivity: datedEvents[0],
        heightChange: seriesChange(heightSeries),
        heightMonthlyRate: monthlyRate(heightSeries),
        heightSeries,
        lastWater: watering.events.at(-1)?.event,
        latestActivity,
        latestCondition,
        latestHeight,
        latestWeight,
        latestWeightValue,
        latestWidth,
        currentPotSize:
            newest(repotEvents, (event) =>
                Boolean(String(event["Pot size"] ?? "").trim())
            )?.["Pot size"] ||
            initialPotSizeByPlant[plantId] ||
            "Not logged",
        eventCounts: {
            checks: checkEvents.length,
            flowers: flowerEvents.length,
            nutrients: nutrientEvents.length,
            pests: pestEvents.length,
            photos: photoEvents.length,
            repots: repotEvents.length,
            rotations: rotationEvents.length,
            cleans: cleanEvents.length,
            prunes: pruneEvents.length,
        },
        latestCheck: newest(checkEvents, () => true),
        latestFlower: newest(flowerEvents, () => true),
        latestNutrients: newest(nutrientEvents, () => true),
        latestPest: newest(pestEvents, () => true),
        latestPhoto: newest(photoEvents, () => true),
        latestRepot: newest(repotEvents, () => true),
        latestRotation: newest(rotationEvents, () => true),
        observationSpanDays:
            datedEvents.length > 1
                ? daysBetween(
                      datedEvents[0]?.Date ?? "",
                      datedEvents.at(-1)?.Date ?? ""
                  )
                : 0,
        previousWeightValue,
        remainingFraction,
        watering,
        weightChange,
        weightChangePercent,
        weightMovingAverage: average(
            weightSeries.slice(-3).map((point) => point.value)
        ),
        weightSeries,
        wetAverage,
        wetCoefficientOfVariation: coefficientOfVariation(wetWeights),
        wetSamples: wetWeights.length,
        wetStandardDeviation: standardDeviation(wetWeights),
        widthChange: seriesChange(widthSeries),
        widthMonthlyRate: monthlyRate(widthSeries),
        widthSeries,
    };
}

/** @returns {Promise<CollectionData>} */
export async function loadCollectionData() {
    const [plants, history] = await Promise.all([
        fetchCsv(sheetUrls.trackerCsv),
        fetchCsv(sheetUrls.historyCsv),
    ]);
    /** @type {HistoryEvent[]} */
    const observations = history.map((event, index) => ({
        ...event,
        _index: index,
    }));
    /** @type {Map<string, HistoryEvent[]>} */
    const eventsById = new Map();
    observations.forEach((event) => {
        const plantId = String(event["Plant ID"] ?? "");
        const plantEvents = eventsById.get(plantId) ?? [];
        plantEvents.push(event);
        eventsById.set(plantId, plantEvents);
    });

    return {
        history: observations,
        plants: plants.map((plant) => {
            const events = eventsById.get(plant["Plant ID"]) ?? [];
            return {
                ...plant,
                "Plant ID": plant["Plant ID"],
                "Current pot label": plant["Current pot label"],
                "Plant / planter": plant["Plant / planter"],
                "Scientific name / contents":
                    plant["Scientific name / contents"],
                events,
                summary: calculateSummary(events, plant["Plant ID"]),
            };
        }),
    };
}

/**
 * @param {unknown} value
 * @param {string} unit
 */
export function formatMeasurement(value, unit) {
    const number = numericValue(value);
    if (number === null) return "Not logged";
    const formatted = Number.isInteger(number)
        ? String(number)
        : number.toFixed(1);
    return `${formatted} ${unit}`;
}

/**
 * @param {number} value
 * @param {string} [unit]
 * @param {number} [digits]
 */
export function formatSigned(value, unit = "", digits = 1) {
    if (!Number.isFinite(value)) return "Not enough data";
    const rounded = Math.abs(value).toFixed(digits);
    const sign = value > 0 ? "+" : value < 0 ? "−" : "";
    return `${sign}${rounded}${unit ? ` ${unit}` : ""}`;
}

/** @param {string} labelId */
export function historyPageUrl(labelId) {
    return `./plant-history.html?id=${encodeURIComponent(labelId)}`;
}

/** @param {PlantLabelRecord} plant */
export function plantLabel(plant) {
    return plant["Current pot label"] || plant["Plant ID"];
}

const LABEL_GROUP_ORDER = Object.freeze([
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "#",
]);

/** @param {PlantLabelRecord} plant */
function plantLabelSortParts(plant) {
    const label = String(plantLabel(plant) || "")
        .trim()
        .toUpperCase();
    const match =
        /^([A-H])([1-9]\d*)$/.exec(label) || /^(#)([1-9]\d*)$/.exec(label);
    const group = match ? match[1] : "";
    const groupIndex = LABEL_GROUP_ORDER.indexOf(group);
    return {
        groupIndex: groupIndex === -1 ? LABEL_GROUP_ORDER.length : groupIndex,
        number: match ? Number(match[2]) : Number.MAX_SAFE_INTEGER,
        label,
        id: String(plant["Plant ID"] || ""),
    };
}

/**
 * @param {PlantLabelRecord} leftPlant
 * @param {PlantLabelRecord} rightPlant
 */
export function comparePlantsByNaturalLabel(leftPlant, rightPlant) {
    const left = plantLabelSortParts(leftPlant);
    const right = plantLabelSortParts(rightPlant);
    return (
        left.groupIndex - right.groupIndex ||
        left.number - right.number ||
        left.label.localeCompare(right.label, undefined, {
            numeric: true,
            sensitivity: "base",
        }) ||
        left.id.localeCompare(right.id, undefined, {
            numeric: true,
            sensitivity: "base",
        })
    );
}

/** @param {number} days */
export function dayColor(days) {
    const green = [
        87,
        187,
        138,
    ];
    const yellow = [
        255,
        214,
        102,
    ];
    const red = [
        230,
        124,
        115,
    ];
    /**
     * @param {number[]} start
     * @param {number[]} end
     * @param {number} amount
     */
    const mix = (start, end, amount) =>
        start.map((value, index) =>
            Math.round(value + (end[index] - value) * amount)
        );
    const clamped = Math.max(0, Math.min(28, days));
    const color =
        clamped <= 14
            ? mix(green, yellow, clamped / 14)
            : mix(yellow, red, (clamped - 14) / 14);
    return `rgb(${color.join(", ")})`;
}

/** @param {HTMLButtonElement} button */
export function installThemeToggle(button) {
    const root = document.documentElement;
    const label = button.querySelector("[data-theme-label]");
    const update = () => {
        const dark = root.dataset.theme === "dark";
        const text = dark ? "Light mode" : "Dark mode";
        if (label) label.textContent = text;
        else button.textContent = text;
        button.setAttribute("aria-pressed", String(dark));
    };
    button.addEventListener("click", () => {
        root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
        localStorage.setItem("gardening-site-theme", root.dataset.theme);
        update();
    });
    update();
}
