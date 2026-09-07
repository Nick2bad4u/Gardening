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
        path: "layouts/grow-spot-layout.html",
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
                    "The grow-spot diagrams with layout tabs, riser measurements, and a mobile dark preview. Controls configure the preview wrapper around the maintained static page.",
            },
        },
        layout: "fullscreen",
    },
    title: "Website/Grow-spot layout",
} satisfies Meta<typeof renderWebsiteFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TabsAndRiserMeasurements: Story = {
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await userEvent.click(canvas.getByRole("tab", { name: "Room layout" }));
        await userEvent.keyboard("{ArrowRight}");
        await expect(
            canvas.getByRole("tab", { name: "Plant map" })
        ).toHaveAttribute("aria-selected", "true");
        await expect(document.querySelector("#tables")).toBeVisible();
        await expect(document.querySelector("#room")).not.toBeVisible();
        await userEvent.click(
            canvas.getByRole("tab", { name: "Height + risers" })
        );
        const target = canvas.getByRole("spinbutton", {
            name: "Target starter canopy above wood",
        });
        await userEvent.clear(target);
        await expect(document.querySelector("#riser-result")).toHaveTextContent(
            "Enter both canopy measurements."
        );
        await userEvent.type(target, "8.5");
        await expect(document.querySelector("#riser-result")).toHaveTextContent(
            "2.75"
        );
        await userEvent.keyboard("{Tab}");
        await expect(
            canvas.getByRole("spinbutton", { name: "Selected tip above wood" })
        ).toHaveFocus();
    },
};

export const MobileDark: Story = {
    args: { theme: "dark", width: 390 },
    play: async ({ canvasElement }) => {
        const { document } = await websiteCanvas(canvasElement);
        await expect(document.documentElement).toHaveAttribute(
            "data-theme",
            "dark"
        );
        await expectNoOverflow(document);
    },
};
