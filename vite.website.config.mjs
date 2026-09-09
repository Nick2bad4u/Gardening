import * as path from "node:path";
import { defineConfig, normalizePath } from "vite";

/** @type {[string, string][]} */
const websitePages = [
    ["Field guide", "/docs/plant-booklet/"],
    ["Plant tracker", "/docs/layouts/plant-tracker.html"],
    ["Plant history", "/docs/layouts/plant-history.html"],
    ["Photo album", "/docs/layouts/photo-album.html"],
    ["Grow-spot layout", "/docs/layouts/grow-spot-layout.html"],
    ["Calendar", "/docs/layouts/indoor-acclimation-calendar.html"],
];

export default defineConfig({
    appType: "mpa",
    cacheDir: ".cache/vite/website",
    optimizeDeps: { noDiscovery: true },
    plugins: [
        {
            configureServer(server) {
                server.middlewares.use((request, response, next) => {
                    if (request.url === "/") {
                        response.writeHead(302, {
                            Location: "/docs/plant-booklet/",
                        });
                        response.end();
                        return;
                    }
                    next();
                });

                const printUrls = server.printUrls.bind(server);
                server.printUrls = () => {
                    printUrls();
                    const base = server.resolvedUrls?.local[0];
                    if (base !== undefined) {
                        for (const [label, pathname] of websitePages) {
                            const url = new URL(pathname, base);
                            server.config.logger.info(
                                `  ${label}: ${url.href}`
                            );
                        }
                    }
                };
            },
            hotUpdate({ file, modules }) {
                // eslint-disable-next-line unicorn/no-this-outside-of-class -- Vite binds the environment to its plugin hooks.
                const { environment } = this;
                const relativeFile = normalizePath(
                    path.relative(environment.config.root, file)
                );
                // Classic scripts, fetched JSON, and SVG sprites are outside
                // Vite's module graph. CSS and module scripts use normal HMR.
                if (
                    environment.name === "client" &&
                    modules.length === 0 &&
                    /^(?:assets|docs)\/.*\.(?:jpe?g|js|json|png|svg|webp)$/v.test(
                        relativeFile
                    )
                ) {
                    environment.hot.send({ type: "full-reload" });
                    return [];
                }
                return undefined;
            },
            name: "gardening-website-preview",
        },
    ],
    publicDir: false,
    server: {
        host: "127.0.0.1",
        open: "/docs/plant-booklet/",
        port: 5173,
        strictPort: true,
        watch: {
            ignored: [
                "**/.cache/**",
                "**/.pages-site/**",
                "**/coverage/**",
                "**/playwright/**",
                "**/storybook-static/**",
            ],
        },
    },
});
