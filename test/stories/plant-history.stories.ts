import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, waitFor } from "storybook/test";

import {
    expectNoOverflow,
    releaseWebsiteFocus,
    renderWebsiteFrame,
    websiteArgTypes,
    websiteCanvas,
} from "./website-frame.js";

const meta = {
    afterEach: releaseWebsiteFocus,
    args: {
        path: "layouts/plant-history.html?id=P01",
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
                    "Per-plant measurements and charts with synthetic observations, including empty history, unknown plants, and unavailable data. Controls configure the preview wrapper around the maintained static page.",
            },
        },
        layout: "fullscreen",
    },
    title: "Website/Plant history",
} satisfies Meta<typeof renderWebsiteFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MeasurementsAndFilters: Story = {
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector("#page-status")).toHaveTextContent(
                "Showing 4"
            )
        );
        await expect(
            document.querySelector("#latest-weight")
        ).toHaveTextContent("550 g");
        await expect(document.querySelector("#dry-average")).toHaveTextContent(
            "400.0 g"
        );
        await expect(document.querySelector("#wet-average")).toHaveTextContent(
            "600.0 g"
        );
        await expect(
            document.querySelector("#weight-chart svg")
        ).toBeInTheDocument();
        await userEvent.selectOptions(
            canvas.getByRole("combobox", { name: "Event type" }),
            "Water"
        );
        await expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "Plain water"
        );
        await userEvent.type(
            canvas.getByRole("searchbox", { name: "Search this history" }),
            "no such note"
        );
        await expect(
            canvas.getByText("No observations match the current filters.")
        ).toBeVisible();
        await userEvent.clear(
            canvas.getByRole("searchbox", { name: "Search this history" })
        );
        await userEvent.selectOptions(
            canvas.getByRole("combobox", { name: "Event type" }),
            "all"
        );
        await expect(document.querySelectorAll("tbody tr")).toHaveLength(4);
    },
};

export const MobileDark: Story = {
    args: { theme: "dark", width: 390 },
    play: async ({ canvasElement }) => {
        const { document } = await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector("#page-status")).toHaveTextContent(
                "Showing 4"
            )
        );
        await expect(document.documentElement).toHaveAttribute(
            "data-theme",
            "dark"
        );
        await expectNoOverflow(document);
    },
};

export const NoObservations: Story = {
    args: { path: "layouts/plant-history.html?id=P03" },
    play: async ({ canvasElement }) => {
        const { canvas, document } = await websiteCanvas(canvasElement);
        await expect(
            await canvas.findByText(
                "No observations have been logged for this plant yet."
            )
        ).toBeVisible();
        await expect(
            document.querySelector("#latest-weight")
        ).toHaveTextContent("Not logged");
        await expect(document.querySelector("#weight-chart")).toHaveTextContent(
            "No weights in this chart range yet."
        );
    },
};

export const UnknownPlant: Story = {
    args: { path: "layouts/plant-history.html?id=unknown" },
    play: async ({ canvasElement }) => {
        const { document } = await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector("#page-status")).toHaveTextContent(
                "No collection label matches"
            )
        );
        await expect(document.querySelector("#plant-label")).toHaveTextContent(
            "Plant not found"
        );
    },
};

export const Unavailable: Story = {
    args: { scenario: "error" },
    play: async ({ canvasElement }) => {
        const { document } = await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector("#page-status")).toHaveTextContent(
                "503"
            )
        );
    },
};
