import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect } from "storybook/test";

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
        path: "layouts/photo-album.html",
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
                    "The collection photo index with searchable cards. Remote photo previews are replaced with labeled placeholders. Controls configure the preview wrapper around the maintained static page.",
            },
        },
        layout: "fullscreen",
    },
    title: "Website/Photo album",
} satisfies Meta<typeof renderWebsiteFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SearchAndClear: Story = {
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        const search = canvas.getByRole("searchbox");
        await userEvent.type(search, "pachira");
        await expect(
            document.querySelector("#collection-search-status")
        ).toHaveTextContent("1 matching Collection");
        await expect(
            canvas.getByRole("heading", { name: /Money tree/v })
        ).toBeVisible();
        await userEvent.clear(search);
        await userEvent.type(search, "no such plant");
        await expect(
            document.querySelector("#photo-album-empty")
        ).toBeVisible();
        await userEvent.clear(search);
        await expect(
            document.querySelector("#photo-album-empty")
        ).not.toBeVisible();
        await expect(
            document.querySelectorAll("[data-photo-collection][hidden]")
        ).toHaveLength(0);
    },
};

export const MobileDark: Story = {
    args: { theme: "dark", width: 390 },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await expectNoOverflow(document);
        await expect(document.documentElement).toHaveAttribute(
            "data-theme",
            "dark"
        );
        await userEvent.click(
            canvas.getByRole("button", { name: "Light mode" })
        );
        await expect(document.documentElement).toHaveAttribute(
            "data-theme",
            "light"
        );
    },
};
