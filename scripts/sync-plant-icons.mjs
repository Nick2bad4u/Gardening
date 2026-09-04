import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { format, resolveConfig } from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const spritePath = path.join(
    repositoryRoot,
    "docs",
    "plant-booklet",
    "plant-icons.svg"
);
const profileDataPath = path.join(
    repositoryRoot,
    "docs",
    "layouts",
    "plant-profile-data.json"
);
const loggerPath = path.join(
    repositoryRoot,
    "scripts",
    "google-sheets",
    "Index.html"
);
const assetDirectory = path.join(repositoryRoot, "assets", "plant-icons");
const startMarker = "<!-- GENERATED PLANT ICONS START -->";
const endMarker = "<!-- GENERATED PLANT ICONS END -->";

function escapeXml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function parsePlantSymbols(sprite) {
    return [
        ...sprite.matchAll(
            /<symbol\s+id="icon-plant-([^"]+)"\s+viewBox="([^"]+)"\s*>([\s\S]*?)<\/symbol>/g
        ),
    ].map((match) => ({
        slug: match[1],
        viewBox: match[2],
        body: match[3].trim(),
    }));
}

function replaceGeneratedLoggerSymbols(logger, symbols) {
    const start = logger.indexOf(startMarker);
    const end = logger.indexOf(endMarker);
    if (start < 0 || end < start) {
        throw new Error(
            "The logger is missing its generated plant-icon boundary markers."
        );
    }
    const generated = symbols
        .map(
            ({ slug, viewBox, body }) =>
                `<symbol id="app-icon-plant-${slug}" viewBox="${viewBox}">\n${body}\n</symbol>`
        )
        .join("\n\n");
    return `${logger.slice(0, start + startMarker.length)}\n${generated}\n${logger.slice(end)}`;
}

async function formatted(value, filepath) {
    const config = (await resolveConfig(filepath)) ?? {};
    return format(value, { ...config, filepath });
}

function profileTitles(profileData) {
    const titles = new Map(
        Object.values(profileData)
            .flat()
            .map(([slug, title]) => [slug, title])
    );
    // The historical, removed Rehab-04 profile is intentionally absent from
    // the live tracker map but still has a booklet portrait and export.
    titles.set("mammillaria-bombycina", "Silken pincushion cactus");
    return titles;
}

export async function syncPlantIcons({ checkOnly = false } = {}) {
    const [
        sprite,
        profileData,
        logger,
    ] = await Promise.all([
        readFile(spritePath, "utf8"),
        readFile(profileDataPath, "utf8").then(JSON.parse),
        readFile(loggerPath, "utf8"),
    ]);
    const symbols = parsePlantSymbols(sprite);
    const titles = profileTitles(profileData);
    if (symbols.length !== titles.size) {
        throw new Error(
            `Expected ${titles.size} plant portraits but found ${symbols.length} in the sprite.`
        );
    }
    for (const { slug } of symbols) {
        if (!titles.has(slug)) {
            throw new Error(`Plant portrait ${slug} has no profile title.`);
        }
    }

    const nextLogger = await formatted(
        replaceGeneratedLoggerSymbols(logger, symbols),
        loggerPath
    );
    const standalone = await Promise.all(
        symbols.map(async ({ slug, viewBox, body }) => {
            const filepath = path.join(assetDirectory, `${slug}.svg`);
            const title = titles.get(slug);
            const indentedBody = body
                .split(/\r?\n/)
                .map((line) => `  ${line.trim()}`)
                .join("\n");
            return {
                filepath,
                output: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="title">\n  <title id="title">${escapeXml(title)} plant portrait</title>\n${indentedBody}\n</svg>\n`,
                slug,
            };
        })
    );

    if (checkOnly) {
        if (logger !== nextLogger) {
            throw new Error(
                "The logger plant portraits are stale. Run `npm run build:booklet`."
            );
        }
        const currentAssetNames = await readdir(assetDirectory).catch(() => []);
        const expectedAssetNames = standalone.map(({ filepath }) =>
            path.basename(filepath)
        );
        if (
            currentAssetNames
                .filter((name) => name.endsWith(".svg"))
                .sort()
                .join("\n") !== expectedAssetNames.sort().join("\n")
        ) {
            throw new Error(
                "The standalone plant-portrait asset inventory is stale. Run `npm run build:booklet`."
            );
        }
        for (const { filepath, output, slug } of standalone) {
            const current = await readFile(filepath, "utf8").catch(() => "");
            if (current !== output) {
                throw new Error(
                    `Standalone plant portrait ${slug} is stale. Run \`npm run build:booklet\`.`
                );
            }
        }
        return symbols;
    }

    await mkdir(assetDirectory, { recursive: true });
    await Promise.all([
        writeFile(loggerPath, nextLogger, "utf8"),
        ...standalone.map(({ filepath, output }) =>
            writeFile(filepath, output, "utf8")
        ),
    ]);
    return symbols;
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
    const symbols = await syncPlantIcons({
        checkOnly: process.argv.includes("--check"),
    });
    console.log(
        `${process.argv.includes("--check") ? "Verified" : "Synchronized"} ${symbols.length} custom plant portraits.`
    );
}
