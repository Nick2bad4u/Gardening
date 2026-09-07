import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

import { appsScriptApi } from "../helpers/apps-script-api.mjs";
import { required } from "../helpers/required.mjs";
import {
    selectSheetValues,
    sheetDisplayValues,
} from "../helpers/sheet-values.mjs";

const sourceUrl = new URL(
    "../../scripts/google-sheets/plant-tracker.gs",
    import.meta.url
);
const source = fs.readFileSync(sourceUrl, "utf8");
const now = new Date("2026-09-06T18:00:00Z");
const zone = "America/New_York";

/** @param {Date} date @param {string} timeZone @param {string} pattern */
function formatDate(date, timeZone, pattern) {
    if (pattern !== "yyyy-MM-dd") return date.toISOString();
    const formatter = new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "2-digit",
        timeZone,
        year: "numeric",
    });
    const parts = formatter.formatToParts(date);
    const part = (/** @type {string} */ type) =>
        required(parts.find((entry) => entry.type === type)).value;
    return `${part("year")}-${part("month")}-${part("day")}`;
}

/**
 * @param {import("../logger-fixtures.d.ts").CellValue[][]} rows @param {number}
 *   [setup]
 */
function readPlant(rows, setup = 1) {
    const models = runtime().api.webWeightReadModelsFromRows_(
        rows,
        new Map([["P01", setup]]),
        now,
        zone
    );
    const plant = required(models.byPlant.get("P01"));
    return structuredClone(plant);
}

/**
 * @param {string} at @param {string} event @param {Record<number,
 *   import("../logger-fixtures.d.ts").CellValue>} [cells]
 */
function row(at, event = "Weigh", cells = {}) {
    /** @type {import("../logger-fixtures.d.ts").CellValue[]} */
    const values = Array.from({ length: 42 }, () => "");
    values[0] = new Date(at);
    values[1] = "P01";
    values[2] = event;
    values[4] = event === "Weigh" ? 450 : "";
    values[9] = new Date(at);
    values[10] = 1;
    values[26] = `${event}-${at}`;
    values[28] = "Measured";
    values[35] = "Active";
    for (const [index, value] of Object.entries(cells))
        values[Number(index)] = value;
    return values;
}

/** @param {import("../logger-fixtures.d.ts").CellValue[][]} [historyRows] */
function runtime(historyRows = []) {
    const historyReads = vi.fn();
    /**
     * @param {string} name @param
     *   {import("../logger-fixtures.d.ts").CellValue[][]} values
     */
    const sheet = (name, values) => ({
        getLastColumn: () => required(values[0]).length,
        getLastRow: () => values.length,
        getMaxColumns: () => 42,
        getName: () => name,
        /**
         * @param {number} rowNumber @param {number} column @param {number}
         *   rowCount @param {number} columnCount
         */
        getRange(rowNumber, column, rowCount, columnCount) {
            if (name === "History")
                historyReads(rowNumber, column, rowCount, columnCount);
            const selected = selectSheetValues(values, {
                column,
                columnCount,
                row: rowNumber,
                rowCount,
            });
            return {
                getDisplayValues: () => sheetDisplayValues(selected),
                getFormulas: () =>
                    selectSheetValues([], {
                        column,
                        columnCount,
                        row: rowNumber,
                        rowCount,
                    }),
                getValues: () => selected,
            };
        },
    });
    const ids = [
        "P01",
        "P02",
        "P03",
    ];
    const sheets = new Map([
        [
            "Baselines",
            sheet("Baselines", [
                ["Plant ID", "Pot setup"],
                ...ids.map((id) => [id, 1]),
            ]),
        ],
        [
            "History",
            sheet("History", [
                Array.from({ length: 42 }, () => ""),
                ...historyRows,
            ]),
        ],
        [
            "Plant tracker",
            sheet("Plant tracker", [
                ["Plant ID", "Name"],
                ...ids.map((id) => [
                    id,
                    `Plant ${id}`,
                    "",
                    "",
                    "",
                    "",
                    9999,
                ]),
            ]),
        ],
    ]);
    const spreadsheet = {
        getSheetByName: (/** @type {string} */ name) => sheets.get(name),
        getSpreadsheetTimeZone: () => zone,
    };
    const context = vm.createContext({
        console,
        Date,
        encodeURIComponent,
        Map,
        Object,
        Set,
        SpreadsheetApp: { openById: () => spreadsheet },
        Utilities: { formatDate },
    });
    vm.runInContext(source, context, { filename: fileURLToPath(sourceUrl) });
    return { api: appsScriptApi(context), historyReads };
}

