import { fileURLToPath } from "node:url";
import { createReactViteStorybookConfig } from "storybook-config-nick2bad4u";

import { preparePages } from "./prepare-pages.mjs";

const config = {
    ...createReactViteStorybookConfig({
        addons: [
            "@storybook/addon-themes",
            "storybook-addon-tag-badges",
            "@storybook/addon-vitest",
        ],
        profile: "accessibility",
        projectRoot: fileURLToPath(new URL("..", import.meta.url)),
        relativeProductionBase: true,
        stories: [
            "../test/stories/**/*.mdx",
            "../test/stories/**/*.stories.ts",
        ],
    }),
    staticDirs: await preparePages(),
};

export default config;
