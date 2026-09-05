import { readdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { format, resolveConfig } from "prettier";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import sharp from "sharp";

import {
    collectionPhotoDate,
    compareText,
    isCollectionManifest,
    isNonemptyString,
    isPhotoManifest,
    isProfileData,
    readJson,
    readTextIfPresent,
    required,
} from "./build-data.mjs";
/**
 * @import {
 *   CollectionManifest,
 *   CollectionPhoto,
 *   CollectionRecord,
 *   GyazoImage,
 *   ParsedProfile,
 *   PlantAvatar,
 *   Profile,
 *   ProfileGroup,
 *   ReferencePhoto
 * } from "./build-data.mjs"
 */
import { syncPlantIcons } from "./sync-plant-icons.mjs";
import { syncUiIcons } from "./sync-ui-icons.mjs";

const heroBadgeIconClass = "hero-badge-icon";
const recordLinkIconClass = "record-link-icon";
const captionLinkEndIconClass = "caption-link-end-icon";
const linkEndIconClass = "link-end-icon";
const speciesObservationScope = "Species observations";
const forwardIcon = "arrow-right";

const scriptDirectory = import.meta.dirname;
const repositoryRoot = path.resolve(scriptDirectory, "..");
const outputPath = path.join(
    repositoryRoot,
    "docs",
    "plant-booklet",
    "index.html"
);
const photoAlbumOutputPath = path.join(
    repositoryRoot,
    "docs",
    "layouts",
    "photo-album.html"
);
const photoManifestPath = path.join(
    repositoryRoot,
    "assets",
    "plants",
    "photo-manifest.json"
);
const collectionPhotoManifestPath = path.join(
    repositoryRoot,
    "assets",
    "collection-photos",
    "photo-manifest.json"
);
const plantTrackerDataPath = path.join(
    repositoryRoot,
    "docs",
    "layouts",
    "plant-tracker-data.js"
);
const plantProfileDataPath = path.join(
    repositoryRoot,
    "docs",
    "layouts",
    "plant-profile-data.json"
);

/** @type {ProfileGroup[]} */
const groups = [
    {
        description:
            "Twenty cactus profiles plus one cactus-form Euphorbia, in Google Sheets P-ID order with permanent pot labels and collection IDs visible.",
        directories: ["starter", "cacti"],
        eyebrow: "Cactus collection",
        key: "cacti",
        title: "Cacti",
    },
    {
        description:
            "Four records in the established shared planter, the Kiwi aeonium, three rooted Mountain Crest succulents, and two Home Depot arrivals added September 2.",
        directories: ["succulents"],
        eyebrow: "Shared planter and individual succulents",
        key: "succulents",
        title: "Succulents",
    },
    {
        description:
            "Three living cactus records plus the retained historical record for Rehab-04.",
        directories: ["rehab"],
        eyebrow: "Older planter and archive",
        key: "rehab",
        title: "Older and rehabilitation plants",
    },
    {
        description:
            "The money tree follows its own light and watering rules rather than the cactus baseline.",
        directories: ["houseplants"],
        eyebrow: "Tropical houseplant",
        key: "houseplants",
        title: "Houseplants",
    },
];

/** @type {[string, string][]} */
const lifecycleStages = [
    ["young", "Seedling / juvenile"],
    ["habit", "Mature form"],
    ["flower", "Flower"],
    ["fruit-seed", "Fruit / seed"],
    ["habitat", "Wild habitat"],
    ["detail", "Close detail"],
];
const lifecycleOrder = new Map(
    lifecycleStages.map(([subject], index) => [subject, index])
);

const inaturalistBySlug = new Map([
    [
        "aeonium-haworthii-dream-color",
        {
            scope: "Underlying species; Dream Color is horticultural",
            taxon: "Aeonium haworthii",
        },
    ],
    [
        "astrophytum-ornatum",
        { scope: speciesObservationScope, taxon: "Astrophytum ornatum" },
    ],
    [
        "austrocylindropuntia-subulata",
        {
            scope: speciesObservationScope,
            taxon: "Austrocylindropuntia subulata",
        },
    ],
    [
        "cereus-forbesii-ming-thing",
        {
            scope: "Underlying species; Ming Thing is horticultural",
            taxon: "Cereus forbesii",
        },
    ],
    [
        "chamaelobivia-hybrid",
        {
            scope: "Peanut-cactus ancestry; hybrid flowers can differ",
            taxon: "Echinopsis chamaecereus",
        },
    ],
    [
        "cleistocactus-colademononis",
        {
            scope: speciesObservationScope,
            taxon: "Cleistocactus colademononis",
        },
    ],
    [
        "echeveria-pulidonis",
        {
            scope: "Working species; the shared-planter ID remains probable",
            taxon: "Echeveria pulidonis",
        },
    ],
    [
        "echeveria-raindrops",
        {
            scope: "Genus observations; Raindrops has no wild population",
            taxon: "Echeveria",
        },
    ],
    [
        "echinocereus-rigidissimus-rubispinus",
        {
            scope: "Species observations; compare the red-spined subspecies",
            taxon: "Echinocereus rigidissimus",
        },
    ],
    [
        "echinopsis-spachiana",
        {
            scope: "Working species; compare cautiously",
            taxon: "Echinopsis spachiana",
        },
    ],
    [
        "echinopsis-subdenudata",
        {
            scope: "Accepted species concept that includes subdenudata",
            taxon: "Echinopsis ancistrophora",
        },
    ],
    [
        "espostoa-melanostele-nana",
        {
            scope: "Working species; this collection ID remains probable",
            taxon: "Espostoa melanostele",
        },
    ],
    [
        "euphorbia-obesa-hybrid",
        {
            scope: "Reference species only; the collection plant may be a hybrid",
            taxon: "Euphorbia obesa",
        },
    ],
    [
        "faucaria-tuberculosa",
        {
            scope: "Working species; this collection ID remains probable",
            taxon: "Faucaria tuberculosa",
        },
    ],
    [
        "gymnocalycium-mihanovichii-black-widow",
        {
            scope: "Underlying species; cultivar colors are not separated",
            taxon: "Gymnocalycium mihanovichii",
        },
    ],
    [
        "gymnocalycium-mihanovichii-variegated",
        {
            scope: "Underlying species; variegated selections are not separated",
            taxon: "Gymnocalycium mihanovichii",
        },
    ],
    [
        "gymnocalycium-saglionis",
        { scope: speciesObservationScope, taxon: "Gymnocalycium saglionis" },
    ],
    [
        "kalanchoe-bracteata",
        {
            scope: "Working species; the shared-planter ID remains probable",
            taxon: "Kalanchoe bracteata",
        },
    ],
    [
        "kalanchoe-orgyalis",
        { scope: speciesObservationScope, taxon: "Kalanchoe orgyalis" },
    ],
    [
        "mammillaria-bombycina",
        {
            scope: "Species reference for the historical plant",
            taxon: "Mammillaria bombycina",
        },
    ],
    [
        "mammillaria-mammillaris",
        {
            scope: "Working species; this collection ID remains probable",
            taxon: "Mammillaria mammillaris",
        },
    ],
    [
        "mammillaria-plumosa",
        { scope: speciesObservationScope, taxon: "Mammillaria plumosa" },
    ],
    [
        "mammillaria-rekoi",
        {
            scope: "Working species; compare cautiously with this cf. ID",
            taxon: "Mammillaria rekoi",
        },
    ],
    [
        "myrtillocactus-geometrizans-fukurokuryuzinboku",
        {
            scope: "Underlying species; monstrose cultivars are not separated",
            taxon: "Myrtillocactus geometrizans",
        },
    ],
    [
        "myrtillocactus-geometrizans-indigo-wave",
        {
            scope: "Underlying species; crested trade forms are not separated",
            taxon: "Myrtillocactus geometrizans",
        },
    ],
    [
        "nyctocereus-serpentinus",
        {
            scope: "Species observations under the currently used genus name",
            taxon: "Peniocereus serpentinus",
        },
    ],
    [
        "oreocereus-trollii",
        { scope: speciesObservationScope, taxon: "Oreocereus trollii" },
    ],
    [
        "pachira-glabra",
        {
            scope: "Working species; the nursery tag names only Pachira",
            taxon: "Pachira glabra",
        },
    ],
    [
        "parodia-leninghausii",
        { scope: speciesObservationScope, taxon: "Parodia leninghausii" },
    ],
    [
        "pilosocereus-pachycladus-variegated",
        {
            scope: "Working species; variegated forms are not separated",
            taxon: "Pilosocereus pachycladus",
        },
    ],
    [
        "pleiospilos-nelii-royal-flush",
        {
            scope: "Underlying species; Royal Flush is horticultural",
            taxon: "Pleiospilos nelii",
        },
    ],
    [
        "portulacaria-afra",
        { scope: speciesObservationScope, taxon: "Portulacaria afra" },
    ],
    [
        "sempervivum-coconut-crystal",
        {
            scope: "Genus observations; Coconut Crystal has no wild population",
            taxon: "Sempervivum",
        },
    ],
    [
        "stenocactus-phyllacanthus",
        { scope: speciesObservationScope, taxon: "Stenocactus phyllacanthus" },
    ],
    [
        "tephrocactus-articulatus-papyracanthus",
        {
            scope: "Species observations; compare the paper-spined variety",
            taxon: "Tephrocactus articulatus",
        },
    ],
    [
        "tiny-mixed-succulent-planter",
        {
            scope: "Genus-level comparison for one component; this is not an ID for the whole planter",
            taxon: "Echeveria",
        },
    ],
]);

const markdownProcessor = remark().use(remarkGfm).use(remarkHtml, {
    sanitize: false,
});

/**
 * @param {ParsedProfile} left
 * @param {ParsedProfile} right
 */
function compareInventory(left, right) {
    const [
        ,
        leftPrefix,
        leftNumber,
    ] = /^(?<prefix>[A-Za-z]+)-(?<number>\d+)$/v.exec(left.inventoryId) ?? [];
    const [
        ,
        rightPrefix,
        rightNumber,
    ] = /^(?<prefix>[A-Za-z]+)-(?<number>\d+)$/v.exec(right.inventoryId) ?? [];
    return (
        String(leftPrefix).localeCompare(String(rightPrefix)) ||
        Number(leftNumber) - Number(rightNumber)
    );
}

/**
 * @param {ParsedProfile} left
 * @param {ParsedProfile} right
 */
function compareProfiles(left, right) {
    const leftTracker = Number(left.trackerId?.slice(1)) || 999;
    const rightTracker = Number(right.trackerId?.slice(1)) || 999;
    return leftTracker - rightTracker || compareInventory(left, right);
}

/**
 * @param {string} html
 */
function decorateProfileBody(html) {
    const wrapped = html.replace(
        /(?<heading><h2>Seller listing snapshot<\/h2>[\s\S]*?)(?=<h2>|$)/v,
        '<section class="seller-snapshot" aria-label="Seller listing snapshot">$<heading></section>\n'
    );

    const decoratedTables = wrapped.replaceAll(
        /<table>[\s\S]*?<\/table>/gv,
        (table) => decorateSemanticTable(table)
    );

    return decoratedTables.replaceAll(
        /<h2>(?<heading>[\s\S]*?)<\/h2>/gv,
        (/** @type {string} */ _match, /** @type {string} */ headingHtml) => {
            const heading = stripHtml(headingHtml).toLowerCase();
            let tone = "story";
            let icon = "story";
            if (heading.includes("source")) {
                tone = "sources";
                icon = "external";
            } else if (heading.includes("seller")) {
                tone = "seller";
                icon = "seller";
            } else if (/potting|repot|root work/v.test(heading)) {
                tone = "growth";
                icon = "repot";
            } else if (/cutting|prun|trim/v.test(heading)) {
                tone = "growth";
                icon = "prune";
            } else if (/mealy|mite|pest|scale/v.test(heading)) {
                tone = "warning";
                icon = "pest";
            } else if (/care|light|rehabilitation|water/v.test(heading)) {
                tone = "care";
                icon = "care";
            } else if (/propagat|rotation/v.test(heading)) {
                tone = "growth";
                icon = "growth";
            } else if (/risk|safety|toxicity|watch/v.test(heading)) {
                tone = "warning";
                icon = "caution";
            } else if (/evidence|ident|name|removal|status/v.test(heading)) {
                tone = "identity";
                icon = "identity";
            } else if (/ecology|habitat|origin|wild/v.test(heading)) {
                tone = "habitat";
                icon = "habitat";
            } else {
                // Other headings retain the general story treatment.
            }

            return `<h2 class="profile-section-heading profile-section-heading--${tone}"><span class="profile-section-icon" aria-hidden="true">${renderSiteIcon(icon)}</span><span>${headingHtml}</span></h2>`;
        }
    );
}

/**
 * @param {string} tableHtml
 */
function decorateSemanticTable(tableHtml) {
    const headings = tableHtml
        .matchAll(/<th>(?<heading>[\s\S]*?)<\/th>/gv)
        .map((match) =>
            stripHtml(
                required(match.groups?.["heading"], "table heading")
            ).toLowerCase()
        )
        .toArray();
    const tableType =
        headings[0] === "kind" && headings[1] === "name"
            ? "identity"
            : headings[0] === "topic" &&
                ["practical approach", "practical starting approach"].includes(
                    headings[1] ?? ""
                )
              ? "care"
              : undefined;

    if (!tableType) return tableHtml;

    const decoratedRows = tableHtml.replaceAll(
        /<tr>\s*<td>(?<label>[\s\S]*?)<\/td>/gv,
        (/** @type {string} */ _rowStart, /** @type {string} */ labelHtml) => {
            const category = semanticTableCategory(
                stripHtml(labelHtml),
                tableType
            );
            return `<tr class="semantic-row semantic-row--${category.key}"><td><span class="semantic-label"><span class="semantic-table-icon" aria-hidden="true">${renderSiteIcon(category.icon)}</span><span>${labelHtml}</span></span></td>`;
        }
    );

    return decoratedRows.replace(
        "<table>",
        () => `<table class="semantic-table semantic-table--${tableType}">`
    );
}

/**
 * @param {string | undefined} value
 */
function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

/**
 * @param {string} value
 */
function escapeSearchAttribute(value) {
    return escapeHtml(value.replaceAll('"', ""));
}

/**
 * @param {string} html
 */
function externalizeLinks(html) {
    return html
        .replaceAll('href="../../../assets/', 'href="../../assets/')
        .replaceAll(
            /<a href="(?<href>https?:\/\/[^"]+)">/gv,
            '<a href="$<href>" target="_blank" rel="noreferrer">'
        );
}

