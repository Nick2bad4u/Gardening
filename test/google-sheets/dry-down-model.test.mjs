import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceUrl = new URL(
    "../../scripts/google-sheets/plant-tracker.gs",
    import.meta.url
);
const source = fs.readFileSync(sourceUrl, "utf8");
function runtime() {
    const context = vm.createContext({ Date, Map, Set, console });
    vm.runInContext(source, context, { filename: fileURLToPath(sourceUrl) });
    return context;
}
const epoch = 46000;
const row = (day, event, weight = "", options = {}) => [
    epoch + day,
    options.id || "P01",
    event,
    options.state || "Routine",
    weight,
    options.setup || 1,
    options.request || "",
    options.batch || "",
    options.removed ? "Removed" : "Active",
    options.application || "",
    options.quality || "Measured",
    options.method || "Scale",
];
const weight = (day, grams, options) => row(day, "Weigh", grams, options);
function completed(start = 0, decay = 0.2, options = {}) {
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
function current(start = 20, days = [0], decay = 0.2, options = {}) {
    return [
        row(start, "Water", "", options),
        ...days.map((day) =>
            weight(start + day, 95 + 105 * Math.exp(-decay * day), options)
        ),
    ];
}
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
    ] = values;
    return {
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
    };
}

describe("same-setup dry-down learning", () => {
    it("uses a completed cycle immediately after the next wet anchor, without changing History", () => {
        const history = [...completed(), ...current()];
        const before = structuredClone(history);
        const result = model(history);
        expect(result).toMatchObject({
            dry: 100,
            wet: 200,
            count: 1,
            learned: 1,
            basis: "Historical estimate",
            review: "No current-cycle alert",
        });
        expect(result.loss).toBeCloseTo(21);
        expect(result.date).toBeCloseTo(epoch + 20 + Math.log(10.5) / 0.2);
        expect(result.early).toBeLessThan(result.date);
        expect(result.late).toBeGreaterThan(result.date);
        expect(history).toEqual(before);
        expect(runtime().GARDEN_DRY_DOWN(history, "P01")[0][10]).toBe(
            "Historical estimate"
        );
    });

    it("still needs four current readings over three days when there is no learned cycle", () => {
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
            learned: 0,
            count: 4,
            basis: "Current-cycle curve",
            readiness: "Current cycle supported",
        });
        expect(result.loss).toBeCloseTo(
            0.2 * (result.wet - 95) * Math.exp(-0.6)
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
        const sparse = model([...completed(), ...current(20, [0, 1], 0.4)]);
        const residual = 105 * Math.exp(-0.4);
        expect(sparse.basis).toBe("Blended historical estimate");
        expect(sparse.loss / residual).toBeGreaterThan(0.2);
        expect(sparse.loss / residual).toBeLessThan(0.4);
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
        expect(mature.loss / (105 * Math.exp(-2))).toBeCloseTo(0.4);
    });

    it("resets learning and anchors at a new whole-pot setup", () => {
        const result = model([
            ...completed(),
            row(19, "Repot", "", { setup: 2 }),
            ...current(20, [0], 0.2, { setup: 2 }),
        ]);
        expect(result).toMatchObject({
            setup: 2,
            learned: 0,
            dry: "",
            wet: 200,
            date: "",
            basis: "Need a completed dry cycle",
        });
    });

    it("isolates plants, excludes removed/estimated weights, and ignores non-Weigh numbers", () => {
        const history = [
            ...completed(0, 0.2, { id: "P02" }),
            ...current(),
            weight(21, 1, { removed: true, setup: 9 }),
            weight(22, 1, { quality: "Estimated" }),
            weight(23, 1, { method: "Estimated from photo" }),
            row(24, "Check", 1),
        ];
        expect(model(history)).toMatchObject({
            setup: 1,
            learned: 0,
            count: 1,
            dry: "",
            date: "",
        });
        expect(model([], "P09")).toMatchObject({
            plant: "P09",
            basis: "Need a watering",
        });
        expect(
            runtime().GARDEN_DRY_DOWN(history, [[""], ["P01"]])
        ).toHaveLength(1);
    });

    it.each(["before", "after"])(
        "handles a same-save Weigh %s Water without borrowing the next wet reading",
        (order) => {
            const old = completed();
            const water = row(20, "Water", "", { request: "next-save" });
            const wet = weight(20, 200, { request: "next-save" });
            const result = model([
                ...old,
                ...(order === "before" ? [wet, water] : [water, wet]),
            ]);
            expect(result).toMatchObject({
                dry: 100,
                wet: 200,
                learned: 1,
                count: 1,
            });
        }
    );

    it("accepts a wet anchor at exactly five days but not later or across the next Water", () => {
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
            wet: "",
            date: "",
            basis: "Need a wet weight within 5 days",
        });
        const result = model([
            row(0, "Water"),
            row(2, "Water"),
            weight(2.1, 200),
        ]);
        expect(result).toMatchObject({ learned: 0, count: 1, wet: 200 });
    });

    it.each(["Partial", "Spot"])(
        "does not train or forecast normal full cycles from %s watering",
        (application) => {
            expect(
                model([
                    ...completed(),
                    ...current(20, [0], 0.2, { application }),
                ])
            ).toMatchObject({
                date: "",
                basis: "Partial / spot watering — reweigh",
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
            date: "",
            basis: "Current cycle differs — reweigh",
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
        const rows = [
            ...completed(0, 0.1),
            ...completed(50, 0.3),
            ...current(70),
        ];
        const result = model(rows);
        expect(result.learned).toBe(2);
        expect(result.loss / 105).toBeGreaterThan(Math.sqrt(0.1 * 0.3));
        expect(result.loss / 105).toBeLessThan(0.3);
        const many = Array.from({ length: 7 }, (_, i) =>
            completed(i * 20)
        ).flat();
        expect(model([...many, ...current(140)]).learned).toBe(5);
        expect(model([...completed(), ...current(220)]).learned).toBe(0);
    });

    it("does not count repeated identical timestamps as independent curve evidence", () => {
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

    it("validates input and curve edge cases without NaN or fabricated dates", () => {
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
                weight(Number.NaN, 9),
            ]).count
        ).toBe(1);
        expect(model([weight(-1, 199), ...current(0)]).basis).toBe(
            "Recheck wet / dry anchors"
        );
    });

    it("rejects negligible completed dry-downs and excessively distant predictions", () => {
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
            date: "",
            basis: "Forecast too uncertain — reweigh",
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
        const context = runtime();
        let offset = "-0400";
        context.Utilities = {
            formatDate: (date, zone, pattern) =>
                pattern === "Z" ? offset : date.toISOString().slice(0, 10),
        };
        const midnight = new Date("2026-09-04T04:30:00Z");
        expect(
            context.dryDownSerialDate_(midnight, "America/New_York")
        ).toBeCloseTo(46269 + 30 / 1440);
        offset = "+0530";
        expect(
            context.dryDownSerialDate_(
                new Date("2026-09-03T19:00:00Z"),
                "Asia/Kolkata"
            )
        ).toBeCloseTo(46269 + 30 / 1440);
        expect(context.dryDownSerialDate_("bad date", "UTC")).toBe(0);
        expect(context.dryDownSerialDate_("", "UTC")).toBe(0);
        offset = "unavailable";
        expect(context.dryDownSerialDate_(midnight, "UTC")).toBeCloseTo(
            midnight.getTime() / 86400000 + 25569
        );
        offset = "+0000";
        const toCanonical = (input) => {
            const record = new Array(42).fill("");
            record[0] = new Date((input[0] - 25569) * 86400000);
            [
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
            ].forEach((column, i) => {
                record[column] = input[i + 1];
            });
            return record;
        };
        const canonical = [...completed(), ...current()].map(toCanonical);
        const result = context.dryDownModelsFromHistory_(
            canonical,
            [["P01"], ["P02"]],
            "UTC"
        );
        expect(result.get("P01").window).toContain("Overdue — reweigh");
        expect(result.get("P01").basis).toContain("1 learned cycle");
        expect(result.get("P02").window).toBe("");
        const multipleCycles = [
            ...completed(),
            ...completed(20),
            ...current(40),
        ].map(toCanonical);
        expect(
            context
                .dryDownModelsFromHistory_(multipleCycles, [["P01"]], "UTC")
                .get("P01").basis
        ).toBe("Historical estimate · 2 learned cycles");
        canonical.forEach((r) => {
            r[0] = new Date(r[0].getTime() + 365 * 86400000);
        });
        expect(
            context
                .dryDownModelsFromHistory_(canonical, [["P01"]], "UTC")
                .get("P01").window
        ).not.toContain("Overdue");
    });

    it("installs a single hidden model spill and only replaces forecast-related Baselines cells", () => {
        const context = runtime();
        const calls = [];
        const makeSheet = (name) => ({
            getMaxColumns: () => 40,
            getMaxRows: () => 100,
            getRange: (...args) => {
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
                    range[method] = (value) => {
                        calls.push({ name, args, method, value });
                        return range;
                    };
                }
                return range;
            },
            hideSheet: () => calls.push({ name, method: "hideSheet" }),
            autoResizeRows: (...args) =>
                calls.push({ name, method: "autoResizeRows", args }),
        });
        const sheets = new Map([["Baselines", makeSheet("Baselines")]]);
        const spreadsheet = {
            getSheetByName: (name) => sheets.get(name),
            insertSheet: (name) => {
                const sheet = makeSheet(name);
                sheets.set(name, sheet);
                return sheet;
            },
        };
        context.SpreadsheetApp = {
            openById: () => spreadsheet,
            flush: () => calls.push({ method: "flush" }),
        };
        context.workbookPlantRecords_ = () => [{ id: "P01", name: "Plant 1" }];
        expect(context.installDryDownLearning()).toMatchObject({
            loggerVersion: "5.17.1",
            plants: 1,
            historyChanged: false,
            baselineColumns: 34,
        });
        expect(
            calls
                .filter(
                    (c) => c.name === "Baselines" && c.method === "setValues"
                )
                .map((c) => c.args[1])
        ).toEqual([
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
            name: "Baselines",
            method: "autoResizeRows",
            args: [2, 1],
        });
        expect(calls.at(-1).method).toBe("flush");
        context.refreshDryDownModels_(spreadsheet);
        expect(sheets.size).toBe(2);
    });
});
