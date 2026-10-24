import { readFile } from "node:fs/promises";
import * as path from "node:path";

import { parsePlantSymbols } from "../../scripts/sync-plant-icons.mjs";
import { parseUiIcons } from "../../scripts/sync-ui-icons.mjs";
import { getContainers } from "./containers.mjs";

const allowedTags = new Set([
    "circle",
    "clipPath",
    "defs",
    "desc",
    "ellipse",
    "g",
    "linearGradient",
    "mask",
    "path",
    "pattern",
    "radialGradient",
    "rect",
    "stop",
    "use",
]);
const allowedAttributes = new Set([
    "clip-path",
    "clipPathUnits",
    "cx",
    "cy",
    "d",
    "data-app-icon-background",
    "fill",
    "height",
    "href",
    "id",
    "mask",
    "maskContentUnits",
    "maskUnits",
    "offset",
    "opacity",
    "paint-order",
    "patternUnits",
    "r",
    "rx",
    "ry",
    "stop-color",
    "stop-opacity",
    "stroke",
    "stroke-dasharray",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-opacity",
    "stroke-width",
    "transform",
    "width",
    "x",
    "x1",
    "x2",
    "y",
    "y1",
    "y2",
]);
const uiNames = new Set([
    "calendar",
    "clock",
    "info",
    "light",
    "pin",
    "plant",
    "water",
]);

/**
 * Reuse the checked canonical portrait export and container portrait mapping.
 * Only these build-time vectors enter the renderer; Sheet data supplies text.
 *
 * @returns {Promise<{
 *     definitions: string;
 *     portraits: Record<string, string>;
 * }>}
 */
export async function getWateringArtwork() {
    const spritePath = path.join(
        process.cwd(),
        "assets/artwork/plant-icons.svg"
    );
    const [containers, sprite] = await Promise.all([
        getContainers(),
        readFile(spritePath, "utf8"),
    ]);
    const symbols = parsePlantSymbols(sprite);
    const bySlug = new Map(symbols.map((symbol) => [symbol.slug, symbol]));
    const slugs = new Set(
        containers.map((container) => container.portraitSlug)
    );
    const definitions = [...slugs].map((slug) => {
        const symbol = bySlug.get(slug);
        if (!symbol) throw new Error(`Missing watering map portrait: ${slug}`);
        const body = namespaceArtwork(symbol.body, `wm-art-plant-${slug}-`);
        return `<symbol id="wm-art-plant-${slug}" viewBox="0 0 64 64">${body}</symbol>`;
    });
    for (const icon of parseUiIcons(sprite)) {
        if (!uiNames.has(icon.name)) continue;
        const body = namespaceArtwork(icon.body, `wm-art-ui-${icon.name}-`);
        definitions.push(
            `<symbol id="wm-art-ui-${icon.name}" viewBox="0 0 64 64">${body}</symbol>`
        );
    }
    return {
        definitions: definitions.join("\n"),
        portraits: Object.fromEntries(
            containers.map(({ id, portraitSlug }) => [id, portraitSlug])
        ),
    };
}

/**
 * Fail closed on executable markup, CSS, external references or ambiguous IDs.
 * The canonical icon exporter checks inventory and viewBoxes; this extra narrow
 * grammar protects its new inline use and namespaces every local definition.
 *
 * @param {string} source
 * @param {string} prefix
 */
export function namespaceArtwork(source, prefix) {
    if (!/^[a-z][\w\-]*$/v.test(prefix))
        throw new Error("Invalid artwork namespace.");
    let body = source.replaceAll(/<!--[\s\S]*?-->/gv, "");
    /** @type {Set<string>} */
    const ids = new Set();
    /** @type {Set<string>} */
    const references = new Set();
    const tagPattern = /<(?<tag>[^<>]+)>/gv;
    for (const match of body.matchAll(tagPattern)) {
        validateTag(match.groups?.["tag"] ?? "", ids, references);
    }
    if (body.replaceAll(tagPattern, "").includes("<"))
        throw new Error("Unsupported inline artwork markup.");
    for (const reference of references) {
        if (!ids.has(reference))
            throw new Error(`Missing artwork definition: ${reference}`);
    }
    for (const id of ids) {
        body = body
            .replaceAll(`id="${id}"`, () => `id="${prefix}${id}"`)
            .replaceAll(`href="#${id}"`, () => `href="#${prefix}${id}"`)
            .replaceAll(`url(#${id})`, () => `url(#${prefix}${id})`);
    }
    return body;
}

/**
 * @param {string} name @param {string} value @param {Set<string>} ids @param
 *   {Set<string>} references
 */
function validateAttribute(name, value, ids, references) {
    if (!allowedAttributes.has(name))
        throw new Error(`Unsupported artwork attribute: ${name}`);
    // XML entities and CSS escapes decode before paint/link interpretation.
    // Canonical artwork needs neither; reject them before reference checks so
    // encoded URL tokens cannot bypass the local-only grammar.
    if (value.includes("&") || value.includes("\\"))
        throw new Error(
            "Encoded values are not allowed in artwork attributes."
        );
    if (name === "id") {
        if (!/^[A-Za-z][\w\-]*$/v.test(value) || ids.has(value))
            throw new Error("Invalid or duplicate artwork ID.");
        ids.add(value);
    } else if (name === "href") {
        if (!/^#[A-Za-z][\w\-]*$/v.test(value))
            throw new Error("External artwork reference.");
        references.add(value.slice(1));
    } else {
        const localPaint = /url\(#(?<id>[A-Za-z][\w\-]*)\)/gv;
        if (value.replaceAll(localPaint, "").toLowerCase().includes("url"))
            throw new Error("External artwork paint reference.");
        for (const match of value.matchAll(localPaint))
            references.add(match.groups?.["id"] ?? "");
    }
}

/** @param {string} tag @param {Set<string>} ids @param {Set<string>} references */
function validateTag(tag, ids, references) {
    const content = tag.replace(/^\//v, "").replace(/\/$/v, "").trim();
    const separator = content.search(/\s/v);
    const name = separator === -1 ? content : content.slice(0, separator);
    if (!allowedTags.has(name))
        throw new Error("Unsupported inline artwork element.");
    const attributes = separator === -1 ? "" : content.slice(separator).trim();
    const pattern = /(?<name>[\w\-]+)="(?<value>[^"<>]*)"\s*/vy;
    let cursor = 0;
    while (cursor < attributes.length) {
        pattern.lastIndex = cursor;
        const match = pattern.exec(attributes);
        if (!match)
            throw new Error("Unsupported inline artwork attribute syntax.");
        validateAttribute(
            match.groups?.["name"] ?? "",
            match.groups?.["value"] ?? "",
            ids,
            references
        );
        cursor = pattern.lastIndex;
    }
}
