import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import sharp from "sharp";

import {
    printInteriorDirectory,
    printOutputRoot,
} from "./print-book-config.mjs";

const execFileAsync = promisify(execFile);
const ghostscriptExecutable = "C:\\cygwin64\\bin\\gs.exe";
const pdfPath = path.join(
    printInteriorDirectory,
    "fenton-collection-interior.pdf"
);
const paginationPath = path.join(
    printInteriorDirectory,
    "pagination-report.json"
);
const reviewDirectory = path.join(printOutputRoot, "page-review");
const pagesDirectory = path.join(reviewDirectory, "pages");
const textDirectory = path.join(reviewDirectory, "text");
const thumbnailsDirectory = path.join(reviewDirectory, "thumbs");
const contactDirectory = path.join(reviewDirectory, "contact-sheets");
const reportPath = path.join(reviewDirectory, "report.json");
const inspectionPath = path.join(printOutputRoot, "inspection.html");

function pathInside(parent, candidate) {
    const relative = path.relative(parent, candidate);
    return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function round(value, digits = 4) {
    return Number(value.toFixed(digits));
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function normalizeText(value) {
    return value.replaceAll(/\s+/g, " ").trim();
}

function classifyPage(text, pageNumber) {
    if (/RECTO-ID-GROUP-/i.test(text)) return "group-opener";
    if (/RECTO-ID-PROFILE-/i.test(text)) return "profile-opener";
    if (/facing page\./i.test(text)) return "recto-transition";
    if (/The collection continues\./i.test(text)) return "closing-verso";
    if (/Keep observing\./i.test(text)) return "closing";
    if (/Original identification evidence/i.test(text)) {
        return "nursery-label-evidence";
    }
    if (/Licensed species context/i.test(text)) return "licensed-context";
    if (/Field notes\s*[·•]/i.test(text)) return "profile-notes";
    if (
        /Open live/i.test(text) &&
        /Collection record/i.test(text) &&
        /Google Sheets ID/i.test(text)
    ) {
        return "profile-record";
    }
    if (/Collection record/i.test(text) && /in this collection/i.test(text)) {
        return "collection-gallery";
    }
    if (/Collection view \d+ of \d+/i.test(text)) {
        return "collection-overview";
    }
    if (/Field guide index/i.test(text) && /Contents/i.test(text)) {
        return "contents";
    }
    if (/How to read this book/i.test(text)) return "how-to";
    if (/The plants as they are/i.test(text)) return "title-manifesto";
    if (/Private printer['’]s proof/i.test(text)) return "colophon";
    if (pageNumber === 1 && /The Fenton Collection/i.test(text)) {
        return "cover-title";
    }
    return "unclassified";
}

function pageMetrics(data, info) {
    let nearWhite = 0;
    let colorful = 0;
    let dark = 0;
    let luminanceTotal = 0;
    const channels = info.channels;
    const pixels = info.width * info.height;
    for (let offset = 0; offset < data.length; offset += channels) {
        const red = data[offset];
        const green = data[offset + 1];
        const blue = data[offset + 2];
        const maximum = Math.max(red, green, blue);
        const minimum = Math.min(red, green, blue);
        const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
        luminanceTotal += luminance;
        if (red >= 245 && green >= 245 && blue >= 245) nearWhite += 1;
        if (maximum - minimum >= 18 && luminance >= 28 && luminance <= 242) {
            colorful += 1;
        }
        if (luminance < 70) dark += 1;
    }
    return {
        width_px: info.width,
        height_px: info.height,
        near_white_ratio: round(nearWhite / pixels),
        colorful_ratio: round(colorful / pixels),
        dark_ratio: round(dark / pixels),
        mean_luminance: round(luminanceTotal / pixels, 2),
    };
}

function qualityFlags(page) {
    const flags = [];
    if (page.type === "unclassified") flags.push("unclassified");
    if (page.text_characters < 18) flags.push("too-little-text");
    if (page.metrics.near_white_ratio > 0.7) flags.push("too-much-white");
    if (page.metrics.colorful_ratio < 0.08) flags.push("low-color");
    if (page.type === "profile-notes" && page.text_characters < 240) {
        flags.push("sparse-notes");
    }
    return flags;
}

async function sha256File(filePath) {
    const hash = createHash("sha256");
    await new Promise((resolve, reject) => {
        const stream = createReadStream(filePath);
        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("error", reject);
        stream.on("end", resolve);
    });
    return hash.digest("hex");
}

async function resetReviewDirectory() {
    if (!pathInside(printOutputRoot, reviewDirectory)) {
        throw new Error(
            `Refusing to reset out-of-scope review directory: ${reviewDirectory}`
        );
    }
    await rm(reviewDirectory, { recursive: true, force: true });
    await Promise.all(
        [
            pagesDirectory,
            textDirectory,
            thumbnailsDirectory,
            contactDirectory,
        ].map((directory) => mkdir(directory, { recursive: true }))
    );
}

async function renderPages() {
    await execFileAsync(
        ghostscriptExecutable,
        [
            "-dNOSAFER",
            "-dBATCH",
            "-dNOPAUSE",
            "-dQUIET",
            "-sDEVICE=jpeg",
            "-dJPEGQ=88",
            "-r96",
            "-dTextAlphaBits=4",
            "-dGraphicsAlphaBits=4",
            `-sOutputFile=${path.join(pagesDirectory, "page-%03d.jpg")}`,
            pdfPath,
        ],
        { windowsHide: true, timeout: 900_000, maxBuffer: 20 * 1024 * 1024 }
    );
    await execFileAsync(
        ghostscriptExecutable,
        [
            "-dNOSAFER",
            "-dBATCH",
            "-dNOPAUSE",
            "-dQUIET",
            "-sDEVICE=txtwrite",
            `-sOutputFile=${path.join(textDirectory, "page-%03d.txt")}`,
            pdfPath,
        ],
        { windowsHide: true, timeout: 900_000, maxBuffer: 30 * 1024 * 1024 }
    );
}

async function buildContactSheets(pages) {
    const tileWidth = 210;
    const imageHeight = 270;
    const labelHeight = 28;
    const tileHeight = imageHeight + labelHeight;
    const gap = 10;
    const columns = 4;
    const rows = 4;
    const contactFiles = [];

    for (let offset = 0; offset < pages.length; offset += columns * rows) {
        const contactPages = pages.slice(offset, offset + columns * rows);
        const composites = [];
        for (const [index, page] of contactPages.entries()) {
            const thumbnailPath = path.join(
                thumbnailsDirectory,
                `page-${String(page.page).padStart(3, "0")}.jpg`
            );
            const thumbnail = await sharp(path.join(pagesDirectory, page.file))
                .resize({
                    width: tileWidth,
                    height: imageHeight,
                    fit: "contain",
                    background: "#0d1812",
                })
                .jpeg({ quality: 82, mozjpeg: true })
                .toBuffer();
            await writeFile(thumbnailPath, thumbnail);
            const label = Buffer.from(
                `<svg width="${tileWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#102019"/><text x="7" y="11" fill="#f7e9c5" font-family="Arial" font-size="10" font-weight="700">PAGE ${page.page}</text><text x="7" y="23" fill="${page.flags.length ? "#ffbf69" : "#a9c9b2"}" font-family="Arial" font-size="8">${escapeHtml(page.type)}${page.flags.length ? ` · ${escapeHtml(page.flags.join(", "))}` : ""}</text></svg>`
            );
            const tile = await sharp({
                create: {
                    width: tileWidth,
                    height: tileHeight,
                    channels: 3,
                    background: "#102019",
                },
            })
                .composite([
                    { input: thumbnail, left: 0, top: 0 },
                    { input: label, left: 0, top: imageHeight },
                ])
                .jpeg({ quality: 86, mozjpeg: true })
                .toBuffer();
            composites.push({
                input: tile,
                left: gap + (index % columns) * (tileWidth + gap),
                top: gap + Math.floor(index / columns) * (tileHeight + gap),
            });
        }
        const fileName = `contact-${String(
            Math.floor(offset / (columns * rows)) + 1
        ).padStart(2, "0")}.jpg`;
        await sharp({
            create: {
                width: columns * tileWidth + (columns + 1) * gap,
                height: rows * tileHeight + (rows + 1) * gap,
                channels: 3,
                background: "#07110c",
            },
        })
            .composite(composites)
            .jpeg({ quality: 88, mozjpeg: true })
            .toFile(path.join(contactDirectory, fileName));
        contactFiles.push(fileName);
    }
    return contactFiles;
}

function inspectionHtml(report) {
    const cards = report.pages
        .map(
            (
                page
            ) => `<figure class="page-card${page.flags.length ? " page-card--flagged" : ""}" id="page-${page.page}">
            <a href="./page-review/pages/${page.file}"><img src="./page-review/thumbs/page-${String(page.page).padStart(3, "0")}.jpg" alt="Rendered print page ${page.page}"></a>
            <figcaption><strong>Page ${page.page}</strong><span>${escapeHtml(page.type)}</span><small>${page.text_characters} text chars · ${(page.metrics.near_white_ratio * 100).toFixed(1)}% near-white · ${(page.metrics.colorful_ratio * 100).toFixed(1)}% chromatic</small>${page.flags.length ? `<em>${escapeHtml(page.flags.join(" · "))}</em>` : ""}</figcaption>
        </figure>`
        )
        .join("\n");
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>The Fenton Collection · every-page print inspection</title>
  <style>
    :root { color-scheme: dark; font-family: Arial, sans-serif; background: #07110c; color: #f6f1e6; }
    body { margin: 0; padding: 1.25rem; }
    header { position: sticky; z-index: 2; top: 0; padding: 1rem; border: 1px solid #315443; border-radius: .8rem; background: rgb(7 17 12 / 94%); backdrop-filter: blur(12px); }
    h1 { margin: 0 0 .35rem; font-family: Georgia, serif; font-size: clamp(1.8rem, 4vw, 3.8rem); font-weight: 400; }
    header p { max-width: 70rem; margin: .25rem 0; color: #bed0c4; }
    .summary { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .7rem; }
    .summary span { padding: .35rem .55rem; border-radius: 999px; background: #173326; }
    main { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 1rem; margin-top: 1.2rem; }
    .page-card { margin: 0; overflow: hidden; border: 1px solid #294638; border-radius: .65rem; background: #102019; }
    .page-card--flagged { border-color: #d9903d; box-shadow: 0 0 0 2px rgb(217 144 61 / 18%); }
    .page-card img { display: block; width: 100%; aspect-ratio: 8.75 / 11.25; object-fit: contain; background: #020604; }
    figcaption { display: grid; gap: .2rem; padding: .65rem; }
    figcaption strong { font-size: 1rem; }
    figcaption span { color: #f0cd72; font-size: .78rem; font-weight: 700; text-transform: uppercase; }
    figcaption small { color: #aabbb0; line-height: 1.35; }
    figcaption em { color: #ffbf69; font-size: .75rem; font-style: normal; }
  </style>
</head>
<body>
  <header>
    <h1>Every-page print inspection</h1>
    <p>Generated from <code>${escapeHtml(report.pdf_sha256)}</code>. Every PDF page is rendered, text-extracted, classified, measured for white and chromatic coverage, and linked to its full 96-DPI proof.</p>
    <div class="summary"><span>${report.page_count} pages</span><span>${report.flagged_pages.length} flagged</span><span>${report.unclassified_pages.length} unclassified</span><span>${report.blank_pages.length} blank</span><span>${report.duplicate_page_groups.length} duplicate groups</span></div>
  </header>
  <main>${cards}</main>
</body>
</html>`;
}

async function main() {
    const pagination = JSON.parse(await readFile(paginationPath, "utf8"));
    const pdfSha256 = await sha256File(pdfPath);
    let reusedRenders = false;
    try {
        const previousReport = JSON.parse(await readFile(reportPath, "utf8"));
        const [existingImages, existingText] = await Promise.all([
            readdir(pagesDirectory),
            readdir(textDirectory),
        ]);
        reusedRenders =
            previousReport.pdf_sha256 === pdfSha256 &&
            existingImages.filter((file) => /^page-\d+\.jpg$/i.test(file))
                .length === pagination.final_page_count &&
            existingText.filter((file) => /^page-\d+\.txt$/i.test(file))
                .length === pagination.final_page_count;
    } catch {
        reusedRenders = false;
    }
    if (!reusedRenders) {
        await resetReviewDirectory();
        await renderPages();
    }
    const imageFiles = (await readdir(pagesDirectory))
        .filter((file) => /^page-\d+\.jpg$/i.test(file))
        .sort();
    const textFiles = (await readdir(textDirectory))
        .filter((file) => /^page-\d+\.txt$/i.test(file))
        .sort();
    if (
        imageFiles.length !== pagination.final_page_count ||
        textFiles.length !== pagination.final_page_count
    ) {
        throw new Error(
            `Every-page render mismatch: ${imageFiles.length} images and ${textFiles.length} text pages for ${pagination.final_page_count} PDF pages.`
        );
    }

    const pages = [];
    const imageHashes = new Map();
    for (const [index, file] of imageFiles.entries()) {
        const pageNumber = index + 1;
        const imagePath = path.join(pagesDirectory, file);
        const [{ data, info }, text] = await Promise.all([
            sharp(imagePath).removeAlpha().raw().toBuffer({
                resolveWithObject: true,
            }),
            readFile(path.join(textDirectory, textFiles[index]), "utf8"),
        ]);
        const normalizedText = normalizeText(text);
        const imageHash = createHash("sha256").update(data).digest("hex");
        if (!imageHashes.has(imageHash)) imageHashes.set(imageHash, []);
        imageHashes.get(imageHash).push(pageNumber);
        const page = {
            page: pageNumber,
            file,
            type: classifyPage(normalizedText, pageNumber),
            title_excerpt: normalizedText.slice(0, 180),
            text_characters: normalizedText.length,
            metrics: pageMetrics(data, info),
            pixel_sha256: imageHash,
        };
        page.flags = qualityFlags(page);
        pages.push(page);
    }

    const duplicatePageGroups = [...imageHashes.values()].filter(
        (pageNumbers) => pageNumbers.length > 1
    );
    const contactSheets = await buildContactSheets(pages);
    const report = {
        schema_version: 1,
        generated_on: "2026-09-03",
        pdf: path.relative(printOutputRoot, pdfPath).replaceAll("\\", "/"),
        pdf_sha256: pdfSha256,
        reused_page_renders: reusedRenders,
        page_count: pages.length,
        expected_page_count: pagination.final_page_count,
        all_pages_rendered: pages.length === pagination.final_page_count,
        type_counts: Object.fromEntries(
            [...Map.groupBy(pages, (page) => page.type).entries()].map(
                ([type, typePages]) => [type, typePages.length]
            )
        ),
        flagged_pages: pages
            .filter((page) => page.flags.length)
            .map((page) => ({ page: page.page, flags: page.flags })),
        unclassified_pages: pages
            .filter((page) => page.type === "unclassified")
            .map((page) => page.page),
        blank_pages: pages
            .filter(
                (page) =>
                    page.text_characters < 18 &&
                    page.metrics.near_white_ratio > 0.94
            )
            .map((page) => page.page),
        duplicate_page_groups: duplicatePageGroups,
        contact_sheets: contactSheets,
        pages,
    };
    await Promise.all([
        writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
        writeFile(inspectionPath, inspectionHtml(report), "utf8"),
    ]);

    const fatal = [
        ...report.unclassified_pages.map(
            (page) => `page ${page}: unclassified`
        ),
        ...report.blank_pages.map((page) => `page ${page}: blank`),
        ...report.flagged_pages
            .filter(({ flags }) =>
                flags.some((flag) =>
                    [
                        "too-much-white",
                        "low-color",
                        "sparse-notes",
                    ].includes(flag)
                )
            )
            .map(({ page, flags }) => `page ${page}: ${flags.join(", ")}`),
        ...duplicatePageGroups.map(
            (pageNumbers) =>
                `duplicate rendered pages: ${pageNumbers.join(", ")}`
        ),
    ];
    console.log(
        `[print-book] Reviewed ${pages.length}/${pagination.final_page_count} pages; ${report.flagged_pages.length} flagged; ${contactSheets.length} contact sheets${reusedRenders ? " (reused current-SHA renders)" : ""}.`
    );
    console.log(`[print-book] Inspection: ${inspectionPath}`);
    if (fatal.length) {
        throw new Error(
            `Every-page quality audit failed:\n${fatal.join("\n")}`
        );
    }
}

await main();
