import type { StorybookConfig } from "@storybook/react-vite";

import { fileURLToPath } from "node:url";
import { createReactViteStorybookConfig } from "storybook-config-nick2bad4u";
import { mergeConfig } from "vite";

import { preparePages } from "./prepare-pages.mjs";
import { storybookViteConfig } from "./vite-config.mjs";

const sharedConfig = createReactViteStorybookConfig({
    addons: [
        "@storybook/addon-themes",
        "storybook-addon-tag-badges",
        "@storybook/addon-vitest",
    ],
    profile: "accessibility",
    projectRoot: fileURLToPath(new URL("..", import.meta.url)),
    relativeProductionBase: true,
    stories: ["../test/stories/**/*.mdx", "../test/stories/**/*.stories.ts"],
});

const config = {
    ...sharedConfig,
    staticDirs: await preparePages(),
    viteFinal: async (viteConfig, context) =>
        mergeConfig(
            (await sharedConfig.viteFinal?.(viteConfig, context)) ?? viteConfig,
            storybookViteConfig
        ),
} satisfies StorybookConfig;

export default config;
