import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const bookletDirectory = path.join(repositoryRoot, "docs", "plant-booklet");
const bookletPath = path.join(bookletDirectory, "index.html");
const manifestPath = path.join(
    repositoryRoot,
    "assets",
    "plants",
    "photo-manifest.json"
);
const profileGroups = [
    "starter",
    "cacti",
    "succulents",
    "rehab",
    "houseplants",
];
const allowedSubjects = new Set([
    "young",
    "habit",
    "flower",
    "fruit-seed",
    "habitat",
    "detail",
]);
const allowedLicense =
    /^(?:CC0|CC BY(?: SA|-SA)?|CC BY-SA \d|Public domain|No restrictions)/i;

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function fileHash(filePath) {
    const bytes = await readFile(filePath);
    return createHash("sha256").update(bytes).digest("hex");
}

async function discoverProfiles() {
    const profiles = [];
    for (const group of profileGroups) {
        const directory = path.join(repositoryRoot, "docs", "plants", group);
        for (const fileName of await readdir(directory)) {
            if (!fileName.endsWith(".md")) continue;
            profiles.push({
                slug: path.basename(fileName, ".md"),
                markdown: await readFile(
                    path.join(directory, fileName),
                    "utf8"
                ),
            });
        }
    }
    return profiles.sort((left, right) => left.slug.localeCompare(right.slug));
}

function localReferences(html) {
    return [
        ...html.matchAll(
            /\b(?:href|src)="((?:\.\.?\/)[^"#?]+)(?:[?#][^"]*)?"/g
        ),
    ].map((match) => match[1]);
}

function htmlAttribute(tag, attributeName) {
    const match = tag.match(
        new RegExp(`\\b${attributeName}=(['\"])(.*?)\\1`, "s")
    );
    return match?.[2];
}

async function main() {
    const [
        html,
        clientScript,
        manifest,
        profiles,
    ] = await Promise.all([
        readFile(bookletPath, "utf8"),
        readFile(path.join(bookletDirectory, "booklet.js"), "utf8"),
        readFile(manifestPath, "utf8").then(JSON.parse),
        discoverProfiles(),
    ]);
    const profileSlugs = profiles.map((profile) => profile.slug);

    const pageSlugs = [...html.matchAll(/<article\b[^>]*>/g)]
        .map((match) => match[0])
        .filter((tag) => {
            const classes = htmlAttribute(tag, "class")?.split(/\s+/) ?? [];
            return (
                classes.includes("book-page") &&
                classes.includes("profile-page")
            );
        })
        .map((tag) => htmlAttribute(tag, "id"))
        .filter(Boolean);
    assert(
        pageSlugs.length === profiles.length,
        `Expected ${profiles.length} profile pages; found ${pageSlugs.length}.`
    );
    assert(
        JSON.stringify([...pageSlugs].sort()) === JSON.stringify(profileSlugs),
        "The booklet profile pages do not match the Markdown profile files."
    );

    for (const profile of profiles) {
        const headings = [...profile.markdown.matchAll(/^##\s+(.+)$/gm)].map(
            (match) => match[1].trim()
        );
        const sourceStart = profile.markdown.search(/^## Sources\s*$/m);
        const sourceLinks =
            sourceStart >= 0
                ? [
                      ...profile.markdown
                          .slice(sourceStart)
                          .matchAll(/\]\(https?:\/\/[^)]+\)/g),
                  ]
                : [];

        assert(
            headings.length >= 5,
            `${profile.slug} has only ${headings.length} substantive sections.`
        );
        assert(sourceStart >= 0, `${profile.slug} has no Sources section.`);
        assert(
            sourceLinks.length >= 2,
            `${profile.slug} has fewer than two external research sources.`
        );
        assert(
            headings.some((heading) => /care|rehabilitation/i.test(heading)),
            `${profile.slug} has no care or rehabilitation section.`
        );

        for (const field of [
            "Inventory",
            "Label ID",
            "Identification",
        ]) {
            assert(
                new RegExp(`^- ${field}:\\s*\\S`, "m").test(profile.markdown),
                `${profile.slug} is missing its ${field} metadata.`
            );
        }
    }

    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    assert(
        duplicateIds.length === 0,
        `Duplicate HTML IDs: ${[...new Set(duplicateIds)].join(", ")}`
    );

    const hashTargets = [...html.matchAll(/href="#([^"]+)"/g)].map(
        (match) => match[1]
    );
    const missingHashTargets = hashTargets.filter(
        (target) => !ids.includes(target)
    );
    assert(
        missingHashTargets.length === 0,
        `Missing hash targets: ${[...new Set(missingHashTargets)].join(", ")}`
    );

    const photoRecords = manifest.photos;
    assert(Array.isArray(photoRecords), "Photo manifest has no photos array.");
    const recordsBySlug = Map.groupBy(
        photoRecords,
        (record) => record.plant_slug
    );
    const sourceUrls = new Set();
    const localFiles = new Set();
    const coverageLines = [];

    for (const slug of profileSlugs) {
        const records = recordsBySlug.get(slug) ?? [];
        if (records.length > 0) {
            assert(
                records.length >= 6,
                `${slug} has only ${records.length} archived photos.`
            );
        }
        const subjects = new Set();

        for (const record of records) {
            assert(
                allowedSubjects.has(record.subject),
                `${record.file} has unsupported subject ${record.subject}.`
            );
            assert(
                allowedLicense.test(record.license),
                `${record.file} has unsupported license ${record.license}.`
            );
            assert(
                !sourceUrls.has(record.source_url),
                `Duplicate source URL: ${record.source_url}`
            );
            assert(
                !localFiles.has(record.file),
                `Duplicate local file: ${record.file}`
            );
            sourceUrls.add(record.source_url);
            localFiles.add(record.file);
            subjects.add(record.subject);

            const absolutePath = path.join(repositoryRoot, record.file);
            const fileStats = await stat(absolutePath);
            assert(
                fileStats.size > 1024,
                `${record.file} is unexpectedly small.`
            );
            const hash = await fileHash(absolutePath);
            assert(
                hash === record.sha256,
                `SHA-256 mismatch for ${record.file}.`
            );
        }

        coverageLines.push(
            records.length > 0
                ? `${slug}: ${records.length} photos · ${[...subjects].sort().join(", ")}`
                : `${slug}: 0 photos · archive pending`
        );
    }

    const galleryPhotoCount = (html.match(/class="gallery-photo"/g) ?? [])
        .length;
    assert(
        galleryPhotoCount === photoRecords.length,
        `Expected ${photoRecords.length} gallery figures; found ${galleryPhotoCount}.`
    );

    for (const reference of new Set(localReferences(html))) {
        const absolutePath = path.resolve(bookletDirectory, reference);
        await stat(absolutePath).catch(() => {
            throw new Error(`Broken local booklet reference: ${reference}`);
        });
    }

    for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
        new Function(script[1]);
    }
    new Function(clientScript);

    console.log(
        `Plant booklet verified: ${pageSlugs.length} profiles, ${photoRecords.length} credited photos, ${ids.length} unique IDs.`
    );
    console.log(coverageLines.join("\n"));
}

await main();
