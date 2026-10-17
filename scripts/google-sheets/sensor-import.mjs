/* eslint unicorn/prefer-temporal: "off" -- Browser consumers must not require Temporal; UTC Date and Intl suffice. */
/**
 * Pure AeroLab export parsing and overlap planning. No filesystem, network, or
 * browser-local timezone dependencies. Source rows refer to CSV record
 * numbers.
 *
 * @typedef {import("../../types/sensor-import.d.ts").SensorReading} SensorReading
 *
 * @typedef {import("../../types/sensor-import.d.ts").SensorMetrics} SensorMetrics
 */

const hourMilliseconds = 3_600_000;

/**
 * Invalid data rows are reported in issues; callers must review issues before
 * persisting any result. Structural CSV/schema errors reject the entire input.
 *
 * @param {string} csv
 * @param {import("../../types/sensor-import.d.ts").SensorParseOptions} options
 *
 * @returns {import("../../types/sensor-import.d.ts").SensorParseResult}
 */
export function parseAeroLabCsv(csv, { sensorId, timeZone }) {
    validateSensorId(sensorId);
    const resolveTime = createTimeResolver(timeZone);
    const [sourceHeaders = [], ...records] = tokenizeCsv(csv);
    const [builtInUnit, probeUnit] = validateHeaders(sourceHeaders);
    /** @type {import("../../types/sensor-import.d.ts").SensorParseResult} */
    const result = {
        format: "aerolab-csv",
        issues: [],
        readings: [],
        skippedEmptyRows: 0,
        sourceHeaders,
    };
    for (const [index, row] of records.entries()) {
        if (row.length === 1 && row[0] === "") {
            result.skippedEmptyRows += 1;
            continue;
        }
        const sourceRow = index + 2;
        if (row.length !== 7)
            throw new Error(
                `CSV record ${sourceRow} has ${row.length} columns; expected 7.`
            );
        try {
            const builtIn = metrics(row, 1, builtInUnit);
            const probe = metrics(row, 4, probeUnit);
            const rawTimestamp = row[0] ?? "";
            const observedAt = resolveTime(rawTimestamp);
            if (
                [builtIn, probe].every(
                    (item) =>
                        item.temperature === null &&
                        item.humidity === null &&
                        item.vpd === null
                )
            ) {
                result.skippedEmptyRows += 1;
            } else
                result.readings.push({
                    builtIn,
                    key: `${sensorId}|${observedAt}`,
                    observedAt,
                    probe,
                    rawTimestamp,
                    sensorId,
                    sourceRow,
                    timeZone,
                });
        } catch (error) {
            result.issues.push({
                message: errorMessage(error),
                row: sourceRow,
            });
        }
    }
    return result;
}

/**
 * Conflicting keys are quarantined as a group, preserving original evidence.
 * Neither input is modified. Existing readings are never overwritten.
 *
 * @param {readonly SensorReading[]} incomingReadings
 * @param {readonly SensorReading[]} existingReadings
 *
 * @returns {import("../../types/sensor-import.d.ts").SensorImportPlan}
 */
