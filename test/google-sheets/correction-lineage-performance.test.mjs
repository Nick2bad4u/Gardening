import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

/**
 * @typedef {{
 *     index: number;
 *     id: string;
 *     corrects: string;
 *     plant: string;
 *     event: string;
 *     setup: number;
 *     active: boolean;
 * }} Lineage
 */

const sourceUrl = new URL(
    "../../scripts/google-sheets/plant-tracker.gs",
    import.meta.url
);
const source = readFileSync(sourceUrl, "utf8");
const context = vm.createContext({ Map, Set });
vm.runInContext(source, context, { filename: fileURLToPath(sourceUrl) });
const api =
    /**
     * @type {{
     *     correctionRecordContext_: (records: Lineage[]) => {
     *         order: number[];
     *         superseded: Set<number>;
     *     };
     * }}
     */ (/** @type {unknown} */ (context));

/** @param {{ order: number[]; superseded: Set<number> }} result */
function normalizedContext(result) {
    const superseded = Array.from(result.superseded);
    return {
        order: [...result.order],
        superseded: superseded.toSorted((a, b) => a - b),
    };
}

/**
 * Original resolver retained as a bounded equivalence oracle. Large-chain
 * regressions below use expected behavior, not this quadratic implementation.
 *
 * @param {Lineage[]} records
 */
function originalContext(records) {
    /** @type {Map<string, Lineage | null>} */
    const byId = new Map();
    for (const item of records)
        if (item.id) byId.set(item.id, byId.has(item.id) ? null : item);
    const superseded = new Set();
    const order = records.map((item) => {
        const ancestors = [];
        const visited = new Set([item]);
        let original = item;
        while (original.corrects) {
            const previous = byId.get(original.corrects);
            if (
                !previous ||
                visited.has(previous) ||
                previous.active ||
                previous.plant !== item.plant ||
                previous.event !== item.event ||
                previous.setup !== item.setup
            )
                return item.index;
            ancestors.push(previous.index);
            visited.add(previous);
            original = previous;
        }
        if (item.active) for (const index of ancestors) superseded.add(index);
        return original.index;
    });
    return { order, superseded };
}

/** @param {number} index @param {Partial<Lineage>} [changes] @returns {Lineage} */
function record(index, changes = {}) {
    return {
        active: false,
        corrects: index ? `observation-${index - 1}` : "",
        event: "Weigh",
        id: `observation-${index}`,
        index,
        plant: "P01",
        setup: 1,
        ...changes,
    };
}

