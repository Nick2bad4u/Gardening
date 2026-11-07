import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, waitFor } from "storybook/test";

// eslint-disable-next-line import-x/extensions -- The maintained browser ESM module requires its explicit .js extension under NodeNext.
import { wateringAgeColor } from "../../site/client/tools/watering-map-data.js";
import {
    expectNoOverflow,
    releaseWebsiteFocus,
    renderWebsiteFrame,
    websiteArgTypes,
    websiteCanvas,
} from "./website-frame.js";

const imageSelector = "#watering-map-image";
const listName = "Watering details by pot";
const svgLabel = "Download SVG";
const pngLabel = "Download PNG";
const sourceSelector = "#watering-map-source";
const sourceStateAttribute = "data-state";
const loadedMessage = "Published observations loaded.";
const detailsLabel = "Watering and placement details for every pot";
const refreshName = "Refresh data";

async function expectDarkMap(document: Readonly<Document>): Promise<void> {
    const panel = document.querySelector("#watering-map");
    const preview = document.querySelector(`${imageSelector} > svg`);
    const window = document.defaultView;
    if (!panel || !preview || !window)
        throw new Error("Watering map preview did not load.");
    await expect(window.getComputedStyle(panel).colorScheme).toBe("dark");
    await expect(preview).toBeVisible();
    const svg = preview.outerHTML;
    await expect(svg).toContain('data-color-scheme="dark"');
    await expect(svg).toMatch(
        /<rect [^>]*fill="#0c1815"[^>]*data-map-background=/v
    );
    const potIds = Array.from(
        document.querySelectorAll("#watering-map-pot-list > li > strong"),
        (item) => /\bP\d+\b/v.exec(item.textContent)?.[0]
    );
    await expect(
        Array.from(
            svg.matchAll(/data-pot-id="(?<id>[^"]+)"/gv),
            (marker) => marker.groups?.["id"]
        )
    ).toEqual(potIds);
    await expect(
        preview.querySelectorAll("foreignObject, image, link, script, [src]")
    ).toHaveLength(0);
    await Promise.all(
        Array.from(preview.querySelectorAll("[href]"), async (element) => {
            const reference = element.getAttribute("href") ?? "";
            await expect(reference).toMatch(/^#[\w\-]+$/v);
            await expect(
                Array.from(preview.querySelectorAll("[id]"), (target) =>
                    target.getAttribute("id")
                )
            ).toContain(reference.slice(1));
        })
    );
    await expect(svg).not.toMatch(/@import|url\((?!#)/v);
    await expect(preview.querySelectorAll("[data-plant-slug]")).toHaveLength(
        potIds.length
    );
    await Promise.all(
        Array.from(
            preview.querySelectorAll<SVGGElement>("[data-pot-id]"),
            async (marker) => {
                await expect(
                    marker.querySelector("[data-plant-slug]")
                ).toBeVisible();
                await expect(marker.querySelector("text.count")).toBeVisible();
                await expect(
                    marker.querySelector("text.identity")
                ).toBeVisible();
            }
        )
    );
    const sentinel = document.createElement("div");
    sentinel.hidden = true;
    sentinel.style.fontSize = "13px";
    sentinel.style.fontFamily = "monospace";
    const unrelatedSvg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
    );
    const unrelatedText = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
    );
    unrelatedText.classList.add("count");
    unrelatedText.textContent = "Other page content";
    unrelatedSvg.append(unrelatedText);
    sentinel.append(unrelatedSvg);
    document.body.append(sentinel);
    try {
        // Inline SVG styles share the page's stylesheet scope.
        // The map must not restyle other SVGs on the same page.
        await expect(window.getComputedStyle(unrelatedText).fontSize).toBe(
            "13px"
        );
        await expect(window.getComputedStyle(unrelatedText).fontFamily).toBe(
            "monospace"
        );
    } finally {
        sentinel.remove();
    }
}

async function expectFertilizerMap(
    document: Readonly<Document>
): Promise<void> {
    const image = document.querySelector(imageSelector);
    await expect(
        image?.querySelectorAll(":scope [data-pot-id] [data-fertilizer-badge]")
    ).toHaveLength(1);
    await expect(image?.querySelector('[data-pot-id="P01"]')).toHaveTextContent(
        "Nutrients at last Water: Yes — fertilizer / supplement"
    );
    await expect(
        image?.querySelector("[data-fertilizer-legend]")
    ).toBeVisible();
    await expect(
        document.querySelector("#watering-map-pot-list")
    ).toHaveTextContent(
        "Nutrients at last Water: Yes — fertilizer / supplement"
    );
}

async function expectMapColorsAndSpacing(
    document: Readonly<Document>
): Promise<void> {
    const preview = document.querySelector<SVGSVGElement>(
        `${imageSelector} > svg`
    );
    const legend = preview?.querySelector("[data-watering-legend]");
    const shelf = preview?.querySelector('[data-placement-section="shelf"]');
    const other = preview?.querySelector('[data-placement-section="other"]');
    const window = document.defaultView;
    if (!preview || !legend || !shelf || !other || !window)
        throw new Error("Watering map sections did not load.");
    const cards = [...preview.querySelectorAll<SVGGElement>("[data-pot-id]")];
    const ids = cards.map((card) => card.dataset["potId"]);
    await expect(ids).toHaveLength(39);
    const uniqueIds = new Set(ids);
    await expect(uniqueIds.size).toBe(39);
    await expect(
        [
            ...preview.querySelectorAll<SVGGElement>(
                '[data-placement-zone="shelf"]'
            ),
        ].map((card) => card.dataset["potId"])
    ).toEqual([
        "P39",
        "P40",
        "P41",
    ]);
    const list = [...document.querySelectorAll("#watering-map-pot-list > li")];
    const problems = cards.flatMap((card) => {
        const count = card.querySelector("text.count");
        const id = card.dataset["potId"] ?? "Missing pot ID";
        const age = list
            .find(
                (item) =>
                    item
                        .querySelector("strong")
                        ?.textContent.includes(` · ${id} · `) === true
            )
            ?.querySelector<HTMLElement>(".watering-map-age");
        if (!count || !age) return [id];
        const days = /^\d+$/v.test(count.textContent)
            ? Number(count.textContent)
            : null;
        const color = wateringAgeColor(days).replaceAll(" ", "");
        const actualCount = window
            .getComputedStyle(count)
            .fill.replaceAll(" ", "");
        return actualCount === (color || "rgb(173,187,179)") &&
            age.style.color.replaceAll(" ", "") === color
            ? []
            : [id];
    });
    await expect(problems).toEqual([]);
    const shelfBounds = shelf.getBoundingClientRect();
    const otherBounds = other.getBoundingClientRect();
    const legendBounds = legend.getBoundingClientRect();
    await expect(otherBounds.top).toBeGreaterThan(shelfBounds.bottom);
    await expect(legendBounds.top).toBeGreaterThan(otherBounds.bottom);
    await expect(legendBounds.bottom).toBeLessThan(
        preview.getBoundingClientRect().bottom
    );
    const overflow = cards.filter((card) => {
        const zone = card.dataset["placementZone"];
        if (zone !== "shelf" && zone !== "other") return false;
        const bounds = card.getBoundingClientRect();
        const section = zone === "shelf" ? shelfBounds : otherBounds;
        return (
            bounds.top < section.top ||
            bounds.bottom > section.bottom ||
            bounds.left < section.left ||
            bounds.right > section.right
        );
    });
    await expect(overflow.map((card) => card.dataset["potId"])).toEqual([]);
}

async function expectMapCoverage(document: Readonly<Document>): Promise<{
    recorded: number;
    total: number;
    unknown: number;
}> {
    const items = [...document.querySelectorAll("#watering-map-pot-list > li")];
    const unknown = items.filter((item) =>
        item.textContent.includes("Days since watering: Unknown")
    ).length;
    const total = items.length;
    const recorded = total - unknown;
    await expect(total).toBeGreaterThan(0);
    await expect(
        items.some((item) =>
            item.textContent.includes("Days since watering: Unavailable")
        )
    ).toBe(false);
    await expect(
        document.querySelector("#watering-map-total-count")?.textContent
    ).toBe(String(total));
    await expect(
        document.querySelector("#watering-map-recorded-count")?.textContent
    ).toBe(String(recorded));
    await expect(
        document.querySelector("#watering-map-unknown-count")?.textContent
    ).toBe(String(unknown));
    return { recorded, total, unknown };
}

async function expectUnavailableMap(
    document: Readonly<Document>
): Promise<void> {
    const preview = document.querySelector(`${imageSelector} > svg`);
    await expect(
        preview?.querySelectorAll(
            ":scope [data-pot-id] [data-fertilizer-badge]"
        )
    ).toHaveLength(0);
    await expect(
        document.querySelector("#watering-map-pot-list")
    ).toHaveTextContent("Nutrients at last Water: Unavailable");
    const items = [...document.querySelectorAll("#watering-map-pot-list > li")];
    await expect(preview).toBeVisible();
    await expect(items.length).toBeGreaterThan(0);
    await expect(
        document.querySelector("#watering-map-total-count")?.textContent
    ).toBe(String(items.length));
    await Promise.all(
        ["#watering-map-recorded-count", "#watering-map-unknown-count"].map(
            async (selector) => {
                await expect(
                    document.querySelector(selector)?.textContent
                ).toBe("—");
            }
        )
    );
    await expect(
        Array.from(
            preview?.querySelectorAll("text.count") ?? [],
            (count) => count.textContent
        )
    ).toEqual(items.map(() => "—"));
    await expect(
        preview?.querySelectorAll(
            "[data-pot-id].recorded, [data-pot-id].unrecorded"
        )
    ).toHaveLength(0);
    await Promise.all(
        items.map(async (item) => {
            await expect(item).toHaveTextContent(
                "Days since watering: Unavailable"
            );
            await expect(item).toHaveTextContent("Last Water: Unavailable");
            await expect(item).toHaveTextContent(
                "Latest logged location: Unavailable"
            );
            await expect(item).not.toHaveTextContent(
                /Days since watering: \d|Last Water: 2026-/v
            );
            await expect(
                item.querySelector<HTMLElement>(".watering-map-age")?.style
                    .color
            ).toBe("");
        })
    );
    await expect(preview).not.toHaveTextContent(
        /\d calendar days since Water|No recorded Water event|\d with Water records/v
    );
    await expect(document.querySelector("#watering-map-png")).toBeDisabled();
    await expect(document.querySelector("#watering-map-svg")).toBeDisabled();
}

const meta = {
    afterEach: releaseWebsiteFocus,
    args: {
        path: "setup/placement/#watering-map",
        scenario: "ready",
        theme: "light",
        width: 1280,
    },
    argTypes: websiteArgTypes,
    component: renderWebsiteFrame,
    parameters: {
        docs: {
            description: {
                component:
                    "The recorded placement map with synthetic watering history, downloadable SVG and PNG images, readable pot details, loading, retry, and mobile states.",
            },
        },
        layout: "fullscreen",
    },
    title: "Website/Watering placement map",
} satisfies Meta<typeof renderWebsiteFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DatedSnapshotWhileLoading: Story = {
    args: { scenario: "dated-loading" },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await expect(document.querySelector(sourceSelector)).toHaveAttribute(
            "data-source",
            "published"
        );
        await expect(
            canvas.getByRole("button", { name: "Refreshing…" })
        ).toBeDisabled();
        await userEvent.click(canvas.getByText(detailsLabel));
        await expectUnavailableMap(document);
        await expectDarkMap(document);
        await expectMapColorsAndSpacing(document);
    },
};

