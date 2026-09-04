import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";

import {
    PRINT_JACKET_SPEC,
    printCoverDirectory,
    printOutputRoot,
    repositoryRoot,
} from "./print-book-config.mjs";

const FINAL_PAGE_COUNT = PRINT_JACKET_SPEC.pageCount;
const JACKET_SPEC = PRINT_JACKET_SPEC;

const templatePath = path.join(
    printOutputRoot,
    "lulu-template",
    JACKET_SPEC.templateFile
);
const manifestPath = path.join(printOutputRoot, "print-manifest.json");
const paginationPath = path.join(
    printOutputRoot,
    "interior",
    "pagination-report.json"
);
const printSourceDirectory = path.join(
    repositoryRoot,
    "docs",
    "plant-booklet",
    "print"
);
const publicBookletUrl = "https://nick2bad4u.github.io/Gardening/";

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function closeEnough(left, right, tolerance = 0.05) {
    return Math.abs(left - right) <= tolerance;
}

async function main() {
    const [
        manifest,
        pagination,
        templateBytes,
    ] = await Promise.all([
        readFile(manifestPath, "utf8").then(JSON.parse),
        readFile(paginationPath, "utf8").then(JSON.parse),
        readFile(templatePath),
    ]);
    if (pagination.final_page_count !== FINAL_PAGE_COUNT) {
        throw new Error(
            `The downloaded jacket template is for ${FINAL_PAGE_COUNT} pages, but the interior now has ${pagination.final_page_count}. Download a fresh custom template before rebuilding the jacket.`
        );
    }
    const templatePdf = await PDFDocument.load(templateBytes, {
        updateMetadata: false,
    });
    if (templatePdf.getPageCount() !== 1) {
        throw new Error(
            "The Lulu custom jacket template must contain one page."
        );
    }
    const templateBox = templatePdf.getPage(0).getMediaBox();
    if (
        !closeEnough(templateBox.width, JACKET_SPEC.widthPt) ||
        !closeEnough(templateBox.height, JACKET_SPEC.heightPt)
    ) {
        throw new Error(
            `Unexpected Lulu jacket geometry: ${templateBox.width} × ${templateBox.height} pt.`
        );
    }
    if (!manifest.jacket_assets?.front || !manifest.jacket_assets?.back) {
        throw new Error(
            "The print manifest has no prepared jacket assets. Rebuild the print book first."
        );
    }

    await mkdir(printCoverDirectory, { recursive: true });
    const assetSource = (position) =>
        `../${manifest.jacket_assets[position].staged_path.replaceAll("\\", "/")}`;
    const qrSvg = await QRCode.toString(publicBookletUrl, {
        type: "svg",
        errorCorrectionLevel: "M",
        margin: 0,
        width: 512,
        color: { dark: "#f8f3e8", light: "#17382b" },
    });
    const html = `<!doctype html>
<html lang="en" data-print-ready="false">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>The Fenton Collection · ${FINAL_PAGE_COUNT}-page dust jacket</title>
    <link rel="stylesheet" href="print-cover.css">
    <style>
        :root {
            --jacket-width: ${JACKET_SPEC.widthIn}in;
            --jacket-height: ${JACKET_SPEC.heightIn}in;
            --back-flap-left: ${JACKET_SPEC.backFlapLeftIn}in;
            --back-cover-left: ${JACKET_SPEC.backCoverLeftIn}in;
            --spine-left: ${JACKET_SPEC.spineArea.leftIn}in;
            --spine-width: ${JACKET_SPEC.spineWidthIn}in;
            --front-cover-left: ${JACKET_SPEC.frontCoverLeftIn}in;
            --front-flap-left: ${JACKET_SPEC.frontFlapLeftIn}in;
        }
        @page { size: ${JACKET_SPEC.widthIn}in ${JACKET_SPEC.heightIn}in; }
    </style>
</head>
<body>
    <main class="jacket" aria-label="Integrated back flap, back cover, spine, front cover, and front flap dust-jacket artwork">
        <aside class="jacket-flap jacket-flap--back">
            <div class="flap-live-area">
                <img src="${escapeHtml(assetSource("flap"))}" alt="Rear grow-zone view from the collection" data-print-image>
                <p class="kicker">About this collection</p>
                <h2>Observed at home,<br>one plant at a time.</h2>
                <p>This is a personal field guide to an indoor collection in Fenton, Michigan: identification evidence, practical care, dated photographs, and the details that make each plant memorable.</p>
                <small>First print proof · September 2026</small>
            </div>
        </aside>

        <section class="back-cover">
            <img class="back-cover__image" src="${escapeHtml(assetSource("back"))}" alt="Top-down view of the individually potted plants" data-print-image>
            <div class="back-cover__gradient"></div>
            <div class="back-cover__live-area">
                <p class="kicker">A living reference</p>
                <h2>Care notes meet<br><em>collection evidence.</em></h2>
                <p>Thirty-five present records and one retained historical profile connect permanent labels, Google Sheets IDs, seller evidence, full-color collection photography, and licensed views of mature form, flowers, fruit, and habitat.</p>
                <div class="back-cover__stats"><span><strong>36</strong> profiles</span><span><strong>${FINAL_PAGE_COUNT}</strong> pages</span><span><strong>Premium</strong> color</span></div>
                <div class="barcode-reserve" aria-label="Optional barcode area intentionally left clear">Optional barcode area</div>
            </div>
        </section>

        <section class="spine">
            <div class="spine__title">The Fenton Collection</div>
            <div class="spine__mark">NICK'S INDOOR GARDEN</div>
        </section>

        <section class="front-cover">
            <img class="front-cover__image" src="${escapeHtml(assetSource("front"))}" alt="Wide view of the full indoor plant collection" data-print-image>
            <div class="front-cover__gradient"></div>
            <div class="front-cover__live-area">
                <p class="kicker">Nick's indoor garden · Fenton, Michigan</p>
                <h1>The<br>Fenton<br>Collection</h1>
                <p>A photographic field guide to cactus, succulent, and houseplant personalities</p>
            </div>
        </section>

        <aside class="jacket-flap jacket-flap--front">
            <div class="flap-live-area">
                <p class="kicker">Inside</p>
                <h2>Names, care,<br>growth, and context</h2>
                <ul><li>Current collection records</li><li>Nursery-label evidence</li><li>Practical care starting ranges</li><li>Botanical history and habitat</li><li>Owner and licensed photography</li></ul>
                <div class="flap-qr">${qrSvg}<strong>Open the living field guide</strong><span>nick2bad4u.github.io/Gardening</span></div>
                <small>Collection photographs © Nick, all rights reserved. Licensed reference images are credited in the interior.</small>
            </div>
        </aside>
    </main>
    <script src="print-cover.js"></script>
</body>
</html>`;

    const templateSha256 = createHash("sha256")
        .update(templateBytes)
        .digest("hex");
    await Promise.all([
        writeFile(path.join(printCoverDirectory, "index.html"), html, "utf8"),
        copyFile(
            path.join(printSourceDirectory, "print-cover.css"),
            path.join(printCoverDirectory, "print-cover.css")
        ),
        copyFile(
            path.join(printSourceDirectory, "print-cover.js"),
            path.join(printCoverDirectory, "print-cover.js")
        ),
        writeFile(
            path.join(printCoverDirectory, "cover-source-report.json"),
            `${JSON.stringify(
                {
                    page_count: FINAL_PAGE_COUNT,
                    jacket_spec: JACKET_SPEC,
                    template_file: `lulu-template/${JACKET_SPEC.templateFile}`,
                    template_sha256: templateSha256,
                    template_media_box: templateBox,
                    jacket_assets: manifest.jacket_assets,
                },
                null,
                2
            )}\n`,
            "utf8"
        ),
    ]);
    console.log(
        `[print-book] Built the exact ${FINAL_PAGE_COUNT}-page dust-jacket source (${JACKET_SPEC.widthIn} × ${JACKET_SPEC.heightIn} in; ${JACKET_SPEC.spineWidthIn} in spine).`
    );
}

await main();
