import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

import { appsScriptApi } from "../helpers/apps-script-api.mjs";
import { required } from "../helpers/required.mjs";

const source = readFileSync(
    new URL("../../scripts/google-sheets/plant-tracker.gs", import.meta.url),
    "utf8"
);
const epoch = 46_000;
/**
 * @param {number} day @param {number | string} grams @param {string} [event]
 * @param {string} [id]
 */
const record = (day, grams, event = "Weigh", id = "P01") => [
    epoch + day,
    id,
    event,
    "Routine",
    grams,
    1,
    "",
    "",
    "Active",
    "",
    "Measured",
    "Scale",
];
/** @param {(string | number)[][]} history @param {string} [id] */
function run(history, id = "P01") {
    const context = vm.createContext({ console, Date, Map, Set });
    vm.runInContext(source, context);
    const result = appsScriptApi(context).GARDEN_DRY_DOWN(history, [[id]])[0];
    if (!result) throw new Error("Missing plant result");
    return structuredClone(result);
}
const plateau = () => [
    record(-1, 100),
    record(0, "", "Water"),
    ...[
        [0, 200],
        [2, 170],
        [4, 145],
        [6, 125],
        [8, 112],
        [9, 111],
        [10, 110.5],
        [12, 110],
    ].map(([d, w]) => record(Number(d), Number(w))),
];

describe("recent measured weights and inspection timing", () => {
    it("uses signed changes, a weight mean and time-weighted losses with unequal intervals", () => {
        expect.hasAssertions();

        const result = run([
            record(0, "", "Water"),
            record(0, 200),
            record(1, 180),
            record(5, 160),
        ]);

        expect(result.slice(16, 21)).toStrictEqual([
            -20,
            5,
            180,
            -20,
            8,
        ]);
        expect(result[14]).toBe("");
    });

    it("keeps missing three-reading metrics blank rather than averaging fewer points", () => {
        expect.hasAssertions();

        expect(
            run([record(0, "", "Water"), record(0, 100)]).slice(16, 21)
        ).toStrictEqual([
            "",
            "",
            "",
            "",
            "",
        ]);
        expect(
            run([
                record(0, "", "Water"),
                record(0, 100),
                record(2, 98),
            ]).slice(16, 21)
        ).toStrictEqual([
            -2,
            1,
            "",
            "",
            "",
        ]);
    });

    it("uses the final equal-time measurement and excludes estimates and removed records", () => {
        expect.hasAssertions();

        const removed = record(3, 10);
        removed[8] = "Removed";
        const estimated = record(4, 5);
        estimated[10] = "Estimated";

        expect(
            run([
                record(0, "", "Water"),
                record(0, 100),
                record(2, 90),
                record(2, 95),
                removed,
                estimated,
            ]).slice(16, 21)
        ).toStrictEqual([
            -5,
            2.5,
            "",
            "",
            "",
        ]);
    });

    it("resets comparisons at watering and at a new pot setup", () => {
        expect.hasAssertions();

        const reset = record(6, 300);
        reset[5] = 2;

        expect(
            run([
                record(0, "", "Water"),
                record(0, 100),
                record(2, 90),
                record(4, "", "Water"),
                record(4, 110),
            ]).slice(16, 21)
        ).toStrictEqual([
            "",
            "",
            "",
            "",
            "",
        ]);
        expect(
            run([
                record(0, "", "Water"),
                record(0, 100),
                record(2, 90),
                reset,
            ]).slice(16, 21)
        ).toStrictEqual([
            "",
            "",
            "",
            "",
            "",
        ]);
    });

    it("recognizes a sustained plateau above the old reference without replacing that reference", () => {
        expect.hasAssertions();

        const result = run(plateau());

        expect(result[2]).toBe(100);
        expect(result[7]).toBe(epoch + 12);
        expect(result[14]).toBe(epoch + 12);
        expect(result[10]).toContain("plateau");
        expect(result[15]).toContain("not proof of dryness");
    });

    it("scales plateau evidence with each pot rather than using one gram per day", () => {
        expect.hasAssertions();

        const history = plateau().map((r) =>
            r.map((v, index) =>
                index === 4 && typeof v === "number" ? v * 20 : v
            )
        );

        expect(run(history)[21]).toContain("sustained plateau");
        expect(Number(run(history)[20])).toBeGreaterThan(1);
    });

    it("withholds automatic dates for partial watering and missing dry references", () => {
        expect.hasAssertions();

        const partial = plateau();
        const water = required(partial[1]);

        water[9] = "Spot / partial";

        expect(run(partial)[14]).toBe("");
        expect(run(plateau().slice(1))[14]).toBe("");
    });

    it("keeps species-specific manual decisions even with a plateau", () => {
        expect.hasAssertions();

        for (const id of ["P21", "P28"]) {
            const history = plateau().map((r) =>
                r.map((v, i) => (i === 1 ? id : v))
            );

            expect(run(history, id)[14]).toBe("");
        }

        expect(
            run(
                plateau().map((r) => r.map((v, i) => (i === 1 ? "P28" : v))),
                "P28"
            )[21]
        ).toBe("Leaf-cycle check only");
    });

    it("does not call an unchanged heavy pot a dry plateau without an earlier decline", () => {
        expect.hasAssertions();

        expect(
            run([
                record(-1, 100),
                record(0, "", "Water"),
                ...[
                    0,
                    2,
                    4,
                    6,
                    8,
                    9,
                    10,
                    12,
                ].map((d) => record(d, 200)),
            ])[21]
        ).not.toContain("Inspect now");
    });

    it("withholds dates after a gain and preserves signed gain metrics", () => {
        expect.hasAssertions();

        const history = plateau();
        history.push(record(14, 120));
        const result = run(history);

        expect(result[14]).toBe("");
        expect(result[16]).toBe(10);
        expect(result[17]).toBe(-5);
    });

    it("recognizes a crossed reference even below the exponential model floor", () => {
        expect.hasAssertions();

        const result = run([
            record(-1, 100),
            record(0, "", "Water"),
            record(0, 200),
            record(2, 140),
            record(5, 90),
        ]);

        expect(result[7]).toBe(epoch + 5);
        expect(result[2]).toBe(100);
        expect(result[10]).toContain("reference reached");
    });
});
