import { createHash } from "node:crypto";
import {
    copyFile,
    mkdir,
    readFile,
    readdir,
    rm,
    stat,
    writeFile,
} from "node:fs/promises";
import path from "node:path";

import QRCode from "qrcode";
import sharp from "sharp";

import {
    groups,
    loadProfiles,
    stripHtml,
    stripMarkdown,
} from "./build-plant-booklet.mjs";
import {
    PRINT_SPEC,
    printAssetDirectory,
    printInteriorDirectory,
    printOutputRoot,
    repositoryRoot,
    totalInsideMarginIn,
} from "./print-book-config.mjs";

const collectionManifestPath = path.join(
    repositoryRoot,
    "assets",
    "collection-photos",
    "photo-manifest.json"
);
const privateSourceDirectory = path.join(
    repositoryRoot,
    ".private-photo-sources"
);
const privateSourceMapPath = path.join(
    privateSourceDirectory,
    "photo-source-map.json"
);
const printSourceDirectory = path.join(
    repositoryRoot,
    "docs",
    "plant-booklet",
    "print"
);
const publicBookletUrl = "https://nick2bad4u.github.io/Gardening/";
const generatedOn = "2026-09-03";

const imageRoles = Object.freeze({
    hero: {
        widthIn: 8.75,
        heightIn: 7.15,
        fit: "cover",
        position: "attention",
    },
    overview: {
        widthIn: 8.75,
        heightIn: 8.15,
        fit: "cover",
        position: "attention",
    },
    collection: {
        widthIn: 7.1,
        heightIn: 7.7,
        fit: "inside",
        position: "centre",
    },
    label: {
        widthIn: 6.7,
        heightIn: 7.25,
        fit: "inside",
        position: "centre",
    },
    reference: {
        widthIn: 3.2,
        heightIn: 2.65,
        fit: "inside",
        position: "centre",
    },
    "jacket-front": {
        widthIn: 8.75,
        heightIn: 7.35,
        fit: "cover",
        position: "attention",
    },
    "jacket-back": {
        widthIn: 8.75,
        heightIn: 5.65,
        fit: "cover",
        position: "attention",
    },
    "jacket-flap": {
        widthIn: 2.25,
        heightIn: 3.1,
        fit: "cover",
        position: "attention",
    },
});

const referenceSubjectOrder = new Map(
    [
        "habit",
        "flower",
        "habitat",
        "detail",
        "fruit-seed",
        "young",
    ].map((subject, index) => [subject, index])
);

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function normalizePath(value) {
    return value.replaceAll("\\", "/");
}

function pathInside(parent, candidate) {
    const relative = path.relative(parent, candidate);
    return (
        relative !== "" &&
        !relative.startsWith("..") &&
        !path.isAbsolute(relative)
    );
}

async function resetGeneratedDirectory(directory) {
    if (!pathInside(printOutputRoot, directory)) {
        throw new Error(
            `Refusing to reset out-of-scope directory: ${directory}`
        );
    }
    await rm(directory, { recursive: true, force: true });
    await mkdir(directory, { recursive: true });
}

async function pathExists(candidate) {
    try {
        await stat(candidate);
        return true;
    } catch (error) {
        if (error?.code === "ENOENT") return false;
        throw error;
    }
}

async function walkImageFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const candidate = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await walkImageFiles(candidate)));
        } else if (
            entry.isFile() &&
            /\.(?:avif|heic|jpe?g|png|tiff?|webp)$/i.test(entry.name)
        ) {
            files.push(candidate);
        }
    }
    return files;
}

function shortHash(value) {
    return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function safeStem(value) {
    return path
        .parse(value)
        .name.toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-+|-+$/g, "")
        .slice(0, 90);
}

function orientedDimensions(metadata) {
    const swap = [
        5,
        6,
        7,
        8,
    ].includes(metadata.orientation);
    return {
        width: swap ? metadata.height : metadata.width,
        height: swap ? metadata.width : metadata.height,
    };
}

function fitWithin(width, height, maxWidth, maxHeight) {
    const scale = Math.min(maxWidth / width, maxHeight / height);
    return {
        width: width * scale,
        height: height * scale,
    };
}

function round(value, digits = 3) {
    return Number(value.toFixed(digits));
}

function chunks(values, size) {
    return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
        values.slice(index * size, index * size + size)
    );
}

function compareCollectionPhotos(left, right) {
    const leftDate = left.captured_on ?? left.provided_on ?? "";
    const rightDate = right.captured_on ?? right.provided_on ?? "";
    return (
        rightDate.localeCompare(leftDate) ||
        String(left.view ?? "").localeCompare(String(right.view ?? ""))
    );
}

function readableDate(value) {
    if (!value) return "Date not recorded";
    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "long",
        timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));
}

function sourceLabel(photo) {
    if (photo.kind === "nursery-label") return "Nursery-label evidence";
    if (photo.source_url) return "Licensed reference photograph";
    return "Collection photograph";
}

