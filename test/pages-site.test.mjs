import * as path from "node:path";
import { describe, expect, it } from "vitest";

import {
    addCanonical,
    containedPath,
    findLoggerAssetReferences,
    injectGoogleTagManager,
    injectPageNotFoundEvent,
    rewritePublishedPlantImages,
} from "../scripts/build-pages-site.mjs";

describe("the GitHub Pages publication transforms", () => {
    it("accepts formatted HTML tags and rejects missing injection targets", () => {
        expect.hasAssertions();

        const source =
            '<HTML><HEAD data-preview="garden"><TITLE>Garden</TITLE ></HEAD ><BODY class="reader"><main>Plants</main></BODY></HTML>';
        const canonical = addCanonical(source, "https://example.com/garden/");
        const output = injectPageNotFoundEvent(
            injectGoogleTagManager(canonical)
        );

        expect(output).toContain('<HEAD data-preview="garden">\n');
        expect(output).toContain(
            '<link rel="canonical" href="https://example.com/garden/">'
        );
        expect(output.match(/GTM-T8J6HPLF/gv)).toHaveLength(2);
        expect(output).toContain('event: "page_not_found"');
        expect(() =>
            addCanonical("<head></head>", "https://example.com/")
        ).toThrow(/canonical URL/v);
        expect(() => injectGoogleTagManager("<body></body>")).toThrow(
            /both Google Tag Manager snippets/v
        );
        expect(() => injectGoogleTagManager("<head></head>")).toThrow(
            /both Google Tag Manager snippets/v
        );
        expect(() => injectPageNotFoundEvent("<body></body>")).toThrow(
            /page-not-found event/v
        );
    });

    it("keeps asset paths inside the output directory without rejecting dot-prefixed filenames", () => {
        expect.hasAssertions();

        const directory = path.resolve(".pages-site");

        expect(containedPath(directory, "assets/../assets/plant.svg")).toBe(
            path.join(directory, "assets/plant.svg")
        );
        expect(containedPath(`${directory}${path.sep}`, "..portrait.svg")).toBe(
            path.join(directory, "..portrait.svg")
        );

        for (const outside of [
            "..",
            "../.pages-site-sibling/photo.jpg",
            path.resolve("outside.jpg"),
            ".",
        ]) {
            expect(() => containedPath(directory, outside)).toThrow(
                /leaves its directory/v
            );
        }
    });

    it("finds logger assets under the configured Pages base and preserves their filename casing", () => {
        expect.hasAssertions();

        const source =
            '"https://nick2bad4u.github.io/gardening/assets/collection-photos/P01.jpg" "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/P02.webp?raw=1" "https://example.com/assets/collection-photos/other.jpg"';

        expect(findLoggerAssetReferences(source)).toStrictEqual([
            "assets/collection-photos/P01.jpg",
            "assets/nursery-labels/P02.webp",
        ]);
        expect(
            findLoggerAssetReferences(
                '"https://example.com/garden.v2/assets/collection-photos/new.png" "https://example.com/gardenXv2/assets/collection-photos/other.png"',
                "https://example.com/garden.v2/"
            )
        ).toStrictEqual(["assets/collection-photos/new.png"]);
    });

    it("installs the production GTM container once in the head and body", () => {
        expect.hasAssertions();

        const output = injectGoogleTagManager(
            "<!doctype html><html><head><title>Garden</title></head><body><main>Plants</main></body></html>"
        );

        expect(output.match(/GTM-T8J6HPLF/gv)).toHaveLength(2);
        expect(output).toContain("https://www.googletagmanager.com");
        expect(output).toContain('"/gtm.js?id="');
        expect(output).toContain(
            "https://www.googletagmanager.com/ns.html?id=GTM-T8J6HPLF"
        );
        expect(output.indexOf("gtm.js")).toBeLessThan(
            output.indexOf("</head>")
        );
        expect(output.indexOf("ns.html")).toBeGreaterThan(
            output.indexOf("<body>")
        );
    });

    it("refuses to install a duplicate GTM container", () => {
        expect.hasAssertions();

        const installed = injectGoogleTagManager(
            "<html><head></head><body></body></html>"
        );

        expect(() => injectGoogleTagManager(installed)).toThrow(
            /already present/v
        );
    });

    it("marks only the generated 404 entry point with an explicit event", () => {
        expect.hasAssertions();

        const indexHtml = injectGoogleTagManager(
            "<!doctype html><html><head><title>Garden</title></head><body><main>Plants</main></body></html>"
        );
        const notFoundHtml = injectPageNotFoundEvent(indexHtml);

        expect(indexHtml).not.toContain('event: "page_not_found"');
        expect(notFoundHtml.match(/event: "page_not_found"/gv)).toHaveLength(1);
        expect(notFoundHtml).toContain("http_status: 404");
        expect(notFoundHtml).toContain("page_location: window.location.href");
        expect(notFoundHtml).toContain("page_referrer: document.referrer");
        expect(notFoundHtml).toContain("page_title: document.title");
        expect(() => injectPageNotFoundEvent(notFoundHtml)).toThrow(
            /already present/v
        );
    });

    it("rewrites local reference images to responsive publication WebPs", () => {
        expect.hasAssertions();

        const source = "assets/plants/example/reference.jpg";
        const images = new Map([
            [
                source,
                {
                    relativePath: source,
                    variants: [
                        {
                            bytes: 1200,
                            path: "assets/plants/example/reference.w480.webp",
                            width: 480,
                        },
                        {
                            bytes: 2400,
                            path: "assets/plants/example/reference.w960.webp",
                            width: 960,
                        },
                    ],
                },
            ],
        ]);
        const output = rewritePublishedPlantImages(
            `<img src="../../${source}" alt="Example" sizes="50vw" loading="lazy">`,
            images
        );

        expect(output).toContain(
            'src="../../assets/plants/example/reference.w960.webp"'
        );
        expect(output).toContain(
            "../../assets/plants/example/reference.w480.webp 480w"
        );
        expect(output).toContain(
            "../../assets/plants/example/reference.w960.webp 960w"
        );
        expect(output).toContain('sizes="50vw"');
        expect(output).not.toContain(`src="../../${source}"`);
    });
});
