import { describe, expect, it } from "vitest";

import { decodeWateringSnapshot } from "../../site/client/tools/watering-map-snapshot.js";

const sourceReadAt = "2026-10-22T23:00:00.000Z";
const readAt = 1_792_710_000_000;
// October 25, three calendar days after the reviewed fallback.
const now = 1_792_944_000_000;

function snapshot() {
    return {
        observations: [
            {
                Date: "10/21/2026 7:00:00 PM",
                Event: "Water",
                "Plant ID": "P01",
                "Record status": "Active",
            },
            {
                Date: "10/22/2026 1:00:00 PM",
                Event: "Move",
                "New location": "Test shelf",
                "Plant ID": "P01",
                "Record status": "Active",
            },
        ],
        plantIds: ["P01", "P02"],
        source: "canonical-history",
        sourceReadAt,
        version: 1,
    };
}

describe("published watering fallback", () => {
    it("retains an old snapshot's actual source time and missing watering evidence", () => {
        expect.hasAssertions();

        const decoded = decodeWateringSnapshot(snapshot(), now);

        expect(decoded?.readAt).toBe(readAt);
        expect(decoded?.history).toStrictEqual(
            snapshot().observations.map((row, _index) => ({ ...row, _index }))
        );
        expect(decoded?.history.some((row) => row["Plant ID"] === "P02")).toBe(
            false
        );
    });

    it("accepts a reviewed empty history without inventing Water events", () => {
        expect.hasAssertions();
        expect(
            decodeWateringSnapshot({ ...snapshot(), observations: [] }, now)
        ).toStrictEqual({ history: [], readAt });
    });

    it.each([
        null,
        { ...snapshot(), sourceReadAt: "not a date" },
        { ...snapshot(), sourceReadAt: "2026-10-26T00:00:00Z" },
        { ...snapshot(), source: "browser-cache" },
        { ...snapshot(), version: 2 },
        { ...snapshot(), plantIds: ["P01", "P01"] },
        { ...snapshot(), plantIds: [] },
    ])("rejects malformed or incompatible snapshot metadata: %j", (value) => {
        expect.hasAssertions();
        expect(decodeWateringSnapshot(value, now)).toBeNull();
    });

    it.each([
        { "Record status": "Removed" },
        { "Plant ID": "P99" },
        { Event: "Mist" },
        { "Observation ID": "private-observation-identifier" },
    ])("rejects unsafe or unrelated fallback records: %j", (override) => {
        expect.hasAssertions();

        const value = snapshot();
        const [water] = value.observations;

        expect(
            decodeWateringSnapshot(
                { ...value, observations: [{ ...water, ...override }] },
                now
            )
        ).toBeNull();
    });
});
