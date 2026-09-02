import {
    copyFile,
    mkdir,
    readFile,
    rm,
    stat,
    writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const bookletDirectory = path.join(repositoryRoot, "docs", "plant-booklet");
const layoutsDirectory = path.join(repositoryRoot, "docs", "layouts");
const outputDirectory = path.join(repositoryRoot, ".pages-site");
const repositoryBlobUrl = "https://github.com/Nick2bad4u/Gardening/blob/main";
const pagesUrl = "https://nick2bad4u.github.io/Gardening/";
const googleTagManagerId = "GTM-T8J6HPLF";
const optimizedPlantImageWidths = [
    480,
    960,
    1440,
];
const layoutFileNames = [
    "grow-spot-layout.html",
    "indoor-acclimation-calendar.html",
    "plant-tracker.html",
    "plant-history.html",
    "photo-album.html",
];

async function copyRelativeFile(relativePath) {
    const source = path.join(repositoryRoot, relativePath);
    const destination = path.join(outputDirectory, relativePath);
    const sourceStats = await stat(source);

    if (!sourceStats.isFile()) {
        throw new Error(`Pages asset is not a file: ${relativePath}`);
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
    return sourceStats.size;
}

function githubBlob(relativePath) {
    return `${repositoryBlobUrl}/${relativePath}`;
}

function addCanonical(html, url) {
    return html.replace(
        "</title>",
        `</title>\n        <link rel="canonical" href="${url}">`
    );
}

function injectGoogleTagManager(html) {
    if (
        html.includes("<!-- Google Tag Manager -->") ||
        html.includes(`ns.html?id=${googleTagManagerId}`)
    ) {
        throw new Error(
            "Google Tag Manager is already present in source HTML."
        );
    }

    const headSnippet = `<!-- Google Tag Manager -->
        <script>
            ((w, d, s, l, i) => {
                w[l] = w[l] || [];
                w[l].push({ "gtm.start": Date.now(), event: "gtm.js" });
                const firstScript = d.getElementsByTagName(s)[0];
                const tagManagerScript = d.createElement(s);
                const dataLayerQuery = l === "dataLayer" ? "" : "&l=" + l;
                tagManagerScript.async = true;
                tagManagerScript.src =
                    "https:" +
                    "//www.googletagmanager.com" +
                    "/gtm.js?id=" +
                    i +
                    dataLayerQuery;
                firstScript.parentNode.insertBefore(
                    tagManagerScript,
                    firstScript
                );
            })(window, document, "script", "dataLayer", "${googleTagManagerId}");
        </script>
        <!-- End Google Tag Manager -->`;
    const bodySnippet = `<!-- Google Tag Manager (noscript) -->
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${googleTagManagerId}" title="Google Tag Manager" height="0" width="0" style="display: none; visibility: hidden" aria-hidden="true" tabindex="-1"></iframe></noscript>
        <!-- End Google Tag Manager (noscript) -->`;
    const withHead = html.replace("<head>", `<head>\n        ${headSnippet}`);
    const withBody = withHead.replace(
        /<body([^>]*)>/,
        `<body$1>\n        ${bodySnippet}`
    );

    if (
        withBody === html ||
        !withBody.includes(`ns.html?id=${googleTagManagerId}`)
    ) {
        throw new Error("Could not inject both Google Tag Manager snippets.");
    }
    return withBody;
}

function injectPageNotFoundEvent(html) {
    if (html.includes('event: "page_not_found"')) {
        throw new Error("The page-not-found event is already present.");
    }

    const eventSnippet = `<script>
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: "page_not_found",
                http_status: 404,
                page_location: window.location.href,
                page_path:
                    window.location.pathname +
                    window.location.search +
                    window.location.hash,
                page_referrer: document.referrer,
                page_title: document.title,
            });
        </script>`;
    const withEvent = html.replace(
        "</head>",
        `        ${eventSnippet}\n    </head>`
    );

    if (withEvent === html) {
        throw new Error("Could not inject the page-not-found event.");
    }
    return withEvent;
}

function optimizedPlantImagePath(relativePath, width) {
    const extension = path.posix.extname(relativePath);
    return `${relativePath.slice(0, -extension.length)}.w${width}.webp`;
}

async function optimizePlantImage(relativePath) {
    const sourcePath = path.join(repositoryRoot, relativePath);
    const metadata = await sharp(sourcePath).metadata();
    const rotated = [
        5,
        6,
        7,
        8,
    ].includes(metadata.orientation);
    const sourceWidth = rotated ? metadata.height : metadata.width;
    if (!sourceWidth) {
        throw new Error(`Could not read image width: ${relativePath}`);
    }

    const widths = [
        ...new Set([
            ...optimizedPlantImageWidths.filter((width) => width < sourceWidth),
            Math.min(sourceWidth, optimizedPlantImageWidths.at(-1)),
        ]),
    ].sort((left, right) => left - right);
    const variants = [];

    for (const width of widths) {
        const outputRelativePath = optimizedPlantImagePath(relativePath, width);
        const outputPath = path.join(outputDirectory, outputRelativePath);
        await mkdir(path.dirname(outputPath), { recursive: true });
        const result = await sharp(sourcePath, { failOn: "warning" })
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .webp({
                alphaQuality: 90,
                effort: 4,
                quality: 80,
                smartSubsample: true,
            })
            .toFile(outputPath);
        variants.push({
            bytes: result.size,
            path: outputRelativePath.replaceAll("\\", "/"),
            width: result.width,
        });
    }

    return { relativePath, variants };
}

async function mapWithConcurrency(values, concurrency, operation) {
    const results = new Array(values.length);
    let nextIndex = 0;
    async function worker() {
        while (nextIndex < values.length) {
            const index = nextIndex;
            nextIndex += 1;
            results[index] = await operation(values[index]);
        }
    }
    await Promise.all(
        Array.from({ length: Math.min(concurrency, values.length) }, worker)
    );
    return results;
}

async function optimizePlantImages(relativePaths) {
    const records = await mapWithConcurrency(
        [...relativePaths].sort(),
        4,
        optimizePlantImage
    );
    return new Map(records.map((record) => [record.relativePath, record]));
}

function rewritePublishedPlantImages(html, optimizedImages) {
    return html.replaceAll(/<img\b[^>]*>/g, (imageTag) => {
        const source = imageTag.match(
            /\bsrc="((?:\.\.?\/)+)(assets\/plants\/[^"?#]+)"/
        );
        if (!source) return imageTag;

        const [
            ,
            prefix,
            relativePath,
        ] = source;
        const record = optimizedImages.get(relativePath);
        if (!record?.variants.length) {
            throw new Error(
                `No optimized publication image exists for ${relativePath}.`
            );
        }
        const largest = record.variants.at(-1);
        const srcset = record.variants
            .map((variant) => `${prefix}${variant.path} ${variant.width}w`)
            .join(", ");
        let rewritten = imageTag.replace(
            source[0],
            `src="${prefix}${largest.path}"`
        );
        if (/\bsrcset=/.test(rewritten)) {
            throw new Error(
                `Plant image already has a srcset: ${relativePath}.`
            );
        }
        const responsiveAttributes = ` srcset="${srcset}"${/\bsizes=/.test(rewritten) ? "" : ' sizes="100vw"'}`;
        rewritten = rewritten.replace(/\s*\/?>$/, (ending) =>
            ending.startsWith(" /")
                ? `${responsiveAttributes} />`
                : `${responsiveAttributes}>`
        );
        return rewritten;
    });
}

function assertPublishedAnalytics(html, context) {
    const containerReferences = html.match(new RegExp(googleTagManagerId, "g"));
    const hasScriptLoader =
        html.includes("//www.googletagmanager.com") &&
        html.includes('"/gtm.js?id="');
    if (
        containerReferences?.length !== 2 ||
        !hasScriptLoader ||
        !html.includes("googletagmanager.com/ns.html")
    ) {
        throw new Error(`${context} does not contain exactly one GTM install.`);
    }
}

async function publishLayout(fileName, optimizedImages) {
    const sourceHtml = await readFile(
        path.join(layoutsDirectory, fileName),
        "utf8"
    );
    let publishedHtml = addCanonical(
        sourceHtml,
        `${pagesUrl}layouts/${fileName}`
    )
        .replaceAll("../plant-booklet/", "../")
        .replaceAll(
            /\b(src|href)="\.\.\/\.\.\/(assets\/collection-photos\/[^"?#]+)"/g,
            '$1="../$2"'
        )
        .replaceAll(
            /href="\.\.\/equipment\/([^"?#]+\.md)"/g,
            (_match, relativePath) =>
                `href="${githubBlob(`docs/equipment/${relativePath}`)}"`
        )
        .replaceAll(
            /\b(src|href)="\.\.\/\.\.\/(assets\/plants\/[^"?#]+)"/g,
            '$1="../$2"'
        );

    publishedHtml = rewritePublishedPlantImages(publishedHtml, optimizedImages);
    publishedHtml = injectGoogleTagManager(publishedHtml);
    assertPublishedAnalytics(publishedHtml, fileName);

    if (/\.\.\/plant-booklet\//.test(publishedHtml)) {
        throw new Error(
            `${fileName} still contains an unpublished booklet path.`
        );
    }

    const destination = path.join(outputDirectory, "layouts", fileName);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, publishedHtml, "utf8");
}

async function publishPlantHistoryClient() {
    const sourcePath = path.join(layoutsDirectory, "plant-history.js");
    const publishedScript = (await readFile(sourcePath, "utf8")).replaceAll(
        "../plant-booklet/#",
        "../#"
    );

    if (/\.\.\/plant-booklet\//.test(publishedScript)) {
        throw new Error(
            "plant-history.js still contains an unpublished booklet path."
        );
    }

    await writeFile(
        path.join(outputDirectory, "layouts", "plant-history.js"),
        publishedScript,
        "utf8"
    );
}

async function main() {
    const [
        sourceHtml,
        loggerSource,
        ...layoutSources
    ] = await Promise.all([
        readFile(path.join(bookletDirectory, "index.html"), "utf8"),
        readFile(
            path.join(
                repositoryRoot,
                "scripts",
                "google-sheets",
                "plant-tracker.gs"
            ),
            "utf8"
        ),
        ...layoutFileNames.map((fileName) =>
            readFile(path.join(layoutsDirectory, fileName), "utf8")
        ),
    ]);
    const pageAssetReferences = [sourceHtml, ...layoutSources]
        .flatMap((html) => [
            ...html.matchAll(
                /\bsrc="\.\.\/\.\.\/(assets\/(?:plants|collection-photos)\/[^"?#]+)"/g
            ),
        ])
        .map((match) => match[1]);
    const loggerAssetReferences = [
        ...loggerSource.matchAll(
            /https:\/\/nick2bad4u\.github\.io\/Gardening\/(assets\/(?:collection-photos|nursery-labels)\/[^"?#]+\.(?:jpe?g|png|webp))/gi
        ),
    ].map((match) => match[1]);
    const plantImageReferences = new Set(
        pageAssetReferences.filter((reference) =>
            reference.startsWith("assets/plants/")
        )
    );
    const assetReferences = new Set([
        ...pageAssetReferences.filter(
            (reference) => !reference.startsWith("assets/plants/")
        ),
        ...loggerAssetReferences,
    ]);

    let publishedHtml = addCanonical(sourceHtml, pagesUrl)
        .replaceAll(/href="\.\.\/layouts\//g, 'href="./layouts/')
        .replaceAll(
            /href="\.\.\/plants\/([^"?#]+)"/g,
            (_match, relativePath) =>
                `href="${githubBlob(`docs/plants/${relativePath}`)}"`
        )
        .replaceAll(
            /href="\.\.\/\.\.\/assets\/plants\/([^"?#]+\/README\.md)"/g,
            (_match, relativePath) =>
                `href="${githubBlob(`assets/plants/${relativePath}`)}"`
        )
        .replaceAll(
            /href="\.\.\/\.\.\/(assets\/(?:measurements|nursery-labels)\/[^"?#]+)"/g,
            (_match, relativePath) => `href="${githubBlob(relativePath)}"`
        )
        .replaceAll(
            /href="\.\.\/\.\.\/(assets\/collection-photos\/[^"?#]+\.(?:jpe?g|png))"/gi,
            (_match, relativePath) => `href="${githubBlob(relativePath)}"`
        )
        .replaceAll(
            /\b(src|href)="\.\.\/\.\.\/(assets\/collection-photos\/[^"?#]+)"/g,
            '$1="./$2"'
        )
        .replaceAll(
            /\b(src|href)="\.\.\/\.\.\/(assets\/plants\/[^"?#]+)"/g,
            '$1="./$2"'
        );

    if (/\.\.\/\.\.\/assets\//.test(publishedHtml)) {
        throw new Error(
            "The Pages HTML still contains an unpublished asset reference."
        );
    }

    await rm(outputDirectory, { recursive: true, force: true });
    await mkdir(outputDirectory, { recursive: true });
    await mkdir(path.join(outputDirectory, "layouts"), { recursive: true });

    const optimizedImages = await optimizePlantImages(plantImageReferences);
    publishedHtml = rewritePublishedPlantImages(publishedHtml, optimizedImages);
    publishedHtml = injectGoogleTagManager(publishedHtml);
    assertPublishedAnalytics(publishedHtml, "field-guide index");
    const notFoundHtml = injectPageNotFoundEvent(publishedHtml);
    assertPublishedAnalytics(notFoundHtml, "field-guide 404");

    for (const reference of plantImageReferences) {
        if (publishedHtml.includes(`src="./${reference}"`)) {
            throw new Error(
                `The Pages HTML still loads an original plant image: ${reference}`
            );
        }
    }

    let assetBytes = [...optimizedImages.values()]
        .flatMap((record) => record.variants)
        .reduce((sum, variant) => sum + variant.bytes, 0);
    for (const relativePath of assetReferences) {
        assetBytes += await copyRelativeFile(relativePath);
    }

    await Promise.all([
        copyFile(
            path.join(bookletDirectory, "booklet.css"),
            path.join(outputDirectory, "booklet.css")
        ),
        copyFile(
            path.join(bookletDirectory, "booklet.js"),
            path.join(outputDirectory, "booklet.js")
        ),
        copyFile(
            path.join(bookletDirectory, "favicon.svg"),
            path.join(outputDirectory, "favicon.svg")
        ),
        copyFile(
            path.join(bookletDirectory, "plant-icons.svg"),
            path.join(outputDirectory, "plant-icons.svg")
        ),
        copyFile(
            path.join(bookletDirectory, "cactus-cursor.svg"),
            path.join(outputDirectory, "cactus-cursor.svg")
        ),
        writeFile(
            path.join(outputDirectory, "index.html"),
            publishedHtml,
            "utf8"
        ),
        writeFile(path.join(outputDirectory, "404.html"), notFoundHtml, "utf8"),
        writeFile(path.join(outputDirectory, ".nojekyll"), "", "utf8"),
        ...layoutFileNames.map((fileName) =>
            publishLayout(fileName, optimizedImages)
        ),
        copyFile(
            path.join(layoutsDirectory, "plant-tracker.css"),
            path.join(outputDirectory, "layouts", "plant-tracker.css")
        ),
        copyFile(
            path.join(layoutsDirectory, "plant-tracker-data.js"),
            path.join(outputDirectory, "layouts", "plant-tracker-data.js")
        ),
        copyFile(
            path.join(layoutsDirectory, "plant-tracker.js"),
            path.join(outputDirectory, "layouts", "plant-tracker.js")
        ),
        publishPlantHistoryClient(),
        copyFile(
            path.join(layoutsDirectory, "plant-charts.js"),
            path.join(outputDirectory, "layouts", "plant-charts.js")
        ),
        copyFile(
            path.join(layoutsDirectory, "plant-profile-data.json"),
            path.join(outputDirectory, "layouts", "plant-profile-data.json")
        ),
    ]);

    console.log(
        `Built GitHub Pages artifact with GTM ${googleTagManagerId}, the field guide, five collection tools, ${optimizedImages.size} responsive plant-image sets, and ${assetReferences.size} copied evidence images (${(assetBytes / 1024 / 1024).toFixed(1)} MiB total).`
    );
}

const isDirectRun =
    process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) await main();

export {
    injectGoogleTagManager,
    injectPageNotFoundEvent,
    rewritePublishedPlantImages,
};
