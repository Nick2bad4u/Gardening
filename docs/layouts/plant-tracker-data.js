/** @typedef {Record<string, string>} SheetRow */
/** @typedef {{ [key: string]: string | number; _index: number }} HistoryEvent */
/** @typedef {{ date: Date; event: HistoryEvent; value: number }} MeasurementPoint */
/** @typedef {{ "Current pot label"?: string; "Plant ID"?: string }} PlantLabelRecord */
/**
 * @typedef {{
 *     "Plant ID": string;
 *     "Current pot label": string;
 *     "Plant / planter": string;
 *     "Scientific name / contents": string;
 *     "Est. time to dry": string;
 *     events: HistoryEvent[];
 *     summary: ReturnType<typeof calculateSummary>;
 * }} CollectionPlant
 */
/** @typedef {{ history: HistoryEvent[]; plants: CollectionPlant[] }} CollectionData */

const publishedSheetBase =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlR11VjUWkf8xO7HGvYwpZmxZohxV-wpSTYQRfgLw0UIpXBXJ8O0Rik-ySoNWY-EyqWdQ2kzdXtgZR/pub";

/** @type {Readonly<Record<string, number>>} */
const plantSheetGids = Object.freeze({
    P01: 261_928_558,
    P02: 1_627_085_799,
    P03: 699_310_456,
    P04: 1_703_121_353,
    P05: 1_287_025_541,
    P06: 722_739_406,
    P07: 1_943_607_307,
    P08: 1_123_704_267,
    P09: 2_108_858_075,
    P10: 563_120_069,
    P11: 1_651_412_842,
    P12: 1_062_910_759,
    P13: 1_910_672_724,
    P14: 1_338_146_977,
    P15: 539_263_221,
    P16: 219_034_748,
    P17: 1_255_045_536,
    P18: 1_489_646_395,
    P19: 2_124_393_020,
    P20: 1_902_575_014,
    P21: 763_232_184,
    P22: 294_692_157,
    P23: 202_608_230,
    P24: 202_608_240,
    P25: 202_608_250,
    P26: 202_608_260,
    P27: 202_608_270,
    P28: 202_608_280,
    P29: 202_609_290,
    P30: 202_609_300,
});

export const sheetUrls = {
    baselinesCsv: `${publishedSheetBase}?gid=1087321540&single=true&output=csv`,
    edit: "https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit?gid=1875598047#gid=1875598047",
    editBaselines:
        "https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit?gid=1087321540#gid=1087321540",
    editHistory:
        "https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit?gid=1465181080#gid=1465181080",
    editQuickLog:
        "https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit?gid=2015971861#gid=2015971861",
    editTracker:
        "https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit?gid=0#gid=0",
    historyCsv: `${publishedSheetBase}?gid=1465181080&single=true&output=csv`,
    /** @param {string} plantId */
    plantPage(plantId) {
        const gid = plantSheetGids[plantId];
        return gid === undefined
            ? sheetUrls.edit
            : `https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit?gid=${gid}#gid=${gid}`;
    },
    trackerCsv: `${publishedSheetBase}?gid=0&single=true&output=csv`,
};

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
 * @param {readonly (number | null | undefined)[]} values
 *
 * @returns {number | null}
 */
