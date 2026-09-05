import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { format, resolveConfig } from "prettier";

import { compareText, isNonemptyString, required } from "./build-data.mjs";

const root = path.resolve(import.meta.dirname, "..");
const spritePath = path.join(root, "docs/plant-booklet/plant-icons.svg");
const loggerPath = path.join(root, "scripts/google-sheets/Index.html");
const assetDirectory = path.join(root, "assets/ui-icons");

/**
 * @param {string} sprite
 */
export function parseUiIcons(sprite) {
    return sprite
        .matchAll(
            /<symbol\s+id="icon-(?<slug>[\-a-z]+)"\s+viewBox="(?<viewBox>[^"]+)"\s*>(?<body>[\s\S]*?)<\/symbol>/gv
        )
        .filter(
            (match) =>
                !required(match.groups?.["slug"], "UI icon name").startsWith(
                    "plant-"
                )
        )
        .map((match) => ({
            body: required(match.groups?.["body"], "UI icon body").trim(),
            name: required(match.groups?.["slug"], "UI icon name"),
            viewBox: required(match.groups?.["viewBox"], "UI icon viewBox"),
        }))
        .toArray();
}

export async function syncUiIcons({ checkOnly = false } = {}) {
    const [sprite, logger] = await Promise.all([
        readFile(spritePath, "utf8"),
        readFile(loggerPath, "utf8"),
    ]);
    const icons = parseUiIcons(sprite);
    const byName = new Map(icons.map((icon) => [icon.name, icon]));
    if (icons.length !== 83 || byName.size !== icons.length) {
        throw new Error("Expected 83 unique shared interface/category icons.");
    }
    const config = await resolveConfig(loggerPath);
    const nextLogger = await format(
        logger.replaceAll(
            /<symbol\s+id="app-icon-(?<icon>[\-a-z]+)"[\s\S]*?<\/symbol>/gv,
            (/** @type {string} */ _match, /** @type {string} */ name) => {
                if (!byName.has(name))
                    throw new Error(`Unmapped logger icon: ${name}`);
                return loggerSymbol(
                    required(byName.get(name), `logger icon ${name}`)
                );
            }
        ),
        { ...config, filepath: loggerPath }
    );
    const outputs = icons.map(({ body, name, viewBox }) => {
        if (viewBox !== "0 0 64 64")
            throw new Error(`UI icon ${name} needs a 64-unit viewBox.`);
        return {
            name: `${name}.svg`,
            value: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="${viewBox}" role="img" aria-labelledby="ui-${name}-title" aria-describedby="ui-${name}-description" data-ui-icon="${name}" focusable="false">\n  <title id="ui-${name}-title">${titleFor(name)}</title>\n${body}\n</svg>\n`,
        };
    });
    if (checkOnly) {
        if (logger !== nextLogger)
            throw new Error(
                "Logger UI icons are stale. Run npm run build:booklet."
            );
        const directoryEntries1 = await readdir(assetDirectory);
        const names = directoryEntries1
            .filter((name) => name.endsWith(".svg"))
            .toSorted(compareText);
        if (
            names.join("\n") !==
            outputs
                .map(({ name }) => name)
                .toSorted(compareText)
                .join("\n")
        ) {
            throw new Error("Standalone UI-icon inventory is stale.");
        }
        await Promise.all(
            outputs.map(async ({ name, value }) => {
                if (
                    (await readFile(
                        path.join(assetDirectory, name),
                        "utf8"
                    )) !== value
                ) {
                    throw new Error(
                        `UI icon ${name} is stale. Run npm run build:booklet.`
                    );
                }
            })
        );
    } else {
        await mkdir(assetDirectory, { recursive: true });
        await Promise.all([
            writeFile(loggerPath, nextLogger, "utf8"),
            ...outputs.map(({ name, value }) =>
                writeFile(path.join(assetDirectory, name), value, "utf8")
            ),
        ]);
    }
    return icons;
}

/**
 * @param {ReturnType<typeof parseUiIcons>[number]} icon
 */
function loggerSymbol({ body, name, viewBox }) {
    const namespaced = body
        .replaceAll(/id="(?<id>[^"]+)"/gv, 'id="app-$<id>"')
        .replaceAll("url(#", "url(#app-")
        .replaceAll('href="#', 'href="#app-');
    return `<symbol id="app-icon-${name}" viewBox="${viewBox}">\n${namespaced}\n</symbol>`;
}

/**
 * @param {string} name
 */
function titleFor(name) {
    return name
        .replaceAll("-", " ")
        .replace(/^./v, (/** @type {string} */ character) =>
            character.toUpperCase()
        );
}

if (
    isNonemptyString(process.argv[1]) &&
    import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
    const icons = await syncUiIcons({
        checkOnly: process.argv.includes("--check"),
    });
    process.stdout.write(
        `Verified/synchronized ${icons.length} shared interface icons.\n`
    );
}
