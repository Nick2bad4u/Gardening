import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

import { appsScriptApi } from "../helpers/apps-script-api.mjs";
import { required } from "../helpers/required.mjs";

const sourceUrl = new URL(
    "../../scripts/google-sheets/plant-tracker.gs",
    import.meta.url
);
const source = readFileSync(sourceUrl, "utf8");

/** @param {Record<string, unknown>} [overrides] */
function calculated(overrides = {}) {
    return {
        leafAirTemperature: 25,
        leafAirTemperatureUnit: "C",
        leafHumidity: 50,
        leafTemperature: 20,
        leafTemperatureUnit: "C",
        leafVpdSource: "Calculated",
        ...overrides,
    };
}

/**
 * @param {ReturnType<typeof server>} api
 * @param {Record<string, unknown>} payload
 * @param {string[]} [events]
 */
function rows(api, payload, events = ["Leaf VPD"]) {
    const stored = api.storedObservationRows_(
        {
            condition: "",
            currentLabel: "Test planter",
            details: api.eventDetailsFromPayload_(payload, events, null),
            entrySource: "Mobile logger",
            eventNames: events,
            height: "",
            notes: "Synthetic Leaf VPD fixture",
            observationDate: new Date("2026-10-17T12:00:00Z"),
            plantId: "P01",
            potSetup: 1,
            requestId: "leaf-vpd-fixture",
            weight: "",
            weightState: "",
            width: "",
        },
        "leaf-vpd-fixture",
        2,
        new Date("2026-10-17T12:01:00Z")
    );
    return Array.from(stored, (row) => Array.from(row));
}

function server() {
    const context = vm.createContext({ Date, Map, Object, Set });
    vm.runInContext(source, context, { filename: fileURLToPath(sourceUrl) });
    return appsScriptApi(context);
}

describe("leaf VPD scientific calculation and independent context", () => {
    it.each([
        { air: 25, expected: 1.5839, humidity: 50, leaf: 25 },
        { air: 25, expected: 0.7544, humidity: 50, leaf: 20 },
        { air: 30, expected: -2.1134, humidity: 90, leaf: 15 },
        { air: 0, expected: 0.6108, humidity: 0, leaf: 0 },
        { air: 0, expected: 0, humidity: 100, leaf: 0 },
        { air: 5, expected: -0.5866, humidity: 100, leaf: -10 },
        { air: 100, expected: 102.2157, humidity: 0, leaf: 100 },
        { air: -50, expected: 0.0061, humidity: 0, leaf: -50 },
    ])(
        "calculates $expected kPa for leaf $leaf °C, air $air °C and $humidity% RH",
        ({ air, expected, humidity, leaf }) => {
            expect.hasAssertions();

            const result = server().eventDetailsFromPayload_(
                calculated({
                    leafAirTemperature: air,
                    leafHumidity: humidity,
                    leafTemperature: leaf,
                }),
                ["Leaf VPD"],
                null
            );

            // Fixed expected values keep the oracle independent of server helpers.
            expect(result).toMatchObject({
                leafAirTemperatureC: air,
                leafHumidity: humidity,
                leafTemperatureC: leaf,
                leafVpd: expected,
                leafVpdSource: "Calculated",
            });
        }
    );

    it("converts each entered unit separately and stores canonical Celsius with original units", () => {
        expect.hasAssertions();

        const api = server();
        const row = required(
            rows(
                api,
                calculated({
                    leafAirTemperature: "77",
                    leafAirTemperatureUnit: "F",
                    leafTemperature: "68",
                    leafTemperatureUnit: "F",
                })
            )[0]
        );

        expect(row).toHaveLength(67);
        expect(row.slice(60)).toStrictEqual([
            20,
            "F",
            25,
            "F",
            50,
            0.7544,
            "Calculated",
        ]);
        expect(row[28]).toBe("Estimated");
        expect(row[34]).toBe("Leaf temperature + air/RH");
        expect(
            api.eventDetailsFromPayload_(
                calculated({
                    leafAirTemperature: 0,
                    leafHumidity: 0,
                    leafTemperature: 32,
                    leafTemperatureUnit: "F",
                }),
                ["Leaf VPD"],
                null
            )
        ).toMatchObject({
            leafAirTemperatureC: 0,
            leafAirTemperatureUnit: "C",
            leafTemperatureC: 0,
            leafTemperatureUnit: "F",
            leafVpd: 0.6108,
        });
    });

    it("records an unpaired leaf reading without borrowing separate Temperature or Humidity values", () => {
        expect.hasAssertions();

        const api = server();
        const result = rows(
            api,
            {
                leafTemperature: 0,
                leafTemperatureUnit: "C",
                relativeHumidity: 50,
                temperature: 25,
                temperatureTarget: "Air",
                temperatureUnit: "C",
            },
            [
                "Leaf VPD",
                "Temperature",
                "Humidity",
            ]
        );
        const leaf = required(result[0]);
        const temperature = required(result[1]);
        const humidity = required(result[2]);

        expect(leaf.slice(60)).toStrictEqual([
            0,
            "C",
            "",
            "",
            "",
            "",
            "Not calculated",
        ]);
        expect(leaf[28]).toBe("Measured");
        expect(leaf[34]).toBe("IR thermometer");
        expect(leaf[42]).toBe("");
        expect(leaf[50]).toBe("");
        expect(temperature.slice(50, 53)).toStrictEqual([
            25,
            "Air",
            "C",
        ]);
        expect(humidity[42]).toBe(50);

        for (const row of [temperature, humidity]) {
            expect(row).toHaveLength(67);
            expect(row.slice(60)).toStrictEqual(
                Array.from({ length: 7 }, () => "")
            );
        }
    });

    it("isolates a paired calculation from differing independent environment readings", () => {
        expect.hasAssertions();

        const result = rows(
            server(),
            calculated({
                relativeHumidity: 1,
                temperature: 80,
                temperatureTarget: "Soil",
                temperatureUnit: "C",
            }),
            [
                "Leaf VPD",
                "Temperature",
                "Humidity",
            ]
        );

        expect(required(result[0]).slice(60)).toStrictEqual([
            20,
            "C",
            25,
            "C",
            50,
            0.7544,
            "Calculated",
        ]);
        expect(required(result[1]).slice(50, 53)).toStrictEqual([
            80,
            "Soil",
            "C",
        ]);
        expect(required(result[2])[42]).toBe(1);
    });

    it("ignores stale hidden Leaf VPD inputs when that event is not selected", () => {
        expect.hasAssertions();

        const result = rows(
            server(),
            {
                leafTemperature: "invalid",
                leafVpdSource: "unknown",
            },
            ["Note"]
        );

        expect(required(result[0]).slice(60)).toStrictEqual(
            Array.from({ length: 7 }, () => "")
        );
    });
});

