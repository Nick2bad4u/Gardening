import fs from "node:fs";

import { Window } from "happy-dom";
import { describe, expect, it, vi } from "vitest";

const clientSource = fs.readFileSync(
    new URL("../docs/plant-booklet/booklet.js", import.meta.url),
    "utf8"
);

function createReader(hash = "#plant-b-photo-history") {
    const window = new Window({
        url: `https://example.test/garden/${hash}`,
    });
    window.print = vi.fn();
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
        <nav>
            <button id="previous-page" type="button"><strong id="previous-label"></strong></button>
            <button id="next-page" type="button"><strong id="next-label"></strong></button>
        </nav>
        <p id="page-announcer"></p>
    `;
    window.eval(clientSource);
    return window;
}

describe("field-guide profile mounting", () => {
    it("mounts a nested deep link without materializing every profile", () => {
        const window = createReader();
        const plantA = window.document.querySelector("#plant-a");
        const plantB = window.document.querySelector("#plant-b");

        expect(plantA.childElementCount).toBe(0);
        expect(plantA.hidden).toBe(true);
        expect(plantB.dataset.profileMounted).toBe("true");
        expect(plantB.hidden).toBe(false);
        expect(
            window.document.querySelector("#plant-b-photo-history")
        ).not.toBeNull();
        expect(plantB.querySelector(".profile-hero > img").fetchPriority).toBe(
            "high"
        );
        expect(plantB.querySelector("img[data-external-image]").hidden).toBe(
            false
        );
        expect(plantB.querySelector(".external-image-fallback").hidden).toBe(
            true
        );
    });

    it("recycles inactive profile markup during hash navigation", () => {
        const window = createReader();
        window.location.hash = "#plant-a";
        window.dispatchEvent(new window.HashChangeEvent("hashchange"));

        const plantA = window.document.querySelector("#plant-a");
        const plantB = window.document.querySelector("#plant-b");
        expect(plantA.dataset.profileMounted).toBe("true");
        expect(plantA.hidden).toBe(false);
        expect(plantB.childElementCount).toBe(0);
        expect(plantB.dataset.profileMounted).toBeUndefined();
    });

    it("mounts every profile for print and restores the lean reader afterward", () => {
        const window = createReader("#plant-a");
        window.document.querySelector("#print-booklet").click();

        expect(window.print).toHaveBeenCalledOnce();
        expect(
            window.document.querySelector("#plant-a").childElementCount
        ).toBeGreaterThan(0);
        expect(
            window.document.querySelector("#plant-b").childElementCount
        ).toBeGreaterThan(0);

        window.dispatchEvent(new window.Event("afterprint"));
        expect(
            window.document.querySelector("#plant-a").childElementCount
        ).toBeGreaterThan(0);
        expect(
            window.document.querySelector("#plant-b").childElementCount
        ).toBe(0);
    });
});
