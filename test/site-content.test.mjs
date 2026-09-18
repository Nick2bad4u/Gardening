import { describe, expect, it } from "vitest";

import { sheetUrls } from "../docs/layouts/plant-tracker-data.js";
import { plantSheetUrl } from "../scripts/build-data.mjs";
import { getDocument, renderMarkdown } from "../site/lib/content.mjs";
import {
    identificationLabel,
    loadProfiles,
    renderInline,
} from "../site/lib/content/profile-source.mjs";

describe("field guide source rendering", () => {
    it("retains all current placement illustrations as visible images and separates download-only maps", async () => {
        expect.hasAssertions();

        const document = await getDocument(
            "docs/layouts/table-placement-research.md"
        );
        const names = document.illustrations.map((image) =>
            image.src.split("/").at(-1)
        );

        expect(names).toStrictEqual([
            "combined-plan-illustrated.png",
            "front-pots-illustrated.png",
            "rear-pots-illustrated.png",
            "relative-light-illustrated.png",
            "combined-plan.png",
            "front-pots.png",
            "rear-pots.png",
        ]);

        for (const image of document.illustrations) {
            expect(image.src).toMatch(/^\/Gardening\/assets\/layouts\//v);
            expect(document.html).toContain(`<img src="${image.src}"`);
            expect(document.html).toContain(`<a href="${image.src}">`);
            expect(image.alt.length).toBeGreaterThan(20);
        }

        expect(document.html).toContain(
            "Money Tree is now on the north-facing windowsill"
        );
        expect(document.html).toContain("estimated-light-map-transparent.png");
        expect(names).not.toContain("estimated-light-map-transparent.png");
    });

    it("preserves safe Markdown images and formatting without accepting raw executable HTML", async () => {
        expect.hasAssertions();

        const rendered = await renderMarkdown(
            '## Light Map\n\n![Relative light](../../assets/layouts/map.png)\n\n**Estimated**, not measured.\n\n<img src="bad.png" onerror="alert(1)">\n<script>alert(2)</script>\n\n[unsafe](javascript:alert%281%29)',
            "docs/layouts/example.md"
        );

        expect(rendered.html).toContain(
            '<img src="/Gardening/assets/layouts/map.png"'
        );
        expect(rendered.html).toContain('<figure class="placement-figure">');
        expect(rendered.html).toContain("<strong>Estimated</strong>");
        expect(rendered.html).not.toMatch(/<script|onerror|javascript:/iv);
    });

    it("keeps qualified corrections and hybrid uncertainty ahead of broad label matches", () => {
        expect.hasAssertions();

        expect(
            identificationLabel(
                "**seller-labeled _Faucaria tigrina_, but probable _F. tuberculosa_ from photographs**"
            )
        ).toBe("Likely Revised ID");
        expect(
            identificationLabel(
                "**probable at the Chamaelobivia hybrid-group level; cultivar unknown**"
            )
        ).toBe("Likely Hybrid Group");
        expect(identificationLabel("**very high confidence**")).toBe(
            "Very Strong Match"
        );
        expect(identificationLabel("unresolved identification")).toBe(
            "Working ID"
        );
    });

    it("retains every profile's identification evidence and historical status behind its summary", async () => {
        expect.hasAssertions();

        const profiles = await loadProfiles();
        for (const profile of profiles) {
            expect(profile.identificationHtml).toContain(
                await renderInline(profile.identificationMarkdown)
            );
            expect(
                identificationLabel(profile.identificationMarkdown)
            ).not.toBe("Working ID");
        }

        const historicalProfiles = profiles.filter(
            (profile) => profile.historical
        );

        expect(historicalProfiles).toHaveLength(1);

        for (const profile of historicalProfiles) {
            expect(profile.statusHtml).toContain("<summary>Archived</summary>");
            expect(profile.statusHtml).toContain(
                await renderInline(profile.statusMarkdown)
            );
        }

        const currentProfiles = profiles.filter((entry) => !entry.historical);

        for (const profile of currentProfiles) {
            expect(profile.statusHtml).toContain("In Collection");
        }
    });

    it("sanitizes raw HTML and unsafe URLs while retaining Markdown formatting", async () => {
        expect.hasAssertions();

        const rendered = await renderInline(
            '**Collection** *working identification* [source](https://example.com/plant) <img src="x" onerror="alert(1)"> <script>alert(2)</script> [unsafe](javascript:alert%283%29)'
        );

        expect(rendered).toContain("<strong>Collection</strong>");
        expect(rendered).toContain("<em>working identification</em>");
        expect(rendered).toContain(
            '<a href="https://example.com/plant">source</a>'
        );
        expect(rendered).not.toMatch(/<script|onerror|javascript:/iv);
    });

    it("uses the browser's worksheet mapping for every plant and rejects unknown IDs", () => {
        expect.hasAssertions();

        for (let number = 1; number <= 30; number += 1) {
            const trackerId = `P${String(number).padStart(2, "0")}`;

            expect(plantSheetUrl(trackerId)).toBe(
                sheetUrls.plantPage(trackerId)
            );
            expect(plantSheetUrl(trackerId)).toMatch(/#gid=\d+$/v);
        }

        expect(plantSheetUrl(undefined)).toBeUndefined();
        expect(plantSheetUrl("")).toBeUndefined();
        expect(() => plantSheetUrl("P99")).toThrow(/No Google Sheets tab/v);
    });
});
