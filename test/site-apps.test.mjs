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
        ["/Gardening/plants/peperomia-obtipan-bicolor/", "Plant Library"],
        ["/Gardening/reports/2026-09-22/", "Report Archive"],
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
        "/Garden/plants/",
    ])("does not offer an unrelated install for %s", (pathname) => {
        expect.hasAssertions();
        expect(siteAppForPath(pathname)).toBeUndefined();
    });

    it("keeps every installed identity unique even with nested navigation scopes", () => {
        expect.hasAssertions();

        const manifests = siteApps.map((app) => siteManifest(app));
        const identities = new Set(manifests.map((manifest) => manifest.id));

        expect(identities.size).toBe(14);
        expect(manifests).toHaveLength(14);
        expect([...identities].filter((id) => id.includes("#"))).toStrictEqual(
            []
        );
        expect(
            manifests.find((manifest) => manifest.name === "Pocket Report")
        ).toMatchObject({
            id: "/Gardening/pocket-report/",
            start_url: "/Gardening/pocket-report/#pocket-list",
        });
    });
});
