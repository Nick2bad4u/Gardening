import { Window } from "happy-dom";
import { readFileSync } from "node:fs";
import { describe, expect, it, onTestFinished } from "vitest";

const client = readFileSync(
    new URL("../site/client/site.js", import.meta.url),
    "utf8"
);

/** @param {{ blockedStorage?: boolean; theme?: string }} [options] */
function createSite({ blockedStorage = false, theme = "light" } = {}) {
    const window = new Window({ url: "https://example.test/Gardening/" });
    onTestFinished(async () => window.happyDOM.close());
    window.document.documentElement.dataset["theme"] = theme;
    window.document.body.innerHTML = `<button id="theme-toggle"><span id="theme-label"></span></button><button data-menu-toggle aria-expanded="false">Menu</button><nav id="site-nav"><a href="/Gardening/plants/">Plants</a></nav><main><input aria-label="Search"><article data-reviewed-date="2000-01-01"><span data-review-freshness></span></article><article data-reviewed-date="2999-01-01"><span data-review-freshness></span></article></main>`;
    if (blockedStorage)
        Object.defineProperty(window, "localStorage", {
            get() {
                throw new Error("Storage is unavailable");
            },
        });
    window.eval(
        client
            .replace(/^export\s*\{\s*\};?\s*/v, "")
            .replaceAll(/^export (?=(?:async )?function )/gmv, "")
    );
    return window;
}

describe("the modular website shell", () => {
    it("toggles and remembers theme using the existing preference key", () => {
        expect.hasAssertions();

        const window = createSite();
        const button = window.document.querySelector("#theme-toggle");

        expect(button?.getAttribute("aria-label")).toBe("Switch to dark theme");

        button?.dispatchEvent(
            new window.MouseEvent("click", { bubbles: true })
        );

        expect(window.document.documentElement.dataset["theme"]).toBe("dark");
        expect(window.localStorage.getItem("gardening-site-theme")).toBe(
            "dark"
        );
        expect(button?.getAttribute("aria-label")).toBe(
            "Switch to light theme"
        );

        button?.dispatchEvent(
            new window.MouseEvent("click", { bubbles: true })
        );

        expect(window.document.documentElement.dataset["theme"]).toBe("light");
    });

    it("keeps theme controls usable when storage is unavailable", () => {
        expect.hasAssertions();

        const window = createSite({ blockedStorage: true, theme: "dark" });
        window.document
            .querySelector("#theme-toggle")
            ?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

        expect(window.document.documentElement.dataset["theme"]).toBe("light");
    });

    it("opens mobile navigation, closes on Escape with focus restored, and dismisses outside clicks", () => {
        expect.hasAssertions();

        const window = createSite();
        const button = window.document.querySelector("[data-menu-toggle]");
        const nav = window.document.querySelector("#site-nav");
        button?.dispatchEvent(
            new window.MouseEvent("click", { bubbles: true })
        );

        expect(button?.getAttribute("aria-expanded")).toBe("true");
        expect(nav?.classList.contains("is-open")).toBe(true);
        expect(nav?.classList.contains("is-open")).not.toBe(false);

        window.document.dispatchEvent(
            new window.KeyboardEvent("keydown", { key: "Escape" })
        );

        expect(button?.getAttribute("aria-expanded")).toBe("false");
        expect(window.document.activeElement).toBe(button);

        button?.dispatchEvent(
            new window.MouseEvent("click", { bubbles: true })
        );
        window.document
            .querySelector("main")
            ?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

        expect(nav?.classList.contains("is-open")).toBe(false);
    });

    it("does not intercept arrow or Home/End keys used for normal reading", () => {
        expect.hasAssertions();

        const window = createSite();
        for (const key of [
            "ArrowLeft",
            "ArrowRight",
            "Home",
            "End",
        ]) {
            const event = new window.KeyboardEvent("keydown", {
                cancelable: true,
                key,
            });
            window.document.dispatchEvent(event);

            expect(event.defaultPrevented).toBe(false);
        }
    });

    it("distinguishes old and future reviewed reports rather than calling either today's advice", () => {
        expect.hasAssertions();

        const window = createSite();
        const cards = window.document.querySelectorAll("[data-reviewed-date]");

        expect(cards[0]?.textContent).toContain("Earlier review");
        expect(cards[1]?.textContent).toContain("Future-dated review");
        expect(cards[0]?.getAttribute("data-fresh")).toBe("false");

        cards[0]?.setAttribute("data-reviewed-date", "2999-02-01");
        window.dispatchEvent(new window.Event("pageshow"));

        expect(cards[0]?.textContent).toContain("Future-dated review");
    });
});

describe("profile analytics compatibility", () => {
    it("emits the existing profile event once and never adds a synthetic pageview", () => {
        expect.hasAssertions();

        const window = createSite();
        window.document.title = "Moon cactus · The Garden";
        const article = window.document.createElement("article");
        article.dataset["plantProfile"] = "moon-cactus";
        const heading = window.document.createElement("h1");
        heading.textContent = "Moon cactus";
        article.append(heading);
        window.document.body.append(article);
        /** @type {unknown[]} */
        const queue = [];
        Object.defineProperty(window, "dataLayer", { value: queue });
        window.eval("initializeSite(); initializeSite();");
        window.dispatchEvent(new window.Event("pageshow"));

        expect(queue).toHaveLength(1);
        expect(queue).toMatchObject([
            {
                event: "view_plant_profile",
                page_location: "https://example.test/Gardening/",
                page_path: "/Gardening/",
                page_title: "Moon cactus · The Garden",
                plant_name: "Moon cactus",
                plant_slug: "moon-cactus",
            },
        ]);
    });

    it("does not create a queue when analytics is absent or enqueue during a redirect", () => {
        expect.hasAssertions();

        const window = createSite();
        const article = window.document.createElement("article");
        article.dataset["plantProfile"] = "moon-cactus";
        window.document.body.append(article);
        window.eval("initializeSite();");

        expect(Reflect.has(window, "dataLayer")).toBe(false);

        /** @type {unknown[]} */
        const queue = [];
        Object.defineProperty(window, "dataLayer", { value: queue });
        window.document.documentElement.setAttribute(
            "data-gardening-redirecting",
            ""
        );
        window.eval("initializeSite();");

        expect(queue).toHaveLength(0);
        expect(article.dataset["profileTracked"]).not.toBe("true");
    });
});
