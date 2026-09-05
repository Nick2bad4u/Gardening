import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { format, resolveConfig } from "prettier";

import {
    compareText,
    isNonemptyString,
    isPlantSlug,
    isProfileData,
    readDirectoryIfPresent,
    readJson,
    readTextIfPresent,
    required,
} from "./build-data.mjs";

const scriptDirectory = import.meta.dirname;
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
const leadingZeroOmissionPattern = /(?:^|\D)\.(?=\d)|(?<!\d)\d+\.\d+\.(?=\d)/mv;

export async function syncPlantIcons({ checkOnly = false } = {}) {
    const [
        sprite,
        profileData,
        logger,
    ] = await Promise.all([
        readFile(spritePath, "utf8"),
        readJson(profileDataPath, isProfileData),
        readFile(loggerPath, "utf8"),
    ]);
    const symbols = parsePlantSymbols(sprite);
    const titles = profileTitles(profileData);
    const descriptions = portraitDescriptions();
    validateSymbols(symbols, titles, descriptions);

    if (!/const PLANT_ICON_REVISION = "[^"]+";/v.test(logger)) {
        throw new Error(
            "The logger is missing its plant-icon revision constant."
        );
    }
    const standalone = symbols.map(({ body, slug, viewBox }) => {
        const filepath = path.join(assetDirectory, `${slug}.svg`);
        const title = titles.get(slug);
        const description = descriptions.get(slug);
        const indentedBody = body
            .split(/\r?\n/v)
            .map((line) => `  ${line}`)
            .join("\n");
        return {
            filepath,
            output: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="${slug}-title ${slug}-description" data-plant-slug="${slug}" focusable="false">\n  <title id="${slug}-title">${escapeXml(title)} plant portrait</title>\n  <desc id="${slug}-description">${escapeXml(description)}</desc>\n${indentedBody}\n</svg>\n`,
            slug,
        };
    });
    const revision = createHash("sha256")
        .update(standalone.map(({ output }) => output).join("\n"))
        .digest("hex")
        .slice(0, 16);
    const nextLogger = await formatted(
        replaceGeneratedLoggerSymbols(logger).replace(
            /const PLANT_ICON_REVISION = "[^"]+";/v,
            () => `const PLANT_ICON_REVISION = "${revision}";`
        ),
        loggerPath
    );

    if (checkOnly) {
        if (logger !== nextLogger) {
            throw new Error(
                "The logger plant portraits are stale. Run `npm run build:booklet`."
            );
        }
        const currentAssetNames = await readDirectoryIfPresent(assetDirectory);
        const expectedAssetNames = standalone.map(({ filepath }) =>
            path.basename(filepath)
        );
        if (
            currentAssetNames
                .filter((name) => name.endsWith(".svg"))
                .toSorted(compareText)
                .join("\n") !==
            expectedAssetNames.toSorted(compareText).join("\n")
        ) {
            throw new Error(
                "The standalone plant-portrait asset inventory is stale. Run `npm run build:booklet`."
            );
        }
        await Promise.all(
            standalone.map(async ({ filepath, output, slug }) => {
                const current = await readTextIfPresent(filepath);
                if (current !== output) {
                    throw new Error(
                        `Standalone plant portrait ${slug} is stale. Run \`npm run build:booklet\`.`
                    );
                }
            })
        );
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

/**
 * @param {string | undefined} value
 */
function escapeXml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

/**
 * @param {string} value
 * @param {string} filepath
 */
async function formatted(value, filepath) {
    const config = (await resolveConfig(filepath)) ?? {};
    return format(value, { ...config, filepath });
}

/**
 * @param {string} value
 */
function normalizeSymbolBody(value) {
    const bodyAfterLeadingNewline = value.replace(/^\r?\n/v, "");
    const trailingWhitespace = bodyAfterLeadingNewline.slice(
        bodyAfterLeadingNewline.trimEnd().length
    );
    const newlineOffset = trailingWhitespace.indexOf("\n");
    const trailingLineOffset =
        newlineOffset === -1
            ? trailingWhitespace.length
            : newlineOffset -
              (trailingWhitespace[newlineOffset - 1] === "\r" ? 1 : 0);
    const end =
        bodyAfterLeadingNewline.length -
        trailingWhitespace.length +
        trailingLineOffset;
    const lines = bodyAfterLeadingNewline.slice(0, end).split(/\r?\n/v);
    const indentation = Math.min(
        ...lines
            .filter((/** @type {string} */ line) => line.trim())
            .map((line) => /^\s*/v.exec(line)?.[0].length ?? 0)
    );
    return lines.map((line) => line.slice(indentation)).join("\n");
}

