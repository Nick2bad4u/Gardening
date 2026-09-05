import {
    createBrowserProject,
    createCrossBrowserProjects,
    createPlaywrightConfig,
} from "playwright-config-nick2bad4u";

export default createPlaywrightConfig({
    overrides: {
        use: {
            baseURL: "http://127.0.0.1:4173",
            headless: true,
            trace: "retain-on-failure",
        },
        webServer: {
            command: "node test/e2e/serve-pages.ts",
            reuseExistingServer: false,
            url: "http://127.0.0.1:4173",
        },
    },
    projects: [
        ...createCrossBrowserProjects().map((project) => ({
            ...project,
            use: {
                ...project.use,
                headless: true,
                ...(project.name === "chromium" &&
                    process.platform === "win32" && { channel: "msedge" }),
            },
        })),
        createBrowserProject({
            device: "Pixel 7",
            name: "mobile",
            use: {
                headless: true,
                viewport: { height: 844, width: 390 },
                ...(process.platform === "win32" && { channel: "msedge" }),
            },
        }),
    ],
    testDir: "./test/e2e",
    testMatch: "**/*.spec.ts",
});