export const DatedSnapshotOffline: Story = {
    args: { scenario: "dated-error" },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await waitFor(
            () =>
                expect(document.querySelector(sourceSelector)).toHaveAttribute(
                    sourceStateAttribute,
                    "error"
                ),
            { timeout: 5000 }
        );
        await expect(document.querySelector(sourceSelector)).toHaveTextContent(
            /unavailable/iv
        );
        await expect(document.querySelector(sourceSelector)).toHaveAttribute(
            "data-source",
            "published"
        );
        await expect(
            document.querySelector(`${imageSelector} > svg`)
        ).not.toHaveAccessibleName(expect.stringContaining("2026-09-05"));
        await userEvent.click(canvas.getByText(detailsLabel));
        await expectUnavailableMap(document);
        await expectDarkMap(document);
        await expectMapColorsAndSpacing(document);
        await expect(
            canvas.getByRole("button", { name: refreshName })
        ).toBeEnabled();
    },
};

export const TrackerUnavailable: Story = {
    args: { scenario: "tracker-unavailable" },
    play: async ({ canvasElement }) => {
        const { canvas, document } = await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector(sourceSelector)).toHaveTextContent(
                loadedMessage
            )
        );
        await expect(document.documentElement).not.toHaveAttribute(
            "data-tracker-requested"
        );
        await expect(document.querySelector(imageSelector)).toBeVisible();
        await expect(
            canvas.getByRole("button", { name: pngLabel })
        ).toBeEnabled();
        await expect(
            canvas.getByRole("button", { name: svgLabel })
        ).toBeEnabled();
    },
};

