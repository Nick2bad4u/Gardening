import upstream from "@html-eslint/parser";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

import parser from "../scripts/html-eslint-parser.mjs";

/** @import {ParserOptions} from "@html-eslint/parser" */
/** @import {getLineInfo} from "es-html-parser/dist/utils/get-line-info.js" */

const upstreamRequire = createRequire(
    import.meta.resolve("@html-eslint/parser")
);
/** @type {unknown} */
const locationModule = upstreamRequire(
    "es-html-parser/dist/utils/get-line-info.js"
);

/** @param {unknown} value @returns {value is {getLineInfo: typeof getLineInfo}} */
function hasLocationLookup(value) {
    return (
        typeof value === "object" &&
        value !== null &&
        "getLineInfo" in value &&
        typeof value.getLineInfo === "function"
    );
}

if (!hasLocationLookup(locationModule)) {
    throw new Error("The pinned parser's location helper is unavailable.");
}

const originalLookup = locationModule.getLineInfo;

/** @type {{ name: string; source: string; options?: ParserOptions }[]} */
const fixtures = [
    { name: "empty input and omitted options", source: "" },
    {
        name: "HTML, comments, entities, and attributes",
        options: {},
        source: '<!doctype html>\n<html lang="en"><head><title>Plants &amp; pots</title></head><body><!-- care 🪴 --><p data-empty="" class=care>Water &lt; soil</p><input disabled><br></body></html>',
    },
    {
        name: "inline CSS and its nested stylesheet AST",
        source: '<style>/* care */\n@media (width > 390px) { .plant::before { content: "🪴"; color: green; } }\n</style><p style="color: red">Care</p>',
    },
    {
        name: "inline JavaScript raw content",
        source: `<script type="module">
const markup = "<p>🪴</p>";
const label = \`care \${markup}\`;
if (1 < 2) { document.title = label; }
</script>`,
    },
    {
        name: "SVG, namespaces, and foreign content",
        source: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><symbol id="leaf"><path d="M0 0L1 1"/></symbol></defs><use href="#leaf"/><foreignObject><div>🪴</div></foreignObject></svg>',
    },
    {
        name: "shorthand template delimiters",
        options: { templateEngineSyntax: { "{{": "}}" } },
        source: '<p id="{{ plant.id }}">{{ greeting }} &amp; {{ plant.name }}</p>',
    },
    {
        name: "template comments and conditional branches",
        options: { templateEngineSyntax: upstream.TEMPLATE_ENGINE_SYNTAX.TWIG },
        source: '{# care #}\n{% if plant %}<p id="care">{{ plant }}</p>{% else %}<p id="care">None</p>{% endif %}',
    },
    {
        name: "frontmatter and shifted CSS locations",
        options: { frontmatter: true },
        source: "---\nname: plant\n---\n<style>p { color: green; }</style>\n<p>🪴</p>",
    },
    {
        name: "frontmatter combined with template branches",
        options: {
            frontmatter: true,
            templateEngineSyntax: upstream.TEMPLATE_ENGINE_SYNTAX.TWIG,
        },
        source: '---\r\nname: plant\r\n---\r\n{% if plant %}<p id="care">🪴</p>{% else %}<p id="care">None</p>{% endif %}',
    },
    {
        name: "explicit raw-content tags",
        options: { rawContentTags: ["custom"] },
        source: "<custom><p>{{ greeting }}</p></custom><p>Parsed normally</p>",
    },
    {
        name: "recoverable malformed markup",
        options: {},
        source: '<div><p title="open">Care<br><span>🪴</div><!-- unfinished',
    },
];

