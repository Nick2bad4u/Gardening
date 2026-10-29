import { describe, expect, it } from "vitest";

import { getProfiles } from "../site/lib/content.mjs";
import {
    assertCareCoverage,
    getPlantCareReference,
    getPlantCareReferences,
    isPlantCareReference,
    lightComparison,
} from "../site/lib/plant-care.mjs";

/** @returns {import("../site/lib/plant-care.mjs").PlantCareReference} */
function reference() {
    return {
        light: {
            acclimation: "Change exposure gradually.",
            basis: "collection-trial",
            caution: "This is an inferred trial, not a measured optimum.",
            description: "Bright indirect light.",
            dli: [6, 10],
            startingDli: [4, 6],
        },
        moisture: {
            check: "Check the root zone.",
            regime: "Partial drying.",
            waitWhen: "The root zone remains wet.",
            waterWhen: "The mix has partly dried.",
        },
        reviewedOn: "2026-10-29",
        slug: "synthetic-plant",
        sources: [
            {
                scope: "General care only; the numeric trial is inferred.",
                title: "Example extension guidance",
                url: "https://example.org/plant-care",
            },
        ],
    };
}

describe("plant care evidence validation", () => {
    it("accepts a sourced trial", () => {
        expect.hasAssertions();
        expect(isPlantCareReference(reference())).toBe(true);
    });

    it("preserves explicit unknown qualitative light", () => {
        expect.hasAssertions();

        const record = reference();
        record.light = {
            ...record.light,
            basis: "qualitative-only",
            dli: null,
            startingDli: null,
        };

        expect(isPlantCareReference(record)).toBe(true);
        expect(lightComparison(record.light)).toStrictEqual({
            hours: 12,
            lux: null,
            ppfd: null,
            startingPpfd: null,
        });
    });

    it.each([
        undefined,
        null,
        [],
        {},
        "plant",
    ])("rejects incomplete input %j", (value) => {
        expect.hasAssertions();
        expect(isPlantCareReference(value)).toBe(false);
    });

    it.each([
        null,
        undefined,
        [],
        [3],
        [
            3,
            6,
            9,
        ],
        [6, 3],
        [0, 6],
        [-1, 6],
        [NaN, 6],
        [3, Infinity],
        ["3", 6],
    ])("rejects invalid trial range %j", (dli) => {
        expect.hasAssertions();

        const record = reference();

        expect(
            isPlantCareReference({ ...record, light: { ...record.light, dli } })
        ).toBe(false);
    });

    it("rejects starting exposure above the comparison band and numeric qualitative or historical claims", () => {
        expect.hasAssertions();

        const record = reference();

        expect(
            isPlantCareReference({
                ...record,
                light: { ...record.light, startingDli: [4, 12] },
            })
        ).toBe(false);
        expect(
            isPlantCareReference({
                ...record,
                light: { ...record.light, basis: "qualitative-only" },
            })
        ).toBe(false);
        expect(
            isPlantCareReference({
                ...record,
                light: { ...record.light, basis: "historical" },
            })
        ).toBe(false);
        expect(
            isPlantCareReference({
                ...record,
                light: { ...record.light, basis: "optimum" },
            })
        ).toBe(false);
    });

    it.each([
        "2026-02-29",
        "2026-04-31",
        "2026-13-01",
        "2026-00-01",
        "2026-1-01",
        "2026-10-29T00:00:00Z",
        "yesterday",
    ])("rejects non-calendar review date %s", (reviewedOn) => {
        expect.hasAssertions();
        expect(isPlantCareReference({ ...reference(), reviewedOn })).toBe(
            false
        );
    });

    it("accepts a real leap day and rejects missing care or source evidence", () => {
        expect.hasAssertions();

        const record = reference();

        expect(
            isPlantCareReference({ ...record, reviewedOn: "2024-02-29" })
        ).toBe(true);
        expect(
            isPlantCareReference({
                ...record,
                moisture: { ...record.moisture, check: " " },
            })
        ).toBe(false);
        expect(isPlantCareReference({ ...record, sources: [] })).toBe(false);
        expect(
            isPlantCareReference({
                ...record,
                sources: [...record.sources, ...record.sources],
            })
        ).toBe(false);
        expect(
            isPlantCareReference({
                ...record,
                sources: [
                    { scope: "", title: "Source", url: "https://example.org" },
                ],
            })
        ).toBe(false);
    });

    it.each([
        // eslint-disable-next-line no-script-url -- Deliberately unsafe source verifies executable schemes are rejected.
        "javascript:alert(1)",
        // eslint-disable-next-line sdl/no-insecure-url, unicorn/prefer-https -- Deliberate insecure-scheme rejection fixture.
        "http://example.org",
        "https://user:password@example.org",
        "https://user@example.org",
        "/local-source",
        "not a URL",
    ])("rejects unsafe or non-HTTPS source %s", (url) => {
        expect.hasAssertions();
        expect(
            isPlantCareReference({
                ...reference(),
                sources: [{ scope: "Care guidance", title: "Source", url }],
            })
        ).toBe(false);
    });

    it.each([
        "../plant",
        "Plant",
        "two--plants",
        "plant/slug",
        "",
        "-plant",
        "plant-",
    ])("rejects invalid profile slug %s", (slug) => {
        expect.hasAssertions();
        expect(isPlantCareReference({ ...reference(), slug })).toBe(false);
    });
});