export const LoadedAndExportable: Story = {
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector(sourceSelector)).toHaveTextContent(
                loadedMessage
            )
        );
        await expect(document.querySelector(sourceSelector)).toHaveTextContent(
            "Source read"
        );
        await expect(document.querySelector(imageSelector)).toBeVisible();
        await expectFertilizerMap(document);
        await userEvent.click(canvas.getByText(detailsLabel));
        const list = canvas.getByRole("list", {
            name: listName,
        });
        await expect(list).toHaveTextContent("Last Water: 2026-09-02");
        await expect(list).toHaveTextContent("Days since watering: Unknown");
        await expect(list).toHaveTextContent("P20");
        const coverage = await expectMapCoverage(document);
        await expect(coverage.recorded).toBeGreaterThan(0);
        await expect(coverage.unknown).toBeGreaterThan(0);
        await expectDarkMap(document);
        const renderedImage = document.querySelector(`${imageSelector} > svg`);
        const artworkDefinitions =
            renderedImage?.querySelector(":scope > defs");
        const jumpLink = document.querySelector('main a[href="#watering-map"]');
        await expect(jumpLink).toHaveAccessibleName("Jump to watering map");
        await userEvent.click(canvas.getByRole("button", { name: svgLabel }));
        await waitFor(() =>
            expect(
                document.querySelector("#watering-map-export-status")
            ).toHaveTextContent("SVG download prepared.")
        );
        await userEvent.click(canvas.getByRole("button", { name: pngLabel }));
        await waitFor(
            () =>
                expect(
                    document.querySelector("#watering-map-export-status")
                ).toHaveTextContent("PNG download prepared."),
            { timeout: 10_000 }
        );
        await expect(
            canvas.getByRole("button", { name: pngLabel })
        ).toBeEnabled();
        await expect(document.querySelector(`${imageSelector} > svg`)).toBe(
            renderedImage
        );
        await userEvent.click(
            canvas.getByRole("button", { name: refreshName })
        );
        await waitFor(() =>
            expect(document.querySelector(sourceSelector)).toHaveTextContent(
                loadedMessage
            )
        );
        await expect(
            document.querySelector(`${imageSelector} > svg > defs`)
        ).toBe(artworkDefinitions);
    },
};

