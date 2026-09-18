import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
    getEquipmentDocs,
    getGuides,
    getProfiles,
} from "../site/lib/content.mjs";
import { getReports } from "../site/lib/reports.mjs";
import { isRecord } from "./build-data.mjs";
import parser from "./html-eslint-parser.mjs";

/** @typedef {{ slug: string; title: string }} ProfileIdentity */
/** @typedef {{ filename: string; html: string; relative: string }} PublishedPage */
const root = fileURLToPath(new URL("..", import.meta.url));
const output = path.join(root, ".pages-site");
const publicBase = "/Gardening/";

/** @param {PublishedPage[]} pages */
async function assertLocalLinks(pages) {
    /** @type {Map<string, string>} */
    const targets = new Map();
    for (const page of pages) {
        for (const href of localReferences(page.html)) {
            const target = resolvePublicTarget(href);
            if (target !== undefined)
                targets.set(target, `${page.relative}: ${href}`);
        }
    }
    await Promise.all(
        targets
            .entries()
            .map(([filename, context]) => assertTargetExists(filename, context))
    );
}

/** @param {string} html @param {string} context */
function assertPageMarkup(html, context) {
    assert.ok(
        !html.includes("data-booklet-page"),
        `${context}: retired reader markup`
    );
    assert.ok(
        !/C:\\(?:Repos|Users)\\|\.private-photo-sources|private-source-map|file:\/\//v.test(
            html
        ),
        `${context}: private source path`
    );
    const isRedirect = /<meta\s+name=["']gardening-redirect["']/v.test(html);
    assert.equal(
        (html.match(/GTM-T8J6HPLF/gv) ?? []).length,
        isRedirect ? 0 : 2,
        `${context}: analytics installation count`
    );
    if (!isRedirect)
        assert.ok(
            html.includes('id="site-nav"') && html.includes('id="main"'),
            `${context}: missing shared navigation or main landmark`
        );
    const ids = attributes(html)
        .filter((attribute) => attribute.name.toLowerCase() === "id")
        .map((attribute) => attribute.value);
    const uniqueIds = new Set(ids);
    assert.equal(ids.length, uniqueIds.size, `${context}: duplicate HTML IDs`);
}

/** @param {ProfileIdentity[]} profiles @param {Map<string, string>} profilePages */
function assertProfileCoverage(profiles, profilePages) {
    const slugs = new Set(profiles.map((profile) => profile.slug));
    assert.equal(
        slugs.size,
        profiles.length,
        "Duplicate profile identity in source inventory."
    );
    assert.equal(
        profilePages.size,
        slugs.size,
        "Published profile count differs from source inventory."
    );
    for (const profile of profiles) {
        const html = profilePages.get(profile.slug);
        assert.ok(html !== undefined, `Missing profile page: ${profile.slug}`);
        assert.ok(
            html.includes(`id="${profile.slug}"`),
            `Profile identity missing: ${profile.slug}`
        );
        assert.ok(
            html.includes(profile.title.replaceAll("&", "&amp;")),
            `Profile title missing: ${profile.slug}`
        );
        const embedded = attributes(html)
            .filter((attribute) => attribute.name.toLowerCase() === "id")
            .map((attribute) => attribute.value)
            .filter((id) => slugs.has(id));
        assert.deepEqual(
            embedded,
            [profile.slug],
            `Unrelated full profile embedded in ${profile.slug}`
        );
    }
}

/** @param {string} filename @param {string} context */
async function assertTargetExists(filename, context) {
    let metadata;
    try {
        metadata = await stat(filename);
    } catch (error) {
        throw new Error(`Missing local target: ${context}`, { cause: error });
    }
    if (metadata.isDirectory()) {
        const index = await stat(path.join(filename, "index.html"));
        assert.ok(index.isFile(), `Missing directory index: ${context}`);
    } else assert.ok(metadata.isFile(), `Not a public file: ${context}`);
}

/** @param {string} html @returns {{name: string; value: string}[]} */
function attributes(html) {
    const { ast } = parser.parseForESLint(html);
    /** @type {unknown[]} */
    const pending = [...ast.body];
    /** @type {{ name: string; value: string }[]} */
    const result = [];
    let cursor = 0;
    while (cursor < pending.length) {
        const node = pending[cursor];
        cursor += 1;
        if (!isRecord(node)) throw new Error("Invalid HTML parser node.");
        if (isNodeArray(node["attributes"])) {
            result.push(
                ...node["attributes"]
                    .map((attribute) => readAttribute(attribute))
                    .filter((attribute) => attribute !== undefined)
            );
        }
        if (isNodeArray(node["children"])) pending.push(...node["children"]);
    }
    return result;
}

/** @param {string} directory @returns {Promise<string[]>} */
async function htmlFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const groups = await Promise.all(
        entries
            .filter((entry) => entry.name !== "storybook")
            .map(async (entry) => {
                const filename = path.join(directory, entry.name);
                assert.ok(
                    !entry.isSymbolicLink(),
                    `Unexpected publication symlink: ${filename}`
                );
                if (entry.isDirectory()) return htmlFiles(filename);
                return entry.isFile() && entry.name.endsWith(".html")
                    ? [filename]
                    : [];
            })
    );
    return groups.flat();
}

