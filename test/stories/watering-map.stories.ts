import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, waitFor } from "storybook/test";

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
const loadedMessage = "Published observations loaded.";
const detailsLabel = "Watering and placement details for every pot";

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
            preview.querySelectorAll("[data-pot-id]"),
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
        await expect(document.querySelector(sourceSelector)).toHaveTextContent(
            "Published snapshot · refreshing live observations."
        );
        await expect(document.querySelector(sourceSelector)).toHaveAttribute(
            "data-source",
            "published"
        );
        await expect(document.querySelector(imageSelector)).toBeVisible();
        await expect(
            canvas.getByRole("button", { name: "Refreshing…" })
        ).toBeDisabled();
        await expect(
            canvas.getByRole("button", { name: pngLabel })
        ).toBeEnabled();
        await expect(
            canvas.getByRole("button", { name: svgLabel })
        ).toBeEnabled();
        await userEvent.click(canvas.getByText(detailsLabel));
        await expect(
            canvas.getByRole("list", { name: listName })
        ).toHaveTextContent("Days since watering: 3");
        const coverage = await expectMapCoverage(document);
        await expect(coverage.recorded).toBeGreaterThan(0);
        await expect(coverage.unknown).toBeGreaterThan(0);
        await expectDarkMap(document);
    },
};

export const DatedSnapshotOffline: Story = {
    args: { scenario: "dated-error" },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector(sourceSelector)).toHaveTextContent(
                "Live refresh failed · showing published snapshot."
            )
        );
        await expect(document.querySelector(sourceSelector)).toHaveTextContent(
            "Counts fixed at its source-read date."
        );
        await expect(document.querySelector(sourceSelector)).toHaveAttribute(
            "data-source",
            "published"
        );
        await expect(
            document.querySelector(`${imageSelector} > svg`)
        ).toHaveAccessibleName(expect.stringContaining("2026-09-05"));
        await userEvent.click(canvas.getByText(detailsLabel));
        await expect(
            canvas.getByRole("list", { name: listName })
        ).toHaveTextContent("Days since watering: 3");
        await expectMapCoverage(document);
        await expectDarkMap(document);
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
        await userEvent.click(
            canvas.getByRole("button", { name: "Refresh data" })
        );
        await waitFor(() =>
            expect(document.querySelector(sourceSelector)).toHaveTextContent(
                loadedMessage
            )
        );
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
        await expectDarkMap(document);
        const menuButton = canvas.getByRole("button", { name: "Menu" });
        const navigation = document.querySelector("#site-nav");
        const mapShortcut = document.querySelector<HTMLAnchorElement>(
            '#site-nav a[href$="#watering-map"]'
        );
        if (!mapShortcut) throw new Error("Watering map shortcut is missing.");
        // Fixture query parameters have already loaded the data and theme.
        // Remove them so this production shortcut stays within the document.
        document.defaultView?.history.replaceState(
            null,
            "",
            `${document.location.pathname}${document.location.hash}`
        );
        await userEvent.click(menuButton);
        await expect(menuButton).toHaveAttribute("aria-expanded", "true");
        await expect(navigation).toBeVisible();
        await userEvent.click(mapShortcut);
        await expect(menuButton).toHaveAttribute("aria-expanded", "false");
        await expect(navigation).not.toBeVisible();
        await expect(document.location.hash).toBe("#watering-map");
        await userEvent.click(menuButton);
        await expect(menuButton).toHaveAttribute("aria-expanded", "true");
        mapShortcut.focus();
        await expect(mapShortcut).toHaveFocus();
        await userEvent.keyboard("{Enter}");
        await expect(menuButton).toHaveAttribute("aria-expanded", "false");
        await expect(navigation).not.toBeVisible();
        await expect(document.location.hash).toBe("#watering-map");
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
        await expect(canvas.getByText(detailsLabel)).toHaveFocus();
    },
};

export const Loading: Story = {
    args: { scenario: "loading" },
    play: async ({ canvasElement }) => {
        const { canvas, document } = await websiteCanvas(canvasElement);
        await expect(document.querySelector(sourceSelector)).toHaveTextContent(
            "Loading published watering observations…"
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
    },
};

export const Unavailable: Story = {
    args: { scenario: "invalid-snapshot" },
    play: async ({ canvasElement }) => {
        const { canvas, document } = await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector(sourceSelector)).toHaveTextContent(
                "Watering log unavailable"
            )
        );
        await expect(
            canvas.getByRole("button", { name: "Refresh data" })
        ).toBeEnabled();
        await expect(
            canvas.getByRole("button", { name: pngLabel })
        ).toBeDisabled();
        await expect(
            canvas.getByRole("button", { name: svgLabel })
        ).toBeDisabled();
        await expect(document.querySelector(imageSelector)).not.toBeVisible();
    },
};

export const RetryAfterFailure: Story = {
    args: { scenario: "retry" },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector(sourceSelector)).toHaveTextContent(
                "Watering log unavailable"
            )
        );
        await userEvent.click(
            canvas.getByRole("button", { name: "Refresh data" })
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
        const coverage = await expectMapCoverage(document);
        await expect(coverage.recorded).toBe(0);
        await expect(coverage.unknown).toBe(coverage.total);
        await expect(
            canvas.getByRole("button", { name: pngLabel })
        ).toBeEnabled();
    },
};
