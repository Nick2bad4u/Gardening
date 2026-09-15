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

    it("withholds dates for partial watering but permits observed inspection without a dry reference", () => {
        expect.hasAssertions();

        const partial = plateau();
        const water = required(partial[1]);

        water[9] = "Spot / partial";

        expect(run(partial)[14]).toBe("");
        expect(run(partial)[21]).toContain("Partial watering");
        expect(run(plateau().slice(1))[14]).toBe(epoch + 12);
        expect(run(plateau().slice(1))[2]).toBe("");
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

    it("recognizes a sustained day-four slowdown without a calendar lockout", () => {
        expect.hasAssertions();

        const history = [
            record(-1, 100),
            record(0, "", "Water"),
            ...[
                [0, 200],
                [1, 160],
                [2, 113],
                [2.75, 112],
                [3.5, 111],
                [4, 110],
            ].map(([day, grams]) => record(Number(day), Number(grams))),
        ];
        const result = run(history);

        expect(result[14]).toBe(epoch + 4);
        expect(result[21]).toContain("sustained plateau");
        expect(result[2]).toBe(100);
        expect(result[13]).not.toBe("");
    });

    it("retains reference and plateau evidence independently when both agree", () => {
        expect.hasAssertions();

        const history = plateau();
        history[0] = record(-1, 112);
        const result = run(history);

        expect(result[21]).toBe(
            "Inspect now — previous reference + sustained plateau"
        );
        expect(result[10]).toContain("Reference reached + observed plateau");
    });

    it("can inspect a reference crossing with one wet and one later measurement", () => {
        expect.hasAssertions();

        const result = run([
            record(-1, 100),
            record(0, "", "Water"),
            record(0, 200),
            record(2, 99),
        ]);

        expect(result[14]).toBe(epoch + 2);
        expect(result[21]).toContain("previous reference reached");
    });

    it("does not interpret an implausibly low new wet anchor as readiness", () => {
        expect.hasAssertions();

        const result = run([
            record(-1, 362.5),
            record(0, "", "Water"),
            record(0.01, 361.5),
            record(1, 360),
        ]);

        expect(result[14]).toBe("");
        expect(result[21]).toContain("Check wet-weight timing");
    });

    it("allows a flat tail to oscillate within the existing scale-noise allowance", () => {
        expect.hasAssertions();

        const result = run([
            record(-1, 100),
            record(0, "", "Water"),
            ...[
                [0, 200],
                [1, 180],
                [2, 150],
                [4, 110],
                [5, 109.5],
                [6, 110],
                [7, 111],
            ].map(([day, grams]) => record(Number(day), Number(grams))),
        ]);

        expect(result[21]).toContain("sustained plateau");
        expect(result[16]).toBe(1);
        expect(result[17]).toBe(-1);
    });

    it("keeps a time-spaced tail when several recent reweighs are only minutes apart", () => {
        expect.hasAssertions();

        const history = plateau();
        history.push(
            record(12.01, 110),
            record(12.02, 110),
            record(12.03, 110)
        );

        expect(run(history)[21]).toContain("sustained plateau");
    });

    it("rejects resumed rapid loss even when the long tail still looks flat", () => {
        expect.hasAssertions();

        const result = run([
            record(0, "", "Water"),
            ...[
                [0, 10_000],
                [1, 1500],
                [2, 1470],
                [4, 1410],
                [6, 1350],
                [8, 1350],
                [10, 1350],
                [11, 1310],
            ].map(([day, grams]) => record(Number(day), Number(grams))),
        ]);

        expect(result[21]).toBe(
            "No sustained plateau yet — follow weight and moisture"
        );
        expect(result[14]).toBe("");
    });

    it("keeps late current-cycle measurements useful after the wet-reference window was missed", () => {
        expect.hasAssertions();

        const result = run([
            record(0, "", "Water"),
            ...[
                [6, 180],
                [7, 160],
                [8, 140],
                [9, 130],
                [10, 111],
                [11, 110.5],
                [12, 110],
                [13, 110],
            ].map(([day, grams]) => record(Number(day), Number(grams))),
        ]);

        expect(result[3]).toBe("");
        expect(result[4]).toBe(8);
        expect(result[16]).toBe(0);
        expect(result[21]).toContain("sustained plateau");
        expect(result[14]).toBe(epoch + 13);
    });

    it("does not let drainage alone establish an earlier drying rate", () => {
        expect.hasAssertions();

        const result = run([
            record(0, "", "Water"),
            ...[
                [0, 200],
                [0.1, 112],
                [1, 111],
                [2, 111],
                [3, 110.5],
                [4, 110],
            ].map(([day, grams]) => record(Number(day), Number(grams))),
        ]);

        expect(result[21]).toBe(
            "No sustained plateau yet — follow weight and moisture"
        );
    });
});
