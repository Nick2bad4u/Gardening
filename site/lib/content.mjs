import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

import {
    compareText,
    isCollectionManifest,
    isNonemptyString,
    readJson,
} from "../../scripts/build-data.mjs";
import {
    compareCollectionPhotosNewestFirst,
    decorateProfileBody,
    inaturalistBySlug,
    loadProfiles,
    stripHtml,
    stripMarkdown,
} from "./content/profile-source.mjs";
import { archivedAmazonPlan } from "./old-plans.mjs";
import { contentUrl } from "./routes.mjs";

const root = process.cwd();
const markdownProcessor = remark().use(remarkGfm).use(remarkHtml);

/**
 * @typedef {Awaited<ReturnType<typeof loadProfiles>>[number] & {
 *     sourcePath: string;
 *     toc: { id: string; title: string; level: number }[];
 *     ownedPhotos: import("../../scripts/build-data.mjs").CollectionPhoto[];
 *     nurseryPhotos: import("../../scripts/build-data.mjs").CollectionPhoto[];
 *     inaturalist: { scope: string; taxon: string } | undefined;
 *     searchText: string;
 * }} SiteProfile
 */

/**
 * Stable section anchors support ordinary links and legacy plant bookmarks.
 *
 * @param {string} text
 */
export function headingSlug(text) {
    return stripHtml(text)
        .toLowerCase()
        .replaceAll(/[^0-9a-z]+/gv, "-")
        .replaceAll(/^-|-$/gv, "");
}

/**
 * Resolve links in the context of their maintained Markdown source.
 *
 * @param {string} markdown
 * @param {string} sourcePath
 * @param {string} [prefix]
 */
export async function renderMarkdown(markdown, sourcePath, prefix = "") {
    const rendered = String(await markdownProcessor.process(markdown));
    /** @type {{ id: string; title: string; level: number }[]} */
    const toc = [];
    /** @type {Map<string, number>} */
    const usedIds = new Map();
    let html = rendered.replaceAll(
        /<h(?<level>[23])>(?<heading>[\s\S]*?)<\/h\k<level>>/gv,
        (
            /** @type {string} */ _match,
            /** @type {string} */ level,
            /** @type {string} */ heading
        ) => {
            const stem = `${prefix}${headingSlug(heading)}`;
            const count = usedIds.get(stem) ?? 0;
            usedIds.set(stem, count + 1);
            const id = count > 0 ? `${stem}-${count + 1}` : stem;
            toc.push({ id, level: Number(level), title: stripHtml(heading) });
            return `<h${level} id="${escapeAttribute(id)}">${heading}</h${level}>`;
        }
    );
    html = html.replaceAll(
        /(?<attribute>href|src)="(?<target>[^"<>]+)"/gv,
        (
            /** @type {string} */ _match,
            /** @type {string} */ attribute,
            /** @type {string} */ target
        ) => {
            if (
                prefix !== "" &&
                target.startsWith("#") &&
                toc.some((item) => item.id === `${prefix}${target.slice(1)}`)
            ) {
                return `${attribute}="#${prefix}${target.slice(1)}"`;
            }
            if (/^(?:https?:|mailto:|tel:|#)/v.test(target))
                return `${attribute}="${target}"`;
            const resolved = path.posix.normalize(
                path.posix.join(path.posix.dirname(sourcePath), target)
            );
            return `${attribute}="${escapeAttribute(contentUrl(resolved))}"`;
        }
    );
    html = html
        .replaceAll(
            "<table>",
            '<div class="table-scroll" tabindex="0" role="region" aria-label="Reference table"><table>'
        )
        .replaceAll("</table>", "</table></div>");
    html = html.replaceAll(
        /<img (?<attributes>[^>]+)>/gv,
        '<img $<attributes> loading="lazy" decoding="async">'
    );
    html = html.replaceAll(
        /<p>(?<image><img src="(?<source>[^"]+)"[^>]*>)<\/p>/gv,
        '<figure class="placement-figure"><a href="$<source>">$<image></a><figcaption>Planning illustration · Open full size</figcaption></figure>'
    );
    return { html, toc };
}

/** @param {string} text */
function escapeAttribute(text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;");
}

const profilesPromise = loadSiteProfiles();

/** Only sanitized public manifest data is read by website rendering. */
export async function getCollectionManifest() {
    return readJson(
        path.join(root, "assets/collection-photos/photo-manifest.json"),
        isCollectionManifest
    );
}

