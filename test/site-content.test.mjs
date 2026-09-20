import { describe, expect, it } from "vitest";

import { sheetUrls } from "../docs/layouts/plant-tracker-data.js";
import { plantSheetUrl } from "../scripts/build-data.mjs";
import {
    getCollectionManifest,
    getDocument,
    getOldPlans,
    getProfiles,
    renderMarkdown,
} from "../site/lib/content.mjs";
import {
    decorateProfileBody,
    identificationLabel,
    loadProfiles,
    renderInline,
    stripHtml,
} from "../site/lib/content/profile-source.mjs";

describe("field guide source rendering", () => {
    it("keeps abandoned plants searchable as old plans and out of active profiles and pots", async () => {
        expect.hasAssertions();

        const profiles = await getProfiles();
        const archived = await getOldPlans();

        expect(profiles).toHaveLength(39);
        expect(profiles.filter((profile) => !profile.historical)).toHaveLength(
            38
        );
        expect(
            profiles.some((profile) =>
                ["P31", "P32"].includes(profile.trackerId ?? "")
            )
        ).toBe(false);
        expect(archived).toHaveLength(6);
        expect(
            archived.some((document) =>
                document.slug.endsWith("tradescantia-nanouk")
            )
        ).toBe(true);
        expect(() => plantSheetUrl("P31")).toThrow(/No Google Sheets tab/v);
        expect(() => plantSheetUrl("P32")).toThrow(/No Google Sheets tab/v);
    });

    it("keeps the tiny-planter overview and three qualified groups on one shared history with original photo provenance", async () => {
        expect.hasAssertions();

        const profiles = await getProfiles();
        const members = profiles.filter(
            (profile) => profile.trackerId === "P30"
        );
        const slugs = [
            "tiny-mixed-succulent-planter",
            "tiny-planter-echeveria",
            "tiny-planter-coppertone-sedum",
            "tiny-planter-paddle-kalanchoe",
        ];

        const potIds = new Set(
            profiles.map((profile) => profile.trackerId).filter(Boolean)
        );

        expect(
            members
                .map((profile) => profile.slug)
                .toSorted((left, right) => left.localeCompare(right))
        ).toStrictEqual(
            slugs.toSorted((left, right) => left.localeCompare(right))
        );
        expect(potIds.size).toBe(30);
        expect(
            members
                .map((profile) => profile.inventoryId)
                .toSorted((left, right) => left.localeCompare(right))
        ).toStrictEqual([
            "Succulent-10",
            "Succulent-10A",
            "Succulent-10B",
            "Succulent-10C",
        ]);

        for (const member of members) {
            expect(member.drawerLabel.primary).toBe("#6");
            expect(member.sheetUrl).toBe(plantSheetUrl("P30"));
            expect(member.historical).toBe(false);
        }
        const manifest = await getCollectionManifest();
        const overview = manifest.plants.find(
            (record) => record.plant_slug === "tiny-mixed-succulent-planter"
        );

        expect(overview?.photos).toHaveLength(8);

        for (const slug of slugs.slice(1)) {
            const record = manifest.plants.find(
                (entry) => entry.plant_slug === slug
            );

            expect(record?.photos).toStrictEqual(overview?.photos);
            expect(record?.gyazo_collection).toStrictEqual(
                overview?.gyazo_collection
            );

            const member = members.find((profile) => profile.slug === slug);

            expect(member?.identificationMarkdown).toMatch(
                /probable|provisional|unresolved/iv
            );
            expect(member?.scientificMarkdown).toMatch(
                /Echeveria|Kalanchoe|Sedum/v
            );
        }
    });

    it("decorates profile headings and identity/care tables without losing routes, anchors, or qualified evidence", async () => {
        expect.hasAssertions();

        const rendered = await renderMarkdown(
            [
                "## Names and identity",
                "| Kind | Name |",
                "| --- | --- |",
                "| Provisional identification | Probable _Example cf. species_; cultivar unknown. |",
                "",
                "## Practical care",
                "| Topic | Practical approach |",
                "| --- | --- |",
                "| Light | Use the [care notes](../../care-notes.md). |",
                "| Water | Evidence first; no fixed calendar. |",
                "",
                "## Seller listing snapshot",
                "Seller wording remains unverified. [Source](https://example.com/source)",
                "",
                "## Sources",
                "[Scientific source](https://example.com/taxon)",
            ].join("\n"),
            "docs/plants/cacti/example.md",
            "example-"
        );
        const html = decorateProfileBody(rendered.html);

        expect(stripHtml(html)).toBe(stripHtml(rendered.html));

        for (const heading of rendered.toc) {
            expect(html).toContain(`id="${heading.id}"`);
        }

        expect(html).toContain(
            'class="profile-section-heading profile-section-heading--identity"'
        );
        expect(html).toContain(
            'class="semantic-table semantic-table--identity"'
        );
        expect(html).toContain('class="semantic-table semantic-table--care"');
        expect(html).toContain('class="semantic-row semantic-row--caution"');
        expect(html).toContain('src="/Gardening/assets/ui-icons/light.svg"');
        expect(html).toContain('href="/Gardening/guides/care-notes/"');
        expect(html).toContain('href="https://example.com/taxon"');
        expect(html).toContain('<div class="table-scroll"');
        expect(html).toMatch(
            /<section class="seller-snapshot"[\s\S]*?<\/section>\s*<h2 id="example-sources"/v
        );
        expect(html).not.toContain("<use");
    });

    it("publishes rich profile bodies through the site adapter while preserving every source heading and all text", async () => {
        expect.hasAssertions();

        const profiles = await getProfiles();
        for (const profile of profiles) {
            const plain = await renderMarkdown(
                profile.bodyMarkdown,
                profile.sourcePath,
                `${profile.slug}-`
            );

            expect(stripHtml(profile.bodyHtml)).toBe(stripHtml(plain.html));
            expect(profile.bodyHtml).toContain(
                'class="profile-section-heading'
            );

            for (const heading of profile.toc) {
                expect(profile.bodyHtml).toContain(`id="${heading.id}"`);
            }

            expect(profile.bodyHtml).not.toContain("./plant-icons.svg#");
        }
    });

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
        expect(
            identificationLabel("Provisional genus-level foliage match")
        ).toBe("Tentative Genus");
        expect(
            identificationLabel("Provisional paddle-kalanchoe foliage match")
        ).toBe("Tentative Foliage Match");
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
