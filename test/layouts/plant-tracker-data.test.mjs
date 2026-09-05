import { describe, expect, it } from "vitest";

import {
    isActiveHistoryEvent,
    calculateSummary as summarizeIndexedHistory,
} from "../../docs/layouts/plant-tracker-data.js";
import { required } from "../helpers/required.mjs";

/**
 * @param {Omit<
 *     import("../../docs/layouts/plant-tracker-data.js").HistoryEvent,
 *     "_index"
 * >[]} events
 */
function calculateSummary(events) {
    return summarizeIndexedHistory(
        events.map((event, index) => Object.assign(event, { _index: index }))
    );
}

/**
 * @param {{
 *     date: string;
 *     height?: number | string;
 *     width?: number | string;
 *     weight?: number | string;
 *     method?: string;
 *     potSetup?: number;
 *     quality?: string;
 *     saveGroup?: string;
 *     status?: string;
 *     weightState?: string;
 * }} options
 */
function observation({
    date,
    height = "",
    method = "Ruler",
    potSetup = 1,
    quality = "Measured",
    saveGroup = "",
    status = "",
    weight = "",
    weightState = "Routine",
    width = "",
}) {
    return {
        _index: 0,
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
        expect.hasAssertions();

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

        expect(summary.heightSeries).toStrictEqual([]);
        expect(summary.widthSeries).toStrictEqual([]);
        expect(summary.heightChange).toBeNull();
        expect(summary.widthMonthlyRate).toBeNull();
    });

    it("requires two eligible readings for a trend", () => {
        expect.hasAssertions();

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
        expect.hasAssertions();

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

        expect(summary.heightSeries.map(({ value }) => value)).toStrictEqual([
            10,
            13,
        ]);
        expect(summary.widthSeries.map(({ value }) => value)).toStrictEqual([
            8,
            6,
        ]);
        expect(summary.heightChange).toBe(3);
        expect(summary.heightMonthlyRate).toBeCloseTo(3.04375);
        expect(summary.widthChange).toBe(-2);
        expect(summary.widthMonthlyRate).toBeCloseTo(-2.0291667);
    });

    it("ignores estimated points mixed between measured readings", () => {
        expect.hasAssertions();

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
        expect(summary.heightSeries.map(({ value }) => value)).toStrictEqual([
            10,
            13,
        ]);
        expect(summary.widthSeries.map(({ value }) => value)).toStrictEqual([
            8,
            9,
        ]);
        expect(events).toContain(estimated);
    });

    it("includes corrected ruler readings but no other corrected methods", () => {
        expect.hasAssertions();

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

        expect(summary.heightSeries.map(({ value }) => value)).toStrictEqual([
            10,
            12,
        ]);
        expect(summary.widthSeries.map(({ value }) => value)).toStrictEqual([
            8,
            9,
        ]);
        expect(required(summary.heightSeries.at(-1)).event).toBe(
            correctedRuler
        );
    });

    it("excludes removed measured readings", () => {
        expect.hasAssertions();

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

        expect(summary.heightSeries.map(({ value }) => value)).toStrictEqual([
            10,
        ]);
        expect(summary.widthSeries.map(({ value }) => value)).toStrictEqual([
            8,
        ]);
        expect(summary.heightChange).toBeNull();
        expect(summary.widthChange).toBeNull();
    });

    it("leaves weight analytics independent of growth-quality metadata and excludes removed weights", () => {
        expect.hasAssertions();

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

        expect(summary.weightSeries.map(({ value }) => value)).toStrictEqual([
            300,
            320,
        ]);
        expect(summary.latestWeightValue).toBe(320);
        expect(summary.previousWeightValue).toBe(300);
        expect(summary.weightChange).toBe(20);
        expect(summary.weightMovingAverage).toBe(310);
    });

    it("closes only the last eligible reading before Water as Dry", () => {
        expect.hasAssertions();

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
                saveGroup: "wet-1",
                weight: 350,
            }),
            {
                Date: "2026-02-01",
                Event: "Water",
                "Pot setup": 2,
                "Save group / batch ID": "wet-1",
            },
            observation({
                date: "2026-02-02",
                potSetup: 2,
                weight: 325,
            }),
            observation({
                date: "2026-02-03",
                potSetup: 2,
                weight: 300,
            }),
            observation({
                date: "2026-02-04",
                potSetup: 2,
                saveGroup: "wet-2",
                weight: 340,
            }),
            {
                Date: "2026-02-04",
                Event: "Water",
                "Pot setup": 2,
                "Save group / batch ID": "wet-2",
            },
            observation({
                date: "2026-02-05",
                potSetup: 2,
                weight: 290,
            }),
        ]);

        expect(summary.activePotSetup).toBe(2);
        expect(
            summary.weightSeries.map(({ state, value }) => [value, state])
        ).toStrictEqual([
            [350, "Wet"],
            [325, "Routine"],
            [300, "Dry"],
            [340, "Wet"],
            [290, "Routine"],
        ]);
        expect(summary.dryAverage).toBe(300);
        expect(summary.wetAverage).toBe(345);
        expect(summary.capacity).toBe(45);
        expect(summary.baselineStatus).toBe("Ready");
    });

    it("treats a lone same-save watering weight as Wet and another lone weight as Routine", () => {
        expect.hasAssertions();

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
        expect(watered.dryAverage).toBeNull();
        expect(watered.wetAverage).toBe(410);
        expect(watered.baselineStatus).toBe("Needs a completed dry cycle");
        expect(unwatered.weightSeries[0]?.state).toBe("Routine");
        expect(unwatered.wetAverage).toBeNull();
        expect(unwatered.baselineStatus).toBe("Needs a wet weight");
    });

    it("infers only the first post-water weight within five days as Wet", () => {
        expect.hasAssertions();

        const withinWindow = calculateSummary([
            {
                Date: "8/26/2026 4:22:00 PM",
                Event: "Water",
                "Pot setup": 2,
            },
            observation({
                date: "8/27/2026 12:15:00 AM",
                potSetup: 2,
                weight: 473.5,
            }),
            observation({
                date: "8/27/2026 11:08:00 PM",
                potSetup: 2,
                weight: 434.5,
            }),
        ]);

        expect(
            withinWindow.weightSeries.map(({ state, value }) => [value, state])
        ).toStrictEqual([
            [473.5, "Wet"],
            [434.5, "Routine"],
        ]);

        const outsideWindow = calculateSummary([
            {
                Date: "8/1/2026 12:00:00 AM",
                Event: "Water",
                "Pot setup": 1,
            },
            observation({
                date: "8/6/2026 12:00:01 AM",
                weight: 400,
            }),
        ]);

        expect(outsideWindow.weightSeries[0]?.state).toBe("Routine");
        expect(outsideWindow.wetAverage).toBeNull();
    });

    it("derives one Dry endpoint per completed cycle and leaves the open cycle Routine", () => {
        expect.hasAssertions();

        const entries = [
            observation({
                date: "2026-01-11",
                saveGroup: "wet-3",
                weight: 515,
            }),
            observation({ date: "2026-01-05", weight: 450 }),
            {
                Date: "2026-01-06",
                Event: "Water",
                "Pot setup": 1,
                "Save group / batch ID": "wet-2",
            },
            observation({ date: "2026-01-10", weight: 460 }),
            observation({
                date: "2026-01-01",
                saveGroup: "wet-1",
                weight: 500,
            }),
            {
                Date: "2026-01-11",
                Event: "Water",
                "Pot setup": 1,
                "Save group / batch ID": "wet-3",
            },
            observation({ date: "2026-01-13", weight: 440 }),
            observation({
                date: "2026-01-06",
                saveGroup: "wet-2",
                weight: 510,
            }),
            {
                Date: "2026-01-01",
                Event: "Water",
                "Pot setup": 1,
                "Save group / batch ID": "wet-1",
            },
            observation({ date: "2026-01-03", weight: 470 }),
            observation({ date: "2026-01-12", weight: 490 }),
        ].map((entry, index) => ({ ...entry, _index: index }));

        const summary = calculateSummary(entries);
        const states = new Map(
            summary.weightSeries.map(({ state, value }) => [value, state])
        );

        expect(states.get(450)).toBe("Dry");
        expect(states.get(460)).toBe("Dry");
        expect(states.get(470)).toBe("Routine");
        expect(states.get(440)).toBe("Routine");
        expect(states.get(490)).toBe("Routine");
        expect([
            states.get(500),
            states.get(510),
            states.get(515),
        ]).toStrictEqual([
            "Wet",
            "Wet",
            "Wet",
        ]);
        expect(summary.drySamples).toBe(2);
        expect(summary.dryAverage).toBe(455);
        expect(summary.wetSamples).toBe(3);
        expect(summary.wetAverage).toBeCloseTo(508.333, 3);
    });

    it("uses save groups to distinguish tied Dry and Wet timestamps", () => {
        expect.hasAssertions();

        const summary = calculateSummary(
            [
                observation({
                    date: "3/1/2026 12:00 PM",
                    saveGroup: "previous-cycle",
                    weight: 300,
                }),
                observation({
                    date: "3/1/2026 12:00 PM",
                    saveGroup: "new-watering",
                    weight: 450,
                }),
                {
                    Date: "3/1/2026 12:00 PM",
                    Event: "Water",
                    "Pot setup": 1,
                    "Save group / batch ID": "new-watering",
                },
            ].map((event, index) => ({ ...event, _index: index }))
        );

        expect(
            summary.weightSeries.map(({ state, value }) => [value, state])
        ).toStrictEqual([
            [300, "Dry"],
            [450, "Wet"],
        ]);
    });

    it("keeps removed observations in history input but excludes their care analytics", () => {
        expect.hasAssertions();

        const originalWater = {
            _index: 0,
            Date: "8/13/2026 10:00 AM",
            Event: "Water",
            "Nutrients used": "Yes",
            "Pot setup": 1,
            "Record status": "",
        };
        const removedDuplicate = {
            _index: 1,
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
        expect(summary.watering.events.map(({ event }) => event)).toStrictEqual(
            [originalWater]
        );
        expect(summary.lastWater).toBe(originalWater);
        expect(summary.eventCounts.nutrients).toBe(1);
    });
});
