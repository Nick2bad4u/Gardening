import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        clearMocks: true,
        coverage: {
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
        environment: "node",
        include: ["test/**/*.test.mjs"],
        restoreMocks: true,
        slowTestThreshold: 300,
    },
});
