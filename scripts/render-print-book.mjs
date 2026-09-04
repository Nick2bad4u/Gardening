import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
    mkdir,
    readFile,
    readdir,
    rm,
    stat,
    writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

import { PDFDocument } from "pdf-lib";
import { chromium } from "playwright-core";

import {
    PRINT_SPEC,
    printInteriorDirectory,
    proofPagesDirectory,
} from "./print-book-config.mjs";

const execFileAsync = promisify(execFile);
const edgeExecutable =
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const ghostscriptExecutable = "C:\\cygwin64\\bin\\gs.exe";
const sourceHtmlPath = path.join(printInteriorDirectory, "index.html");
const provisionalPdfPath = path.join(
    printInteriorDirectory,
    "fenton-collection-interior.provisional.pdf"
);
const rawPdfPath = path.join(
    printInteriorDirectory,
    "fenton-collection-interior.raw.pdf"
);
const outputPdfPath = path.join(
    printInteriorDirectory,
    "fenton-collection-interior.pdf"
);
const reportPath = path.join(printInteriorDirectory, "pagination-report.json");
const provisionalRectoAuditDirectory = path.join(
    printInteriorDirectory,
    "recto-audit-provisional"
);
const finalRectoAuditDirectory = path.join(
    printInteriorDirectory,
    "recto-audit-final"
);

function round(value, digits = 3) {
    return Number(value.toFixed(digits));
}

function representativePages(pageCount) {
    return [
        1,
        2,
        3,
        4,
        5,
        6,
        10,
        11,
        12,
        13,
        Math.round(pageCount * 0.25),
        Math.round(pageCount * 0.5),
        Math.round(pageCount * 0.75),
        Math.max(1, pageCount - 2),
        Math.max(1, pageCount - 1),
        pageCount,
    ].filter((page, index, values) => values.indexOf(page) === index);
}

async function renderProofPages(pdfPath, pageCount) {
    await rm(proofPagesDirectory, { recursive: true, force: true });
    await mkdir(proofPagesDirectory, { recursive: true });
    const pages = representativePages(pageCount);
    const files = [];
    for (const pageNumber of pages) {
        const fileName = `page-${String(pageNumber).padStart(3, "0")}.png`;
        const outputPath = path.join(proofPagesDirectory, fileName);
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
                `-dFirstPage=${pageNumber}`,
                `-dLastPage=${pageNumber}`,
                `-sOutputFile=${outputPath}`,
                pdfPath,
            ],
            { windowsHide: true, maxBuffer: 10 * 1024 * 1024 }
        );
        files.push({ page: pageNumber, file: fileName });
    }
    return files;
}

async function renderPdf(page, outputPath) {
    await page.pdf({
        path: outputPath,
        printBackground: true,
        preferCSSPageSize: true,
        tagged: true,
        outline: true,
        displayHeaderFooter: false,
        timeout: 300_000,
    });
}

async function extractRectoMarkers(pdfPath, outputDirectory) {
    await rm(outputDirectory, { recursive: true, force: true });
    await mkdir(outputDirectory, { recursive: true });
    await execFileAsync(
        ghostscriptExecutable,
        [
            "-dNOSAFER",
            "-dBATCH",
            "-dNOPAUSE",
            "-dQUIET",
            "-sDEVICE=txtwrite",
            `-sOutputFile=${path.join(outputDirectory, "page-%03d.txt")}`,
            pdfPath,
        ],
        { windowsHide: true, timeout: 300_000, maxBuffer: 20 * 1024 * 1024 }
    );
    const files = (await readdir(outputDirectory))
        .filter((file) => /^page-\d+\.txt$/i.test(file))
        .sort();
    const markers = [];
    for (const [index, file] of files.entries()) {
        const content = await readFile(
            path.join(outputDirectory, file),
            "utf8"
        );
        for (const match of content.matchAll(
            /RECTO-ID-(GROUP-[A-Z-]+|PROFILE-\d{2})/g
        )) {
            markers.push({
                id: match[1].toLowerCase(),
                page: index + 1,
            });
        }
    }
    return { markers, pageCount: files.length };
}