export function average(values) {
    const numbers = values.filter((entry) => isFiniteNumber(entry));
    if (numbers.length === 0) return null;
    return numbers.reduce((total, value) => total + value, 0) / numbers.length;
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
 * @param {string} [fallback]
 */
export function formatDate(value, fallback = "Not logged") {
    const date = parseDate(value);
    const formatter = new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
    return date ? formatter.format(date) : fallback;
}

/**
 * @param {readonly (number | null | undefined)[]} values
 *
 * @returns {number | null}
 */
export function median(values) {
    const numbers = values
        .filter((entry) => isFiniteNumber(entry))
        .toSorted((left, right) => left - right);
    if (numbers.length === 0) return null;
    const middle = Math.floor(numbers.length / 2);
    const upper = numbers[middle];
    if (upper === undefined) return null;
    if (numbers.length % 2 !== 0) return upper;
    const lower = numbers[middle - 1];
    return lower === undefined ? null : (lower + upper) / 2;
}

/**
 * @param {unknown} value
 *
 * @returns {number | null}
 */
export function numericValue(value) {
    if ((value ?? "") === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

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
    let isQuoted = false;

    for (let index = 0; index < text.length; index += 1) {
        const character = text.charAt(index);
        const next = text[index + 1];

        if (character === '"' && isQuoted && next === '"') {
            cell += '"';
            index += 1;
        } else if (character === '"') {
            isQuoted = !isQuoted;
        } else if (character === "," && !isQuoted) {
            row.push(cell);
            cell = "";
        } else if (!isQuoted && (character === "\n" || character === "\r")) {
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
 * @param {unknown} value
 *
 * @returns {Date | null}
 */
export function parseDate(value) {
    if (typeof value !== "string" || value === "") return null;
    const iso = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/v.exec(
        value
    )?.groups;
    if (iso) {
        return new Date(
            Number(iso["year"]),
            Number(iso["month"]) - 1,
            Number(iso["day"])
        );
    }
    const local =
        // eslint-disable-next-line security/detect-unsafe-regex -- Bounded date fields separate the whitespace runs; no repeat can consume the following field.
        /^(?<month>\d{1,2})\/(?<day>\d{1,2})\/(?<year>\d{4})(?:\s+(?<hour>\d{1,2}):(?<minute>\d{2})(?::(?<second>\d{2}))?\s*(?<meridiem>am|pm))?$/iv.exec(
            value
        )?.groups;
    if (!local) return null;
    let hour = Number(local["hour"] ?? 0);
    const meridiem = (local["meridiem"] ?? "").toUpperCase();
    if (meridiem === "AM" && hour === 12) hour = 0;
    if (meridiem === "PM" && hour < 12) hour += 12;
    return new Date(
        Number(local["year"]),
        Number(local["month"]) - 1,
        Number(local["day"]),
        hour,
        Number(local["minute"] ?? 0),
        Number(local["second"] ?? 0)
    );
}

/**
 * @param {readonly (number | null | undefined)[]} values
 *
 * @returns {number | null}
 */
export function standardDeviation(values) {
    const numbers = values.filter((entry) => isFiniteNumber(entry));
    if (numbers.length < 2) return null;
    const mean = average(numbers);
    if (mean === null) return null;
    const variance =
        numbers.reduce((total, value) => total + (value - mean) ** 2, 0) /
        (numbers.length - 1);
    return Math.sqrt(variance);
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
 * @param {number | null | undefined} value
 *
 * @returns {value is number}
 */
function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}

/**
 * @param {HistoryEvent[]} events
 * @param {(event: HistoryEvent) => boolean} predicate
 *
 * @returns {HistoryEvent | undefined}
 */
function newest(events, predicate) {
    return sortEvents(events.filter((entry) => predicate(entry))).at(-1);
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
 * @param {HistoryEvent[]} events
 * @param {number} [direction]
 */
function sortEvents(events, direction = 1) {
    return events.toSorted((left, right) => {
        const dateDifference =
            (parseDate(left["Date"])?.getTime() ?? 0) -
            (parseDate(right["Date"])?.getTime() ?? 0);
        const { _index: leftIndex } = left;
        const { _index: rightIndex } = right;
        return direction * (dateDifference || leftIndex - rightIndex);
    });
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

/** @param {readonly (number | null | undefined)[]} values */
function coefficientOfVariation(values) {
    const deviation = standardDeviation(values);
    const mean = average(values);
    return deviation === null || mean === null || mean === 0
        ? null
        : deviation / mean;
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
    return sortEvents(events.filter((entry) => predicate(entry)))
        .map((event) => ({
            date: parseDate(event["Date"]),
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
    const first = series[0];
    if (!first) return null;
    const start = first.date.getTime();
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

/**
 * @param {HistoryEvent} weightEvent
 * @param {HistoryEvent} waterEvent
 */
function observationsShareSave(weightEvent, waterEvent) {
    const weightSaveGroup = String(
        weightEvent["Save group / batch ID"] ?? ""
    ).trim();
    const waterSaveGroup = String(
        waterEvent["Save group / batch ID"] ?? ""
    ).trim();
    if (weightSaveGroup && waterSaveGroup) {
        return weightSaveGroup === waterSaveGroup;
    }
    const weightDate = parseDate(weightEvent["Date"]);
    const waterDate = parseDate(waterEvent["Date"]);
    return weightDate && waterDate
        ? weightDate.getTime() === waterDate.getTime()
        : String(weightEvent["Date"] ?? "") ===
              String(waterEvent["Date"] ?? "");
}

/** @param {MeasurementPoint[]} series */
function seriesChange(series) {
    if (series.length < 2) return null;
    const first = series[0];
    const latest = series.at(-1);
    return first && latest ? latest.value - first.value : null;
}

/** @param {HistoryEvent[]} events */
function wateringDetails(events) {
    const waterEvents = sortEvents(
        events.filter(
            (event) =>
                String(event["Event"] ?? "")
                    .trim()
                    .toLowerCase() === "water"
        )
    );
    /** @type {{ date: Date; event: HistoryEvent }[]} */
    const unique = [];
    const seen = new Set();
    for (const event of waterEvents) {
        const date = parseDate(event["Date"]);
        if (!date) continue;
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push({ date, event });
        }
    }
    const intervals = unique.slice(1).flatMap((entry, index) => {
        const previous = unique[index];
        if (!previous) return [];
        return [
            {
                date: entry.date,
                days: Math.max(0, daysBetween(previous.date, entry.date) ?? 0),
                from: previous.date,
                to: entry.date,
            },
        ];
    });
    const values = intervals.map((interval) => interval.days);
    return {
        average: average(values),
        events: unique,
        intervals,
        latest: intervals.at(-1)?.days ?? null,
        median: median(values),
    };
}

const WET_WEIGHT_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * @param {HistoryEvent[]} sourceEvents
 * @param {string} [plantId]
 */
export function calculateSummary(sourceEvents, plantId = "") {
    const events = historyCorrectionOrder(sourceEvents);
    const currentEvents = events.filter((entry) => isActiveHistoryEvent(entry));
    const activePotSetup = Math.max(
        1,
        ...currentEvents.map((event) => numericValue(event["Pot setup"]) ?? 1)
    );
    const activeEvents = currentEvents.filter(
        (event) => (numericValue(event["Pot setup"]) ?? 1) === activePotSetup
    );
    const weightCycles = weightCycleAnalytics(activeEvents);
    const activeWeights = weightCycles.weights;
    const dryWeights = weightCycles.dryAnchors.map((event) =>
        Number(event["Weight (g)"])
    );
    const wetWeights = weightCycles.wetAnchors.map((event) =>
        Number(event["Weight (g)"])
    );
    const dryAverage = average(dryWeights);
    const wetAverage = average(wetWeights);
    const latestWeight = newest(
        activeWeights,
        (event) => numericValue(event["Weight (g)"]) !== null
    );
    const latestHeight = newest(
        currentEvents,
        (event) => numericValue(event["Height (cm)"]) !== null
    );
    const latestWidth = newest(
        currentEvents,
        (event) => numericValue(event["Width (cm)"]) !== null
    );
    const latestCondition = newest(
        currentEvents,
        (event) => String(event["Condition / soil"] ?? "").trim() !== ""
    );
    const latestActivity = newest(currentEvents, () => true);
    /** @param {string} name */
    const eventNamed = (name) =>
        currentEvents.filter(
            (event) =>
                String(event["Event"] ?? "")
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
            state: weightCycles.stateByEvent.get(point.event) ?? "Routine",
        })
    );
    const capacity =
        dryAverage !== null && wetAverage !== null
            ? wetAverage - dryAverage
            : null;
    const latestWeightValue = latestWeight
        ? numericValue(latestWeight["Weight (g)"])
        : null;
    const remainingFraction = remainingWaterFraction(
        capacity,
        latestWeightValue,
        dryAverage
    );
    const baselineStatus = weightBaselineStatus(
        activeWeights.length,
        wetWeights.length,
        dryWeights.length,
        capacity
    );
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
    const datedEvents = sortEvents(currentEvents).filter((event) =>
        parseDate(event["Date"])
    );

    return {
        activePotSetup,
        baselineStatus,
        capacity,
        currentPotSize: currentPotSize(repotEvents, plantId),
        dryAverage,
        dryCoefficientOfVariation: coefficientOfVariation(dryWeights),
        drySamples: dryWeights.length,
        dryStandardDeviation: standardDeviation(dryWeights),
        eventCounts: {
            checks: checkEvents.length,
            cleans: cleanEvents.length,
            flowers: flowerEvents.length,
            nutrients: nutrientEvents.length,
            pests: pestEvents.length,
            photos: photoEvents.length,
            prunes: pruneEvents.length,
            repots: repotEvents.length,
            rotations: rotationEvents.length,
        },
        firstActivity: datedEvents[0],
        heightChange: seriesChange(heightSeries),
        heightMonthlyRate: monthlyRate(heightSeries),
        heightSeries,
        lastWater: watering.events.at(-1)?.event,
        latestActivity,
        latestCheck: newest(checkEvents, () => true),
        latestCondition,
        latestFlower: newest(flowerEvents, () => true),
        latestHeight,
        latestNutrients: newest(nutrientEvents, () => true),
        latestPest: newest(pestEvents, () => true),
        latestPhoto: newest(photoEvents, () => true),
        latestRepot: newest(repotEvents, () => true),
        latestRotation: newest(rotationEvents, () => true),
        latestWeight,
        latestWeightValue,
        latestWidth,
        observationSpanDays:
            datedEvents.length > 1
                ? daysBetween(
                      datedEvents[0]?.["Date"] ?? "",
                      datedEvents.at(-1)?.["Date"] ?? ""
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

/**
 * @param {unknown} value
 * @param {string} unit
 */
export function formatMeasurement(value, unit) {
    const number = numericValue(value);
    if (number === null) return "Not logged";
    // eslint-disable-next-line unicorn/prefer-number-is-safe-integer -- Display formatting checks for a fractional part, not arithmetic precision.
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
    const suffix = unit ? ` ${unit}` : "";
    return `${sign}${rounded}${suffix}`;
}

/** @param {string} labelId */
export function historyPageUrl(labelId) {
    return `./plant-history.html?id=${encodeURIComponent(labelId)}`;
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
    for (const event of observations) {
        const plantId = String(event["Plant ID"] ?? "");
        const plantEvents = eventsById.get(plantId) ?? [];
        plantEvents.push(event);
        eventsById.set(plantId, plantEvents);
    }

    return {
        history: observations,
        plants: plants.map((plant) => {
            const plantId = plant["Plant ID"] ?? "";
            const events = eventsById.get(plantId) ?? [];
            return {
                ...plant,
                "Current pot label": plant["Current pot label"] ?? "",
                "Est. time to dry": plant["Est. time to dry"] ?? "",
                events,
                "Plant / planter": plant["Plant / planter"] ?? "",
                "Plant ID": plantId,
                "Scientific name / contents":
                    plant["Scientific name / contents"] ?? "",
                summary: calculateSummary(events, plantId),
            };
        }),
    };
}

/** @param {PlantLabelRecord} plant */
export function plantLabel(plant) {
    return (plant["Current pot label"] ?? "") || (plant["Plant ID"] ?? "");
}

/**
 * Keep an appended correction in its original observation's order when dates
 * tie. Removed originals remain in the feed as lineage evidence. Broken,
 * duplicated, or cyclic identities retain their physical feed order.
 *
 * @param {HistoryEvent[]} events
 *
 * @returns {HistoryEvent[]}
 */
function historyCorrectionOrder(events) {
    /** @type {Map<string, HistoryEvent | null>} */
    const byId = new Map();
    for (const event of events) {
        const id = String(event["Observation ID"] ?? "").trim();
        if (id) byId.set(id, byId.has(id) ? null : event);
    }
    return events.map((event) => {
        let original = event;
        const visited = new Set([event]);
        for (;;) {
            const id = String(original["Corrects observation ID"] ?? "").trim();
            const { _index: originalIndex } = original;
            if (!id)
                return original === event
                    ? event
                    : { ...event, _index: originalIndex };
            const previous = byId.get(id);
            if (
                !previous ||
                isActiveHistoryEvent(previous) ||
                visited.has(previous) ||
                [
                    "Plant ID",
                    "Event",
                    "Pot setup",
                ].some(
                    (key) =>
                        String(previous[key] ?? "") !== String(event[key] ?? "")
                )
            )
                return event;
            visited.add(previous);
            original = previous;
        }
    });
}

/**
 * Derive weight states from completed watering cycles without rewriting the
 * append-only state stored in History. A weight captured with Water is Wet; if
 * there is no same-save weight, the first reading within five days is the Wet
 * anchor. The last non-Wet weight before the next watering closes that drying
 * cycle as Dry. Other readings remain Routine until a later watering proves
 * which one was actually the cycle endpoint.
 *
 * @param {HistoryEvent[]} activeEvents
 */
function weightCycleAnalytics(activeEvents) {
    const orderedEvents = sortEvents(activeEvents);
    const orderByEvent = new Map(
        orderedEvents.map((event, index) => [event, index])
    );
    const weights = orderedEvents.filter(
        (event) => (numericValue(event["Weight (g)"]) ?? 0) > 0
    );
    const waterEvents = orderedEvents.filter(
        (event) =>
            String(event["Event"] ?? "")
                .trim()
                .toLowerCase() === "water"
    );
    const stateByEvent = new Map(weights.map((event) => [event, "Routine"]));
    /** @type {HistoryEvent[]} */
    const wetAnchors = [];
    for (const [waterIndex, waterEvent] of waterEvents.entries()) {
        const waterOrder = orderByEvent.get(waterEvent) ?? -1;
        const nextWater = waterEvents[waterIndex + 1];
        const nextWaterOrder = nextWater
            ? (orderByEvent.get(nextWater) ?? Infinity)
            : Infinity;
        const sameSaveWeight = weights.findLast((weightEvent) =>
            observationsShareSave(weightEvent, waterEvent)
        );
        const waterDate = parseDate(waterEvent["Date"]);
        const firstPromptWeight = sameSaveWeight
            ? null
            : weights.find((weightEvent) => {
                  const weightOrder = orderByEvent.get(weightEvent) ?? -1;
                  const weightDate = parseDate(weightEvent["Date"]);
                  if (
                      !waterDate ||
                      !weightDate ||
                      weightOrder <= waterOrder ||
                      weightOrder >= nextWaterOrder
                  ) {
                      return false;
                  }
                  const elapsed = weightDate.getTime() - waterDate.getTime();
                  return elapsed >= 0 && elapsed <= WET_WEIGHT_WINDOW_MS;
              });
        const wetAnchor = sameSaveWeight ?? firstPromptWeight;
        if (wetAnchor && !wetAnchors.includes(wetAnchor)) {
            wetAnchors.push(wetAnchor);
            stateByEvent.set(wetAnchor, "Wet");
        }
    }

    /** @type {HistoryEvent[]} */
    const dryAnchors = [];
    let previousWaterOrder = -1;
    for (const waterEvent of waterEvents) {
        const waterOrder = orderByEvent.get(waterEvent) ?? -1;
        const cycleStartOrder = previousWaterOrder;
        const candidate = weights.findLast((weightEvent) => {
            const weightOrder = orderByEvent.get(weightEvent) ?? -1;
            return (
                weightOrder > cycleStartOrder &&
                weightOrder < waterOrder &&
                stateByEvent.get(weightEvent) !== "Wet" &&
                !observationsShareSave(weightEvent, waterEvent)
            );
        });
        if (candidate) {
            stateByEvent.set(candidate, "Dry");
            dryAnchors.push(candidate);
        }
        previousWaterOrder = waterOrder;
    }

    return { dryAnchors, stateByEvent, weights, wetAnchors };
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
    /** @type {[number, number, number]} */
    const green = [
        87,
        187,
        138,
    ];
    /** @type {[number, number, number]} */
    const yellow = [
        255,
        214,
        102,
    ];
    /** @type {[number, number, number]} */
    const red = [
        230,
        124,
        115,
    ];
    /**
     * @param {[number, number, number]} start
     * @param {[number, number, number]} end
     * @param {number} amount
     */
    const mix = (start, end, amount) => {
        /** @type {readonly [0, 1, 2]} */
        const channels = [
            0,
            1,
            2,
        ];
        return channels.map((index) =>
            Math.round(start[index] + (end[index] - start[index]) * amount)
        );
    };
    const clamped = Math.max(0, Math.min(28, days));
    const color =
        clamped <= 14
            ? mix(green, yellow, clamped / 14)
            : mix(yellow, red, (clamped - 14) / 14);
    return `rgb(${color.join(", ")})`;
}

/**
 * Format the existing sheet-value fallback consistently for text and numeric
 * cells.
 *
 * @param {string | number | null | undefined} value
 * @param {string} [fallback]
 */
export function displayValue(value, fallback = "") {
    const hasValue = Boolean(value);
    return hasValue ? String(value) : fallback;
}

/**
 * Resolve required page markup and check the actual DOM interface before use.
 *
 * @template {Element} T
 *
 * @param {string} selector
 * @param {new () => T} elementType
 *
 * @returns {T}
 */
export function getRequiredElement(selector, elementType) {
    const element = document.querySelector(selector);
    if (!(element instanceof elementType)) {
        throw new TypeError(`Missing or invalid page element: ${selector}`);
    }
    return element;
}

/** @param {HTMLButtonElement} button */
export function installThemeToggle(button) {
    const root = document.documentElement;
    const label = button.querySelector("[data-theme-label]");
    const update = () => {
        const isDark = root.dataset["theme"] === "dark";
        const text = isDark ? "Light mode" : "Dark mode";
        if (label) label.textContent = text;
        else button.textContent = text;
        button.setAttribute("aria-pressed", String(isDark));
    };
    function toggleTheme() {
        root.dataset["theme"] =
            root.dataset["theme"] === "dark" ? "light" : "dark";
        localStorage.setItem("gardening-site-theme", root.dataset["theme"]);
        update();
    }
    button.addEventListener("click", toggleTheme);
    update();
}

/**
 * @param {HistoryEvent[]} repotEvents
 * @param {string} plantId
 *
 * @returns {number | string}
 */
function currentPotSize(repotEvents, plantId) {
    const recordedSize = newest(
        repotEvents,
        (event) => String(event["Pot size"] ?? "").trim() !== ""
    )?.["Pot size"];
    const hasRecordedSize = Boolean(recordedSize);
    if (recordedSize !== undefined && hasRecordedSize) return recordedSize;
    return displayValue(initialPotSizeByPlant[plantId], "Not logged");
}

/** @param {PlantLabelRecord} plant */
function plantLabelSortParts(plant) {
    const label = (plantLabel(plant) || "").trim().toUpperCase();
    const match = /^(?<group>[#A-H])(?<number>[1-9]\d*)$/v.exec(label);
    const group = match?.groups?.["group"] ?? "";
    const groupIndex = LABEL_GROUP_ORDER.indexOf(group);
    return {
        groupIndex: groupIndex === -1 ? LABEL_GROUP_ORDER.length : groupIndex,
        id: plant["Plant ID"] ?? "",
        label,
        number: match
            ? Number(match.groups?.["number"])
            : Number.MAX_SAFE_INTEGER,
    };
}

/**
 * @param {number | null} capacity
 * @param {number | null} latestWeight
 * @param {number | null} dryAverage
 */
function remainingWaterFraction(capacity, latestWeight, dryAverage) {
    if (
        capacity === null ||
        latestWeight === null ||
        dryAverage === null ||
        capacity <= 0
    )
        return null;
    return Math.max(0, Math.min(1, (latestWeight - dryAverage) / capacity));
}

/**
 * @param {number} weightCount
 * @param {number} wetCount
 * @param {number} dryCount
 * @param {number | null} capacity
 */
function weightBaselineStatus(weightCount, wetCount, dryCount, capacity) {
    if (weightCount === 0) return "Needs dry + wet weights";
    if (wetCount === 0) return "Needs a wet weight";
    if (dryCount === 0) return "Needs a completed dry cycle";
    return capacity !== null && capacity > 0 ? "Ready" : "Check baseline";
}
