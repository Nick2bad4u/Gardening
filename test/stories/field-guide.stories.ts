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