describe("correction lineage resolution at full capacity", () => {
    it("resolves 50,000 ancestors iteratively and marks only removed ancestors", () => {
        expect.hasAssertions();

        const records = Array.from({ length: 50_000 }, (_, index) =>
            record(index, { active: index === 49_999 })
        );
        const result = api.correctionRecordContext_(records);

        expect(result.order.every((index) => index === 0)).toBe(true);
        expect(result.superseded.size).toBe(49_999);
        expect(result.superseded.has(0)).toBe(true);
        expect(result.superseded.has(49_998)).toBe(true);
        expect(result.superseded.has(49_999)).toBe(false);
        expect(records[0]?.active).toBe(false);
        expect(records.at(-1)?.active).toBe(true);
    });

    it("resolves reverse input order without recursion and retains original indices", () => {
        expect.hasAssertions();

        const records = Array.from({ length: 50_000 }, (_, index) =>
            record(index, { active: index === 49_999 })
        ).toReversed();
        const result = api.correctionRecordContext_(records);

        expect(result.order.every((index) => index === 0)).toBe(true);
        expect(result.superseded.size).toBe(49_999);
        expect(result.superseded.has(49_999)).toBe(false);
    });

    it("resolves active forks sharing a long removed chain", () => {
        expect.hasAssertions();

        const removed = Array.from({ length: 25_000 }, (_, index) =>
            record(index)
        );
        const forks = Array.from({ length: 25_000 }, (_, index) =>
            record(index + 25_000, {
                active: true,
                corrects: "observation-24999",
            })
        );
        const result = api.correctionRecordContext_([...forks, ...removed]);

        expect(result.order.every((index) => index === 0)).toBe(true);
        expect(result.superseded.size).toBe(25_000);
        expect(result.superseded.has(24_999)).toBe(true);
        expect(result.superseded.has(25_000)).toBe(false);
    });

    it.each([
        { active: true },
        { id: "" },
        { corrects: "missing" },
        { plant: "P02" },
        { event: "Water" },
        { setup: 2 },
    ])("preserves invalid-parent boundaries for %j", (changes) => {
        expect.hasAssertions();

        const records = [
            record(0),
            record(1, changes),
            record(2),
            record(3, { active: true }),
        ];

        const reversed = records.toReversed();

        expect(
            normalizedContext(api.correctionRecordContext_(records))
        ).toStrictEqual(normalizedContext(originalContext(records)));
        expect(
            normalizedContext(api.correctionRecordContext_(reversed))
        ).toStrictEqual(normalizedContext(originalContext(reversed)));
    });

    it("preserves cycles, descendants of cycles, duplicate IDs, and valid independent roots", () => {
        expect.hasAssertions();

        const records = [
            record(0, { corrects: "observation-1" }),
            record(1, { corrects: "observation-0" }),
            record(2, { active: true }),
            record(3, { corrects: "", id: "duplicate" }),
            record(4, { corrects: "", id: "duplicate" }),
            record(5, { active: true, corrects: "duplicate" }),
            record(6, { corrects: "" }),
            record(7, { active: true }),
            record(8, { corrects: "observation-8" }),
            record(9, { active: true }),
        ];

        const reversed = records.toReversed();

        expect(
            normalizedContext(api.correctionRecordContext_(records))
        ).toStrictEqual(normalizedContext(originalContext(records)));
        expect(
            normalizedContext(api.correctionRecordContext_(reversed))
        ).toStrictEqual(normalizedContext(originalContext(reversed)));
    });

    it("keeps physical ordering for a cyclic ancestry without superseding its removed records", () => {
        expect.hasAssertions();

        const records = [
            record(0, { corrects: "observation-1" }),
            record(1, { corrects: "observation-0" }),
            record(2, { active: true, corrects: "observation-1" }),
            record(3, { corrects: "" }),
            record(4, { active: true }),
        ];
        const reversed = records.toReversed();

        expect(
            normalizedContext(api.correctionRecordContext_(records))
        ).toStrictEqual({
            order: [
                0,
                1,
                2,
                3,
                3,
            ],
            superseded: [3],
        });
        expect(
            normalizedContext(api.correctionRecordContext_(reversed))
        ).toStrictEqual({
            order: [
                3,
                3,
                2,
                1,
                0,
            ],
            superseded: [3],
        });
    });

    it("matches the original resolver across deterministic mixed valid and malformed graphs", () => {
        expect.hasAssertions();

        for (let sample = 0; sample < 80; sample += 1) {
            const records = Array.from({ length: 35 }, (_, index) => {
                const choice = (sample * 17 + index * 13) % 23;
                return record(index, {
                    active: choice % 5 === 0,
                    corrects:
                        choice < 4
                            ? ""
                            : `observation-${(index * 7 + sample) % 39}`,
                    event: choice % 11 === 0 ? "Water" : "Weigh",
                    id: choice === 1 ? "duplicate" : `observation-${index}`,
                    plant: choice % 7 === 0 ? "P02" : "P01",
                    setup: choice % 13 === 0 ? 2 : 1,
                });
            });

            const reversed = records.toReversed();

            expect(
                normalizedContext(api.correctionRecordContext_(records))
            ).toStrictEqual(normalizedContext(originalContext(records)));
            expect(
                normalizedContext(api.correctionRecordContext_(reversed))
            ).toStrictEqual(normalizedContext(originalContext(reversed)));
        }
    });
});
