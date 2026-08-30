import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import { remark } from "remark";
import { format, resolveConfig } from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const outputPath = path.join(
    repositoryRoot,
    "docs",
    "plant-booklet",
    "index.html"
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

const groups = [
    {
        key: "cacti",
        directories: ["starter", "cacti"],
        eyebrow: "Cactus collection",
        title: "Cacti",
        description:
            "Twenty cactus profiles plus one cactus-form Euphorbia, in Google Sheets P-ID order with permanent pot labels and collection IDs visible.",
    },
    {
        key: "succulents",
        directories: ["succulents"],
        eyebrow: "Shared planter and individual succulents",
        title: "Succulents",
        description:
            "Four species in the shared planter, the Kiwi aeonium, and three rooted Mountain Crest succulents received and repotted August 28.",
    },
    {
        key: "rehab",
        directories: ["rehab"],
        eyebrow: "Older planter and archive",
        title: "Older and rehabilitation plants",
        description:
            "Three living cactus records plus the retained historical record for Rehab-04.",
    },
    {
        key: "houseplants",
        directories: ["houseplants"],
        eyebrow: "Tropical houseplant",
        title: "Houseplants",
        description:
            "The money tree follows its own light and watering rules rather than the cactus baseline.",
    },
];

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
        "austrocylindropuntia-subulata",
        {
            taxon: "Austrocylindropuntia subulata",
            scope: "Species observations",
        },
    ],
    [
        "chamaelobivia-hybrid",
        {
            taxon: "Echinopsis chamaecereus",
            scope: "Peanut-cactus ancestry; hybrid flowers can differ",
        },
    ],
    [
        "espostoa-melanostele-nana",
        {
            taxon: "Espostoa melanostele",
            scope: "Working species; this collection ID remains probable",
        },
    ],
    [
        "gymnocalycium-mihanovichii-black-widow",
        {
            taxon: "Gymnocalycium mihanovichii",
            scope: "Underlying species; cultivar colors are not separated",
        },
    ],
    [
        "mammillaria-mammillaris",
        {
            taxon: "Mammillaria mammillaris",
            scope: "Working species; this collection ID remains probable",
        },
    ],
    [
        "mammillaria-rekoi",
        {
            taxon: "Mammillaria rekoi",
            scope: "Working species; compare cautiously with this cf. ID",
        },
    ],
    [
        "myrtillocactus-geometrizans-fukurokuryuzinboku",
        {
            taxon: "Myrtillocactus geometrizans",
            scope: "Underlying species; monstrose cultivars are not separated",
        },
    ],
    [
        "parodia-leninghausii",
        { taxon: "Parodia leninghausii", scope: "Species observations" },
    ],
    [
        "tephrocactus-articulatus-papyracanthus",
        {
            taxon: "Tephrocactus articulatus",
            scope: "Species observations; compare the paper-spined variety",
        },
    ],
    [
        "pachira-glabra",
        {
            taxon: "Pachira glabra",
            scope: "Working species; the nursery tag names only Pachira",
        },
    ],
    [
        "cleistocactus-colademononis",
        {
            taxon: "Cleistocactus colademononis",
            scope: "Species observations",
        },
    ],
    [
        "echinopsis-spachiana",
        {
            taxon: "Echinopsis spachiana",
            scope: "Working species; compare cautiously",
        },
    ],
    [
        "mammillaria-bombycina",
        {
            taxon: "Mammillaria bombycina",
            scope: "Species reference for the historical plant",
        },
    ],
    [
        "pilosocereus-pachycladus-variegated",
        {
            taxon: "Pilosocereus pachycladus",
            scope: "Working species; variegated forms are not separated",
        },
    ],
    [
        "astrophytum-ornatum",
        { taxon: "Astrophytum ornatum", scope: "Species observations" },
    ],
    [
        "cereus-forbesii-ming-thing",
        {
            taxon: "Cereus forbesii",
            scope: "Underlying species; Ming Thing is horticultural",
        },
    ],
    [
        "echinocereus-rigidissimus-rubispinus",
        {
            taxon: "Echinocereus rigidissimus",
            scope: "Species observations; compare the red-spined subspecies",
        },
    ],
    [
        "echinopsis-subdenudata",
        {
            taxon: "Echinopsis ancistrophora",
            scope: "Accepted species concept that includes subdenudata",
        },
    ],
    [
        "euphorbia-obesa-hybrid",
        {
            taxon: "Euphorbia obesa",
            scope: "Reference species only; the collection plant may be a hybrid",
        },
    ],
    [
        "gymnocalycium-mihanovichii-variegated",
        {
            taxon: "Gymnocalycium mihanovichii",
            scope: "Underlying species; variegated selections are not separated",
        },
    ],
    [
        "gymnocalycium-saglionis",
        { taxon: "Gymnocalycium saglionis", scope: "Species observations" },
    ],
    [
        "mammillaria-plumosa",
        { taxon: "Mammillaria plumosa", scope: "Species observations" },
    ],
    [
        "myrtillocactus-geometrizans-indigo-wave",
        {
            taxon: "Myrtillocactus geometrizans",
            scope: "Underlying species; crested trade forms are not separated",
        },
    ],
    [
        "nyctocereus-serpentinus",
        {
            taxon: "Peniocereus serpentinus",
            scope: "Species observations under the currently used genus name",
        },
    ],
    [
        "oreocereus-trollii",
        { taxon: "Oreocereus trollii", scope: "Species observations" },
    ],
    [
        "stenocactus-phyllacanthus",
        { taxon: "Stenocactus phyllacanthus", scope: "Species observations" },
    ],
    [
        "aeonium-haworthii-dream-color",
        {
            taxon: "Aeonium haworthii",
            scope: "Underlying species; Dream Color is horticultural",
        },
    ],
    [
        "echeveria-pulidonis",
        {
            taxon: "Echeveria pulidonis",
            scope: "Working species; the shared-planter ID remains probable",
        },
    ],
    [
        "echeveria-raindrops",
        {
            taxon: "Echeveria",
            scope: "Genus observations; Raindrops has no wild population",
        },
    ],
    [
        "kalanchoe-bracteata",
        {
            taxon: "Kalanchoe bracteata",
            scope: "Working species; the shared-planter ID remains probable",
        },
    ],
    [
        "kalanchoe-orgyalis",
        { taxon: "Kalanchoe orgyalis", scope: "Species observations" },
    ],
    [
        "pleiospilos-nelii-royal-flush",
        {
            taxon: "Pleiospilos nelii",
            scope: "Underlying species; Royal Flush is horticultural",
        },
    ],
    [
        "portulacaria-afra",
        { taxon: "Portulacaria afra", scope: "Species observations" },
    ],
    [
        "sempervivum-coconut-crystal",
        {
            taxon: "Sempervivum",
            scope: "Genus observations; Coconut Crystal has no wild population",
        },
    ],
]);