describe("logger History-backed read models", () => {
    it("ignores anonymous History rows and defaults a blank baseline setup to the first pot", () => {
        expect.hasAssertions();

        const models = runtime().api.webWeightReadModelsFromRows_(
            [
                row("2026-09-06T12:00:00Z", "Weigh", { 1: "", 4: 9999 }),
                row("2026-09-06T13:00:00Z", "Weigh", { 4: 350, 10: "" }),
            ],
            new Map([["P01", 0]]),
            now,
            zone
        );

        expect(models.byPlant.keys().toArray()).toStrictEqual(["P01"]);
        expect([...models.weighedTodayPlantIds]).toStrictEqual(["P01"]);
        expect(models.byPlant.get("P01")).toMatchObject({
            latestWeight: 350,
            weightSeries: { points: [{ weight: 350 }], potSetup: 1 },
        });
    });

    it("keeps the completed dry reference after a Repot only when it belongs to the new setup", () => {
        expect.hasAssertions();

        const plant = readPlant(
            [
                row("2026-09-01T12:00:00Z", "Repot", { 10: 2 }),
                row("2026-09-02T12:00:00Z", "Water", { 10: 2 }),
                row("2026-09-02T13:00:00Z", "Weigh", { 4: 600, 10: 2 }),
                row("2026-09-04T12:00:00Z", "Weigh", { 4: 400, 10: 2 }),
                row("2026-09-05T12:00:00Z", "Water", { 10: 2 }),
                row("2026-09-05T13:00:00Z", "Weigh", { 4: 610, 10: 2 }),
            ],
            2
        );

        expect(plant.weightSeries).toMatchObject({
            points: [{ weight: 610 }],
            previousDry: {
                observedAt: "2026-09-04T12:00:00.000Z",
                weight: 400,
            },
            setupStartedAt: "2026-09-01T12:00:00.000Z",
            startedAt: "2026-09-05T12:00:00.000Z",
        });
    });

    it("uses a workbook day ahead of UTC and accepts legacy blank measured provenance", () => {
        expect.hasAssertions();

        const result = runtime().api.webWeightReadModelsFromRows_(
            [
                row("2026-09-06T15:00:00Z", "Weigh", { 28: "", 34: "" }),
                row("2026-09-06T14:59:59Z", "Weigh", { 1: "P02" }),
            ],
            new Map(),
            new Date("2026-09-06T15:01:00Z"),
            "Asia/Tokyo"
        );

        expect(result.dayKey).toBe("2026-09-07");
        expect(Array.from(result.weighedTodayPlantIds)).toStrictEqual(["P01"]);
    });

    it("keeps a pre-water latest measurement paired while the new cycle has no points", () => {
        expect.hasAssertions();

        const result = readPlant([
            row("2026-09-05T12:00:00Z", "Weigh", { 4: 410 }),
            row("2026-09-06T12:00:00Z", "Water", { 40: "Partial" }),
            row("2026-09-06T13:00:00Z", "Water", { 35: "Removed" }),
        ]);

        expect(result).toMatchObject({
            latestWeight: 410,
            latestWeightAt: "2026-09-05T12:00:00.000Z",
            weightSeries: {
                points: [],
                previousDry: { weight: 410 },
                startedAt: "2026-09-06T12:00:00.000Z",
                waterings: [{ application: "Partial" }],
            },
        });
    });

    it("withholds an old dry reference when a newer setup contains only an estimate", () => {
        expect.hasAssertions();

        const result = readPlant([
            row("2026-09-01T12:00:00Z", "Weigh", { 4: 410 }),
            row("2026-09-02T12:00:00Z", "Water"),
            row("2026-09-05T12:00:00Z", "Weigh", { 10: 2, 28: "Estimated" }),
        ]);

        expect(result).toMatchObject({
            latestWeight: "",
            latestWeightAt: "",
            weightSeries: {
                excludedCount: 1,
                points: [],
                potSetup: 2,
                previousDry: null,
            },
        });
    });

    it("uses same-save identity at the repot boundary without retaining earlier same-time weights", () => {
        expect.hasAssertions();

        const result = readPlant([
            row("2026-09-05T12:00:00Z", "Weigh", {
                4: 400,
                10: 2,
                29: "before",
            }),
            row("2026-09-05T12:00:00Z", "Weigh", {
                4: 550,
                10: 2,
                29: "repot",
            }),
            row("2026-09-05T12:00:00Z", "Repot", { 10: 2, 29: "repot" }),
            row("2026-09-06T12:00:00Z", "Repot", { 10: 3, 35: "Removed" }),
        ]);

        expect(result.weightSeries).toMatchObject({
            potSetup: 2,
            startKind: "Repot",
        });
        expect(
            result.weightSeries.points.map((point) => point.weight)
        ).toStrictEqual([550]);
    });

    it("pairs the latest measured weight with its timestamp using one bootstrap History read", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        try {
            vi.setSystemTime(now);
            const rows = [
                row("2026-09-06T12:00:00Z", "Weigh", { 4: 410 }),
                row("2026-09-06T13:00:00Z", "Weigh", {
                    4: 999,
                    28: "Estimated",
                }),
            ];
            const before = structuredClone(rows);
            const { api, historyReads } = runtime(rows);
            const bootstrap = api.getWebAppBootstrap();

            expect(bootstrap).toMatchObject({
                dayKey: "2026-09-06",
                serverTime: now.toISOString(),
                timeZone: zone,
                weighedTodayPlantIds: ["P01"],
            });
            expect(bootstrap.plants[0]).toMatchObject({
                latestWeight: 410,
                latestWeightAt: "2026-09-06T12:00:00.000Z",
                weightSeries: { potSetup: 1 },
            });
            expect(bootstrap.plants[1]).toMatchObject({
                latestWeight: "",
                latestWeightAt: "",
                weightSeries: { points: [] },
            });
            expect(historyReads).toHaveBeenCalledExactlyOnceWith(2, 1, 2, 42);
            expect(rows).toStrictEqual(before);
        } finally {
            vi.useRealTimers();
        }
    });

    it.each([
        [
            "2026-09-06T03:59:59Z",
            "2026-09-05",
            "2026-09-05T04:00:00Z",
            "2026-09-06T04:00:00Z",
        ],
        [
            "2026-09-06T04:00:00Z",
            "2026-09-06",
            "2026-09-06T04:00:00Z",
            "2026-09-06T04:00:01Z",
        ],
        [
            "2026-03-08T07:30:00Z",
            "2026-03-08",
            "2026-03-08T05:00:00Z",
            "2026-03-08T08:00:00Z",
        ],
        [
            "2026-11-01T06:30:00Z",
            "2026-11-01",
            "2026-11-01T05:30:00Z",
            "2026-11-01T06:30:01Z",
        ],
    ])(
        "uses workbook midnight and DST at %s",
        (at, dayKey, savedAt, futureAt) => {
            expect.hasAssertions();

            const result = runtime().api.webWeightReadModelsFromRows_(
                [
                    row(savedAt),
                    row(savedAt),
                    row(futureAt, "Weigh", { 1: "P02" }),
                    row("2026-03-07T12:00:00Z", "Weigh", { 1: "P03" }),
                ],
                new Map(),
                new Date(at),
                zone
            );

            expect(result.dayKey).toBe(dayKey);
            expect(Array.from(result.weighedTodayPlantIds)).toStrictEqual([
                "P01",
            ]);
        }
    );

    it("counts both repeated fall-back hours on the same workbook day", () => {
        expect.hasAssertions();

        const result = runtime().api.webWeightReadModelsFromRows_(
            [
                row("2026-11-01T05:30:00Z"),
                row("2026-11-01T06:30:00Z", "Weigh", { 1: "P02" }),
            ],
            new Map(),
            new Date("2026-11-01T06:45:00Z"),
            zone
        );

        expect(Array.from(result.weighedTodayPlantIds)).toStrictEqual([
            "P01",
            "P02",
        ]);
    });

    it.each([
        { 35: "Removed" },
        { 28: "Estimated" },
        { 34: "Visual estimate" },
        { 4: 0 },
        { 4: -1 },
        { 4: "450" },
        { 4: "bad" },
        { 4: NaN },
        { 4: Infinity },
        { 4: true },
        { 4: null },
        { 4: "" },
        { 0: new Date("invalid") },
        { 0: "" },
        { 0: null },
        { 0: 46_271 },
        { 0: "0" },
        { 0: "2026" },
        { 0: new Date("2026-09-07T12:00:00Z") },
    ])(
        "withholds unusable readings from latest weight, points, and saved today: %j",
        (cells) => {
            expect.hasAssertions();

            const result = runtime().api.webWeightReadModelsFromRows_(
                [
                    row("2026-09-06T12:00:00Z", "Weigh", cells),
                    row("2026-09-06T12:00:00Z", "Water", { 4: 700 }),
                ],
                new Map([["P01", 1]]),
                now,
                zone
            );

            expect(Array.from(result.weighedTodayPlantIds)).toStrictEqual([]);
            expect(result.byPlant.get("P01")).toMatchObject({
                latestWeight: "",
                latestWeightAt: "",
                weightSeries: { points: [] },
            });
        }
    );

    it("keeps latest measured time order independent of row order and breaks only gaps over 48 actual hours", () => {
        expect.hasAssertions();

        const result = readPlant([
            row("2026-09-06T12:00:01Z", "Weigh", { 4: 410 }),
            row("2026-09-02T12:00:00Z", "Weigh", { 4: 450 }),
            row("2026-09-04T12:00:00Z", "Weigh", { 4: 430 }),
        ]);

        expect(result.latestWeightAt).toBe("2026-09-06T12:00:01.000Z");
        expect(
            result.weightSeries.points.map((point) => [
                point.weight,
                point.breakBefore,
            ])
        ).toStrictEqual([
            [450, false],
            [430, false],
            [410, true],
        ]);
    });

    it("uses actual elapsed time across DST when deciding chart gaps", () => {
        expect.hasAssertions();

        const result = runtime().api.webWeightReadModelsFromRows_(
            [
                row("2026-03-07T12:00:00-05:00"),
                row("2026-03-09T12:30:00-04:00"),
                row("2026-03-11T12:30:01-04:00"),
            ],
            new Map(),
            new Date("2026-03-12T00:00:00Z"),
            zone
        );

        const points = required(result.byPlant.get("P01")).weightSeries.points;

        expect(Array.from(points, (point) => point.breakBefore)).toStrictEqual([
            false,
            false,
            true,
        ]);
    });

    it("breaks at removed, estimated and invalid weights and conservatively around undated exclusions", () => {
        expect.hasAssertions();

        const dated = readPlant([
            row("2026-09-05T00:00:00Z"),
            row("2026-09-05T01:00:00Z", "Weigh", { 35: "Removed" }),
            row("2026-09-05T02:00:00Z"),
            row("2026-09-05T03:00:00Z", "Weigh", { 28: "Estimated" }),
            row("2026-09-05T04:00:00Z"),
            row("2026-09-05T05:00:00Z", "Weigh", { 4: "bad" }),
            row("2026-09-05T06:00:00Z"),
            row("2026-09-05T07:00:00Z"),
        ]);

        expect(dated.weightSeries.excludedCount).toBe(3);
        expect(
            dated.weightSeries.points.map((point) => point.breakBefore)
        ).toStrictEqual([
            false,
            true,
            true,
            true,
            false,
        ]);

        const undated = readPlant([
            row("invalid"),
            row("2026-09-05T00:00:00Z"),
            row("2026-09-05T01:00:00Z"),
            row("2026-09-05T02:00:00Z"),
        ]);

        expect(undated.weightSeries.excludedCount).toBe(1);
        expect(
            undated.weightSeries.points.map((point) => point.breakBefore)
        ).toStrictEqual([
            false,
            true,
            true,
        ]);
    });

    it.each([
        "Partial",
        "Spot",
        "Thorough",
        "Flood / soak-through",
        "",
    ])(
        "starts at the latest %s watering with same-save Weigh ordered first",
        (application) => {
            expect.hasAssertions();

            const result = readPlant([
                row("2026-09-03T12:00:00Z", "Water"),
                row("2026-09-03T13:00:00Z", "Weigh", { 4: 500 }),
                row("2026-09-04T12:00:00Z", "Weigh", { 4: 400 }),
                row("2026-09-05T12:00:00Z", "Weigh", {
                    4: 390,
                    29: "before-water",
                }),
                row("2026-09-05T12:00:00Z", "Weigh", {
                    4: 550,
                    29: "same-save",
                }),
                row("2026-09-05T12:00:00Z", "Water", {
                    29: "same-save",
                    40: application,
                }),
                row("2026-09-05T12:00:00Z", "Weigh", {
                    4: 549,
                    29: "after-water",
                }),
                row("2026-09-05T18:00:00Z", "Weigh", { 4: 530 }),
            ]);

            expect(result.weightSeries).toMatchObject({
                previousDry: { weight: 390 },
                startedAt: "2026-09-05T12:00:00.000Z",
                startKind: "Water",
                waterings: [
                    { application, observedAt: "2026-09-05T12:00:00.000Z" },
                ],
            });
            expect(
                result.weightSeries.points.map((point) => point.weight)
            ).toStrictEqual([
                550,
                549,
                530,
            ]);
        }
    );

    it("uses legacy Request ID for same-save identity and preserves equal-time row order", () => {
        expect.hasAssertions();

        const result = readPlant([
            row("2026-09-05T12:00:00Z", "Weigh", { 4: 400, 15: "earlier" }),
            row("2026-09-05T12:00:00Z", "Weigh", { 4: 520, 15: "save" }),
            row("2026-09-05T12:00:00Z", "Water", { 15: "save" }),
            row("2026-09-05T12:00:00Z", "Weigh", { 4: 515, 15: "later" }),
        ]);

        expect(result.latestWeight).toBe(515);
        expect(
            result.weightSeries.points.map((point) => point.weight)
        ).toStrictEqual([520, 515]);
        expect(result.weightSeries.previousDry?.weight).toBe(400);
    });

    it("never joins older setups and respects repots and Baselines ahead of History", () => {
        expect.hasAssertions();

        const rows = [
            row("2026-09-02T12:00:00Z", "Weigh", { 4: 900 }),
            row("2026-09-03T12:00:00Z", "Water"),
            row("2026-09-04T12:00:00Z", "Repot", { 10: 2 }),
            row("2026-09-05T12:00:00Z", "Weigh", { 4: 550, 10: 2 }),
            row("2026-09-06T12:00:00Z", "Weigh", { 4: 800 }),
            row("2026-09-07T12:00:00Z", "Repot", { 10: 3 }),
        ];
        const current = readPlant(rows);

        expect(current).toMatchObject({
            latestWeight: 550,
            weightSeries: {
                potSetup: 2,
                previousDry: null,
                setupStartedAt: "2026-09-04T12:00:00.000Z",
                startKind: "Repot",
            },
        });
        expect(
            current.weightSeries.points.map((point) => point.weight)
        ).toStrictEqual([550]);
        expect(readPlant(rows, 3)).toMatchObject({
            latestWeight: "",
            latestWeightAt: "",
            weightSeries: { points: [], potSetup: 3, previousDry: null },
        });
    });

    it("ignores unmeasured dry candidates and future Water when choosing a completed reference", () => {
        expect.hasAssertions();

        const result = readPlant([
            row("2026-09-01T12:00:00Z", "Water"),
            row("2026-09-01T13:00:00Z", "Weigh", { 4: 500 }),
            row("2026-09-02T12:00:00Z", "Weigh", { 4: 410 }),
            row("2026-09-02T13:00:00Z", "Weigh", { 4: 200, 28: "Estimated" }),
            row("2026-09-03T12:00:00Z", "Water"),
            row("2026-09-03T13:00:00Z", "Weigh", { 4: 550 }),
            row("2026-09-04T12:00:00Z", "Weigh", { 4: 430 }),
            row("2026-09-07T12:00:00Z", "Water"),
        ]);

        expect(result.weightSeries.previousDry).toStrictEqual({
            observedAt: "2026-09-02T12:00:00.000Z",
            weight: 410,
        });
        expect(result.weightSeries.startedAt).toBe("2026-09-03T12:00:00.000Z");
    });

    it("provides honest no-water, no-data, and water-without-weight charts", () => {
        expect.hasAssertions();
        expect(readPlant([]).weightSeries).toStrictEqual({
            excludedCount: 0,
            points: [],
            potSetup: 1,
            previousDry: null,
            setupStartedAt: "",
            startedAt: "",
            startKind: "",
            waterings: [],
        });

        const first = readPlant([row("2026-09-05T12:00:00Z")]);

        expect(first.weightSeries).toMatchObject({
            points: [
                {
                    breakBefore: false,
                    observationId: "Weigh-2026-09-05T12:00:00Z",
                },
            ],
            previousDry: null,
            startKind: "First reading",
        });

        const water = readPlant([row("2026-09-05T12:00:00Z", "Water")]);

        expect(water).toMatchObject({
            latestWeight: "",
            latestWeightAt: "",
            weightSeries: {
                points: [],
                startKind: "Water",
                waterings: [{ application: "" }],
            },
        });
    });
});

