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

const groups = [
    {
        key: "starter",
        eyebrow: "Starter cactus group",
        title: "Starter cacti",
        description:
            "Twelve individually potted plants with permanent A1-D3 label IDs.",
    },
    {
        key: "cacti",
        eyebrow: "August cactus additions",
        title: "New individual cacti",
        description:
            "Six individually potted cacti with permanent E1-F3 labels.",
    },
    {
        key: "succulents",
        eyebrow: "Shared planter and Kiwi aeonium",
        title: "Succulents",
        description:
            "Four species in the shared planter plus the individually potted Kiwi aeonium.",
    },
    {
        key: "rehab",
        eyebrow: "Older planter and archive",
        title: "Older and rehabilitation plants",
        description:
            "Three living cactus records plus the retained historical record for Rehab-04.",
    },
    {
        key: "houseplants",
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

const trackerIdByInventoryId = new Map([
    ["Starter-07", "P01"],
    ["Starter-05", "P02"],
    ["Starter-04", "P03"],
    ["Starter-02", "P04"],
    ["Starter-01", "P05"],
    ["Starter-09", "P06"],
    ["Starter-08", "P07"],
    ["Starter-03", "P08"],
    ["Starter-12", "P09"],
    ["Starter-11", "P10"],
    ["Starter-06", "P11"],
    ["Starter-10", "P12"],
    ["Cactus-01", "P13"],
    ["Cactus-02", "P14"],
    ["Cactus-03", "P15"],
    ["Cactus-06", "P16"],
    ["Cactus-05", "P17"],
    ["Cactus-04", "P18"],
    ["Rehab-01", "P19"],
    ["Rehab-02", "P19"],
    ["Rehab-03", "P19"],
    ["Succulent-01", "P20"],
    ["Succulent-02", "P20"],
    ["Succulent-03", "P20"],
    ["Succulent-04", "P20"],
    ["Houseplant-01", "P21"],
    ["Succulent-05", "P22"],
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

async function renderInline(markdown) {
    const rendered = String(await markdownProcessor.process(markdown.trim()));
    return rendered.replace(/^<p>/, "").replace(/<\/p>\s*$/, "");
}

function externalizeLinks(html) {
    return html.replace(
        /<a href="(https?:\/\/[^\"]+)">/g,
        '<a href="$1" target="_blank" rel="noreferrer">'
    );
}

function parseProfile(markdown, group, fileName) {
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

    return {
        fileName,
        slug: path.basename(fileName, ".md"),
        group: group.key,
        groupTitle: group.title,
        eyebrow: group.eyebrow,
        title: titleLine.slice(2).trim(),
        inventoryId,
        scientificMarkdown: inventoryMatch?.[2] ?? "",
        labelMarkdown: metadata["label id"] ?? "Not assigned",
        identificationMarkdown:
            metadata.identification ?? "Working identification",
        statusMarkdown: metadata.status ?? "Current collection record",
        acquiredFromMarkdown: metadata["acquired from"] ?? "",
        acquiredOnMarkdown: metadata["acquired on"] ?? "",
        bodyMarkdown: lines.slice(firstSectionIndex).join("\n").trim(),
        historical:
            inventoryId === "Rehab-04" ||
            stripMarkdown(metadata.status ?? "")
                .toLowerCase()
                .includes("historical"),
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

function renderCollectionPhoto(photo) {
    const imagePath = `../../${photo.file.replaceAll("\\", "/")}`;
    const sourcePath = `../../${photo.source_file.replaceAll("\\", "/")}`;

    return `<figure class="collection-photo" data-photo-kind="${escapeHtml(photo.kind)}">
    <a href="${escapeHtml(imagePath)}">
      <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(photo.alt)}" loading="lazy" decoding="async">
    </a>
    <figcaption>
      <span class="photo-kind">${escapeHtml(collectionPhotoKind(photo.kind))}</span>
      <strong>${escapeHtml(photo.caption)}</strong>
      <span>Photographed <time datetime="${escapeHtml(photo.captured_on)}">${escapeHtml(photo.captured_on)}</time> · © Nick, all rights reserved</span>
      <a href="${escapeHtml(sourcePath)}">Open the original evidence file</a>
    </figcaption>
  </figure>`;
}

function renderCollectionGallery(profile) {
    const photos = profile.collectionRecord.photos;
    const content = photos.length
        ? `<div class="collection-photo-grid">
        ${photos.map((photo) => renderCollectionPhoto(photo)).join("\n")}
      </div>`
        : `<div class="collection-photo-pending">
        <span aria-hidden="true">+</span>
        <p><strong>Collection photo pending.</strong> ${escapeHtml(profile.collectionRecord.pending_note)}</p>
      </div>`;

    return `<section class="collection-gallery" aria-labelledby="${escapeHtml(profile.slug)}-collection-heading">
    <header>
      <div>
        <p class="kicker">Collection evidence</p>
        <h2 id="${escapeHtml(profile.slug)}-collection-heading">Your plant</h2>
      </div>
      <p>These user-owned photographs document this collection record. They are separate from the reusable-license species references below.</p>
    </header>
    ${content}
  </section>`;
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
    const [manifest, collectionManifest] = await Promise.all([
        readFile(photoManifestPath, "utf8").then(JSON.parse),
        readFile(collectionPhotoManifestPath, "utf8").then(JSON.parse),
    ]);
    const photosBySlug = Map.groupBy(
        manifest.photos,
        (photo) => photo.plant_slug
    );
    const collectionPhotosBySlug = new Map(
        collectionManifest.plants.map((record) => [record.plant_slug, record])
    );
    const profiles = [];

    for (const group of groups) {
        const directory = path.join(
            repositoryRoot,
            "docs",
            "plants",
            group.key
        );
        const fileNames = (await readdir(directory))
            .filter((fileName) => fileName.endsWith(".md"))
            .sort();

        for (const fileName of fileNames) {
            const markdown = await readFile(
                path.join(directory, fileName),
                "utf8"
            );
            const profile = parseProfile(markdown, group, fileName);
            const photos = photosBySlug.get(profile.slug) ?? [];
            const collectionRecord = collectionPhotosBySlug.get(profile.slug);

            if (!collectionRecord) {
                throw new Error(
                    `Collection-photo manifest has no record for ${profile.slug}.`
                );
            }

            const bodyHtml = externalizeLinks(
                String(await markdownProcessor.process(profile.bodyMarkdown))
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

            profiles.push({
                ...profile,
                bodyHtml,
                scientificHtml,
                labelHtml,
                identificationHtml,
                statusHtml,
                acquiredFromHtml,
                acquiredOnHtml,
                scopeNote:
                    photos[0]?.scope_note ??
                    "Reference photography is not archived yet; this page currently uses the collection record and linked research sources.",
                selectedPhotos: choosePhotos(photos, profile.slug),
                allPhotos: [...photos].sort(
                    (left, right) =>
                        (lifecycleOrder.get(left.subject) ?? 99) -
                        (lifecycleOrder.get(right.subject) ?? 99)
                ),
                photoCount: photos.length,
                collectionRecord,
            });
        }
    }

    profiles.sort((left, right) => {
        const groupDifference =
            groups.findIndex((group) => group.key === left.group) -
            groups.findIndex((group) => group.key === right.group);
        return groupDifference || compareInventory(left, right);
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
                  `${profile.inventoryId} ${stripMarkdown(profile.labelMarkdown)} ${profile.title} ${stripMarkdown(profile.scientificMarkdown)}`.toLowerCase()
              )}">
        <a class="drawer-link" href="#${escapeHtml(profile.slug)}" data-page-link="${escapeHtml(profile.slug)}">
          <span class="drawer-id">${escapeHtml(profile.inventoryId)}</span>
          <span><strong>${escapeHtml(profile.title)}</strong><small>${escapeHtml(stripMarkdown(profile.scientificMarkdown))}</small></span>
        </a>
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
    return `<section class="contents-group">
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
          <span class="contents-id">${escapeHtml(profile.inventoryId)}</span>
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
    const sourceProfilePath = `../plants/${profile.group}/${profile.fileName}`;
    const trackerId = trackerIdByInventoryId.get(profile.inventoryId);
    const historyLink = trackerId
        ? `<a href="../layouts/plant-history.html?id=${encodeURIComponent(trackerId)}">Open the live care history <span aria-hidden="true">→</span></a>`
        : "";
    const searchText = stripMarkdown(
        `${profile.inventoryId} ${profile.labelMarkdown} ${profile.title} ${profile.scientificMarkdown} ${profile.identificationMarkdown} ${profile.acquiredFromMarkdown} ${profile.acquiredOnMarkdown} ${profile.bodyMarkdown}`
    ).toLowerCase();

    const acquisitionDetails = [
        profile.acquiredFromHtml
            ? `<div><dt>Acquired from</dt><dd>${profile.acquiredFromHtml}</dd></div>`
            : "",
        profile.acquiredOnHtml
            ? `<div><dt>Acquired on</dt><dd><time datetime="${escapeHtml(stripMarkdown(profile.acquiredOnMarkdown))}">${profile.acquiredOnHtml}</time></dd></div>`
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
        <div class="hero-badges">
          <span class="id-badge">${escapeHtml(profile.inventoryId)}</span>
          <span class="label-badge">Label ${profile.labelHtml}</span>
          ${profile.historical ? '<span class="history-badge">Historical record</span>' : ""}
        </div>
        <p>${profile.scientificHtml}</p>
        <h1>${escapeHtml(profile.title)}</h1>
      </div>
      ${heroPhoto ? `<figcaption class="hero-credit">${renderCredit(heroPhoto, true)}</figcaption>` : ""}
    </header>

    <div class="profile-intro">
      <dl>
        <div><dt>Collection record</dt><dd>${escapeHtml(profile.inventoryId)}</dd></div>
        <div><dt>Permanent label</dt><dd>${profile.labelHtml}</dd></div>
        <div><dt>Identification</dt><dd>${profile.identificationHtml}</dd></div>
        <div><dt>Status</dt><dd>${profile.statusHtml}</dd></div>
        ${acquisitionDetails}
      </dl>
      <p><strong>Photo scope:</strong> ${escapeHtml(profile.scopeNote)}</p>
    </div>

    ${renderCollectionGallery(profile)}

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
          <a href="${escapeHtml(sourceProfilePath)}">Open the source profile <span aria-hidden="true">→</span></a>
          ${archiveLink}
          <p>Identification confidence belongs to the collection plant. Any photographs illustrate the working species and may show mature or wild plants.</p>
        </section>
      </aside>
    </div>

    ${renderLifecycleGallery(profile)}

    <footer class="folio">
      <span>The Fenton Collection · 2026 field guide</span>
      <span>${String(pageNumber).padStart(2, "0")}</span>
    </footer>
  </article>`;
}

function renderCover(profiles) {
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
      <div><strong>${profiles.filter((profile) => !profile.historical).length}</strong><span>living plants</span></div>
      <div><strong>${profiles.length}</strong><span>deep profiles</span></div>
      <div><strong>${profiles.reduce((sum, profile) => sum + profile.photoCount, 0)}</strong><span>licensed reference photos</span></div>
      <a class="cover-start" href="#${escapeHtml(profiles[0].slug)}" data-page-link="${escapeHtml(profiles[0].slug)}">Start reading <span aria-hidden="true">→</span></a>
    </div>
    <p class="cover-credit">Summer 2026 edition · Working identifications stay honest about uncertainty</p>
  </section>`;
}

async function renderBooklet(profiles) {
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
      <a class="drawer-special" id="surprise-plant" href="#${escapeHtml(profiles[0].slug)}"><span>Surprise me</span><small>Jump to a random plant story</small></a>
      ${navigation}
    </nav>
  </dialog>

  <main id="book" tabindex="-1">
    ${renderCover(profiles)}

    <section class="book-page contents-page" id="contents" data-page="contents" data-title="Contents" hidden>
      <header class="contents-heading">
        <p>The Fenton Collection · Summer 2026</p>
        <h1>${profiles.filter((profile) => !profile.historical).length} living plants,<br>${profiles.length} stories.</h1>
        <span>Each profile combines collection history, botanical identity, native habitat, mature form, flowers, indoor care, propagation, risks, and source links. Licensed species-reference galleries are included where archived.</span>
      </header>
      <div class="contents-columns">${contents}</div>
      <aside class="contents-note">
        <strong>A note on names</strong>
        <p>Labeled plants retain that evidence. Photo-only matches remain marked probable, cultivars stay provisional when records are missing, and Rehab-04 remains as a historical page instead of disappearing from the story.</p>
      </aside>
    </section>

    ${profilePages}
  </main>

  <nav class="page-controls" aria-label="Page navigation">
    <button id="previous-page" type="button"><span aria-hidden="true">←</span><span><small>Previous</small><strong id="previous-label">Cover</strong></span></button>
    <button id="next-page" type="button"><span><small>Next</small><strong id="next-label">Contents</strong></span><span aria-hidden="true">→</span></button>
  </nav>

  <noscript>
    <p class="noscript-note">JavaScript is needed for page-by-page reading. Printing still includes the complete guide.</p>
  </noscript>
</body>
</html>
`;
}

async function main() {
    const profiles = await loadProfiles();

    if (profiles.length !== 28) {
        throw new Error(`Expected 28 profiles but found ${profiles.length}.`);
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
