import { Window } from "happy-dom";
import { readFileSync } from "node:fs";
import { describe, expect, it, onTestFinished, vi } from "vitest";

const source = readFileSync(
    new URL("../site/client/search.js", import.meta.url),
    "utf8"
).replaceAll(/^export (?=(?:async )?function )/gmv, "");
const entries = [
    {
        category: "Plant",
        description: "White flowers",
        href: "/Gardening/plants/moon/",
        text: "A1 P01",
        title: "Moon cactus",
    },
    {
        category: "Plant",
        description: "Soft spines",
        href: "/Gardening/plants/tail/",
        text: "P19",
        title: "Monkey tail",
    },
];

/** @param {() => Promise<{ ok: boolean; json: () => Promise<unknown> }>} fetcher */
function createSearch(fetcher) {
    const window = new Window({
        url: "https://example.test/Gardening/search/",
    });
    onTestFinished(async () => window.happyDOM.close());
    window.document.body.innerHTML =
        '<form id="site-search-form"><input id="site-search"></form><p id="search-status"></p><ul id="search-results" data-index-url="/Gardening/search-index.json"></ul>';
    Object.defineProperty(window, "fetch", { value: fetcher });
    window.eval(source);
    const field = window.document.querySelector("input");
    if (!field) throw new Error("Missing search input");
    return {
        field,
        search: async (/** @type {string} */ value) => {
            field.value = value;
            field.dispatchEvent(new window.Event("input"));
            await window.happyDOM.waitUntilComplete();
        },
        window,
    };
}

/** @param {unknown} data */
function response(data) {
    return { json: () => Promise.resolve(data), ok: true };
}

describe("lazy website search", () => {
    it("fetches only after input and shares the index across searches", async () => {
        expect.hasAssertions();

        const fetcher = vi.fn(() => Promise.resolve(response(entries)));
        const { search, window } = createSearch(fetcher);

        expect(fetcher).not.toHaveBeenCalled();

        await search("A1");

        expect(window.document.querySelector("h2")?.textContent).toBe(
            "Moon cactus"
        );

        await search("Monkey");

        expect(window.document.querySelector("h2")?.textContent).toBe(
            "Monkey tail"
        );
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("discards an older query when the field is cleared before loading completes", async () => {
        expect.hasAssertions();

        /** @type {PromiseWithResolvers<ReturnType<typeof response>>} */
        const pending =
            // eslint-disable-next-line canonical/no-use-extend-native -- Native ES2024 Promise.withResolvers is absent from the shared rule inventory.
            Promise.withResolvers();
        const { search, window } = createSearch(() => pending.promise);
        await search("Moon");
        await search("");
        pending.resolve(response(entries));
        await window.happyDOM.waitUntilComplete();

        expect(window.document.querySelectorAll(".search-result")).toHaveLength(
            0
        );
        expect(
            window.document.querySelector("#search-status")?.textContent
        ).toBe("Enter a name or topic to search.");
    });

    it("retries after a failed request even when its query was cleared", async () => {
        expect.hasAssertions();

        /** @type {PromiseWithResolvers<ReturnType<typeof response>>} */
        const pending =
            // eslint-disable-next-line canonical/no-use-extend-native -- Native ES2024 Promise.withResolvers is absent from the shared rule inventory.
            Promise.withResolvers();
        const fetcher = vi
            .fn(() => Promise.resolve(response(entries)))
            .mockReturnValueOnce(pending.promise);
        const { search, window } = createSearch(fetcher);
        await search("Moon");
        await search("");
        pending.reject(new Error("Offline"));
        await window.happyDOM.waitUntilComplete();
        await search("Moon");

        expect(fetcher).toHaveBeenCalledTimes(2);
        expect(window.document.querySelector("h2")?.textContent).toBe(
            "Moon cactus"
        );
    });

    it("rejects index links outside the same-origin route tree", async () => {
        expect.hasAssertions();

        const fetcher = vi.fn(() =>
            Promise.resolve(
                response([{ ...entries[0], href: "//other.example/path" }])
            )
        );
        const { search, window } = createSearch(fetcher);
        await search("Moon");

        expect(window.document.querySelectorAll(".search-result")).toHaveLength(
            0
        );
        expect(
            window.document.querySelector("#search-status")?.textContent
        ).toContain("Submit again to retry");
    });

    it("handles quote and markup queries as text", async () => {
        expect.hasAssertions();

        const { search, window } = createSearch(() =>
            Promise.resolve(response(entries))
        );
        await search('"<img src=x onerror=alert(1)>');

        expect(window.document.querySelectorAll("img")).toHaveLength(0);
        expect(
            window.document.querySelector("#search-status")?.textContent
        ).toContain('"<img src=x onerror=alert(1)>');

        const currentUrl = new URL(window.location.href);

        expect(currentUrl.searchParams.get("q")).toBe(
            '"<img src=x onerror=alert(1)>'
        );
    });
});
