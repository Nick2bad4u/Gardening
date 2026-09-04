import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

import { PDFDocument } from "pdf-lib";
import { chromium } from "playwright-core";

import {
    PRINT_JACKET_SPEC,
    printCoverDirectory,
    printOutputRoot,
    proofPagesDirectory,
} from "./print-book-config.mjs";

const execFileAsync = promisify(execFile);
const edgeExecutable =
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const ghostscriptExecutable = "C:\\cygwin64\\bin\\gs.exe";
const widthPt = PRINT_JACKET_SPEC.widthPt;
const heightPt = PRINT_JACKET_SPEC.heightPt;
const sourceHtmlPath = path.join(printCoverDirectory, "index.html");
const rawPdfPath = path.join(
    printCoverDirectory,
    "fenton-collection-dust-jacket.raw.pdf"
);
const outputPdfPath = path.join(
    printCoverDirectory,
    "fenton-collection-dust-jacket.pdf"
);
const templatePdfPath = path.join(
    printOutputRoot,
    "lulu-template",
    PRINT_JACKET_SPEC.templateFile
);

function closeEnough(left, right, tolerance = 0.25) {
    return Math.abs(left - right) <= tolerance;
}

async function rasterize(pdfPath, outputPath) {
    await execFileAsync(
        ghostscriptExecutable,
        [
            "-dNOSAFER",
            "-dBATCH",
            "-dNOPAUSE",
            "-dQUIET",
            "-sDEVICE=png16m",
            "-r144",
            "-dTextAlphaBits=4",
            "-dGraphicsAlphaBits=4",
            `-sOutputFile=${outputPath}`,
            pdfPath,
        ],
        { windowsHide: true, maxBuffer: 10 * 1024 * 1024 }
    );
}

