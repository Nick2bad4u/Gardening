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
const leadingZeroOmissionPattern = /(?:^|[^\d])\.(?=\d)|\d+\.\d+\.(?=\d)/m;

function escapeXml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function normalizeSymbolBody(value) {
    const lines = value
        .replace(/^\r?\n/, "")
        .replace(/\r?\n\s*$/, "")
        .split(/\r?\n/);
    const indentation = Math.min(
        ...lines
            .filter((line) => line.trim())
            .map((line) => line.match(/^\s*/)[0].length)
    );
    return lines.map((line) => line.slice(indentation)).join("\n");
}

function parsePlantSymbols(sprite) {
    return [
        ...sprite.matchAll(
            /<symbol\s+id="icon-plant-([^"]+)"\s+viewBox="([^"]+)"\s*>([\s\S]*?)<\/symbol>/g
        ),
    ].map((match) => ({
        slug: match[1],
        viewBox: match[2],
        body: normalizeSymbolBody(match[3]),
    }));
}

function replaceGeneratedLoggerSymbols(logger) {
    const start = logger.indexOf(startMarker);
    const end = logger.indexOf(endMarker);
    if (start < 0 || end < start) {
        throw new Error(
            "The logger is missing its generated plant-icon boundary markers."
        );
    }
    const generated =
        "<!-- Plant portraits load from their cached standalone SVG assets. -->";
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

function portraitDescriptions() {
    return new Map([
        [
            "aeonium-haworthii-dream-color",
            "Three branching green rosettes with magenta-edged leaves above a white planter.",
        ],
        [
            "astrophytum-ornatum",
            "A squat gray-green ribbed cactus with white flecks and long tan spines in a terracotta planter.",
        ],
        [
            "austrocylindropuntia-subulata",
            "A slim branching green cylindrical stem with pale awl-shaped leaves in a yellow planter.",
        ],
        [
            "cereus-forbesii-ming-thing",
            "A low knobbly green monstrose cactus clump in a purple planter.",
        ],
        [
            "chamaelobivia-hybrid",
            "A crowded mound of short ribbed peanut-shaped green stems in a blue planter.",
        ],
        [
            "cleistocactus-colademononis",
            "Three pale-haired cactus stems trailing from a hanging terracotta basket.",
        ],
        [
            "echeveria-pulidonis",
            "A gray-green succulent rosette with thin red leaf margins in a blue planter.",
        ],
        [
            "echeveria-raindrops",
            "A blue-green succulent rosette with rounded raised leaf bumps in a yellow planter.",
        ],
        [
            "echinocereus-rigidissimus-rubispinus",
            "An upright cactus wrapped in dense muted-pink radial spines in a terracotta planter.",
        ],
        [
            "echinopsis-spachiana",
            "A cluster of upright green torch cacti with golden ribs in a blue planter.",
        ],
        [
            "echinopsis-subdenudata",
            "A rounded dark-green ribbed cactus with white woolly areoles and a pale flower.",
        ],
        [
            "espostoa-melanostele-nana",
            "An upright gray-green cactus wrapped in dense cream-colored wool in a purple planter.",
        ],
        [
            "euphorbia-obesa-hybrid",
            "A round ribbed green body with rusty variegation and tiny red crown flowers in a yellow planter.",
        ],
        [
            "faucaria-tuberculosa",
            "A compact green rosette of triangular toothed leaves with pale raised tubercles.",
        ],
        [
            "gymnocalycium-mihanovichii-black-widow",
            "A low dark-purple ribbed cactus with pale radial spines in a mustard planter.",
        ],
        [
            "gymnocalycium-mihanovichii-variegated",
            "A round green cactus divided into coral and yellow variegated sectors in a blue planter.",
        ],
        [
            "gymnocalycium-saglionis",
            "A broad gray-green ribbed cactus with long golden spines in a terracotta planter.",
        ],
        [
            "kalanchoe-bracteata",
            "A branching succulent with silver spoon-shaped leaves in a terracotta planter.",
        ],
        [
            "kalanchoe-orgyalis",
            "A branching succulent with copper-brown spoon-shaped leaves in a blue planter.",
        ],
        [
            "mammillaria-bombycina",
            "A clustered green pincushion cactus with pale radial spines and pink crown flowers.",
        ],
        [
            "mammillaria-mammillaris",
            "A clustered green pincushion cactus with white starry areoles and pink crown flowers.",
        ],
        [
            "mammillaria-plumosa",
            "Three rounded cactus offsets covered in soft white feather-like spines in a blue planter.",
        ],
        [
            "mammillaria-rekoi",
            "A rounded green cactus covered in dense golden radial spines in a blue planter.",
        ],
        [
            "myrtillocactus-geometrizans-fukurokuryuzinboku",
            "A knobbly green column with stacked rounded bulges in a terracotta planter.",
        ],
        [
            "myrtillocactus-geometrizans-indigo-wave",
            "A blue-green crested cactus forming a low ruffled fan in a purple planter.",
        ],
        [
            "nyctocereus-serpentinus",
            "Three slender curving green cactus stems with pale areoles in a terracotta planter.",
        ],
        [
            "oreocereus-trollii",
            "An upright gray-green cactus covered in long cream wool and reddish spines.",
        ],
        [
            "pachira-glabra",
            "A braided brown trunk supporting three fans of green palmate leaves in a blue planter.",
        ],
        [
            "parodia-leninghausii",
            "An upright green cactus densely covered with golden ribs and radial spines in a purple planter.",
        ],
        [
            "pilosocereus-pachycladus-variegated",
            "A blue-green columnar cactus with a broad yellow variegated stripe in a terracotta planter.",
        ],
        [
            "pleiospilos-nelii-royal-flush",
            "A pair of fleshy purple split-rock leaves divided by a narrow pink cleft.",
        ],
        [
            "portulacaria-afra",
            "A branching reddish-brown succulent shrub with many small round green leaves.",
        ],
        [
            "sempervivum-coconut-crystal",
            "A layered green hens-and-chicks rosette with a burgundy center in a yellow planter.",
        ],
        [
            "stenocactus-phyllacanthus",
            "A squat green cactus with many narrow wavy ribs and long tan spines.",
        ],
        [
            "tephrocactus-articulatus-papyracanthus",
            "Stacked gray-green cactus segments surrounded by long flat papery spines.",
        ],
        [
            "tiny-mixed-succulent-planter",
            "Five overlapping blue-green, copper, and red-edged succulents in a striped terracotta planter.",
        ],
    ]);
}

function validateSymbols(symbols, titles, descriptions) {
    if (
        symbols.length !== titles.size ||
        symbols.length !== descriptions.size
    ) {
        throw new Error(
            `Expected ${titles.size} titled and described plant portraits but found ${symbols.length}.`
        );
    }
    for (const { body, slug } of symbols) {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
            throw new Error(
                `Plant portrait slug ${slug} is not identifier-safe.`
            );
        }
        if (!titles.has(slug)) {
            throw new Error(`Plant portrait ${slug} has no profile title.`);
        }
        if (!descriptions.has(slug)) {
            throw new Error(
                `Plant portrait ${slug} has no visual description.`
            );
        }
        if (body.includes("><")) {
            throw new Error(
                `Plant portrait ${slug} has compressed adjacent SVG elements.`
            );
        }
        if (leadingZeroOmissionPattern.test(body)) {
            throw new Error(
                `Plant portrait ${slug} has a fractional value without a leading zero.`
            );
        }
    }
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
    const descriptions = portraitDescriptions();
    validateSymbols(symbols, titles, descriptions);

    const nextLogger = await formatted(
        replaceGeneratedLoggerSymbols(logger),
        loggerPath
    );
    const standalone = await Promise.all(
        symbols.map(async ({ slug, viewBox, body }) => {
            const filepath = path.join(assetDirectory, `${slug}.svg`);
            const title = titles.get(slug);
            const description = descriptions.get(slug);
            const indentedBody = body
                .split(/\r?\n/)
                .map((line) => `  ${line}`)
                .join("\n");
            return {
                filepath,
                output: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="${slug}-title ${slug}-description" data-plant-slug="${slug}" focusable="false">\n  <title id="${slug}-title">${escapeXml(title)} plant portrait</title>\n  <desc id="${slug}-description">${escapeXml(description)}</desc>\n${indentedBody}\n</svg>\n`,
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
