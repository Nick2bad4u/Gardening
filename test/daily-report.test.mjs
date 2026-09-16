import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { groupFor, renderReport } from "../scripts/build-daily-report.mjs";
import { rewriteCollectionPreviews } from "../scripts/collection-previews.mjs";
import {
    instant,
    signed,
    validateReport,
    weightChange,
} from "../scripts/daily-report-model.mjs";

/** @typedef {import("../types/daily-report.d.ts").DailyReport} DailyReport */
/** @typedef {import("../types/daily-report.d.ts").ReportPot} ReportPot */
/** @typedef {import("../types/daily-report.d.ts").ReportPhoto} ReportPhoto */

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

/** @type {ReportPhoto} */
const photo = {
    alt: "Synthetic plant with a visible inner leaf pair",
    caption: "Exact crop; no retouching.",
    capturedAt: "2026-09-14T15:00:00-04:00",
    findings: ["An inner leaf pair is visible."],
    height: 720,
    imageUrl: "https://i.gyazo.com/0123456789abcdef0123456789abcdef.png",
    limitations:
        "An image cannot establish leaf firmness or root-zone moisture.",
    pageUrl: "https://gyazo.com/0123456789abcdef0123456789abcdef",
    width: 360,
};
// eslint-disable-next-line no-script-url -- Deliberately unsafe input verifies that photo links reject executable protocols.
const unsafeScriptUrl = "javascript:alert(1)";

/** @param {DailyReport} report @param {string} id */
function pot(report, id) {
    const result = report.pots.find((entry) => entry.id === id);
    if (result === undefined) throw new Error(`Missing fixture pot: ${id}`);
    return result;
}