/** @param {string} html @returns {string[]} */
function localReferences(html) {
    return attributes(html)
        .flatMap((attribute) => {
            const name = attribute.name.toLowerCase();
            const value = attribute.value;
            if (name === "href" || name === "src") return [value];
            if (name === "srcset")
                return value
                    .split(",")
                    .map((variant) => variant.trim().split(/\s/v, 1)[0] ?? "");
            return [];
        })
        .filter((reference) => reference.startsWith(publicBase));
}

async function main() {
    const [
        profiles,
        guides,
        equipment,
        reports,
    ] = await Promise.all([
        getProfiles(),
        getGuides(),
        getEquipmentDocs(),
        getReports(),
    ]);
    const pots = new Set(
        profiles
            .map((profile) => profile.trackerId)
            .filter((id) => id !== undefined)
    );
    const required = [
        "index.html",
        "404.html",
        "plants/index.html",
        "photos/index.html",
        "tracker/index.html",
        "report/index.html",
        "reports/index.html",
        "guides/index.html",
        "setup/index.html",
        "setup/placement/index.html",
        "setup/equipment/index.html",
        "setup/archive/index.html",
        "setup/archive/calendar/index.html",
        "setup/archive/layout/index.html",
        "search/index.html",
        "search-index.json",
        "sitemap.xml",
        ...profiles.map((profile) => `plants/${profile.slug}/index.html`),
        ...pots.values().map((id) => `pots/${id}/index.html`),
        ...guides.map((doc) => `guides/${doc.slug}/index.html`),
        ...equipment.map((doc) => `setup/equipment/${doc.slug}/index.html`),
        ...reports.map((report) => `reports/${report.date}/index.html`),
    ];
    await Promise.all(
        required.map((filename) =>
            assertTargetExists(path.join(output, filename), filename)
        )
    );
    const filenames = await htmlFiles(output);
    const pages = await Promise.all(
        filenames.map(async (filename) => ({
            filename,
            html: await readFile(filename, "utf8"),
            relative: path.relative(output, filename).replaceAll("\\", "/"),
        }))
    );
    for (const page of pages) assertPageMarkup(page.html, page.relative);
    await assertLocalLinks(pages);
    const profilePages = new Map(
        pages
            .filter((page) =>
                /^plants\/[^\/]+\/index\.html$/v.test(page.relative)
            )
            .map((page) => [page.relative.split("/", 2)[1] ?? "", page.html])
    );
    assertProfileCoverage(profiles, profilePages);
    const homepage = pages.find((page) => page.relative === "index.html")?.html;
    assert.ok(homepage !== undefined, "Missing homepage.");
    assert.ok(
        Buffer.byteLength(homepage) < 150_000,
        "Homepage HTML exceeds 150 KB; keep full profile bodies off the homepage."
    );
    assert.ok(
        !homepage.includes('class="plant-profile"'),
        "Homepage includes a full plant profile."
    );
    const totalBytes = pages.reduce(
        (bytes, page) => bytes + Buffer.byteLength(page.html),
        0
    );
    console.log(
        `Verified ${pages.length} HTML pages, ${profiles.length} profiles, ${pots.size} tracked pots, ${reports.length} reports, ${equipment.length} equipment research pages. Homepage ${Buffer.byteLength(homepage).toLocaleString()} bytes; total HTML ${totalBytes.toLocaleString()} bytes.`
    );
}

/**
 * @param {unknown} attribute @returns {{name: string; value: string} |
 *   undefined}
 */
function readAttribute(attribute) {
    if (
        !isRecord(attribute) ||
        !isRecord(attribute["key"]) ||
        typeof attribute["key"]["value"] !== "string"
    )
        return undefined;
    const value = isRecord(attribute["value"])
        ? attribute["value"]["value"]
        : "";
    return {
        name: attribute["key"]["value"],
        value: typeof value === "string" ? value : "",
    };
}

/**
 * Resolve only site-local links. Reject decoded traversal on both POSIX and
 * Windows before resolving, so checks behave the same on the developer PC and
 * CI.
 *
 * @param {string} href
 * @param {string} [directory]
 *
 * @returns {string | undefined}
 */
function resolvePublicTarget(href, directory = output) {
    if (!href.startsWith(publicBase)) return undefined;
    const local = decodeURIComponent(
        href.slice(publicBase.length).split(/[#?]/v, 1)[0] ?? ""
    );
    const segments = local.replaceAll("\\", "/").split("/");
    assert.ok(
        !segments.includes("..") &&
            !path.isAbsolute(local) &&
            !/^[a-z]:/iv.test(local),
        `Path traversal: ${href}`
    );
    if (local === "storybook" || local.startsWith("storybook/"))
        return undefined;
    const candidate = path.resolve(directory, local || "index.html");
    const relative = path.relative(directory, candidate);
    assert.ok(
        relative !== ".." &&
            !relative.startsWith(`..${path.sep}`) &&
            !path.isAbsolute(relative),
        `Path traversal: ${href}`
    );
    return candidate;
}

if (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === import.meta.filename
)
    await main();

export {
    assertPageMarkup,
    assertProfileCoverage,
    localReferences,
    resolvePublicTarget,
};

/** @param {unknown} value @returns {value is unknown[]} */
function isNodeArray(value) {
    return Array.isArray(value);
}
