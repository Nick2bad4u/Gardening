import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

import { required } from "./helpers/required.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const assetDirectory = path.join(repositoryRoot, "assets", "plant-icons");
const sprite = fs.readFileSync(
    path.join(repositoryRoot, "docs", "plant-booklet", "plant-icons.svg"),
    "utf8"
);
const standaloneNames = fs
    .readdirSync(assetDirectory)
    .filter((name) => name.endsWith(".svg"))
    .toSorted((left, right) => left.localeCompare(right));
const plantSymbols = Array.from(
    sprite.matchAll(
        /<symbol\s+id="icon-plant-(?<slug>[^"]+)"\s+viewBox="(?<viewBox>[^"]+)"\s*>(?<body>[\s\S]*?)<\/symbol>/gv
    ),
    (match) => ({
        body: required(match.groups?.["body"]),
        slug: required(match.groups?.["slug"]),
        viewBox: required(match.groups?.["viewBox"]),
    })
);
const leadingZeroOmissionPattern =
    /(?:^|\D)\.(?=\d)|(?<![\d.])\d+\.\d+\.(?=\d)/mv;

/** @param {string} source @param {RegExp} pattern @param {string} id */
function accessibleText(source, pattern, id) {
    const match = source
        .matchAll(pattern)
        .find((item) => item.groups?.["id"] === id);
    return required(match?.groups?.["text"], `accessible text for ${id}`);
}

/** @param {string} source @returns {Record<string, string>} */
function openingAttributes(source) {
    const openingTag = /^<svg\b[^>]*>/v.exec(source)?.[0] ?? "";
    /** @type {Record<string, string>} */
    const attributes = {};
    for (const match of openingTag.matchAll(
        /\b(?<name>[\w\-:]+)="(?<value>[^"]*)"/gv
    )) {
        attributes[required(match.groups?.["name"])] = required(
            match.groups?.["value"]
        );
    }
    return attributes;
}

describe("custom plant portrait exports", () => {
    it("keeps 36 profiles and two shared-planter exports aligned with the canonical sprite", () => {
        expect.hasAssertions();

        const slugs = plantSymbols.map(({ slug }) => slug);

        expect(plantSymbols).toHaveLength(38);

        const uniqueSlugs = new Set(slugs);

        expect(uniqueSlugs.size).toBe(38);
        expect(standaloneNames).toHaveLength(38);
        expect(standaloneNames).toStrictEqual(
            slugs
                .map((slug) => `${slug}.svg`)
                .toSorted((left, right) => left.localeCompare(right))
        );
    });

    it("keeps canonical portrait markup readable and explicit", () => {
        expect.hasAssertions();

        for (const { body, slug, viewBox } of plantSymbols) {
            expect(viewBox, slug).toBe("0 0 64 64");
            expect(body, slug).not.toContain("><");
            expect(body, slug).not.toMatch(leadingZeroOmissionPattern);
        }
    });

    it("keeps advanced SVG definitions unique and standalone-safe", () => {
        expect.hasAssertions();

        /** @type {string[]} */
        const allDefinitionIds = [];

        for (const { body, slug } of plantSymbols) {
            const definitionIds = Array.from(
                body.matchAll(/\bid="(?<id>[^"]+)"/gv),
                (match) => required(match.groups?.["id"])
            );
            const localReferences = Array.from(
                body.matchAll(
                    /(?:href="#|url\(#)(?<reference>[A-Za-z][\w\-:]*)["\)]/gv
                ),
                (match) => required(match.groups?.["reference"])
            );

            const uniqueDefinitionIds = new Set(definitionIds);

            expect(uniqueDefinitionIds.size, slug).toBe(definitionIds.length);

            for (const reference of localReferences) {
                expect(definitionIds, `${slug}: #${reference}`).toContain(
                    reference
                );
            }
            allDefinitionIds.push(...definitionIds);
        }

        const uniqueDefinitionIds = new Set(allDefinitionIds);

        expect(uniqueDefinitionIds.size).toBe(allDefinitionIds.length);
    });

    it.each(standaloneNames)(
        "%s has unique accessible labeling and stable subject metadata",
        (name) => {
            expect.hasAssertions();

            const slug = path.basename(name, ".svg");
            const source = fs.readFileSync(
                path.join(assetDirectory, name),
                "utf8"
            );
            const attributes = openingAttributes(source);
            const titleId = `${slug}-title`;
            const descriptionId = `${slug}-description`;
            const title = accessibleText(
                source,
                /<title id="(?<id>[^"]+)">(?<text>[^<]+)<\/title>/gv,
                titleId
            );
            const description = accessibleText(
                source,
                /<desc id="(?<id>[^"]+)">(?<text>[^<]+)<\/desc>/gv,
                descriptionId
            );

            expect(attributes["role"]).toBe("img");
            expect(attributes["focusable"]).toBe("false");
            expect(attributes["data-plant-slug"]).toBe(slug);
            expect(attributes["aria-labelledby"]).toBe(
                `${titleId} ${descriptionId}`
            );
            expect(title).toMatch(/ plant portrait$/v);
            expect(description.length).toBeGreaterThan(30);
            expect(source).not.toContain('id="title"');
            expect(source).not.toContain("><");
            expect(source).not.toMatch(leadingZeroOmissionPattern);
        }
    );
});
