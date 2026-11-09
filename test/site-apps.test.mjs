import { describe, expect, it } from "vitest";

import {
    siteAppForPath,
    siteApps,
    siteManifest,
} from "../site/lib/site-apps.mjs";

describe("installed garden app routing", () => {
    it.each([
        ["/Gardening/", "The Garden"],
        ["/Gardening", "The Garden"],
        ["/Gardening/containers", "Containers"],
        ["/Gardening/containers/P35/", "Containers"],
        ["/Gardening/setup", "Garden Setup"],
        ["/Gardening/setup/equipment/", "Equipment"],
        ["/Gardening/setup/equipment/msu-fertilizer/", "Equipment"],
        ["/Gardening/setup/placement/", "Placement"],
        ["/Gardening/watering", "Garden Watering Map"],
        ["/Gardening/watering/", "Garden Watering Map"],
        ["/Gardening/plants/peperomia-obtipan-bicolor/", "Plant Library"],
    ])(
        "assigns %s to %s rather than a broader parent identity",
        (pathname, name) => {
            expect.hasAssertions();
            expect(siteAppForPath(pathname)?.name).toBe(name);
        }
    );

    it.each([
        "/Gardening/404.html",
        "/Gardening/unknown/",
        "/Gardening/plants-extra/",
        "/Gardening/containers-extra/",
        "/Gardening/watering-extra/",
        "/Gardening/report/",
        "/Gardening/pocket-report/",
        "/Gardening/reports/",
        "/Gardening/reports/2026-09-22/",
        "/Garden/plants/",
    ])("does not offer an unrelated install for %s", (pathname) => {
        expect.hasAssertions();
        expect(siteAppForPath(pathname)).toBeUndefined();
    });

    it("keeps every installed identity unique even with nested navigation scopes", () => {
        expect.hasAssertions();

        const manifests = siteApps.map((app) => siteManifest(app));
        const identities = new Set(manifests.map((manifest) => manifest.id));

        expect(identities.size).toBe(12);
        expect(manifests).toHaveLength(12);
        expect([...identities].filter((id) => id.includes("#"))).toStrictEqual(
            []
        );
        expect(
            manifests.find(
                (manifest) => manifest.name === "Garden Watering Map"
            )
        ).toMatchObject({
            display: "standalone",
            id: "/Gardening/watering/",
            scope: "/Gardening/watering/",
            short_name: "Watering Map",
            start_url: "/Gardening/watering/",
        });
    });
});
