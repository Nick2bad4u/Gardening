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

import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

import { loadProfiles } from "./build-plant-booklet.mjs";
import {
    PRINT_JACKET_SPEC,
    PRINT_SPEC,
    printCoverDirectory,
    printInteriorDirectory,
    printOutputRoot,
    repositoryRoot,
    totalInsideMarginIn,
} from "./print-book-config.mjs";

const execFileAsync = promisify(execFile);
const ghostscriptExecutable = "C:\\cygwin64\\bin\\gs.exe";
const manifestPath = path.join(printOutputRoot, "print-manifest.json");
const paginationPath = path.join(
    printInteriorDirectory,
    "pagination-report.json"
);
const interiorPdfPath = path.join(
    printInteriorDirectory,
    "fenton-collection-interior.pdf"
);
const interiorHtmlPath = path.join(printInteriorDirectory, "index.html");
const coverPdfPath = path.join(
    printCoverDirectory,
    "fenton-collection-dust-jacket.pdf"
);
const coverHtmlPath = path.join(printCoverDirectory, "index.html");
const coverSourceReportPath = path.join(
    printCoverDirectory,
    "cover-source-report.json"
);
const coverRenderReportPath = path.join(
    printCoverDirectory,
    "cover-render-report.json"
);
const pageReviewReportPath = path.join(
    printOutputRoot,
    "page-review",
    "report.json"
);

const EXPECTED_PAGE_TYPE_COUNTS = Object.freeze({
    "cover-title": 1,
    colophon: 1,
    "title-manifesto": 1,
    "how-to": 1,
    contents: 3,
    "collection-overview": 2,
    "recto-transition": 18,
    "group-opener": 4,
    "profile-opener": 36,
    "profile-record": 36,
    "profile-notes": 118,
    "collection-gallery": 56,
    "nursery-label-evidence": 21,
    "licensed-context": 36,
    closing: 1,
    "closing-verso": 1,
});

const errors = [];
const warnings = [];
const checks = [];

function record(name, passed, detail) {
    checks.push({ name, passed, detail });
    if (!passed) errors.push(`${name}: ${detail}`);
}

function closeEnough(left, right, tolerance = 0.05) {
    return Math.abs(left - right) <= tolerance;
}

function expectedBox(actual, expected) {
    return (
        closeEnough(actual.x, expected.x) &&
        closeEnough(actual.y, expected.y) &&
        closeEnough(actual.width, expected.width) &&
        closeEnough(actual.height, expected.height)
    );
}

