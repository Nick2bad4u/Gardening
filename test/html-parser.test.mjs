import parser from "@html-eslint/parser";
import { describe, expect, it } from "vitest";

/** @import {ParserOptions} from "@html-eslint/parser" */

/** @param {string} source @param {number} offset */
function expectedLocation(source, offset) {
    const lines = source.slice(0, offset).split(/\r\n|[\n\r\u{2028}\u{2029}]/v);
    return { column: lines.at(-1)?.length ?? 0, line: lines.length };
}

/**
 * Check nested HTML/CSS nodes, tokens, and comments against their source
 * ranges. The independent prefix oracle is deliberately limited to these small
 * fixtures.
 *
 * @param {unknown} value
 * @param {string} source
 * @param {WeakSet<object>} [seen]
 *
 * @returns {number}
 */
function expectSourceLocations(value, source, seen = new WeakSet()) {
    if (typeof value !== "object" || value === null || seen.has(value)) {
        return 0;
    }
    seen.add(value);
    let checked = 0;
    if ("range" in value && "loc" in value && Array.isArray(value.range)) {
        /** @type {unknown[]} */
        const [start, end] = value.range;
        if (typeof start !== "number" || typeof end !== "number") {
            throw new TypeError("Parser ranges must contain numeric offsets.");
        }

        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeGreaterThanOrEqual(start);
        expect(end).toBeLessThanOrEqual(source.length);
        expect(value.loc).toMatchObject({
            end: expectedLocation(source, end),
            start: expectedLocation(source, start),
        });

        checked += 1;
    }
    for (const child of Object.values(value)) {
        checked += expectSourceLocations(child, source, seen);
    }
    return checked;
}
/**
 * @type {{
 *     name: string;
 *     source: string;
 *     options?: ParserOptions;
 *     recoveredEnd?: number;
 * }[]}
 */
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
        options: { templateEngineSyntax: parser.TEMPLATE_ENGINE_SYNTAX.TWIG },
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
            templateEngineSyntax: parser.TEMPLATE_ENGINE_SYNTAX.TWIG,
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
        recoveredEnd: 47,
        source: '<div><p title="open">Care<br><span>🪴</div><!-- unfinished',
    },
];

describe("public HTML parser", () => {
    it.each(fixtures)(
        "preserves source locations throughout $name",
        ({ options, recoveredEnd, source }) => {
            expect.hasAssertions();

            const result = parser.parseForESLint(source, options);

            expect(result.ast.type).toBe("Program");
            expect(result.ast.range?.[1]).toBe(recoveredEnd ?? source.length);
            expect(expectSourceLocations(result.ast, source)).toBeGreaterThan(
                0
            );
            expect(result.visitorKeys).toBe(parser.visitorKeys);
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
            const result = parser.parseForESLint(source, undefined);

            expect(expectSourceLocations(result.ast, source)).toBeGreaterThan(
                20
            );
            expect(result.ast.loc?.end).toStrictEqual(
                expectedLocation(source, source.length)
            );
            expect(result.ast.comments).toHaveLength(1);
        }
    );

    it("parses independently after an option getter throws", () => {
        expect.hasAssertions();

        const failure = new Error("Parser option evaluation failed");
        const expected = parser.parseForESLint("<p>Recovered</p>", undefined);
        const options = {
            /** @returns {never} */
            get frontmatter() {
                throw failure;
            },
        };

        expect(() => parser.parseForESLint("<p>Care</p>", options)).toThrow(
            failure
        );
        expect(
            parser.parseForESLint("<p>Recovered</p>", undefined)
        ).toStrictEqual(expected);
    });

    it("keeps source locations independent across a synchronous nested parse", () => {
        expect.hasAssertions();

        const source = "<p>Outer\n🪴</p>";
        const expected = parser.parseForESLint(source, undefined);
        const actual = parser.parseForESLint(source, {
            get frontmatter() {
                const innerSource = "<p>Inner\r\n🌱</p>";
                const inner = parser.parseForESLint(innerSource, undefined);

                expect(
                    expectSourceLocations(inner.ast, innerSource)
                ).toBeGreaterThan(0);

                return false;
            },
        });

        expect(actual).toStrictEqual(expected);
    });

    it("parses a bounded larger document through its final token", () => {
        expect.hasAssertions();

        const repetitions = 2000;
        const source = `<main>\n${'<section><span title="🪴">Care</span></section>\n'.repeat(repetitions)}</main>`;
        const result = parser.parseForESLint(source, undefined);

        expect(result.ast.range).toStrictEqual([0, source.length]);
        expect(result.ast.tokens?.at(-1)?.range).toStrictEqual([
            source.length - "</main>".length,
            source.length,
        ]);
        expect(result.ast.loc?.end).toStrictEqual({
            column: "</main>".length,
            line: repetitions + 2,
        });
    });
});