describe("leaf VPD device evidence and validation", () => {
    it.each([0, 1.23456])(
        "preserves device reading %s without requiring a temperature",
        (reading) => {
            expect.hasAssertions();

            const row = required(
                rows(server(), { leafVpd: reading, leafVpdSource: "Device" })[0]
            );

            expect(row.slice(60)).toStrictEqual([
                "",
                "",
                "",
                "",
                "",
                reading,
                "Device",
            ]);
            expect(row[28]).toBe("Measured");
            expect(row[34]).toBe("VPD meter");
        }
    );

    it("retains optional device context without replacing a device reading with a calculation", () => {
        expect.hasAssertions();

        const row = required(
            rows(
                server(),
                calculated({ leafVpd: 2.7, leafVpdSource: "Device" })
            )[0]
        );

        expect(row.slice(60)).toStrictEqual([
            20,
            "C",
            25,
            "C",
            50,
            2.7,
            "Device",
        ]);
    });

    it.each([
        { leafTemperature: "" },
        { leafTemperatureUnit: "" },
        { leafTemperatureUnit: "K" },
        { leafAirTemperatureUnit: "" },
        { leafAirTemperatureUnit: "kelvin" },
        { leafAirTemperature: "" },
        { leafHumidity: "" },
        { leafHumidity: -0.01 },
        { leafHumidity: 100.01 },
        { leafTemperature: -50.01 },
        { leafTemperature: 100.01 },
        { leafAirTemperature: -50.01 },
        { leafAirTemperature: 100.01 },
        { leafTemperature: -58.1, leafTemperatureUnit: "F" },
        { leafAirTemperature: 212.1, leafAirTemperatureUnit: "F" },
        { leafVpd: 0 },
        { leafVpd: 9.8765 },
        { leafVpdSource: "Not calculated" },
        { leafVpdSource: "Unknown source" },
    ])("rejects invalid calculated input %j", (overrides) => {
        expect.hasAssertions();
        expect(() =>
            server().eventDetailsFromPayload_(
                calculated(overrides),
                ["Leaf VPD"],
                null
            )
        ).toThrow(/Leaf|Pair|leaf|relative/v);
    });

    it.each([
        "",
        null,
        undefined,
        -0.0001,
        NaN,
        Infinity,
        "1 kPa",
        " ",
        true,
        {},
    ])(
        "rejects missing, negative, malformed or nonfinite device VPD %j",
        (leafVpd) => {
            expect.hasAssertions();
            expect(() =>
                server().eventDetailsFromPayload_(
                    { leafVpd, leafVpdSource: "Device" },
                    ["Leaf VPD"],
                    null
                )
            ).toThrow(/Leaf VPD/v);
        }
    );

    it.each([
        "leafTemperature",
        "leafAirTemperature",
        "leafHumidity",
    ])("rejects malformed and nonfinite %s readings", (field) => {
        expect.hasAssertions();

        const api = server();
        for (const value of [
            "20 °C",
            " ",
            NaN,
            Infinity,
            -Infinity,
            "Infinity",
            "NaN",
            false,
            [],
            {},
        ]) {
            expect(() =>
                api.eventDetailsFromPayload_(
                    calculated({ [field]: value }),
                    ["Leaf VPD"],
                    null
                )
            ).toThrow(/must be a finite number/v);
        }
    });

    it("excludes Leaf VPD from AppSheet bulk actions", () => {
        expect.hasAssertions();
        expect(() => server().normalizeAppSheetBulkAction_("Leaf VPD")).toThrow(
            /Round action/v
        );
    });
});
