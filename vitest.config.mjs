import { defineConfig } from "vitest/config";

import {
    storybookCoverage,
    storybookProject,
} from "./vitest.storybook.config.mjs";

export default defineConfig({
    test: {
        coverage:
            process.env["VITEST_STORYBOOK"] === "true"
                ? storybookCoverage
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
            storybookProject,
        ],
        slowTestThreshold: 300,
    },
});