/**
 * @param {string} sprite
 */
function parsePlantSymbols(sprite) {
    return sprite
        .matchAll(
            /<symbol\s+id="icon-plant-(?<slug>[^"]+)"\s+viewBox="(?<viewBox>[^"]+)"\s*>(?<body>[\s\S]*?)<\/symbol>/gv
        )
        .map((match) => ({
            body: normalizeSymbolBody(
                required(match.groups?.["body"], "plant symbol body")
            ),
            slug: required(match.groups?.["slug"], "plant symbol slug"),
            viewBox: required(
                match.groups?.["viewBox"],
                "plant symbol viewBox"
            ),
        }))
        .toArray();
}

function portraitDescriptions() {
    return new Map([
        [
            "aeonium-haworthii-dream-color",
            "Three branching rosettes with cream-green spoon-shaped leaves and pink margins above a white planter.",
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
            "A low blue-green monstrose cactus clump with irregular connected folds in a purple planter.",
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
            "An upright cactus wrapped in close cream and muted-pink comb-like spine bands in a terracotta planter.",
        ],
        [
            "echinopsis-spachiana",
            "A cluster of upright ribbed green torch cacti with rows of golden spine clusters in a blue planter.",
        ],
        [
            "echinopsis-subdenudata",
            "A rounded dark-green ribbed cactus with large white woolly areoles in a terracotta planter.",
        ],
        [
            "espostoa-melanostele-nana",
            "An upright gray-green cactus wrapped in dense cream-colored wool in a purple planter.",
        ],
        [
            "euphorbia-obesa-hybrid",
            "A round muted-green body with fine dotted ribs, faint brown banding, and a tiny crown in a yellow planter.",
        ],
        [
            "faucaria-tuberculosa",
            "Three opposing pairs of thick triangular green leaves with pale marginal teeth and raised white tubercles.",
        ],
        [
            "gymnocalycium-mihanovichii-black-widow",
            "A low wine-purple cactus with muted green mottling, rib chins, and pale radial spines in a mustard planter.",
        ],
        [
            "gymnocalycium-mihanovichii-variegated",
            "A round green ribbed cactus with blush, bronze, and cream variegated sectors in a blue planter.",
        ],
        [
            "gymnocalycium-saglionis",
            "A broad blue-green cactus with heavy ribs and curved reddish-brown spines in a terracotta planter.",
        ],
        [
            "kalanchoe-bracteata",
            "A branching succulent with silver spoon-shaped leaves in a terracotta planter.",
        ],
        [
            "kalanchoe-orgyalis",
            "A branching succulent with felted copper-brown spoon-shaped leaves and pale new tips in a blue planter.",
        ],
        [
            "mammillaria-bombycina",
            "A clustered pincushion cactus with dense pale radial spines and reddish hooked central spines.",
        ],
        [
            "mammillaria-mammillaris",
            "A clustered green cactus with rounded tubercles, pale radial spines, and red club-shaped fruits.",
        ],
        [
            "mammillaria-plumosa",
            "Three rounded cactus offsets covered in soft white feather-like spines in a blue planter.",
        ],
        [
            "mammillaria-rekoi",
            "A rounded green cactus with close tubercles, pale radial spines, and dark hooked central spines in a blue planter.",
        ],
        [
            "myrtillocactus-geometrizans-fukurokuryuzinboku",
            "A continuous blue-green column with staggered rounded rib swellings in a terracotta planter.",
        ],
        [
            "myrtillocactus-geometrizans-indigo-wave",
            "A blue-green monstrose cactus with irregular folded ridges and knobby fan-shaped growth in a purple planter.",
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
            "A slim tapering trunk with connected stalks and fans of long pointed green palmate leaflets in a blue planter.",
        ],
        [
            "parodia-leninghausii",
            "An upright green cactus densely covered with golden ribs and radial spines in a purple planter.",
        ],
        [
            "pilosocereus-pachycladus-variegated",
            "A blue-green columnar cactus with lengthwise cream variegation and golden spine clusters in a terracotta planter.",
        ],
        [
            "pleiospilos-nelii-royal-flush",
            "Two thick, dark-speckled purple split-rock leaves separated by a deep dark fissure in a white planter.",
        ],
        [
            "portulacaria-afra",
            "A fine branching reddish-brown succulent shrub with small rounded green leaves in opposite pairs.",
        ],
        [
            "sempervivum-coconut-crystal",
            "A tightly layered lime-green rosette with pointed leaves and muted burgundy leaf bases in a yellow planter.",
        ],
        [
            "shared-rehab-cactus-planter",
            "A cream-striped blue-green column, golden-spined torch, and pale hairy trailing monkey-tail stems share a dark round planter with light etched markings.",
        ],
        [
            "shared-succulent-planter",
            "A red-edged blue-green rosette, bright round-leaved elephant bush, silver teaspoons, and copper spoons share a low charcoal rectangular planter.",
        ],
        [
            "stenocactus-phyllacanthus",
            "A squat green cactus with closely packed wavy ribs and long flattened tan crown spines.",
        ],
        [
            "tephrocactus-articulatus-papyracanthus",
            "Jointed gray-green cactus segments with long tapered ivory spines curling like paper ribbons.",
        ],
        [
            "tiny-mixed-succulent-planter",
            "Two large pale rosettes and a smaller open rosette surround broad red-edged green paddles, copper-orange shoots, and a green-and-burgundy shoot in a striped terracotta planter.",
        ],
    ]);
}

