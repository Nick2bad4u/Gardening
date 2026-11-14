import { describe, expect, it, onTestFinished, vi } from "vitest";

import {
    calculateSummary,
    formatRotation,
    historyCsvText,
    loadHistorySnapshot,
    parseCsv,
} from "../../docs/layouts/plant-tracker-data.js";
import { required } from "../helpers/required.mjs";

/** @typedef {import("../../docs/layouts/plant-tracker-data.js").HistoryEvent} HistoryEvent */

/** @param {Partial<HistoryEvent>} [fields] @returns {HistoryEvent} */
function rotation(fields = {}) {
    return {
        _index: 0,
        Date: "2026-09-01T10:00:00Z",
        Event: "Rotation",
        "Plant ID": "P01",
        "Pot setup": 1,
        ...fields,
    };
}

describe("public cardinal rotation history", () => {
    it.each([
        [
            "N",
            "E",
            90,
            "N (window) → E (wall) · 90° clockwise",
        ],
        [
            "E",
            "S",
            90,
            "E (wall) → S (room) · 90° clockwise",
        ],
        [
            "S",
            "W",
            90,
            "S (room) → W (Mylar) · 90° clockwise",
        ],
        [
            "W",
            "N",
            90,
            "W (Mylar) → N (window) · 90° clockwise",
        ],
        [
            "N",
            "W",
            270,
            "N (window) → W (Mylar) · 90° counterclockwise",
        ],
        [
            "W",
            "S",
            270,
            "W (Mylar) → S (room) · 90° counterclockwise",
        ],
        [
            "N",
            "S",
            180,
            "N (window) → S (room) · 180° clockwise",
        ],
        [
            "E",
            "E",
            0,
            "E (wall) → E (wall) · 0° · facing confirmed",
        ],
    ])(
        "describes %s to %s without changing stored degrees",
        (from, to, degrees, expected) => {
            expect.hasAssertions();

            const event = rotation({
                "Rotation (°)": degrees,
                "Rotation from facing": from,
                "Rotation to facing": to,
            });

            expect(formatRotation(event)).toBe(expected);
            expect(formatRotation(event, true)).toBe(expected);
            expect(event["Rotation (°)"]).toBe(degrees);
        }
    );

    it("records an unknown starting facing without inventing a 90-degree turn", () => {
        expect.hasAssertions();

        const event = rotation({
            "Rotation (°)": "",
            "Rotation from facing": "",
            "Rotation to facing": "N",
        });

        expect(formatRotation(event)).toBe(
            "Facing N (window) · previous facing not recorded"
        );
        expect(formatRotation(event, true)).toBe(formatRotation(event));
        expect(formatRotation(event)).not.toContain("90");
        expect(
            formatRotation(rotation({ "Rotation to facing": "unknown" }), true)
        ).toBe("Rotation logged · destination facing not recorded");
        expect(
            formatRotation(rotation({ "Rotation from facing": "S" }), true)
        ).toBe("Rotation logged · destination facing not recorded");
    });

    it("retains degree-only legacy descriptions, zero, and the old compact fallback", () => {
        expect.hasAssertions();

        expect(formatRotation(rotation({ "Rotation (°)": 270 }))).toBe(
            "270° clockwise-equivalent turn"
        );
        expect(formatRotation(rotation({ "Rotation (°)": 0 }))).toBe(
            "0° clockwise-equivalent turn"
        );
        expect(formatRotation(rotation({ "Rotation (°)": 0 }), true)).toBe(
            "0°"
        );
        expect(formatRotation(rotation())).toBe(
            "Rotation logged · amount not recorded"
        );
        expect(formatRotation(rotation(), true)).toBe("90°");
    });

    it("keeps correction tie ordering and excludes removed, invalid-date, and future rotations", () => {
        expect.hasAssertions();

        const original = rotation({
            "Observation ID": "original",
            "Record status": "Removed",
            "Rotation (°)": 90,
            "Rotation from facing": "N",
            "Rotation to facing": "E",
        });
        const laterLegacy = rotation({
            _index: 1,
            "Observation ID": "later",
            "Rotation (°)": 180,
        });
        const correction = rotation({
            _index: 2,
            "Corrects observation ID": "original",
            "Observation ID": "replacement",
            "Rotation (°)": 270,
            "Rotation from facing": "N",
            "Rotation to facing": "W",
        });
        const summary = calculateSummary([
            original,
            laterLegacy,
            correction,
            rotation({
                _index: 3,
                Date: "2999-09-01",
                "Rotation to facing": "E",
            }),
            rotation({ _index: 4, Date: "invalid", "Rotation to facing": "S" }),
        ]);

        expect(summary.eventCounts.rotations).toBe(2);
        expect(summary.latestRotation?.["Observation ID"]).toBe("later");
        expect(formatRotation(required(summary.latestRotation))).toBe(
            "180° clockwise-equivalent turn"
        );
        expect(correction._index).toBe(2);
        expect(original["Rotation to facing"]).toBe("E");
        expect(
            calculateSummary([original, correction]).latestRotation
        ).toMatchObject({
            "Observation ID": "replacement",
            "Rotation to facing": "W",
        });
    });

    it("exports BP/BQ after the unchanged original 67 columns and parses legacy and new rows", async () => {
        expect.hasAssertions();

        const events = [
            rotation({ "Rotation (°)": 90 }),
            rotation({
                _index: 1,
                Notes: 'Facing note, with "quotes"\nand another line',
                "Rotation (°)": 270,
                "Rotation from facing": "N",
                "Rotation to facing": "W",
            }),
            rotation({
                _index: 2,
                "Rotation (°)": "",
                "Rotation from facing": "",
                "Rotation to facing": "S",
            }),
            rotation({
                _index: 3,
                "Rotation (°)": 0,
                "Rotation from facing": "E",
                "Rotation to facing": "E",
            }),
        ];
        const csv = historyCsvText(events);
        const rows = parseCsv(csv.slice(1));
        const headers = required(rows[0]);

        expect(csv.startsWith("\u{FEFF}Date,")).toBe(true);
        expect(headers).toHaveLength(69);
        expect(headers[39]).toBe("Rotation (°)");
        expect(headers[66]).toBe("Leaf VPD source");
        expect(headers.slice(67)).toStrictEqual([
            "Rotation from facing",
            "Rotation to facing",
        ]);
        expect(rows[1]?.slice(67)).toStrictEqual(["", ""]);
        expect(rows[2]?.[8]).toBe(events[1]?.["Notes"]);
        expect(rows[2]?.slice(67)).toStrictEqual(["N", "W"]);
        expect(rows[3]?.[39]).toBe("");
        expect(rows[4]?.[39]).toBe("0");
        expect(csv).toContain(
            '"Facing note, with ""quotes""\nand another line"'
        );

        const fetch = vi.fn(() => Promise.resolve(new Response(csv.slice(1))));
        vi.stubGlobal("fetch", fetch);
        onTestFinished(() => {
            vi.unstubAllGlobals();
        });
        const snapshot = await loadHistorySnapshot();

        expect(snapshot.history).toHaveLength(4);
        expect(snapshot.history[1]).toMatchObject({
            Notes: events[1]?.["Notes"],
            "Rotation (°)": "270",
            "Rotation from facing": "N",
            "Rotation to facing": "W",
        });
        expect(formatRotation(required(snapshot.history[2]), true)).toBe(
            "Facing S (room) · previous facing not recorded"
        );
        expect(formatRotation(required(snapshot.history[3]))).toContain(
            "0° · facing confirmed"
        );

        fetch.mockResolvedValueOnce(
            new Response(
                "Date,Plant ID,Event,Rotation (°)\n2026-09-01,P01,Rotation,180"
            )
        );
        const legacy = await loadHistorySnapshot();

        expect(legacy.history).toHaveLength(1);
        expect(
            required(legacy.history[0])["Rotation to facing"]
        ).toBeUndefined();
        expect(formatRotation(required(legacy.history[0]))).toBe(
            "180° clockwise-equivalent turn"
        );
    });
});
