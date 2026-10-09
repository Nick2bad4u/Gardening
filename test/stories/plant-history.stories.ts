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
        path: "pots/P01/",
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
        await expect(
            canvas.getByText(
                "Elapsed days between recorded soak-to-runoff events."
            )
        ).toBeVisible();
        await expect(
            document.querySelector("#watering-chart-summary")
        ).toHaveTextContent(
            "Log Water only when the container is actually soaked to runoff."
        );
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
    args: { path: "pots/P03/" },
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
    args: { path: "pots/?id=unknown" },
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

export const TerrariumHumidity: Story = {
    args: {
        path: "pots/P38/",
        scenario: "humidity",
        theme: "dark",
        width: 390,
    },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(
                document.querySelector("#latest-humidity")
            ).toHaveTextContent("65.5 % RH")
        );
        await expect(document.querySelector("#plant-name")).toHaveTextContent(
            "Terrarium"
        );
        await expect(
            document.querySelector("#plant-scientific")
        ).toHaveTextContent("Plant identities pending");
        await expect(
            document.querySelector("#humidity-chart svg")
        ).toBeInTheDocument();
        await expect(document.querySelector("#last-watered")).toHaveTextContent(
            "Not logged"
        );
        await userEvent.selectOptions(
            canvas.getByRole("combobox", { name: "Event type" }),
            "humidity"
        );
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "0% RH"
        );
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "100% RH"
        );
        await expect(
            document.querySelector(".baseline-panel")
        ).not.toBeVisible();
        await expect(
            document.querySelector("#baseline-status")
        ).toHaveTextContent("Manual care review");
        await expect(
            canvas.getByText(
                "Recorded weights only; no dry or wet care targets are assigned."
            )
        ).toBeVisible();
        await expect(
            canvas.getByText(
                "Past intervals are descriptive history, not a watering schedule."
            )
        ).toBeVisible();
        await expect(
            document.querySelector("#watering-chart")
        ).toHaveTextContent(
            "No recorded watering intervals in this chart range."
        );
        await expect(
            document.querySelector("#watering-chart-summary")
        ).toHaveTextContent(
            "Review the plants and enclosure before choosing a watering method. Recorded intervals do not set a care schedule."
        );
        await expect(
            document.querySelector(".charts-panel")
        ).not.toHaveTextContent(
            /dry and wet means|soak(?:ed)? to runoff|soak-to-runoff/v
        );
        await expectNoOverflow(document);
    },
};

export const TerrariumDesktopLight: Story = {
    ...TerrariumHumidity,
    args: { ...TerrariumHumidity.args, theme: "light", width: 1280 },
};

export const TerrariumDesktopDark: Story = {
    ...TerrariumHumidity,
    args: { ...TerrariumHumidity.args, theme: "dark", width: 1280 },
};

export const TerrariumMobileLight: Story = {
    ...TerrariumHumidity,
    args: { ...TerrariumHumidity.args, theme: "light", width: 390 },
};
