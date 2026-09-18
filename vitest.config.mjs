import { defineConfig } from "vitest/config";

import { storybookViteConfig } from "./.storybook/vite-config.mjs";
// A Node-only run must not build or boot the browser workbench. Importing the
// Storybook plugin eagerly also evaluates its main config and fixture build.
const isUnitOnly = process.argv.some(
    (argument, index) =>
        argument === "--project=unit" ||
        (argument === "--project" && process.argv[index + 1] === "unit")
);
const browser = isUnitOnly
    ? undefined
    : await import("./vitest.storybook.config.mjs");

export default defineConfig({
    ...storybookViteConfig,
    test: {
        coverage:
            browser && process.env["VITEST_STORYBOOK"] === "true"
                ? browser.storybookCoverage
                : {
                      clean: true,
                      include: ["scripts/google-sheets/plant-tracker.gs"],
                      provider: "v8",
                      reporter: [
                          "text",
                          "text-summary",
                          "html",
                          "lcov",
                      ],
                      reportsDirectory: "coverage",
                      thresholds: {
                          branches: 90,
                          functions: 90,
                          lines: 90,
                          statements: 90,
                      },
                  },
        projects: [
            {
                test: {
                    clearMocks: true,
                    environment: "node",
                    // Native imports preserve V8 offsets in verbatim .gs VM source.
                    experimental: { viteModuleRunner: false },
                    include: ["test/**/*.test.mjs"],
                    name: "unit",
                    restoreMocks: true,
                },
            },
            ...(browser ? [browser.storybookProject] : []),
        ],
        slowTestThreshold: 300,
    },
});