export const IncompleteCompactFeed: Story = {
    args: { scenario: "invalid-feed" },
    play: async ({ canvasElement }) => {
        const { document } = await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector(sourceSelector)).toHaveAttribute(
                sourceStateAttribute,
                "error"
            )
        );
        await expectUnavailableMap(document);
    },
};

export const MobileDark: Story = {
    args: { theme: "dark", width: 390 },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector(sourceSelector)).toHaveTextContent(
                loadedMessage
            )
        );
        await expect(document.documentElement).toHaveAttribute(
            "data-theme",
            "dark"
        );
        await expectMapCoverage(document);
        await expectFertilizerMap(document);
        await expectDarkMap(document);
        const valueTops = Array.from(
            document.querySelectorAll(".watering-map-stats dd"),
            (value) => value.getBoundingClientRect().top
        );
        await expect(
            Math.max(...valueTops) - Math.min(...valueTops)
        ).toBeLessThan(1);
        const menuButton = canvas.getByRole("button", { name: "Menu" });
        const navigation = document.querySelector("#site-nav");
        const mapShortcut = document.querySelector<HTMLAnchorElement>(
            '#site-nav a[href$="/watering/"]'
        );
        if (!mapShortcut) throw new Error("Watering map shortcut is missing.");
        await userEvent.click(menuButton);
        await expect(menuButton).toHaveAttribute("aria-expanded", "true");
        await expect(navigation).toBeVisible();
        await expect(mapShortcut.pathname).toMatch(/\/watering\/$/v);
        await userEvent.click(menuButton);
        await expect(menuButton).toHaveAttribute("aria-expanded", "false");
        await expect(navigation).not.toBeVisible();
        await userEvent.click(menuButton);
        await expect(menuButton).toHaveAttribute("aria-expanded", "true");
        mapShortcut.focus();
        await expect(mapShortcut).toHaveFocus();
        await userEvent.keyboard("{Escape}");
        await expect(menuButton).toHaveAttribute("aria-expanded", "false");
        await expect(navigation).not.toBeVisible();
        const viewport = canvas.getByRole("region", {
            name: "Watering placement image; enlarge to scroll horizontally",
        });
        const enlargeButton = canvas.getByRole("button", {
            name: "Enlarge image",
        });
        await expect(enlargeButton).toHaveAttribute("aria-pressed", "false");
        await expect(viewport.scrollWidth).toBeLessThanOrEqual(
            viewport.clientWidth
        );
        await expectNoOverflow(document);
        await userEvent.click(enlargeButton);
        await expect(
            canvas.getByRole("button", { name: "Fit image" })
        ).toHaveAttribute("aria-pressed", "true");
        await expect(viewport.scrollWidth).toBeGreaterThan(
            viewport.clientWidth
        );
        const caption = document.querySelector(
            ".watering-map-figure figcaption"
        );
        if (!caption) throw new Error("Watering map caption is missing.");
        const captionBeforeScroll = caption.getBoundingClientRect();
        viewport.scrollLeft = viewport.scrollWidth;
        await expect(caption.getBoundingClientRect().left).toBe(
            captionBeforeScroll.left
        );
        await expect(caption.scrollWidth).toBeLessThanOrEqual(
            Math.ceil(captionBeforeScroll.width)
        );
        await expectNoOverflow(document);
        await userEvent.keyboard("{Enter}");
        await expect(
            canvas.getByRole("button", { name: "Enlarge image" })
        ).toHaveAttribute("aria-pressed", "false");
        await expect(viewport.scrollWidth).toBeLessThanOrEqual(
            viewport.clientWidth
        );
        await expectNoOverflow(document);
        await userEvent.click(canvas.getByText(detailsLabel));
        await expect(
            canvas.getByRole("list", { name: listName })
        ).toBeVisible();
        await expectNoOverflow(document);
        await userEvent.click(viewport);
        await userEvent.keyboard("{Tab}");
        const mapNotes = canvas.getByText("Map context and data freshness");
        await expect(mapNotes).toHaveFocus();
        await userEvent.click(mapNotes);
        await waitFor(() =>
            expect(
                canvas.getByText(/Live data refreshes every five minutes/v)
            ).toBeVisible()
        );
        await expectNoOverflow(document);
        await userEvent.keyboard("{Tab}");
        await expect(canvas.getByText(detailsLabel)).toHaveFocus();
    },
};

