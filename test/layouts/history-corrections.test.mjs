import { describe, expect, it } from "vitest";

import { calculateSummary } from "../../docs/layouts/plant-tracker-data.js";

/**
 * @param {number} index
 * @param {string} id
 * @param {number} weight
 * @param {string} [corrects]
 * @param {string} [status]
 *
 * @returns {import("../../docs/layouts/plant-tracker-data.js").HistoryEvent}
 */
function weightEntry(index, id, weight, corrects = "", status = "Active") {
    return {
        _index: index,
        "Corrects observation ID": corrects,
        Date: "9/6/2026 10:00:00 AM",
        Event: "Weigh",
        "Measurement method": "Scale",
        "Observation ID": id,
        "Observation quality": "Measured",
        "Plant ID": "P01",
        "Pot setup": 1,
        "Record status": status,
        "Save group / batch ID": id,
        "Weight (g)": weight,
    };
}

describe("corrected public History ordering", () => {
    it("preserves equal-time ordering through a chain without mutating observations", () => {
        expect.hasAssertions();

        const original = weightEntry(0, "original", 400, "", "Removed");
        const later = weightEntry(1, "later", 390);
        const firstCorrection = weightEntry(
            2,
            "first",
            395,
            "original",
            "Removed"
        );
        const replacement = weightEntry(3, "replacement", 392, "first");
        const summary = calculateSummary([
            original,
            later,
            firstCorrection,
            replacement,
        ]);

        expect(summary.weightSeries.map(({ value }) => value)).toStrictEqual([
            392,
            390,
        ]);
        expect(summary.weightChange).toBe(-2);
        expect(replacement._index).toBe(3);
        expect(original["Weight (g)"]).toBe(400);
    });

    it("keeps same-save watering evidence after a weight correction", () => {
        expect.hasAssertions();

        const original = weightEntry(0, "original", 400, "", "Removed");
        const replacement = {
            ...weightEntry(3, "replacement", 405, "original"),
            "Save group / batch ID": "original",
        };
        const summary = calculateSummary([
            original,
            {
                ...weightEntry(1, "water", 0),
                Event: "Water",
                "Save group / batch ID": "original",
                "Weight (g)": "",
            },
            {
                ...weightEntry(2, "next", 395),
                Date: "9/7/2026 10:00:00 AM",
            },
            replacement,
        ]);

        expect(
            summary.weightSeries.map(({ state, value }) => [state, value])
        ).toStrictEqual([
            ["Wet", 405],
            ["Routine", 395],
        ]);
        expect(summary.wetAverage).toBe(405);
    });

    it("uses the corrected observation date before any tie order", () => {
        expect.hasAssertions();

        const summary = calculateSummary([
            weightEntry(0, "original", 400, "", "Removed"),
            weightEntry(1, "later", 390),
            {
                ...weightEntry(2, "replacement", 385, "original"),
                Date: "9/7/2026 10:00:00 AM",
            },
        ]);

        expect(summary.weightSeries.map(({ value }) => value)).toStrictEqual([
            390,
            385,
        ]);
        expect(summary.weightChange).toBe(-5);
    });

    it.each([
        {
            kind: "missing",
            originals: [weightEntry(0, "original", 400, "", "Removed")],
            target: "absent",
        },
        {
            kind: "duplicate",
            originals: [
                weightEntry(0, "original", 400, "", "Removed"),
                weightEntry(2, "original", 400, "", "Removed"),
            ],
            target: "original",
        },
        {
            kind: "cyclic",
            originals: [
                weightEntry(0, "original", 400, "replacement", "Removed"),
            ],
            target: "original",
        },
        {
            kind: "cross-plant",
            originals: [
                {
                    ...weightEntry(0, "original", 400, "", "Removed"),
                    "Plant ID": "P02",
                },
            ],
            target: "original",
        },
    ])(
        "keeps physical order when lineage is $kind",
        ({ originals, target }) => {
            expect.hasAssertions();

            const events = [
                ...originals,
                weightEntry(1, "later", 390),
                weightEntry(3, "replacement", 392, target),
            ];
            const summary = calculateSummary(events);

            expect(
                summary.weightSeries.map(({ value }) => value)
            ).toStrictEqual([390, 392]);
        }
    );
});
