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
            hours: 13.5,
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

    it("loads numeric comparisons for every active profile and keeps the removed profile historical", async () => {
        expect.hasAssertions();

        const records = await getPlantCareReferences();
        const profiles = await getProfiles();

        expect(() => {
            assertCareCoverage(records, profiles);
        }).not.toThrow();
        expect(records).toHaveLength(profiles.length);

        const activeSlugs = new Set(
            profiles
                .filter((profile) => !profile.historical)
                .map((profile) => profile.slug)
        );
        const active = records.filter((record) => activeSlugs.has(record.slug));

        expect(active).toHaveLength(49);
        expect(
            active.every(
                (record) =>
                    record.light.basis === "collection-trial" &&
                    lightComparison(record.light).lux !== null &&
                    lightComparison(record.light).ppfd !== null
            )
        ).toBe(true);

        const historical = records.filter(
            (record) => !activeSlugs.has(record.slug)
        );

        expect(historical.map((record) => record.slug)).toStrictEqual([
            "mammillaria-bombycina",
        ]);
        expect(
            historical.map((record) => lightComparison(record.light))
        ).toStrictEqual([
            { hours: 13.5, lux: null, ppfd: null, startingPpfd: null },
        ]);

        await expect(
            getPlantCareReference("missing-synthetic-plant")
        ).rejects.toThrow(
            "Missing plant care reference: missing-synthetic-plant"
        );
    });

    it("keeps the feather cactus trial distinct from a published optimum or maximum", async () => {
        expect.hasAssertions();

        const feather = await getPlantCareReference("mammillaria-plumosa");

        expect(feather.light).toMatchObject({
            basis: "collection-trial",
            dli: [10, 17],
            startingDli: null,
        });
        expect(feather.light.caution).toContain("17 DLI is not a ceiling");
        expect(feather.light.caution).toMatch(
            /not a published optimum or maximum/v
        );
        expect(feather.sources.map((source) => source.url)).toStrictEqual(
            expect.arrayContaining([
                "https://www.desertmuseum.org/visit/sheets/Mamplu.pdf",
                "https://www.rhs.org.uk/plants/10832/mammillaria-plumosa/details",
            ])
        );
    });

    it("compares the conservative terrarium trial while retaining unidentified member cautions", async () => {
        expect.hasAssertions();

        const terrarium = await getPlantCareReference("terrarium");

        expect(terrarium.light).toMatchObject({
            basis: "collection-trial",
            dli: [3, 6],
            startingDli: null,
        });
        expect(lightComparison(terrarium.light)).toStrictEqual({
            hours: 13.5,
            lux: [3400, 8600],
            ppfd: [60, 125],
            startingPpfd: null,
        });
        expect(terrarium.light.caution).toMatch(/provisional|unidentified/iv);
        expect(terrarium.moisture.waitWhen).toMatch(
            /persistently wet|pooling/iv
        );
        expect(terrarium.moisture.waterWhen).toMatch(
            /does not establish.*drainage/iv
        );
    });

    it.each([
        "faucaria-tuberculosa",
        "lithops-lesliei",
        "lithops-salicola",
        "lithops-shared-planter",
        "tiny-mixed-succulent-planter",
        "tiny-planter-coppertone-sedum",
        "tiny-planter-echeveria",
        "tiny-planter-paddle-kalanchoe",
    ])(
        "assigns %s an explicit conservative trial without inventing a starting exposure",
        async (slug) => {
            expect.hasAssertions();

            const record = await getPlantCareReference(slug);

            expect(record.light).toMatchObject({
                basis: "collection-trial",
                dli: [12, 16],
                startingDli: null,
            });
            expect(lightComparison(record.light)).toStrictEqual({
                hours: 13.5,
                lux: [13_600, 23_000],
                ppfd: [245, 330],
                startingPpfd: null,
            });
        }
    );

    it.each([
        [
            "tiny-mixed-succulent-planter",
            "tiny-planter-coppertone-sedum",
            "tiny-planter-echeveria",
            "tiny-planter-paddle-kalanchoe",
        ],
        [
            "lithops-shared-planter",
            "lithops-lesliei",
            "lithops-salicola",
        ],
    ])(
        "keeps %s and its component profiles on one shared moisture decision",
        async (...slugs) => {
            expect.hasAssertions();

            const records = await Promise.all(
                slugs.map((slug) => getPlantCareReference(slug))
            );
            const moistureDecisions = new Set(
                records.map((record) => JSON.stringify(record.moisture))
            );

            expect(moistureDecisions.size).toBe(1);
            expect(
                records.every((record) =>
                    /one pot|shared/v.test(record.moisture.waterWhen)
                )
            ).toBe(true);
            expect(
                records.every((record) =>
                    record.moisture.waitWhen.includes("conflict")
                )
            ).toBe(true);
        }
    );
});

describe("light comparisons", () => {
    it("uses a 13.5-hour example and raw DLI for the approximate white-LED lux envelope", () => {
        expect.hasAssertions();

        const record = reference();

        expect(lightComparison(record.light)).toStrictEqual({
            hours: 13.5,
            lux: [6800, 14_400],
            ppfd: [125, 205],
            startingPpfd: [80, 125],
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