describe("corrected weight read models", () => {
    it("retains equal-time order through a correction chain", () => {
        expect.hasAssertions();

        const at = "2026-09-05T16:00:00Z";
        const rows = [
            row(at, "Weigh", { 4: 400, 26: "original", 35: "Removed" }),
            row(at, "Weigh", { 4: 390, 26: "later" }),
            row(at, "Weigh", {
                4: 395,
                26: "first",
                30: "original",
                35: "Removed",
            }),
            row(at, "Weigh", { 4: 392, 26: "replacement", 30: "first" }),
        ];
        const plant = readPlant(rows);

        expect(plant.latestWeight).toBe(390);
        expect(
            plant.weightSeries.points.map((point) => point.weight)
        ).toStrictEqual([392, 390]);
        expect(plant.weightSeries.excludedCount).toBe(0);
        expect(
            plant.weightSeries.points.every((point) => !point.breakBefore)
        ).toBe(true);
    });

    it("does not turn a replaced reading into a missing measurement", () => {
        expect.hasAssertions();

        const plant = readPlant([
            row("2026-09-03T16:00:00Z", "Weigh", { 4: 450, 26: "start" }),
            row("2026-09-04T16:00:00Z", "Weigh", {
                4: 440,
                26: "original",
                35: "Removed",
            }),
            row("2026-09-05T16:00:00Z", "Weigh", { 4: 430, 26: "last" }),
            row("2026-09-04T16:00:00Z", "Weigh", {
                4: 445,
                26: "replacement",
                30: "original",
            }),
        ]);

        expect(
            plant.weightSeries.points.map((point) => point.weight)
        ).toStrictEqual([
            450,
            445,
            430,
        ]);
        expect(plant.weightSeries.excludedCount).toBe(0);
        expect(
            plant.weightSeries.points.every((point) => !point.breakBefore)
        ).toBe(true);
    });

    it("preserves a real exclusion beside a corrected reading", () => {
        expect.hasAssertions();

        const plant = readPlant([
            row("2026-09-03T16:00:00Z", "Weigh", { 4: 450, 26: "start" }),
            row("2026-09-04T15:00:00Z", "Weigh", {
                4: 4,
                26: "excluded",
                35: "Removed",
            }),
            row("2026-09-04T16:00:00Z", "Weigh", {
                4: 440,
                26: "original",
                35: "Removed",
            }),
            row("2026-09-04T16:00:00Z", "Weigh", {
                4: 445,
                26: "replacement",
                30: "original",
            }),
        ]);

        expect(plant.weightSeries.excludedCount).toBe(1);
        expect(
            plant.weightSeries.points.map((point) => point.breakBefore)
        ).toStrictEqual([false, true]);
    });

    it.each([
        { cells: { 30: "missing" }, name: "missing parent" },
        { cells: { 30: "replacement" }, name: "self cycle" },
        { cells: { 10: 2 }, name: "different setup" },
        { cells: { 1: "P02" }, name: "different plant" },
        { cells: { 2: "Water" }, name: "different event" },
        { cells: { 35: "Active" }, name: "active parent" },
    ])("withholds inherited order for $name", ({ cells }) => {
        expect.hasAssertions();

        const at = "2026-09-05T16:00:00Z";
        const original = row(at, "Weigh", {
            4: 400,
            26: "original",
            35: "Removed",
            ...cells,
        });
        const rows = [
            original,
            row(at, "Weigh", { 4: 390, 26: "later" }),
            row(at, "Weigh", { 4: 392, 26: "replacement", 30: "original" }),
        ];
        const models = runtime().api.webWeightReadModelsFromRows_(
            rows,
            new Map([["P01", 1]]),
            now,
            zone
        );

        expect(required(models.byPlant.get("P01")).latestWeight).toBe(392);
    });
});