export function planSensorImport(incomingReadings, existingReadings = []) {
    /**
     * @type {Map<
     *     string,
     *     { incoming: SensorReading[]; existing: SensorReading[] }
     * >}
     */
    const groups = new Map();
    /**
     * @param {readonly SensorReading[]} readings @param {"incoming" |
     *   "existing"} kind
     */
    function group(readings, kind) {
        for (const reading of readings) {
            validateSensorId(reading.sensorId);
            const key = `${reading.sensorId}|${reading.observedAt}`;
            if (
                reading.key !== key ||
                !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/v.test(
                    reading.observedAt
                ) ||
                isoTimestamp(Date.parse(reading.observedAt)) !==
                    reading.observedAt
            )
                throw new Error(
                    "Reading identity must contain its sensor ID and canonical UTC instant."
                );
            const entry = groups.get(key) ?? { existing: [], incoming: [] };
            entry[kind].push(reading);
            groups.set(key, entry);
        }
    }
    group(existingReadings, "existing");
    group(incomingReadings, "incoming");
    /** @type {import("../../types/sensor-import.d.ts").SensorImportPlan} */
    const result = { additions: [], conflicts: [], duplicates: [] };
    for (const [key, entry] of groups) {
        const reference = entry.existing[0] ?? entry.incoming[0];
        if (!reference || entry.incoming.length === 0) continue;
        const all = [...entry.existing, ...entry.incoming];
        if (
            all.some((reading) => !hasSamePayload(reference, reading)) ||
            !hasConsistentOriginalTemperatures(all)
        ) {
            result.conflicts.push({ key, ...entry });
        } else {
            const first = entry.incoming[0];
            if (first && entry.existing.length === 0)
                result.additions.push(first);
            const duplicates =
                entry.existing.length === 0
                    ? entry.incoming.slice(1)
                    : entry.incoming;
            for (const reading of duplicates) {
                result.duplicates.push({
                    existing: reference,
                    incoming: reading,
                    key,
                });
            }
        }
    }
    return result;
}

/** @param {string} raw */
function calendarTime(raw) {
    const match =
        /^(?<year>\d{4})\/(?<month>\d{2})\/(?<day>\d{2}) (?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})$/v.exec(
            raw
        );
    if (!match) throw new Error("Timestamp must use YYYY/MM/DD HH:mm:ss.");
    const parts = match.slice(1).map(Number);
    const milliseconds = utcMilliseconds(parts);
    const date = new Date(milliseconds);
    const actual = [
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
    ];
    if (parts[0] === 0 || parts.some((part, index) => part !== actual[index]))
        throw new Error("Timestamp contains an invalid calendar date or time.");
    return milliseconds;
}

/**
 * Candidate offsets are shared per local calendar day. Every candidate instant
 * must round-trip through Intl; DST folds and gaps never get a guessed offset.
 *
 * @param {string} timeZone
 */
function createTimeResolver(timeZone) {
    if (
        typeof timeZone !== "string" ||
        timeZone === "" ||
        timeZone.trim() !== timeZone ||
        /^[+\-]/v.test(timeZone)
    )
        throw new Error("An explicit IANA timeZone is required.");
    /** @type {Intl.DateTimeFormat} */
    let formatter;
    try {
        formatter = new Intl.DateTimeFormat("en-CA", {
            day: "2-digit",
            hour: "2-digit",
            hourCycle: "h23",
            minute: "2-digit",
            month: "2-digit",
            second: "2-digit",
            timeZone,
            year: "numeric",
        });
    } catch {
        throw new Error("An explicit valid IANA timeZone is required.");
    }
    /** @param {number} instant */
    function wallTime(instant) {
        const parts = new Map(
            formatter
                .formatToParts(instant)
                .map((part) => [part.type, part.value])
        );
        return utcMilliseconds(
            [
                "year",
                "month",
                "day",
                "hour",
                "minute",
                "second",
            ].map((part) =>
                Number(
                    parts.get(
                        /** @type {Intl.DateTimeFormatPartTypes} */ (part)
                    )
                )
            )
        );
    }
    /** @type {Map<string, number[]>} */
    const offsetsByDay = new Map();
    /** @param {string} raw */
    return (raw) => {
        const wall = calendarTime(raw);
        const day = raw.slice(0, 10);
        let offsets = offsetsByDay.get(day);
        if (!offsets) {
            const midnight = calendarTime(`${day} 00:00:00`);
            offsets = [
                ...new Set(
                    [
                        -36,
                        -24,
                        -12,
                        0,
                        12,
                        24,
                        36,
                    ].map((hours) => {
                        const instant = midnight + hours * hourMilliseconds;
                        return wallTime(instant) - instant;
                    })
                ),
            ];
            offsetsByDay.set(day, offsets);
        }
        const candidates = offsets
            .map((offset) => wall - offset)
            .filter((instant) => wallTime(instant) === wall);
        if (candidates.length === 0)
            throw new Error(
                `Timestamp does not exist in ${timeZone} because of a clock change.`
            );
        if (candidates.length > 1)
            throw new Error(
                `Timestamp is ambiguous in ${timeZone} because of a clock change.`
            );
        return isoTimestamp(candidates[0] ?? NaN);
    };
}