function chooseRectoBlanks(markers) {
    let inserted = 0;
    const before = [];
    for (const marker of [...markers].sort((a, b) => a.page - b.page)) {
        const resultingPage = marker.page + inserted;
        if (resultingPage % 2 === 0) {
            before.push(marker.id);
            inserted += 1;
        }
    }
    return before;
}

async function main() {
    await mkdir(printInteriorDirectory, { recursive: true });
    const browser = await chromium.launch({
        executablePath: edgeExecutable,
        headless: true,
        args: ["--allow-file-access-from-files", "--disable-gpu"],
    });

    let browserReport;
    let provisionalRectoAudit;
    let finalRectoAudit;
    let rectoBlankBefore;
    let appendedClosingPage = false;
    try {
        const page = await browser.newPage({
            viewport: { width: 1260, height: 1620 },
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
        browserReport = await page.evaluate(() => window.printBookReport);
        browserReport.consoleErrors = consoleErrors;
        if (!browserReport.ready) {
            throw new Error(
                `Print HTML did not pass its readiness check: ${JSON.stringify(browserReport, null, 2)}`
            );
        }
        if (browserReport.remoteImages.length) {
            throw new Error(
                `Print HTML contains remote image sources: ${browserReport.remoteImages.join(", ")}`
            );
        }
        if (consoleErrors.length) {
            throw new Error(
                `Print HTML emitted console errors: ${consoleErrors.join(" | ")}`
            );
        }

        await renderPdf(page, provisionalPdfPath);
        provisionalRectoAudit = await extractRectoMarkers(
            provisionalPdfPath,
            provisionalRectoAuditDirectory
        );
        if (provisionalRectoAudit.markers.length !== 40) {
            throw new Error(
                `Expected 40 recto markers (4 groups and 36 profiles); found ${provisionalRectoAudit.markers.length}.`
            );
        }
        rectoBlankBefore = chooseRectoBlanks(provisionalRectoAudit.markers);
        await page.evaluate((ids) => {
            for (const id of ids) {
                const target = document.querySelector(
                    `[data-recto-id="${CSS.escape(id)}"]`
                );
                if (!target) {
                    throw new Error(`Missing recto target: ${id}`);
                }
                const transition = document.createElement("section");
                const theme = target.dataset.rectoTheme ?? "cacti";
                transition.className = `sheet sheet--full recto-transition recto-transition--${theme}`;
                transition.dataset.pageType = "recto-transition";
                transition.dataset.transitionBefore = id;
                const image = target.querySelector(".profile-opener__image");
                if (image) {
                    const imageClone = image.cloneNode();
                    imageClone.className = "recto-transition__image";
                    imageClone.alt = "";
                    imageClone.setAttribute("aria-hidden", "true");
                    const imageWidth = Number.parseFloat(
                        image.style.getPropertyValue("--image-width")
                    );
                    if (Number.isFinite(imageWidth) && imageWidth < 7.5) {
                        imageClone.classList.add(
                            "recto-transition__image--framed"
                        );
                    }
                    transition.append(imageClone);
                }
                const veil = document.createElement("div");
                veil.className = "recto-transition__veil";
                const copy = document.createElement("div");
                copy.className = "recto-transition__copy";
                const eyebrow = document.createElement("p");
                eyebrow.textContent = target.dataset.rectoEyebrow ?? "Next";
                const title = document.createElement("h1");
                title.textContent =
                    target.dataset.rectoTitle ?? "Turn the page";
                const note = document.createElement("span");
                note.textContent = image
                    ? "A new collection portrait begins on the facing page."
                    : "A new chapter begins on the facing page.";
                copy.append(eyebrow, title, note);
                transition.append(veil, copy);
                target.before(transition);
            }
        }, rectoBlankBefore);
        const finalLayoutReport = await page.evaluate(() => {
            const sheets = [...document.querySelectorAll(".sheet")];
            for (const [index, sheet] of sheets.entries()) {
                sheet.classList.remove("sheet--recto", "sheet--verso");
                sheet.classList.add(
                    (index + 1) % 2 === 1 ? "sheet--recto" : "sheet--verso"
                );
            }
            const overflows = sheets
                .filter(
                    (sheet) =>
                        sheet.scrollHeight > sheet.clientHeight + 2 ||
                        sheet.scrollWidth > sheet.clientWidth + 2
                )
                .map((sheet, index) => ({
                    page: index + 1,
                    className: sheet.className,
                    profilePage: sheet.dataset.profilePage ?? null,
                    scrollHeight: sheet.scrollHeight,
                    clientHeight: sheet.clientHeight,
                    scrollWidth: sheet.scrollWidth,
                    clientWidth: sheet.clientWidth,
                }));
            return {
                fixedPageCount: sheets.length,
                rectoCount: sheets.filter((sheet) =>
                    sheet.classList.contains("sheet--recto")
                ).length,
                versoCount: sheets.filter((sheet) =>
                    sheet.classList.contains("sheet--verso")
                ).length,
                overflows,
            };
        });
        if (finalLayoutReport.overflows.length) {
            throw new Error(
                `Final imposed layout contains overflowing fixed pages: ${JSON.stringify(finalLayoutReport.overflows, null, 2)}`
            );
        }
        browserReport.rectoTransitionCount = rectoBlankBefore.length;
        browserReport.rectoTransitionBefore = rectoBlankBefore;
        browserReport.finalLayout = finalLayoutReport;
        await renderPdf(page, rawPdfPath);
        finalRectoAudit = await extractRectoMarkers(
            rawPdfPath,
            finalRectoAuditDirectory
        );
        if (finalRectoAudit.pageCount % 2 !== 0) {
            await page.evaluate(() => {
                const closing = document.createElement("section");
                closing.className = "sheet sheet--full closing-verso";
                closing.dataset.pageType = "closing-verso";
                const copy = document.createElement("strong");
                copy.textContent = "The collection continues.";
                closing.append(copy);
                document.querySelector("main")?.append(closing);
            });
            appendedClosingPage = true;
            await renderPdf(page, rawPdfPath);
            finalRectoAudit = await extractRectoMarkers(
                rawPdfPath,
                finalRectoAuditDirectory
            );
        }
        browserReport.appendedClosingPage = appendedClosingPage;
        browserReport.finalFixedPageCount =
            browserReport.fixedPageCount +
            rectoBlankBefore.length +
            (appendedClosingPage ? 1 : 0);
        const evenRectoMarkers = finalRectoAudit.markers.filter(
            (marker) => marker.page % 2 === 0
        );
        if (finalRectoAudit.markers.length !== 40 || evenRectoMarkers.length) {
            throw new Error(
                `Recto correction failed: ${finalRectoAudit.markers.length} markers; even-page markers ${JSON.stringify(evenRectoMarkers)}.`
            );
        }
    } finally {
        await browser.close();
    }

    const rawPdfBytes = await readFile(rawPdfPath);
    const pdf = await PDFDocument.load(rawPdfBytes, {
        updateMetadata: false,
    });
    const chromiumPageCount = pdf.getPageCount();
    if (chromiumPageCount % 2 !== 0) {
        throw new Error(
            `Interior remained odd after closing-page correction: ${chromiumPageCount} pages.`
        );
    }

    for (const page of pdf.getPages()) {
        page.setMediaBox(0, 0, PRINT_SPEC.pageWidthPt, PRINT_SPEC.pageHeightPt);
        page.setCropBox(0, 0, PRINT_SPEC.pageWidthPt, PRINT_SPEC.pageHeightPt);
        page.setBleedBox(0, 0, PRINT_SPEC.pageWidthPt, PRINT_SPEC.pageHeightPt);
        page.setTrimBox(
            PRINT_SPEC.trimInsetPt,
            PRINT_SPEC.trimInsetPt,
            PRINT_SPEC.pageWidthPt - 2 * PRINT_SPEC.trimInsetPt,
            PRINT_SPEC.pageHeightPt - 2 * PRINT_SPEC.trimInsetPt
        );
        page.setArtBox(
            PRINT_SPEC.trimInsetPt,
            PRINT_SPEC.trimInsetPt,
            PRINT_SPEC.pageWidthPt - 2 * PRINT_SPEC.trimInsetPt,
            PRINT_SPEC.pageHeightPt - 2 * PRINT_SPEC.trimInsetPt
        );
    }

    pdf.setTitle("The Fenton Collection");
    pdf.setAuthor("Nick");
    pdf.setSubject(
        "Premium-color photographic field guide and collection record"
    );
    pdf.setKeywords([
        "gardening",
        "cactus",
        "succulent",
        "houseplants",
        "field guide",
        "collection record",
    ]);
    pdf.setCreator("Gardening repository print-book pipeline");
    pdf.setProducer("Microsoft Edge print engine; normalized with pdf-lib");
    const editionDate = new Date("2026-09-03T00:00:00.000Z");
    pdf.setCreationDate(editionDate);
    pdf.setModificationDate(editionDate);

    const finalPdfBytes = await pdf.save({
        addDefaultPage: false,
        useObjectStreams: true,
        updateFieldAppearances: false,
    });
    await writeFile(outputPdfPath, finalPdfBytes);
    await Promise.all([
        rm(rawPdfPath, { force: true }),
        rm(provisionalPdfPath, { force: true }),
    ]);

    const finalPageCount = pdf.getPageCount();
    const proofPages = await renderProofPages(outputPdfPath, finalPageCount);
    const outputStats = await stat(outputPdfPath);
    const outputSha256 = createHash("sha256")
        .update(finalPdfBytes)
        .digest("hex");
    const firstPage = pdf.getPage(0);
    const report = {
        rendered_on: "2026-09-03",
        source_html: "interior/index.html",
        output_pdf: "interior/fenton-collection-interior.pdf",
        chromium_page_count: chromiumPageCount,
        appended_blank_page: false,
        appended_closing_page: appendedClosingPage,
        final_page_count: finalPageCount,
        output_size_bytes: outputStats.size,
        output_sha256: outputSha256,
        page_boxes: {
            media: firstPage.getMediaBox(),
            crop: firstPage.getCropBox(),
            bleed: firstPage.getBleedBox(),
            trim: firstPage.getTrimBox(),
            art: firstPage.getArtBox(),
        },
        expected_geometry_pt: {
            width: PRINT_SPEC.pageWidthPt,
            height: PRINT_SPEC.pageHeightPt,
            trim_inset: PRINT_SPEC.trimInsetPt,
        },
        html_report: browserReport,
        recto_layout: {
            marker_count: finalRectoAudit.markers.length,
            inserted_blank_count: 0,
            inserted_transition_count: rectoBlankBefore.length,
            inserted_transition_before: rectoBlankBefore,
            provisional_markers: provisionalRectoAudit.markers,
            final_markers: finalRectoAudit.markers,
            all_openers_on_odd_pages: finalRectoAudit.markers.every(
                (marker) => marker.page % 2 === 1
            ),
        },
        proof_pages: proofPages,
        dimensions_in: {
            supplied_width: round(PRINT_SPEC.pageWidthPt / 72),
            supplied_height: round(PRINT_SPEC.pageHeightPt / 72),
            trim_width: round(
                (PRINT_SPEC.pageWidthPt - 2 * PRINT_SPEC.trimInsetPt) / 72
            ),
            trim_height: round(
                (PRINT_SPEC.pageHeightPt - 2 * PRINT_SPEC.trimInsetPt) / 72
            ),
        },
    };
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(
        `[print-book] Rendered ${finalPageCount} pages (${(
            outputStats.size /
            1024 /
            1024
        ).toFixed(1)} MiB); ${proofPages.length} proof pages written.`
    );
}

await main();
