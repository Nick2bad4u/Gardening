import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

import {
    appsScriptApi,
    overrideAppsScript,
} from "../helpers/apps-script-api.mjs";
import { finiteNumber, required } from "../helpers/required.mjs";
import { installerValues } from "../helpers/sheet-values.mjs";

const sourceUrl = new URL(
    "../../scripts/google-sheets/plant-tracker.gs",
    import.meta.url
);
const source = fs.readFileSync(sourceUrl, "utf8");
function runtime() {
    const context = vm.createContext({ console, Date, Map, Set });
    vm.runInContext(source, context, { filename: fileURLToPath(sourceUrl) });
    return appsScriptApi(context);
}
/**
 * @typedef {{
 *     id?: string;
 *     state?: string;
 *     setup?: number;
 *     request?: string;
 *     batch?: string;
 *     removed?: boolean;
 *     application?: string;
 *     quality?: string;
 *     method?: string;
 * }} HistoryOptions
 */
/**
 * @typedef {{
 *     method: string;
 *     name?: string;
 *     args?: (number | undefined)[];
 *     value?: string | number | boolean | string[][];
 *     after?: number;
 *     count?: number;
 * }} InstallerCall
 */
const epoch = 46_000;
const row = (
    /** @type {number} */ day,
    /** @type {string} */ event,
    /** @type {number | string} */ weight = "",
    /** @type {HistoryOptions} */ options = {}
) => [
    epoch + day,
    options.id ?? "P01",
    event,
    options.state ?? "Routine",
    weight,
    options.setup ?? 1,
    options.request ?? "",
    options.batch ?? "",
    options.removed === true ? "Removed" : "Active",
    options.application ?? "",
    options.quality ?? "Measured",
    options.method ?? "Scale",
];
const weight = (
    /** @type {number} */ day,
    /** @type {string | number | undefined} */ grams = "",
    /** @type {HistoryOptions} */ options = {}
) => row(day, "Weigh", grams, options);
function completed(
    start = 0,
    decay = 0.2,
    /** @type {HistoryOptions} */ options = {}
) {
    const end = Math.log(21) / decay;
    return [
        row(start, "Water", "", options),
        ...[
            0,
            end / 4,
            end / 2,
            (end * 3) / 4,
            end,
        ].map((day) =>
            weight(start + day, 95 + 105 * Math.exp(-decay * day), options)
        ),
    ];
}
function current(
    start = 20,
    days = [0],
    decay = 0.2,
    /** @type {HistoryOptions} */ options = {}
) {
    return [
        row(start, "Water", "", options),
        ...days.map((day) =>
            weight(start + day, 95 + 105 * Math.exp(-decay * day), options)
        ),
    ];
}
/**
 * @param {unknown} history
 */
function model(history, id = "P01", context = runtime()) {
    const values = context.GARDEN_DRY_DOWN(history, [[id]])[0];
    const [
        plant,
        setup,
        dry,
        wet,
        count,
        learned,
        loss,
        date,
        early,
        late,
        basis,
        readiness,
        review,
        fit,
    ] = required(values);
    return {
        basis,
        count,
        date,
        dry,
        early,
        fit,
        late,
        learned,
        loss,
        plant,
        readiness,
        review,
        setup,
        wet,
    };
}

