import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, waitFor, within } from "storybook/test";

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
        path: "layouts/plant-tracker.html",
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
                    "The collection dashboard with synthetic observations: search, filters, sorting, loading, retry, empty data, and mobile display. Controls configure the preview wrapper around the maintained static page.",
            },
        },
        layout: "fullscreen",
    },
    title: "Website/Plant tracker",
} satisfies Meta<typeof renderWebsiteFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SearchFilterAndSort: Story = {
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(
                document.querySelector("#container-count")
            ).toHaveTextContent("3")
        );
        await expect(
            document.querySelector("#observation-count")
        ).toHaveTextContent("5");
        const search = canvas.getByRole("searchbox", { name: "Find a plant" });
        await userEvent.type(search, "P01");
        await expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
        await expect(canvas.getByRole("link", { name: "1" })).toHaveAttribute(
            "href",
            "./plant-history.html?id=P01"
        );
        await userEvent.clear(search);
        await userEvent.selectOptions(
            canvas.getByRole("combobox", { name: "Show" }),
            "has-weight"
        );
        await expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
        await userEvent.selectOptions(
            canvas.getByRole("combobox", { name: "Show" }),
            "all"
        );
        await userEvent.click(canvas.getByRole("button", { name: "Label ↕" }));
        const table = canvas.getByRole("table");
        await expect(
            within(table).getByRole("columnheader", { name: "Label ↕" })
        ).toHaveAttribute("aria-sort", "descending");
        await expect(document.querySelector("tbody tr")).toHaveTextContent(
            "Serpent cactus"
        );
        await userEvent.type(search, "no such plant");
        await expect(
            canvas.getByText("No plants match the current search and filter.")
        ).toBeVisible();
    },
};

export const MobileDark: Story = {
    args: { theme: "dark", width: 390 },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(
                document.querySelector("#container-count")
            ).toHaveTextContent("3")
        );
        await expect(document.documentElement).toHaveAttribute(
            "data-theme",
            "dark"
        );
        await expectNoOverflow(document);
        await userEvent.click(
            canvas.getByRole("button", { name: "Maximize table" })
        );
        await expect(
            canvas.getByRole("button", { name: "Restore page" })
        ).toHaveAttribute("aria-pressed", "true");
        await expectNoOverflow(document);
        await userEvent.click(
            canvas.getByRole("button", { name: "Restore page" })
        );
        await expect(
            canvas.getByRole("button", { name: "Maximize table" })
        ).toHaveAttribute("aria-pressed", "false");
    },
};

export const Loading: Story = {
    args: { scenario: "loading" },
    play: async ({ canvasElement }) => {
        const { canvas } = await websiteCanvas(canvasElement);
        await expect(
            canvas.getByText("Loading the latest Google Sheets observations…")
        ).toBeVisible();
        await expect(
            canvas.getByRole("button", { name: "Refresh data" })
        ).toBeDisabled();
    },
};

export const Unavailable: Story = {
    args: { scenario: "error" },
    play: async ({ canvasElement }) => {
        const { canvas } = await websiteCanvas(canvasElement);
        await expect(
            await canvas.findByText(/Live data unavailable/v)
        ).toBeVisible();
        await expect(
            canvas.getByRole("button", { name: "Refresh data" })
        ).toBeEnabled();
    },
};

export const RetryAfterFailure: Story = {
    args: { scenario: "retry" },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await expect(
            await canvas.findByText(/Live data unavailable/v)
        ).toBeVisible();
        await userEvent.click(
            canvas.getByRole("button", { name: "Refresh data" })
        );
        await waitFor(() =>
            expect(document.querySelector("#sheet-status")).toHaveTextContent(
                "3 containers and 5 observations loaded"
            )
        );
        await expect(document.querySelectorAll("tbody tr")).toHaveLength(3);
    },
};

export const NoObservations: Story = {
    args: { scenario: "empty" },
    play: async ({ canvasElement }) => {
        const { document } = await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector("#sheet-status")).toHaveTextContent(
                "3 containers and 0 observations loaded"
            )
        );
        await expect(document.querySelectorAll("tbody tr")).toHaveLength(3);
        await expect(
            document.querySelector("#baseline-count")
        ).toHaveTextContent("0");
    },
};