export const Loading: Story = {
    args: { scenario: "loading" },
    play: async ({ canvasElement }) => {
        const { canvas, document } = await websiteCanvas(canvasElement);
        await expect(document.querySelector(sourceSelector)).toHaveTextContent(
            /loading|refreshing/iv
        );
        await expect(
            canvas.getByRole("button", { name: "Refreshing…" })
        ).toBeDisabled();
        await expect(
            canvas.getByRole("button", { name: pngLabel })
        ).toBeDisabled();
        await expect(
            canvas.getByRole("button", { name: svgLabel })
        ).toBeDisabled();
        await expectUnavailableMap(document);
    },
};

export const Unavailable: Story = {
    args: { scenario: "invalid-snapshot" },
    play: async ({ canvasElement }) => {
        const { canvas, document } = await websiteCanvas(canvasElement);
        await waitFor(
            () =>
                expect(document.querySelector(sourceSelector)).toHaveAttribute(
                    sourceStateAttribute,
                    "error"
                ),
            { timeout: 5000 }
        );
        await expect(
            canvas.getByRole("button", { name: refreshName })
        ).toBeEnabled();
        await expect(
            canvas.getByRole("button", { name: pngLabel })
        ).toBeDisabled();
        await expect(
            canvas.getByRole("button", { name: svgLabel })
        ).toBeDisabled();
        await expectUnavailableMap(document);
    },
};