describe("daily report evidence", () => {
    it.each(["width", "height"])(
        "requires a real positive integer photo %s",
        (dimension) => {
            expect.hasAssertions();

            for (const invalid of [
                undefined,
                null,
                0,
                -1,
                1.5,
                Infinity,
                NaN,
                "360",
                Number.MAX_SAFE_INTEGER + 1,
            ]) {
                const report = {
                    ...sample,
                    pots: sample.pots.map((candidate) =>
                        candidate.id === "P28"
                            ? {
                                  ...candidate,
                                  photos: [{ ...photo, [dimension]: invalid }],
                              }
                            : candidate
                    ),
                };

                expect(() => validateReport(report)).toThrow(
                    `photo.${dimension}`
                );
            }
        }
    );

    it("accepts optional photo evidence without changing care categories", () => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        pot(report, "P28").photos = [structuredClone(photo)];

        expect(validateReport(report)).toBe(report);
        expect(pot(report, "P28").action).toBe("check");
        expect(validateReport(sample)).toBe(sample);
    });

    it.each([
        unsafeScriptUrl,
        // eslint-disable-next-line sdl/no-insecure-url, sonarjs/no-clear-text-protocols, unicorn/prefer-https -- Negative fixture verifies that photo links require HTTPS.
        "http://i.gyazo.com/0123456789abcdef0123456789abcdef.png",
        "https://i.gyazo.com.evil.example/0123456789abcdef0123456789abcdef.png",
        "https://user@i.gyazo.com/0123456789abcdef0123456789abcdef.png",
        "https://i.gyazo.com:443/0123456789abcdef0123456789abcdef.png",
        "https://i.gyazo.com/0123456789abcdef0123456789abcdef.svg",
        "https://i.gyazo.com/0123456789abcdef0123456789abcdef.png?redirect=evil",
        "https://i.gyazo.com/../0123456789abcdef0123456789abcdef.png",
        "https://i.gyazo.com/0123456789abcdef0123456789abcdef.png\n",
    ])("rejects unsafe or noncanonical image URL: %s", (imageUrl) => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        pot(report, "P28").photos = [{ ...photo, imageUrl }];

        expect(() => validateReport(report)).toThrow("safe Gyazo capture");
    });

    it.each([
        "https://gyazo.com/ffffffffffffffffffffffffffffffff",
        "https://gyazo.com.evil.example/0123456789abcdef0123456789abcdef",
        "https://user@gyazo.com/0123456789abcdef0123456789abcdef",
        "https://gyazo.com:443/0123456789abcdef0123456789abcdef",
        unsafeScriptUrl,
    ])("requires the matching safe capture page: %s", (pageUrl) => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        pot(report, "P28").photos = [{ ...photo, pageUrl }];

        expect(() => validateReport(report)).toThrow("safe Gyazo capture");
    });

    it.each([
        "https://photos.app.goo.gl/Synthetic123",
        "https://photos.google.com/share/synthetic-id?key=synthetic_key",
    ])("accepts canonical original share links: %s", (originalUrl) => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        pot(report, "P28").photos = [{ ...photo, originalUrl }];

        expect(validateReport(report)).toBe(report);
    });

    it.each([
        "https://photos.app.goo.gl.evil.example/Synthetic123",
        "https://user@photos.app.goo.gl/Synthetic123",
        "https://photos.app.goo.gl:443/Synthetic123",
        "https://photos.app.goo.gl/Synthetic123?redirect=evil",
        "https://photos.google.com/share/synthetic?key=synthetic&redirect=evil",
        unsafeScriptUrl,
    ])("rejects unsafe original share links: %s", (originalUrl) => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        pot(report, "P28").photos = [{ ...photo, originalUrl }];

        expect(() => validateReport(report)).toThrow("safe Google Photos");
    });

    it.each([
        "2026-02-30T12:00:00Z",
        "2026-09-14T15:00:00",
        "not a date",
    ])("rejects ambiguous photo dates: %s", (capturedAt) => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        pot(report, "P28").photos = [{ ...photo, capturedAt }];

        expect(() => validateReport(report)).toThrow("photo.capturedAt");
    });

    it("rejects photo evidence beyond the reviewed source cutoff", () => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        pot(report, "P28").photos = [
            { ...photo, capturedAt: report.generatedAt },
        ];

        expect(() => validateReport(report)).toThrow(
            "newer than its source read"
        );
    });

    it("requires findings and limitations and avoids duplicate capture evidence", () => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        const candidate = pot(report, "P28");
        candidate.photos = [{ ...photo, findings: [] }];

        expect(() => validateReport(report)).toThrow("findings");

        candidate.photos = [{ ...photo, limitations: " " }];

        expect(() => validateReport(report)).toThrow("limitations");

        candidate.photos = [photo, photo];

        expect(() => validateReport(report)).toThrow("unique within a pot");
    });

    it("renders accessible photos, dates, findings and limitations as escaped text", () => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        const hostile = '<img src="x" onerror="alert(1)">';
        pot(report, "P28").photos = [
            {
                ...photo,
                alt: hostile,
                caption: hostile,
                findings: [hostile],
                limitations: hostile,
                originalUrl: "https://photos.app.goo.gl/Synthetic123",
            },
        ];
        const html = renderReport(validateReport(report), template, profiles);

        expect(html).toContain('aria-label="Photo observations for G3"');
        expect(html).toContain(`href="${photo.imageUrl}"`);
        expect(html).toContain(
            'src="https://thumb.gyazo.com/thumb/960/0123456789abcdef0123456789abcdef.png"'
        );
        expect(html).toContain(`datetime="${photo.capturedAt}"`);
        expect(html).toContain(
            `width="${photo.width}" height="${photo.height}"`
        );
        expect(html).toContain(
            'loading="lazy" decoding="async" referrerpolicy="no-referrer"'
        );
        expect(html).toContain("Photo-only limits:");
        expect(html).toContain("Open full photo ↗");
        expect(html).toContain("Original photo ↗");
        expect(html).toContain(
            "&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;"
        );
        expect(html).not.toContain(hostile);
        expect(renderReport(sample, template, profiles)).not.toContain(
            'class="pot-photos"'
        );
    });

    it("publishes report photos through local responsive previews without fetching full-resolution images", () => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        pot(report, "P28").photos = [photo];
        const source = renderReport(validateReport(report), template, profiles);
        const previews = new Map([
            [
                "0123456789abcdef0123456789abcdef",
                [
                    {
                        path: "assets/collection-previews/synthetic.w320.webp",
                        width: 320,
                    },
                    {
                        path: "assets/collection-previews/synthetic.w960.webp",
                        width: 960,
                    },
                ],
            ],
        ]);
        const published = rewriteCollectionPreviews(source, previews, "../");

        expect(published).toContain(
            'src="../assets/collection-previews/synthetic.w960.webp"'
        );
        expect(published).toContain(
            'srcset="../assets/collection-previews/synthetic.w320.webp 320w, ../assets/collection-previews/synthetic.w960.webp 960w"'
        );
        expect(published).toContain(`href="${photo.imageUrl}"`);
        expect(published).toContain(`href="${photo.pageUrl}"`);
        expect(published).not.toContain(`src="${photo.imageUrl}"`);
        expect(published).not.toContain("thumb.gyazo.com");
        expect(published).toContain(
            `width="${photo.width}" height="${photo.height}"`
        );
        expect(published).toContain(
            'sizes="(max-width: 760px) calc(100vw - 74px), 480px" loading="lazy"'
        );
        expect(() =>
            rewriteCollectionPreviews(source, new Map(), "../")
        ).toThrow("Missing published collection preview");
    });

    it.each([
        [],
        [" ".repeat(3)],
        [42],
        "A plain string instead of paragraphs",
        null,
    ])("rejects a malformed AI assessment: %j", (aiRecommendation) => {
        expect.hasAssertions();

        expect(() => validateReport({ ...sample, aiRecommendation })).toThrow(
            /ai.?recommendation/iv
        );
    });

    it("separates reference-only pots from plateau-confirmed watering", () => {
        expect.hasAssertions();

        const watering = sample.pots.filter(
            (entry) => entry.action === "water"
        );

        expect(watering).toHaveLength(2);
        expect(
            watering.filter((entry) => groupFor(entry) === "reference")
        ).toHaveLength(0);
        expect(
            watering.filter((entry) => groupFor(entry) === "both")
        ).toHaveLength(1);
        expect(
            watering.filter((entry) => groupFor(entry) === "plateau")
        ).toHaveLength(1);
        expect(pot(sample, "P21").action).toBe("weigh");
        expect(weightChange(pot(sample, "P21"))).toBeNull();
        expect(pot(sample, "P28").action).toBe("check");
        expect(pot(sample, "P08").action).toBe("reference");
        expect(pot(sample, "P08").mixId).toBeNull();
        expect(groupFor(pot(sample, "P08"))).toBe("reference");
    });

    it.each(["not-supported", "unavailable"])(
        "rejects watering when plateau evidence is %s",
        (plateau) => {
            expect.hasAssertions();

            const report = structuredClone(sample);
            const candidate = pot(report, "P08");
            candidate.action = "water";
            candidate.mixId = "msu";
            candidate.plateau = /** @type {ReportPot["plateau"]} */ (plateau);

            expect(() => validateReport(report)).toThrow(
                "Watering requires a confirmed plateau"
            );
        }
    );

    it("requires a current-cycle reference hit without a mix for reference-only pots", () => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        const candidate = pot(report, "P08");
        candidate.mixId = "msu";

        expect(() => validateReport(report)).toThrow("Only watering actions");

        candidate.mixId = null;
        candidate.dryReferenceGrams = null;

        expect(() => validateReport(report)).toThrow(
            "reaching the dry reference"
        );

        candidate.dryReferenceGrams = 1000;
        candidate.previous = null;
        candidate.cycleStartedAt = "2026-09-14T22:00:00Z";

        expect(() => validateReport(report)).toThrow("current cycle");

        candidate.cycleStartedAt = "2026-08-26T16:22:00-04:00";
        candidate.plateau = "confirmed";

        expect(() => validateReport(report)).toThrow(
            "without a confirmed plateau"
        );
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
    it("renders the authored AI assessment last without changing main actions", () => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        report.aiRecommendation = [
            'AI exception to the main list: C2 remains unconfirmed. <script>alert("x")</script>',
        ];
        const html = renderReport(validateReport(report), template, profiles);

        expect(html.indexOf('id="ai-recommendation"')).toBeGreaterThan(
            html.indexOf("Nothing today:</strong> B3")
        );
        expect(html).toContain("AI exception to the main list: C2");
        expect(html).toContain(
            "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
        );
        expect(html).not.toContain('<script>alert("x")</script>');
        expect(html).toContain("Dry reference only:</strong> C2");
        expect(html).toContain("MSU · 0.75 g/gal:</strong> A1, A3");
    });

    it("shows an honest notice for older inputs without an AI assessment", () => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        delete report.aiRecommendation;
        const html = renderReport(validateReport(report), template, profiles);

        expect(html).toContain(
            "An AI assessment was not recorded for this saved report."
        );
        expect(html).not.toContain("I would water");
    });

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
        expect(html).toContain("Dry reference only:</strong> C2");
        expect(html).toContain("MSU · 0.75 g/gal:</strong> A1, A3");
        expect(html).not.toContain("A1, A3, C2");
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
        report.aiRecommendation = [
            "Live review was unavailable; I cannot make an evidence-based care recommendation.",
        ];
        const html = renderReport(validateReport(report), template, profiles);

        expect(html).toContain("Review unavailable");
        expect(html).toContain("Not determined — incomplete review");
        expect(html).not.toContain(
            "No watering candidates with a confirmed plateau today"
        );
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

    it("keeps a reference-only report out of Water, mixes, and Nothing today", () => {
        expect.hasAssertions();

        const report = structuredClone(sample);
        report.pots = [structuredClone(pot(sample, "P08"))];
        report.totalPots = 1;
        report.mixes = [];
        const html = renderReport(validateReport(report), template, profiles);

        expect(html).toContain("Water:</strong> None");
        expect(html).toContain("Dry reference only:</strong> C2");
        expect(html).toContain("No watering mix to prepare");
        expect(html).not.toContain("Nothing today:</strong> C2");
        expect(html).not.toContain("Watering mix</dt>");
    });
});