/**
 * @param {string} markdown
 */
function findSellerProductLink(markdown) {
    const allowedHosts = new Set([
        "costafarms.com",
        "mountaincrestgardens.com",
        "shopaltmanplants.com",
        "www.lowes.com",
    ]);

    for (const match of markdown.matchAll(
        /\[(?<label>[^\n\r\[\]]+)\]\((?<href>https?:\/\/[^\)]+)\)/gv
    )) {
        const { href, label } = required(match.groups, "seller link captures");
        const url = new URL(required(href, "seller URL"));
        const isExactProductCue =
            /altman reserve|feather cactus|seller listing/iv.test(
                required(label, "seller label")
            );
        if (isExactProductCue && allowedHosts.has(url.hostname)) {
            return {
                href: required(href, "seller URL"),
                label: stripMarkdown(required(label, "seller label")),
            };
        }
    }

    return undefined;
}

/**
 * @param {string} source
 */
function parsePlantSheetGids(source) {
    const block =
        /const plantSheetGids = Object\.freeze\(\{(?<body>[\s\S]*?)\}\);/v.exec(
            source
        )?.groups?.["body"];
    if (!isNonemptyString(block)) {
        throw new Error(
            "Could not read plantSheetGids from docs/layouts/plant-tracker-data.js."
        );
    }

    return new Map(
        block.matchAll(/\b(?<trackerId>P\d{2}):\s*(?<gid>[\d_]+)\s*,/gv).map(
            /** @returns {[string, number]} */ (match) => [
                required(match.groups?.["trackerId"], "tracker ID"),
                Number(
                    required(match.groups?.["gid"], "worksheet ID").replaceAll(
                        "_",
                        ""
                    )
                ),
            ]
        )
    );
}

/**
 * @param {string} markdown
 * @param {ProfileGroup} group
 * @param {string} sourceDirectory
 * @param {string} fileName
 *
 * @returns {ParsedProfile}
 */
function parseProfile(markdown, group, sourceDirectory, fileName) {
    const lines = markdown.replaceAll("\r\n", "\n").split("\n");
    const titleLine = lines.find((/** @type {string} */ line) =>
        line.startsWith("# ")
    );
    const firstSectionIndex = lines.findIndex((/** @type {string} */ line) =>
        line.startsWith("## ")
    );

    if (firstSectionIndex === -1 || !isNonemptyString(titleLine)) {
        throw new Error(
            `Profile ${fileName} is missing its title or first section.`
        );
    }

    const metadata = parseProfileMetadata(lines.slice(1, firstSectionIndex));

    const inventory = stripMarkdown(metadata.inventory);
    const inventoryMatch =
        /^(?<inventoryId>[A-Za-z]+-\d+)\s+[\-—]\s+(?<scientificName>\S.*)$/v.exec(
            inventory
        );
    const inventoryId =
        inventoryMatch?.groups?.["inventoryId"] ?? inventory.split(" ", 1)[0];

    if (!isNonemptyString(inventoryId)) {
        throw new Error(`Profile ${fileName} is missing its inventory ID.`);
    }

    const orderStatusMarkdown = metadata["order status"];
    const isReceiptUnverified = /\b(?:pending|unverified)\b/iv.test(
        stripMarkdown(orderStatusMarkdown)
    );
    const isHistorical =
        inventoryId === "Rehab-04" ||
        stripMarkdown(metadata.status).toLowerCase().includes("historical");
    const trackerId = stripMarkdown(metadata["tracker id"]);
    if (!isHistorical && !/^P\d{2}$/v.test(trackerId)) {
        throw new Error(
            `Current profile ${fileName} needs a permanent Tracker ID.`
        );
    }
    if (isHistorical && trackerId) {
        throw new Error(
            `Historical profile ${fileName} must not claim a current Tracker ID.`
        );
    }

    return {
        acquiredFromMarkdown: metadata["acquired from"],
        acquiredOnMarkdown: metadata["acquired on"],
        bodyMarkdown: lines.slice(firstSectionIndex).join("\n").trim(),
        eyebrow: group.eyebrow,
        fileName,
        group: group.key,
        groupTitle: group.title,
        historical: isHistorical,
        identificationMarkdown: metadata.identification,
        interestingFactMarkdown: metadata["interesting fact"],
        inventoryId,
        labelMarkdown: metadata["label id"],
        orderedFromMarkdown: metadata["ordered from"],
        receiptUnverified: isReceiptUnverified,
        scientificMarkdown: inventoryMatch?.groups?.["scientificName"] ?? "",
        sellerProductLink: findSellerProductLink(markdown),
        slug: path.basename(fileName, ".md"),
        sourceDirectory,
        statusMarkdown:
            metadata.status ||
            orderStatusMarkdown ||
            "Current collection record",
        title: titleLine.slice(2).trim(),
        trackerId: trackerId || undefined,
        visualDescriptionMarkdown: metadata["visual description"],
    };
}

/**
 * @param {ReferencePhoto} photo
 * @param {string} desiredSubject
 */
function photoScore(photo, desiredSubject, isHero = false) {
    /** @type {Record<string, number>} */
    const subjectScores = isHero
        ? { detail: 90, flower: 72, "fruit-seed": 45, habit: 100, habitat: 60 }
        : { detail: 80, flower: 100, "fruit-seed": 75, habit: 60, habitat: 90 };
    const desiredBonus = photo.subject === desiredSubject ? 200 : 0;
    const sourceBonus = photo.source === "Wikimedia Commons" ? 3 : 0;
    return desiredBonus + (subjectScores[photo.subject] ?? 10) + sourceBonus;
}

/**
 * @param {string | undefined} trackerId
 * @param {Map<string, number>} plantSheetGids
 */
function plantSheetUrl(trackerId, plantSheetGids) {
    if (!isNonemptyString(trackerId)) return undefined;
    const gid = plantSheetGids.get(trackerId);
    if (gid === undefined || gid === 0 || Number.isNaN(gid)) {
        throw new Error(`No Google Sheets tab is configured for ${trackerId}.`);
    }
    return `https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit?gid=${gid}#gid=${gid}`;
}

/**
 * @param {string} markdown
 */
async function renderInline(markdown) {
    const rendered = String(await markdownProcessor.process(markdown.trim()));
    return rendered.replace(/^<p>/v, "").replace(/<\/p>\s*$/v, "");
}

/**
 * @param {string} name
 */
function renderLayoutIcon(name, className = "") {
    return renderSiteIcon(name, className, "../plant-booklet/plant-icons.svg");
}

/**
 * @param {string} name
 */
function renderSiteIcon(
    name,
    className = "",
    spritePath = "./plant-icons.svg"
) {
    const classes = ["site-icon", className].filter(Boolean).join(" ");
    return `<svg class="${escapeHtml(classes)}" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><use href="${escapeHtml(spritePath)}#icon-${escapeHtml(name)}" width="64" height="64"></use></svg>`;
}

/**
 * @param {string} label
 * @param {string} tableType
 */
