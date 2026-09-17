import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

import {
    cycleComparisonAppsScriptSource,
    cycleComparisonFormula,
    cycleComparisonRows,
} from "../../scripts/google-sheets/cycle-comparison.mjs";

const sourceUrl = new URL(
    "../../scripts/google-sheets/plant-tracker.gs",
    import.meta.url
);
const source = readFileSync(sourceUrl, "utf8");
const context = vm.createContext({ Date, Map, Set });
vm.runInContext(source, context, { filename: fileURLToPath(sourceUrl) });
const globals = /** @type {Record<string, unknown>} */ (context);
if (
    typeof globals["dryDownRecordsByPlant_"] !== "function" ||
    typeof globals["dryDownCycles_"] !== "function"
)
    throw new TypeError(
        "Cycle comparison requires the maintained detector helpers"
    );
const helpers = {
    cycles: /** @type {(records: DryDownRecord[]) => GardenDryDownCycle[]} */ (
        globals["dryDownCycles_"]
    ),
    dateLabel: (/** @type {number} */ day) => {
        const observed = new Date(day * 86_400_000);
        return observed.toISOString().slice(0, 10);
    },
    recordsByPlant:
        /**
         * @type {(
         *     history: GardenHistoryRow[]
         * ) => Map<string, DryDownRecord[]>}
         */ (globals["dryDownRecordsByPlant_"]),
};

/** @param {number} day */
const date = (day) => new Date(Date.UTC(2026, 8, 1) + day * 86_400_000);
/**
 * @param {number} day
 * @param {string} event
 * @param {number | string} [grams]
 * @param {{
 *     setup?: number;
 *     id?: string;
 *     removed?: boolean;
 *     save?: string;
 *     quality?: string;
 *     method?: string;
 *     observation?: string;
 *     corrects?: string;
 * }} [options]
 *
 * @returns {GardenHistoryRow}
 */
function row(day, event, grams = "", options = {}) {
    return [
        date(day),
        options.id ?? "P01",
        event,
        "Routine",
        grams,
        options.setup ?? 1,
        options.save ?? "",
        "",
        options.removed === true ? "Removed" : "Active",
        "",
        options.quality ?? "Measured",
        options.method ?? "Scale",
        options.observation ?? "",
        options.corrects ?? "",
    ];
}
/** @param {GardenHistoryRow[]} history @param {number} [setup] */
const calculate = (history, setup = 1) =>
    Array.from(
        integratedCycleApi(globals)(history, "P01", setup, date(30), helpers),
        (values) => Array.from(values)
    );

/**
 * @param {Record<string, unknown>} exported
 *
 * @returns {(
 *     history: GardenHistoryRow[],
 *     id: string,
 *     setup: number
 * ) => GardenCell[][]}
 */
function comparisonApi(exported) {
    if (typeof exported["GARDEN_CYCLE_COMPARISON"] !== "function")
        throw new TypeError("Missing generated custom function");
    const api =
        /**
         * @type {{
         *     GARDEN_CYCLE_COMPARISON: (
         *         history: GardenHistoryRow[],
         *         id: string,
         *         setup: number
         *     ) => GardenCell[][];
         * }}
         */ (exported);
    return api.GARDEN_CYCLE_COMPARISON;
}

/** @param {Record<string, unknown>} exported */
function installReadOnlyServices(exported) {
    exported["SpreadsheetApp"] = {
        getActiveSpreadsheet: () => ({
            getSpreadsheetTimeZone: () => "America/New_York",
        }),
    };
    exported["Utilities"] = {
        formatDate: (/** @type {Date} */ value) =>
            value.toISOString().slice(0, 10),
    };
}

/**
 * @param {Record<string, unknown>} exported @returns {typeof
 *   cycleComparisonRows}
 */
function integratedCycleApi(exported) {
    if (typeof exported["cycleComparisonRows_"] !== "function")
        throw new TypeError("Missing integrated cycle comparison calculation");
    const api =
        /** @type {{ cycleComparisonRows_: typeof cycleComparisonRows }} */ (
            exported
        );
    return api.cycleComparisonRows_;
}

/** @param {GardenHistoryRow[]} projectedRows @returns {GardenHistoryRow[]} */
function nativeHistory(projectedRows) {
    return projectedRows.map((projected) => {
        /** @type {GardenHistoryRow} */
        const native = Array.from({ length: 42 }, () => "");
        for (const [index, column] of [
            0,
            1,
            2,
            3,
            4,
            10,
            15,
            29,
            35,
            40,
            28,
            34,
            26,
            30,
        ].entries())
            native[column] = projected[index] ?? "";
        return native;
    });
}