const markdownProcessor = remark().use(remarkGfm).use(remarkHtml, {
    sanitize: false,
});

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function stripMarkdown(value) {
    return value
        .replaceAll(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replaceAll(/[*_`]/g, "")
        .replaceAll(/\s+/g, " ")
        .trim();
}

function stripHtml(value) {
    return value
        .replaceAll(/<[^>]+>/g, " ")
        .replaceAll(/\s+/g, " ")
        .trim();
}

function parsePlantSheetGids(source) {
    const block = source.match(
        /const plantSheetGids = Object\.freeze\(\{([\s\S]*?)\}\);/
    )?.[1];
    if (!block) {
        throw new Error(
            "Could not read plantSheetGids from docs/layouts/plant-tracker-data.js."
        );
    }

    return new Map(
        [...block.matchAll(/\b(P\d{2}):\s*(\d+)/g)].map((match) => [
            match[1],
            Number(match[2]),
        ])
    );
}

function plantSheetUrl(trackerId, plantSheetGids) {
    if (!trackerId) return undefined;
    const gid = plantSheetGids.get(trackerId);
    if (!gid) {
        throw new Error(`No Google Sheets tab is configured for ${trackerId}.`);
    }
    return `https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit?gid=${gid}#gid=${gid}`;
}

function findSellerProductLink(markdown) {
    const allowedHosts = new Set([
        "costafarms.com",
        "mountaincrestgardens.com",
        "shopaltmanplants.com",
        "www.lowes.com",
    ]);

    for (const match of markdown.matchAll(
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
    )) {
        const [
            ,
            label,
            href,
        ] = match;
        const url = new URL(href);
        const exactProductCue =
            /seller listing|altman reserve|feather cactus/i.test(label);
        if (allowedHosts.has(url.hostname) && exactProductCue) {
            return { href, label: stripMarkdown(label) };
        }
    }

    return undefined;
}

function decorateProfileBody(html) {
    const wrapped = html.replace(
        /(<h2>Seller listing snapshot<\/h2>[\s\S]*?)(?=<h2>|$)/,
        '<section class="seller-snapshot" aria-label="Seller listing snapshot">$1</section>\n'
    );

    return wrapped.replaceAll(/<h2>([\s\S]*?)<\/h2>/g, (_, headingHtml) => {
        const heading = stripHtml(headingHtml).toLowerCase();
        let tone = "story";
        let icon = "✦";
        if (/source/.test(heading)) {
            tone = "sources";
            icon = "↗";
        } else if (/seller/.test(heading)) {
            tone = "seller";
            icon = "◇";
        } else if (/care|water|light|rehabilitation/.test(heading)) {
            tone = "care";
            icon = "◒";
        } else if (/propagat|prun|rotation/.test(heading)) {
            tone = "growth";
            icon = "↟";
        } else if (/risk|safety|pest|toxicity|watch/.test(heading)) {
            tone = "warning";
            icon = "!";
        } else if (
            /ident|name|identity|evidence|status|removal/.test(heading)
        ) {
            tone = "identity";
            icon = "▤";
        } else if (/origin|habitat|wild|ecology/.test(heading)) {
            tone = "habitat";
            icon = "⌖";
        }

        return `<h2 class="profile-section-heading profile-section-heading--${tone}"><span class="profile-section-icon" aria-hidden="true">${icon}</span><span>${headingHtml}</span></h2>`;
    });
}

async function renderInline(markdown) {
    const rendered = String(await markdownProcessor.process(markdown.trim()));
    return rendered.replace(/^<p>/, "").replace(/<\/p>\s*$/, "");
}

function externalizeLinks(html) {
    return html
        .replaceAll('href="../../../assets/', 'href="../../assets/')
        .replace(
            /<a href="(https?:\/\/[^\"]+)">/g,
            '<a href="$1" target="_blank" rel="noreferrer">'
        );
}

function parseProfile(markdown, group, sourceDirectory, fileName) {
    const lines = markdown.replaceAll("\r\n", "\n").split("\n");
    const titleLine = lines.find((line) => line.startsWith("# "));
    const firstSectionIndex = lines.findIndex((line) => line.startsWith("## "));

    if (!titleLine || firstSectionIndex < 0) {
        throw new Error(
            `Profile ${fileName} is missing its title or first section.`
        );
    }

    const metadata = {};
    for (const line of lines.slice(1, firstSectionIndex)) {
        const match = line.match(/^- ([^:]+):\s*(.+)$/);
        if (match) metadata[match[1].trim().toLowerCase()] = match[2].trim();
    }

    const inventory = stripMarkdown(metadata.inventory ?? "");
    const inventoryMatch = inventory.match(/^([A-Za-z]+-\d+)\s+[—-]\s+(.+)$/);
    const inventoryId = inventoryMatch?.[1] ?? inventory.split(" ")[0];

    if (!inventoryId) {
        throw new Error(`Profile ${fileName} is missing its inventory ID.`);
    }

    const orderStatusMarkdown = metadata["order status"] ?? "";
    const receiptUnverified = /\b(?:pending|unverified)\b/i.test(
        stripMarkdown(orderStatusMarkdown)
    );
    const historical =
        inventoryId === "Rehab-04" ||
        stripMarkdown(metadata.status ?? "")
            .toLowerCase()
            .includes("historical");
    const trackerId = stripMarkdown(metadata["tracker id"] ?? "");
    if (!historical && !/^P\d{2}$/.test(trackerId)) {
        throw new Error(
            `Current profile ${fileName} needs a permanent Tracker ID.`
        );
    }
    if (historical && trackerId) {
        throw new Error(
            `Historical profile ${fileName} must not claim a current Tracker ID.`
        );
    }

    return {
        fileName,
        slug: path.basename(fileName, ".md"),
        group: group.key,
        sourceDirectory,
        groupTitle: group.title,
        eyebrow: group.eyebrow,
        title: titleLine.slice(2).trim(),
        inventoryId,
        scientificMarkdown: inventoryMatch?.[2] ?? "",
        labelMarkdown: metadata["label id"] ?? "Not assigned",
        identificationMarkdown:
            metadata.identification ?? "Working identification",
        statusMarkdown:
            metadata.status ||
            orderStatusMarkdown ||
            "Current collection record",
        acquiredFromMarkdown: metadata["acquired from"] ?? "",
        acquiredOnMarkdown: metadata["acquired on"] ?? "",
        orderedFromMarkdown: metadata["ordered from"] ?? "",
        visualDescriptionMarkdown: metadata["visual description"] ?? "",
        interestingFactMarkdown: metadata["interesting fact"] ?? "",
        bodyMarkdown: lines.slice(firstSectionIndex).join("\n").trim(),
        historical,
        receiptUnverified,
        trackerId: trackerId || undefined,
        sellerProductLink: findSellerProductLink(markdown),
    };
}

function compareInventory(left, right) {
    const [
        ,
        leftPrefix,
        leftNumber,
    ] = left.inventoryId.match(/^([A-Za-z]+)-(\d+)$/) ?? [];
    const [
        ,
        rightPrefix,
        rightNumber,
    ] = right.inventoryId.match(/^([A-Za-z]+)-(\d+)$/) ?? [];
    return (
        String(leftPrefix).localeCompare(String(rightPrefix)) ||
        Number(leftNumber) - Number(rightNumber)
    );
}

function compareProfiles(left, right) {
    const leftTracker = Number(left.trackerId?.slice(1)) || 999;
    const rightTracker = Number(right.trackerId?.slice(1)) || 999;
    return leftTracker - rightTracker || compareInventory(left, right);
}

function photoScore(photo, desiredSubject, isHero = false) {
    const subjectScores = isHero
        ? { habit: 100, detail: 90, flower: 72, habitat: 60, "fruit-seed": 45 }
        : { flower: 100, habitat: 90, detail: 80, "fruit-seed": 75, habit: 60 };
    const desiredBonus = photo.subject === desiredSubject ? 200 : 0;
    const sourceBonus = photo.source === "Wikimedia Commons" ? 3 : 0;
    return desiredBonus + (subjectScores[photo.subject] ?? 10) + sourceBonus;
}

const heroPhotoFiles = new Map([
    [
        "mammillaria-rekoi",
        "assets/plants/mammillaria-rekoi/commons-19440517-habit.jpg",
    ],
]);

function choosePhotos(photos, slug) {
    const remaining = [...photos];
    const choices = [];
    const heroFile = heroPhotoFiles.get(slug);

    if (heroFile) {
        const heroIndex = remaining.findIndex(
            (photo) => photo.file.replaceAll("\\", "/") === heroFile
        );
        if (heroIndex === -1) {
            throw new Error(`Configured hero photo is missing for ${slug}`);
        }
        choices.push(remaining.splice(heroIndex, 1)[0]);
    }

    const desiredSubjects = choices.length
        ? ["flower", "habitat"]
        : [
              "habit",
              "flower",
              "habitat",
          ];
    for (const desired of desiredSubjects) {
        if (!remaining.length) break;
        remaining.sort(
            (left, right) =>
                photoScore(right, desired, choices.length === 0) -
                photoScore(left, desired, choices.length === 0)
        );
        choices.push(remaining.shift());
    }

    return choices;
}

function photoPath(photo) {
    return `../../${photo.file.replaceAll("\\", "/")}`;
}

function collectionPhotoKind(kind) {
    return kind === "nursery-label"
        ? "Your nursery-label evidence"
        : "Your collection";
}

function collectionPhotoDate(photo) {
    return photo.captured_on ?? photo.provided_on;
}

function compareCollectionPhotosNewestFirst(left, right) {
    const dateDifference = collectionPhotoDate(right).localeCompare(
        collectionPhotoDate(left)
    );
    const viewPriority = new Map([
        ["detail", 0],
        ["side", 1],
        ["top", 2],
        ["context", 3],
        ["overview", 4],
    ]);
    return (
        dateDifference ||
        (viewPriority.get(left.view) ?? 9) - (viewPriority.get(right.view) ?? 9)
    );
}

function collectionViewLabel(view) {
    return {
        side: "Side view",
        top: "Top view",
        detail: "Detail view",
        context: "Context view",
        overview: "Collection overview",
    }[view];
}

function formatCollectionDate(date) {
    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "long",
        timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`));
}

function renderCollectionPhoto(photo, extraClass = "") {
    const imagePath = `../../${photo.file.replaceAll("\\", "/")}`;
    const normalizedSourcePath = photo.source_file.replaceAll("\\", "/");
    const sourcePath = `../../${normalizedSourcePath}`;
    const evidenceDate = collectionPhotoDate(photo);
    const evidenceVerb = photo.captured_on ? "Photographed" : "Provided";
    const sourceLinkText =
        normalizedSourcePath === photo.file.replaceAll("\\", "/")
            ? "Open the metadata-sanitized publication file"
            : normalizedSourcePath.endsWith(".webp")
              ? "Open the archived evidence crop"
              : photo.derived_note
                ? "Open the archived presentation crop"
                : "Open the original evidence file";
    const derivedNote = photo.derived_note
        ? `<span>${escapeHtml(photo.derived_note)}</span>`
        : "";
    const viewLabel = collectionViewLabel(photo.view);
    const viewBadge = viewLabel
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

    return `<figure class="${classes.map(escapeHtml).join(" ")}" data-photo-kind="${escapeHtml(photo.kind)}"${photo.view ? ` data-photo-view="${escapeHtml(photo.view)}"` : ""}>
    <a href="${escapeHtml(imagePath)}">
      <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(photo.alt)}" loading="lazy" decoding="async">
    </a>
    <figcaption>
      <span class="photo-labels"><span class="photo-kind">${escapeHtml(collectionPhotoKind(photo.kind))}</span>${viewBadge}</span>
      <strong>${escapeHtml(photo.caption)}</strong>
      <span>${evidenceVerb} <time datetime="${escapeHtml(evidenceDate)}">${escapeHtml(evidenceDate)}</time> · © Nick, all rights reserved</span>
      ${derivedNote}
      <a href="${escapeHtml(sourcePath)}">${sourceLinkText}</a>
    </figcaption>
  </figure>`;
}

function renderCollectionDateGroups(
    photos,
    extraPhotoClass = "",
    headingLevel = 3
) {
    const sortedPhotos = [...photos].sort(compareCollectionPhotosNewestFirst);
    const photosByDate = Map.groupBy(sortedPhotos, collectionPhotoDate);

    return [...photosByDate]
        .map(
            ([date, datedPhotos]) => `<section class="collection-date-group">
      <header class="collection-date-heading">
        <h${headingLevel}><time datetime="${escapeHtml(date)}">${escapeHtml(formatCollectionDate(date))}</time></h${headingLevel}>
        <span>${datedPhotos.length} ${datedPhotos.length === 1 ? "view" : "views"}</span>
      </header>
      <div class="collection-photo-grid">
        ${datedPhotos.map((photo) => renderCollectionPhoto(photo, extraPhotoClass)).join("\n")}
      </div>
    </section>`
        )
        .join("\n");
}

function renderCollectionGallery(profile) {
    const photos = profile.collectionRecord.photos;
    const growthPhotos = photos
        .filter((photo) => photo.kind === "collection")
        .sort(compareCollectionPhotosNewestFirst);
    const newestPhotos = growthPhotos.slice(0, 2);
    const olderPhotos = growthPhotos.slice(2);
    const growthHistory = growthPhotos.length
        ? `<div class="collection-history">
        <p class="collection-history-note">Newest first. The latest two views stay visible; expand the archive for every earlier dated photograph.</p>
        <div class="collection-history-preview" aria-label="Latest collection photographs">
          ${newestPhotos.map((photo) => renderCollectionPhoto(photo, "collection-photo--latest")).join("\n")}
        </div>
        ${
            olderPhotos.length
                ? `<details class="collection-history-details">
          <summary class="collection-history-summary" aria-expanded="false">
            <span><strong>View complete photo history</strong><small>${olderPhotos.length} earlier ${olderPhotos.length === 1 ? "photograph" : "photographs"}, newest to oldest</small></span>
            <span class="history-summary-icon" aria-hidden="true">+</span>
          </summary>
          <div class="collection-history-older">
            ${renderCollectionDateGroups(olderPhotos)}
          </div>
        </details>`
                : ""
        }
      </div>`
        : "";
    const content = growthPhotos.length
        ? growthHistory
        : `<div class="collection-photo-pending">
        <span aria-hidden="true">+</span>
        <p><strong>Collection photo pending.</strong> ${escapeHtml(profile.collectionRecord.pending_note)}</p>
      </div>`;

    return `<section class="collection-gallery" id="${escapeHtml(profile.slug)}-photo-history" aria-labelledby="${escapeHtml(profile.slug)}-collection-heading">
    <header>
      <div>
        <p class="kicker">Dated collection evidence</p>
        <h2 id="${escapeHtml(profile.slug)}-collection-heading">Plant photo history</h2>
      </div>
      <p>These user-owned photographs document this exact plant. Context views use a compact crop here; open any image for the complete evidence file.</p>
    </header>
    ${content}
  </section>`;
}

function renderNurseryEvidence(profile) {
    const nurseryLabelPhotos = profile.collectionRecord.photos.filter(
        (photo) => photo.kind === "nursery-label"
    );
    if (!nurseryLabelPhotos.length) return "";

    return `<section class="nursery-evidence" id="${escapeHtml(profile.slug)}-nursery-evidence" aria-labelledby="${escapeHtml(profile.slug)}-nursery-heading">
    <header>
      <div>
        <p class="kicker">Original identification evidence</p>
        <h2 id="${escapeHtml(profile.slug)}-nursery-heading">Nursery labels</h2>
      </div>
      <p>Label wording is preserved as evidence, not treated as botanical proof. The compact previews keep the page readable; open one for the archived source.</p>
    </header>
    <div class="collection-photo-grid collection-photo-grid--labels">
      ${nurseryLabelPhotos.map((photo) => renderCollectionPhoto(photo)).join("\n")}
    </div>
  </section>`;
}

function choosePlantAvatar(collectionRecord, heroPhoto) {
    const collectionPhoto = collectionRecord.photos
        .filter(
            (photo) =>
                photo.kind === "collection" &&
                !["context", "overview"].includes(photo.view)
        )
        .sort(compareCollectionPhotosNewestFirst)[0];
    if (collectionPhoto) {
        return {
            alt: collectionPhoto.alt,
            src: `../../${collectionPhoto.file.replaceAll("\\", "/")}`,
        };
    }
    if (heroPhoto) {
        return { alt: heroPhoto.title, src: photoPath(heroPhoto) };
    }
    return undefined;
}

function renderPlantAvatar(profile, variant) {
    return profile.avatar
        ? `<img class="plant-avatar plant-avatar--${escapeHtml(variant)}" src="${escapeHtml(profile.avatar.src)}" alt="${escapeHtml(profile.avatar.alt)}" loading="lazy" decoding="async">`
        : `<span class="plant-avatar plant-avatar--${escapeHtml(variant)}" aria-hidden="true">🌵</span>`;
}

function renderCredit(photo, short = false) {
    const subject = photo.subject.replace("-", " and ");
    if (short) {
        return `<span class="photo-kind">Species-reference ${escapeHtml(subject)}</span>
      <span>${escapeHtml(photo.author)} · <a href="${escapeHtml(photo.source_url)}" target="_blank" rel="noreferrer">${escapeHtml(photo.license)}</a></span>`;
    }

    return `<span class="photo-kind">Species-reference ${escapeHtml(subject)}</span>
    <span>${escapeHtml(photo.title)}</span>
    <span>${escapeHtml(photo.author)} · <a href="${escapeHtml(photo.source_url)}" target="_blank" rel="noreferrer">source</a> · <a href="${escapeHtml(photo.license_url)}" target="_blank" rel="noreferrer">${escapeHtml(photo.license)}</a></span>`;
}

function renderPhoto(photo, className = "") {
    return `<figure class="reference-photo ${className}">
    <a href="${escapeHtml(photo.source_url)}" target="_blank" rel="noreferrer">
      <img src="${escapeHtml(photoPath(photo))}" alt="${escapeHtml(photo.title)}" loading="lazy" decoding="async">
    </a>
    <figcaption>${renderCredit(photo)}</figcaption>
  </figure>`;
}

function renderGalleryPhoto(photo) {
    const stageName =
        lifecycleStages.find(([subject]) => subject === photo.subject)?.[1] ??
        photo.subject;
    const context = [photo.location, photo.observed_on]
        .filter(Boolean)
        .join(" · ");

    return `<figure class="gallery-photo" data-stage="${escapeHtml(photo.subject)}">
    <a href="${escapeHtml(photoPath(photo))}" target="_blank">
      <img src="${escapeHtml(photoPath(photo))}" alt="${escapeHtml(photo.title)}" loading="lazy" decoding="async">
    </a>
    <figcaption>
      <span class="gallery-stage">${escapeHtml(stageName)}</span>
      <strong>${escapeHtml(photo.title)}</strong>
      ${context ? `<span>${escapeHtml(context)}</span>` : ""}
      <span>${escapeHtml(photo.author)} · <a href="${escapeHtml(photo.source_url)}" target="_blank" rel="noreferrer">source</a> · <a href="${escapeHtml(photo.license_url)}" target="_blank" rel="noreferrer">${escapeHtml(photo.license)}</a></span>
    </figcaption>
  </figure>`;
}

function renderLifecycleGallery(profile) {
    const availableSubjects = new Set(
        profile.allPhotos.map((photo) => photo.subject)
    );
    const coverage = lifecycleStages
        .map(
            ([subject, label]) =>
                `<li class="${availableSubjects.has(subject) ? "is-covered" : "is-missing"}"><span aria-hidden="true">${availableSubjects.has(subject) ? "✓" : "–"}</span>${escapeHtml(label)}</li>`
        )
        .join("\n");
    const missingStages = lifecycleStages
        .filter(
            ([subject]) =>
                [
                    "young",
                    "habit",
                    "flower",
                    "fruit-seed",
                    "habitat",
                ].includes(subject) && !availableSubjects.has(subject)
        )
        .map(([, label]) => label.toLowerCase());
    const gapText = missingStages.length
        ? `No credible reusable-license ${missingStages.join(", ")} ${missingStages.length === 1 ? "image is" : "images are"} archived yet.`
        : "The archive currently covers every major lifecycle category.";

    return `<section class="lifecycle-gallery" aria-labelledby="${escapeHtml(profile.slug)}-gallery-heading">
    <header>
      <div>
        <p class="kicker">Growth, reproduction, and habitat</p>
        <h2 id="${escapeHtml(profile.slug)}-gallery-heading">Life in ${profile.photoCount} credited views</h2>
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

async function loadProfiles() {
    const [
        manifest,
        collectionManifest,
        trackerDataSource,
    ] = await Promise.all([
        readFile(photoManifestPath, "utf8").then(JSON.parse),
        readFile(collectionPhotoManifestPath, "utf8").then(JSON.parse),
        readFile(plantTrackerDataPath, "utf8"),
    ]);
    const plantSheetGids = parsePlantSheetGids(trackerDataSource);
    const photosBySlug = Map.groupBy(
        manifest.photos,
        (photo) => photo.plant_slug
    );
    const collectionPhotosBySlug = new Map(
        collectionManifest.plants.map((record) => [record.plant_slug, record])
    );
    const profiles = [];

    for (const group of groups) {
        for (const sourceDirectory of group.directories) {
            const directory = path.join(
                repositoryRoot,
                "docs",
                "plants",
                sourceDirectory
            );
            const fileNames = (await readdir(directory))
                .filter((fileName) => fileName.endsWith(".md"))
                .sort();

            for (const fileName of fileNames) {
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

                const bodyHtml = decorateProfileBody(
                    externalizeLinks(
                        String(
                            await markdownProcessor.process(
                                profile.bodyMarkdown
                            )
                        )
                    )
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
                profiles.push({
                    ...profile,
                    bodyHtml,
                    scientificHtml,
                    labelHtml,
                    identificationHtml,
                    statusHtml,
                    acquiredFromHtml,
                    acquiredOnHtml,
                    orderedFromHtml,
                    visualDescriptionHtml,
                    interestingFactHtml,
                    scopeNote:
                        photos[0]?.scope_note ??
                        "Reference photography is not archived yet; this page currently uses the collection record and linked research sources.",
                    selectedPhotos,
                    allPhotos: [...photos].sort(
                        (left, right) =>
                            (lifecycleOrder.get(left.subject) ?? 99) -
                            (lifecycleOrder.get(right.subject) ?? 99)
                    ),
                    photoCount: photos.length,
                    collectionRecord,
                    avatar: choosePlantAvatar(
                        collectionRecord,
                        selectedPhotos[0]
                    ),
                    sheetUrl: plantSheetUrl(profile.trackerId, plantSheetGids),
                });
            }
        }
    }

    profiles.sort((left, right) => {
        const groupDifference =
            groups.findIndex((group) => group.key === left.group) -
            groups.findIndex((group) => group.key === right.group);
        return groupDifference || compareProfiles(left, right);
    });

    return profiles;
}

function renderNavGroup(group, profiles) {
    const groupProfiles = profiles.filter(
        (profile) => profile.group === group.key
    );
    return `<section class="drawer-group">
    <h2>${escapeHtml(group.title)}</h2>
    <ol>
      ${groupProfiles
          .map(
              (profile) => `<li data-search="${escapeHtml(
                  `${profile.trackerId ?? ""} ${profile.inventoryId} ${stripMarkdown(profile.labelMarkdown)} ${profile.title} ${stripMarkdown(profile.scientificMarkdown)}`.toLowerCase()
              )}">
        <a class="drawer-link" href="#${escapeHtml(profile.slug)}" data-page-link="${escapeHtml(profile.slug)}">
          ${renderPlantAvatar(profile, "drawer")}
          <span class="drawer-id"><strong>${escapeHtml(profile.trackerId ?? "Archive")}</strong><small>${profile.labelHtml}</small></span>
          <span><strong>${escapeHtml(profile.title)}</strong><small>${escapeHtml(stripMarkdown(profile.scientificMarkdown))}</small></span>
        </a>
        ${profile.sheetUrl ? `<a class="drawer-sheet-link" href="${escapeHtml(profile.sheetUrl)}" target="_blank" rel="noreferrer"><span aria-hidden="true">▦</span> Open ${escapeHtml(profile.trackerId)} in Google Sheets</a>` : ""}
      </li>`
          )
          .join("\n")}
    </ol>
  </section>`;
}

function renderContentsGroup(group, profiles, pageNumberBySlug) {
    const groupProfiles = profiles.filter(
        (profile) => profile.group === group.key
    );
    return `<section class="contents-group${group.key === "cacti" ? " contents-group--wide" : ""}" data-group="${escapeHtml(group.key)}">
    <header>
      <p>${escapeHtml(group.eyebrow)}</p>
      <h2>${escapeHtml(group.title)}</h2>
      <span>${escapeHtml(group.description)}</span>
    </header>
    <ol>
      ${groupProfiles
          .map(
              (profile) => `<li>
        <a href="#${escapeHtml(profile.slug)}" data-page-link="${escapeHtml(profile.slug)}">
          ${renderPlantAvatar(profile, "contents")}
          <span class="contents-id"><strong>${escapeHtml(profile.trackerId ?? "Archive")}</strong><small>${profile.labelHtml}</small></span>
          <span class="contents-name"><strong>${escapeHtml(profile.title)}</strong><em>${escapeHtml(stripMarkdown(profile.scientificMarkdown))}</em></span>
          <span class="contents-page">${String(pageNumberBySlug.get(profile.slug)).padStart(2, "0")}</span>
        </a>
      </li>`
          )
          .join("\n")}
    </ol>
  </section>`;
}

function renderProfile(profile, pageNumber, totalProfiles) {
    const [
        heroPhoto,
        detailPhoto,
        habitatPhoto,
    ] = profile.selectedPhotos;
    const archivePath = `../../assets/plants/${profile.slug}/README.md`;
    const sourceProfilePath = `../plants/${profile.sourceDirectory}/${profile.fileName}`;
    const trackerId = profile.trackerId;
    const inaturalist = inaturalistBySlug.get(profile.slug);
    if (!inaturalist) {
        throw new Error(
            `Missing iNaturalist discovery link for ${profile.slug}.`
        );
    }
    const inaturalistUrl = `https://www.inaturalist.org/observations?taxon_name=${encodeURIComponent(inaturalist.taxon)}`;
    const historyLink = trackerId
        ? `<a class="profile-history-link" href="../layouts/plant-history.html?id=${encodeURIComponent(trackerId)}"><span><span aria-hidden="true">◫</span> Open the live care history<small>Measurements, watering, events, and charts</small></span><span aria-hidden="true">→</span></a>`
        : "";
    const sheetLink = profile.sheetUrl
        ? `<a class="profile-sheet-link" href="${escapeHtml(profile.sheetUrl)}" target="_blank" rel="noreferrer"><span><span aria-hidden="true">▦</span> Open ${escapeHtml(trackerId)} in Google Sheets<small>Direct plant worksheet tab</small></span><span aria-hidden="true">↗</span></a>`
        : "";
    const productLink = profile.sellerProductLink
        ? `<a class="seller-product-link" href="${escapeHtml(profile.sellerProductLink.href)}" target="_blank" rel="noreferrer"><span><span aria-hidden="true">◇</span> Open the exact seller product page<small>${escapeHtml(profile.sellerProductLink.label)}</small></span><span aria-hidden="true">↗</span></a>`
        : "";
    const searchText = stripMarkdown(
        `${profile.inventoryId} ${trackerId ?? ""} ${profile.labelMarkdown} ${profile.title} ${profile.scientificMarkdown} ${profile.identificationMarkdown} ${profile.acquiredFromMarkdown} ${profile.acquiredOnMarkdown} ${profile.orderedFromMarkdown} ${profile.visualDescriptionMarkdown} ${profile.interestingFactMarkdown} ${profile.bodyMarkdown}`
    ).toLowerCase();

    const acquisitionDetails = [
        profile.acquiredFromHtml
            ? `<div><dt>Acquired from</dt><dd>${profile.acquiredFromHtml}</dd></div>`
            : "",
        profile.acquiredOnHtml
            ? `<div><dt>Acquired on</dt><dd><time datetime="${escapeHtml(stripMarkdown(profile.acquiredOnMarkdown))}">${profile.acquiredOnHtml}</time></dd></div>`
            : "",
        profile.orderedFromHtml
            ? `<div><dt>Ordered from</dt><dd>${profile.orderedFromHtml}</dd></div>`
            : "",
    ].join("");

    const hasPhotos = profile.photoCount > 0;
    const heroMedia = heroPhoto
        ? `<img src="${escapeHtml(photoPath(heroPhoto))}" alt="${escapeHtml(heroPhoto.title)}" loading="lazy" decoding="async">`
        : `<div class="hero-photo-placeholder" aria-hidden="true"><span>Reference photographs pending</span></div>`;
    const railPhotos = [
        detailPhoto ? renderPhoto(detailPhoto, "portrait-photo") : "",
        habitatPhoto ? renderPhoto(habitatPhoto, "landscape-photo") : "",
    ].join("\n");
    const archiveLink = hasPhotos
        ? `<a href="${escapeHtml(archivePath)}">Open all ${profile.photoCount} archived photos and credits <span aria-hidden="true">→</span></a>`
        : `<p class="archive-pending"><strong>Licensed reference gallery pending.</strong> The research profile is complete; no local photo archive is being implied.</p>`;

    return `<article class="book-page profile-page" id="${escapeHtml(profile.slug)}" data-page="${escapeHtml(profile.slug)}" data-group="${escapeHtml(profile.group)}" data-title="${escapeHtml(profile.title)}" data-search="${escapeHtml(searchText)}" hidden>
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
          <span class="inventory-badge">Inventory ${escapeHtml(profile.inventoryId)}</span>
          ${trackerId ? `<span class="tracker-badge">Sheets ${escapeHtml(trackerId)}</span>` : ""}
          <span class="label-badge">Label ${profile.labelHtml}</span>
          ${profile.historical ? '<span class="history-badge">Historical record</span>' : ""}
          ${profile.receiptUnverified ? '<span class="order-badge">Ordered · receipt unverified</span>' : ""}
        </div>
        <p>${profile.scientificHtml}</p>
        <h1>${escapeHtml(profile.title)}</h1>
      </div>
      ${heroPhoto ? `<figcaption class="hero-credit">${renderCredit(heroPhoto, true)}</figcaption>` : ""}
    </header>

    <div class="profile-intro">
      <dl>
        <div><dt>Collection record</dt><dd>${escapeHtml(profile.inventoryId)}</dd></div>
        ${trackerId ? `<div><dt>Google Sheets ID</dt><dd><a href="${escapeHtml(profile.sheetUrl)}" target="_blank" rel="noreferrer">${escapeHtml(trackerId)} <span aria-hidden="true">↗</span></a></dd></div>` : ""}
        <div><dt>Permanent label</dt><dd>${profile.labelHtml}</dd></div>
        <div><dt>Identification</dt><dd>${profile.identificationHtml}</dd></div>
        <div><dt>Status</dt><dd>${profile.statusHtml}</dd></div>
        ${acquisitionDetails}
      </dl>
      <p><strong>Photo scope:</strong> ${escapeHtml(profile.scopeNote)}</p>
    </div>

    <section class="profile-at-a-glance" aria-label="Visual description and interesting fact">
      <div>
        <p class="kicker">Spot it</p>
        <h2><span aria-hidden="true">◎</span> What it looks like</h2>
        <p>${profile.visualDescriptionHtml}</p>
      </div>
      <div>
        <p class="kicker">One curious thing</p>
        <h2><span aria-hidden="true">✦</span> Did you know?</h2>
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
          <h2>Research trail</h2>
          ${historyLink}
          ${sheetLink}
          <a class="profile-photo-history-link" href="#${escapeHtml(profile.slug)}-photo-history"><span><span aria-hidden="true">▧</span> Jump to this plant's photo history<small>Latest two views plus the expandable archive</small></span><span aria-hidden="true">↓</span></a>
          ${productLink}
          <a class="inaturalist-link" href="${escapeHtml(inaturalistUrl)}" data-inaturalist-taxon="${escapeHtml(inaturalist.taxon)}" target="_blank" rel="noreferrer"><span>Browse iNaturalist observations<small>${escapeHtml(inaturalist.scope)}</small></span><span aria-hidden="true">↗</span></a>
          <a href="${escapeHtml(sourceProfilePath)}">Open the source profile <span aria-hidden="true">→</span></a>
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
  </article>`;
}

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
        .map((slug) => profiles.find((profile) => profile.slug === slug))
        .filter(Boolean);

    return `<section class="book-page cover-page" id="cover" data-page="cover" data-title="Cover">
    <div class="cover-collage" aria-hidden="true">
      ${coverProfiles
          .map(
              (profile) =>
                  `<img src="${escapeHtml(photoPath(profile.selectedPhotos[0]))}" alt="" loading="eager" decoding="async">`
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
      <a class="cover-start" href="#${escapeHtml(profiles[0].slug)}" data-page-link="${escapeHtml(profiles[0].slug)}">Start reading <span aria-hidden="true">→</span></a>
    </div>
    <p class="cover-credit">Summer 2026 edition · Working identifications stay honest about uncertainty</p>
  </section>`;
}

async function renderBooklet(profiles) {
    const presentCount = profiles.filter(
        (profile) => !profile.historical && !profile.receiptUnverified
    ).length;
    const unverifiedReceiptCount = profiles.filter(
        (profile) => profile.receiptUnverified
    ).length;
    const orderSummary =
        unverifiedReceiptCount > 0 ? `${unverifiedReceiptCount} ordered, ` : "";
    const pageNumberBySlug = new Map(
        profiles.map((profile, index) => [profile.slug, index + 1])
    );
    const navigation = groups
        .map((group) => renderNavGroup(group, profiles))
        .join("\n");
    const contents = groups
        .map((group) => renderContentsGroup(group, profiles, pageNumberBySlug))
        .join("\n");
    const profilePages = profiles
        .map((profile, index) =>
            renderProfile(profile, index + 1, profiles.length)
        )
        .join("\n");

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="description" content="A browser field guide to the cactus, succulent, and houseplant records in the Fenton collection.">
  <title>The Fenton Collection · Plant field guide</title>
  <link rel="icon" href="./favicon.svg" type="image/svg+xml">
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
</head>
<body>
  <a class="skip-link" href="#book">Skip to the current page</a>

  <header class="reader-bar" aria-label="Booklet controls">
    <button class="icon-button menu-button" id="open-contents" type="button" aria-haspopup="dialog" aria-controls="contents-dialog">
      <span aria-hidden="true">☰</span><span>Contents</span>
    </button>
    <div class="reader-position" aria-live="polite">
      <strong id="reader-title">Cover</strong>
      <span id="reader-count">The Fenton Collection</span>
    </div>
    <div class="reader-actions">
      <a class="icon-button" href="../layouts/photo-album.html"><span aria-hidden="true">▧</span><span>Photos</span></a>
      <button class="icon-button" type="button" data-surprise-plant aria-label="Open a random plant profile"><span aria-hidden="true">🌵</span><span>Random</span></button>
      <button class="icon-button" id="theme-toggle" type="button" aria-pressed="false"><span aria-hidden="true">◐</span><span>Theme</span></button>
      <button class="icon-button" id="print-booklet" type="button"><span aria-hidden="true">▣</span><span>Print</span></button>
    </div>
    <div class="reader-progress" aria-hidden="true"><span id="reader-progress"></span></div>
  </header>

  <dialog class="contents-dialog" id="contents-dialog">
    <header>
      <div><span class="dialog-kicker">Field guide</span><h1>Find a plant</h1></div>
      <button class="close-button" id="close-contents" type="button" aria-label="Close contents">×</button>
    </header>
    <label class="search-label" for="plant-search">Search names, IDs, care, origins, or warnings</label>
    <input id="plant-search" type="search" placeholder="Try A3, Mexico, flowers, or latex" autocomplete="off">
    <p class="search-status" id="search-status" aria-live="polite">Showing all ${profiles.length} profiles</p>
    <nav class="drawer-nav" aria-label="Plant profiles">
      <a class="drawer-special" href="#cover" data-page-link="cover"><span>Cover</span><small>Start of the guide</small></a>
      <a class="drawer-special" href="#contents" data-page-link="contents"><span>Printed contents</span><small>All profiles at a glance</small></a>
      <a class="drawer-special" href="../layouts/plant-tracker.html"><span>Plant tracker</span><small>Live weights, watering, and measurements</small></a>
      <a class="drawer-special" href="../layouts/grow-spot-layout.html"><span>Grow-spot layout</span><small>Tables, risers, light, fan, and camera</small></a>
      <a class="drawer-special" href="../layouts/indoor-acclimation-calendar.html"><span>Acclimation calendar</span><small>Dated light and airflow schedule</small></a>
      <a class="drawer-special" href="../layouts/photo-album.html"><span>Plant photo album</span><small>Collection photos and Google Photos link</small></a>
      <a class="drawer-special" id="surprise-plant" href="#${escapeHtml(profiles[0].slug)}" data-surprise-plant><span>Surprise me</span><small>Jump to a random plant story</small></a>
      ${navigation}
    </nav>
  </dialog>

  <main id="book" tabindex="-1">
    ${renderCover(profiles)}

    <section class="book-page contents-page" id="contents" data-page="contents" data-title="Contents" hidden>
      <header class="contents-heading">
        <p>The Fenton Collection · Summer 2026</p>
        <h1>${presentCount} plants present,<br>${orderSummary}${profiles.length} stories.</h1>
        <span>Each profile combines identity, care, seller and nursery evidence, licensed references, live records, and a newest-first photo history. The latest two collection views stay visible; earlier views expand in place.</span>
      </header>
      <div class="contents-columns">${contents}</div>
      <aside class="contents-note">
        <strong>Three IDs, three jobs</strong>
        <p><strong>P01–P28</strong> opens the live Google Sheets plant record, the short pot label identifies the physical plant or shared planter, and the Inventory ID preserves the repository record. Repeated P19 and P20 values are intentional shared-planter records; Rehab-04 remains as an untracked historical page.</p>
      </aside>
    </section>

    ${profilePages}
  </main>

  <nav class="page-controls" aria-label="Page navigation">
    <button id="previous-page" type="button"><span aria-hidden="true">←</span><span><small>Previous</small><strong id="previous-label">Cover</strong></span></button>
    <button id="next-page" type="button"><span><small>Next</small><strong id="next-label">Contents</strong></span><span aria-hidden="true">→</span></button>
  </nav>

  <p class="sr-only" id="page-announcer" aria-live="polite" aria-atomic="true"></p>

  <noscript>
    <p class="noscript-note">JavaScript is needed for page-by-page reading. Printing still includes the complete guide.</p>
  </noscript>
</body>
</html>
`;
}

async function main() {
    const [profiles, fieldGuideProfiles] = await Promise.all([
        loadProfiles(),
        readFile(plantProfileDataPath, "utf8").then(JSON.parse),
    ]);
    const fieldGuideProfileEntries = Object.entries(fieldGuideProfiles).flatMap(
        ([trackerId, entries]) =>
            entries.map(([slug, title]) => ({ slug, title, trackerId }))
    );
    const fieldGuideProfileBySlug = new Map(
        fieldGuideProfileEntries.map((entry) => [entry.slug, entry])
    );

    if (profiles.length !== 34) {
        throw new Error(`Expected 34 profiles but found ${profiles.length}.`);
    }

    if (fieldGuideProfileBySlug.size !== fieldGuideProfileEntries.length) {
        throw new Error(
            "The canonical field-guide profile map has duplicate slugs."
        );
    }

    const trackedProfiles = profiles.filter((profile) => profile.trackerId);
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
                `${profile.slug} must match its canonical field-guide title and Tracker ID; found ${profile.title}/${profile.trackerId}.`
            );
        }
    }

    const renderedOutput = await renderBooklet(profiles);
    const prettierConfig = (await resolveConfig(outputPath)) ?? {};
    const output = await format(renderedOutput, {
        ...prettierConfig,
        filepath: outputPath,
    });
    const checkOnly = process.argv.includes("--check");

    if (checkOnly) {
        const current = await readFile(outputPath, "utf8").catch(() => "");
        if (current !== output) {
            throw new Error(
                "The plant booklet is stale. Run `npm run build:booklet` and commit the regenerated HTML."
            );
        }
        console.log(`Plant booklet is current: ${profiles.length} profiles.`);
        return;
    }

    await writeFile(outputPath, output, "utf8");
    console.log(
        `Built ${path.relative(repositoryRoot, outputPath)} with ${profiles.length} profiles.`
    );
}

await main();
