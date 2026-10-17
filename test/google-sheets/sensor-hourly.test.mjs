import { describe, expect, it } from "vitest";

import { aggregateSensorHours } from "../../scripts/google-sheets/sensor-hourly.mjs";
import { parseAeroLabCsv } from "../../scripts/google-sheets/sensor-import.mjs";

const headers =
    "Timestamp(1 min),Built-in Temperature(℃),Built-in Humidity(%),Built-in VPD(kPa),Probe Temperature(℃),Probe Humidity(%),Probe VPD(kPa)";

/** @param {string[]} rows @param {string} [sensorId] */
function readings(rows, sensorId = "vivosun-th1gs-main") {
    return parseAeroLabCsv([headers, ...rows].join("\n"), {
        sensorId,
        timeZone: "UTC",
    }).readings;
}

const first = "2026/10/16 12:10:00,10,20,1,30,40,2";
const second = "2026/10/16 12:20:00,20,40,3,50,60,4";
const third = "2026/10/16 12:30:00,30,60,5,70,80,6";

describe("hourly sensor summaries", () => {
    it("summarizes all six metrics independently from unique raw samples", () => {
        expect.hasAssertions();

        const result = aggregateSensorHours(
            readings([
                first,
                second,
                third,
            ])
        );

        expect(result).toStrictEqual([
            {
                builtIn: {
                    humidity: { count: 3, max: 60, mean: 40, min: 20 },
                    temperatureC: { count: 3, max: 30, mean: 20, min: 10 },
                    vpd: { count: 3, max: 5, mean: 3, min: 1 },
                },
                firstObservedAt: "2026-10-16T12:10:00.000Z",
                hourEndUtc: "2026-10-16T13:00:00.000Z",
                hourStartUtc: "2026-10-16T12:00:00.000Z",
                key: "vivosun-th1gs-main|2026-10-16T12:00:00.000Z",
                lastObservedAt: "2026-10-16T12:30:00.000Z",
                probe: {
                    humidity: { count: 3, max: 80, mean: 60, min: 40 },
                    temperatureC: { count: 3, max: 70, mean: 50, min: 30 },
                    vpd: { count: 3, max: 6, mean: 4, min: 2 },
                },
                sampleCount: 3,
                sensorId: "vivosun-th1gs-main",
            },
        ]);
    });

    it("is unchanged by repeated rows, full reimport and reordered input", () => {
        expect.hasAssertions();

        const original = readings([
            first,
            second,
            third,
        ]);
        const repeated = [
            ...original.toReversed(),
            ...original,
            ...original,
        ];
        const before = JSON.stringify(repeated);

        expect(aggregateSensorHours(repeated)).toStrictEqual(
            aggregateSensorHours(original)
        );
        expect(JSON.stringify(repeated)).toBe(before);
    });

    it("merges overlapping arbitrary raw export ranges without averaging chunk means", () => {
        expect.hasAssertions();

        const chunkA = readings(["2026/10/16 12:00:00,0,0,0,-,-,-"]);
        const chunkB = readings([
            "2026/10/16 12:01:00,100,0,0,-,-,-",
            "2026/10/16 12:02:00,100,0,0,-,-,-",
            "2026/10/16 12:03:00,100,0,0,-,-,-",
        ]);
        const merged = aggregateSensorHours([
            ...chunkB.slice(1),
            ...chunkA,
            ...chunkB,
        ]);

        expect(merged[0]?.sampleCount).toBe(4);
        expect(merged[0]?.builtIn.temperatureC.mean).toBe(75);
        expect(merged).toStrictEqual(
            aggregateSensorHours([...chunkA, ...chunkB])
        );
    });

    it("keeps missing metrics separate from zero, negative Celsius and channel counts", () => {
        expect.hasAssertions();

        const samples = readings([
            "2026/10/16 12:00:00,-10,0,-,-,-,-",
            "2026/10/16 12:01:00,0,-,0,0,50,-",
            "2026/10/16 12:02:00,-,100,-,-,-,-",
        ]);
        const result = aggregateSensorHours(samples);

        expect(result[0]?.sampleCount).toBe(3);
        expect(result[0]?.builtIn).toStrictEqual({
            humidity: { count: 2, max: 100, mean: 50, min: 0 },
            temperatureC: { count: 2, max: 0, mean: -5, min: -10 },
            vpd: { count: 1, max: 0, mean: 0, min: 0 },
        });
        expect(result[0]?.probe).toStrictEqual({
            humidity: { count: 1, max: 50, mean: 50, min: 50 },
            temperatureC: { count: 1, max: 0, mean: 0, min: 0 },
            vpd: { count: 0, max: null, mean: null, min: null },
        });
    });

    it("retains partial hours, omits empty gaps and separates physical devices", () => {
        expect.hasAssertions();

        const samples = [
            ...readings(["2026/10/16 14:59:00,10,20,1,30,40,2", first]),
            ...readings([first], "a22-next"),
        ];
        const result = aggregateSensorHours(samples);

        expect(
            result.map((hour) => [
                hour.sensorId,
                hour.hourStartUtc,
                hour.sampleCount,
            ])
        ).toStrictEqual([
            [
                "a22-next",
                "2026-10-16T12:00:00.000Z",
                1,
            ],
            [
                "vivosun-th1gs-main",
                "2026-10-16T12:00:00.000Z",
                1,
            ],
            [
                "vivosun-th1gs-main",
                "2026-10-16T14:00:00.000Z",
                1,
            ],
        ]);
        expect(aggregateSensorHours([])).toStrictEqual([]);
    });

    it("rejects a conflict before returning any partial summaries", () => {
        expect.hasAssertions();

        const samples = readings([
            first,
            "2026/10/16 12:10:00,11,20,1,30,40,2",
            "2026/10/16 15:00:00,10,20,1,30,40,2",
        ]);

        expect(() => aggregateSensorHours(samples)).toThrow(
            "Cannot aggregate conflicting sensor readings: 1 conflicting key(s)."
        );
    });

    it("keeps repeated Eastern civil hours in separate fixed UTC buckets", () => {
        expect.hasAssertions();

        const samples = readings([
            "2026/11/01 05:30:00,10,20,1,30,40,2",
            "2026/11/01 06:30:00,20,40,3,50,60,4",
        ]);
        const resolved = samples.map((sample) => ({
            ...sample,
            rawTimestamp: "2026/11/01 01:30:00",
            timeZone: "America/New_York",
        }));
        const result = aggregateSensorHours(resolved);

        expect(
            result.map((hour) => [
                hour.hourStartUtc,
                hour.hourEndUtc,
                hour.sampleCount,
            ])
        ).toStrictEqual([
            [
                "2026-11-01T05:00:00.000Z",
                "2026-11-01T06:00:00.000Z",
                1,
            ],
            [
                "2026-11-01T06:00:00.000Z",
                "2026-11-01T07:00:00.000Z",
                1,
            ],
        ]);
    });

    it("places an exact boundary in the next hour and handles midnight rollover", () => {
        expect.hasAssertions();

        const samples = readings([
            "2026/12/31 23:59:59,10,20,1,30,40,2",
            "2027/01/01 00:00:00,20,40,3,50,60,4",
        ]);
        const result = aggregateSensorHours(samples);

        expect(
            result.map((hour) => [hour.hourStartUtc, hour.hourEndUtc])
        ).toStrictEqual([
            ["2026-12-31T23:00:00.000Z", "2027-01-01T00:00:00.000Z"],
            ["2027-01-01T00:00:00.000Z", "2027-01-01T01:00:00.000Z"],
        ]);
    });

    it("does not overflow when the unscaled sum exceeds the largest finite number", () => {
        expect.hasAssertions();

        const samples = readings([
            "2026/10/16 12:00:00,1.7976931348623157e308,0,1.7976931348623157e308,-,-,-",
            "2026/10/16 12:01:00,1.7976931348623157e308,0,1.7976931348623157e308,-,-,-",
        ]);
        const result = aggregateSensorHours(samples);

        expect(result[0]?.builtIn.temperatureC.mean).toBe(Number.MAX_VALUE);
        expect(result[0]?.builtIn.vpd.mean).toBe(Number.MAX_VALUE);
        expect(result[0]?.builtIn.temperatureC.count).toBe(2);
    });

    it("keeps means finite across extreme magnitudes without changing source values", () => {
        expect.hasAssertions();

        const samples = readings([
            "2026/10/16 12:00:00,-273.15,0,0,-,-,-",
            "2026/10/16 12:01:00,1e308,100,1e308,-,-,-",
        ]);
        const result = aggregateSensorHours(samples);

        expect(result[0]?.builtIn.temperatureC.mean).toBe(5e307);
        expect(result[0]?.builtIn.temperatureC.min).toBe(-273.15);
        expect(result[0]?.builtIn.temperatureC.max).toBe(1e308);
        expect(result[0]?.builtIn.humidity.mean).toBe(50);
    });

    it("chooses the same equivalent C/F representative regardless of export ordering", () => {
        expect.hasAssertions();

        const celsius = readings(["2026/10/16 12:00:00,0.05,50,0,25,40,0"]);
        const fahrenheit = parseAeroLabCsv(
            `${headers.replaceAll("℃", "℉")}\n2026/10/16 12:00:00,32.09,50,0,77,40,0`,
            { sensorId: "vivosun-th1gs-main", timeZone: "UTC" }
        ).readings;
        const forward = aggregateSensorHours([...celsius, ...fahrenheit]);
        const reverse = aggregateSensorHours([...fahrenheit, ...celsius]);

        expect(forward).toStrictEqual(reverse);
        expect(forward[0]?.builtIn.temperatureC.mean).toBe(0.05);
        expect(forward[0]?.sampleCount).toBe(1);
    });

    it("rejects nonfinite metrics supplied outside the CSV parser", () => {
        expect.hasAssertions();

        const samples = readings([first]).map((sample) => ({
            ...sample,
            builtIn: { ...sample.builtIn, humidity: Infinity },
        }));

        expect(() => aggregateSensorHours(samples)).toThrow(
            "Sensor summary samples must be finite numbers or null."
        );
    });
});