describe("watering cycle comparison", () => {
    it("compares the current and last two completed cycles with real elapsed days", () => {
        expect.hasAssertions();

        const rows = calculate(
            [
                0,
                4,
                8,
                12,
            ].flatMap((day) => [
                row(day, "Water"),
                row(day, "Weigh", 200 + day),
                row(day + 1.5, "Weigh", 190 + day),
            ])
        );

        expect(rows).toStrictEqual([
            [
                "Days since watering",
                "Current · 2026-09-13",
                "Previous · 2026-09-09",
                "Older · 2026-09-05",
            ],
            [
                0,
                212,
                208,
                204,
            ],
            [
                1.5,
                202,
                198,
                194,
            ],
        ]);
    });

    it("excludes estimates, invalid values, future rows, removed rows, and other setups/plants", () => {
        expect.hasAssertions();
        expect(
            calculate([
                row(0, "Water"),
                row(0, "Weigh", 200),
                row(1, "Weigh", 190),
                row(2, "Weigh", 999, { quality: "Estimated" }),
                row(3, "Weigh", 999, { method: "Estimated" }),
                row(4, "Weigh", "999"),
                row(5, "Weigh", 0),
                row(6, "Weigh", Infinity),
                row(7, "Weigh", 999, { removed: true }),
                row(8, "Weigh", 999, { setup: 2 }),
                row(9, "Weigh", 999, { id: "P02" }),
                row(31, "Weigh", 999),
                row(32, "Water"),
                row(2, "Measure", 999),
            ])
        ).toStrictEqual([
            [
                "Days since watering",
                "Current · 2026-09-01",
                "",
                "",
            ],
            [
                0,
                200,
                "",
                "",
            ],
            [
                1,
                190,
                "",
                "",
            ],
        ]);
    });

    it("keeps same-save weights in the new cycle even when Weigh precedes Water", () => {
        expect.hasAssertions();

        const result = calculate([
            row(0, "Water", "", { save: "first" }),
            row(0, "Weigh", 200, { save: "first" }),
            row(3, "Weigh", 220, { save: "second" }),
            row(3, "Water", "", { save: "second" }),
        ]);

        expect(result[1]).toStrictEqual([
            0,
            220,
            200,
            "",
        ]);
        expect(result).toHaveLength(2);
    });

    it("preserves correction lineage order at a same-time watering boundary", () => {
        expect.hasAssertions();

        const result = calculate([
            row(0, "Water", "", { save: "first" }),
            row(0, "Weigh", 200, { save: "first" }),
            row(3, "Weigh", 180, {
                observation: "old",
                removed: true,
                save: "before",
            }),
            row(3, "Water", "", { save: "second" }),
            row(3, "Weigh", 220, { save: "second" }),
            row(3, "Weigh", 181, {
                corrects: "old",
                observation: "replacement",
                save: "before",
            }),
        ]);

        expect(result).toStrictEqual([
            [
                "Days since watering",
                "Current · 2026-09-04",
                "Previous · 2026-09-01",
                "",
            ],
            [
                0,
                220,
                200,
                "",
            ],
            [
                3,
                "",
                181,
                "",
            ],
        ]);
    });

    it("does not reuse old setup readings or readings before a same-setup repot", () => {
        expect.hasAssertions();

        const history = [
            row(0, "Water"),
            row(0, "Weigh", 200),
            row(2, "Repot", "", { setup: 2 }),
            row(3, "Water", "", { setup: 2 }),
            row(3, "Weigh", 500, { setup: 2 }),
        ];

        expect(calculate(history, 2)[1]).toStrictEqual([
            0,
            500,
            "",
            "",
        ]);
        expect(
            calculate([...history, row(4, "Repot", "", { setup: 2 })], 2)[1]
        ).toStrictEqual([
            "",
            "",
            "",
            "",
        ]);
    });

    it("keeps empty and single-reading histories sparse without inventing weights", () => {
        expect.hasAssertions();
        expect(calculate([])).toStrictEqual([
            [
                "Days since watering",
                "",
                "",
                "",
            ],
            [
                "",
                "",
                "",
                "",
            ],
        ]);
        expect(calculate([row(0, "Water")])).toStrictEqual([
            [
                "Days since watering",
                "Current · 2026-09-01",
                "",
                "",
            ],
            [
                "",
                "",
                "",
                "",
            ],
        ]);
        expect(
            calculate([row(0, "Water"), row(6, "Weigh", 200)])[1]
        ).toStrictEqual([
            6,
            200,
            "",
            "",
        ]);
    });

    it("withholds ambiguous undated boundaries and rejects non-Date evidence", () => {
        expect.hasAssertions();

        const undated = row(1, "Water");
        undated[0] = "";

        expect(
            calculate([
                row(0, "Water"),
                row(0, "Weigh", 200),
                undated,
            ])[1]
        ).toStrictEqual([
            "",
            "",
            "",
            "",
        ]);

        const invalid = row(1, "Weigh", 199);
        invalid[0] = "2026-09-02";

        expect(calculate([row(0, "Water"), invalid])[1]).toStrictEqual([
            "",
            "",
            "",
            "",
        ]);
    });

    it("uses actual elapsed days through daylight saving time", () => {
        expect.hasAssertions();

        const water = row(0, "Water");
        const weigh = row(1, "Weigh", 200);
        water[0] = new Date("2026-03-07T12:00:00-05:00");
        weigh[0] = new Date("2026-03-08T12:00:00-04:00");
        const result = calculate([water, weigh]);

        expect(Number(result[1]?.[0])).toBeCloseTo(23 / 24, 9);
    });

    it("emits an automatically dependent formula with the actual Baselines setup column", () => {
        expect.hasAssertions();

        const formula = cycleComparisonFormula();

        expect(formula).toContain("History!A2:AP5000");
        expect(formula).toContain("'Insights'!$B$228");
        expect(formula).toContain("Baselines!T2:T31");
        expect(formula).not.toMatch(/NOW\(|TODAY\(|ARRAYFORMULA\(N/v);
        expect(() => cycleComparisonFormula({ historyLastRow: 1 })).toThrow(
            "bounded"
        );
    });

    it("matches the pure module and integrated calculation for corrected cycle evidence", () => {
        expect.hasAssertions();

        const history = [
            row(0, "Water"),
            row(0, "Weigh", 200),
            row(1, "Weigh", 190),
            row(4, "Water"),
            row(4, "Weigh", 210),
        ];

        expect(calculate(history)).toStrictEqual(
            cycleComparisonRows(history, "P01", 1, date(30), helpers)
        );
    });

    it.each([
        { asOf: date(30), id: "", setup: 1 },
        { asOf: date(30), id: "P01", setup: 0 },
        { asOf: date(30), id: "P01", setup: 1.5 },
        { asOf: new Date(NaN), id: "P01", setup: 1 },
    ])(
        "withholds the native chart for invalid selection or clock $id/$setup/$asOf",
        ({ asOf, id, setup }) => {
            expect.hasAssertions();

            const rows = integratedCycleApi(globals)(
                [row(0, "Water"), row(0, "Weigh", 200)],
                id,
                setup,
                asOf,
                helpers
            );

            expect(Array.from(rows[1] ?? [])).toStrictEqual([
                "",
                "",
                "",
                "",
            ]);
        }
    );

    it("uses same-save boundaries for readings entered before their same-time repot", () => {
        expect.hasAssertions();

        const sameSave = { save: "repot-save", setup: 2 };
        const history = [
            row(0, "Water", "", { setup: 2 }),
            row(1, "Weigh", 999, { setup: 2 }),
            row(2, "Water", "", sameSave),
            row(2, "Weigh", 500, sameSave),
            row(2, "Repot", "", sameSave),
            row(3, "Weigh", 480, { setup: 2 }),
        ];

        expect(calculate(history, 2)).toStrictEqual([
            [
                "Days since watering",
                "Current · 2026-09-03",
                "",
                "",
            ],
            [
                0,
                500,
                "",
                "",
            ],
            [
                1,
                480,
                "",
                "",
            ],
        ]);
    });

    it("withholds an invalid-date repot boundary and excludes an invalid-date weight", () => {
        expect.hasAssertions();

        const invalidWeight = row(1, "Weigh", 999);
        invalidWeight[0] = new Date(NaN);

        expect(
            calculate([
                row(0, "Water"),
                row(0, "Weigh", 200),
                invalidWeight,
            ])[1]
        ).toStrictEqual([
            0,
            200,
            "",
            "",
        ]);

        const invalidRepot = row(1, "Repot");
        invalidRepot[0] = new Date(NaN);

        expect(
            calculate([
                row(0, "Water"),
                row(0, "Weigh", 200),
                invalidRepot,
            ])[1]
        ).toStrictEqual([
            "",
            "",
            "",
            "",
        ]);
    });

    it("runs the actual integrated custom function with native and sparse History rows", () => {
        expect.hasAssertions();

        installReadOnlyServices(globals);
        const run = comparisonApi(globals);
        const history = [
            [],
            ...nativeHistory([
                row(0, "Water"),
                row(0, "Weigh", 200),
                row(1, "Weigh", 190),
            ]),
        ];
        const result = run(history, "P01", 1);

        expect(Array.from(result[1] ?? [])).toStrictEqual([
            0,
            200,
            "",
            "",
        ]);
        expect(Array.from(result[2] ?? [])).toStrictEqual([
            1,
            190,
            "",
            "",
        ]);
    });

    it("runs the generated Apps Script wrapper with native dates and workbook labels", () => {
        expect.hasAssertions();

        const generated = cycleComparisonAppsScriptSource();

        expect(generated).not.toMatch(/\d_\d|\.toSorted\(|\.toReversed\(/v);

        vm.runInContext(
            "Array.prototype.toSorted = undefined; Array.prototype.toReversed = undefined;",
            context
        );
        vm.runInContext(generated, context);
        const exported = /** @type {Record<string, unknown>} */ (context);
        installReadOnlyServices(exported);
        const run = comparisonApi(exported);
        const nativeRows = nativeHistory([
            row(0, "Water"),
            row(0, "Weigh", 200),
        ]);
        const result = run(nativeRows, "P01", 1);

        expect(Array.from(result[1] ?? [])).toStrictEqual([
            0,
            200,
            "",
            "",
        ]);
    });
});