describe("dry-down formulas and workbook installation", () => {
    /**
     * @param {{
     *     conflict?: string;
     *     existingColumns?: boolean | "first" | "blank";
     * }} [options]
     */
    function installerFixture({ conflict = "", existingColumns = false } = {}) {
        const context = runtime();
        /** @type {InstallerCall[]} */
        const calls = [];
        const plants = [{ id: "P22" }, { id: "P19" }];
        const sheets = new Map(
            ["Baselines", "Dashboard"].map((name) => {
                const firstColumn = name === "Baselines" ? 35 : 22;
                let columns =
                    existingColumns === "first"
                        ? firstColumn
                        : existingColumns === false
                          ? firstColumn - 1
                          : firstColumn + 1;
                const sheet = {
                    autoResizeRows: (/** @type {number[]} */ ...args) => {
                        calls.push({ args, method: "autoResizeRows", name });
                    },
                    getMaxColumns: () => columns,
                    getMaxRows: () => 100,
                    getRange: (
                        /** @type {(number | undefined)[]} */ ...args
                    ) => {
                        const range = {
                            getFormulas: () => [
                                ["", ""],
                                [
                                    name === "Dashboard" &&
                                    conflict === "formula"
                                        ? '=IF(TRUE,"",1)'
                                        : "",
                                    "",
                                ],
                                ["", ""],
                            ],
                            getValues: () => {
                                const values = [
                                    [
                                        "Recommended water date",
                                        "Watering guidance",
                                    ],
                                    ["", ""],
                                    ["", ""],
                                ];
                                if (name === "Dashboard" && conflict) {
                                    required(values[0])[0] =
                                        conflict === "header"
                                            ? "Owner notes"
                                            : "";
                                    if (conflict === "body")
                                        required(values[1])[0] = "Keep this";
                                }
                                return installerValues(
                                    values,
                                    args[3],
                                    existingColumns === "blank"
                                );
                            },
                        };
                        for (const method of [
                            "setValues",
                            "setNotes",
                            "setBackground",
                            "setFontColor",
                            "setFontWeight",
                            "setWrap",
                            "setNumberFormat",
                            "setVerticalAlignment",
                        ]) {
                            Reflect.set(
                                range,
                                method,
                                (
                                    /**
                                     * @type {string
                                     *     | number
                                     *     | boolean
                                     *     | string[][]}
                                     */ value
                                ) => {
                                    calls.push({ args, method, name, value });
                                    return range;
                                }
                            );
                        }
                        return range;
                    },
                    insertColumnsAfter: (
                        /** @type {number} */ after,
                        /** @type {number} */ count
                    ) => {
                        calls.push({
                            after,
                            count,
                            method: "insertColumnsAfter",
                            name,
                        });
                        columns += count;
                    },
                    setColumnWidth: (/** @type {number[]} */ ...args) => {
                        calls.push({ args, method: "setColumnWidth", name });
                    },
                };
                return [name, sheet];
            })
        );
        context.SpreadsheetApp = {
            flush: () => {
                calls.push({ method: "flush" });
            },
            openById: () => ({
                getSheetByName: (/** @type {string} */ name) =>
                    sheets.get(name),
            }),
        };
        overrideAppsScript(context, "workbookPlantRecords_", () => plants);
        overrideAppsScript(context, "installDryDownLearning", () => {
            calls.push({ method: "installDryDownLearning" });
            return {
                baselineColumns: 36,
                historyChanged: false,
                loggerVersion: "test",
                plants: plants.length,
            };
        });
        return { calls, context };
    }

    it("shares measured-only formula eligibility while preserving all weight values", () => {
        expect.hasAssertions();

        const context = runtime();
        const eligibility = context.measuredDimensionCondition_();

        expect(eligibility).toContain('="measured"');
        expect(eligibility).toContain('="corrected"');
        expect(eligibility).toContain('="ruler"');
        expect(eligibility).toContain('"estimat")=FALSE');

        const remeasure = context.remeasureStatusFormula_(24);

        expect(remeasure).toContain("$A24");
        expect(remeasure.match(/IFNA\(MAX/gv)).toHaveLength(2);
        expect(remeasure).toContain(
            'IF(lastMeasured>0,"Current","No measurement")'
        );

        const charts = context.appPlantChartsFormula_();

        expect(charts).toContain(eligibility);
        expect(charts).toContain("History!E2:E5000");
        expect(charts).toContain('History!AJ2:AJ5000<>"Removed"');
        expect(context.plantChartHelperFormula_("P02")).toContain(
            'B2:B5000="P02"'
        );
    });

    it.each(
        /** @type {const} */ ([
            false,
            true,
            "blank",
            "first",
        ])
    )(
        "appends or refreshes only the derived water columns using each displayed row's ID (existing: %s)",
        (existingColumns) => {
            expect.hasAssertions();

            const { calls, context } = installerFixture({ existingColumns });

            expect(
                structuredClone(context.installWateringRecommendations())
            ).toStrictEqual({
                historyChanged: false,
                loggerVersion: "5.18.3",
                plants: 2,
            });

            const writes = calls.filter((call) => call.method === "setValues");

            expect(
                structuredClone(writes.map(({ args, name }) => [name, args]))
            ).toStrictEqual([
                [
                    "Baselines",
                    [
                        1,
                        35,
                        1,
                        2,
                    ],
                ],
                [
                    "Baselines",
                    [
                        2,
                        35,
                        2,
                        2,
                    ],
                ],
                [
                    "Dashboard",
                    [
                        6,
                        22,
                        1,
                        2,
                    ],
                ],
                [
                    "Dashboard",
                    [
                        7,
                        22,
                        2,
                        2,
                    ],
                ],
            ]);

            const baselineFormulas = writtenCells(required(writes[1]));
            const dashboardFormulas = writtenCells(required(writes[3]));

            expect(required(baselineFormulas[0])[0]).toContain("XLOOKUP($A2,");
            expect(required(baselineFormulas[1])[1]).toContain(
                "'Dry-down models'!$P$2:$P$31"
            );
            expect(required(dashboardFormulas[1])[0]).toContain("XLOOKUP($B8,");
            expect(calls.some((call) => call.name === "History")).toBe(false);
            expect(
                calls.filter((call) => call.method === "insertColumnsAfter")
            ).toHaveLength(
                existingColumns === true || existingColumns === "blank" ? 0 : 2
            );
        }
    );

    it.each([
        "header",
        "body",
        "formula",
    ])(
        "refuses every write if either destination contains owner content (%s)",
        (conflict) => {
            expect.hasAssertions();

            const { calls, context } = installerFixture({
                conflict,
                existingColumns: true,
            });

            expect(() => context.installWateringRecommendations()).toThrow(
                "Unexpected Dashboard column 22"
            );
            expect(structuredClone(calls)).toStrictEqual([]);
        }
    );

    it("installs a single hidden model spill and only replaces forecast-related Baselines cells", () => {
        expect.hasAssertions();

        const context = runtime();
        /** @type {InstallerCall[]} */
        const calls = [];
        const makeSheet = (/** @type {string} */ name) => ({
            autoResizeRows: (/** @type {number[]} */ ...args) => {
                calls.push({ args, method: "autoResizeRows", name });
            },
            getMaxColumns: () => 40,
            getMaxRows: () => 100,
            getRange: (/** @type {number[]} */ ...args) => {
                const range = {};
                for (const method of [
                    "setValues",
                    "clearContent",
                    "setFormula",
                    "setNumberFormat",
                    "setNote",
                    "setNotes",
                    "setWrap",
                ]) {
                    Reflect.set(
                        range,
                        method,
                        (
                            /** @type {string | number | boolean | string[][]} */ value
                        ) => {
                            calls.push({ args, method, name, value });
                            return range;
                        }
                    );
                }
                return range;
            },
            hideSheet: () => {
                calls.push({ method: "hideSheet", name });
            },
        });
        const sheets = new Map([["Baselines", makeSheet("Baselines")]]);
        const spreadsheet = {
            getSheetByName: (/** @type {string} */ name) => sheets.get(name),
            insertSheet: (/** @type {string} */ name) => {
                const sheet = makeSheet(name);
                sheets.set(name, sheet);
                return sheet;
            },
        };
        context.SpreadsheetApp = {
            flush: () => {
                calls.push({ method: "flush" });
            },
            openById: () => spreadsheet,
        };
        overrideAppsScript(context, "workbookPlantRecords_", () => [
            { id: "P01", name: "Plant 1" },
        ]);

        expect(context.installDryDownLearning()).toMatchObject({
            baselineColumns: 36,
            historyChanged: false,
            loggerVersion: "5.18.3",
            plants: 1,
        });
        expect(
            structuredClone(
                calls
                    .filter(
                        (c) =>
                            c.name === "Baselines" && c.method === "setValues"
                    )
                    .map((c) => required(c.args)[1])
            )
        ).toStrictEqual([
            9,
            10,
            12,
            19,
            21,
            23,
            25,
            31,
            32,
            33,
            34,
        ]);
        expect(calls.filter((c) => c.method === "setFormula")).toHaveLength(1);
        expect(
            calls
                .filter((c) => c.method === "clearContent")
                .every((c) => c.name === "Dry-down models")
        ).toBe(true);
        expect(calls.some((c) => c.name === "History")).toBe(false);
        expect(calls).toContainEqual({
            args: [2, 1],
            method: "autoResizeRows",
            name: "Baselines",
        });
        expect(required(calls.at(-1)).method).toBe("flush");

        context.refreshDryDownModels_(spreadsheet);

        expect(sheets.size).toBe(2);
    });
});

describe("same-setup cycle learning", () => {
    it("weights learned timing by recency and rejects a zero-information prior", () => {
        expect.hasAssertions();

        const context = runtime();

        expect(structuredClone(context.dryDownPrior_([], 60))).toStrictEqual({
            log: 0,
            spread: 0,
        });
        expect(
            structuredClone(
                context.dryDownPrior_([{ decay: 0.2, ended: 60, fit: 0 }], 60)
            )
        ).toStrictEqual({ log: 0, spread: 0 });

        const prior = context.dryDownPrior_(
            [
                { decay: 0.1, ended: 0, fit: 1 },
                { decay: 0.2, ended: 60, fit: 1 },
            ],
            60
        );

        expect(prior.log).toBeCloseTo((Math.log(0.1) + 2 * Math.log(0.2)) / 3);
        expect(prior.spread).toBeGreaterThan(0);
    });

    it("adds a conditional water date that follows the learned curve without a fabricated drought delay", () => {
        expect.hasAssertions();

        const context = runtime();
        const history = [...completed(), ...current()];
        const before = structuredClone(history);
        const first = required(context.GARDEN_DRY_DOWN(history, "P01")[0]);

        expect(first[14]).toBe(Math.ceil(finiteNumber(first[7])));
        expect(first[15]).toContain("confirm readiness first");
        expect(first[15]).toContain("No fixed extra dry days");

        const updated = required(
            context.GARDEN_DRY_DOWN(
                [
                    ...completed(),
                    ...current(
                        20,
                        [
                            0,
                            1,
                            2,
                            3,
                            4,
                            5,
                        ],
                        0.3
                    ),
                ],
                "P01"
            )[0]
        );

        expect(updated[14]).toBeLessThan(finiteNumber(first[14]));
        expect(updated[14]).toBe(Math.ceil(finiteNumber(updated[7])));
        expect(structuredClone(history)).toStrictEqual(before);
    });

    it("does not schedule tropical or leaf-replacement plants from a near-dry pot forecast", () => {
        expect.hasAssertions();

        const context = runtime();
        for (const id of ["P21", "P28"]) {
            const values = context.GARDEN_DRY_DOWN(
                [
                    ...completed(0, 0.2, { id }),
                    ...current(20, [0], 0.2, { id }),
                ],
                id
            )[0];

            expect(required(values)[7]).not.toBe("");
            expect(required(values)[14]).toBe("");
            expect(required(values)[15]).toMatch(/inner-leaf|upper 2 in/v);
        }

        expect(context.wateringRecommendation_("unknown", {}).date).toBe("");
        expect(context.wateringReadinessGuidance_("P22")).toContain(
            "active growth"
        );

        for (const id of ["P20", "P30"]) {
            expect(context.wateringReadinessGuidance_(id)).toContain(
                "every component"
            );
        }
    });

    it("withholds a water date with unsupported, partial, removed, or reset cycle data", () => {
        expect.hasAssertions();

        const context = runtime();
        const cases = [
            [],
            [weight(-1, 100), ...current(0, [0, 1])],
            [
                ...completed(),
                ...current(20, [0], 0.2, { application: "Partial" }),
            ],
            [...completed(), ...current(20, [0], 0.2, { setup: 2 })],
            [...completed(0, 0.2, { removed: true }), ...current()],
        ];
        for (const history of cases) {
            const values = context.GARDEN_DRY_DOWN(history, "P01")[0];

            expect(required(values)[14]).toBe("");
            expect(required(values)[15]).toContain("Confirm the root zone");
        }
    });

    it("uses a completed cycle immediately after the next wet anchor, without changing History", () => {
        expect.hasAssertions();

        const history = [...completed(), ...current()];
        const before = structuredClone(history);
        const result = model(history);

        expect(result).toMatchObject({
            basis: "Historical estimate",
            count: 1,
            dry: 100,
            learned: 1,
            review: "No current-cycle alert",
            wet: 200,
        });
        expect(result.loss).toBeCloseTo(21);
        expect(result.date).toBeCloseTo(epoch + 20 + Math.log(10.5) / 0.2);
        expect(result.early).toBeLessThan(finiteNumber(result.date));
        expect(result.late).toBeGreaterThan(finiteNumber(result.date));
        expect(structuredClone(history)).toStrictEqual(before);
        expect(required(runtime().GARDEN_DRY_DOWN(history, "P01")[0])[10]).toBe(
            "Historical estimate"
        );
    });

    it("still needs four current readings over three days when there is no learned cycle", () => {
        expect.hasAssertions();

        const prewater = [weight(-1, 100)];

        expect(model([...prewater, ...current(0, [0])]).date).toBe("");
        expect(
            model([
                ...prewater,
                ...current(
                    0,
                    [
                        0,
                        1,
                        2,
                    ]
                ),
            ]).basis
        ).toBe("Need 4 post-water weights");

        const result = model([
            ...prewater,
            ...current(
                0,
                [
                    0,
                    1,
                    2,
                    3,
                ]
            ),
        ]);

        expect(result).toMatchObject({
            basis: "Current-cycle curve",
            count: 4,
            learned: 0,
            readiness: "Current cycle supported",
        });
        expect(result.loss).toBeCloseTo(
            0.2 * (finiteNumber(result.wet) - 95) * Math.exp(-0.6)
        );
        expect(
            model([
                ...prewater,
                ...current(
                    0,
                    [
                        0,
                        0.2,
                        0.4,
                        0.6,
                    ]
                ),
            ]).date
        ).toBe("");
    });

    it("blends sparse new evidence then lets six reliable current readings take over", () => {
        expect.hasAssertions();

        const sparse = model([...completed(), ...current(20, [0, 1], 0.4)]);
        const residual = 105 * Math.exp(-0.4);

        expect(sparse.basis).toBe("Blended historical estimate");
        expect(finiteNumber(sparse.loss) / residual).toBeGreaterThan(0.2);
        expect(finiteNumber(sparse.loss) / residual).toBeLessThan(0.4);
        expect(sparse.review).toBe("No current-cycle alert");

        const supported = model([
            ...completed(),
            ...current(
                20,
                [
                    0,
                    1,
                    2,
                    3,
                ],
                0.4
            ),
        ]);

        expect(supported.basis).toBe("Current curve + history");
        expect(supported.review).toBe("Faster than learned — reweigh");

        const mature = model([
            ...completed(),
            ...current(
                20,
                [
                    0,
                    1,
                    2,
                    3,
                    4,
                    5,
                ],
                0.4
            ),
        ]);

        expect(mature.basis).toBe("Current-cycle curve");
        expect(finiteNumber(mature.loss) / (105 * Math.exp(-2))).toBeCloseTo(
            0.4
        );
    });

    it("resets learning and anchors at a new whole-pot setup", () => {
        expect.hasAssertions();

        const result = model([
            ...completed(),
            row(19, "Repot", "", { setup: 2 }),
            ...current(20, [0], 0.2, { setup: 2 }),
        ]);

        expect(result).toMatchObject({
            basis: "Need a completed dry cycle",
            date: "",
            dry: "",
            learned: 0,
            setup: 2,
            wet: 200,
        });
    });

    it("isolates plants, excludes removed/estimated weights, and ignores non-Weigh numbers", () => {
        expect.hasAssertions();

        const history = [
            ...completed(0, 0.2, { id: "P02" }),
            ...current(),
            weight(21, 1, { removed: true, setup: 9 }),
            weight(22, 1, { quality: "Estimated" }),
            weight(23, 1, { method: "Estimated from photo" }),
            row(24, "Check", 1),
        ];

        expect(model(history)).toMatchObject({
            count: 1,
            date: "",
            dry: "",
            learned: 0,
            setup: 1,
        });
        expect(model([], "P09")).toMatchObject({
            basis: "Need a watering",
            plant: "P09",
        });
        expect(
            runtime().GARDEN_DRY_DOWN(history, [[""], ["P01"]])
        ).toHaveLength(1);
    });

    it.each(["before", "after"])(
        "handles a same-save Weigh %s Water without borrowing the next wet reading",
        (order) => {
            expect.hasAssertions();

            const old = completed();
            const water = row(20, "Water", "", { request: "next-save" });
            const wet = weight(20, 200, { request: "next-save" });
            const result = model([
                ...old,
                ...(order === "before" ? [wet, water] : [water, wet]),
            ]);

            expect(result).toMatchObject({
                count: 1,
                dry: 100,
                learned: 1,
                wet: 200,
            });
        }
    );

    it("accepts a wet anchor at exactly five days but not later or across the next Water", () => {
        expect.hasAssertions();
        expect(
            model([
                ...completed(),
                row(20, "Water"),
                weight(25, 200),
            ]).wet
        ).toBe(200);
        expect(
            model([
                ...completed(),
                row(20, "Water"),
                weight(25.01, 200),
            ])
        ).toMatchObject({
            basis: "Need a wet weight within 5 days",
            date: "",
            wet: "",
        });

        const result = model([
            row(0, "Water"),
            row(2, "Water"),
            weight(2.1, 200),
        ]);

        expect(result).toMatchObject({ count: 1, learned: 0, wet: 200 });
    });

    it.each(["Partial", "Spot"])(
        "does not train or forecast normal full cycles from %s watering",
        (application) => {
            expect.hasAssertions();
            expect(
                model([
                    ...completed(),
                    ...current(20, [0], 0.2, { application }),
                ])
            ).toMatchObject({
                basis: "Partial / spot watering — reweigh",
                date: "",
            });
            expect(
                model([...completed(0, 0.2, { application }), ...current()])
                    .learned
            ).toBe(0);
            expect(
                model([
                    ...completed(),
                    ...current(20, [0], 0.2, { application }),
                    ...current(40),
                ]).learned
            ).toBe(0);
        }
    );

    it("requires a reliable completed cycle and does not silently use history against conflicting current data", () => {
        expect.hasAssertions();

        const sparse = completed().filter(
            (_, index) => index !== 2 && index !== 3
        );

        expect(model([...sparse, ...current()]).learned).toBe(0);

        const gain = [
            ...completed(),
            ...current(20, [0, 1]),
            weight(22, 220),
            weight(23, 150),
        ];

        expect(model(gain)).toMatchObject({
            basis: "Current cycle differs — reweigh",
            date: "",
            review: "Unexpected gain — check setup",
        });
        expect(
            model([
                ...completed(),
                ...current(20, [0]),
                weight(21, 200),
                weight(22, 200),
                weight(23, 200),
            ]).date
        ).toBe("");
    });

    it("favors recent curves, limits training to five cycles, and ages out 180-day-old cycles", () => {
        expect.hasAssertions();

        const rows = [
            ...completed(0, 0.1),
            ...completed(50, 0.3),
            ...current(70),
        ];
        const result = model(rows);

        expect(result.learned).toBe(2);
        expect(finiteNumber(result.loss) / 105).toBeGreaterThan(
            Math.sqrt(0.1 * 0.3)
        );
        expect(finiteNumber(result.loss) / 105).toBeLessThan(0.3);

        const many = Array.from({ length: 7 }, (_, i) =>
            completed(i * 20)
        ).flat();

        expect(model([...many, ...current(140)]).learned).toBe(5);
        expect(model([...completed(), ...current(220)]).learned).toBe(0);
    });

    it("does not count repeated identical timestamps as independent curve evidence", () => {
        expect.hasAssertions();

        const history = [
            weight(-1, 100),
            ...current(0, [0]),
            weight(1, 180),
            weight(1, 180),
            weight(1, 180),
            weight(1, 180),
        ];

        expect(model(history)).toMatchObject({ count: 2, date: "" });
    });
});

describe("dry-down numeric and calendar safeguards", () => {
    it.each([
        undefined,
        "46270",
        NaN,
        Infinity,
        0,
        -1,
    ])(
        "withholds malformed model dates instead of creating an invalid calendar value: %s",
        (date) => {
            expect.hasAssertions();
            expect(
                structuredClone(
                    runtime().wateringRecommendation_("P01", {
                        basis: "Unsupported model",
                        date,
                    })
                )
            ).toStrictEqual({
                date: "",
                guidance: expect.stringContaining("Unsupported model"),
            });
        }
    );

    it("validates input and curve edge cases without NaN or fabricated dates", () => {
        expect.hasAssertions();

        const context = runtime();
        const empty = context.fitDryDownCurve_([], 100, 5);

        expect(empty).toMatchObject({ count: 0, decay: 0 });
        expect(
            context.fitDryDownCurve_(
                [
                    { date: 1, weight: 100 },
                    { date: 3, weight: 90 },
                ],
                100,
                5
            ).decay
        ).toBe(0);
        expect(
            context.fitDryDownCurve_(
                [
                    { date: 1, weight: 200 },
                    { date: 2, weight: 200 },
                    { date: 3, weight: 200 },
                ],
                100,
                5
            ).fit
        ).toBe(0);
        expect(
            model([
                ...completed(),
                ...current(20, [0]),
                weight(21, "bad"),
                weight(22, 0),
                weight(23, -1),
                weight(NaN, 9),
            ]).count
        ).toBe(1);
        expect(model([weight(-1, 199), ...current(0)]).basis).toBe(
            "Recheck wet / dry anchors"
        );
    });

    it("rejects negligible completed dry-downs and excessively distant predictions", () => {
        expect.hasAssertions();

        const tiny = [
            row(0, "Water"),
            weight(0, 200),
            weight(1, 199),
            weight(2, 198),
            weight(3, 197),
            ...current(20),
        ];

        expect(model(tiny).learned).toBe(0);

        const slow = [
            weight(-1, 100),
            ...current(
                0,
                [
                    0,
                    1,
                    2,
                    3,
                ],
                0.001
            ),
        ];

        expect(model(slow)).toMatchObject({
            basis: "Forecast too uncertain — reweigh",
            date: "",
        });

        const rapid = [
            weight(-1, 100),
            ...current(
                0,
                [
                    0,
                    1,
                    2,
                    3,
                ],
                0.4
            ),
        ];

        expect(model(rapid).review).toBe("Rapid loss — reweigh");
    });

    it("preserves local calendar dates and safely formats bootstrap forecast windows", () => {
        expect.hasAssertions();

        const context = runtime();
        let offset = "-0400";
        context.Utilities = {
            formatDate: (date, _zone, /** @type {string} */ pattern) =>
                pattern === "Z" ? offset : date.toISOString().slice(0, 10),
        };
        const midnight = new Date("2026-09-04T04:30:00Z");

        expect(
            context.dryDownSerialDate_(midnight, "America/New_York")
        ).toBeCloseTo(46_269 + 30 / 1440);

        offset = "+0530";

        expect(
            context.dryDownSerialDate_(
                new Date("2026-09-03T19:00:00Z"),
                "Asia/Kolkata"
            )
        ).toBeCloseTo(46_269 + 30 / 1440);
        expect(context.dryDownSerialDate_("bad date", "UTC")).toBe(0);
        expect(context.dryDownSerialDate_("", "UTC")).toBe(0);

        offset = "unavailable";

        expect(context.dryDownSerialDate_(midnight, "UTC")).toBeCloseTo(
            midnight.getTime() / 86_400_000 + 25_569
        );

        offset = "+0000";
        const toCanonical = (
            /** @type {import("../logger-fixtures.d.ts").CellValue[]} */ input
        ) => {
            const record = Array.from(
                { length: 42 },
                () =>
                    /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                        ""
                    )
            );
            record[0] = new Date(
                (finiteNumber(input[0]) - 25_569) * 86_400_000
            );
            for (const [i, column] of [
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
            ].entries()) {
                record[column] = input[i + 1];
            }
            return record;
        };
        const canonical = [...completed(), ...current()].map(toCanonical);
        const result = context.dryDownModelsFromHistory_(
            canonical,
            [["P01"], ["P02"]],
            "UTC"
        );

        expect(required(result.get("P01")).window).toContain(
            "Overdue — reweigh"
        );
        expect(required(result.get("P01")).basis).toContain("1 learned cycle");
        expect(required(result.get("P02")).window).toBe("");

        const multipleCycles = [
            ...completed(),
            ...completed(20),
            ...current(40),
        ].map(toCanonical);

        expect(
            required(
                context
                    .dryDownModelsFromHistory_(multipleCycles, [["P01"]], "UTC")
                    .get("P01")
            ).basis
        ).toBe("Historical estimate · 2 learned cycles");

        for (const r of canonical) {
            r[0] = new Date(dateValue(r[0]).getTime() + 365 * 86_400_000);
        }

        expect(
            required(
                context
                    .dryDownModelsFromHistory_(canonical, [["P01"]], "UTC")
                    .get("P01")
            ).window
        ).not.toContain("Overdue");
    });
});

/** @param {unknown} value @returns {Date} */
function dateValue(value) {
    if (!(value instanceof Date)) throw new TypeError("Expected fixture date");
    return value;
}

/** @param {InstallerCall} call @returns {string[][]} */
function writtenCells(call) {
    const values = call.value;
    if (
        !Array.isArray(values) ||
        values.some(
            (row) =>
                !Array.isArray(row) ||
                row.some((value) => typeof value !== "string")
        )
    )
        throw new TypeError("Expected recorded string cells");
    return values;
}
