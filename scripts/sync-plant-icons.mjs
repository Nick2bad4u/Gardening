import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { format, resolveConfig } from "prettier";

import { isContainerData } from "../site/lib/containers.mjs";
import { archivedAmazonPlan } from "../site/lib/old-plans.mjs";
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
    "assets",
    "artwork",
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

/**
 * @param {string} sprite
 */
export function parsePlantSymbols(sprite) {
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

export async function syncPlantIcons({
    checkOnly = false,
    syncLogger = false,
} = {}) {
    const [
        sprite,
        profileData,
        logger,
    ] = await Promise.all([
        readFile(spritePath, "utf8"),
        readJson(profileDataPath, isProfileData),
        syncLogger ? readFile(loggerPath, "utf8") : Promise.resolve(""),
    ]);
    const symbols = parsePlantSymbols(sprite);
    const metadata = await readJson(
        "docs/layouts/container-data.json",
        isContainerData
    );
    const titles = profileTitles(profileData, metadata);
    const descriptions = portraitDescriptions();
    validateSymbols(symbols, titles, descriptions);

    if (syncLogger && !/const PLANT_ICON_REVISION = "[^"]+";/v.test(logger)) {
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
    const nextLogger = syncLogger
        ? await formatted(
              replaceGeneratedLoggerSymbols(logger).replace(
                  /const PLANT_ICON_REVISION = "[^"]+";/v,
                  () => `const PLANT_ICON_REVISION = "${revision}";`
              ),
              loggerPath
          )
        : logger;

    if (checkOnly) {
        if (logger !== nextLogger) {
            throw new Error(
                "The logger plant portraits are stale. Run `npm run build:artwork`."
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
                "The standalone plant-portrait asset inventory is stale. Run `npm run build:artwork`."
            );
        }
        await Promise.all(
            standalone.map(async ({ filepath, output, slug }) => {
                const current = await readTextIfPresent(filepath);
                if (current !== output) {
                    throw new Error(
                        `Standalone plant portrait ${slug} is stale. Run \`npm run build:artwork\`.`
                    );
                }
            })
        );
        return symbols;
    }

    await mkdir(assetDirectory, { recursive: true });
    await Promise.all(
        Iterator.concat(
            syncLogger ? [writeFile(loggerPath, nextLogger, "utf8")] : [],
            standalone.map(({ filepath, output }) =>
                writeFile(filepath, output, "utf8")
            )
        )
    );
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

function portraitDescriptions() {
    return new Map([
        [
            "aeonium-haworthii-dream-color",
            "A full canopy of overlapping broad green rosettes with muted pink edges above colorful polished stones in a tall round white pot with a pale gray lower section.",
        ],
        [
            "aglaonema-commutatum-alpine-spires",
            "Schematic Alpine Spires Chinese evergreen with broad pointed coral-pink, pale yellow-green, and green leaves above a rounded-square turquoise and dark teal planter with diamond texture and a clear upper collar; appearance follows owner photographs without establishing identity or pot specifications.",
        ],
        [
            "astrophytum-ornatum",
            "Photo-informed schematic of Monk's hood with a low angular star-ribbed green body, many fine pale flecks and sparse long straw-brown spines, in mixed mineral top dressing and an orange-brown faceted pot.",
        ],
        [
            "austrocylindropuntia-subulata",
            "Several short upright green cactus stems bearing pale areoles, fine spines and narrow pointed lime-green leaves, in a white faceted pot with mixed mineral dressing.",
        ],
        [
            "cereus-forbesii-ming-thing",
            "A broad low clump of irregular blue-green knobby cactus lobes with scattered pale areoles and fine brown spines, in a dark sage-green faceted pot.",
        ],
        [
            "chamaelobivia-hybrid",
            "A low broad cluster of short oval green cactus stems with pale-gold spines above mixed mineral top dressing in a sage-green faceted pot.",
        ],
        [
            "cleistocactus-colademononis",
            "An isolated schematic view of P19 / #1's monkey-tail cactus: softly hairy pale-green stems curve upward and outward over the same broad dark etched shared-planter framing, not a separate hanging basket.",
        ],
        [
            "echeveria-arctic-ice",
            "A schematic pale blue-green rosette in a tall blue-and-white glazed pot with a dark blue diamond pattern, following owner photographs of #11 / P37.",
        ],
        [
            "echeveria-cubic-frost",
            "A pale lilac rosette with angular upturned leaves above a warm cream pot.",
        ],
        [
            "echeveria-harmsii-ruby-slippers",
            "Branching narrow green leaves with ruby-red margins in a golden planter.",
        ],
        [
            "echeveria-pulidonis",
            "A gray-green succulent rosette with thin red leaf margins in a blue planter.",
        ],
        [
            "echeveria-raindrops",
            "A broad low open rosette with spatulate sage-green leaves, small pointed tips, muted mauve margins, and sparse raised bumps above mineral top dressing in a sage-green faceted pot.",
        ],
        [
            "echeveria-setosa-deminuta",
            "A small blue-green rosette and offset with pale fuzzy leaf detail in a terracotta planter.",
        ],
        [
            "echinocereus-rigidissimus-rubispinus",
            "A tapered oval cactus with dense overlapping cream comb-like spines and a pale lightly rose-tinted crown, above mineral gravel in a dark green faceted pot.",
        ],
        [
            "echinopsis-spachiana",
            "An isolated schematic view of P19 / #1's probable golden torch: an upright green ribbed column with dense pale-gold radial spines, using the same broad dark etched shared-planter framing, not a separate pot.",
        ],
        [
            "echinopsis-subdenudata",
            "Photo-informed schematic of Domino as a low bright-green rounded cactus with broad ribs, conspicuous soft white areole tufts and very short fine spines, in mixed mineral top dressing and a sage-green faceted pot.",
        ],
        [
            "espostoa-melanostele-nana",
            "A rounded cylindrical cactus densely covered in cream wool, with a softly shaded tan base, above mineral gravel in a white faceted pot.",
        ],
        [
            "euphorbia-obesa-hybrid",
            "Photo-informed schematic of Dragon's Egg as a round grey-green body with closely spaced raised ribs and small pale tan dots, in mixed mineral top dressing and a yellow faceted pot. The probable hybrid identification remains qualified in the plant profile.",
        ],
        [
            "faucaria-tuberculosa",
            "Thick triangular green leaves with pale marginal teeth and raised white tubercles above a tall tan pot with broad horizontal ribs, following the owner's pot photograph.",
        ],
        [
            "fittonia-albivenis-nightly",
            "Schematic Nightly Fittonia with pale pink-veined leaves inside a tall clear cylinder with a knobbed lid and bright magenta textured wrapping around its lower half; follows owner photographs without establishing cultivar identity, drainage, or growing conditions.",
        ],
        [
            "four-succulent-planter",
            "Lilac Cubic Frost, golden Coppertone, fuzzy blue-green Deminuta, and red-edged Ruby Slippers share one light-colored round planter.",
        ],
        [
            "gymnocalycium-mihanovichii-black-widow",
            "Photo-informed schematic of Black Widow with a low angular burgundy-red ribbed body, pointed chin-like ridges and fine pale spreading spines, in mixed mineral top dressing and a teal-blue faceted pot. This is P27, distinct from P01 in its yellow pot.",
        ],
        [
            "gymnocalycium-mihanovichii-variegated",
            "A small dark burgundy ribbed cactus with pale spreading spines and mixed mineral top dressing in a yellow faceted pot, following the October owner photograph.",
        ],
        [
            "gymnocalycium-saglionis",
            "Photo-informed schematic of Giant chin as a broad muted-green globe with large rounded chin-like ribs, pale areoles and long dark spreading spines, in mixed mineral top dressing and a sage-green faceted pot.",
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
            "lithops-lesliei",
            "Low paired tan-brown heads with pale branching top patterns for probable Lithops lesliei in the shared pink P35 pot with raised dots; schematic appearance does not confirm species or separate roots.",
        ],
        [
            "lithops-salicola",
            "Low paired pale gray-green heads with broad olive top windows for probable Lithops salicola in the shared pink P35 pot with raised dots; schematic appearance does not confirm species or separate roots.",
        ],
        [
            "lithops-shared-planter",
            "Low paired tan-brown and gray-green living-stone heads with patterned tops among mineral top dressing in the shared pink P35 pot with raised dots; schematic appearance does not establish species or rooted-plant count.",
        ],
        [
            "mammillaria-bombycina",
            "A clustered pincushion cactus with dense pale radial spines and reddish hooked central spines.",
        ],
        [
            "mammillaria-mammillaris",
            "A low green cactus with distinct rounded tubercles, small white woolly patches, pale radial spines, and bright red club-shaped fruits, above mineral gravel in a yellow faceted pot.",
        ],
        [
            "mammillaria-plumosa",
            "A broad low cluster of softly rounded cactus heads covered in feathery white spines, with pale cream centers, above mineral gravel in a teal-blue faceted pot.",
        ],
        [
            "mammillaria-rekoi",
            "A rounded green cactus with dense fine pale-gold radial spines and a few curved hooked central spines, above mineral gravel in an orange-brown faceted pot.",
        ],
        [
            "myrtillocactus-geometrizans-fukurokuryuzinboku",
            "A single upright bright green cactus with rounded projecting rib swellings and sparse short dark spines, above mixed mineral dressing in a teal-blue faceted pot.",
        ],
        [
            "myrtillocactus-geometrizans-indigo-wave",
            "A narrow upright ribbed cactus section joins an uneven folded crest extending sideways above mixed mineral top dressing in an orange-brown faceted pot.",
        ],
        [
            "nyctocereus-serpentinus",
            "A low irregular lime-green cactus body growing sideways across mixed mineral dressing, with fine pale spines in a white faceted pot.",
        ],
        [
            "oreocereus-trollii",
            "An irregular upright gray-green cactus covered in long wispy white wool, with scattered reddish-brown spines extending through it, above mineral gravel in a white faceted pot.",
        ],
        [
            "pachira-glabra",
            "Schematic Money Tree with long drooping green leaflets, a thick tan trunk, and multicolored mineral top dressing above a dark planter with diagonal teal, brown, and purple sections, following the owner's photograph.",
        ],
        [
            "parodia-leninghausii",
            "An upright round-ended green cactus column with many fine golden spines and a denser golden crown, above mixed mineral dressing in a dark green faceted pot.",
        ],
        [
            "peperomia-obtipan-bicolor",
            "Schematic Peperomia Bicolor with thick oval green leaves and cream margins above a dark pot with bright geometric mosaic panels, small rim ornaments, and a butterfly; appearance follows owner photographs without establishing cultivar identity or pot specifications.",
        ],
        [
            "peperomia-obtusifolia-spice-is-nice",
            "Schematic Spice is Nice Peperomia with glossy rounded green leaves above a tall purple planter with a narrow waist, flared base, and clear upper collar; follows owner photographs without establishing cultivar identity or pot specifications.",
        ],
        [
            "pilosocereus-pachycladus-variegated",
            "An isolated schematic view of P19 / #1's probable variegated blue torch: a tall ribbed blue-green column with irregular cream streaks and fine golden spines, using the same broad dark etched shared-planter framing, not a separate pot.",
        ],
        [
            "pleiospilos-nelii",
            "Schematic split-rock leaf pair in a small rounded pot with turquoise and rusty-orange mottled glaze, following the owner's pot photograph; the illustration does not identify the plant or its cultivar.",
        ],
        [
            "pleiospilos-nelii-royal-flush",
            "Low paired purple split-rock leaves with subtle speckles and a central fissure above mineral top dressing in an orange-brown faceted pot.",
        ],
        [
            "portulacaria-afra",
            "A fine branching reddish-brown succulent shrub with small rounded green leaves in opposite pairs.",
        ],
        [
            "sedum-adolphi-coppertone",
            "Branching stems with plump golden-orange leaves in a sage planter.",
        ],
        [
            "sempervivum-coconut-crystal",
            "A low lime-green pointed-leaf rosette with open russet-tinted outer leaves and a tightly folded center, above mixed mineral dressing in a yellow faceted pot.",
        ],
        [
            "shared-rehab-cactus-planter",
            "A tall pale cream-streaked blue-green column rises behind a shorter green golden-spined torch and softly hairy curved monkey-tail stems in the broad dark etched round planter shared by P19 / #1.",
        ],
        [
            "shared-succulent-planter",
            "Tall round-leaved green foliage, silver and copper spoon-shaped leaves, and purple-blue and pointed green rosettes share a deep dark wood-grained box; schematic appearance does not resolve the component identifications.",
        ],
        [
            "stenocactus-phyllacanthus",
            "Photo-informed schematic of a low green Grass-blade cactus with many thin wavy ribs, white crown tufts and sparse long brown-and-cream spines, in mixed mineral top dressing and a teal-blue faceted pot.",
        ],
        [
            "tephrocactus-articulatus-papyracanthus",
            "A compact gray-green cactus body with long flat curling pale spines spreading above mineral top dressing in a dark green faceted pot.",
        ],
        [
            "terrarium",
            "Schematic of the owned terrarium's pear-shaped clear bottle, narrow neck, large spherical brown cork stopper, and small hanging dark sensor above low mixed foliage, moss, and dark substrate. Plant identities and substrate composition remain unverified.",
        ],
        [
            "tiny-mixed-succulent-planter",
            "Two pale rosettes, broad red-orange paddles, copper-orange shoots, and low purple foliage share a shallow rounded green-glazed bowl with multicolored mineral grit, following owner photographs of #6 / P30.",
        ],
        [
            "tiny-planter-coppertone-sedum",
            "Illustrative branching copper-orange fleshy leaves in a terracotta pot; probable sedum group within the shared planter, not a confirmed species or separate container.",
        ],
        [
            "tiny-planter-echeveria",
            "Illustrative pale powdery rosette with layered pointed leaves in a terracotta pot; a shared-planter foliage group, not a confirmed species or separate container.",
        ],
        [
            "tiny-planter-paddle-kalanchoe",
            "Illustrative broad green paddles with red edges in a terracotta pot; unresolved paddle kalanchoe group within the shared planter, not a separate container.",
        ],
        [
            "tradescantia-nanouk",
            "Pink, cream, and green striped pointed leaves on branching stems above a mauve beaded pot.",
        ],
        [
            "tradescantia-spathacea-tricolor",
            "Schematic Tricolor oyster plant with arching pointed green, cream, and pink leaves and purple undersides above a dark pot with diagonal pink, red, and green stripes and a colorful dragonfly; appearance follows owner photographs without establishing cultivar identity or pot specifications.",
        ],
    ]);
}

/**
 * @param {import("./build-data.mjs").ProfileData} profileData
 * @param {import("../site/lib/containers.mjs").ContainerData} metadata
 */
function profileTitles(profileData, metadata) {
    const titles = new Map(
        Object.values(profileData)
            .flat()
            .map(([slug, title]) => [slug, title])
    );
    for (const entry of Object.values(metadata)) {
        if (isNonemptyString(entry.portraitSlug))
            titles.set(entry.portraitSlug, entry.name);
    }
    // The historical, removed Rehab-04 profile is intentionally absent from
    // the live tracker map but still has a booklet portrait and export.
    titles.set("mammillaria-bombycina", "Silken pincushion cactus");
    titles.set(
        "shared-rehab-cactus-planter",
        "Shared rehab cactus planter · #1"
    );
    titles.set("shared-succulent-planter", "Shared succulent planter · #2");
    titles.set("four-succulent-planter", "Four-succulent planter · #7");
    for (const [slug, title] of archivedAmazonPlan.profiles) {
        titles.set(
            required(slug, "archived portrait slug"),
            required(title, "archived portrait title")
        );
    }
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
