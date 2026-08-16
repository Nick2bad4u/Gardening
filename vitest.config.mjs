import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            all: true,
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
                branches: 55,
                functions: 80,
                lines: 65,
                statements: 65,
            },
        },
    },
});
