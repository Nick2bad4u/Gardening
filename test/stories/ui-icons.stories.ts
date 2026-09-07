import type { Meta, StoryObj } from "@storybook/react-vite";

import { createElement } from "react";

const icons = Object.keys(import.meta.glob("../../assets/ui-icons/*.svg"))
    .map((filename) => filename.slice(filename.lastIndexOf("/") + 1, -4))
    .toSorted((left, right) => left.localeCompare(right));

interface IconPreviewProps {
    background: string;
    name: string;
    size: number;
}

function renderIconPreview({
    background,
    name,
    size,
}: Readonly<IconPreviewProps>) {
    return createElement(
        "div",
        {
            style: {
                background,
                borderRadius: 16,
                display: "grid",
                minHeight: 160,
                minWidth: 160,
                padding: 24,
                placeItems: "center",
            },
        },
        createElement("img", {
            alt: `${name} icon`,
            height: size,
            src: `${import.meta.env.BASE_URL}assets/ui-icons/${name}.svg`,
            width: size,
        })
    );
}

const meta = {
    args: { background: "#f2eee4", name: "cactus", size: 64 },
    argTypes: {
        background: { control: "color", description: "Preview surface color." },
        name: {
            control: "select",
            description: "SVG from the maintained UI icon archive.",
            options: icons,
        },
        size: {
            control: { max: 128, min: 16, step: 8, type: "range" },
            description: "Icon width and height in pixels.",
        },
    },
    component: renderIconPreview,
    parameters: {
        docs: {
            description: {
                component:
                    "Browse the website's SVG icons on light and dark surfaces. These controls preview the actual archived SVG files.",
            },
        },
        layout: "centered",
    },
    render: renderIconPreview,
    title: "UI icons",
} satisfies Meta<IconPreviewProps>;

export default meta;

export const Light: StoryObj<typeof meta> = {};
export const Dark: StoryObj<typeof meta> = { args: { background: "#1a211b" } };