/**
 * @param {import("./build-data.mjs").ProfileData} profileData
 */
function profileTitles(profileData) {
    const titles = new Map(
        Object.values(profileData)
            .flat()
            .map(([slug, title]) => [slug, title])
    );
    // The historical, removed Rehab-04 profile is intentionally absent from
    // the live tracker map but still has a booklet portrait and export.
    titles.set("mammillaria-bombycina", "Silken pincushion cactus");
    titles.set(
        "shared-rehab-cactus-planter",
        "Shared rehab cactus planter · #1"
    );
    titles.set("shared-succulent-planter", "Shared succulent planter · #2");
    return titles;
}

/**
 * @param {string} logger
 */
function replaceGeneratedLoggerSymbols(logger) {
    const start = logger.indexOf(startMarker);
    const end = logger.indexOf(endMarker);
    if (start === -1 || end < start) {
        throw new Error(
            "The logger is missing its generated plant-icon boundary markers."
        );
    }
    const generated =
        "<!-- Plant portraits load from their cached standalone SVG assets. -->";
    return `${logger.slice(0, start + startMarker.length)}\n${generated}\n${logger.slice(end)}`;
}

/**
 * @param {ReturnType<typeof parsePlantSymbols>} symbols
 * @param {Map<string, string>} titles
 * @param {Map<string, string>} descriptions
 */
function validateSymbols(symbols, titles, descriptions) {
    if (
        symbols.length !== titles.size ||
        symbols.length !== descriptions.size
    ) {
        throw new Error(
            `Expected ${titles.size} titled and described plant portraits but found ${symbols.length}.`
        );
    }
    for (const { body, slug, viewBox } of symbols) {
        if (!isPlantSlug(slug)) {
            throw new Error(
                `Plant portrait slug ${slug} is not identifier-safe.`
            );
        }
        if (viewBox !== "0 0 64 64") {
            throw new Error(
                `Plant portrait ${slug} must use the native 0 0 64 64 viewBox.`
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

if (
    isNonemptyString(process.argv[1]) &&
    import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
    const symbols = await syncPlantIcons({
        checkOnly: process.argv.includes("--check"),
    });
    process.stdout.write(
        `${process.argv.includes("--check") ? "Verified" : "Synchronized"} ${symbols.length} custom plant portraits.\n`
    );
}
