import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    ".."
);
const assetDirectory = path.join(repositoryRoot, "assets", "plant-icons");
const sprite = fs.readFileSync(
    path.join(repositoryRoot, "docs", "plant-booklet", "plant-icons.svg"),
    "utf8"
);
const standaloneNames = fs
    .readdirSync(assetDirectory)
    .filter((name) => name.endsWith(".svg"))
    .sort();
const plantSymbols = [
    ...sprite.matchAll(
        /<symbol\s+id="icon-plant-([^"]+)"\s+viewBox="([^"]+)"\s*>([\s\S]*?)<\/symbol>/g
    ),
].map((match) => ({
    body: match[3],
    slug: match[1],
    viewBox: match[2],
}));
const leadingZeroOmissionPattern = /(?:^|[^\d])\.(?=\d)|\d+\.\d+\.(?=\d)/m;

function openingAttributes(source) {
    const openingTag = source.match(/^<svg\b[^>]*>/)?.[0] ?? "";
    return Object.fromEntries(
        [...openingTag.matchAll(/\b([\w:-]+)="([^"]*)"/g)].map((match) => [
            match[1],
            match[2],
        ])
    );
}

describe("custom plant portrait exports", () => {
    it("keeps the 36-file standalone inventory aligned with the canonical sprite", () => {
        const slugs = plantSymbols.map(({ slug }) => slug);

        expect(plantSymbols).toHaveLength(36);
        expect(new Set(slugs).size).toBe(36);
        expect(standaloneNames).toHaveLength(36);
        expect(standaloneNames).toEqual(
            slugs.map((slug) => `${slug}.svg`).sort()
        );
    });

    it("keeps canonical portrait markup readable and explicit", () => {
        for (const { body, slug, viewBox } of plantSymbols) {
            expect(viewBox, slug).toBe("0 0 64 64");
            expect(body, slug).not.toContain("><");
            expect(body, slug).not.toMatch(leadingZeroOmissionPattern);
        }
    });

    it("keeps advanced SVG definitions unique and standalone-safe", () => {
        const allDefinitionIds = [];

        for (const { body, slug } of plantSymbols) {
            const definitionIds = [...body.matchAll(/\bid="([^"]+)"/g)].map(
                (match) => match[1]
            );
            const localReferences = [
                ...body.matchAll(
                    /(?:href="#|url\(#)([a-zA-Z][\w:-]*)(?:\)|")/g
                ),
            ].map((match) => match[1]);

            expect(new Set(definitionIds).size, slug).toBe(
                definitionIds.length
            );
            for (const reference of localReferences) {
                expect(definitionIds, `${slug}: #${reference}`).toContain(
                    reference
                );
            }
            allDefinitionIds.push(...definitionIds);
        }

        expect(new Set(allDefinitionIds).size).toBe(allDefinitionIds.length);
    });

    it.each(standaloneNames)(
        "%s has unique accessible labeling and stable subject metadata",
        (name) => {
            const slug = path.basename(name, ".svg");
            const source = fs.readFileSync(
                path.join(assetDirectory, name),
                "utf8"
            );
            const attributes = openingAttributes(source);
            const titleId = `${slug}-title`;
            const descriptionId = `${slug}-description`;
            const title = source.match(
                new RegExp(`<title id="${titleId}">([^<]+)<\\/title>`)
            )?.[1];
            const description = source.match(
                new RegExp(`<desc id="${descriptionId}">([^<]+)<\\/desc>`)
            )?.[1];

            expect(attributes.role).toBe("img");
            expect(attributes.focusable).toBe("false");
            expect(attributes["data-plant-slug"]).toBe(slug);
            expect(attributes["aria-labelledby"]).toBe(
                `${titleId} ${descriptionId}`
            );
            expect(title).toMatch(/ plant portrait$/);
            expect(description?.length).toBeGreaterThan(30);
            expect(source).not.toContain('id="title"');
            expect(source).not.toContain("><");
            expect(source).not.toMatch(leadingZeroOmissionPattern);
        }
    );
});
