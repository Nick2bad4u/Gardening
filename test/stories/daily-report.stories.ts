import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, waitFor } from "storybook/test";

import {
    expectNoOverflow,
    releaseWebsiteFocus,
    renderWebsiteFrame,
    websiteArgTypes,
    websiteCanvas,
} from "./website-frame.js";

const visibleCardsSelector = ".pot-card:not([hidden])";

const meta = {
    afterEach: releaseWebsiteFocus,
    args: {
        path: "layouts/daily-report.html",
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
                    "The daily garden report rendered from a fixed six-pot fixture. Care data, clipboard changes, and theme preferences stay inside this preview; the live workbook is never read.",
            },
        },
        layout: "fullscreen",
    },
    title: "Website/Daily report",
} satisfies Meta<typeof renderWebsiteFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SearchFiltersAndEvidence: Story = {
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await expect(document.querySelectorAll(".pot-card")).toHaveLength(6);
        await userEvent.click(canvas.getByRole("button", { name: "💧 Water" }));
        await expect(
            document.querySelectorAll(visibleCardsSelector)
        ).toHaveLength(2);
        await userEvent.click(
            canvas.getByRole("button", { name: "⏳ Dry reference only" })
        );
        await expect(document.querySelector("#pot-P08 summary")).toBeVisible();
        await expect(
            document.querySelectorAll(visibleCardsSelector)
        ).toHaveLength(1);
        await userEvent.click(canvas.getByRole("button", { name: "💧 Water" }));
        const search = canvas.getByRole("searchbox");
        await userEvent.type(search, "A1");
        await expect(
            document.querySelectorAll(visibleCardsSelector)
        ).toHaveLength(1);
        await userEvent.clear(search);
        await userEvent.type(search, "not a plant");
        await expect(document.querySelector("#no-matches")).toBeVisible();
        const link = document.querySelector<HTMLAnchorElement>(
            '#quick-list a[href="#pot-P21"]'
        );
        const summary = document.querySelector<HTMLElement>("#pot-P21 summary");
        if (!link || !summary)
            throw new Error("The money-tree fixture did not render.");
        await userEvent.click(link);
        await waitFor(() =>
            expect(document.querySelector("#pot-P21")).toHaveAttribute("open")
        );
        await expect(search).toHaveValue("");
        await expect(
            document.querySelectorAll(visibleCardsSelector)
        ).toHaveLength(6);
        await userEvent.click(summary);
        await expect(document.querySelector("#pot-P21")).not.toHaveAttribute(
            "open"
        );
        await userEvent.click(link);
        await waitFor(() =>
            expect(document.querySelector("#pot-P21")).toHaveAttribute("open")
        );
        await userEvent.click(
            canvas.getByRole("button", {
                name: "⏸️ Nothing today",
            })
        );
        await expect(document.querySelector("#pot-P06 summary")).toBeVisible();
        await expect(
            document.querySelectorAll(visibleCardsSelector)
        ).toHaveLength(1);
        await expectNoOverflow(document);
    },
};

export const MobileThemeAndStaleDate: Story = {
    args: { theme: "dark", width: 390 },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        const view = document.defaultView;
        if (!view) throw new Error("Report preview window is unavailable.");
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
        await userEvent.click(
            canvas.getByRole("button", { name: "Dark mode" })
        );
        await expect(document.documentElement).toHaveAttribute(
            "data-theme",
            "dark"
        );
        document.body.dataset["reportDate"] = "2000-01-01";
        view.dispatchEvent(new Event("pageshow"));
        await expect(
            document.querySelector("#freshness-message")
        ).toHaveTextContent("not been refreshed for today");
        await expect(
            document.querySelector("#freshness-message")
        ).toBeVisible();
        document.body.dataset["reportDate"] = "2999-01-01";
        document.dispatchEvent(new Event("visibilitychange"));
        await expect(
            document.querySelector("#freshness-message")
        ).toHaveTextContent("ahead of the current Eastern date");
        await expectNoOverflow(document);
    },
};

export const CopyAndPrint: Story = {
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        const view = document.defaultView;
        if (!view) throw new Error("Report preview window is unavailable.");
        let copied = "";
        Object.defineProperty(view.navigator, "clipboard", {
            configurable: true,
            value: {
                writeText: (value: string) => {
                    copied = value;
                    return Promise.resolve();
                },
            },
        });
        const button = canvas.getByRole("button", {
            name: "Copy list",
        });
        await userEvent.click(button);
        await waitFor(() =>
            expect(document.querySelector("#copy-status")).toHaveTextContent(
                "Quick list copied."
            )
        );
        await expect(copied).toContain("A1, A3");
        await expect(copied).not.toContain("A1, A3, C2");
        await expect(copied).toContain("Dry reference only: C2");
        await expect(copied).toContain("Nothing today: B3");
        await expect(copied).toContain(
            "🤖 AI recommendation — separate assessment"
        );
        await expect(copied.indexOf("🤖 AI recommendation")).toBeGreaterThan(
            copied.indexOf("Nothing today: B3")
        );
        await expect(copied).toContain(
            "Prioritize #3's missing post-water weight"
        );
        Object.defineProperty(view.navigator, "clipboard", {
            configurable: true,
            value: {
                writeText: () =>
                    Promise.reject(
                        new Error("Clipboard unavailable in this test.")
                    ),
            },
        });
        await userEvent.click(button);
        await waitFor(() =>
            expect(document.querySelector("#copy-status")).toHaveTextContent(
                "Copy is unavailable"
            )
        );
        await userEvent.click(canvas.getByRole("button", { name: "⚖️ Weigh" }));
        view.dispatchEvent(new Event("beforeprint"));
        await expect(document.querySelectorAll(".pot-card[open]")).toHaveLength(
            6
        );
        await expect(
            document.querySelectorAll(".pot-card[hidden]")
        ).toHaveLength(0);
        view.dispatchEvent(new Event("afterprint"));
        await expect(document.querySelectorAll(".pot-card[open]")).toHaveLength(
            0
        );
        await expect(
            document.querySelectorAll(visibleCardsSelector)
        ).toHaveLength(1);
    },
};
