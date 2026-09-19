import { access } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import {
    getDocument,
    getEquipmentDocs,
    getGuides,
} from "../site/lib/content.mjs";
import { documentSections } from "../site/lib/document-presentation.mjs";

describe("document presentation", () => {
    it("preserves every source-rendered byte, heading anchor, and section order across guides and setup references", async () => {
        expect.hasAssertions();

        const [
            guides,
            equipment,
            setup,
            placement,
        ] = await Promise.all([
            getGuides(),
            getEquipmentDocs(),
            getDocument("docs/setup.md"),
            getDocument("docs/layouts/table-placement-research.md"),
        ]);
        const documents = [
            ...guides,
            ...equipment,
            setup,
            placement,
        ];
        /** @type {Set<string>} */
        const icons = new Set();

        for (const document of documents) {
            const presentation = documentSections(document);

            expect(
                presentation.introduction +
                    presentation.sections
                        .map((section) => section.html)
                        .join("")
            ).toBe(document.html);
            expect(
                presentation.sections.map((section) => section.id)
            ).toStrictEqual(
                document.toc
                    .filter((heading) => heading.level === 2)
                    .map((heading) => heading.id)
            );
            expect(presentation.sections.length).toBeGreaterThan(0);

            icons.add(presentation.appearance.icon);
            for (const section of presentation.sections)
                icons.add(section.icon);
        }

        await expect(
            Promise.all(
                [...icons].map((icon) => access(`assets/ui-icons/${icon}.svg`))
            )
        ).resolves.toHaveLength(icons.size);
    });

    it("keeps an unsectioned introduction and rejects a missing anchor rather than dropping content", () => {
        expect.hasAssertions();

        const document = {
            html: "<p>Historical details remain visible.</p>",
            sourcePath: "docs/setup.md",
            toc: [],
        };

        expect(documentSections(document).introduction).toBe(document.html);
        expect(documentSections(document).sections).toStrictEqual([]);
        expect(() =>
            documentSections({
                ...document,
                toc: [{ id: "missing", level: 2, title: "Missing" }],
            })
        ).toThrow("Document section is missing: missing");
    });

    it("visually identifies historical sections while keeping their exact content", () => {
        expect.hasAssertions();

        const html =
            '<h2 id="earlier">Earlier AW200SE Starting Plan</h2><p>Retained historical settings.</p>';
        const result = documentSections({
            html,
            sourcePath: "docs/care-notes.md",
            toc: [
                {
                    id: "earlier",
                    level: 2,
                    title: "Earlier AW200SE Starting Plan",
                },
            ],
        });

        expect(result.sections[0]).toMatchObject({
            html,
            icon: "history",
            label: "Historical Context",
        });
    });
});