/** @param {string} sourcePath @param {string} [slug] */
export async function getDocument(
    sourcePath,
    slug = path.basename(sourcePath, ".md")
) {
    const markdown = await readFile(path.join(root, sourcePath), "utf8");
    const title = /^# (?<title>.+)$/mv
        .exec(markdown)
        ?.groups?.["title"]?.trim();
    if (!isNonemptyString(title))
        throw new Error(`Missing document title: ${sourcePath}`);
    const content = markdown.replace(/^# [^\n]+\n+/v, "");
    const rendered = await renderMarkdown(content, sourcePath);
    const illustrations = markdownProcessor
        .parse(content)
        .children.flatMap((node) => {
            if (node.type !== "paragraph") return [];
            return node.children.flatMap((child) => {
                if (child.type !== "image") return [];
                const target = path.posix.normalize(
                    path.posix.join(path.posix.dirname(sourcePath), child.url)
                );
                if (!target.startsWith("assets/layouts/")) return [];
                return [
                    {
                        alt: child.alt ?? "Planning illustration",
                        src: contentUrl(target),
                    },
                ];
            });
        });
    const description = stripMarkdown(
        content.split(/\r?\n\s*\n/v, 1)[0] ?? ""
    ).slice(0, 240);
    return { description, illustrations, slug, sourcePath, title, ...rendered };
}

export async function getEquipmentDocs() {
    const files = await readdir(path.join(root, "docs/equipment"));
    return Promise.all(
        files
            .filter(
                (file) =>
                    file.endsWith(".md") &&
                    ![
                        "AGENTS.md",
                        "inventory.md",
                        "README.md",
                    ].includes(file)
            )
            .toSorted(compareText)
            .map((file) => getDocument(`docs/equipment/${file}`))
    );
}

/** Public care references are an explicit allowlist, not the complete docs tree. */
export async function getGuides() {
    /** @type {[string, string][]} */
    const sources = [
        ["docs/watering-strategy.md", "watering-strategy"],
        ["docs/weighing-strategy.md", "weighing-strategy"],
        ["docs/logger-actions.md", "logger-actions"],
        ["docs/care-notes.md", "care-notes"],
        ["docs/plants/labels.md", "labels"],
    ];
    return Promise.all(
        sources.map(([source, slug]) => getDocument(source, slug))
    );
}

/** Explicitly published research from abandoned plans, never active profiles. */
export async function getOldPlans() {
    const sources = [
        archivedAmazonPlan.overview,
        ...archivedAmazonPlan.profiles.map(
            ([slug]) => `${archivedAmazonPlan.folder}/${slug}`
        ),
    ];
    return Promise.all(
        sources.map((slug) => getDocument(`docs/old-plans/${slug}.md`, slug))
    );
}

/**
 * Validated source profiles, with page-specific presentation data.
 *
 * @returns {Promise<SiteProfile[]>}
 */
export async function getProfiles() {
    return profilesPromise;
}

/**
 * @param {{ image_id: string; image_url: string }} photo @param {number}
 *   [width]
 */
export function photoPreview(photo, width = 640) {
    const url = new URL(photo.image_url);
    const extension = path.posix.extname(url.pathname).slice(1);
    return `https://thumb.gyazo.com/thumb/${width}/${photo.image_id}.${extension}`;
}

/** @returns {Promise<SiteProfile[]>} */
async function loadSiteProfiles() {
    const profiles = await loadProfiles();
    return Promise.all(
        profiles.map(async (profile) => {
            const sourcePath = `docs/plants/${profile.sourceDirectory}/${profile.fileName}`;
            const body = await renderMarkdown(
                profile.bodyMarkdown,
                sourcePath,
                `${profile.slug}-`
            );
            const ownedPhotos = profile.collectionRecord.photos
                .filter((photo) => photo.kind === "collection")
                .toSorted(compareCollectionPhotosNewestFirst)
                .slice(0, 2);
            return {
                ...profile,
                bodyHtml: decorateProfileBody(body.html),
                inaturalist: inaturalistBySlug.get(profile.slug),
                nurseryPhotos: profile.collectionRecord.photos.filter(
                    (photo) => photo.kind === "nursery-label"
                ),
                ownedPhotos,
                searchText: stripMarkdown(
                    `${profile.title} ${profile.scientificMarkdown} ${profile.inventoryId} ${profile.trackerId ?? ""} ${profile.labelMarkdown} ${profile.bodyMarkdown.split(/\n## /v, 1)[0] ?? ""}`
                ).toLowerCase(),
                sourcePath,
                toc: body.toc,
            };
        })
    );
}
