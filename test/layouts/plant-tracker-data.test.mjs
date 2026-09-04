import { describe, expect, it } from "vitest";

import {
    calculateSummary,
    isActiveHistoryEvent,
} from "../../docs/layouts/plant-tracker-data.js";

function observation({
    date,
    height = "",
    method = "Ruler",
    potSetup = 1,
    quality = "Measured",
    saveGroup = "",
    status = "",
    weight = "",
    width = "",
    weightState = "Routine",
}) {
    return {
        Date: date,
        Event: height === "" && width === "" ? "Weigh" : "Measure",
        "Height (cm)": height,
        "Measurement method": method,
        "Observation quality": quality,
        "Pot setup": potSetup,
        "Record status": status,
        "Save group / batch ID": saveGroup,
        "Weight (g)": weight,
        "Weight state": weightState,
        "Width (cm)": width,
    };
}

describe("measured-only growth analytics", () => {
    it("excludes estimate-only and blank-quality dimensions", () => {
        const summary = calculateSummary([
            observation({
                date: "2026-01-01",
                height: 10,
                method: "Estimated visually",
                quality: "Estimated",
                width: 8,
            }),
            observation({
                date: "2026-02-01",
                height: 11,
                method: "Estimated from photo",
                quality: "Measured",
                width: 9,
            }),
            observation({
                date: "2026-03-01",
                height: 12,
                quality: "",
                width: 10,
            }),
        ]);

        expect(summary.heightSeries).toEqual([]);
        expect(summary.widthSeries).toEqual([]);
        expect(summary.heightChange).toBeNull();
        expect(summary.widthMonthlyRate).toBeNull();
    });

    it("requires two eligible readings for a trend", () => {
        const summary = calculateSummary([
            observation({
                date: "2026-01-01",
                height: 10,
                width: 8,
            }),
        ]);

        expect(summary.heightSeries).toHaveLength(1);
        expect(summary.widthSeries).toHaveLength(1);
        expect(summary.heightChange).toBeNull();
        expect(summary.heightMonthlyRate).toBeNull();
        expect(summary.widthChange).toBeNull();
        expect(summary.widthMonthlyRate).toBeNull();
    });

    it("calculates height and width trends from two measured readings", () => {
        const summary = calculateSummary([
            observation({
                date: "2026-01-01",
                height: 10,
                width: 8,
            }),
            observation({
                date: "2026-01-31",
                height: 13,
                width: 6,
            }),
        ]);

        expect(summary.heightSeries.map(({ value }) => value)).toEqual([
            10,
            13,
        ]);
        expect(summary.widthSeries.map(({ value }) => value)).toEqual([8, 6]);
        expect(summary.heightChange).toBe(3);
        expect(summary.heightMonthlyRate).toBeCloseTo(3.04375);
        expect(summary.widthChange).toBe(-2);
        expect(summary.widthMonthlyRate).toBeCloseTo(-2.0291667);
    });

    it("ignores estimated points mixed between measured readings", () => {
        const estimated = observation({
            date: "2026-01-16",
            height: 100,
            method: "Estimated visually",
            quality: "Estimated",
            width: 100,
        });
        const events = [
            observation({
                date: "2026-01-01",
                height: 10,
                width: 8,
            }),
            estimated,
            observation({
                date: "2026-01-31",
                height: 13,
                width: 9,
            }),
        ];
        const summary = calculateSummary(events);

        expect(summary.heightSeries.map(({ event }) => event)).not.toContain(
            estimated
        );
        expect(summary.heightSeries.map(({ value }) => value)).toEqual([
            10,
            13,
        ]);
        expect(summary.widthSeries.map(({ value }) => value)).toEqual([8, 9]);
        expect(events).toContain(estimated);
    });

    it("includes corrected ruler readings but no other corrected methods", () => {
        const correctedRuler = observation({
            date: "2026-02-01",
            height: 12,
            method: "Ruler",
            quality: "Corrected",
            width: 9,
        });
        const summary = calculateSummary([
            observation({
                date: "2026-01-01",
                height: 10,
                width: 8,
            }),
            correctedRuler,
            observation({
                date: "2026-03-01",
                height: 50,
                method: "Tape measure",
                quality: "Corrected",
                width: 50,
            }),
            observation({
                date: "2026-04-01",
                height: 60,
                method: "Estimated from photo",
                quality: "Corrected",
                width: 60,
            }),
        ]);

        expect(summary.heightSeries.map(({ value }) => value)).toEqual([
            10,
            12,
        ]);
        expect(summary.widthSeries.map(({ value }) => value)).toEqual([8, 9]);
        expect(summary.heightSeries.at(-1).event).toBe(correctedRuler);
    });

    it("excludes removed measured readings", () => {
        const summary = calculateSummary([
            observation({
                date: "2026-01-01",
                height: 10,
                width: 8,
            }),
            observation({
                date: "2026-02-01",
                height: 40,
                status: "Removed",
                width: 40,
            }),
        ]);

        expect(summary.heightSeries.map(({ value }) => value)).toEqual([10]);
        expect(summary.widthSeries.map(({ value }) => value)).toEqual([8]);
        expect(summary.heightChange).toBeNull();
        expect(summary.widthChange).toBeNull();
    });

    it("leaves weight analytics independent of growth-quality metadata and excludes removed weights", () => {
        const summary = calculateSummary([
            observation({
                date: "2026-01-01",
                method: "Estimated visually",
                quality: "Estimated",
                weight: 300,
            }),
            observation({
                date: "2026-01-02",
                quality: "",
                weight: 320,
            }),
            observation({
                date: "2026-01-03",
                status: "Removed",
                weight: 340,
            }),
        ]);

        expect(summary.weightSeries.map(({ value }) => value)).toEqual([
            300,
            320,
        ]);
        expect(summary.latestWeightValue).toBe(320);
        expect(summary.previousWeightValue).toBe(300);
        expect(summary.weightChange).toBe(20);
        expect(summary.weightMovingAverage).toBe(310);
    });

    it("infers current-setup Dry, Wet, and Routine states from weight extrema", () => {
        const summary = calculateSummary([
            observation({
                date: "2026-01-01",
                potSetup: 1,
                weight: 200,
                weightState: "Dry",
            }),
            observation({
                date: "2026-02-01",
                potSetup: 2,
                weight: 350,
                weightState: "Dry",
            }),
            observation({
                date: "2026-02-02",
                potSetup: 2,
                weight: 325,
                weightState: "Wet",
            }),
            observation({
                date: "2026-02-03",
                potSetup: 2,
                weight: 300,
                weightState: "Wet",
            }),
        ]);

        expect(summary.activePotSetup).toBe(2);
        expect(
            summary.weightSeries.map(({ value, state }) => [value, state])
        ).toEqual([
            [350, "Wet"],
            [325, "Routine"],
            [300, "Dry"],
        ]);
        expect(summary.dryAverage).toBe(300);
        expect(summary.wetAverage).toBe(350);
        expect(summary.capacity).toBe(50);
        expect(summary.baselineStatus).toBe("Ready");
    });

    it("treats a lone same-save watering weight as Wet and another lone weight as Routine", () => {
        const watered = calculateSummary([
            observation({
                date: "3/1/2026 12:00 PM",
                saveGroup: "round-1",
                weight: 410,
            }),
            {
                Date: "3/1/2026 12:00 PM",
                Event: "Water",
                "Pot setup": 1,
                "Save group / batch ID": "round-1",
            },
        ]);
        const unwatered = calculateSummary([
            observation({ date: "2026-03-02", weight: 390 }),
        ]);

        expect(watered.weightSeries[0]?.state).toBe("Wet");
        expect(watered.dryAverage).toBe(410);
        expect(watered.wetAverage).toBe(410);
        expect(watered.baselineStatus).toBe("Provisional");
        expect(unwatered.weightSeries[0]?.state).toBe("Routine");
        expect(unwatered.wetAverage).toBeNull();
    });

    it("keeps removed observations in history input but excludes their care analytics", () => {
        const originalWater = {
            Date: "8/13/2026 10:00 AM",
            Event: "Water",
            "Nutrients used": "Yes",
            "Pot setup": 1,
            "Record status": "",
        };
        const removedDuplicate = {
            Date: "8/20/2026 10:00 AM",
            Event: "Water",
            "Nutrients used": "Yes",
            "Pot setup": 1,
            "Record status": "Removed",
        };
        const events = [originalWater, removedDuplicate];

        const summary = calculateSummary(events);

        expect(events).toContain(removedDuplicate);
        expect(isActiveHistoryEvent(originalWater)).toBe(true);
        expect(isActiveHistoryEvent(removedDuplicate)).toBe(false);
        expect(summary.watering.events.map(({ event }) => event)).toEqual([
            originalWater,
        ]);
        expect(summary.lastWater).toBe(originalWater);
        expect(summary.eventCounts.nutrients).toBe(1);
    });
});
