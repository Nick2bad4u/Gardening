import { describe, expect, it } from "vitest";

import {
    injectGoogleTagManager,
    injectPageNotFoundEvent,
    rewritePublishedPlantImages,
} from "../scripts/build-pages-site.mjs";

describe("GitHub Pages publication transforms", () => {
    it("installs the production GTM container once in the head and body", () => {
        const output = injectGoogleTagManager(
            "<!doctype html><html><head><title>Garden</title></head><body><main>Plants</main></body></html>"
        );

        expect(output.match(/GTM-T8J6HPLF/g)).toHaveLength(2);
        expect(output).toContain("https:" + "//www.googletagmanager.com");
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
        const installed = injectGoogleTagManager(
            "<html><head></head><body></body></html>"
        );
        expect(() => injectGoogleTagManager(installed)).toThrow(
            /already present/
        );
    });

    it("marks only the generated 404 entry point with an explicit event", () => {
        const indexHtml = injectGoogleTagManager(
            "<!doctype html><html><head><title>Garden</title></head><body><main>Plants</main></body></html>"
        );
        const notFoundHtml = injectPageNotFoundEvent(indexHtml);

        expect(indexHtml).not.toContain('event: "page_not_found"');
        expect(notFoundHtml.match(/event: "page_not_found"/g)).toHaveLength(1);
        expect(notFoundHtml).toContain("http_status: 404");
        expect(notFoundHtml).toContain("page_location: window.location.href");
        expect(notFoundHtml).toContain("page_referrer: document.referrer");
        expect(notFoundHtml).toContain("page_title: document.title");
        expect(() => injectPageNotFoundEvent(notFoundHtml)).toThrow(
            /already present/
        );
    });

    it("rewrites local reference images to responsive publication WebPs", () => {
        const source = "assets/plants/example/reference.jpg";
        const images = new Map([
            [
                source,
                {
                    relativePath: source,
                    variants: [
                        {
                            path: "assets/plants/example/reference.w480.webp",
                            width: 480,
                        },
                        {
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