function pathInside(parent, candidate) {
    const relative = path.relative(parent, candidate);
    return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function formatBytes(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

async function validatePdfPages(pdfPath, expectedPageCount, expected) {
    const bytes = await readFile(pdfPath);
    const document = await PDFDocument.load(bytes, {
        ignoreEncryption: false,
        updateMetadata: false,
    });
    record(
        `${expected.name} PDF page count`,
        document.getPageCount() === expectedPageCount,
        `found ${document.getPageCount()}; expected ${expectedPageCount}`
    );
    record(
        `${expected.name} PDF is not encrypted`,
        document.isEncrypted !== true,
        document.isEncrypted ? "encrypted" : "not encrypted"
    );
    const badPages = [];
    for (const [index, page] of document.getPages().entries()) {
        const boxes = {
            media: page.getMediaBox(),
            crop: page.getCropBox(),
            bleed: page.getBleedBox(),
        };
        if (
            !expectedBox(boxes.media, expected.media) ||
            !expectedBox(boxes.crop, expected.media) ||
            !expectedBox(boxes.bleed, expected.media)
        ) {
            badPages.push(index + 1);
            continue;
        }
        if (expected.trim) {
            if (
                !expectedBox(page.getTrimBox(), expected.trim) ||
                !expectedBox(page.getArtBox(), expected.trim)
            ) {
                badPages.push(index + 1);
            }
        }
    }
    record(
        `${expected.name} PDF page boxes`,
        badPages.length === 0,
        badPages.length
            ? `bad geometry on pages ${badPages.join(", ")}`
            : `${expected.media.width} × ${expected.media.height} pt on every page`
    );
    return { document, bytes };
}

async function ghostscriptValidation(pdfPath, name) {
    await execFileAsync(
        ghostscriptExecutable,
        [
            "-dNOSAFER",
            "-dBATCH",
            "-dNOPAUSE",
            "-dPDFSTOPONERROR",
            "-dQUIET",
            "-sDEVICE=nullpage",
            pdfPath,
        ],
        { windowsHide: true, timeout: 300_000, maxBuffer: 20 * 1024 * 1024 }
    );
    record(`${name} Ghostscript parse`, true, "completed without PDF errors");
}

async function inspectFonts(pdfPath) {
    const { stdout, stderr } = await execFileAsync(
        ghostscriptExecutable,
        [
            "-dNOSAFER",
            "-dNODISPLAY",
            "-q",
            `-sFile=${pdfPath}`,
            "-dDumpFontsUsed",
            "-dShowEmbeddedFonts",
            "C:\\cygwin64\\usr\\share\\ghostscript\\10.03.1\\lib\\pdf_info.ps",
        ],
        { windowsHide: true, timeout: 300_000, maxBuffer: 30 * 1024 * 1024 }
    );
    const output = `${stdout}\n${stderr}`;
    const names = [
        ...new Set(
            [...output.matchAll(/^([A-Z]{6}\+[^\s]+)\s+</gm)].map(
                (match) => match[1]
            )
        ),
    ].sort();
    record(
        "Interior PDF fonts are subset-named",
        names.length > 0,
        names.length
            ? `${names.length} subset font resources: ${names.join(", ")}`
            : "Ghostscript did not report any subset font resources"
    );
    return names;
}

async function auditBlankPages(pdfPath, pageCount) {
    const auditDirectory = path.join(printOutputRoot, "page-audit");
    await rm(auditDirectory, { recursive: true, force: true });
    await mkdir(auditDirectory, { recursive: true });
    await execFileAsync(
        ghostscriptExecutable,
        [
            "-dNOSAFER",
            "-dBATCH",
            "-dNOPAUSE",
            "-dQUIET",
            "-sDEVICE=pnggray",
            "-r12",
            `-sOutputFile=${path.join(auditDirectory, "page-%03d.png")}`,
            pdfPath,
        ],
        { windowsHide: true, timeout: 300_000, maxBuffer: 20 * 1024 * 1024 }
    );
    const files = (await readdir(auditDirectory))
        .filter((file) => file.endsWith(".png"))
        .sort();
    record(
        "Low-resolution page-audit render count",
        files.length === pageCount,
        `rendered ${files.length} of ${pageCount} pages`
    );
    const blankPages = [];
    for (const [index, file] of files.entries()) {
        const statistics = await sharp(path.join(auditDirectory, file)).stats();
        const channel = statistics.channels[0];
        if (channel.mean > 250 && channel.stdev < 3.2) {
            blankPages.push(index + 1);
        }
    }
    record(
        "No blank interior pages",
        blankPages.length === 0,
        blankPages.length
            ? `blank pages: ${blankPages.join(", ")}`
            : "all pages contain designed color or content"
    );
    return blankPages;
}

async function main() {
    const [
        manifest,
        pagination,
        coverSource,
        coverRender,
        pageReview,
        canonicalProfiles,
    ] = await Promise.all([
        readFile(manifestPath, "utf8").then(JSON.parse),
        readFile(paginationPath, "utf8").then(JSON.parse),
        readFile(coverSourceReportPath, "utf8").then(JSON.parse),
        readFile(coverRenderReportPath, "utf8").then(JSON.parse),
        readFile(pageReviewReportPath, "utf8").then(JSON.parse),
        loadProfiles(),
    ]);

    record(
        "Print-manifest schema",
        manifest.schema_version === 1,
        `schema ${manifest.schema_version}`
    );
    record(
        "Canonical profile count",
        manifest.counts.profiles === 36 && canonicalProfiles.length === 36,
        `${manifest.counts.profiles} manifest and ${canonicalProfiles.length} canonical profiles`
    );
    record(
        "Present and historical profile split",
        manifest.counts.present_profiles === 35 &&
            manifest.counts.historical_profiles === 1,
        `${manifest.counts.present_profiles} present; ${manifest.counts.historical_profiles} historical`
    );
    const canonicalSlugs = new Set(
        canonicalProfiles.map((profile) => profile.slug)
    );
    const manifestSlugs = new Set(
        manifest.profiles.map((profile) => profile.slug)
    );
    const missingProfiles = [...canonicalSlugs].filter(
        (slug) => !manifestSlugs.has(slug)
    );
    const extraProfiles = [...manifestSlugs].filter(
        (slug) => !canonicalSlugs.has(slug)
    );
    record(
        "Canonical profile coverage",
        missingProfiles.length === 0 && extraProfiles.length === 0,
        missingProfiles.length || extraProfiles.length
            ? `missing: ${missingProfiles.join(", ") || "none"}; extra: ${extraProfiles.join(", ") || "none"}`
            : "all 36 profile slugs are represented once"
    );

    const spec = manifest.print_spec;
    record(
        "Lulu product specification",
        spec.product === "Photo Book" &&
            spec.trimName === "US Letter portrait" &&
            spec.binding === "Hardcover Linen Wrap with Dust Jacket" &&
            spec.interior === "Premium Color" &&
            spec.paper === "80# White — Coated" &&
            spec.coverFinish === "Matte",
        `${spec.product}; ${spec.trimName}; ${spec.binding}; ${spec.interior}; ${spec.paper}; ${spec.coverFinish}`
    );
    record(
        "Final gutter threshold",
        totalInsideMarginIn(pagination.final_page_count) === 1,
        `${totalInsideMarginIn(pagination.final_page_count)} in inside margin for ${pagination.final_page_count} pages`
    );
    record(
        "Interior page count is printable and even",
        pagination.final_page_count >= 24 &&
            pagination.final_page_count <= 800 &&
            pagination.final_page_count % 2 === 0,
        `${pagination.final_page_count} pages`
    );
    const finalRectoMarkers = pagination.recto_layout?.final_markers ?? [];
    record(
        "All group and plant openers start on recto",
        pagination.recto_layout?.marker_count === 40 &&
            pagination.recto_layout?.all_openers_on_odd_pages === true &&
            finalRectoMarkers.length === 40 &&
            finalRectoMarkers.every(({ page }) => page % 2 === 1),
        `${finalRectoMarkers.length} openers audited; ${pagination.recto_layout?.inserted_transition_count ?? "unknown"} designed facing-page transitions inserted`
    );
    record(
        "Browser print readiness",
        pagination.html_report.ready === true &&
            pagination.html_report.imageFailures.length === 0 &&
            pagination.html_report.fixedPageOverflows.length === 0 &&
            pagination.html_report.boundedRegionOverflows.length === 0 &&
            pagination.html_report.consoleErrors.length === 0 &&
            pagination.html_report.finalLayout?.overflows.length === 0 &&
            pagination.html_report.finalFixedPageCount ===
                pagination.final_page_count,
        `${pagination.html_report.imageCount} image uses; ${pagination.html_report.fixedPageOverflows.length} fixed-page overflows; ${pagination.html_report.boundedRegionOverflows.length} bounded-region overflows; ${pagination.html_report.finalLayout?.overflows.length ?? "unknown"} final-layout overflows; ${pagination.html_report.consoleErrors.length} console errors`
    );
    const reviewedTypeEntries = Object.entries(pageReview.type_counts ?? {});
    const expectedTypeEntries = Object.entries(EXPECTED_PAGE_TYPE_COUNTS);
    const typeCountMismatches = expectedTypeEntries.filter(
        ([type, count]) => pageReview.type_counts?.[type] !== count
    );
    const unexpectedTypes = reviewedTypeEntries.filter(
        ([type]) => !(type in EXPECTED_PAGE_TYPE_COUNTS)
    );
    record(
        "Exhaustive page-review identity",
        pageReview.schema_version === 1 &&
            pageReview.pdf_sha256 === pagination.output_sha256 &&
            pageReview.page_count === pagination.final_page_count &&
            pageReview.expected_page_count === pagination.final_page_count &&
            pageReview.all_pages_rendered === true,
        `schema ${pageReview.schema_version}; ${pageReview.page_count}/${pagination.final_page_count} pages; PDF ${pageReview.pdf_sha256 === pagination.output_sha256 ? "hash matches" : "hash mismatch"}`
    );
    record(
        "Exhaustive page-review classifications",
        typeCountMismatches.length === 0 &&
            unexpectedTypes.length === 0 &&
            expectedTypeEntries.reduce((sum, [, count]) => sum + count, 0) ===
                pagination.final_page_count,
        typeCountMismatches.length || unexpectedTypes.length
            ? `mismatches: ${typeCountMismatches.map(([type, count]) => `${type} expected ${count}, found ${pageReview.type_counts?.[type] ?? "missing"}`).join("; ") || "none"}; unexpected: ${unexpectedTypes.map(([type]) => type).join(", ") || "none"}`
            : `${expectedTypeEntries.length} page types account for all ${pagination.final_page_count} pages`
    );
    record(
        "Exhaustive page-review findings",
        pageReview.flagged_pages.length === 0 &&
            pageReview.unclassified_pages.length === 0 &&
            pageReview.blank_pages.length === 0 &&
            pageReview.duplicate_page_groups.length === 0 &&
            pageReview.contact_sheets.length ===
                Math.ceil(pagination.final_page_count / 16),
        `${pageReview.flagged_pages.length} flagged; ${pageReview.unclassified_pages.length} unclassified; ${pageReview.blank_pages.length} blank; ${pageReview.duplicate_page_groups.length} duplicate groups; ${pageReview.contact_sheets.length} contact sheets`
    );

    const stagedFailures = [];
    const ppiFailures = [];
    const webpOutputs = [];
    const enlargementFailures = [];
    for (const image of manifest.images) {
        const stagedPath = path.resolve(printOutputRoot, image.staged_path);
        if (!pathInside(printOutputRoot, stagedPath)) {
            stagedFailures.push(`${image.id}: out-of-scope path`);
            continue;
        }
        try {
            const stagedStats = await stat(stagedPath);
            if (!stagedStats.isFile() || stagedStats.size === 0) {
                stagedFailures.push(`${image.id}: empty or non-file output`);
            }
        } catch {
            stagedFailures.push(`${image.id}: missing output`);
        }
        if (
            image.effective_ppi < PRINT_SPEC.minimumImagePpi - 0.1 ||
            image.effective_ppi > PRINT_SPEC.maximumImagePpi + 0.1
        ) {
            ppiFailures.push(`${image.id}: ${image.effective_ppi} PPI`);
        }
        if (
            image.staged_format === "webp" ||
            image.staged_path.toLowerCase().endsWith(".webp")
        ) {
            webpOutputs.push(image.id);
        }
        if (image.enlarged) enlargementFailures.push(image.id);
    }
    record(
        "Staged print-image files",
        stagedFailures.length === 0,
        stagedFailures.length
            ? stagedFailures.join("; ")
            : `${manifest.images.length} nonempty staged variants`
    );
    record(
        "Effective image resolution",
        ppiFailures.length === 0,
        ppiFailures.length
            ? ppiFailures.join("; ")
            : `${Math.min(...manifest.images.map((image) => image.effective_ppi))}–${Math.max(...manifest.images.map((image) => image.effective_ppi))} PPI`
    );
    record(
        "No staged WebP printer masters",
        webpOutputs.length === 0,
        webpOutputs.length
            ? webpOutputs.join(", ")
            : "all printer masters are JPEG or vector SVG"
    );
    record(
        "No raster enlargement",
        enlargementFailures.length === 0,
        enlargementFailures.length
            ? enlargementFailures.join(", ")
            : `all ${manifest.images.length} staged variants are at or below source pixel dimensions`
    );

    const [interiorHtml, coverHtml] = await Promise.all([
        readFile(interiorHtmlPath, "utf8"),
        readFile(coverHtmlPath, "utf8"),
    ]);
    const remoteImageReferences = [interiorHtml, coverHtml].flatMap((html) => [
        ...html.matchAll(/<img\b[^>]*\bsrc=["']https?:/gi),
    ]);
    const webpImageReferences = [interiorHtml, coverHtml].flatMap((html) => [
        ...html.matchAll(
            /<img\b[^>]*\bsrc=["'][^"']+\.webp(?:[?#][^"']*)?["']/gi
        ),
    ]);
    record(
        "No remote raster dependencies",
        remoteImageReferences.length === 0,
        `${remoteImageReferences.length} remote image references`
    );
    record(
        "No WebP image references",
        webpImageReferences.length === 0,
        `${webpImageReferences.length} WebP image references`
    );
    record(
        "Generated HTML profile coverage",
        (interiorHtml.match(/class="print-profile"/g) ?? []).length === 36,
        `${(interiorHtml.match(/class="print-profile"/g) ?? []).length} profile articles`
    );

    const interiorExpected = {
        name: "Interior",
        media: { x: 0, y: 0, width: 630, height: 810 },
        trim: { x: 9, y: 9, width: 612, height: 792 },
    };
    const coverExpected = {
        name: "Dust-jacket",
        media: {
            x: 0,
            y: 0,
            width: PRINT_JACKET_SPEC.widthPt,
            height: PRINT_JACKET_SPEC.heightPt,
        },
    };
    const [{ bytes: interiorBytes }, { bytes: coverBytes }] = await Promise.all(
        [
            validatePdfPages(
                interiorPdfPath,
                pagination.final_page_count,
                interiorExpected
            ),
            validatePdfPages(coverPdfPath, 1, coverExpected),
        ]
    );
    record(
        "Exact custom jacket assignment",
        coverSource.page_count === pagination.final_page_count &&
            coverSource.page_count === PRINT_JACKET_SPEC.pageCount &&
            closeEnough(
                coverSource.jacket_spec.spineWidthIn,
                PRINT_JACKET_SPEC.spineWidthIn
            ) &&
            coverSource.template_file ===
                `lulu-template/${PRINT_JACKET_SPEC.templateFile}` &&
            coverRender.interior_page_count === pagination.final_page_count &&
            closeEnough(
                coverRender.spine_width_in,
                PRINT_JACKET_SPEC.spineWidthIn
            ),
        `${coverSource.page_count} pages; ${coverSource.jacket_spec.spineWidthIn} in spine; template ${coverSource.template_sha256}`
    );
    record(
        "PDF file integrity hashes",
        pagination.output_size_bytes === interiorBytes.length &&
            coverRender.output_size_bytes === coverBytes.length,
        `interior ${formatBytes(interiorBytes.length)}; jacket ${formatBytes(coverBytes.length)}`
    );

    try {
        await ghostscriptValidation(interiorPdfPath, "Interior PDF");
        await ghostscriptValidation(coverPdfPath, "Dust-jacket PDF");
    } catch (error) {
        record("Ghostscript PDF validation", false, error.message);
    }
    let fonts = [];
    try {
        fonts = await inspectFonts(interiorPdfPath);
    } catch (error) {
        record("Interior PDF font audit", false, error.message);
    }
    let blankPages = [];
    try {
        blankPages = await auditBlankPages(
            interiorPdfPath,
            pagination.final_page_count
        );
    } catch (error) {
        record("Interior blank-page audit", false, error.message);
    }

    const report = {
        generated_on: "2026-09-03",
        status: errors.length ? "failed" : "passed",
        product: {
            product: spec.product,
            trim: spec.trimName,
            binding: spec.binding,
            interior: spec.interior,
            paper: spec.paper,
            cover_finish: spec.coverFinish,
            page_count: pagination.final_page_count,
            spine_width_in: coverSource.jacket_spec.spineWidthIn,
        },
        artifacts: {
            interior_pdf: {
                path: "interior/fenton-collection-interior.pdf",
                size_bytes: interiorBytes.length,
                sha256: pagination.output_sha256,
            },
            dust_jacket_pdf: {
                path: "cover/fenton-collection-dust-jacket.pdf",
                size_bytes: coverBytes.length,
                sha256: coverRender.output_sha256,
            },
            lulu_template: {
                path: coverSource.template_file,
                sha256: coverSource.template_sha256,
            },
        },
        images: {
            staged_variants: manifest.images.length,
            minimum_ppi: Math.min(
                ...manifest.images.map((image) => image.effective_ppi)
            ),
            maximum_ppi: Math.max(
                ...manifest.images.map((image) => image.effective_ppi)
            ),
            enlarged: enlargementFailures.length,
            staged_webp: webpOutputs.length,
        },
        fonts,
        blank_pages: blankPages,
        page_review: {
            report: "page-review/report.json",
            pdf_sha256: pageReview.pdf_sha256,
            pages_reviewed: pageReview.page_count,
            contact_sheets: pageReview.contact_sheets.length,
            type_counts: pageReview.type_counts,
            flagged_pages: pageReview.flagged_pages,
            unclassified_pages: pageReview.unclassified_pages,
            duplicate_page_groups: pageReview.duplicate_page_groups,
        },
        checks,
        warnings,
        errors,
    };
    const markdown = `# The Fenton Collection — print preflight\n\n**Status:** ${report.status.toUpperCase()}  \n**Generated:** ${report.generated_on}\n\n## Product\n\n- ${spec.product}, ${spec.trimName}\n- ${spec.binding}\n- ${spec.interior} on ${spec.paper}\n- ${spec.coverFinish} jacket finish\n- ${pagination.final_page_count} interior pages; ${coverSource.jacket_spec.spineWidthIn} in spine\n\n## Artifacts\n\n| Artifact | Size | SHA-256 |\n| --- | ---: | --- |\n| Interior PDF | ${formatBytes(interiorBytes.length)} | \`${pagination.output_sha256}\` |\n| Dust-jacket PDF | ${formatBytes(coverBytes.length)} | \`${coverRender.output_sha256}\` |\n| Exact Lulu template | ${formatBytes((await stat(path.join(printOutputRoot, coverSource.template_file))).size)} | \`${coverSource.template_sha256}\` |\n\n## Checks\n\n| Check | Result | Detail |\n| --- | --- | --- |\n${checks
        .map(
            (check) =>
                `| ${check.name.replaceAll("|", "\\|")} | ${check.passed ? "PASS" : "FAIL"} | ${String(check.detail).replaceAll("|", "\\|").replaceAll("\n", " ")} |`
        )
        .join(
            "\n"
        )}\n\n## Page and image audit\n\n- Exhaustive raster/text review: ${pageReview.page_count}/${pagination.final_page_count} pages across ${pageReview.contact_sheets.length} contact sheets; ${pageReview.flagged_pages.length} flagged, ${pageReview.unclassified_pages.length} unclassified, ${pageReview.duplicate_page_groups.length} duplicate groups.\n- Classified page types: ${Object.entries(
        pageReview.type_counts
    )
        .map(([type, count]) => `${type} ${count}`)
        .join(
            ", "
        )}.\n- Image masters: ${manifest.images.length} variants, ${report.images.minimum_ppi}–${report.images.maximum_ppi} effective PPI.\n- Enlarged sources: ${report.images.enlarged}.\n- WebP printer masters: ${report.images.staged_webp}.\n- Blank pages detected: ${blankPages.length ? blankPages.join(", ") : "none"}.\n- Font resources reported by Ghostscript: ${fonts.join(", ") || "none"}.\n\n## Boundary\n\nThis is a local inspection package. Neither PDF has been uploaded to Lulu, and no project, proof order, or publication has been created.\n`;
    await Promise.all([
        writeFile(
            path.join(printOutputRoot, "preflight-report.json"),
            `${JSON.stringify(report, null, 2)}\n`,
            "utf8"
        ),
        writeFile(
            path.join(printOutputRoot, "preflight-report.md"),
            markdown,
            "utf8"
        ),
    ]);

    if (errors.length) {
        throw new Error(
            `Print preflight failed with ${errors.length} error(s):\n- ${errors.join("\n- ")}`
        );
    }
    console.log(
        `[print-book] Preflight passed: ${pagination.final_page_count} interior pages, ${manifest.images.length} image variants, ${pageReview.page_count} pages exhaustively reviewed, ${blankPages.length} blank pages.`
    );
}

await main();