export const RetryAfterFailure: Story = {
    args: { scenario: "retry" },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await waitFor(
            () =>
                expect(document.querySelector(sourceSelector)).toHaveAttribute(
                    sourceStateAttribute,
                    "error"
                ),
            { timeout: 5000 }
        );
        await userEvent.click(
            canvas.getByRole("button", { name: refreshName })
        );
        await waitFor(() =>
            expect(document.querySelector(sourceSelector)).toHaveTextContent(
                loadedMessage
            )
        );
        await expect(document.querySelector(imageSelector)).toBeVisible();
        await expect(
            canvas.getByRole("button", { name: svgLabel })
        ).toBeEnabled();
    },
};

export const AutomaticRetry: Story = {
    args: { scenario: "auto-retry" },
    play: async ({ canvasElement }) => {
        const { canvas, document } = await websiteCanvas(canvasElement);
        await waitFor(
            () =>
                expect(
                    document.querySelector(sourceSelector)
                ).toHaveTextContent(loadedMessage),
            { timeout: 5000 }
        );
        await expect(document.querySelector(imageSelector)).toBeVisible();
        await expect(
            canvas.getByRole("button", { name: refreshName })
        ).toBeEnabled();
    },
};

export const FailedRefreshHidesPreviousCounts: Story = {
    args: { scenario: "refresh-failure" },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector(sourceSelector)).toHaveTextContent(
                loadedMessage
            )
        );
        const firstCount = Number(
            document.querySelector('[data-pot-id="P01"] text.count')
                ?.textContent
        );
        await expectFertilizerMap(document);
        await expect(firstCount).toBeGreaterThan(2);
        await userEvent.click(canvas.getByText(detailsLabel));
        await expect(
            canvas.getByRole("list", { name: listName })
        ).toHaveTextContent("Last Water: 2026-09-02");
        await userEvent.click(
            canvas.getByRole("button", { name: refreshName })
        );
        await waitFor(() =>
            expect(document.documentElement).toHaveAttribute(
                "data-refresh-waiting",
                "true"
            )
        );
        try {
            await expect(
                canvas.getByRole("button", { name: "Refreshing…" })
            ).toBeDisabled();
            await expectUnavailableMap(document);
        } finally {
            document.dispatchEvent(new Event("storybook-release-refresh"));
        }
        await waitFor(
            () =>
                expect(document.querySelector(sourceSelector)).toHaveAttribute(
                    sourceStateAttribute,
                    "error"
                ),
            { timeout: 5000 }
        );
        await expectUnavailableMap(document);
        await userEvent.click(
            canvas.getByRole("button", { name: refreshName })
        );
        await waitFor(() =>
            expect(document.querySelector(sourceSelector)).toHaveTextContent(
                loadedMessage
            )
        );
        await expect(
            document.querySelector('[data-pot-id="P01"] text.count')
                ?.textContent
        ).toBe(String(firstCount - 2));
        await expect(
            canvas.getByRole("list", { name: listName })
        ).toHaveTextContent("Last Water: 2026-09-04");
        await expectMapCoverage(document);
        await expect(
            canvas.getByRole("button", { name: svgLabel })
        ).toBeEnabled();
        await expect(
            canvas.getByRole("button", { name: pngLabel })
        ).toBeEnabled();
    },
};

export const NoWateringHistory: Story = {
    args: { scenario: "empty" },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector(sourceSelector)).toHaveTextContent(
                loadedMessage
            )
        );
        await userEvent.click(canvas.getByText(detailsLabel));
        await expect(document.querySelector(sourceSelector)).toHaveAttribute(
            "data-source",
            "live"
        );
        const list = canvas.getByRole("list", {
            name: listName,
        });
        await expect(list).toHaveTextContent("Days since watering: Unknown");
        await expect(list).not.toHaveTextContent("Last Water: 2026-");
        await expect(list).toHaveTextContent(
            "Nutrients at last Water: No Water record"
        );
        await expect(
            document.querySelectorAll(
                ":scope [data-pot-id] [data-fertilizer-badge]"
            )
        ).toHaveLength(0);
        const coverage = await expectMapCoverage(document);
        await expect(coverage.recorded).toBe(0);
        await expect(coverage.unknown).toBe(coverage.total);
        await expect(
            canvas.getByRole("button", { name: pngLabel })
        ).toBeEnabled();
    },
};
