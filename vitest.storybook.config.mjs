import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import { storybookViteConfig } from "./.storybook/vite-config.mjs";

/** @type {import("vitest/node").CoverageOptions} */
export const storybookCoverage = {
    include: ["docs/plant-booklet/booklet.js", "docs/layouts/*.js"],
    provider: "v8",
    reporter: [
        "text",
        "text-summary",
        "html",
        "lcov",
    ],
    reportsDirectory: "coverage/storybook",
    thresholds: { branches: 60, functions: 80, lines: 80, statements: 80 },
};

/** @type {import("vitest/config").UserWorkspaceConfig} */
export const storybookProject = {
    ...storybookViteConfig,
    // The interactive runner must prebundle the assertion libraries and their
    // CommonJS dependencies before serving them to Chromium.
    optimizeDeps: { include: ["storybook/test", "vitest"] },
    plugins: [storybookTest({ configDir: ".storybook" })],
    test: {
        browser: {
            enabled: true,
            headless: true,
            instances: [{ browser: "chromium" }],
            provider: playwright({
                launchOptions:
                    process.platform === "win32" ? { channel: "msedge" } : {},
            }),
        },
        name: "storybook",
        testTimeout: 15_000,
    },
};

export default defineConfig({
    ...storybookViteConfig,
    test: { coverage: storybookCoverage, projects: [storybookProject] },
});
