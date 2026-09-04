import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

export const repositoryRoot = path.resolve(scriptDirectory, "..");
export const printOutputRoot = path.join(repositoryRoot, ".print-output");
export const printInteriorDirectory = path.join(printOutputRoot, "interior");
export const printAssetDirectory = path.join(printOutputRoot, "print-assets");
export const printCoverDirectory = path.join(printOutputRoot, "cover");
export const proofPagesDirectory = path.join(printOutputRoot, "proof-pages");

export const PRINT_SPEC = Object.freeze({
    product: "Photo Book",
    trimName: "US Letter portrait",
    trimWidthIn: 8.5,
    trimHeightIn: 11,
    bleedIn: 0.125,
    pageWidthIn: 8.75,
    pageHeightIn: 11.25,
    pageWidthPt: 630,
    pageHeightPt: 810,
    trimInsetPt: 9,
    binding: "Hardcover Linen Wrap with Dust Jacket",
    interior: "Premium Color",
    paper: "80# White — Coated",
    coverFinish: "Matte",
    imagePpi: 420,
    minimumImagePpi: 300,
    maximumImagePpi: 600,
    luluCalculatorUrl: "https://www.lulu.com/pricing",
    luluGuideUrl:
        "https://assets.lulu.com/media/guides/en/lulu-book-creation-guide.pdf",
    luluTemplateUrl:
        "https://assets.lulu.com/media/templates/book/lulu-book-template-us-letter.zip",
});

// Measured from Lulu's custom 336-page Photo Book jacket template. The front
// cover and front flap move with the spine width; the back-side geometry does
// not. Keep this as the single source of truth for jacket generation and QA.
export const PRINT_JACKET_SPEC = Object.freeze({
    pageCount: 336,
    widthIn: 25.819444,
    heightIn: 11.75,
    widthPt: 1859,
    heightPt: 846,
    spineWidthIn: 1.069444,
    flapWidthIn: 3.25,
    templateFile: "cover-template-336-pages.pdf",
    backFlapLeftIn: 0.25,
    backCoverLeftIn: 3.625,
    frontCoverLeftIn: 13.444444,
    frontFlapLeftIn: 22.194444,
    backFlapLiveArea: {
        leftIn: 0.75,
        topIn: 0.75,
        widthIn: 2.25,
        heightIn: 10.25,
    },
    backCoverLiveArea: {
        leftIn: 4.25,
        topIn: 0.75,
        widthIn: 7.625,
        heightIn: 10.25,
    },
    spineArea: {
        leftIn: 12.375,
        topIn: 0.25,
        widthIn: 1.069444,
        heightIn: 11.25,
    },
    frontCoverLiveArea: {
        leftIn: 13.944444,
        topIn: 0.75,
        widthIn: 7.625,
        heightIn: 10.25,
    },
    frontFlapLiveArea: {
        leftIn: 22.819444,
        topIn: 0.75,
        widthIn: 2.25,
        heightIn: 10.25,
    },
});

export function totalInsideMarginIn(pageCount) {
    if (pageCount <= 60) return 0.5;
    if (pageCount <= 150) return 0.625;
    if (pageCount <= 400) return 1;
    if (pageCount <= 600) return 1.125;
    return 1.25;
}