describe("care coverage", () => {
    it("rejects missing, extra, duplicate, and substituted profile references", () => {
        expect.hasAssertions();

        const record = reference();
        const profile = { historical: false, slug: record.slug };

        expect(() => {
            assertCareCoverage([record], [profile]);
        }).not.toThrow();
        expect(() => {
            assertCareCoverage([], [profile]);
        }).toThrow(/coverage/v);
        expect(() => {
            assertCareCoverage([record], []);
        }).toThrow(/coverage/v);
        expect(() => {
            assertCareCoverage(
                [record, record],
                [profile, { ...profile, slug: "other" }]
            );
        }).toThrow(/coverage/v);
        expect(() => {
            assertCareCoverage(
                [record, { ...record, slug: "other" }],
                [profile, profile]
            );
        }).toThrow(/coverage/v);
        expect(() => {
            assertCareCoverage([record], [{ ...profile, slug: "missing" }]);
        }).toThrow(/missing/v);
    });

    it("requires historical care status to match the profile in both directions", () => {
        expect.hasAssertions();

        const record = reference();
        const historical = {
            ...record,
            light: {
                ...record.light,
                basis: /** @type {const} */ ("historical"),
                dli: null,
                startingDli: null,
            },
        };

        expect(() => {
            assertCareCoverage(
                [record],
                [{ historical: true, slug: record.slug }]
            );
        }).toThrow(/status mismatch/v);
        expect(() => {
            assertCareCoverage(
                [historical],
                [{ historical: false, slug: record.slug }]
            );
        }).toThrow(/status mismatch/v);
        expect(() => {
            assertCareCoverage(
                [historical],
                [{ historical: true, slug: record.slug }]
            );
        }).not.toThrow();
        expect(lightComparison(historical.light).ppfd).toBeNull();
    });

    it("loads complete maintained catalogs and preserves terrarium unknowns", async () => {
        expect.hasAssertions();

        const records = await getPlantCareReferences();
        const profiles = await getProfiles();

        expect(() => {
            assertCareCoverage(records, profiles);
        }).not.toThrow();
        expect(records).toHaveLength(profiles.length);

        const terrarium = await getPlantCareReference("terrarium");

        expect(terrarium.light).toMatchObject({
            basis: "qualitative-only",
            dli: null,
            startingDli: null,
        });
        await expect(
            getPlantCareReference("missing-synthetic-plant")
        ).rejects.toThrow(
            "Missing plant care reference: missing-synthetic-plant"
        );
    });
});

describe("light comparisons", () => {
    it("uses a 12-hour example and raw DLI for the approximate white-LED lux envelope", () => {
        expect.hasAssertions();

        const record = reference();

        expect(lightComparison(record.light)).toStrictEqual({
            hours: 12,
            lux: [7600, 16_200],
            ppfd: [140, 230],
            startingPpfd: [95, 140],
        });
        expect(record.light.dli).toStrictEqual([6, 10]);
    });

    it("adjusts intensity when duration changes without changing daily exposure", () => {
        expect.hasAssertions();
        expect(lightComparison(reference().light, 16)).toStrictEqual({
            hours: 16,
            lux: [5700, 12_200],
            ppfd: [105, 175],
            startingPpfd: [70, 105],
        });
        expect(lightComparison(reference().light, 24).ppfd).toStrictEqual([
            70,
            115,
        ]);
    });

    it.each([
        0,
        -1,
        25,
        NaN,
        Infinity,
    ])("rejects invalid duration %s", (hours) => {
        expect.hasAssertions();
        expect(() => lightComparison(reference().light, hours)).toThrow(
            /Comparison hours/v
        );
    });

    it("rejects invalid numeric bands at the conversion boundary", () => {
        expect.hasAssertions();

        const light = reference().light;

        expect(() => lightComparison({ ...light, dli: [6, 3] })).toThrow(
            /Invalid plant care light reference/v
        );
        expect(() => lightComparison({ ...light, dli: null })).toThrow(
            /Invalid plant care light reference/v
        );
    });
});
