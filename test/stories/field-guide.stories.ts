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
    args: { path: "plants/", scenario: "ready", theme: "light", width: 1280 },
    argTypes: websiteArgTypes,
    component: renderWebsiteFrame,
    parameters: {
        docs: {
            description: {
                component:
                    "The modular plant directory and individual research pages, rendered by the same Astro components as the public site.",
            },
        },
        layout: "fullscreen",
    },
    title: "Website/Field guide",
} satisfies Meta<typeof renderWebsiteFrame>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Contents: Story = {
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await expect(
            canvas.getByRole("heading", { name: "Meet the plants." })
        ).toBeVisible();
        const search = canvas.getByRole("searchbox", { name: "Find a plant" });
        await userEvent.type(search, "pachira");
        await expect(
            document.querySelectorAll("[data-directory-entry]:not([hidden])")
        ).toHaveLength(1);
        await expect(
            canvas.getByRole("heading", { name: "Money tree" })
        ).toBeVisible();
        await userEvent.clear(search);
        await userEvent.type(search, "zzzz-no-such-plant-98765");
        await expect(document.querySelector("#plant-empty")).toBeVisible();
        await userEvent.clear(search);
        await userEvent.selectOptions(
            canvas.getByRole("combobox", { name: "Records" }),
            "historical"
        );
        await expect(
            document.querySelectorAll(
                '[data-directory-entry][data-historical="false"]:not([hidden])'
            )
        ).toHaveLength(0);
        await expect(
            document.querySelectorAll(
                '[data-directory-entry][data-historical="true"]:not([hidden])'
            ).length
        ).toBeGreaterThan(0);
        await expectNoOverflow(document);
    },
};

export const Home: Story = {
    args: { path: "" },
    play: async ({ canvasElement }) => {
        const { document } = await websiteCanvas(canvasElement);
        await expect(
            document.querySelectorAll("[data-plant-profile]")
        ).toHaveLength(0);
        await expect(
            document.querySelector("[data-reviewed-date]")
        ).toBeVisible();
        await expectNoOverflow(document);
    },
};

export const PlacementGuide: Story = {
    args: { path: "setup/placement/" },
    play: async ({ canvasElement }) => {
        const { document } = await websiteCanvas(canvasElement);
        await expect(
            document.querySelectorAll("main figure").length
        ).toBeGreaterThan(0);
        await expectNoOverflow(document);
    },
};
export const PlacementGuideMobile: Story = {
    ...PlacementGuide,
    args: { path: "setup/placement/", theme: "dark", width: 390 },
};

export const EquipmentGuide: Story = {
    args: { path: "setup/equipment/" },
    play: async ({ canvasElement }) => {
        const { document } = await websiteCanvas(canvasElement);
        await expect(
            document.querySelector(
                'main a[href="https://www.amazon.com/dp/B0D25H73ZS"]'
            )
        ).toBeVisible();
        await expectNoOverflow(document);
    },
};
export const EquipmentGuideMobile: Story = {
    ...EquipmentGuide,
    args: { path: "setup/equipment/", theme: "dark", width: 390 },
};

export const ProfileMobileDark: Story = {
    args: { path: "plants/pachira-glabra/", theme: "dark", width: 390 },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await expect(
            canvas.getByRole("heading", { name: "Money tree" })
        ).toBeVisible();
        await expect(
            document.querySelectorAll("[data-plant-profile]")
        ).toHaveLength(1);
        await expect(document.documentElement).toHaveAttribute(
            "data-theme",
            "dark"
        );
        await userEvent.click(
            canvas.getByRole("button", { name: "Switch to light theme" })
        );
        await expect(document.documentElement).toHaveAttribute(
            "data-theme",
            "light"
        );
        await userEvent.click(canvas.getByRole("button", { name: "Menu" }));
        await expect(
            document.querySelector("[data-menu-toggle]")
        ).toHaveAttribute("aria-expanded", "true");
        await userEvent.keyboard("{Escape}");
        await expect(
            document.querySelector("[data-menu-toggle]")
        ).toHaveAttribute("aria-expanded", "false");
        await expect(
            document.querySelector("[data-menu-toggle]")
        ).toHaveFocus();
        await expectNoOverflow(document);
    },
};

export const IdentificationEvidence: Story = {
    args: { path: "plants/aeonium-haworthii-dream-color/" },
    play: async ({ canvasElement }) => {
        const { document, userEvent } = await websiteCanvas(canvasElement);
        const details =
            document.querySelector<HTMLDetailsElement>(".meta-details");
        const summary = details?.querySelector("summary");
        if (!details || !summary)
            throw new Error("Identification evidence is missing.");
        await userEvent.click(summary);
        await expect(details).toHaveAttribute("open");
        await expect(details.textContent.length).toBeGreaterThan(
            summary.textContent.length
        );
        await expectNoOverflow(document);
    },
};

export const GlobalSearch: Story = {
    args: { path: "search/", theme: "dark", width: 390 },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        const search = canvas.getByRole("searchbox", {
            name: "Search plants, guides, and equipment",
        });
        await userEvent.type(search, "pachira");
        await waitFor(() =>
            expect(
                canvas.getByRole("heading", { name: "Money tree" })
            ).toBeVisible()
        );
        await userEvent.clear(search);
        await userEvent.type(search, "zzzz-no-such-plant-98765");
        await waitFor(() =>
            expect(document.querySelector("#search-status")).toHaveTextContent(
                "No results"
            )
        );
        await userEvent.click(canvas.getByRole("button", { name: "Search" }));
        await userEvent.clear(search);
        await expect(
            document.querySelector("#search-status")
        ).toHaveTextContent("Enter a name or topic");
        await expectNoOverflow(document);
    },
};
