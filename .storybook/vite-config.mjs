// Generated reports and builds must not reload previews or restart test watchers.
/** @type {import("vite").UserConfig} */
export const storybookViteConfig = {
    server: {
        watch: {
            ignored: [
                "**/.pages-site/**",
                "**/coverage/**",
                "**/storybook-static/**",
            ],
        },
    },
};