function makeSourceResolver(privateFiles, sourceMap) {
    const byBaseName = Map.groupBy(privateFiles, (file) =>
        path.basename(file).toLowerCase()
    );

    return async function resolveCollectionSource(photo) {
        const mapped =
            sourceMap.sources?.[path.parse(photo.publication_name).name];
        if (mapped) {
            const candidate = path.resolve(privateSourceDirectory, mapped);
            if (
                !pathInside(privateSourceDirectory, candidate) ||
                !(await pathExists(candidate))
            ) {
                throw new Error(
                    `Invalid private source mapping for ${photo.publication_name}: ${mapped}`
                );
            }
            return { path: candidate, resolution: "private-source-map" };
        }

        const exact =
            byBaseName.get(photo.publication_name.toLowerCase()) ?? [];
        if (exact.length === 1) {
            return { path: exact[0], resolution: "private-exact-name" };
        }
        if (exact.length > 1) {
            throw new Error(
                `Ambiguous private source basename for ${photo.publication_name}: ${exact.join(", ")}`
            );
        }

        if (photo.source_file) {
            const candidate = path.resolve(
                repositoryRoot,
                photo.source_file.replaceAll("/", path.sep)
            );
            if (
                !pathInside(repositoryRoot, candidate) ||
                !(await pathExists(candidate))
            ) {
                throw new Error(
                    `Missing or out-of-scope evidence source for ${photo.publication_name}: ${photo.source_file}`
                );
            }
            return { path: candidate, resolution: "preserved-evidence" };
        }

        throw new Error(
            `No local full-quality source resolves ${photo.publication_name}.`
        );
    };
}

function printBodyHtml(bodyHtml) {
    const withoutWebSellerWrapper = bodyHtml.replaceAll(
        /<section class="seller-snapshot"[^>]*>([\s\S]*?)<\/section>/gi,
        "$1"
    );
    return withoutWebSellerWrapper
        .replaceAll(
            'href="./plant-icons.svg#',
            'href="../print-assets/plant-icons.svg#'
        )
        .replaceAll(' target="_blank"', "")
        .replaceAll(' rel="noreferrer"', "");
}

function uniquePhotos(photos) {
    const seen = new Set();
    return photos.filter((photo) => {
        const identity =
            photo.image_id ??
            photo.publication_name ??
            photo.source_file ??
            photo.file;
        if (seen.has(identity)) return false;
        seen.add(identity);
        return true;
    });
}

function balancedChunks(values, maximumSize) {
    if (!values.length) return [];
    const chunkCount = Math.ceil(values.length / maximumSize);
    const minimumSize = Math.floor(values.length / chunkCount);
    const largerChunkCount = values.length % chunkCount;
    const result = [];
    let offset = 0;
    for (let index = 0; index < chunkCount; index += 1) {
        const size = minimumSize + (index < largerChunkCount ? 1 : 0);
        result.push(values.slice(offset, offset + size));
        offset += size;
    }
    return result;
}

function splitProfileSections(bodyHtml) {
    const printable = printBodyHtml(bodyHtml);
    if (/<section class="seller-snapshot"/i.test(printable)) {
        throw new Error(
            "A web-only seller-snapshot wrapper remained in printable profile HTML."
        );
    }
    const matches = [...printable.matchAll(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi)];
    if (!matches.length) {
        return {
            sections: [
                {
                    title: "Field notes",
                    html: printable,
                    cost: stripHtml(printable).length,
                    hasTable: /<table\b/i.test(printable),
                },
            ],
            sources: null,
        };
    }

    const sections = matches.map((match, index) => {
        const start = match.index;
        const end = matches[index + 1]?.index ?? printable.length;
        const html = printable.slice(start, end).trim();
        const title = stripHtml(match[0]).trim();
        const tableRows = (html.match(/<tr\b/gi) ?? []).length;
        const listItems = (html.match(/<li\b/gi) ?? []).length;
        const hasTable = /<table\b/i.test(html);
        return {
            title,
            html,
            hasTable,
            cost:
                stripHtml(html).replaceAll(/\s+/g, " ").trim().length +
                tableRows * 44 +
                listItems * 18 +
                (hasTable ? 120 : 0),
        };
    });
    const sourceIndex = sections.findIndex((section) =>
        /^sources?$/i.test(section.title)
    );
    const sources =
        sourceIndex >= 0 ? sections.splice(sourceIndex, 1)[0] : null;
    return { sections, sources };
}

function paginateProfileSections(sections) {
    const maximumCost = 1_900;
    const pages = [];
    let current = [];
    let currentCost = 0;

    for (const section of sections) {
        const wouldOverflow =
            current.length > 0 &&
            (current.length >= 2 || currentCost + section.cost > maximumCost);
        if (wouldOverflow) {
            pages.push(current);
            current = [];
            currentCost = 0;
        }
        current.push(section);
        currentCost += section.cost;
    }
    if (current.length) pages.push(current);
    return pages;
}