/** @param {string} value @param {string} label @returns {number | null} */
function decimal(value, label) {
    const text = value.trim();
    if (text === "" || text === "-") return null;
    if (!/^[\d+\-.e]+$/iv.test(text) || !Number.isFinite(Number(text))) {
        throw new Error(`${label} must be a finite decimal or missing.`);
    }
    return Number(text);
}

/** @param {unknown} error */
function errorMessage(error) {
    if (typeof error === "object" && error !== null && "message" in error)
        return String(error.message);
    return String(error);
}

/** @param {SensorReading[]} readings */
function hasConsistentOriginalTemperatures(readings) {
    /** @type {Map<string, number | null>} */
    const originals = new Map();
    for (const reading of readings) {
        for (const side of /** @type {const} */ (["builtIn", "probe"])) {
            const value = reading[side];
            const key = `${side}:${value.temperatureUnit}`;
            if (originals.has(key) && originals.get(key) !== value.temperature)
                return false;
            originals.set(key, value.temperature);
        }
    }
    return true;
}

/** @param {SensorReading} left @param {SensorReading} right */
function hasSamePayload(left, right) {
    return /** @type {const} */ (["builtIn", "probe"]).every(
        (side) =>
            hasSameTemperature(left[side], right[side]) &&
            left[side].humidity === right[side].humidity &&
            left[side].vpd === right[side].vpd
    );
}

/** @param {SensorMetrics} left @param {SensorMetrics} right */
function hasSameTemperature(left, right) {
    if (left.temperature === null || right.temperature === null)
        return left.temperature === right.temperature;
    if (left.temperatureUnit === right.temperatureUnit)
        return left.temperature === right.temperature;
    if (left.temperatureC === null || right.temperatureC === null) return false;
    const fahrenheit =
        left.temperatureUnit === "F" ? left.temperature : right.temperature;
    // Allow input representation error and the conversion arithmetic. The
    // original Fahrenheit scale matters near 32 F, where subtraction loses
    // precision relative to the tiny Celsius result. Scale epsilon first to
    // avoid overflow for finite readings; same-unit values remain exact.
    const inputAllowance = ((Number.EPSILON * Math.abs(fahrenheit)) / 9) * 5;
    const conversionAllowance =
        Number.EPSILON *
        Math.max(Math.abs(left.temperatureC), Math.abs(right.temperatureC)) *
        4;
    return (
        Math.abs(left.temperatureC - right.temperatureC) <=
        inputAllowance + conversionAllowance
    );
}

/** @param {number} instant */
function isoTimestamp(instant) {
    const date = new Date(instant);
    return date.toISOString();
}

/**
 * @param {string[]} row @param {number} offset @param {"C" | "F"} unit @returns
 *   {SensorMetrics}
 */
function metrics(row, offset, unit) {
    const temperature = decimal(row[offset] ?? "", "Temperature");
    const humidity = decimal(row[offset + 1] ?? "", "Humidity");
    const vpd = decimal(row[offset + 2] ?? "", "VPD");
    const temperatureC = normalizeTemperature(temperature, unit);
    const minimum = unit === "C" ? -273.15 : -459.67;
    if (temperature !== null && temperature < minimum)
        throw new Error("Temperature must be at or above absolute zero.");
    if (humidity !== null && (humidity < 0 || humidity > 100))
        throw new Error("Humidity must be between 0 and 100 percent.");
    if (vpd !== null && vpd < 0) throw new Error("VPD must be nonnegative.");
    return { humidity, temperature, temperatureC, temperatureUnit: unit, vpd };
}

