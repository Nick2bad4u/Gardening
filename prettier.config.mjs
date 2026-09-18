import prettierConfig from "prettier-config-nick2bad4u";

/** @type {import("prettier").Config} */
const localConfig = {
    ...prettierConfig,
    overrides: [
        ...(prettierConfig.overrides ?? []),
        { files: "**/*.astro", options: { parser: "astro" } },
        {
            files: "**/*.ps1",
            options: {
                endOfLine: "crlf",
            },
        },
    ],
    plugins: [...(prettierConfig.plugins ?? []), "prettier-plugin-astro"],
};

export default localConfig;
