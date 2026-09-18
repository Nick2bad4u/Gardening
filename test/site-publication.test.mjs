import assert from "node:assert/strict";
import * as path from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

import {
    injectGoogleTagManager,
    rewritePublishedPlantImages,
} from "../scripts/build-pages-site.mjs";
import {
    assertPageMarkup,
    assertProfileCoverage,
    localReferences,
    resolvePublicTarget,
} from "../scripts/check-site.mjs";

describe("modular site publication invariants", () => {
    it("waits for legacy routing before analytics and skips redirecting pages", () => {
        expect.hasAssertions();

        const html = injectGoogleTagManager(
            "<html><head><script>legacyResolver()</script></head><body></body></html>"
        );

        expect(html.indexOf("legacyResolver()")).toBeLessThan(
            html.indexOf("<!-- Google Tag Manager -->")
        );

        const script =
            /<!-- Google Tag Manager -->\s*<script>(?<script>[\s\S]*?)<\/script>/v.exec(
                html
            )?.groups?.["script"];
        assert.ok(script !== undefined, "Missing analytics bootstrap.");
        for (const isRedirecting of [true, false]) {
            const insertBefore = vi.fn();
            /** @type {{ dataLayer?: unknown[] }} */
            const window = {};
            const document = {
                createElement: () => ({}),
                documentElement: { hasAttribute: () => isRedirecting },
                getElementsByTagName: () => [{ parentNode: { insertBefore } }],
            };
            runInNewContext(script, { document, window });

            expect(insertBefore).toHaveBeenCalledTimes(isRedirecting ? 0 : 1);
            expect(window.dataLayer?.length ?? 0).toBe(isRedirecting ? 0 : 1);
        }
    });

    it("rewrites Astro base-prefixed reference images before source removal", () => {
        expect.hasAssertions();

        const source = "assets/plants/example/reference.jpg";
        const images = new Map([
            [
                source,
                {
                    relativePath: source,
                    variants: [
                        {
                            bytes: 100,
                            path: "assets/plants/example/reference.w320.webp",
                            width: 320,
                        },
                    ],
                },
            ],
        ]);
        const html = rewritePublishedPlantImages(
            `<img src="/Gardening/${source}" alt="Reference">`,
            images
        );

        expect(html).toContain(
            'src="/Gardening/assets/plants/example/reference.w320.webp"'
        );
        expect(html).toContain(
            'srcset="/Gardening/assets/plants/example/reference.w320.webp 320w"'
        );
        expect(html).not.toContain(
            'src="/Gardening/assets/plants/example/reference.jpg"'
        );
    });

    it("rejects encoded and Windows-style traversal before checking files", () => {
        expect.hasAssertions();

        const directory = path.resolve(".cache/site-validation-test");
        for (const href of [
            "/Gardening/../outside.html",
            "/Gardening/%2e%2e/outside.html",
            "/Gardening/%2e%2e%5coutside.html",
            "/Gardening/C:/outside.html",
            "/Gardening//outside.html",
        ])
            expect(() => resolvePublicTarget(href, directory)).toThrow(
                /traversal/iv
            );

        expect(
            resolvePublicTarget(
                "/Gardening/plants/example/?view=photo#sources",
                directory
            )
        ).toBe(path.join(directory, "plants/example"));
        expect(
            resolvePublicTarget("https://example.com/plant", directory)
        ).toBeUndefined();
        expect(
            resolvePublicTarget("/Gardening/storybook/index.html", directory)
        ).toBeUndefined();
        expect(
            resolvePublicTarget(
                "/Gardening/storybook-extra/index.html",
                directory
            )
        ).toBe(path.join(directory, "storybook-extra/index.html"));
    });

    it("checks responsive image variants alongside ordinary links", () => {
        expect.hasAssertions();
        expect(
            localReferences(
                '<a href="/Gardening/plants/">Plants</a><img src="https://example.com/photo.jpg" srcset="/Gardening/assets/one.webp 320w, /Gardening/assets/two.webp 640w">'
            )
        ).toStrictEqual([
            "/Gardening/plants/",
            "/Gardening/assets/one.webp",
            "/Gardening/assets/two.webp",
        ]);
    });

    it("rejects private evidence paths, duplicate IDs and tracking on redirects", () => {
        expect.hasAssertions();

        const page =
            '<nav id="site-nav"></nav><main id="main"></main><!-- GTM-T8J6HPLF GTM-T8J6HPLF -->';

        expect(() => {
            assertPageMarkup(page, "home");
        }).not.toThrow();
        expect(() => {
            assertPageMarkup(
                String.raw`${page}<p>C:\Users\Example\private.jpg</p>`,
                "home"
            );
        }).toThrow(/private source/v);
        expect(() => {
            assertPageMarkup(`${page}<p>file:///private/photo.jpg</p>`, "home");
        }).toThrow(/private source/v);
        expect(() => {
            assertPageMarkup(`${page}<div id="main"></div>`, "home");
        }).toThrow(/duplicate HTML IDs/v);
        expect(() => {
            assertPageMarkup(
                '<meta name="gardening-redirect" content="true">',
                "redirect"
            );
        }).not.toThrow();
        expect(() => {
            assertPageMarkup(
                `${page}<meta name="gardening-redirect" content="true">`,
                "redirect"
            );
        }).toThrow(/analytics installation/v);
    });

    it("requires exactly one independent page for each source profile", () => {
        expect.hasAssertions();

        const profiles = [
            { slug: "first", title: "First" },
            { slug: "second", title: "Second" },
        ];
        const pages = new Map([
            ["first", '<article id="first">First</article>'],
            ["second", '<article id="second">Second</article>'],
        ]);

        expect(() => {
            assertProfileCoverage(profiles, pages);
        }).not.toThrow();
        expect(() => {
            assertProfileCoverage(
                profiles,
                new Map([["first", '<article id="first">First</article>']])
            );
        }).toThrow(/profile count/v);
        expect(() => {
            assertProfileCoverage(
                profiles,
                new Map([...pages, ["unexpected", "Extra"]])
            );
        }).toThrow(/profile count/v);

        pages.set(
            "first",
            '<article id="first">First<article id="second">Second</article></article>'
        );

        expect(() => {
            assertProfileCoverage(profiles, pages);
        }).toThrow(/Unrelated full profile/v);
    });
});