/** @param {number | null} temperature @param {"C" | "F"} unit */
function normalizeTemperature(temperature, unit) {
    if (temperature === null || unit === "C") return temperature;
    const converted = ((temperature - 32) * 5) / 9;
    return Number.isFinite(converted)
        ? converted
        : ((temperature - 32) / 9) * 5;
}

/** @param {string} header @param {string} prefix @returns {"C" | "F"} */
function temperatureUnit(header, prefix) {
    const expected = `${prefix} Temperature`;
    if (
        [
            `${expected}(°F)`,
            `${expected}(℉)`,
            `${expected}(F)`,
        ].includes(header)
    )
        return "F";
    if (
        [
            `${expected}(°C)`,
            `${expected}(℃)`,
            `${expected}(C)`,
        ].includes(header)
    )
        return "C";
    throw new Error(`Unsupported AeroLab temperature header: ${header}`);
}

/**
 * Reject malformed quoting rather than silently shifting measurement columns.
 *
 * @param {string} csv
 *
 * @returns {string[][]}
 */
function tokenizeCsv(csv) {
    const text = csv.codePointAt(0) === 0xfe_ff ? csv.slice(1) : csv;
    /** @type {string[][]} */
    const records = [];
    /** @type {string[]} */
    let record = [];
    let field = "";
    let isQuoted = false;
    let isClosed = false;
    for (let index = 0; index < text.length; index += 1) {
        const character = text.charAt(index);
        if (isQuoted) {
            if (character !== '"') field += character;
            else if (text[index + 1] === '"') {
                field += '"';
                index += 1;
            } else {
                isQuoted = false;
                isClosed = true;
            }
            continue;
        }
        if (
            [
                "\n",
                "\r",
                ",",
            ].includes(character)
        ) {
            record.push(field);
            field = "";
            isClosed = false;
            if (character === "\r" && text[index + 1] === "\n") index += 1;
            if (character !== ",") {
                records.push(record);
                record = [];
            }
        } else if (character === '"' && field === "" && !isClosed)
            isQuoted = true;
        else {
            if (isClosed || character === '"')
                throw new Error(
                    `Malformed CSV quoting in record ${records.length + 1}.`
                );
            field += character;
        }
    }
    if (isQuoted)
        throw new Error(`Unclosed CSV quote in record ${records.length + 1}.`);
    if (field !== "" || isClosed || record.length > 0)
        records.push([...record, field]);
    return records;
}

/** @param {number[]} parts */
function utcMilliseconds(parts) {
    const [
        year = 0,
        month = 1,
        day = 1,
        hour = 0,
        minute = 0,
        second = 0,
    ] = parts;
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(hour, minute, second, 0);
    return date.getTime();
}

/** @param {string[]} headers @returns {["C" | "F", "C" | "F"]} */
function validateHeaders(headers) {
    if (
        headers.length !== 7 ||
        headers[0] !== "Timestamp(1 min)" ||
        headers[2] !== "Built-in Humidity(%)" ||
        headers[3] !== "Built-in VPD(kPa)" ||
        headers[5] !== "Probe Humidity(%)" ||
        headers[6] !== "Probe VPD(kPa)"
    ) {
        throw new Error(
            "Unsupported AeroLab CSV schema: expected the seven timestamp, built-in and probe columns in export order."
        );
    }
    return [
        temperatureUnit(headers[1] ?? "", "Built-in"),
        temperatureUnit(headers[4] ?? "", "Probe"),
    ];
}

/** @param {string} sensorId */
function validateSensorId(sensorId) {
    if (
        typeof sensorId !== "string" ||
        !/^[0-9A-Za-z][\w\-.]{0,127}$/v.test(sensorId)
    ) {
        throw new Error(
            "sensorId must be a permanent safe identifier of 1–128 letters, digits, dots, underscores or hyphens."
        );
    }
}
