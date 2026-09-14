import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { groupFor, renderReport } from "../scripts/build-daily-report.mjs";
import {
    instant,
    signed,
    validateReport,
    weightChange,
} from "../scripts/daily-report-model.mjs";

/** @typedef {import("../types/daily-report.d.ts").DailyReport} DailyReport */
/** @typedef {import("../types/daily-report.d.ts").ReportPot} ReportPot */

const sampleText = readFileSync(
    new URL("fixtures/daily-report.json", import.meta.url),
    "utf8"
);
const sample = validateReport(JSON.parse(sampleText));
const template = readFileSync(
    new URL("../scripts/templates/daily-report.html", import.meta.url),
    "utf8"
);
const profileData = /** @type {unknown} */ (
    JSON.parse(
        readFileSync(
            new URL("../docs/layouts/plant-profile-data.json", import.meta.url),
            "utf8"
        )
    )
);
const profiles = /** @type {Record<string, [string, string][]>} */ (
    profileData
);

/** @param {DailyReport} report @param {string} id */
function pot(report, id) {
    const result = report.pots.find((entry) => entry.id === id);
    if (result === undefined) throw new Error(`Missing fixture pot: ${id}`);
    return result;
}

describe("daily report evidence", () => {
    it("retains the reviewed union of reference and plateau signals", () => {
        expect.hasAssertions();

        const watering = sample.pots.filter(
            (entry) => entry.action === "water"
        );

        expect(watering).toHaveLength(3);
        expect(
            watering.filter((entry) => groupFor(entry) === "reference")
        ).toHaveLength(1);
        expect(
            watering.filter((entry) => groupFor(entry) === "both")
        ).toHaveLength(1);
        expect(
            watering.filter((entry) => groupFor(entry) === "plateau")
        ).toHaveLength(1);
        expect(pot(sample, "P21").action).toBe("weigh");
        expect(weightChange(pot(sample, "P21"))).toBeNull();
        expect(pot(sample, "P28").action).toBe("check");
    });

    it("normalizes actual elapsed time across the daylight-saving transition", () => {
        expect.hasAssertions();

        const candidate = structuredClone(pot(sample, "P01"));
        candidate.previous = { at: "2026-11-01T01:30:00-04:00", grams: 100 };
        candidate.latest = { at: "2026-11-01T01:30:00-05:00", grams: 99 };

        expect(weightChange(candidate)).toStrictEqual({
            days: 1 / 24,
            delta: -1,
            perDay: -24,
        });
        expect(signed(-0.0001, 2)).toBe("0.00");
        expect(signed(2.5, 2)).toBe("+2.5");
    });

    it.each([
        "2026-02-30T12:00:00Z",
        "2026-09-14T12:00:00",
        "not a date",
    ])("rejects an invalid or ambiguous timestamp: %s", (value) => {
        expect.hasAssertions();
        expect(() => instant(value)).toThrow("time-zone offset");
    });

    it("rejects duplicate labels and missing active pots in complete coverage", () => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        pot(report, "P03").label = "A1";

        expect(() => validateReport(report)).toThrow("unique");

        report.pots.pop();
        pot(report, "P03").label = "A3";

        expect(() => validateReport(report)).toThrow("every pot");
    });

    it("rejects a last-two comparison across the current watering boundary", () => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        pot(report, "P01").previous = {
            at: "2026-08-01T10:00:00-04:00",
            grams: 420,
        };

        expect(() => validateReport(report)).toThrow(
            "within the current cycle"
        );
    });

    it("requires plateau evidence to end at the latest eligible weight", () => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        pot(report, "P01").plateauPoints.pop();

        expect(() => validateReport(report)).toThrow("finish at the latest");
    });

    it("rejects unsupported reasons, missing mixes, and future weights", () => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        const candidate = pot(report, "P01");
        candidate.reason = "both";

        expect(() => validateReport(report)).toThrow(
            "reaching the dry reference"
        );

        candidate.reason = "plateau";
        candidate.mixId = null;

        expect(() => validateReport(report)).toThrow("one mix");

        candidate.mixId = "msu";
        candidate.latest = { at: "2026-09-15T12:00:00Z", grams: 350 };

        expect(() => validateReport(report)).toThrow(
            "newer than its source read"
        );
    });
});

describe("daily report publication", () => {
    it("renders all pots, a matching pocket list, recipes, and the corrected money-tree gap", () => {
        expect.hasAssertions();

        const html = renderReport(sample, template, profiles);

        expect(
            html.matchAll(/<details class="pot-card"/gv).toArray()
        ).toHaveLength(6);
        expect(html).toContain('id="pocket-list"');
        expect(html).toContain("MSU · 0.75 g/gal");
        expect(html).toContain("For 2 US gallons: 1.5 g");
        expect(html).toContain("Nothing today:</strong> B3");
        expect(html).toContain("before the 7:14 p.m. watering");
        expect(html).not.toContain("{{");
        expect(html).not.toContain('type="checkbox"');
        expect(renderReport(sample, template, profiles)).toBe(html);
    });

    it("escapes source text in both content and attributes", () => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        pot(report, "P01").name = 'A <script>alert("x")</script> & plant';
        const html = renderReport(report, template, profiles);

        expect(html).toContain(
            "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; plant"
        );
        expect(html).not.toContain('<script>alert("x")</script>');
    });

    it("publishes an unavailable review without claiming that no action is due", () => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        report.coverage = "unavailable";
        report.sourceReadAt = null;
        report.pots = [];
        report.mixes = [];
        report.summary =
            "Live workbook access failed; today's review is unavailable.";
        const html = renderReport(validateReport(report), template, profiles);

        expect(html).toContain("Review unavailable");
        expect(html).toContain("Not determined — incomplete review");
        expect(html).not.toContain("No watering candidates today");
        expect(html).not.toContain('class="empty-category">None');
    });

    it("keeps unresolved pots out of the no-action category", () => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        report.coverage = "partial";
        const candidate = pot(report, "P21");
        candidate.action = "unresolved";
        candidate.reason = "unresolved";
        const html = renderReport(validateReport(report), template, profiles);

        expect(html).toContain("Unresolved:</strong> #3");
        expect(html).toContain("Nothing today:</strong> B3");
        expect(() =>
            validateReport({ ...report, coverage: "complete" })
        ).toThrow("every pot");
    });
});
