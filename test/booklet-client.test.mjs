import {
    HTMLButtonElement,
    HTMLElement,
    HTMLImageElement,
    Window,
} from "happy-dom";
import * as fs from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { queryElement } from "./helpers/required.mjs";

const clientSource = fs.readFileSync(
    new URL("../docs/plant-booklet/booklet.js", import.meta.url),
    "utf8"
);

/**
 * @param {string} [hash]
 * @param {{ dataLayer?: Record<string, string>[] }} [options]
 */
function createReader(hash = "#plant-b-photo-history", { dataLayer } = {}) {
    const window = new Window({
        url: `https://example.test/garden/${hash}`,
    });
    Object.defineProperty(window, "print", { value: vi.fn(() => {}) });
    window.requestAnimationFrame = (callback) => {
        callback(0);
        return setImmediate(() => {});
    };
    window.document.body.innerHTML = `
        <header>
            <button id="open-contents" type="button">Contents</button>
            <strong id="reader-title"></strong>
            <span id="reader-count"></span>
            <span id="reader-progress"></span>
            <button id="theme-toggle" type="button">Theme</button>
            <button id="print-booklet" type="button">Print</button>
            <a href="#plant-a" data-surprise-plant>Random</a>
        </header>
        <dialog id="contents-dialog">
            <button id="close-contents" type="button">Close</button>
            <input id="plant-search" />
            <p id="search-status"></p>
            <section class="drawer-group">
                <ol>
                    <li data-search="plant a"><a href="#plant-a" data-page-link="plant-a">Plant A</a></li>
                    <li data-search="plant b"><a href="#plant-b" data-page-link="plant-b">Plant B</a></li>
                </ol>
            </section>
        </dialog>
        <main id="book">
            <section class="book-page cover-page" id="cover" data-page="cover" data-title="Cover" hidden>
                <div class="cover-collage"><img src="cover-a.jpg" loading="lazy"><img src="cover-b.jpg" loading="lazy"></div>
            </section>
            <section class="book-page contents-page" id="contents" data-page="contents" data-title="Contents" hidden></section>
            <article class="book-page profile-page" id="plant-a" data-page="plant-a" data-title="Plant A" data-search="plant a" hidden></article>
            <template data-profile-template="plant-a">
                <header class="profile-hero"><img src="plant-a.jpg" loading="lazy"></header>
                <section id="plant-a-photo-history">A history</section>
            </template>
            <article class="book-page profile-page" id="plant-b" data-page="plant-b" data-title="Plant B" data-search="plant b" hidden></article>
            <template data-profile-template="plant-b">
                <header class="profile-hero"><img src="plant-b.jpg" loading="lazy"></header>
                <a class="external-image-link" href="https://example.test/capture">
                    <img src="https://example.test/preview.jpg" loading="lazy" data-external-image>
                    <span class="external-image-fallback" hidden>Unavailable</span>
                </a>
                <section id="plant-b-photo-history">B history</section>
            </template>
        </main>
        <nav id="page-controls-navigation">
            <button id="previous-page" type="button"><strong id="previous-label"></strong></button>
            <button id="page-controls-toggle" type="button" aria-pressed="false" aria-label="Pin page navigation">
                <span class="page-controls-pin-label">Pin</span>
            </button>
            <button id="next-page" type="button"><strong id="next-label"></strong></button>
        </nav>
        <p id="page-announcer"></p>
    `;
    if (dataLayer)
        Object.defineProperty(window, "dataLayer", { value: dataLayer });
    window.eval(clientSource);
    return window;
}