describe("indexed HTML parser", () => {
    it.each(fixtures)(
        "preserves the complete parse result for $name",
        ({ options, source }) => {
            expect.hasAssertions();

            const expected = upstream.parseForESLint(source, options);
            const actual = parser.parseForESLint(source, options);

            expect(actual).toStrictEqual(expected);
            expect(locationModule.getLineInfo).toBe(originalLookup);
        }
    );

    it.each([
        { name: "LF", separator: "\n" },
        { name: "CR", separator: "\r" },
        { name: "CRLF", separator: "\r\n" },
        { name: "line separator", separator: "\u{2028}" },
        { name: "paragraph separator", separator: "\u{2029}" },
        { name: "mixed newlines", separator: "\r\r\n\n\u{2028}\u{2029}" },
    ])(
        "preserves all AST locations with $name and astral text",
        ({ separator }) => {
            expect.hasAssertions();

            const source = [
                "<!doctype html>",
                '<p title="🪴">😀',
                "<!-- care -->",
                "<span>🌱</span></p>",
                "",
            ].join(separator);
            const expected = upstream.parseForESLint(source, {});

            expect(parser.parseForESLint(source)).toStrictEqual(expected);
        }
    );

    it("preserves every UTF-16 offset, including inside CRLF and astral pairs", () => {
        expect.hasAssertions();

        const sources = [
            "",
            "plain",
            "\r\n\r\n",
            "a\r\r\n\nb",
            "😀\r\n🪴\n🌱\u{2028}x\u{2029}",
        ];
        const expected = sources.map((source) =>
            Array.from({ length: source.length + 1 }, (_, offset) =>
                originalLookup(source, offset)
            )
        );
        /** @type {ReturnType<typeof getLineInfo>[][]} */
        let actual = [];

        parser.parseForESLint("<p>Care</p>", {
            get frontmatter() {
                // The upstream option getter runs while the temporary helper is
                // installed, allowing boundary checks without exporting internals.
                actual = sources.map((source) =>
                    Array.from({ length: source.length + 1 }, (_, offset) =>
                        locationModule.getLineInfo(source, offset)
                    )
                );
                return false;
            },
        });

        expect(actual).toStrictEqual(expected);
        expect(locationModule.getLineInfo).toBe(originalLookup);
    });

    it("uses a fresh lookup for each parse and restores it after success", () => {
        expect.hasAssertions();

        /** @type {(typeof getLineInfo)[]} */
        const lookups = [];
        const options = {
            get frontmatter() {
                lookups.push(locationModule.getLineInfo);
                return false;
            },
        };

        parser.parseForESLint("<p>First</p>", options);
        const restoredAfterFirst = locationModule.getLineInfo;

        parser.parseForESLint("<p>Second</p>", options);

        expect(restoredAfterFirst).toBe(originalLookup);
        expect(locationModule.getLineInfo).toBe(originalLookup);
        expect(lookups).toHaveLength(2);
        expect(lookups[0]).not.toBe(originalLookup);
        expect(lookups[0]).not.toBe(lookups[1]);
    });

    it("restores the helper when the upstream parser throws", () => {
        expect.hasAssertions();

        const failure = new Error("Parser option evaluation failed");
        const options = {
            /** @returns {never} */
            get frontmatter() {
                throw failure;
            },
        };

        expect(() => parser.parseForESLint("<p>Care</p>", options)).toThrow(
            failure
        );
        expect(locationModule.getLineInfo).toBe(originalLookup);
        expect(parser.parseForESLint("<p>Recovered</p>")).toStrictEqual(
            upstream.parseForESLint("<p>Recovered</p>", undefined)
        );
    });

    it("restores the outer lookup after a synchronous nested parse", () => {
        expect.hasAssertions();

        const expected = upstream.parseForESLint("<p>Outer</p>", undefined);
        const actual = parser.parseForESLint("<p>Outer</p>", {
            get frontmatter() {
                const outer = locationModule.getLineInfo;
                parser.parseForESLint("<p>Inner</p>");

                expect(locationModule.getLineInfo).toBe(outer);

                return false;
            },
        });

        expect(actual).toStrictEqual(expected);
        expect(locationModule.getLineInfo).toBe(originalLookup);
    });

    it("retains parser exports and supplies distinct ESLint cache metadata", () => {
        expect.hasAssertions();

        expect(parser.NODE_TYPES).toBe(upstream.NODE_TYPES);
        expect(parser.TEMPLATE_ENGINE_SYNTAX).toBe(
            upstream.TEMPLATE_ENGINE_SYNTAX
        );
        expect(parser.visitorKeys).toBe(upstream.visitorKeys);
        expect(parser.meta.name).not.toBe(upstream.meta.name);
        expect(parser.meta.version).not.toBe(upstream.meta.version);
    });

    it("parses a bounded larger document through its final token", () => {
        expect.hasAssertions();

        const repetitions = 2000;
        const source = `<main>\n${'<section><span title="🪴">Care</span></section>\n'.repeat(repetitions)}</main>`;
        const result = parser.parseForESLint(source);

        expect(result.ast.range).toStrictEqual([0, source.length]);
        expect(result.ast.tokens?.at(-1)?.range).toStrictEqual([
            source.length - "</main>".length,
            source.length,
        ]);
        expect(result.ast.loc?.end).toStrictEqual({
            column: "</main>".length,
            line: repetitions + 2,
        });
        expect(locationModule.getLineInfo).toBe(originalLookup);
    });
});
