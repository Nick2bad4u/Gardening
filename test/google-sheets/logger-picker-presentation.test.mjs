import { HTMLButtonElement, HTMLElement, Window } from "happy-dom";
import { describe, expect, it, vi } from "vitest";

import { loggerBrowserFixture } from "../helpers/logger-browser-fixture.mjs";
import { queryElement } from "../helpers/required.mjs";

/** @param {Window} window */
async function closePicker(window) {
    await vi.advanceTimersByTimeAsync(0);
    await window.happyDOM.close();
    vi.useRealTimers();
}

function createPicker() {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T14:00:00Z"));
    const window = new Window({
        url: "https://example.test/Gardening/logger-fixture",
    });
    Object.defineProperty(window, "Date", { configurable: true, value: Date });
    const parser = new window.DOMParser();
    const parsed = parser.parseFromString(loggerBrowserFixture(), "text/html");
    window.document.replaceChildren(
        window.document.importNode(parsed.documentElement, true)
    );
    for (const script of window.document.querySelectorAll("script"))
        window.eval(script.textContent);
    queryElement(
        window.document,
        "#labelPickerMode",
        HTMLButtonElement
    ).click();
    return window;
}

describe("logger weighing status presentation", () => {
    it("keeps selection, saved weight, and queued weight independently accessible", async () => {
        expect.hasAssertions();

        const window = createPicker();
        try {
            const tile = queryElement(
                window.document,
                '#labelPicker [data-plant-id="P38"]',
                HTMLButtonElement
            );
            const portrait = tile.querySelector(".plant-choice-icon");
            tile.click();

            expect(tile.getAttribute("aria-pressed")).toBe("true");
            expect(tile.dataset["savedToday"]).toBe("true");
            expect(tile.dataset["queuedWeighed"]).toBe("true");
            expect(tile.querySelector(".plant-choice-icon")).toBe(portrait);
            expect(
                queryElement(
                    tile,
                    ".weighing-status-badge--saved",
                    HTMLElement
                ).getAttribute("aria-label")
            ).toBe("Weighed today; saved to Google");
            expect(
                queryElement(
                    tile,
                    ".weighing-status-badge--queued",
                    HTMLElement
                ).getAttribute("aria-label")
            ).toBe("Weight queued on this phone; not yet saved to Google");
            expect(
                tile
                    .querySelector(":scope .weighing-status-badge--saved use")
                    ?.getAttribute("href")
            ).toBe("#app-icon-check");
            expect(
                tile
                    .querySelector(":scope .weighing-status-badge--queued use")
                    ?.getAttribute("href")
            ).toBe("#app-icon-clock");
            expect(tile.textContent).not.toContain("Saved today");
            expect(tile.textContent).not.toContain("Queued");
        } finally {
            await closePicker(window);
        }
    });

    it("clears queued badges without removing a separately saved weight badge", async () => {
        expect.hasAssertions();

        const window = createPicker();
        try {
            const tile = queryElement(
                window.document,
                '#labelPicker [data-plant-id="P38"]',
                HTMLButtonElement
            );
            window.eval("renderQueuedPlantIndicators(new Set())");

            expect(
                tile.querySelectorAll(".weighing-status-badge--queued")
            ).toHaveLength(0);
            expect(
                tile
                    .querySelector(".weighing-status-badge--saved")
                    ?.getAttribute("aria-label")
            ).toBe("Weighed today; saved to Google");
            expect(tile.dataset["queuedWeighed"]).toBe("false");
            expect(tile.dataset["savedToday"]).toBe("true");
        } finally {
            await closePicker(window);
        }
    });

    it("shows weighing counts and a visible saved/phone-queue legend", async () => {
        expect.hasAssertions();

        const window = createPicker();
        try {
            const progress = queryElement(
                window.document,
                "#roundProgress",
                HTMLElement
            );
            const legend = queryElement(
                window.document,
                "#weighingStatusLegend",
                HTMLElement
            );

            expect(progress.textContent).toContain("2 weighed today");
            expect(progress.textContent).toContain("2 queued");
            expect(progress.getAttribute("aria-describedby")).toBe(legend.id);
            expect(legend.textContent).toContain("Weight saved today");
            expect(legend.textContent).toContain("Weight queued on this phone");
            expect(legend.hidden).toBe(false);
        } finally {
            await closePicker(window);
        }
    });
});
