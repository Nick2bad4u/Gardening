/* eslint unicorn/prefer-temporal: "off" -- Browser consumers must not require Temporal; UTC Date suffices. */
import { planSensorImport } from "./sensor-import.mjs";

/** @typedef {import("../../types/sensor-import.d.ts").SensorReading} SensorReading */

/**
 * Aggregate unique raw observations into fixed UTC hours. Clock changes retain
 * separate repeated civil hours; missing hours and missing values stay absent.
 * Any conflicting observation key rejects the entire aggregation.
 *
 * @param {readonly SensorReading[]} readings
 *
 * @returns {import("../../types/sensor-hourly.d.ts").SensorHourSummary[]}
 */
export function aggregateSensorHours(readings) {
    // Prefer Celsius evidence when equivalent C/F representations share a key.
    // Sorting before deduplication also makes the retained numeric representation
    // and summation order independent of input file and row order.
    const sorted = readings.toSorted(
        (left, right) =>
            compareText(left.sensorId, right.sensorId) ||
            compareText(left.observedAt, right.observedAt) ||
            compareText(
                left.builtIn.temperatureUnit,
                right.builtIn.temperatureUnit
            ) ||
            compareText(left.probe.temperatureUnit, right.probe.temperatureUnit)
    );
    const plan = planSensorImport(sorted);
    if (plan.conflicts.length > 0)
        throw new Error(
            `Cannot aggregate conflicting sensor readings: ${plan.conflicts.length} conflicting key(s).`
        );
    /** @type {Map<string, SensorReading[]>} */
    const hours = new Map();
    for (const reading of plan.additions) {
        const key = `${reading.sensorId}|${reading.observedAt.slice(0, 13)}`;
        const samples = hours.get(key) ?? [];
        samples.push(reading);
        hours.set(key, samples);
    }
    return Array.from(hours.values(), (samples) => summarizeHour(samples));
}

/** @param {string} left @param {string} right */
function compareText(left, right) {
    return left.localeCompare(right, "en");
}

/**
 * @param {SensorReading[]} samples @param {"builtIn" | "probe"} side @returns
 *   {import("../../types/sensor-hourly.d.ts").SensorChannelSummary}
 */
function summarizeChannel(samples, side) {
    return {
        humidity: summarizeMetric(
            samples.map((sample) => sample[side].humidity)
        ),
        temperatureC: summarizeMetric(
            samples.map((sample) => sample[side].temperatureC)
        ),
        vpd: summarizeMetric(samples.map((sample) => sample[side].vpd)),
    };
}

/**
 * @param {SensorReading[]} samples @returns
 *   {import("../../types/sensor-hourly.d.ts").SensorHourSummary}
 */
function summarizeHour(samples) {
    const first = samples[0];
    const last = samples.at(-1);
    if (!first || !last)
        throw new Error("Cannot summarize an empty sensor hour.");
    const hourStartUtc = `${first.observedAt.slice(0, 13)}:00:00.000Z`;
    const hourEnd = new Date(Date.parse(hourStartUtc) + 3_600_000);
    return {
        builtIn: summarizeChannel(samples, "builtIn"),
        firstObservedAt: first.observedAt,
        hourEndUtc: hourEnd.toISOString(),
        hourStartUtc,
        key: `${first.sensorId}|${hourStartUtc}`,
        lastObservedAt: last.observedAt,
        probe: summarizeChannel(samples, "probe"),
        sampleCount: samples.length,
        sensorId: first.sensorId,
    };
}

/**
 * Scale before summing, then compensate floating-point addition error. This
 * avoids overflowing either a raw sum or an incremental mean's subtraction.
 * Each bucket is processed in canonical observation order.
 *
 * @param {(number | null)[]} samples
 *
 * @returns {import("../../types/sensor-hourly.d.ts").SensorMetricSummary}
 */
function summarizeMetric(samples) {
    const values = samples.filter((value) => value !== null);
    if (values.length === 0)
        return { count: 0, max: null, mean: null, min: null };
    let minimum = Infinity;
    let maximum = -Infinity;
    let scale = 0;
    for (const value of values) {
        if (!Number.isFinite(value))
            throw new Error(
                "Sensor summary samples must be finite numbers or null."
            );
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
        scale = Math.max(scale, Math.abs(value));
    }
    let sum = 0;
    let compensation = 0;
    if (scale !== 0) {
        for (const value of values) {
            const adjusted = value / scale - compensation;
            const next = sum + adjusted;
            compensation = next - sum - adjusted;
            sum = next;
        }
    }
    const mean = Math.max(-1, Math.min(1, sum / values.length)) * scale;
    return { count: values.length, max: maximum, mean, min: minimum };
}
