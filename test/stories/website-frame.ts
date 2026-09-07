import type { Meta } from "@storybook/react-vite";

import axeSource from "axe-core/axe.min.js?raw";
import { createElement, type ReactElement, type SyntheticEvent } from "react";
import {
    expect,
    type queries,
    userEvent,
    waitFor,
    within,
} from "storybook/test";

export interface WebsiteFrameProps {
    path: string;
    scenario:
        | "empty"
        | "error"
        | "loading"
        | "ready"
        | "retry";
    theme: "dark" | "light";
    width: number;
}

export const websiteArgTypes = {
    path: {
        control: false,
        description:
            "Maintained HTML page and optional plant anchor or query within the fixture copies.",
        table: { type: { summary: "string" } },
    },
    scenario: {
        control: "select",
        description:
            "Synthetic spreadsheet response. Applies to the plant tracker and history pages.",
        options: [
            "ready",
            "loading",
            "empty",
            "error",
            "retry",
        ],
        table: { type: { summary: "ready | loading | empty | error | retry" } },
    },
    theme: {
        control: "inline-radio",
        description:
            "Initial page theme. Each preview has its own temporary preferences.",
        options: ["light", "dark"],
        table: { type: { summary: "light | dark" } },
    },
    width: {
        control: { max: 1440, min: 320, step: 10, type: "range" },
        description:
            "Preview width in pixels, capped by the available canvas. Mobile stories use 390 px.",
        table: { type: { summary: "number" } },
    },
} satisfies Meta<WebsiteFrameProps>["argTypes"];

export async function expectNoOverflow(
    document: Readonly<Document>
): Promise<void> {
    await waitFor(async () => {
        await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
            document.documentElement.clientWidth
        );
    });
}

export function releaseWebsiteFocus({
    canvasElement,
}: Readonly<{ canvasElement: Readonly<HTMLElement> }>): void {
    // Run before React begins unmounting so its saved focus belongs to the
    // still-live Storybook document, rather than the departing iframe.
    canvasElement.setAttribute("tabindex", "-1");
    canvasElement.focus();
}

export function renderWebsiteFrame({
    path,
    scenario,
    theme,
    width,
}: Readonly<WebsiteFrameProps>): ReactElement {
    const url = new URL(
        `${import.meta.env.BASE_URL}docs/${path}`,
        location.href
    );
    url.searchParams.set("scenario", scenario);
    url.searchParams.set("theme", theme);
    return createElement("iframe", {
        key: url.href,
        onLoad: installAxeInWebsiteFrame,
        src: url.href,
        style: {
            border: 0,
            display: "block",
            height: "900px",
            maxWidth: "100%",
            width,
        },
        title: "Gardening website preview",
    });
}

export async function websiteCanvas(
    canvasElement: Readonly<HTMLElement>
): Promise<{
    canvas: ReturnType<typeof within<typeof queries>>;
    document: Document;
    userEvent: ReturnType<typeof userEvent.setup>;
}> {
    const frame = canvasElement.querySelector("iframe");
    await waitFor(async () => {
        await expect(
            frame?.contentDocument?.querySelector("main")
        ).not.toBeNull();
        await expect(frame?.contentDocument?.readyState).toBe("complete");
    });
    const document = frame?.contentDocument;
    if (!document) throw new Error("Website preview did not load.");
    return {
        canvas: within(document.body),
        document,
        userEvent: userEvent.setup({ document }),
    };
}

function installAxeInWebsiteFrame(
    event: Readonly<SyntheticEvent<HTMLIFrameElement>>
): void {
    const document = event.currentTarget.contentDocument;
    if (!document || document.querySelector("script[data-axe-core]")) return;

    const script = document.createElement("script");
    script.dataset["axeCore"] = "true";
    // Keep the reviewed bundle intact: minifying axe.source's function before
    // stringifying it can leave references to variables outside that function.
    script.textContent = axeSource;
    document.head.append(script);
}