describe("logger filtered recent History and event details", () => {
    it("serializes accidental date-valued notes safely and omits invalid dates", () => {
        expect.hasAssertions();

        const { api } = runtime([
            row("2026-09-05T12:00:00Z", "Other", {
                8: new Date("2026-09-01T12:00:00Z"),
            }),
            row("2026-09-06T12:00:00Z", "Other", { 8: new Date("invalid") }),
        ]);
        const entries = api.getRecentWebObservations(2);

        expect(required(entries[0]).details).not.toHaveProperty("notes");
        expect(required(entries[1]).details.notes).toBe(
            "2026-09-01T12:00:00.000Z"
        );

        const serialized = JSON.stringify(entries);

        expect(JSON.parse(serialized)).toStrictEqual(structuredClone(entries));
    });

    it("keeps canonical centimetres and derived inches without guessing an unknown display unit", () => {
        expect.hasAssertions();

        const { api } = runtime([
            row("2026-09-05T12:00:00Z", "Measure", {
                5: 10.16,
                6: 5.08,
                36: "feet",
            }),
        ]);
        const details = required(api.getRecentWebObservations(1)[0]).details;

        expect(details).toMatchObject({
            heightCm: 10.16,
            heightIn: 4,
            measurementUnit: "feet",
            widthCm: 5.08,
            widthIn: 2,
        });
        expect(details).not.toHaveProperty("height");
        expect(details).not.toHaveProperty("width");
    });

    it("filters on the server before the limit and retains legacy one-argument behavior", () => {
        expect.hasAssertions();

        const { api, historyReads } = runtime([
            row("2026-09-01T12:00:00Z", "Measure"),
            row("2026-09-02T12:00:00Z", "Water"),
            row("2026-09-03T12:00:00Z", "Weigh", { 1: "P02" }),
            row("2026-09-04T12:00:00Z", "Weigh", { 1: "P02" }),
            row("2026-09-05T12:00:00Z", "Water", { 35: "Removed" }),
            ...Array.from({ length: 20 }, (_, index) =>
                row(
                    `2026-09-06T${String(index).padStart(2, "0")}:00:00Z`,
                    "Weigh",
                    { 1: "P02" }
                )
            ),
        ]);

        expect(
            api
                .getRecentWebObservations(1, { event: "Water", plantId: "P01" })
                .map((entry) => entry.observedAtIso)
        ).toStrictEqual(["2026-09-02T12:00:00.000Z"]);
        expect(
            Array.from(
                api.getRecentWebObservations(10, { plantId: "P01" }),
                (entry) => entry.event
            )
        ).toStrictEqual(["Water", "Measure"]);
        expect(
            api
                .getRecentWebObservations(1, { event: "Measure" })
                .map((entry) => entry.event)
        ).toStrictEqual(["Measure"]);
        expect(api.getRecentWebObservations(10)).toHaveLength(10);
        expect(
            api.getRecentWebObservations(25, { event: "", plantId: " " })
        ).toHaveLength(24);
        expect(
            Array.from(api.getRecentWebObservations(10, { plantId: "P03" }))
        ).toStrictEqual([]);
        expect(historyReads).toHaveBeenCalledTimes(6);
    });

    it.each([
        null,
        [],
        new Date("2026-09-06T12:00:00Z"),
        new Map(),
        "Water",
        { plantId: "P99" },
        { plantId: 1 },
        { plantId: null },
        { event: "water" },
        { event: false },
        { events: "Water" },
    ])("rejects invalid filters without reading History: %j", (filters) => {
        expect.hasAssertions();

        const { api, historyReads } = runtime();

        expect(() => api.getRecentWebObservations(10, filters)).toThrow(
            /History/v
        );
        expect(historyReads).not.toHaveBeenCalled();
    });

    it("sorts same-day and same-time recent entries by observation, recording, then row order", () => {
        expect.hasAssertions();

        const { api } = runtime([
            row("2026-09-05T12:00:00Z", "Check", {
                9: new Date("2026-09-06T12:00:00Z"),
                26: "recorded-later",
            }),
            row("2026-09-05T12:00:00Z", "Water", { 26: "row-earlier" }),
            row("2026-09-05T12:00:00Z", "Weigh", { 26: "row-later" }),
            row("2026-09-05T13:00:00Z", "Weigh", { 26: "observed-later" }),
        ]);

        expect(
            api.getRecentWebObservations(10).map((entry) => entry.observationId)
        ).toStrictEqual([
            "observed-later",
            "recorded-later",
            "row-later",
            "row-earlier",
        ]);
    });

    it.each([
        "in",
        "cm",
        "",
    ])(
        "returns dimensions in their original %s unit alongside normalized values",
        (unit) => {
            expect.hasAssertions();

            const { api } = runtime([
                row("2026-09-05T12:00:00Z", "Measure", {
                    5: 10.16,
                    6: 5.08,
                    34: "Ruler",
                    36: unit,
                    37: 9999,
                }),
            ]);

            expect(
                required(api.getRecentWebObservations(1)[0]).details
            ).toMatchObject({
                height: unit === "in" ? 4 : 10.16,
                heightCm: 10.16,
                heightIn: 4,
                measurementMethod: "Ruler",
                measurementUnit: unit || "cm",
                width: unit === "in" ? 2 : 5.08,
                widthCm: 5.08,
                widthIn: 2,
            });
        }
    );

    it.each([
        [
            "Water",
            { 16: "Yes", 17: "MSU 13-3-15", 18: "1/4 tsp", 40: "Spot", 41: 25 },
            {
                nutrientAmount: "1/4 tsp",
                nutrientProduct: "MSU 13-3-15",
                nutrientsUsed: "Yes",
                waterAmount: 25,
                wateringApplication: "Spot",
            },
        ],
        [
            "Check",
            { 7: "Firm", 32: "Dry surface" },
            { condition: "Firm", soilMoisture: "Dry surface" },
        ],
        [
            "Repot",
            { 19: "3 in", 20: "4 in", 33: "Perlite mix" },
            { medium: "Perlite mix", potSize: "4 in", previousPotSize: "3 in" },
        ],
        [
            "Flower",
            { 21: 2, 22: "Opening" },
            { flowerCount: 2, flowerDetails: "Opening" },
        ],
        [
            "Photo",
            { 23: "https://photos.app.goo.gl/Example" },
            { photoUrl: "https://photos.app.goo.gl/Example" },
        ],
        [
            "Pest",
            { 24: "Scale", 25: "Removed manually" },
            { pestIssue: "Scale", pestTreatment: "Removed manually" },
        ],
        [
            "Rotation",
            { 39: 90 },
            { rotationDegrees: 90 },
        ],
        [
            "Weigh",
            { 34: "Scale" },
            { measurementMethod: "Scale" },
        ],
        [
            "Clean",
            {},
            {},
        ],
        [
            "Prune",
            {},
            {},
        ],
        [
            "Other",
            {},
            {},
        ],
    ])(
        "returns meaningful %s fields plus notes and provenance",
        (event, cells, details) => {
            expect.hasAssertions();

            const notes =
                '<img src=x onerror="alert(1)"> & <script>bad()</script>';
            const { api } = runtime([
                row("2026-09-05T12:00:00Z", event, {
                    ...cells,
                    8: notes,
                    11: "A1",
                    26: "observation-id",
                    27: "Mobile logger",
                    29: "save-group",
                    30: "prior-observation",
                    31: "Corrected transcription",
                }),
            ]);
            const entry = required(api.getRecentWebObservations(1)[0]);

            expect(entry).toMatchObject({
                details: {
                    ...details,
                    correctionReason: "Corrected transcription",
                    correctsObservationId: "prior-observation",
                    entrySource: "Mobile logger",
                    notes,
                    observationQuality: "Measured",
                    potLabel: "A1",
                    potSetup: 1,
                    recordedAtIso: "2026-09-05T12:00:00.000Z",
                    recordStatus: "Active",
                    saveGroup: "save-group",
                },
                observationId: "observation-id",
                observedAtIso: "2026-09-05T12:00:00.000Z",
            });

            const serialized = JSON.stringify(entry);

            expect(JSON.parse(serialized)).toStrictEqual(
                structuredClone(entry)
            );
        }
    );

    it("returns only safe scalars, preserves formula escaping and omits absent measurement dimensions", () => {
        expect.hasAssertions();

        const { api } = runtime([
            row("invalid", "Measure", {
                4: NaN,
                5: Infinity,
                6: "",
                8: '\'=IMPORTXML("x")',
                9: new Date("invalid"),
                36: "unknown",
            }),
        ]);
        const entry = required(api.getRecentWebObservations(1)[0]);

        expect(entry).toMatchObject({
            details: { measurementUnit: "unknown", notes: '\'=IMPORTXML("x")' },
            observedAtIso: "",
            weight: "",
        });
        expect(entry.details).not.toHaveProperty("height");
        expect(entry.details).not.toHaveProperty("heightCm");
        expect(entry.details).not.toHaveProperty("width");
        expect(entry.details).not.toHaveProperty("recordedAtIso");
        expect(api.webHistoryDetailValue_({ nested: "value" })).toBe("");
        expect(api.webHistoryDetailValue_(false)).toBe(false);
    });
});
