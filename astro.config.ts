import { defineConfig } from "astro/config";

export default defineConfig({
    base: process.env["GARDENING_SITE_BASE"] ?? "/Gardening",
    build: { format: "directory" },
    devToolbar: { enabled: false },
    outDir: process.env["GARDENING_SITE_OUT_DIR"] ?? "./.pages-site",
    output: "static",
    prefetch: {
        defaultStrategy: "load",
        prefetchAll: true,
    },
    publicDir: "./.cache/site-public",
    server: { host: "127.0.0.1", port: 5173 },
    site: "https://nick2bad4u.github.io",
    srcDir: "./site",
    trailingSlash: "always",
    vite: {
        build: {
            assetsInlineLimit:
                process.env["GARDENING_SITE_FIXTURES"] === "1" ? 0 : 4096,
            sourcemap: process.env["GARDENING_SITE_FIXTURES"] === "1",
        },
        environments: {
            // Astro's prerender environment must use its own cookie dependency,
            // not the older version hoisted by the independent Apps Script CLI.
            prerender: { resolve: { noExternal: ["cookie"] } },
        },
    },
});
