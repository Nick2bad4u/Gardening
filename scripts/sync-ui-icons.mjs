import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { format, resolveConfig } from "prettier";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const spritePath = path.join(root, "docs/plant-booklet/plant-icons.svg");
const loggerPath = path.join(root, "scripts/google-sheets/Index.html");
const assetDirectory = path.join(root, "assets/ui-icons");

export function parseUiIcons(sprite) {
    return [
        ...sprite.matchAll(
            /<symbol\s+id="icon-([a-z-]+)"\s+viewBox="([^"]+)"\s*>([\s\S]*?)<\/symbol>/g
        ),
    ]
        .filter((match) => !match[1].startsWith("plant-"))
        .map((match) => ({
            name: match[1],
            viewBox: match[2],
            body: match[3].trim(),
        }));
}

function titleFor(name) {
    return name
        .replaceAll("-", " ")
        .replace(/^./, (character) => character.toUpperCase());
}

function loggerSymbol({ name, viewBox, body }) {
    const namespaced = body
        .replaceAll(/id="([^"]+)"/g, 'id="app-$1"')
        .replaceAll("url(#", "url(#app-")
        .replaceAll('href="#', 'href="#app-');
    return `<symbol id="app-icon-${name}" viewBox="${viewBox}">\n${namespaced}\n</symbol>`;
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
        logger.replace(
            /<symbol\s+id="app-icon-([a-z-]+)"[\s\S]*?<\/symbol>/g,
            (_, name) => {
                if (!byName.has(name))
                    throw new Error(`Unmapped logger icon: ${name}`);
                return loggerSymbol(byName.get(name));
            }
        ),
        { ...config, filepath: loggerPath }
    );
    const outputs = icons.map(({ name, viewBox, body }) => {
        if (viewBox !== "0 0 64 64")
            throw new Error(`UI icon ${name} needs a 64-unit viewBox.`);
        return {
            name: `${name}.svg`,
            value: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="ui-${name}-title" data-ui-icon="${name}" focusable="false">\n  <title id="ui-${name}-title">${titleFor(name)}</title>\n${body}\n</svg>\n`,
        };
    });
    if (checkOnly) {
        if (logger !== nextLogger)
            throw new Error(
                "Logger UI icons are stale. Run npm run build:booklet."
            );
        const names = (await readdir(assetDirectory))
            .filter((name) => name.endsWith(".svg"))
            .sort();
        if (
            names.join("\n") !==
            outputs
                .map(({ name }) => name)
                .sort()
                .join("\n")
        ) {
            throw new Error("Standalone UI-icon inventory is stale.");
        }
        for (const { name, value } of outputs) {
            if (
                (await readFile(path.join(assetDirectory, name), "utf8")) !==
                value
            ) {
                throw new Error(
                    `UI icon ${name} is stale. Run npm run build:booklet.`
                );
            }
        }
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

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
    const icons = await syncUiIcons({
        checkOnly: process.argv.includes("--check"),
    });
    console.log(
        `Verified/synchronized ${icons.length} shared interface icons.`
    );
}
