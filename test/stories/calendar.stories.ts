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
        path: "layouts/indoor-acclimation-calendar.html",
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
                    "The indoor acclimation calendar with day filters and task checkboxes. Changes stay in the current preview. Controls configure the preview wrapper around the maintained static page.",
            },
        },
        layout: "fullscreen",
    },
    title: "Website/Calendar",
} satisfies Meta<typeof renderWebsiteFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CompleteTaskAndToggleDays: Story = {
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        const task = document.querySelector<HTMLButtonElement>(
            "button[data-event-id]"
        );
        if (!task) throw new Error("Calendar did not render its tasks.");
        await expect(task).toHaveAttribute("aria-pressed", "false");
        await userEvent.click(task);
        await expect(task).toHaveAttribute("aria-pressed", "true");
        await userEvent.click(task);
        await expect(task).toHaveAttribute("aria-pressed", "false");
        await userEvent.click(
            canvas.getByRole("button", { name: "Hide empty days" })
        );
        await expect(
            canvas.getByRole("button", { name: "Show empty days" })
        ).toHaveAttribute("aria-pressed", "true");
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
