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
        path: "plant-booklet/index.html#contents",
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
                    "The collection reader: searchable contents, plant profiles, keyboard navigation, and a mobile dark preview. Controls configure the preview wrapper around the maintained static page.",
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
        const { canvas, document } = await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(
                canvas.getByRole("heading", {
                    name: "A field guide to the collection.",
                })
            ).toBeVisible()
        );
        await expectNoOverflow(document);
    },
};

export const SearchAndOpenPlant: Story = {
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await userEvent.click(canvas.getByRole("button", { name: "Contents" }));
        const dialog = canvas.getByRole("dialog");
        const search = within(dialog).getByRole("searchbox");
        await userEvent.type(search, "zzzz no such plant");
        await expect(
            document.querySelector("#search-status")
        ).toHaveTextContent("0");
        await userEvent.clear(search);
        await userEvent.type(search, "pachira");
        await expect(
            document.querySelector("#search-status")
        ).toHaveTextContent("1");
        await userEvent.click(
            within(dialog).getByRole("link", { name: /Money tree/v })
        );
        await waitFor(() =>
            expect(
                canvas.getByRole("heading", { name: "Money tree" })
            ).toBeVisible()
        );
        await expect(dialog).not.toBeVisible();
        await expect(
            document.querySelectorAll(".profile-page[data-profile-mounted]")
        ).toHaveLength(1);
    },
};

export const ProfileMobileDark: Story = {
    args: {
        path: "plant-booklet/index.html#pachira-glabra",
        theme: "dark",
        width: 390,
    },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(
                canvas.getByRole("heading", { name: "Money tree" })
            ).toBeVisible()
        );
        await expect(document.documentElement).toHaveAttribute(
            "data-theme",
            "dark"
        );
        await expectNoOverflow(document);
        await userEvent.click(
            document.querySelector<HTMLButtonElement>("#theme-toggle") ??
                canvas.getByRole("button", { name: "Theme" })
        );
        await expect(document.documentElement).toHaveAttribute(
            "data-theme",
            "light"
        );
    },
};

export const KeyboardNavigation: Story = {
    args: { path: "plant-booklet/index.html#cover" },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        const keyboard = userEvent;
        await keyboard.click(document.body);
        await keyboard.keyboard("{ArrowRight}");
        await waitFor(() =>
            expect(document.querySelector("#contents")).toBeVisible()
        );
        await keyboard.keyboard("/");
        await expect(document.querySelector("#contents-dialog")).toBeVisible();
        await expect(document.querySelector("#plant-search")).toHaveFocus();
        await keyboard.click(
            canvas.getByRole("button", { name: "Close contents" })
        );
        await expect(
            document.querySelector("#contents-dialog")
        ).not.toBeVisible();
    },
};

export const HoverPageControls: Story = {
    args: { path: "plant-booklet/index.html#nyctocereus-serpentinus" },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        const view = document.defaultView;
        if (!view) throw new Error("Website preview window is unavailable.");
        const controls = canvas.getByRole("navigation", {
            name: "Page navigation",
        });
        const previous = canvas.getByRole("button", {
            name: "Previous Feather cactus",
        });
        view.scrollTo({ behavior: "instant", top: 600 });
        await waitFor(() => expect(controls).toHaveClass("is-scroll-hidden"));
        const bounds = previous.getBoundingClientRect();
        await userEvent.pointer({
            coords: {
                clientX: bounds.left + bounds.width / 2,
                clientY: view.innerHeight - 1,
            },
            target: document.body,
        });
        await expect(controls).not.toHaveClass("is-scroll-hidden");
        await userEvent.click(
            canvas.getByRole("button", { name: "Next Grass-blade cactus" })
        );
        await waitFor(() =>
            expect(
                canvas.getByRole("heading", { name: "Grass-blade cactus" })
            ).toBeVisible()
        );
    },
};

export const PrintIdentificationEvidence: Story = {
    args: { path: "plant-booklet/index.html#aeonium-haworthii-dream-color" },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        const view = document.defaultView;
        if (!view) throw new Error("Website preview window is unavailable.");
        await userEvent.click(
            canvas.getByText("Likely Cultivar", { exact: true })
        );
        // Exercise browser print lifecycle events without opening a system print dialog.
        view.dispatchEvent(new Event("beforeprint"));
        await expect(
            document.querySelectorAll(".profile-page[data-profile-mounted]")
        ).toHaveLength(36);
        await expect(
            document.querySelectorAll(".meta-details:not([open])")
        ).toHaveLength(0);
        view.dispatchEvent(new Event("afterprint"));
        await expect(
            document.querySelectorAll(".profile-page[data-profile-mounted]")
        ).toHaveLength(1);
        await expect(
            document.querySelectorAll(".meta-details[open]")
        ).toHaveLength(1);
        await expect(
            canvas.getByText(
                "probable cultivar; appearance is consistent, but no nursery label or seller provenance is archived",
                { exact: true }
            )
        ).toBeVisible();
        await userEvent.click(
            canvas.getByText("Likely Cultivar", { exact: true })
        );
        await expect(
            document.querySelectorAll(".meta-details[open]")
        ).toHaveLength(0);
    },
};
