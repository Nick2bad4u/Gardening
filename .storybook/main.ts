import { fileURLToPath } from "node:url";
import { createReactViteStorybookConfig } from "storybook-config-nick2bad4u";

export default createReactViteStorybookConfig({
    profile: "accessibility",
    projectRoot: fileURLToPath(new URL("..", import.meta.url)),
    staticDirs: ["../assets"],
    stories: ["../test/stories/**/*.stories.ts"],
});