function semanticTableCategory(label, tableType) {
    const normalized = label.toLowerCase();

    if (tableType === "identity") return identityTableCategory(normalized);

    if (/grow-light|light|sun/v.test(normalized)) {
        return { icon: "light", key: "light" };
    }
    if (/dry|lowest/v.test(normalized)) {
        return { icon: "dry", key: "water" };
    }
    if (/moist|water/v.test(normalized)) {
        return { icon: "moisture", key: "water" };
    }
    if (/repot|root work/v.test(normalized)) {
        return { icon: "repot", key: "pot" };
    }
    if (/drain|medium|mix|pot|root|soil/v.test(normalized)) {
        return { icon: "pot", key: "pot" };
    }
    if (/cold|frost|heat|temperature|winter/v.test(normalized)) {
        return { icon: "temperature", key: "temperature" };
    }
    if (/feed|fertili|nutrient/v.test(normalized)) {
        return { icon: "feeding", key: "feeding" };
    }
    if (/airflow|humidity|ventilat/v.test(normalized)) {
        return { icon: "airflow", key: "airflow" };
    }
    if (/bloom|flower|fruit|seed/v.test(normalized)) {
        return { icon: "flower", key: "flower" };
    }
    if (/cut|prun|trim/v.test(normalized)) {
        return { icon: "prune", key: "handling" };
    }
    if (/rotation|turn/v.test(normalized)) {
        return { icon: "rotate", key: "handling" };
    }
    if (/clean|dust/v.test(normalized)) {
        return { icon: "clean", key: "handling" };
    }
    if (/handling|stake|support/v.test(normalized)) {
        return { icon: "handling", key: "handling" };
    }
    if (
        /arrival|evidence|isolation|leaf replacement|observation|recovery|watch/v.test(
            normalized
        )
    ) {
        return { icon: "observation", key: "observation" };
    }
    return { icon: "care", key: "care" };
}

/**
 * @param {string} value
 */
function splitPhysicalLabel(value) {
    const full = stripMarkdown(value).trim();
    const [primary, ...detailParts] = full.split(/(?<!\s)\s+—\s+/v);
    return {
        detail: detailParts.join(" — "),
        primary: (primary ?? "") || full,
    };
}

/**
 * @param {string} value
 */
function stripHtml(value) {
    return value
        .replaceAll(/<[^<>]+>/gv, " ")
        .replaceAll(/\s+/gv, " ")
        .trim();
}

/**
 * @param {string} value
 */