async function main() {
    const previousManifest = await readFile(
        path.join(printOutputRoot, "print-manifest.json"),
        "utf8"
    )
        .then(JSON.parse)
        .catch(() => ({ images: [] }));
    await Promise.all([
        mkdir(printAssetDirectory, { recursive: true }),
        resetGeneratedDirectory(printInteriorDirectory),
    ]);

    const [
        profiles,
        collectionManifest,
        privateSourceMap,
        privateFiles,
    ] = await Promise.all([
        loadProfiles(),
        readFile(collectionManifestPath, "utf8").then(JSON.parse),
        readFile(privateSourceMapPath, "utf8").then(JSON.parse),
        walkImageFiles(privateSourceDirectory),
    ]);

    if (profiles.length !== 36) {
        throw new Error(`Expected 36 profiles; found ${profiles.length}.`);
    }
    if (profiles.filter((profile) => profile.historical).length !== 1) {
        throw new Error("Expected exactly one historical profile.");
    }

    const resolveCollectionSource = makeSourceResolver(
        privateFiles,
        privateSourceMap
    );
    const stagedImageCache = new Map();
    const imageManifest = [];
    const imageMetadataCache = new Map();
    const previousImageBySourceAndRole = new Map(
        (previousManifest.images ?? []).map((image) => [
            `${image.source_path}|${image.role}`,
            image,
        ])
    );

    async function sourceMetadata(sourcePath) {
        if (!imageMetadataCache.has(sourcePath)) {
            imageMetadataCache.set(
                sourcePath,
                sharp(sourcePath, { failOn: "warning" }).metadata()
            );
        }
        return imageMetadataCache.get(sourcePath);
    }

    async function stageImage({
        sourcePath,
        sourceResolution,
        role,
        publicationName,
        owner,
        provenance,
    }) {
        const definition = imageRoles[role];
        if (!definition) throw new Error(`Unknown print image role: ${role}`);
        const sourceStats = await stat(sourcePath);
        const cacheKey = [
            sourcePath,
            sourceStats.size,
            sourceStats.mtimeMs,
            role,
            PRINT_SPEC.imagePpi,
        ].join("|");
        if (stagedImageCache.has(cacheKey)) {
            const cached = stagedImageCache.get(cacheKey);
            cached.owners.add(owner);
            return cached;
        }

        const metadata = await sourceMetadata(sourcePath);
        if (!metadata.width || !metadata.height) {
            throw new Error(
                `Sharp could not read dimensions for ${sourcePath}.`
            );
        }
        const oriented = orientedDimensions(metadata);
        const targetWidth = Math.round(
            definition.widthIn * PRINT_SPEC.imagePpi
        );
        const targetHeight = Math.round(
            definition.heightIn * PRINT_SPEC.imagePpi
        );
        const sourceIdentity = normalizePath(
            path.relative(repositoryRoot, sourcePath)
        );
        const fileName = `${safeStem(publicationName)}-${role}-${shortHash(
            `${sourceIdentity}|${role}`
        )}.jpg`;
        const roleDirectory = path.join(printAssetDirectory, role);
        const outputPath = path.join(roleDirectory, fileName);
        await mkdir(roleDirectory, { recursive: true });

        const previous = previousImageBySourceAndRole.get(
            `${sourceIdentity}|${role}`
        );
        if (
            previous &&
            previous.source_size_bytes === sourceStats.size &&
            previous.staged_path ===
                normalizePath(path.relative(printOutputRoot, outputPath)) &&
            (await pathExists(outputPath))
        ) {
            const record = {
                ...previous,
                source_mtime_ms: sourceStats.mtimeMs,
                owners: new Set([owner]),
                provenance,
                relativeSource: `../print-assets/${normalizePath(
                    path.relative(printAssetDirectory, outputPath)
                )}`,
            };
            stagedImageCache.set(cacheKey, record);
            imageManifest.push(record);
            return record;
        }

        const pipeline = sharp(sourcePath, { failOn: "warning" })
            .rotate()
            .resize({
                width: targetWidth,
                height: targetHeight,
                fit: definition.fit,
                position: definition.position,
                withoutEnlargement: true,
            })
            .flatten({ background: "#f5f0e5" })
            .toColorspace("srgb")
            .jpeg({
                quality: 95,
                chromaSubsampling: "4:4:4",
                mozjpeg: true,
            });
        const outputInfo = await pipeline.toFile(outputPath);

        let display = fitWithin(
            outputInfo.width,
            outputInfo.height,
            definition.widthIn,
            definition.heightIn
        );
        let effectivePpi = Math.min(
            outputInfo.width / display.width,
            outputInfo.height / display.height
        );
        if (effectivePpi < PRINT_SPEC.minimumImagePpi) {
            const reduction = effectivePpi / PRINT_SPEC.minimumImagePpi;
            display = {
                width: display.width * reduction,
                height: display.height * reduction,
            };
            effectivePpi = Math.min(
                outputInfo.width / display.width,
                outputInfo.height / display.height
            );
        }

        const record = {
            id: `${role}-${shortHash(cacheKey)}`,
            role,
            publication_name: publicationName,
            source_path: sourceIdentity,
            source_resolution: sourceResolution,
            source_format: metadata.format,
            source_width_px: oriented.width,
            source_height_px: oriented.height,
            source_size_bytes: sourceStats.size,
            source_mtime_ms: sourceStats.mtimeMs,
            staged_path: normalizePath(
                path.relative(printOutputRoot, outputPath)
            ),
            staged_width_px: outputInfo.width,
            staged_height_px: outputInfo.height,
            staged_size_bytes: outputInfo.size,
            staged_format: outputInfo.format,
            display_width_in: round(display.width),
            display_height_in: round(display.height),
            effective_ppi: round(effectivePpi, 1),
            enlarged:
                outputInfo.width > oriented.width ||
                outputInfo.height > oriented.height,
            metadata_policy: "auto-oriented; sRGB; metadata stripped",
            output_policy: "JPEG quality 95; 4:4:4 chroma",
            owners: new Set([owner]),
            provenance,
            relativeSource: `../print-assets/${normalizePath(
                path.relative(printAssetDirectory, outputPath)
            )}`,
        };
        stagedImageCache.set(cacheKey, record);
        imageManifest.push(record);
        return record;
    }

    async function stageCollectionPhoto(photo, role, owner) {
        const resolved = await resolveCollectionSource(photo);
        return stageImage({
            sourcePath: resolved.path,
            sourceResolution: resolved.resolution,
            role,
            publicationName: photo.publication_name,
            owner,
            provenance: {
                type:
                    photo.kind === "nursery-label"
                        ? "nursery-label-evidence"
                        : "owner-collection-photo",
                captured_on: photo.captured_on ?? photo.provided_on ?? null,
                view: photo.view ?? null,
                image_id: photo.image_id ?? null,
                page_url: photo.page_url ?? null,
                copyright: "© Nick, all rights reserved",
            },
        });
    }

    async function stageReferencePhoto(photo, owner, role = "reference") {
        const sourcePath = path.resolve(repositoryRoot, photo.file);
        if (
            !pathInside(repositoryRoot, sourcePath) ||
            !(await pathExists(sourcePath))
        ) {
            throw new Error(`Missing licensed reference image: ${photo.file}`);
        }
        return stageImage({
            sourcePath,
            sourceResolution: "licensed-reference-archive",
            role,
            publicationName: path.basename(photo.file),
            owner,
            provenance: {
                type: "licensed-reference-photo",
                subject: photo.subject,
                title: photo.title,
                author: photo.author,
                source: photo.source,
                source_url: photo.source_url,
                license: photo.license,
                license_url: photo.license_url,
            },
        });
    }

    async function selectReferences(profile) {
        const withDimensions = await Promise.all(
            profile.allPhotos.map(async (photo) => {
                const sourcePath = path.resolve(repositoryRoot, photo.file);
                const metadata = await sourceMetadata(sourcePath);
                const oriented = orientedDimensions(metadata);
                return {
                    photo,
                    pixels: oriented.width * oriented.height,
                    shortSide: Math.min(oriented.width, oriented.height),
                };
            })
        );
        withDimensions.sort(
            (left, right) =>
                (referenceSubjectOrder.get(left.photo.subject) ?? 99) -
                    (referenceSubjectOrder.get(right.photo.subject) ?? 99) ||
                right.pixels - left.pixels
        );

        const selected = [];
        const subjects = new Set();
        for (const candidate of withDimensions) {
            if (
                candidate.shortSide < 600 ||
                subjects.has(candidate.photo.subject)
            ) {
                continue;
            }
            selected.push(candidate);
            subjects.add(candidate.photo.subject);
            if (selected.length === 4) break;
        }
        for (const candidate of withDimensions.sort(
            (a, b) => b.pixels - a.pixels
        )) {
            if (
                selected.length === 4 ||
                selected.includes(candidate) ||
                candidate.shortSide < 600
            ) {
                continue;
            }
            selected.push(candidate);
        }
        return selected.map((candidate) => candidate.photo);
    }

    function imageElement(asset, alt, className = "") {
        return `<img class="${escapeHtml(className)}" src="${escapeHtml(
            asset.relativeSource
        )}" alt="${escapeHtml(alt)}" style="--image-width: ${asset.display_width_in}in; --image-height: ${asset.display_height_in}in" data-print-image="${escapeHtml(
            asset.id
        )}">`;
    }

    function photoCard({ asset, photo, variant = "collection" }) {
        const date = photo.captured_on ?? photo.provided_on;
        const attribution =
            variant === "reference"
                ? `${photo.author} · ${photo.license} · ${photo.source}`
                : variant === "label"
                  ? `Seller evidence · ${readableDate(date)}`
                  : `© Nick, all rights reserved · ${readableDate(date)}`;
        return `<figure class="print-photo print-photo--${escapeHtml(variant)}">
            <div class="print-photo__image">${imageElement(
                asset,
                photo.alt ?? photo.title ?? photo.caption,
                "print-photo__raster"
            )}</div>
            <figcaption>
                <strong>${escapeHtml(photo.caption ?? photo.title)}</strong>
                <span>${escapeHtml(attribution)}</span>
                ${photo.view ? `<small>${escapeHtml(photo.view.replaceAll("-", " "))}</small>` : ""}
            </figcaption>
        </figure>`;
    }

    const overviewAssets = [];
    for (const photo of collectionManifest.collection_overviews) {
        overviewAssets.push({
            photo,
            asset: await stageCollectionPhoto(
                photo,
                "overview",
                "front-matter"
            ),
        });
    }
    const jacketAssets = {
        front: await stageCollectionPhoto(
            collectionManifest.collection_overviews[2],
            "jacket-front",
            "dust-jacket"
        ),
        back: await stageCollectionPhoto(
            collectionManifest.collection_overviews[1],
            "jacket-back",
            "dust-jacket"
        ),
        flap: await stageCollectionPhoto(
            collectionManifest.collection_overviews[0],
            "jacket-flap",
            "dust-jacket"
        ),
    };

    const preparedProfiles = [];
    let completedProfiles = 0;
    for (const profile of profiles) {
        const collectionPhotos = uniquePhotos(
            [...profile.collectionRecord.photos]
                .filter((photo) => photo.kind === "collection")
                .sort(compareCollectionPhotos)
        );
        const plantSpecificPhotos = collectionPhotos.filter(
            (photo) => !["context", "overview"].includes(photo.view)
        );
        const printCollectionPhotos = plantSpecificPhotos.length
            ? [
                  ...plantSpecificPhotos,
                  ...collectionPhotos.filter(
                      (photo) => !plantSpecificPhotos.includes(photo)
                  ),
              ]
            : collectionPhotos;
        const labelPhotos = uniquePhotos(
            profile.collectionRecord.photos
                .filter((photo) => photo.kind === "nursery-label")
                .sort(compareCollectionPhotos)
        );
        const referencePhotos = await selectReferences(profile);
        const heroCollectionPhoto = printCollectionPhotos[0];
        const heroReferencePhoto = referencePhotos[0];
        const heroPhoto = heroCollectionPhoto ?? heroReferencePhoto;
        const heroAsset = heroCollectionPhoto
            ? await stageCollectionPhoto(
                  heroCollectionPhoto,
                  "hero",
                  profile.slug
              )
            : heroReferencePhoto
              ? await stageReferencePhoto(
                    heroReferencePhoto,
                    profile.slug,
                    "hero"
                )
              : null;

        const stagedCollectionPhotos = [];
        for (const photo of printCollectionPhotos) {
            stagedCollectionPhotos.push({
                photo,
                asset: await stageCollectionPhoto(
                    photo,
                    "collection",
                    profile.slug
                ),
            });
        }
        const stagedLabelPhotos = [];
        for (const photo of labelPhotos) {
            stagedLabelPhotos.push({
                photo,
                asset: await stageCollectionPhoto(photo, "label", profile.slug),
            });
        }
        const stagedReferencePhotos = [];
        for (const photo of referencePhotos) {
            stagedReferencePhotos.push({
                photo,
                asset: await stageReferencePhoto(photo, profile.slug),
            });
        }
        const qrSvg = await QRCode.toString(
            `${publicBookletUrl}#${profile.slug}`,
            {
                type: "svg",
                errorCorrectionLevel: "M",
                margin: 0,
                width: 384,
                color: { dark: "#17382b", light: "#fffdf7" },
            }
        );

        preparedProfiles.push({
            profile,
            heroPhoto,
            heroAsset,
            stagedCollectionPhotos,
            stagedLabelPhotos,
            stagedReferencePhotos,
            qrSvg,
        });
        completedProfiles += 1;
        console.log(
            `[print-book] Prepared ${completedProfiles}/${profiles.length}: ${profile.title}`
        );
    }

    const tocRows = preparedProfiles.map(
        ({ profile }) => `<li>
        <span class="toc-id">${escapeHtml(profile.trackerId ?? "—")}</span>
        <span><strong>${escapeHtml(profile.title)}</strong><em>${escapeHtml(
            stripMarkdown(profile.scientificMarkdown)
        )}</em></span>
        <span class="toc-label" title="${escapeHtml(stripMarkdown(profile.labelMarkdown))}">${escapeHtml(profile.drawerLabel.primary)}</span>
    </li>`
    );

    function renderFrontMatter() {
        const [primaryOverview, ...remainingOverviews] = overviewAssets;
        const tocPages = chunks(tocRows, 12)
            .map(
                (
                    rows,
                    index
                ) => `<section class="sheet sheet--safe front-matter toc-sheet" data-page-type="contents">
                    <div class="page-ghost">${String(index + 1).padStart(2, "0")}</div>
                    <header class="front-matter__header"><p class="folio-kicker">Field guide index · ${index + 1} of ${Math.ceil(tocRows.length / 12)}</p><h1>Contents</h1><span>Inventory, identity, and permanent-label cross-reference</span></header>
                    <ol>${rows.join("\n")}</ol>
                </section>`
            )
            .join("\n");
        const overviewPages = remainingOverviews
            .map(
                (
                    { photo, asset },
                    index
                ) => `<section class="sheet sheet--full overview-sheet" data-page-type="collection-overview">
                    ${imageElement(asset, photo.alt, "overview-sheet__image")}
                    <div class="overview-sheet__caption">
                        <p>Collection view ${index + 2} of ${overviewAssets.length}</p>
                        <h1>${escapeHtml(photo.caption)}</h1>
                        <span>${readableDate(photo.captured_on)} · © Nick, all rights reserved</span>
                    </div>
                </section>`
            )
            .join("\n");
        return `<section class="sheet sheet--full half-title" data-page-type="cover-title">
            ${imageElement(primaryOverview.asset, primaryOverview.photo.alt, "half-title__image")}
            <div class="half-title__veil"></div>
            <div class="half-title__copy">
                <p>Nick's indoor garden · Fenton, Michigan</p>
                <h1>The Fenton<br>Collection</h1>
                <span>A photographic field guide to cactus, succulent, and houseplant personalities</span>
            </div>
        </section>
        <section class="sheet sheet--safe front-matter colophon-sheet" data-page-type="colophon">
            <div class="page-ghost">01</div>
            <div>
                <p class="folio-kicker">Private printer's proof</p>
                <h1>The Fenton Collection</h1>
                <p>This premium-color edition was generated on ${generatedOn} from the maintained plant profiles and the highest-quality local photograph sources available for each record.</p>
            </div>
            <div class="colophon-grid">
                <p><strong>Collection photographs</strong><br>© Nick. All rights reserved. They are printed as dated collection evidence, not offered for reuse.</p>
                <p><strong>Reference photographs</strong><br>Credited beside each image under the source license recorded in the archive.</p>
                <p><strong>Botanical confidence</strong><br>Nursery labels and visual identifications remain evidence rather than proof. Probable, cf., hybrid, and historical qualifiers are intentionally preserved.</p>
                <p><strong>Print specification</strong><br>US Letter portrait · premium color · 80# coated white · linen-wrap hardcover with matte dust jacket.</p>
            </div>
            <p class="small-print">Local inspection edition. No Lulu upload or publication has occurred.</p>
        </section>
        <section class="sheet sheet--safe front-matter title-sheet" data-page-type="title-manifesto">
            <div class="page-ghost">FIELD<br>NOTES</div>
            <p class="folio-kicker">The field guide</p>
            <h1>The plants as they are,<br><em>and as they may become.</em></h1>
            <p class="title-deck">Thirty-five present collection records and one retained historical profile, joined to practical care notes, original label evidence, dated growth photography, and licensed views of mature plants, flowers, fruit, and habitat.</p>
            <div class="edition-stamp"><strong>First print proof</strong><span>September 2026</span></div>
        </section>
        <section class="sheet sheet--safe front-matter how-to-sheet" data-page-type="how-to">
            <div class="page-ghost">04</div>
            <p class="folio-kicker">How to read this book</p>
            <h1>Evidence first</h1>
            <div class="how-to-grid">
                <article><span>01</span><h2>Collection record</h2><p>Inventory and Google Sheets IDs connect each printed profile to the maintained logger.</p></article>
                <article><span>02</span><h2>Identity</h2><p>Accepted names, seller wording, alternatives, and confidence qualifiers remain visibly separate.</p></article>
                <article><span>03</span><h2>Care</h2><p>Light, water, temperature, and feeding numbers are practical starting ranges—not fixed calendars.</p></article>
                <article><span>04</span><h2>Photography</h2><p>Owner photographs document this collection. Licensed photographs show species context and retain their credit.</p></article>
            </div>
            <p class="how-to-note">Scan the QR code in a profile to open its live field-guide entry and current linked records.</p>
        </section>
        ${tocPages}
        ${overviewPages}`;
    }

    function renderGroupOpener(group, groupProfiles) {
        return `<section class="sheet sheet--full group-opener group-opener--${escapeHtml(group.key)}" data-page-type="group-opener" data-recto-id="group-${escapeHtml(group.key)}" data-recto-title="${escapeHtml(group.title)}" data-recto-eyebrow="Next chapter" data-recto-theme="${escapeHtml(group.key)}">
            <span class="recto-audit-marker">RECTO-ID-GROUP-${escapeHtml(group.key.toUpperCase())}</span>
            <div class="group-opener__number">${String(
                groups.findIndex((candidate) => candidate.key === group.key) + 1
            ).padStart(2, "0")}</div>
            <div class="group-opener__copy">
                <p>${escapeHtml(group.eyebrow)}</p>
                <h1>${escapeHtml(group.title)}</h1>
                <span>${escapeHtml(group.description)}</span>
                <strong>${groupProfiles.length} ${groupProfiles.length === 1 ? "profile" : "profiles"}</strong>
            </div>
        </section>`;
    }

    function renderProfile(prepared, ordinal) {
        const {
            profile,
            heroPhoto,
            heroAsset,
            stagedCollectionPhotos,
            stagedLabelPhotos,
            stagedReferencePhotos,
            qrSvg,
        } = prepared;
        const heroIsReference =
            !profile.collectionRecord.photos.includes(heroPhoto);
        const heroAttribution = heroPhoto
            ? heroIsReference
                ? `${heroPhoto.author} · ${heroPhoto.license} · species-reference photograph`
                : `${readableDate(heroPhoto.captured_on ?? heroPhoto.provided_on)} · collection photograph © Nick`
            : "Photograph pending";
        const acquisitionLabel = profile.orderedFromHtml
            ? "Ordered from"
            : "Acquired from";
        const acquisitionValue =
            profile.orderedFromHtml || profile.acquiredFromHtml;
        const { sections, sources } = splitProfileSections(profile.bodyHtml);
        const editorialPages = paginateProfileSections(sections);
        const collectionPageGroups = balancedChunks(stagedCollectionPhotos, 3);
        const labelPageGroups = balancedChunks(stagedLabelPhotos, 2);
        const collectionSheets = collectionPageGroups
            .map(
                (
                    items,
                    index
                ) => `<section class="sheet sheet--safe photo-sheet photo-sheet--collection photo-sheet--${escapeHtml(profile.group)}" data-page-type="collection-gallery" data-profile-page="${escapeHtml(profile.slug)}:collection:${index + 1}">
                    <div class="page-ghost">${String(ordinal).padStart(2, "0")}</div>
                    <header><p>Collection record · ${escapeHtml(profile.trackerId ?? profile.inventoryId)}</p><h1>${escapeHtml(profile.title)} <em>in this collection</em></h1><span>${index + 1} / ${collectionPageGroups.length}</span></header>
                    <div class="photo-sheet__grid photo-sheet__grid--${items.length}">${items
                        .map(({ photo, asset }) => photoCard({ photo, asset }))
                        .join("\n")}</div>
                </section>`
            )
            .join("\n");
        const labelSheets = labelPageGroups
            .map((items, index) => {
                const pairedLandscapeLabels =
                    items.length === 2 &&
                    items.every(
                        ({ asset }) =>
                            asset.staged_width_px / asset.staged_height_px >=
                            1.1
                    );
                return `<section class="sheet sheet--safe photo-sheet photo-sheet--label${pairedLandscapeLabels ? " photo-sheet--label-landscape" : ""} photo-sheet--${escapeHtml(profile.group)}" data-page-type="nursery-label-evidence" data-profile-page="${escapeHtml(profile.slug)}:label:${index + 1}">
                    <div class="page-ghost">LABEL</div>
                    <header><p>Original identification evidence</p><h1>${escapeHtml(profile.title)} <em>nursery label</em></h1><span>${index + 1} / ${labelPageGroups.length}</span></header>
                    <div class="label-grid label-grid--${items.length}">${items
                        .map(({ photo, asset }) =>
                            photoCard({ photo, asset, variant: "label" })
                        )
                        .join("\n")}</div>
                    <div class="evidence-note"><strong>Evidence boundary</strong><span>Seller wording is retained exactly as evidence. It does not, by itself, establish the botanical identification.</span></div>
                </section>`;
            })
            .join("\n");
        const editorialSheets = editorialPages
            .map(
                (
                    pageSections,
                    index
                ) => `<section class="sheet sheet--safe editorial-sheet editorial-sheet--${escapeHtml(profile.group)}" data-page-type="profile-notes" data-profile-page="${escapeHtml(profile.slug)}:notes:${index + 1}">
                    <svg class="editorial-sheet__portrait" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="../print-assets/plant-icons.svg#icon-plant-${escapeHtml(profile.slug)}" width="24" height="24"></use></svg>
                    <div class="page-ghost">${String(ordinal).padStart(2, "0")}</div>
                    <header class="folio-header"><p>${escapeHtml(profile.groupTitle)} · ${escapeHtml(profile.trackerId ?? profile.inventoryId)}</p><h1>${escapeHtml(profile.title)}</h1><span>Field notes · ${index + 1} / ${editorialPages.length}</span></header>
                    <div class="editorial-grid editorial-grid--${pageSections.length}">${pageSections
                        .map(
                            (section) =>
                                `<section class="editorial-card${section.hasTable ? " editorial-card--table" : ""}">${section.html}</section>`
                        )
                        .join("\n")}</div>
                    <footer class="folio-footer"><span>${escapeHtml(stripMarkdown(profile.scientificMarkdown))}</span><span>${String(ordinal).padStart(2, "0")}</span></footer>
                </section>`
            )
            .join("\n");
        const sourcesHtml =
            sources?.html ??
            "<h2>Sources</h2><p>No source list is recorded for this profile.</p>";
        const referenceSheet = `<section class="sheet sheet--safe photo-sheet context-sheet context-sheet--${escapeHtml(profile.group)}" data-page-type="licensed-context" data-profile-page="${escapeHtml(profile.slug)}:context">
            <div class="page-ghost">CONTEXT</div>
            <header><p>Licensed species context</p><h1>${escapeHtml(profile.title)} <em>beyond the pot</em></h1><span>${stagedReferencePhotos.length || "—"} views</span></header>
            ${
                stagedReferencePhotos.length
                    ? `<div class="reference-grid reference-grid--${stagedReferencePhotos.length}">${stagedReferencePhotos
                          .map(({ photo, asset }) =>
                              photoCard({ photo, asset, variant: "reference" })
                          )
                          .join("\n")}</div>`
                    : `<div class="context-empty"><strong>Collection evidence only</strong><p>No licensed reference set is archived for this mixed or unresolved record. The collection photographs and retained wording remain the appropriate evidence.</p></div>`
            }
            <div class="context-footer">
                <div class="evidence-note"><strong>Context, not proof</strong><span>These photographs show taxon or horticultural context; they do not prove this collection plant's identification.</span></div>
                <div class="context-sources">${sourcesHtml}</div>
            </div>
        </section>`;

        return `<article class="print-profile" id="${escapeHtml(profile.slug)}" data-profile="${escapeHtml(profile.slug)}">
            <section class="sheet sheet--full profile-opener profile-opener--${escapeHtml(profile.group)}" data-page-type="profile-opener" data-recto-id="profile-${String(ordinal).padStart(2, "0")}" data-recto-title="${escapeHtml(profile.title)}" data-recto-eyebrow="Plant ${String(ordinal).padStart(2, "0")} · ${escapeHtml(profile.groupTitle)}" data-recto-theme="${escapeHtml(profile.group)}">
                <span class="recto-audit-marker">RECTO-ID-PROFILE-${String(ordinal).padStart(2, "0")}</span>
                ${heroAsset ? imageElement(heroAsset, heroPhoto?.alt ?? heroPhoto?.title ?? profile.title, "profile-opener__image") : ""}
                <div class="profile-opener__veil"></div>
                <div class="profile-opener__sequence">Plant ${String(ordinal).padStart(2, "0")} / ${profiles.length}</div>
                <div class="profile-opener__copy">
                    <div class="profile-badges"><span>${escapeHtml(profile.inventoryId)}</span>${profile.trackerId ? `<span>${escapeHtml(profile.trackerId)}</span>` : ""}<span>${escapeHtml(stripMarkdown(profile.labelMarkdown))}</span></div>
                    <p>${profile.scientificHtml}</p>
                    <h1>${escapeHtml(profile.title)}</h1>
                    <small>${escapeHtml(heroAttribution)}</small>
                </div>
            </section>
            <section class="sheet sheet--full record-sheet record-sheet--${escapeHtml(profile.group)}" data-page-type="profile-record" data-profile-page="${escapeHtml(profile.slug)}:record">
                ${heroAsset ? imageElement(heroAsset, heroPhoto?.alt ?? profile.title, "record-sheet__image") : ""}
                <div class="record-sheet__veil"></div>
                <div class="record-sheet__panel">
                    <header class="profile-record">
                        <div><p class="folio-kicker">Plant ${String(ordinal).padStart(2, "0")} · ${escapeHtml(profile.groupTitle)}</p><h1>${escapeHtml(profile.title)}</h1><p class="profile-record__scientific">${profile.scientificHtml}</p></div>
                        <div class="profile-record__qr">${qrSvg}<span>Open live profile</span></div>
                    </header>
                    <dl class="profile-facts">
                        <div class="fact--record"><dt>Collection record</dt><dd>${escapeHtml(profile.inventoryId)}</dd></div>
                        <div class="fact--sheets"><dt>Google Sheets ID</dt><dd>${escapeHtml(profile.trackerId ?? "Historical record")}</dd></div>
                        <div class="fact--label"><dt>Permanent label</dt><dd>${profile.labelHtml}</dd></div>
                        <div class="fact--identity"><dt>Identification</dt><dd>${profile.identificationHtml}</dd></div>
                        <div class="fact--status"><dt>Status</dt><dd>${profile.statusHtml}</dd></div>
                        ${acquisitionValue ? `<div class="fact--source"><dt>${acquisitionLabel}</dt><dd>${acquisitionValue}</dd></div>` : ""}
                        ${profile.acquiredOnHtml ? `<div class="fact--date"><dt>Acquired on</dt><dd>${profile.acquiredOnHtml}</dd></div>` : ""}
                    </dl>
                    <div class="profile-intro">
                        <aside><p class="folio-kicker">Look for</p><p>${profile.visualDescriptionHtml}</p></aside>
                        <aside><p class="folio-kicker">A notable detail</p><p>${profile.interestingFactHtml}</p></aside>
                    </div>
                    <footer><span>${escapeHtml(heroAttribution)}</span><strong>${String(ordinal).padStart(2, "0")}</strong></footer>
                </div>
            </section>
            ${editorialSheets}
            ${collectionSheets}
            ${labelSheets}
            ${referenceSheet}
        </article>`;
    }

    const groupHtml = groups
        .map((group) => {
            const groupPreparedProfiles = preparedProfiles.filter(
                ({ profile }) => profile.group === group.key
            );
            return `${renderGroupOpener(
                group,
                groupPreparedProfiles
            )}\n${groupPreparedProfiles
                .map((profile) =>
                    renderProfile(
                        profile,
                        preparedProfiles.indexOf(profile) + 1
                    )
                )
                .join("\n")}`;
        })
        .join("\n");

    const html = `<!doctype html>
<html lang="en" data-print-ready="false">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>The Fenton Collection · Lulu print proof</title>
    <link rel="stylesheet" href="print-book.css">
</head>
<body>
    <main>${renderFrontMatter()}${groupHtml}<section class="sheet sheet--safe end-sheet" data-page-type="closing"><div class="page-ghost">∞</div><p class="folio-kicker">End of first print proof</p><h1>Keep observing.</h1><p>The live collection records continue beyond this edition. New measurements, photographs, flowers, losses, corrections, and identification evidence belong in the maintained logger and field guide before a future print proof is made.</p><span>Fenton, Michigan · September 2026</span></section></main>
    <script src="print-book.js"></script>
</body>
</html>`;

    await Promise.all([
        writeFile(
            path.join(printInteriorDirectory, "index.html"),
            html,
            "utf8"
        ),
        copyFile(
            path.join(printSourceDirectory, "print-book.css"),
            path.join(printInteriorDirectory, "print-book.css")
        ),
        copyFile(
            path.join(printSourceDirectory, "print-book.js"),
            path.join(printInteriorDirectory, "print-book.js")
        ),
        copyFile(
            path.join(
                repositoryRoot,
                "docs",
                "plant-booklet",
                "plant-icons.svg"
            ),
            path.join(printAssetDirectory, "plant-icons.svg")
        ),
    ]);

    const manifest = {
        schema_version: 1,
        generated_on: generatedOn,
        generator: "scripts/build-print-book.mjs",
        local_only: true,
        print_spec: {
            ...PRINT_SPEC,
            planned_inside_margin_in: totalInsideMarginIn(300),
        },
        counts: {
            profiles: profiles.length,
            present_profiles: profiles.filter((profile) => !profile.historical)
                .length,
            historical_profiles: profiles.filter(
                (profile) => profile.historical
            ).length,
            collection_manifest_placements: collectionManifest.plants.reduce(
                (sum, plant) => sum + plant.photos.length,
                0
            ),
            staged_image_variants: imageManifest.length,
        },
        profiles: preparedProfiles.map(
            ({
                profile,
                stagedCollectionPhotos,
                stagedLabelPhotos,
                stagedReferencePhotos,
            }) => ({
                slug: profile.slug,
                title: profile.title,
                group: profile.group,
                inventory_id: profile.inventoryId,
                tracker_id: profile.trackerId ?? null,
                historical: profile.historical,
                collection_photos_printed: stagedCollectionPhotos.length,
                nursery_labels_printed: stagedLabelPhotos.length,
                licensed_references_printed: stagedReferencePhotos.length,
            })
        ),
        jacket_assets: Object.fromEntries(
            Object.entries(jacketAssets).map(([position, asset]) => [
                position,
                {
                    id: asset.id,
                    staged_path: asset.staged_path,
                    effective_ppi: asset.effective_ppi,
                },
            ])
        ),
        images: imageManifest.map(({ owners, relativeSource, ...record }) => ({
            ...record,
            owners: [...owners].sort(),
        })),
    };
    await writeFile(
        path.join(printOutputRoot, "print-manifest.json"),
        `${JSON.stringify(manifest, null, 2)}\n`,
        "utf8"
    );

    console.log(
        `[print-book] Built local print source with ${profiles.length} profiles and ${imageManifest.length} staged image variants.`
    );
}

await main();
