import upstream from "@html-eslint/parser";
import { createRequire } from "node:module";

/** @import {ParserOptions} from "@html-eslint/parser" */
/** @import {getLineInfo} from "es-html-parser/dist/utils/get-line-info.js" */

/** @typedef {{ start: number; end: number }} LineBreak */
/** @typedef {{ getLineInfo: typeof getLineInfo }} LocationModule */

// This private CommonJS hook is specific to these releases. Remove the adapter
// once an upstream release fixes repeated source-prefix scans, and revalidate
// full parse-result equivalence before changing either version guard.
const upstreamRequire = createRequire(
    import.meta.resolve("@html-eslint/parser")
);
/** @type {unknown} */
const rawPackage = upstreamRequire("es-html-parser/package.json");

if (
    rawPackage === null ||
    typeof rawPackage !== "object" ||
    !("version" in rawPackage) ||
    rawPackage.version !== "0.3.1" ||
    upstream.meta.version !== "0.65.0"
) {
    throw new Error(
        "Revalidate the HTML location adapter: expected @html-eslint/parser@0.65.0 and es-html-parser@0.3.1."
    );
}

// Resolve from the public parser so a nested es-html-parser installation cannot
// accidentally leave the tokenizer using a different CommonJS module instance.
/** @type {unknown} */
const locationModule = upstreamRequire(
    "es-html-parser/dist/utils/get-line-info.js"
);

/** @param {unknown} value @returns {value is LocationModule} */
function isLocationModule(value) {
    return (
        typeof value === "object" &&
        value !== null &&
        "getLineInfo" in value &&
        typeof value.getLineInfo === "function"
    );
}

if (!isLocationModule(locationModule)) {
    throw new Error(
        "The es-html-parser location helper changed; revalidate the HTML location adapter."
    );
}

/** @returns {typeof getLineInfo} */
function createIndexedLookup() {
    // Each synchronous parse owns its cache, including any frontmatter-stripped
    // source. Restoring the previous helper releases the document and its index.
    /** @type {Map<string, LineBreak[]>} */
    const sources = new Map();

    return (input, offset) => {
        let breaks = sources.get(input);
        if (breaks === undefined) {
            breaks = [];
            // RegExp indices and string lengths count UTF-16 code units, just
            // like the upstream tokenizer, including inside astral characters.
            for (const match of input.matchAll(
                /\r\n|[\n\r\u{2028}\u{2029}]/gv
            )) {
                breaks.push({
                    end: match.index + match[0].length,
                    start: match.index,
                });
            }
            sources.set(input, breaks);
        }

        let low = 0;
        let high = breaks.length;
        while (low < high) {
            const middle = Math.floor((low + high) / 2);
            const current = breaks[middle];
            if (current !== undefined && current.start < offset) {
                low = middle + 1;
            } else {
                high = middle;
            }
        }

        const previous = breaks[low - 1];
        // Upstream counts a CR as a line break even when the offset is between
        // that CR and its LF. Clamp the line start to preserve its zero column.
        const start =
            previous === undefined ? 0 : Math.min(offset, previous.end);
        return { column: offset - start, line: low + 1 };
    };
}

const parser = {
    ...upstream,
    // ESLint content caches must distinguish the adapter from the public parser.
    meta: { name: "gardening-html-parser", version: "0.65.0-location-index-1" },

    /**
     * @param {string} code
     * @param {ParserOptions} [options]
     *
     * @returns {ReturnType<typeof upstream.parseForESLint>}
     */
    parseForESLint(code, options) {
        const previous = locationModule.getLineInfo;
        locationModule.getLineInfo = createIndexedLookup();
        try {
            return upstream.parseForESLint(code, options);
        } finally {
            // Parsing is synchronous. Also restore an outer adapter invocation
            // if parser-option getters synchronously start a nested parse.
            locationModule.getLineInfo = previous;
        }
    },
};

export default parser;
