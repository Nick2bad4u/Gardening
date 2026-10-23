import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, waitFor } from "storybook/test";

import {
    expectNoOverflow,
    releaseWebsiteFocus,
    renderWebsiteFrame,
    websiteArgTypes,
    websiteCanvas,
} from "./website-frame.js";

const pngLabel = "Download PNG";
const sourceSelector = "#watering-map-source";
const loadedMessage = "Published observations loaded.";
const detailsLabel = "Watering and placement details for every pot";

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
        await expect(
            document.querySelector("#watering-map-image")
        ).toBeVisible();
        await userEvent.click(canvas.getByText(detailsLabel));
        const list = canvas.getByRole("list", {
            name: "Watering details by pot",
        });
        await expect(list).toHaveTextContent("Last Water: 2026-09-02");
        await expect(list).toHaveTextContent("Days since watering: Unknown");
        await expect(list).toHaveTextContent("P20");
        await userEvent.click(
            canvas.getByRole("button", { name: "Download SVG" })
        );
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
            canvas.getByRole("list", { name: "Watering details by pot" })
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
            canvas.getByRole("button", { name: "Download SVG" })
        ).toBeDisabled();
    },
};

export const Unavailable: Story = {
    args: { scenario: "error" },
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
            canvas.getByRole("button", { name: "Download SVG" })
        ).toBeDisabled();
        await expect(
            document.querySelector("#watering-map-image")
        ).not.toBeVisible();
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
        await expect(
            document.querySelector("#watering-map-image")
        ).toBeVisible();
        await expect(
            canvas.getByRole("button", { name: "Download SVG" })
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
        const list = canvas.getByRole("list", {
            name: "Watering details by pot",
        });
        await expect(list).toHaveTextContent("Days since watering: Unknown");
        await expect(list).not.toHaveTextContent("Last Water: 2026-");
        await expect(
            canvas.getByRole("button", { name: pngLabel })
        ).toBeEnabled();
    },
};
