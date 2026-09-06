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
        // Tests execute .gs source verbatim in VM contexts. Native imports keep
        // V8 coverage offsets aligned with that source instead of Vite's SSR copy.
        experimental: { viteModuleRunner: false },
        include: ["test/**/*.test.mjs"],
        restoreMocks: true,
        slowTestThreshold: 300,
    },
});
