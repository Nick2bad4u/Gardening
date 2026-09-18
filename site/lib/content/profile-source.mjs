import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

import {
    collectionPhotoDate,
    compareText,
    isCollectionManifest,
    isNonemptyString,
    isPhotoManifest,
    plantSheetUrl,
    readJson,
    required,
} from "../../../scripts/build-data.mjs";
/**
 * @import {
 *   CollectionPhoto,
 *   CollectionRecord,
 *   ParsedProfile,
 *   PlantAvatar,
 *   Profile,
 *   ProfileGroup,
 *   ReferencePhoto
 * } from "../../../scripts/build-data.mjs"
 */

const speciesObservationScope = "Species observations";

const repositoryRoot = process.cwd();

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

const markdownProcessor = remark().use(remarkGfm).use(remarkHtml);

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
 * @param {string} html
 */
function externalizeLinks(html) {
    return html
        .replaceAll('href="../../../assets/', 'href="../../assets/')
        .replaceAll(
            'href="../../layouts/table-placement-research.md"',
            'href="#placement" data-page-link="placement"'
        )
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
 * @param {string} markdown
 */
async function renderInline(markdown) {
    const rendered = String(await markdownProcessor.process(markdown.trim()));
    return rendered.replace(/^<p>/v, "").replace(/<\/p>\s*$/v, "");
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
 * @param {ReferencePhoto[]} photos
 * @param {string} slug
 */
function choosePhotos(photos, slug) {
    let remaining = [...photos];
    /** @type {ReferencePhoto[]} */
    const choices = [];
    const heroFile = heroPhotoFiles.get(slug);

    if (isNonemptyString(heroFile)) {
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
 * @param {string} view
 */
function collectionViewLabel(view) {
    /** @type {Record<string, string>} */
    const labels = {
        context: "Context view",
        detail: "Detail view",
        foliage: "Foliage view",
        "label-back": "Label back",
        "label-front": "Label front",
        "leaf-detail": "Leaf detail",
        "leaf-overview": "Leaf overview",
        "opposite-side": "Opposite-side view",
        overview: "Collection overview",
        plant: "Plant view",
        "receipt-condition": "Receipt-condition view",
        "receipt-context": "Receipt context",
        "shared-planter": "Shared planter",
        "shared-planter-left": "Shared planter — left panel",
        "shared-planter-right": "Shared planter — right panel",
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

/** @param {string | undefined} markdown */
function identificationLabel(markdown) {
    const value = stripMarkdown(markdown ?? "").toLowerCase();
    /** @type {[RegExp, string][]} */
    const labels = [
        [/seller-labeled.*but probable/v, "Likely Revised ID"],
        [/^seller-labeled/v, "Seller Label"],
        [/^labeled/v, "Nursery Label"],
        [/^very high/v, "Very Strong Match"],
        [/^high/v, "Strong Match"],
        [/^probable cultivar/v, "Likely Cultivar"],
        [/hybrid-group level/v, "Likely Hybrid Group"],
        [/^probable/v, "Likely Match"],
        [/^retail tag confirms genus/v, "Genus Known; Species Tentative"],
        [/component-level.*provisional/v, "Tentative Component IDs"],
    ];
    return labels.find(([pattern]) => pattern.test(value))?.[1] ?? "Working ID";
}

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

/**
 * @returns {Promise<Profile[]>}
 */
async function loadProfiles() {
    const [manifest, collectionManifest] = await Promise.all([
        readJson(photoManifestPath, isPhotoManifest),
        readJson(collectionPhotoManifestPath, isCollectionManifest),
    ]);
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
                const identificationHtml = renderMetadataDetails(
                    identificationLabel(profile.identificationMarkdown),
                    await renderInline(profile.identificationMarkdown)
                );
                const statusLabel = profile.historical
                    ? "Archived"
                    : profile.receiptUnverified
                      ? "Awaiting Arrival"
                      : "In Collection";
                const statusHtml =
                    profile.statusMarkdown === "Current collection record"
                        ? `<span class="meta-value">${statusLabel}</span>`
                        : renderMetadataDetails(
                              statusLabel,
                              await renderInline(profile.statusMarkdown)
                          );
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
                    sheetUrl: plantSheetUrl(profile.trackerId),
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

/**
 * @param {{ file: string }} photo
 */
function photoPath(photo) {
    return `../../${photo.file.replaceAll("\\", "/")}`;
}

/** @param {string} label @param {string} evidenceHtml */
function renderMetadataDetails(label, evidenceHtml) {
    return `<details class="meta-details"><summary>${escapeHtml(label)}</summary><div class="meta-evidence">${evidenceHtml}</div></details>`;
}
export {
    collectionViewLabel,
    compareCollectionPhotosNewestFirst,
    groups,
    identificationLabel,
    inaturalistBySlug,
    loadProfiles,
    renderInline,
    stripHtml,
    stripMarkdown,
};
