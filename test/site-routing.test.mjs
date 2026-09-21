import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

import { legacyData, legacyScript } from "../site/lib/legacy.mjs";
import { contentUrl, siteUrl } from "../site/lib/routes.mjs";

const data = legacyData([
    { drawerLabel: { primary: "A1" }, slug: "moon-cactus", trackerId: "P01" },
    { drawerLabel: { primary: "#1" }, slug: "shared-torch", trackerId: "P19" },
    { drawerLabel: { primary: "#1" }, slug: "shared-tail", trackerId: "P19" },
    {
        drawerLabel: { primary: "#7" },
        slug: "peperomia-obtipan-bicolor",
        trackerId: "P31",
    },
    {
        drawerLabel: { primary: "#8" },
        slug: "tradescantia-spathacea-tricolor",
        trackerId: "P32",
    },
    {
        drawerLabel: { primary: "#9" },
        slug: "lithops-shared-planter",
        trackerId: "P35",
    },
    {
        drawerLabel: { primary: "#10" },
        slug: "pleiospilos-nelii",
        trackerId: "P36",
    },
]);

/**
 * @param {string} path @param {string} [fallback] @param {boolean}
 *   [isRedirectPage]
 */
function redirected(path, fallback = siteUrl(), isRedirectPage = true) {
    const url = new URL(path, "https://example.test");
    /** @type {string[]} */
    const redirects = [];
    /** @type {Record<string, string>} */
    const markers = {};
    runInNewContext(legacyScript(data, fallback, isRedirectPage), {
        document: { documentElement: { dataset: markers } },
        location: {
            hash: url.hash,
            href: url.href,
            origin: url.origin,
            pathname: url.pathname,
            replace: (/** @type {string} */ value) => {
                redirects.push(value);
            },
            search: url.search,
        },
        URL,
        URLSearchParams,
    });

    expect(markers["gardeningRedirecting"] !== undefined).toBe(
        redirects.length > 0
    );

    return redirects;
}

describe("site routes and serialized legacy bookmarks", () => {
    it("keeps abandoned order bookmarks in the old-plan archive", () => {
        expect.hasAssertions();
        expect(
            contentUrl(
                "docs/old-plans/amazon-2026-09-19/tradescantia-nanouk.md#sources"
            )
        ).toBe(
            "/Gardening/guides/old-plans/amazon-2026-09-19/tradescantia-nanouk/#sources"
        );
        expect(
            redirected("/Gardening/#echeveria-cubic-frost", siteUrl(), false)
        ).toStrictEqual([
            "https://example.test/Gardening/guides/old-plans/amazon-2026-09-19/echeveria-cubic-frost/",
        ]);
    });

    it.each([
        ["P31", "P31"],
        ["P32", "P32"],
        ["P33", "P31"],
        ["P34", "P32"],
        ["#7", "P31"],
        ["#8", "P32"],
        ["P35", "P35"],
        ["P36", "P36"],
        ["#9", "P35"],
        ["#10", "P36"],
    ])(
        "resolves current labels and permanent tracker redirects %s to %s",
        (previous, current) => {
            expect.hasAssertions();
            expect(
                redirected(
                    `/Gardening/layouts/plant-history.html?id=${encodeURIComponent(previous)}&range=cycle#weights`,
                    siteUrl("pots/")
                )
            ).toStrictEqual([
                `https://example.test/Gardening/pots/${current}/?range=cycle#weights`,
            ]);
        }
    );

    it.each([
        ["P33", "P31"],
        ["P34", "P32"],
    ])(
        "preserves date controls and anchors on retired %s pot pages",
        (previous, current) => {
            expect.hasAssertions();
            expect(
                redirected(
                    `/Gardening/pots/${previous}/?from=2026-09-20#history`,
                    siteUrl(`pots/${current}/`)
                )
            ).toStrictEqual([
                `https://example.test/Gardening/pots/${current}/?from=2026-09-20#history`,
            ]);
        }
    );

    it.each([
        "display-and-support",
        "lights-and-controls",
        "air-and-climate",
        "measuring-and-watering",
        "pots-medium-and-top-dressing",
        "photos-labels-and-records",
        "stored-and-historical-choices",
        "sources-and-record-limits",
    ])("preserves the equipment section bookmark %s", (section) => {
        expect.hasAssertions();
        expect(
            redirected(`/Gardening/#equipment-${section}`, siteUrl(), false)
        ).toStrictEqual([
            `https://example.test/Gardening/setup/equipment/#${section}`,
        ]);
    });

    it.each(["equipment", "placement"])(
        "resolves the old %s title bookmark to its page",
        (page) => {
            expect.hasAssertions();
            expect(
                redirected(`/Gardening/docs/plant-booklet/#${page}-title`)
            ).toStrictEqual([`https://example.test/Gardening/setup/${page}/`]);
        }
    );

    it("preserves both query and fragment when mapping Markdown", () => {
        expect.hasAssertions();
        expect(
            contentUrl("docs/plants/cacti/moon-cactus.md?q=pot#sources")
        ).toBe("/Gardening/plants/moon-cactus/?q=pot#sources");
        expect(
            contentUrl("docs/equipment/inventory.md?view=table#lights")
        ).toBe("/Gardening/setup/equipment/?view=table#lights");
    });

    it("resolves plain and prefixed plant bookmarks including nested headings", () => {
        expect.hasAssertions();
        expect(
            redirected("/Gardening/#moon-cactus", siteUrl(), false)
        ).toStrictEqual(["https://example.test/Gardening/plants/moon-cactus/"]);
        expect(
            redirected(
                "/Gardening/docs/plant-booklet/#plant-moon-cactus-photo-history"
            )
        ).toStrictEqual([
            "https://example.test/Gardening/plants/moon-cactus/#moon-cactus-photo-history",
        ]);
    });

    it("resolves labels to shared containers and preserves other query values", () => {
        expect.hasAssertions();
        expect(
            redirected(
                "/Gardening/layouts/plant-history.html?id=%231&range=cycle#weights",
                siteUrl("pots/")
            )
        ).toStrictEqual([
            "https://example.test/Gardening/pots/P19/?range=cycle#weights",
        ]);
        expect(
            redirected(
                "/Gardening/layouts/plant-history.html?id=P01",
                siteUrl("pots/")
            )
        ).toStrictEqual(["https://example.test/Gardening/pots/P01/"]);
    });

    it("keeps unknown IDs visible and does not treat inherited properties as destinations", () => {
        expect.hasAssertions();
        expect(
            redirected(
                "/Gardening/layouts/plant-history.html?id=missing",
                siteUrl("pots/")
            )
        ).toStrictEqual(["https://example.test/Gardening/pots/?id=missing"]);
        expect(
            redirected("/Gardening/#constructor", siteUrl(), false)
        ).toStrictEqual([]);
        expect(
            redirected("/Gardening/#%broken", siteUrl(), false)
        ).not.toHaveLength(1);
    });

    it("routes historical layout sections to the archive", () => {
        expect.hasAssertions();
        expect(
            redirected(
                "/Gardening/layouts/grow-spot-layout.html#room",
                siteUrl("setup/placement/")
            )
        ).toStrictEqual([
            "https://example.test/Gardening/setup/archive/layout/#room",
        ]);
    });
});