async function main() {
    await mkdir(printCoverDirectory, { recursive: true });
    const browser = await chromium.launch({
        executablePath: edgeExecutable,
        headless: true,
        args: ["--allow-file-access-from-files", "--disable-gpu"],
    });
    let browserReport;
    try {
        const page = await browser.newPage({
            viewport: { width: widthPt, height: heightPt },
            deviceScaleFactor: 1,
        });
        await page.emulateMedia({ media: "print" });
        const consoleErrors = [];
        page.on("console", (message) => {
            if (message.type() === "error") consoleErrors.push(message.text());
        });
        page.on("pageerror", (error) => consoleErrors.push(error.message));
        await page.goto(pathToFileURL(sourceHtmlPath).href, {
            waitUntil: "load",
            timeout: 180_000,
        });
        await page.waitForFunction(
            () =>
                document.documentElement.dataset.printReady === "true" ||
                document.documentElement.dataset.printReady === "error",
            undefined,
            { timeout: 180_000 }
        );
        browserReport = await page.evaluate(() => window.printCoverReport);
        browserReport.consoleErrors = consoleErrors;
        if (!browserReport.ready || browserReport.remoteImages.length) {
            throw new Error(
                `Dust-jacket HTML did not pass readiness: ${JSON.stringify(browserReport, null, 2)}`
            );
        }
        if (consoleErrors.length) {
            throw new Error(
                `Dust-jacket HTML emitted console errors: ${consoleErrors.join(" | ")}`
            );
        }
        await page.pdf({
            path: rawPdfPath,
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: false,
            tagged: true,
            outline: true,
            timeout: 180_000,
        });
    } finally {
        await browser.close();
    }

    const rawBytes = await readFile(rawPdfPath);
    const pdf = await PDFDocument.load(rawBytes, { updateMetadata: false });
    if (pdf.getPageCount() !== 1) {
        throw new Error(
            `The integrated dust jacket must be one PDF page; rendered ${pdf.getPageCount()}.`
        );
    }
    const page = pdf.getPage(0);
    const renderedBox = page.getMediaBox();
    if (
        !closeEnough(renderedBox.width, widthPt) ||
        !closeEnough(renderedBox.height, heightPt)
    ) {
        throw new Error(
            `Dust-jacket render is ${renderedBox.width} × ${renderedBox.height} pt; expected ${widthPt} × ${heightPt} pt.`
        );
    }
    page.setMediaBox(0, 0, widthPt, heightPt);
    page.setCropBox(0, 0, widthPt, heightPt);
    page.setBleedBox(0, 0, widthPt, heightPt);
    pdf.setTitle("The Fenton Collection — Dust Jacket");
    pdf.setAuthor("Nick");
    pdf.setSubject(
        `Integrated dust jacket for the ${PRINT_JACKET_SPEC.pageCount}-page US Letter linen-wrap hardcover`
    );
    pdf.setCreator("Gardening repository print-book pipeline");
    pdf.setProducer("Microsoft Edge print engine; normalized with pdf-lib");
    const editionDate = new Date("2026-09-03T00:00:00.000Z");
    pdf.setCreationDate(editionDate);
    pdf.setModificationDate(editionDate);
    const finalBytes = await pdf.save({
        addDefaultPage: false,
        useObjectStreams: true,
        updateFieldAppearances: false,
    });
    await writeFile(outputPdfPath, finalBytes);
    await rm(rawPdfPath, { force: true });

    await mkdir(proofPagesDirectory, { recursive: true });
    const coverProofPath = path.join(proofPagesDirectory, "dust-jacket.png");
    const templateProofPath = path.join(
        proofPagesDirectory,
        "dust-jacket-template.png"
    );
    await Promise.all([
        rasterize(outputPdfPath, coverProofPath),
        rasterize(templatePdfPath, templateProofPath),
    ]);

    const outputStats = await stat(outputPdfPath);
    const report = {
        rendered_on: "2026-09-03",
        page_count: 1,
        interior_page_count: PRINT_JACKET_SPEC.pageCount,
        spine_width_in: PRINT_JACKET_SPEC.spineWidthIn,
        media_box: page.getMediaBox(),
        crop_box: page.getCropBox(),
        bleed_box: page.getBleedBox(),
        document_size_in: {
            width: PRINT_JACKET_SPEC.widthIn,
            height: PRINT_JACKET_SPEC.heightIn,
        },
        output_size_bytes: outputStats.size,
        output_sha256: createHash("sha256").update(finalBytes).digest("hex"),
        html_report: browserReport,
        template_overlay_inputs: {
            artwork: "proof-pages/dust-jacket.png",
            template: "proof-pages/dust-jacket-template.png",
        },
    };
    await writeFile(
        path.join(printCoverDirectory, "cover-render-report.json"),
        `${JSON.stringify(report, null, 2)}\n`,
        "utf8"
    );

    const pagination = JSON.parse(
        await readFile(
            path.join(printOutputRoot, "interior", "pagination-report.json"),
            "utf8"
        )
    );
    const proofLinks = pagination.proof_pages
        .map(
            ({ page: pageNumber, file }) =>
                `<a href="proof-pages/${file}"><img src="proof-pages/${file}" alt="Interior proof page ${pageNumber}"><span>Page ${pageNumber}</span></a>`
        )
        .join("\n");
    const inspectionHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>The Fenton Collection · Local print inspection</title><style>
body{max-width:1200px;margin:0 auto;padding:2rem;color:#17241c;background:#f3eee2;font:16px/1.5 Arial,sans-serif}h1,h2{font-family:Georgia,serif;font-weight:400}a{color:#234d37}.downloads{display:flex;flex-wrap:wrap;gap:.75rem;margin:1.5rem 0}.downloads a{padding:.8rem 1rem;border:1px solid #8da08f;border-radius:.5rem;background:#fffdf7;font-weight:700}.cover{position:relative;aspect-ratio:${widthPt}/${heightPt};background:#17382b;overflow:auto}.cover img{display:block;width:100%}.cover img+img{position:absolute;inset:0;opacity:.32}.proofs{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem}.proofs a{display:grid;gap:.35rem;text-decoration:none}.proofs img{width:100%;box-shadow:0 4px 18px #17241c33}.note{padding:1rem;border-left:4px solid #9a671e;background:#fffdf7}</style></head><body>
<p>Local-only printer's proof · no Lulu upload has occurred</p><h1>The Fenton Collection</h1><p>US Letter portrait · ${PRINT_JACKET_SPEC.pageCount} pages · premium color · 80# coated white · linen-wrap hardcover with matte dust jacket.</p>
<div class="downloads"><a href="interior/fenton-collection-interior.pdf">Open ${PRINT_JACKET_SPEC.pageCount}-page interior PDF</a><a href="cover/fenton-collection-dust-jacket.pdf">Open dust-jacket PDF</a><a href="preflight-report.md">Open preflight report</a><a href="interior/index.html">Open browser proof</a></div>
<h2>Dust-jacket alignment proof</h2><p class="note">The translucent Lulu template below is for inspection only. The downloadable jacket PDF contains artwork without template lines.</p><div class="cover"><img src="proof-pages/dust-jacket.png" alt="Rendered dust-jacket artwork"><img src="proof-pages/dust-jacket-template.png" alt="Lulu template overlay"></div>
<h2>Representative interior pages</h2><div class="proofs">${proofLinks}</div></body></html>`;
    await writeFile(
        path.join(printOutputRoot, "cover-inspection.html"),
        inspectionHtml,
        "utf8"
    );
    console.log(
        `[print-book] Rendered the one-page dust jacket (${(
            outputStats.size /
            1024 /
            1024
        ).toFixed(1)} MiB) and cover inspection page.`
    );
}

await main();
