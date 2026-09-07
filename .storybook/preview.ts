import type { Preview } from "@storybook/react-vite";

import "./preview.css";

const preview = {
    parameters: {
        options: {
            storySort: {
                order: [
                    "Get started",
                    "Website",
                    "UI icons",
                ],
            },
        },
    },
    tags: ["autodocs"],
} satisfies Preview;

export default preview;