function stripMarkdown(value) {
    return value
        .replaceAll(/\[(?<label>[^\n\r\[\]]+)\]\([^\)]+\)/gv, "$<label>")
        .replaceAll(/[*_`]/gv, "")
        .replaceAll(/\s+/gv, " ")
        .trim();
}

const heroPhotoFiles = new Map([
    [
        "mammillaria-rekoi",
        "assets/plants/mammillaria-rekoi/commons-19440517-habit.jpg",
    ],
]);

/**
 * Apply intrinsic dimensions only to the local images measured above. External
 * previews keep the geometry supplied by their existing CSS.
 *
 * @param {string} html
 * @param {ReadonlyMap<string, { width: number; height: number }>} dimensionsBySource
 */
function addReferenceImageDimensions(html, dimensionsBySource) {
    return html.replaceAll(
        /<img\b[^<>]*\ssrc="(?<source>[^"]+)"[^<>]*>/gv,
        (/** @type {string} */ tag, /** @type {string} */ source) => {
            const dimensions = dimensionsBySource.get(source);
            return dimensions
                ? tag.replace(
                      "<img",
                      () =>
                          `<img width="${dimensions.width}" height="${dimensions.height}"`
                  )
                : tag;
        }
    );
}

/**
 * @param {ReferencePhoto[]} photos
 * @param {string} slug
 */
function choosePhotos(photos, slug) {
    let remaining = [...photos];
    /** @type {ReferencePhoto[]} */
    const choices = [];
    const heroFile = heroPhotoFiles.get(slug);

    if (heroFile ?? "") {
        const heroIndex = remaining.findIndex(
            (photo) => photo.file.replaceAll("\\", "/") === heroFile
        );
        if (heroIndex === -1) {
            throw new Error(`Configured hero photo is missing for ${slug}`);
        }
        choices.push(
            required(remaining.splice(heroIndex, 1)[0], "configured hero photo")
        );
    }

    const desiredSubjects =
        choices.length > 0
            ? ["flower", "habitat"]
            : [
                  "habit",
                  "flower",
                  "habitat",
              ];
    for (const desired of desiredSubjects) {
        if (remaining.length === 0) break;
        remaining = remaining.toSorted(
            (left, right) =>
                photoScore(right, desired, choices.length === 0) -
                photoScore(left, desired, choices.length === 0)
        );
        const [chosen, ...rest] = remaining;
        choices.push(required(chosen, "selected reference photo"));
        remaining = rest;
    }

    return choices;
}

/**
 * @param {string} kind
 */
function collectionPhotoKind(kind) {
    return kind === "nursery-label"
        ? "Your nursery-label evidence"
        : "Your collection";
}

/**
 * @param {string} view
 */
function collectionViewLabel(view) {
    /** @type {Record<string, string>} */
    const labels = {
        context: "Context view",
        detail: "Detail view",
        "label-back": "Label back",
        "label-front": "Label front",
        "opposite-side": "Opposite-side view",
        overview: "Collection overview",
        "receipt-condition": "Receipt-condition view",
        "receipt-context": "Receipt context",
        side: "Side view",
        "three-quarter": "Three-quarter view",
        top: "Top view",
    };
    return labels[view];
}

/**
 * @param {CollectionPhoto} left
 * @param {CollectionPhoto} right
 */
function compareCollectionPhotosNewestFirst(left, right) {
    const dateDifference = collectionPhotoDate(right).localeCompare(
        collectionPhotoDate(left)
    );
    const viewPriority = new Map([
        ["context", 3],
        ["detail", 0],
        ["label-back", 6],
        ["label-front", 5],
        ["overview", 4],
        ["side", 1],
        ["top", 2],
    ]);
    return (
        dateDifference ||
        (viewPriority.get(left.view) ?? 9) - (viewPriority.get(right.view) ?? 9)
    );
}

/**
 * @param {{ file: string }} photo
 */
function photoPath(photo) {
    return `../../${photo.file.replaceAll("\\", "/")}`;
}

/**
 * Read each archived reference once, without changing the evidence or manifest.
 *
 * @param {Profile[]} profiles
 *
 * @returns {Promise<Map<string, { width: number; height: number }>>}
 */
async function readReferenceImageDimensions(profiles) {
    const pathsBySource = new Map(
        profiles.flatMap((profile) =>
            profile.allPhotos.map((photo) => [
                escapeHtml(photoPath(photo)),
                path.resolve(repositoryRoot, photo.file),
            ])
        )
    );
    const entries = await Promise.all(
        [...pathsBySource].map(
            /** @returns {Promise<[string, { width: number; height: number }]>} */
            async ([source, imagePath]) => {
                const { autoOrient: dimensions } =
                    await sharp(imagePath).metadata();
                if (
                    !Number.isSafeInteger(dimensions.width) ||
                    !Number.isSafeInteger(dimensions.height) ||
                    dimensions.width <= 0 ||
                    dimensions.height <= 0
                ) {
                    throw new Error(
                        `Invalid reference image dimensions: ${source}`
                    );
                }
                return [source, dimensions];
            }
        )
    );
    return new Map(entries);
}

const gyazoThumbnailWidths = [
    480,
    960,
    1600,
];

/**
 * @param {CollectionRecord} collectionRecord
 * @param {ReferencePhoto | undefined} heroPhoto
 *
 * @returns {PlantAvatar | undefined}
 */
function choosePlantAvatar(collectionRecord, heroPhoto) {
    const collectionPhoto = collectionRecord.photos
        .filter(
            (/** @type {{ kind: string; view: string }} */ photo) =>
                photo.kind === "collection" &&
                !["context", "overview"].includes(photo.view)
        )
        .toSorted(compareCollectionPhotosNewestFirst)[0];
    if (collectionPhoto) {
        return {
            alt: collectionPhoto.alt,
            external: true,
            image_id: collectionPhoto.image_id,
            image_url: collectionPhoto.image_url,
            src: collectionPhoto.image_url,
        };
    }
    if (heroPhoto) {
        return {
            alt: heroPhoto.title,
            external: false,
            src: photoPath(heroPhoto),
        };
    }
    return undefined;
}

/**
 * @param {string} date
 */
function formatCollectionDate(date) {
    return Temporal.PlainDate.from(date).toLocaleString("en-US", {
        dateStyle: "long",
    });
}

/**
 * @param {GyazoImage} photo
 */
function gyazoImageExtension(photo) {
    const imageUrl = new URL(photo.image_url);
    const extension = path.posix
        .extname(imageUrl.pathname)
        .slice(1)
        .toLowerCase();
    if (!isNonemptyString(extension)) {
        throw new Error(
            `Gyazo capture ${photo.image_id} has no supported image extension.`
        );
    }
    return extension;
}

/**
 * @param {GyazoImage} photo
 * @param {number} width
 */
function gyazoThumbnailUrl(photo, width) {
    return `https://thumb.gyazo.com/thumb/${width}/${photo.image_id}.${gyazoImageExtension(photo)}`;
}

/**
 * @param {Profile} profile
 */
function renderCollectionGallery(profile) {
    const photos = profile.collectionRecord.photos;
    const growthPhotos = photos
        .filter(
            (/** @type {{ kind: string }} */ photo) =>
                photo.kind === "collection"
        )
        .toSorted(compareCollectionPhotosNewestFirst);
    const newestPhotos = growthPhotos.slice(0, 2);
    const newestDate = growthPhotos[0]
        ? collectionPhotoDate(growthPhotos[0])
        : undefined;
    const collection = profile.collectionRecord.gyazo_collection;
    const growthHistory =
        growthPhotos.length > 0
            ? `<div class="collection-history">
        <p class="collection-history-note">Newest first. Two selected views stay visible here; the complete, continuously growing history lives in this plant's Gyazo Collection.</p>
        <div class="collection-history-preview" aria-label="Latest collection photographs">
          ${newestPhotos.map((photo) => renderCollectionPhoto(photo, "collection-photo--latest")).join("\n")}
        </div>
        <a class="gyazo-collection-link" href="${escapeHtml(required(collection, "Gyazo collection").url)}" target="_blank" rel="noreferrer">
          <span class="gyazo-collection-icon" aria-hidden="true">${renderSiteIcon("photos")}</span>
          <span><strong>Open full Gyazo Collection</strong><small>${growthPhotos.length} ${growthPhotos.length === 1 ? "photograph" : "photographs"}${isNonemptyString(newestDate) ? ` · newest ${escapeHtml(formatCollectionDate(newestDate))}` : ""}</small></span>
          ${renderSiteIcon("external", linkEndIconClass)}
        </a>
      </div>`
            : "";
    const content =
        growthPhotos.length > 0
            ? growthHistory
            : `<div class="collection-photo-pending">
        ${renderSiteIcon("add")}
        <p><strong>Collection photo pending.</strong> ${escapeHtml(profile.collectionRecord.pending_note)}</p>
      </div>`;

    return `<section class="collection-gallery" id="${escapeHtml(profile.slug)}-photo-history" aria-labelledby="${escapeHtml(profile.slug)}-collection-heading">
    <header>
      <div>
        <p class="kicker">Dated collection evidence</p>
        <h2 id="${escapeHtml(profile.slug)}-collection-heading">${renderSiteIcon("camera")} Plant photo history</h2>
      </div>
      <p>Two lightweight previews stay on this page. Open one for its Gyazo capture, or use the Collection button for the complete source-quality history.</p>
    </header>
    ${content}
  </section>`;
}

/**
 * @param {CollectionPhoto} photo
 */
function renderCollectionPhoto(photo, extraClass = "") {
    const normalizedSourcePath = photo.source_file?.replaceAll("\\", "/");
    const sourcePath = isNonemptyString(normalizedSourcePath)
        ? `../../${normalizedSourcePath}`
        : undefined;
    const evidenceDate = collectionPhotoDate(photo);
    const evidenceVerb = isNonemptyString(photo.captured_on)
        ? "Photographed"
        : "Provided";
    const sourceLinkText =
        (normalizedSourcePath?.endsWith(".webp") ?? false)
            ? "Open the archived evidence crop"
            : isNonemptyString(photo.derived_note)
              ? "Open the archived presentation crop"
              : "Open the original evidence file";
    const derivedNote = isNonemptyString(photo.derived_note)
        ? `<span>${escapeHtml(photo.derived_note)}</span>`
        : "";
    const viewLabel = collectionViewLabel(photo.view);
    const viewBadge = isNonemptyString(viewLabel)
        ? `<span class="photo-view">${escapeHtml(viewLabel)}</span>`
        : "";

    const classes = [
        "collection-photo",
        extraClass,
        ["context", "overview"].includes(photo.view)
            ? "collection-photo--context"
            : "",
        photo.kind === "nursery-label" ? "nursery-label-photo" : "",
    ].filter(Boolean);

    const viewAttribute = photo.view
        ? ` data-photo-view="${escapeHtml(photo.view)}"`
        : "";
    return `<figure class="${classes.map((value) => escapeHtml(value)).join(" ")}" data-photo-kind="${escapeHtml(photo.kind)}"${viewAttribute}>
    <a class="external-image-link" href="${escapeHtml(photo.page_url)}" target="_blank" rel="noreferrer">
      ${renderGyazoImage(photo, {
          sizes:
              photo.kind === "nursery-label"
                  ? "(max-width: 680px) calc(100vw - 3rem), 16rem"
                  : "(max-width: 680px) calc(100vw - 3rem), (max-width: 1180px) 45vw, 31rem",
      })}
      <span class="external-image-fallback" hidden>${renderSiteIcon("photos", "external-image-fallback-icon")}<strong>Photo temporarily unavailable</strong><small>Open the Gyazo capture or full Collection instead.</small></span>
    </a>
    <figcaption>
      <span class="photo-labels"><span class="photo-kind">${escapeHtml(collectionPhotoKind(photo.kind))}</span>${viewBadge}</span>
      <strong>${escapeHtml(photo.caption)}</strong>
      <span>${evidenceVerb} <time datetime="${escapeHtml(evidenceDate)}">${escapeHtml(evidenceDate)}</time> · © Nick, all rights reserved</span>
      ${derivedNote}
      <a class="photo-evidence-link" href="${escapeHtml(photo.page_url)}" target="_blank" rel="noreferrer">${renderSiteIcon("photos", "caption-link-icon")}<span>Open this capture in Gyazo</span>${renderSiteIcon("external", captionLinkEndIconClass)}</a>
      ${isNonemptyString(sourcePath) ? `<a class="photo-evidence-link" href="${escapeHtml(sourcePath)}">${renderSiteIcon("history", "caption-link-icon")}<span>${sourceLinkText}</span>${renderSiteIcon(forwardIcon, captionLinkEndIconClass)}</a>` : ""}
    </figcaption>
  </figure>`;
}

/**
 * @param {GyazoImage} photo
 */
function renderGyazoImage(
    photo,
    {
        alt = photo.alt,
        className = "collection-preview-image",
        loading = "lazy",
        sizes = "100vw",
    } = {}
) {
    const classAttribute = className ? ` class="${escapeHtml(className)}"` : "";
    const srcset = gyazoThumbnailWidths
        .map(
            (width) =>
                `${escapeHtml(gyazoThumbnailUrl(photo, width))} ${width}w`
        )
        .join(", ");

    const fetchPriority = loading === "eager" ? "high" : "low";
    return `<img${classAttribute} src="${escapeHtml(gyazoThumbnailUrl(photo, 960))}" srcset="${srcset}" sizes="${escapeHtml(sizes)}" alt="${escapeHtml(alt)}" loading="${escapeHtml(loading)}" fetchpriority="${fetchPriority}" decoding="async" referrerpolicy="no-referrer" data-external-image data-image-id="${escapeHtml(photo.image_id)}">`;
}

/**
 * @param {Profile} profile
 */
function renderNurseryEvidence(profile) {
    const nurseryLabelPhotos = profile.collectionRecord.photos.filter(
        (/** @type {{ kind: string }} */ photo) =>
            photo.kind === "nursery-label"
    );
    if (nurseryLabelPhotos.length === 0) return "";

    return `<section class="nursery-evidence" id="${escapeHtml(profile.slug)}-nursery-evidence" aria-labelledby="${escapeHtml(profile.slug)}-nursery-heading">
    <header>
      <div>
        <p class="kicker">Original identification evidence</p>
        <h2 id="${escapeHtml(profile.slug)}-nursery-heading">${renderSiteIcon("label")} Nursery labels</h2>
      </div>
      <p>Seller wording is evidence, not botanical proof. Each compact preview links to Gyazo and the retained repository crop.</p>
    </header>
    <div class="collection-photo-grid collection-photo-grid--labels">
      ${nurseryLabelPhotos.map((photo) => renderCollectionPhoto(photo)).join("\n")}
    </div>
  </section>`;
}

/**
 * @param {Profile} profile
 * @param {string} variant
 */
function renderPlantAvatar(profile, variant) {
    const portrait = renderSiteIcon(`plant-${profile.slug}`);
    if (!profile.avatar) {
        return `<span class="plant-avatar plant-avatar--${escapeHtml(variant)} plant-avatar--illustrated" aria-hidden="true">${portrait}</span>`;
    }

    const image = profile.avatar.external
        ? renderGyazoImage(profile.avatar, {
              alt: profile.avatar.alt,
              className: `plant-avatar plant-avatar--${variant}`,
              sizes: variant === "hero" ? "5.5rem" : "3.25rem",
          })
        : `<img class="plant-avatar plant-avatar--${escapeHtml(variant)}" src="${escapeHtml(profile.avatar.src)}" alt="${escapeHtml(profile.avatar.alt)}" sizes="${variant === "hero" ? "5.5rem" : "3.25rem"}" loading="lazy" decoding="async">`;

    return `<span class="plant-avatar-slot">${image}<span class="plant-avatar-fallback" aria-hidden="true" hidden>${portrait}</span></span>`;
}

const plantNavigationIconByGroup = {
    cacti: "cactus",
    houseplants: "houseplant",
    rehab: "rehab",
    succulents: "succulent",
};

/**
 * @returns {Promise<Profile[]>}
 */
async function loadProfiles() {
    const [
        manifest,
        collectionManifest,
        trackerDataSource,
    ] = await Promise.all([
        readJson(photoManifestPath, isPhotoManifest),
        readJson(collectionPhotoManifestPath, isCollectionManifest),
        readFile(plantTrackerDataPath, "utf8"),
    ]);
    const plantSheetGids = parsePlantSheetGids(trackerDataSource);
    // eslint-disable-next-line canonical/no-use-extend-native -- Map.groupBy is a native API in the required Node 26 runtime.
    const photosBySlug = Map.groupBy(
        manifest.photos,
        (photo) => photo.plant_slug
    );
    const collectionPhotosBySlug = new Map(
        collectionManifest.plants.map((record) => [record.plant_slug, record])
    );
    /**
     * @param {ProfileGroup} group
     * @param {string} sourceDirectory
     *
     * @returns {Promise<Profile[]>}
     */
    async function loadDirectory(group, sourceDirectory) {
        const directory = path.join(
            repositoryRoot,
            "docs",
            "plants",
            sourceDirectory
        );
        const entries = await readdir(directory);
        const fileNames = entries
            .filter((name) => name.endsWith(".md"))
            .toSorted(compareText);
        return Promise.all(
            fileNames.map(async (fileName) => {
                const markdown = await readFile(
                    path.join(directory, fileName),
                    "utf8"
                );
                const profile = parseProfile(
                    markdown,
                    group,
                    sourceDirectory,
                    fileName
                );
                const photos = photosBySlug.get(profile.slug) ?? [];
                const collectionRecord = collectionPhotosBySlug.get(
                    profile.slug
                );
                if (!collectionRecord) {
                    throw new Error(
                        `Collection-photo manifest has no record for ${profile.slug}.`
                    );
                }
                const processedBody = await markdownProcessor.process(
                    profile.bodyMarkdown
                );
                const bodyHtml = decorateProfileBody(
                    externalizeLinks(String(processedBody))
                );
                const scientificHtml = await renderInline(
                    profile.scientificMarkdown
                );
                const labelHtml = await renderInline(profile.labelMarkdown);
                const identificationHtml = await renderInline(
                    profile.identificationMarkdown
                );
                const statusHtml = await renderInline(profile.statusMarkdown);
                const acquiredFromHtml = profile.acquiredFromMarkdown
                    ? await renderInline(profile.acquiredFromMarkdown)
                    : "";
                const acquiredOnHtml = profile.acquiredOnMarkdown
                    ? await renderInline(profile.acquiredOnMarkdown)
                    : "";
                const orderedFromHtml = profile.orderedFromMarkdown
                    ? await renderInline(profile.orderedFromMarkdown)
                    : "";
                const visualDescriptionHtml = await renderInline(
                    profile.visualDescriptionMarkdown
                );
                const interestingFactHtml = await renderInline(
                    profile.interestingFactMarkdown
                );
                if (!visualDescriptionHtml || !interestingFactHtml) {
                    throw new Error(
                        `Profile ${fileName} needs Visual description and Interesting fact metadata.`
                    );
                }
                const selectedPhotos = choosePhotos(photos, profile.slug);
                return {
                    ...profile,
                    acquiredFromHtml,
                    acquiredOnHtml,
                    allPhotos: photos.toSorted(
                        (left, right) =>
                            (lifecycleOrder.get(left.subject) ?? 99) -
                            (lifecycleOrder.get(right.subject) ?? 99)
                    ),
                    avatar: choosePlantAvatar(
                        collectionRecord,
                        selectedPhotos[0]
                    ),
                    bodyHtml,
                    collectionRecord,
                    drawerLabel: splitPhysicalLabel(profile.labelMarkdown),
                    identificationHtml,
                    interestingFactHtml,
                    labelHtml,
                    orderedFromHtml,
                    photoCount: photos.length,
                    scientificHtml,
                    scopeNote:
                        photos[0]?.scope_note ??
                        "Reference photography is not archived yet; this page currently uses the collection record and linked research sources.",
                    selectedPhotos,
                    sheetUrl: plantSheetUrl(profile.trackerId, plantSheetGids),
                    statusHtml,
                    visualDescriptionHtml,
                };
            })
        );
    }
    const loadedDirectories = await Promise.all(
        groups.flatMap((group) =>
            group.directories.map((sourceDirectory) =>
                loadDirectory(group, sourceDirectory)
            )
        )
    );
    return loadedDirectories.flat().toSorted((left, right) => {
        const groupDifference =
            groups.findIndex((group) => group.key === left.group) -
            groups.findIndex((group) => group.key === right.group);
        return groupDifference || compareProfiles(left, right);
    });
}

async function main() {
    const isCheckOnly = process.argv.includes("--check");
    await syncUiIcons({ checkOnly: isCheckOnly });
    await syncPlantIcons({ checkOnly: isCheckOnly });
    const [
        profiles,
        fieldGuideProfiles,
        collectionManifest,
    ] = await Promise.all([
        loadProfiles(),
        readJson(plantProfileDataPath, isProfileData),
        readJson(collectionPhotoManifestPath, isCollectionManifest),
    ]);
    if (profiles.length !== 36) {
        throw new Error(`Expected 36 profiles but found ${profiles.length}.`);
    }

    const fieldGuideProfileEntries = Object.entries(fieldGuideProfiles).flatMap(
        ([trackerId, entries]) =>
            entries.map(([slug, title]) => ({ slug, title, trackerId }))
    );
    const fieldGuideProfileBySlug = new Map(
        fieldGuideProfileEntries.map((entry) => [entry.slug, entry])
    );
    if (fieldGuideProfileBySlug.size !== fieldGuideProfileEntries.length) {
        throw new Error(
            "The canonical field-guide profile map has duplicate slugs."
        );
    }

    const trackedProfiles = profiles.filter(
        (profile) => profile.trackerId ?? ""
    );
    if (trackedProfiles.length !== fieldGuideProfileEntries.length) {
        throw new Error(
            `Expected ${fieldGuideProfileEntries.length} mapped current profiles but found ${trackedProfiles.length}.`
        );
    }

    for (const profile of trackedProfiles) {
        const expected = fieldGuideProfileBySlug.get(profile.slug);
        if (
            !expected ||
            expected.trackerId !== profile.trackerId ||
            expected.title !== profile.title
        ) {
            throw new Error(
                `${profile.slug} must match its canonical field-guide title and Tracker ID; found ${profile.title}/${profile.trackerId ?? ""}.`
            );
        }
    }

    const dimensionsBySource = await readReferenceImageDimensions(profiles);
    const renderedBooklet = addReferenceImageDimensions(
        renderBooklet(profiles),
        dimensionsBySource
    );
    const renderedPhotoAlbum = addReferenceImageDimensions(
        renderPhotoAlbum(profiles, collectionManifest),
        dimensionsBySource
    );
    const prettierConfig = (await resolveConfig(outputPath)) ?? {};
    const [bookletOutput, photoAlbumOutput] = await Promise.all([
        format(renderedBooklet, {
            ...prettierConfig,
            filepath: outputPath,
        }),
        format(renderedPhotoAlbum, {
            ...prettierConfig,
            filepath: photoAlbumOutputPath,
        }),
    ]);
    if (isCheckOnly) {
        const [currentBooklet, currentPhotoAlbum] = await Promise.all([
            readTextIfPresent(outputPath),
            readTextIfPresent(photoAlbumOutputPath),
        ]);
        if (currentBooklet !== bookletOutput) {
            throw new Error(
                "The plant booklet is stale. Run `npm run build:booklet` and commit the regenerated HTML."
            );
        }
        if (currentPhotoAlbum !== photoAlbumOutput) {
            throw new Error(
                "The photo Collections index is stale. Run `npm run build:booklet` and commit the regenerated HTML."
            );
        }
        process.stdout.write(
            `Plant booklet and photo Collections index are current: ${profiles.length} profiles.\n`
        );
        return;
    }

    await Promise.all([
        writeFile(outputPath, bookletOutput, "utf8"),
        writeFile(photoAlbumOutputPath, photoAlbumOutput, "utf8"),
    ]);
    process.stdout.write(
        `Built ${path.relative(repositoryRoot, outputPath)} and ${path.relative(repositoryRoot, photoAlbumOutputPath)} with ${profiles.length} profiles.\n`
    );
}

/**
 * @param {Profile[]} profiles
 */
function renderBooklet(profiles) {
    const presentCount = profiles.filter(
        (profile) => !profile.historical && !profile.receiptUnverified
    ).length;
    const unverifiedReceiptCount = profiles.filter(
        (profile) => profile.receiptUnverified
    ).length;
    const orderSummary =
        unverifiedReceiptCount > 0 ? `${unverifiedReceiptCount} ordered, ` : "";
    const historicalCount = profiles.filter(
        (profile) => profile.historical
    ).length;
    const pageNumberBySlug = new Map(
        profiles.map((profile, /** @type {number} */ index) => [
            profile.slug,
            index + 1,
        ])
    );
    const navigation = groups
        .map((group) => renderNavGroup(group, profiles))
        .join("\n");
    const contents = groups
        .map((group) => renderContentsGroup(group, profiles, pageNumberBySlug))
        .join("\n");
    const profilePages = profiles
        .map((profile, /** @type {number} */ index) =>
            renderProfile(profile, index + 1, profiles.length)
        )
        .join("\n");

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>The Fenton Collection · Plant field guide</title>
  <script>
    (() => {
      const themeKey = "gardening-site-theme";
      const legacyThemeKey = "gardening-theme";
      const saved = localStorage.getItem(themeKey) ?? localStorage.getItem(legacyThemeKey);
      const dark = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      if (saved) localStorage.setItem(themeKey, saved);
    })();
  </script>
  <link rel="stylesheet" href="./booklet.css">
  <script src="./booklet.js" defer></script>
  <meta name="color-scheme" content="light dark">
  <meta name="description" content="A browser field guide to the cactus, succulent, and houseplant records in the Fenton collection.">
  <meta property="og:title" content="The Fenton Collection · Plant field guide">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://nick2bad4u.github.io/Gardening/">
  <meta property="og:image" content="https://nick2bad4u.github.io/Gardening/assets/plants/mammillaria-rekoi/commons-19440517-habit.w960.webp">
  <meta property="og:image:alt" content="Licensed reference photograph of Mammillaria rekoi; not the collection plant.">
  <link rel="icon" href="./favicon.svg" type="image/svg+xml">
</head>
<body>
  <a class="skip-link" href="#book">Skip to the current page</a>
  <header class="reader-bar" aria-label="Booklet controls">
    <button class="icon-button menu-button" id="open-contents" type="button" aria-haspopup="dialog" aria-controls="contents-dialog">
      ${renderSiteIcon("menu")}<span>Contents</span>
    </button>
    <div class="reader-position" aria-live="polite">
      <strong id="reader-title">Cover</strong>
      <span id="reader-count">The Fenton Collection</span>
    </div>
    <div class="reader-actions">
      <a class="icon-button" href="../layouts/photo-album.html">${renderSiteIcon("photos")}<span>Photos</span></a>
      <button class="icon-button" type="button" data-surprise-plant aria-label="Open a random plant profile">${renderSiteIcon("cactus")}<span>Random</span></button>
      <button class="icon-button" id="theme-toggle" type="button" aria-pressed="false">${renderSiteIcon("theme")}<span>Theme</span></button>
      <button class="icon-button" id="print-booklet" type="button">${renderSiteIcon("print")}<span>Print</span></button>
    </div>
    <div class="reader-progress" aria-hidden="true"><span id="reader-progress"></span></div>
  </header>

  <dialog class="contents-dialog" id="contents-dialog">
    <header>
      <div><span class="dialog-kicker">Field guide</span><h1>Find a plant</h1></div>
      <button class="close-button" id="close-contents" type="button" aria-label="Close contents">${renderSiteIcon("close")}</button>
    </header>
    <label class="search-label" for="plant-search">Search names, IDs, care, origins, or warnings</label>
    <input id="plant-search" type="search" placeholder="Try A3, Mexico, flowers, or latex" autocomplete="off">
    <p class="search-status" id="search-status" aria-live="polite">Showing all ${profiles.length} profiles</p>
    <nav class="drawer-nav" aria-label="Plant profiles">
      <a class="drawer-special" href="#cover" data-page-link="cover"><span>${renderSiteIcon("cactus")} Cover</span><small>Start of the guide</small></a>
      <a class="drawer-special" href="#contents" data-page-link="contents"><span>${renderSiteIcon("field-guide")} Printed contents</span><small>All profiles at a glance</small></a>
      <a class="drawer-special" href="../layouts/plant-tracker.html"><span>${renderSiteIcon("tracker")} Plant tracker</span><small>Live weights, watering, and measurements</small></a>
      <a class="drawer-special" href="../layouts/grow-spot-layout.html"><span>${renderSiteIcon("layout")} Grow-spot layout</span><small>Tables, risers, light, fan, and camera</small></a>
      <a class="drawer-special" href="../layouts/indoor-acclimation-calendar.html"><span>${renderSiteIcon("calendar")} Acclimation calendar</span><small>Dated light and airflow schedule</small></a>
      <a class="drawer-special" href="../layouts/photo-album.html"><span>${renderSiteIcon("photos")} Plant photo Collections</span><small>Search every plant's Gyazo history</small></a>
      <a class="drawer-special" id="surprise-plant" href="#${escapeHtml(required(profiles[0], "first profile").slug)}" data-surprise-plant><span>${renderSiteIcon("cactus")} Surprise me</span><small>Explore a random plant profile</small></a>
      ${navigation}
    </nav>
  </dialog>

  <main id="book" tabindex="-1">
    ${renderCover(profiles)}

    <section class="book-page contents-page" id="contents" data-page="contents" data-title="Contents" hidden>
      <header class="contents-heading">
        <p>The Fenton Collection · ${presentCount} current profiles · ${orderSummary}${historicalCount} historical record${historicalCount === 1 ? "" : "s"}</p>
        <h1>A field guide to the collection.</h1>
        <span>Each profile combines identity, care, seller and nursery evidence, licensed references, live records, and a newest-first photo history. Two current views stay visible; each complete history opens in its own Gyazo Collection.</span>
      </header>
      <div class="contents-columns">${contents}</div>
      <aside class="contents-note">
        <strong>Three IDs, three jobs</strong>
        <p><strong>P01–P30</strong> opens the live Google Sheets plant record, the short pot label identifies the physical plant or shared planter, and the Inventory ID preserves the repository record. Repeated P19 and P20 values are intentional shared-planter records; Rehab-04 remains as an untracked historical page.</p>
      </aside>
    </section>

    ${profilePages}
  </main>

  <footer class="site-footer">
    <div class="site-footer-brand">
      ${renderSiteIcon("cactus", "site-footer-icon")}
      <span><strong>The Fenton Collection</strong><small>A personal gardening notebook and browser field guide</small></span>
    </div>
    <nav aria-label="Field guide footer links">
      <a href="#contents" data-page-link="contents">${renderSiteIcon("field-guide")} Contents</a>
      <a href="../layouts/plant-tracker.html">${renderSiteIcon("tracker")} Live tracker</a>
      <a href="../layouts/photo-album.html">${renderSiteIcon("photos")} Photo Collections</a>
      <a href="https://github.com/Nick2bad4u/Gardening" target="_blank" rel="noreferrer">${renderSiteIcon("external")} Source repository</a>
    </nav>
    <p>Collection notes and user photographs © 2026 Nick, all rights reserved. Credited reference photographs retain their stated licenses.</p>
  </footer>

  <nav class="page-controls" id="page-controls-navigation" aria-label="Page navigation">
    <button id="previous-page" type="button">${renderSiteIcon("arrow-left", "page-control-icon")}<span><small>Previous</small><strong id="previous-label">Cover</strong></span></button>
    <button class="page-controls-toggle" id="page-controls-toggle" type="button" aria-pressed="false" aria-label="Pin page navigation">
      ${renderSiteIcon("pin", "page-controls-toggle-icon")}
      <span class="page-controls-pin-label">Pin</span>
    </button>
    <button id="next-page" type="button"><span><small>Next</small><strong id="next-label">Contents</strong></span>${renderSiteIcon(forwardIcon, "page-control-icon")}</button>
  </nav>

  <div class="sr-only" id="page-announcer" role="status" aria-live="polite" aria-atomic="true"></div>

  <noscript>
    <p class="noscript-note">JavaScript is needed for page-by-page reading and complete-guide printing.</p>
  </noscript>
</body>
</html>
`;
}

/**
 * @param {ProfileGroup} group
 * @param {Profile[]} profiles
 * @param {Map<string, number>} pageNumberBySlug
 */
function renderContentsGroup(group, profiles, pageNumberBySlug) {
    const groupProfiles = profiles.filter(
        (profile) => profile.group === group.key
    );
    return `<section class="contents-group${group.key === "cacti" ? " contents-group--wide" : ""}" data-group="${escapeHtml(group.key)}">
    <header>
      <span class="contents-group-icon" aria-hidden="true">${renderSiteIcon(plantNavigationIconByGroup[group.key])}</span>
      <p>${escapeHtml(group.eyebrow)}</p>
      <h2>${escapeHtml(group.title)}</h2>
      <span class="contents-group-description">${escapeHtml(group.description)}</span>
    </header>
    <ol>
      ${groupProfiles
          .map(
              (profile) => `<li>
        <a href="#${escapeHtml(profile.slug)}" data-page-link="${escapeHtml(profile.slug)}">
          ${renderPlantNavigationIcon(profile, "contents")}
          <span class="contents-id"><strong>${escapeHtml(profile.trackerId ?? "Archive")}</strong><small title="${escapeHtml(stripMarkdown(profile.labelMarkdown))}">${escapeHtml(profile.drawerLabel.primary)}</small></span>
          <span class="contents-name"><strong>${escapeHtml(profile.title)}</strong><em>${escapeHtml(stripMarkdown(profile.scientificMarkdown))}</em></span>
          <span class="contents-page">${String(pageNumberBySlug.get(profile.slug)).padStart(2, "0")}</span>
        </a>
      </li>`
          )
          .join("\n")}
    </ol>
  </section>`;
}

/**
 * @param {Profile[]} profiles
 */
function renderCover(profiles) {
    const presentCount = profiles.filter(
        (profile) => !profile.historical && !profile.receiptUnverified
    ).length;
    const coverProfiles = [
        "oreocereus-trollii",
        "cereus-forbesii-ming-thing",
        "echeveria-pulidonis",
        "cleistocactus-colademononis",
        "mammillaria-plumosa",
        "pilosocereus-pachycladus-variegated",
    ]
        .map((slug) =>
            profiles.find(
                (/** @type {{ slug: string }} */ profile) =>
                    profile.slug === slug
            )
        )
        .filter((profile) => profile !== undefined);

    return `<section class="book-page cover-page" id="cover" data-page="cover" data-title="Cover" hidden>
    <div class="cover-collage" aria-hidden="true">
      ${coverProfiles
          .map(
              (profile) =>
                  `<img src="${escapeHtml(photoPath(required(profile.selectedPhotos[0], "cover reference photo")))}" alt="" sizes="(max-width: 720px) 50vw, 590px" loading="lazy" decoding="async">`
          )
          .join("\n")}
    </div>
    <div class="cover-wash"></div>
    <div class="cover-masthead">
      <p>Nick's indoor garden · Fenton, Michigan</p>
      <h1>The Fenton<br>Collection</h1>
      <span>A browser field guide to cactus, succulent, and houseplant personalities</span>
    </div>
    <div class="cover-footer">
      <div><strong>${presentCount}</strong><span>plants present</span></div>
      <div><strong>${profiles.length}</strong><span>deep profiles</span></div>
      <div><strong>${profiles.reduce((sum, profile) => sum + profile.photoCount, 0)}</strong><span>licensed reference photos</span></div>
      <a class="cover-start" href="#${escapeHtml(required(profiles[0], "first profile").slug)}" data-page-link="${escapeHtml(required(profiles[0], "first profile").slug)}">Start reading ${renderSiteIcon(forwardIcon, linkEndIconClass)}</a>
    </div>
    <p class="cover-credit">Summer 2026 edition · Working identifications stay honest about uncertainty</p>
  </section>`;
}

/**
 * @param {ReferencePhoto} photo
 */
function renderCredit(photo, isShort = false) {
    const subject = photo.subject.replace("-", " and ");
    if (isShort) {
        return `<span class="photo-kind">Species-reference ${escapeHtml(subject)}</span>
      <span class="photo-credit"><span>${escapeHtml(photo.author)}</span><span class="photo-credit-links"><a href="${escapeHtml(photo.source_url)}" target="_blank" rel="noreferrer">Photo source · ${escapeHtml(photo.license)}</a></span></span>`;
    }

    return `<span class="photo-kind">Species-reference ${escapeHtml(subject)}</span>
    <span>${escapeHtml(photo.title)}</span>
    ${renderPhotoAttribution(photo)}`;
}

/**
 * @param {ReferencePhoto} photo
 */
function renderGalleryPhoto(photo) {
    const stageName =
        lifecycleStages.find(([subject]) => subject === photo.subject)?.[1] ??
        photo.subject;
    const context = [photo.location, photo.observed_on]
        .filter(Boolean)
        .join(" · ");

    return `<figure class="gallery-photo" data-stage="${escapeHtml(photo.subject)}">
    <a href="${escapeHtml(photo.source_url)}" target="_blank" rel="noreferrer">
      <img src="${escapeHtml(photoPath(photo))}" alt="${escapeHtml(photo.title)}" sizes="(max-width: 720px) 100vw, (max-width: 1180px) 33vw, 360px" loading="lazy" decoding="async">
    </a>
    <figcaption>
      <span class="gallery-stage">${escapeHtml(stageName)}</span>
      <strong>${escapeHtml(photo.title)}</strong>
      ${context ? `<span>${escapeHtml(context)}</span>` : ""}
      ${renderPhotoAttribution(photo)}
    </figcaption>
  </figure>`;
}

/**
 * @param {Profile} profile
 */
function renderLifecycleGallery(profile) {
    const availableSubjects = new Set(
        profile.allPhotos.map((photo) => photo.subject)
    );
    const coverage = lifecycleStages
        .map(
            ([subject, label]) =>
                `<li class="${availableSubjects.has(subject) ? "is-covered" : "is-missing"}">${renderSiteIcon(availableSubjects.has(subject) ? "check" : "minus", "lifecycle-status-icon")}${escapeHtml(label)}</li>`
        )
        .join("\n");
    const missingStages = lifecycleStages
        .filter(
            ([subject]) =>
                [
                    "flower",
                    "fruit-seed",
                    "habit",
                    "habitat",
                    "young",
                ].includes(subject) && !availableSubjects.has(subject)
        )
        .map(([, label]) => label.toLowerCase());
    const gapText =
        missingStages.length > 0
            ? `No credible reusable-license ${missingStages.join(", ")} ${missingStages.length === 1 ? "image is" : "images are"} archived yet.`
            : "The archive currently covers every major lifecycle category.";

    return `<section class="lifecycle-gallery" aria-labelledby="${escapeHtml(profile.slug)}-gallery-heading">
    <header>
      <div>
        <p class="kicker">Growth, reproduction, and habitat</p>
        <h2 id="${escapeHtml(profile.slug)}-gallery-heading">${renderSiteIcon("growth")} Life in ${profile.photoCount} credited views</h2>
        <p>${escapeHtml(gapText)} Stage labels describe the photograph, not the age of the collection plant.</p>
      </div>
      <ul class="stage-coverage" aria-label="Archived lifecycle coverage">
        ${coverage}
      </ul>
    </header>
    <div class="gallery-grid">
      ${profile.allPhotos.map((photo) => renderGalleryPhoto(photo)).join("\n")}
    </div>
  </section>`;
}

/**
 * @param {ProfileGroup} group
 * @param {Profile[]} profiles
 */
function renderNavGroup(group, profiles) {
    const groupProfiles = profiles.filter(
        (profile) => profile.group === group.key
    );
    return `<section class="drawer-group">
    <h2>${escapeHtml(group.title)}</h2>
    <ol>
      ${groupProfiles
          .map(
              (profile) => `<li data-search="${escapeSearchAttribute(
                  `${profile.trackerId ?? ""} ${profile.inventoryId} ${stripMarkdown(profile.labelMarkdown)} ${profile.title} ${stripMarkdown(profile.scientificMarkdown)}`.toLowerCase()
              )}">
        <a class="drawer-link" href="#${escapeHtml(profile.slug)}" data-page-link="${escapeHtml(profile.slug)}">
          ${renderPlantNavigationIcon(profile, "drawer")}
          <span class="drawer-identifiers">
            <span class="drawer-badge drawer-badge--tracker">${renderSiteIcon("sheets", "drawer-badge-icon")}<strong>${escapeHtml(profile.trackerId ?? "Archive")}</strong></span>
            <span class="drawer-badge drawer-badge--label" title="${escapeHtml(stripMarkdown(profile.labelMarkdown))}">${renderSiteIcon("label", "drawer-badge-icon")}<strong>${escapeHtml(profile.drawerLabel.primary)}</strong></span>
          </span>
          <span class="drawer-name"><strong>${renderSiteIcon("plant", "drawer-name-icon")}${escapeHtml(profile.title)}</strong>${profile.drawerLabel.detail ? `<small class="drawer-label-note">${renderSiteIcon("label", "drawer-name-icon")}${escapeHtml(profile.drawerLabel.detail)}</small>` : ""}<small>${renderSiteIcon("botanical", "drawer-name-icon")}${escapeHtml(stripMarkdown(profile.scientificMarkdown))}</small></span>
        </a>
        ${isNonemptyString(profile.sheetUrl) ? `<a class="drawer-sheet-link" href="${escapeHtml(profile.sheetUrl)}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHtml(profile.trackerId)} in Google Sheets">${renderSiteIcon("sheets")}<span class="drawer-sheet-text">Sheets</span>${renderSiteIcon("external", linkEndIconClass)}</a>` : ""}
      </li>`
          )
          .join("\n")}
    </ol>
  </section>`;
}

/**
 * @param {ReferencePhoto} photo
 */
function renderPhoto(photo, className = "") {
    return `<figure class="reference-photo ${className}">
    <a href="${escapeHtml(photo.source_url)}" target="_blank" rel="noreferrer">
      <img src="${escapeHtml(photoPath(photo))}" alt="${escapeHtml(photo.title)}" sizes="(max-width: 720px) 100vw, 320px" loading="lazy" decoding="async">
    </a>
    <figcaption>${renderCredit(photo)}</figcaption>
  </figure>`;
}

/**
 * @param {Profile[]} profiles
 * @param {CollectionManifest} collectionManifest
 */
function renderPhotoAlbum(profiles, collectionManifest) {
    const currentProfiles = profiles
        .filter((profile) => profile.trackerId ?? "")
        .toSorted(compareProfiles);
    const overviewPhotos = collectionManifest.collection_overviews.toSorted(
        compareCollectionPhotosNewestFirst
    );
    const overviewPhoto = required(overviewPhotos[0], "overview photo");
    const overviewCollection = collectionManifest.gyazo_collection;
    const collectionCards = currentProfiles
        .map((profile) => renderPhotoCollectionCard(profile))
        .join("\n");

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Plant photo Collections · Fenton collection</title>
  <script>
    (() => {
      const saved = localStorage.getItem("gardening-site-theme");
      const dark = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    })();
  </script>
  <link rel="stylesheet" href="./plant-tracker.css">
  <meta name="color-scheme" content="light dark">
  <meta name="description" content="Searchable Gyazo photo Collections for every current plant in the Fenton collection.">
  <meta property="og:title" content="Plant photo Collections · Fenton collection">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://nick2bad4u.github.io/Gardening/layouts/photo-album.html">
  <meta property="og:image" content="https://nick2bad4u.github.io/Gardening/assets/plants/mammillaria-rekoi/commons-19440517-habit.w960.webp">
  <meta property="og:image:alt" content="Licensed reference photograph of Mammillaria rekoi; not the collection plant.">
  <link rel="icon" href="../plant-booklet/favicon.svg">
</head>
<body>
  <a class="skip-link" href="#album">Skip to photo Collections</a>
  <nav class="site-nav" aria-label="Collection tools">
    <a class="brand" href="../plant-booklet/"><span class="brand-mark" aria-hidden="true">${renderLayoutIcon("cactus")}</span><span><strong>Fenton collection</strong><small>Photo Collections</small></span></a>
    <div class="nav-links">
      <a href="../plant-booklet/">${renderLayoutIcon("field-guide")} Field guide</a>
      <a href="./plant-tracker.html">${renderLayoutIcon("tracker")} Plant tracker</a>
      <a href="./grow-spot-layout.html">${renderLayoutIcon("layout")} Grow-spot layout</a>
      <a href="./indoor-acclimation-calendar.html">${renderLayoutIcon("calendar")} Calendar</a>
      <a href="#album" aria-current="page">${renderLayoutIcon("photos")} Photos</a>
      <button id="theme-toggle" type="button" aria-pressed="false">${renderLayoutIcon("theme")} <span id="theme-label">Dark mode</span></button>
    </div>
  </nav>

  <main id="album" class="photo-album-index">
    <header class="photo-album-hero">
      <p class="eyebrow">Living collection · Gyazo</p>
      <h1>Every plant has its own visual timeline.</h1>
      <p class="lede">Two recent views stay in the field guide. Open a plant's Gyazo Collection for its complete photo history without making this repository grow with every session.</p>
      <div class="photo-album-summary"><span><strong>${currentProfiles.length}</strong> plant Collections</span><span><strong>${currentProfiles.reduce((sum, profile) => sum + profile.collectionRecord.photos.length, 0)}</strong> placed captures</span><span><strong>${overviewPhotos.length}</strong> collection overviews</span></div>
      <label class="photo-album-search" for="collection-search">${renderLayoutIcon("search")}<span>Find a plant by name, P-ID, label, or Inventory ID</span><input id="collection-search" type="search" autocomplete="off" placeholder="Try P29, #5, tiger jaws, or Succulent-09"></label>
      <p id="collection-search-status" class="photo-album-search-status" aria-live="polite">Showing all ${currentProfiles.length} plant Collections</p>
    </header>

    <section class="overview-collection" aria-labelledby="overview-heading">
      <a class="overview-collection-cover external-image-link" href="${escapeHtml(overviewCollection.url)}" target="_blank" rel="noreferrer">
        ${renderGyazoImage(overviewPhoto, {
            loading: "eager",
            sizes: "(max-width: 760px) calc(100vw - 3rem), 64rem",
        })}
        <span class="external-image-fallback" hidden>${renderLayoutIcon("photos", "external-image-fallback-icon")}<strong>Overview preview unavailable</strong><small>The Gyazo Collection link still works.</small></span>
      </a>
      <div><p class="eyebrow">Room and table views</p><h2 id="overview-heading">Fenton collection · Overviews</h2><p>Wide setup photographs live separately from individual plant histories.</p><a class="button primary" href="${escapeHtml(overviewCollection.url)}" target="_blank" rel="noreferrer">${renderLayoutIcon("photos")} Open overview Collection ${renderLayoutIcon("external", linkEndIconClass)}</a></div>
    </section>

    <section class="photo-collection-grid" aria-label="Plant photo Collections">
      ${collectionCards}
    </section>
    <p class="photo-album-empty" id="photo-album-empty" hidden>No plant Collections match that search.</p>
  </main>

  <footer><span>Fenton plant collection</span><span>Collection photographs © Nick · all rights reserved</span></footer>
  <script>
    const themeToggle = document.querySelector("#theme-toggle");
    const themeLabel = document.querySelector("#theme-label");
    const search = document.querySelector("#collection-search");
    const status = document.querySelector("#collection-search-status");
    const empty = document.querySelector("#photo-album-empty");
    const cards = [...document.querySelectorAll("[data-photo-collection]")];

    function applyTheme(theme) {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem("gardening-site-theme", theme);
      const dark = theme === "dark";
      themeLabel.textContent = dark ? "Light mode" : "Dark mode";
      themeToggle.setAttribute("aria-pressed", String(dark));
    }

    function filterCollections() {
      const query = search.value.trim().toLowerCase();
      let visible = 0;
      for (const card of cards) {
        const matches = !query || (card.dataset.search ?? "").includes(query);
        card.hidden = !matches;
        if (matches) visible += 1;
      }
      status.textContent = query
        ? visible + " matching " + (visible === 1 ? "Collection" : "Collections")
        : "Showing all ${currentProfiles.length} plant Collections";
      empty.hidden = visible !== 0;
    }

    for (const image of document.querySelectorAll("img[data-external-image]")) {
      const markUnavailable = () => {
        image.hidden = true;
        image.nextElementSibling?.removeAttribute("hidden");
        image.closest(".external-image-link")?.classList.add("is-unavailable");
      };
      image.addEventListener("error", markUnavailable, { once: true });
      if (image.complete && image.naturalWidth === 0) markUnavailable();
    }

    search.addEventListener("input", filterCollections);
    themeToggle.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
    applyTheme(document.documentElement.dataset.theme || "light");
    filterCollections();
  </script>
</body>
</html>`;
}

/**
 * @param {ReferencePhoto} photo
 */
function renderPhotoAttribution(photo) {
    return `<span class="photo-credit"><span>${escapeHtml(photo.author)}</span><span class="photo-credit-links"><a href="${escapeHtml(photo.source_url)}" target="_blank" rel="noreferrer">Photo source</a><a href="${escapeHtml(photo.license_url)}" target="_blank" rel="noreferrer">License: ${escapeHtml(photo.license)}</a></span></span>`;
}

/**
 * @param {Profile} profile
 */
function renderPhotoCollectionCard(profile) {
    const growthPhotos = profile.collectionRecord.photos
        .filter(
            (/** @type {{ kind: string }} */ photo) =>
                photo.kind === "collection"
        )
        .toSorted(compareCollectionPhotosNewestFirst);
    const newestPhoto = required(
        growthPhotos[0],
        `newest collection photo for ${profile.slug}`
    );
    const collection = profile.collectionRecord.gyazo_collection;
    const label = stripMarkdown(profile.labelMarkdown);
    const searchText = stripMarkdown(
        `${profile.trackerId ?? ""} ${label} ${profile.inventoryId} ${profile.title} ${profile.scientificMarkdown}`
    ).toLowerCase();

    return `<article class="photo-collection-card" data-photo-collection data-search="${escapeSearchAttribute(searchText)}">
      <a class="photo-collection-cover external-image-link" href="${escapeHtml(required(collection, "Gyazo collection").url)}" target="_blank" rel="noreferrer">
        ${renderGyazoImage(newestPhoto, {
            sizes: "(max-width: 760px) calc(100vw - 3rem), 24rem",
        })}
        <span class="external-image-fallback" hidden>${renderLayoutIcon("photos", "external-image-fallback-icon")}<strong>Preview unavailable</strong><small>The Gyazo Collection link still works.</small></span>
      </a>
      <div class="photo-collection-copy">
        <div class="photo-collection-badges"><span class="photo-id-badge">${escapeHtml(profile.trackerId)}</span><span class="photo-label-badge">${escapeHtml(label)}</span><span>${escapeHtml(profile.inventoryId)}</span></div>
        <h2>${escapeHtml(profile.title)}</h2>
        <p>${profile.scientificHtml}</p>
        <span>${profile.collectionRecord.photos.length} ${profile.collectionRecord.photos.length === 1 ? "capture" : "captures"} · newest <time datetime="${escapeHtml(collectionPhotoDate(newestPhoto))}">${escapeHtml(formatCollectionDate(collectionPhotoDate(newestPhoto)))}</time></span>
        <a class="button primary" href="${escapeHtml(required(collection, "Gyazo collection").url)}" target="_blank" rel="noreferrer">${renderLayoutIcon("photos")} Open Gyazo Collection ${renderLayoutIcon("external", linkEndIconClass)}</a>
      </div>
    </article>`;
}

/**
 * @param {Profile} profile
 * @param {string} variant
 */
function renderPlantNavigationIcon(profile, variant) {
    const iconGroup = Object.hasOwn(plantNavigationIconByGroup, profile.group)
        ? profile.group
        : "houseplants";
    const portraitIcon = renderSiteIcon(`plant-${profile.slug}`);
    return `<span class="plant-nav-icon plant-nav-icon--${escapeHtml(variant)} plant-nav-icon--${escapeHtml(iconGroup)}" aria-hidden="true">${portraitIcon}</span>`;
}

/**
 * @param {Profile} profile
 * @param {number} pageNumber
 * @param {number} totalProfiles
 */
function renderProfile(profile, pageNumber, totalProfiles) {
    const [
        heroPhoto,
        detailPhoto,
        habitatPhoto,
    ] = profile.selectedPhotos;
    const archivePath = `../../assets/plants/${profile.slug}/README.md`;
    const sourceProfilePath = `../plants/${profile.sourceDirectory}/${profile.fileName}`;
    const trackerId = profile.trackerId;
    const growthPhotos = profile.collectionRecord.photos
        .filter(
            (/** @type {{ kind: string }} */ photo) =>
                photo.kind === "collection"
        )
        .toSorted(compareCollectionPhotosNewestFirst);
    const newestGrowthPhoto = growthPhotos[0];
    const photoHistorySummary = newestGrowthPhoto
        ? `<a href="#${escapeHtml(profile.slug)}-photo-history">${growthPhotos.length} ${growthPhotos.length === 1 ? "capture" : "captures"} · newest <time datetime="${escapeHtml(collectionPhotoDate(newestGrowthPhoto))}">${escapeHtml(formatCollectionDate(collectionPhotoDate(newestGrowthPhoto)))}</time> ${renderSiteIcon("arrow-down", "inline-link-icon")}</a>`
        : `<span>Collection photograph pending</span>`;
    const inaturalist = inaturalistBySlug.get(profile.slug);
    if (!inaturalist) {
        throw new Error(
            `Missing iNaturalist discovery link for ${profile.slug}.`
        );
    }
    const inaturalistUrl = `https://www.inaturalist.org/observations?taxon_name=${encodeURIComponent(inaturalist.taxon)}`;
    const historyLink = isNonemptyString(trackerId)
        ? `<a class="profile-history-link" href="../layouts/plant-history.html?id=${encodeURIComponent(trackerId)}"><span>${renderSiteIcon("history", recordLinkIconClass)} Open the live care history<small>Measurements, watering, events, and charts</small></span>${renderSiteIcon(forwardIcon, linkEndIconClass)}</a>`
        : "";
    const sheetLink = isNonemptyString(profile.sheetUrl)
        ? `<a class="profile-sheet-link" href="${escapeHtml(profile.sheetUrl)}" target="_blank" rel="noreferrer"><span>${renderSiteIcon("sheets", recordLinkIconClass)} Open ${escapeHtml(trackerId)} in Google Sheets<small>Direct plant worksheet tab</small></span>${renderSiteIcon("external", linkEndIconClass)}</a>`
        : "";
    const productLink = profile.sellerProductLink
        ? `<a class="seller-product-link" href="${escapeHtml(profile.sellerProductLink.href)}" target="_blank" rel="noreferrer"><span>${renderSiteIcon("seller", recordLinkIconClass)} Open the exact seller product page<small>${escapeHtml(profile.sellerProductLink.label)}</small></span>${renderSiteIcon("external", linkEndIconClass)}</a>`
        : "";
    const searchText = stripMarkdown(
        `${profile.inventoryId} ${trackerId ?? ""} ${profile.labelMarkdown} ${profile.title} ${profile.scientificMarkdown} ${profile.identificationMarkdown} ${profile.acquiredFromMarkdown} ${profile.acquiredOnMarkdown} ${profile.orderedFromMarkdown} ${profile.visualDescriptionMarkdown} ${profile.interestingFactMarkdown} ${profile.bodyMarkdown}`
    ).toLowerCase();

    const acquisitionDetails = [
        profile.acquiredFromHtml
            ? renderProfileMeta(
                  "source",
                  "source",
                  "Acquired from",
                  profile.acquiredFromHtml
              )
            : "",
        profile.acquiredOnHtml
            ? renderProfileMeta(
                  "date",
                  "calendar",
                  "Acquired on",
                  `<time datetime="${escapeHtml(stripMarkdown(profile.acquiredOnMarkdown))}">${profile.acquiredOnHtml}</time>`
              )
            : "",
        profile.orderedFromHtml
            ? renderProfileMeta(
                  "source",
                  "source",
                  "Ordered from",
                  profile.orderedFromHtml
              )
            : "",
    ].join("");

    const hasPhotos = profile.photoCount > 0;
    const heroMedia = heroPhoto
        ? `<img src="${escapeHtml(photoPath(heroPhoto))}" alt="${escapeHtml(heroPhoto.title)}" sizes="(max-width: 720px) 100vw, 1180px" loading="lazy" decoding="async">`
        : `<div class="hero-photo-placeholder" aria-hidden="true"><span>Reference photographs pending</span></div>`;
    const railPhotos = [
        detailPhoto ? renderPhoto(detailPhoto, "portrait-photo") : "",
        habitatPhoto ? renderPhoto(habitatPhoto, "landscape-photo") : "",
    ].join("\n");
    const archiveLink = hasPhotos
        ? `<a href="${escapeHtml(archivePath)}"><span>${renderSiteIcon("photos", recordLinkIconClass)} Open all ${profile.photoCount} archived photos and credits</span>${renderSiteIcon(forwardIcon, linkEndIconClass)}</a>`
        : `<p class="archive-pending"><strong>Licensed reference gallery pending.</strong> The research profile is complete; no local photo archive is being implied.</p>`;

    return `<article class="book-page profile-page" id="${escapeHtml(profile.slug)}" data-page="${escapeHtml(profile.slug)}" data-group="${escapeHtml(profile.group)}" data-title="${escapeHtml(profile.title)}" data-search="${escapeSearchAttribute(searchText)}" hidden></article>
  <template data-profile-template="${escapeHtml(profile.slug)}">
    <header class="profile-hero">
      ${heroMedia}
      <div class="hero-shade"></div>
      <div class="hero-topline">
        <span>${escapeHtml(profile.eyebrow)}</span>
        <span>Plant ${String(pageNumber).padStart(2, "0")} / ${totalProfiles}</span>
      </div>
      <div class="hero-title">
        ${renderPlantAvatar(profile, "hero")}
        <div class="hero-badges">
          <span class="inventory-badge">${renderSiteIcon("inventory", heroBadgeIconClass)} Inventory ${escapeHtml(profile.inventoryId)}</span>
          ${isNonemptyString(trackerId) ? `<span class="tracker-badge">${renderSiteIcon("sheets", heroBadgeIconClass)} Sheets ${escapeHtml(trackerId)}</span>` : ""}
          <span class="label-badge">${renderSiteIcon("label", heroBadgeIconClass)} Label ${profile.labelHtml}</span>
          ${profile.historical ? `<span class="history-badge">${renderSiteIcon("history", heroBadgeIconClass)} Historical record</span>` : ""}
          ${profile.receiptUnverified ? `<span class="order-badge">${renderSiteIcon("seller", heroBadgeIconClass)} Ordered · receipt unverified</span>` : ""}
        </div>
        <p>${profile.scientificHtml}</p>
        <h1>${escapeHtml(profile.title)}</h1>
      </div>
      ${heroPhoto ? `<figcaption class="hero-credit">${renderCredit(heroPhoto, true)}</figcaption>` : ""}
    </header>

    <div class="profile-intro">
      <dl>
        ${renderProfileMeta("inventory", "inventory", "Collection record", escapeHtml(profile.inventoryId))}
        ${isNonemptyString(trackerId) ? renderProfileMeta("sheet", "sheets", "Google Sheets ID", `<a href="${escapeHtml(profile.sheetUrl)}" target="_blank" rel="noreferrer">${escapeHtml(trackerId)} ${renderSiteIcon("external", "inline-link-icon")}</a>`) : ""}
        ${renderProfileMeta("label", "label", "Permanent label", profile.labelHtml)}
        ${renderProfileMeta("identity", "identity", "Identification", profile.identificationHtml)}
        ${renderProfileMeta("status", "status", "Status", profile.statusHtml)}
        ${acquisitionDetails}
        ${renderProfileMeta("photos", "camera", "Photo history", photoHistorySummary)}
        ${renderProfileMeta("scope", `plant-${profile.slug}`, "Photo scope", escapeHtml(profile.scopeNote))}
      </dl>
    </div>

    <section class="profile-at-a-glance" aria-label="Visual description and interesting fact">
      <div>
        <p class="kicker">Spot it</p>
        <h2>${renderSiteIcon("observation")} What it looks like</h2>
        <p>${profile.visualDescriptionHtml}</p>
      </div>
      <div>
        <p class="kicker">One curious thing</p>
        <h2>${renderSiteIcon("story")} Did you know?</h2>
        <p>${profile.interestingFactHtml}</p>
      </div>
    </section>

    <div class="profile-layout">
      <div class="profile-copy prose">
        ${profile.bodyHtml}
      </div>

      <aside class="profile-rail" aria-label="Reference photographs and record links">
        ${railPhotos}
        <section class="record-links">
          <p class="kicker">Keep digging</p>
          <h2>${renderSiteIcon("research")} Research trail</h2>
          ${historyLink}
          ${sheetLink}
          <a class="profile-photo-history-link" href="#${escapeHtml(profile.slug)}-photo-history"><span>${renderSiteIcon("photos", recordLinkIconClass)} Jump to this plant's photo history<small>Latest two views plus the full Gyazo Collection</small></span>${renderSiteIcon("arrow-down", linkEndIconClass)}</a>
          ${productLink}
          <a class="inaturalist-link" href="${escapeHtml(inaturalistUrl)}" data-inaturalist-taxon="${escapeHtml(inaturalist.taxon)}" target="_blank" rel="noreferrer"><span>${renderSiteIcon("botanical", recordLinkIconClass)} Browse iNaturalist observations<small>${escapeHtml(inaturalist.scope)}</small></span>${renderSiteIcon("external", linkEndIconClass)}</a>
          <a href="${escapeHtml(sourceProfilePath)}"><span>${renderSiteIcon("field-guide", recordLinkIconClass)} Open the source profile</span>${renderSiteIcon(forwardIcon, linkEndIconClass)}</a>
          ${archiveLink}
          <p>Identification confidence belongs to the collection plant. Any photographs illustrate the working species and may show mature or wild plants.</p>
        </section>
      </aside>
    </div>

    ${renderLifecycleGallery(profile)}

    ${renderCollectionGallery(profile)}

    ${renderNurseryEvidence(profile)}

    <footer class="folio">
      <span>The Fenton Collection · 2026 field guide</span>
      <span>${String(pageNumber).padStart(2, "0")}</span>
    </footer>
  </template>`;
}

/**
 * @param {string} type
 * @param {string} icon
 * @param {string} label
 * @param {string} value
 */
function renderProfileMeta(type, icon, label, value) {
    return `<div class="profile-meta profile-meta--${escapeHtml(type)}"><span class="profile-meta-icon" aria-hidden="true">${renderSiteIcon(icon)}</span><dt>${escapeHtml(label)}</dt><dd>${value}</dd></div>`;
}

if (
    isNonemptyString(process.argv[1]) &&
    import.meta.filename === path.resolve(process.argv[1])
) {
    await main();
}

export { groups, loadProfiles, stripHtml, stripMarkdown };

/** @param {string} normalized */
function identityTableCategory(normalized) {
    if (
        /alternative|best historical|caution|possible|provisional|uncertain/v.test(
            normalized
        )
    ) {
        return { icon: "caution", key: "caution" };
    }
    if (/distribution|habitat|native|origin|range/v.test(normalized)) {
        return { icon: "habitat", key: "origin" };
    }
    if (/etymolog|history|name clue|synonym/v.test(normalized)) {
        return { icon: "history", key: "history" };
    }
    if (/common|cultivar|trade|vernacular/v.test(normalized)) {
        return { icon: "label", key: "common" };
    }
    if (/collection|form|growth habit|hybrid|parentage/v.test(normalized)) {
        return { icon: "succulent", key: "form" };
    }
    if (/accepted|botanical|genus|scientific|species|taxon/v.test(normalized)) {
        return { icon: "botanical", key: "botanical" };
    }
    return { icon: "inventory", key: "record" };
}

/** @param {string[]} lines */
function parseProfileMetadata(lines) {
    /** @type {Map<string, string>} */
    const metadata = new Map();
    for (const line of lines) {
        const match = /^- (?<key>[^:]+):\s*(?<value>\S.*)$/v.exec(line);
        if (!match) continue;
        const key = required(match.groups?.["key"], "metadata key")
            .trim()
            .toLowerCase();
        metadata.set(
            key,
            required(match.groups?.["value"], "metadata value").trim()
        );
    }
    return {
        "acquired from": "",
        "acquired on": "",
        identification: "Working identification",
        "interesting fact": "",
        inventory: "",
        "label id": "Not assigned",
        "ordered from": "",
        "order status": "",
        status: "",
        "tracker id": "",
        "visual description": "",
        ...Object.fromEntries(metadata),
    };
}