describe("field-guide profile mounting", () => {
    it("mounts a nested deep link without materializing every profile", () => {
        expect.hasAssertions();

        const window = createReader();
        const plantA = queryElement(window.document, "#plant-a", HTMLElement);
        const plantB = queryElement(window.document, "#plant-b", HTMLElement);

        expect(plantA.childElementCount).toBe(0);
        expect(plantA.hidden).toBe(true);
        expect(plantB.dataset["profileMounted"]).toBe("true");
        expect(plantB.hidden).toBe(false);
        expect(
            queryElement(window.document, "#plant-b-photo-history", HTMLElement)
                .textContent
        ).toBe("B history");
        expect(
            Reflect.get(
                queryElement(plantB, ".profile-hero > img", HTMLImageElement),
                "fetchPriority"
            )
        ).toBe("high");
        expect(
            queryElement(plantB, "img[data-external-image]", HTMLImageElement)
                .hidden
        ).toBe(false);
        expect(
            queryElement(plantB, ".external-image-fallback", HTMLElement).hidden
        ).toBe(true);
        expect(
            queryElement(
                window.document,
                "#previous-page",
                HTMLButtonElement
            ).hasAttribute("aria-label")
        ).toBe(false);
        expect(
            queryElement(
                window.document,
                "#next-page",
                HTMLButtonElement
            ).hasAttribute("aria-label")
        ).toBe(false);
    });

    it("recycles inactive profile markup during hash navigation", () => {
        expect.hasAssertions();

        const window = createReader();
        window.location.hash = "#plant-a";
        window.dispatchEvent(new window.HashChangeEvent("hashchange"));

        const plantA = queryElement(window.document, "#plant-a", HTMLElement);
        const plantB = queryElement(window.document, "#plant-b", HTMLElement);

        expect(plantA.dataset["profileMounted"]).toBe("true");
        expect(plantA.hidden).toBe(false);
        expect(plantB.childElementCount).toBe(0);
        expect(plantB.dataset["profileMounted"]).toBeUndefined();
    });

    it("publishes one profile event after each distinct plant view", () => {
        expect.hasAssertions();

        /** @type {Record<string, string>[]} */
        const dataLayer = [];
        const window = createReader("#plant-b-photo-history", { dataLayer });

        expect(structuredClone(dataLayer)).toStrictEqual([
            {
                event: "view_plant_profile",
                page_location:
                    "https://example.test/garden/#plant-b-photo-history",
                page_path: "/garden/#plant-b-photo-history",
                page_title: "Plant B · The Fenton Collection",
                plant_name: "Plant B",
                plant_slug: "plant-b",
            },
        ]);

        window.location.hash = "#plant-b";
        window.dispatchEvent(new window.HashChangeEvent("hashchange"));

        expect(dataLayer).toHaveLength(1);

        window.location.hash = "#plant-a";
        window.dispatchEvent(new window.HashChangeEvent("hashchange"));

        expect(dataLayer).toHaveLength(2);
        expect(dataLayer[1]).toMatchObject({
            event: "view_plant_profile",
            page_title: "Plant A · The Fenton Collection",
            plant_name: "Plant A",
            plant_slug: "plant-a",
        });

        window.location.hash = "#contents";
        window.dispatchEvent(new window.HashChangeEvent("hashchange"));
        window.location.hash = "#plant-a";
        window.dispatchEvent(new window.HashChangeEvent("hashchange"));

        expect(dataLayer).toHaveLength(3);
    });

    it("does not create a local analytics queue when GTM is absent", () => {
        expect.hasAssertions();

        const window = createReader("#plant-a");

        expect(Reflect.get(window, "dataLayer")).toBeUndefined();
    });

    it("pins and unpins the scroll-aware page navigation", () => {
        expect.hasAssertions();

        const window = createReader("#plant-a");
        const navigation = queryElement(
            window.document,
            "#page-controls-navigation",
            HTMLElement
        );
        const toggle = queryElement(
            window.document,
            "#page-controls-toggle",
            HTMLButtonElement
        );

        toggle.click();

        expect(navigation.classList.contains("is-pinned")).toBe(true);
        expect(toggle.getAttribute("aria-pressed")).toBe("true");
        expect(toggle.getAttribute("aria-label")).toBe("Unpin page navigation");
        expect(
            queryElement(toggle, ".page-controls-pin-label", HTMLElement)
                .textContent
        ).toBe("Pinned");

        toggle.click();

        expect(navigation.classList.contains("is-pinned")).toBe(false);
        expect(toggle.getAttribute("aria-pressed")).toBe("false");
        expect(toggle.getAttribute("aria-label")).toBe("Pin page navigation");
        expect(
            queryElement(toggle, ".page-controls-pin-label", HTMLElement)
                .textContent
        ).toBe("Pin");
    });

    it("tracks reading progress and reveals navigation when scrolling up", () => {
        expect.hasAssertions();

        const window = createReader("#plant-a");
        const navigation = queryElement(
            window.document,
            "#page-controls-navigation",
            HTMLElement
        );
        const progress = queryElement(
            window.document,
            "#reader-progress",
            HTMLElement
        );

        Object.defineProperty(window.document.documentElement, "scrollHeight", {
            configurable: true,
            value: 2000,
        });
        Object.defineProperties(window, {
            innerHeight: {
                configurable: true,
                value: 500,
            },
            scrollY: {
                configurable: true,
                value: 300,
                writable: true,
            },
        });

        window.dispatchEvent(new window.Event("scroll"));

        expect(progress.style.width).toBe("20%");
        expect(navigation.classList.contains("is-scroll-hidden")).toBe(true);

        Object.defineProperty(window, "scrollY", {
            configurable: true,
            value: 150,
        });
        window.dispatchEvent(new window.Event("scroll"));

        expect(progress.style.width).toBe("10%");
        expect(navigation.classList.contains("is-scroll-hidden")).toBe(false);
    });

    it("mounts every profile for print and restores the lean reader afterward", () => {
        expect.hasAssertions();

        const window = createReader("#plant-a");
        queryElement(
            window.document,
            "#print-booklet",
            HTMLButtonElement
        ).click();

        expect(Reflect.get(window, "print")).toHaveBeenCalledExactlyOnceWith();
        expect(
            queryElement(window.document, "#plant-a", HTMLElement)
                .childElementCount
        ).toBeGreaterThan(0);
        expect(
            queryElement(window.document, "#plant-b", HTMLElement)
                .childElementCount
        ).toBeGreaterThan(0);

        window.dispatchEvent(new window.Event("afterprint"));

        expect(
            queryElement(window.document, "#plant-a", HTMLElement)
                .childElementCount
        ).toBeGreaterThan(0);
        expect(
            queryElement(window.document, "#plant-b", HTMLElement)
                .childElementCount
        ).toBe(0);
    });
});
