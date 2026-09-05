import sharedConfig from "stylelint-config-nick2bad4u";

const inheritedPresets = Array.isArray(sharedConfig.extends)
    ? sharedConfig.extends
    : sharedConfig.extends === undefined
      ? []
      : [sharedConfig.extends];

/** @type {import("stylelint").Config} */
const stylelintConfig = {
    ...sharedConfig,
    // These are standalone pages. Docusaurus and Infima do not own their roots.
    extends: inheritedPresets.filter(
        (/** @type {string} */ preset) =>
            !preset.startsWith("stylelint-plugin-docusaurus/")
    ),
    languageOptions: {
        directionality: { block: "top-to-bottom", inline: "left-to-right" },
    },
    overrides: [
        ...(sharedConfig.overrides ?? []),
        {
            files: ["docs/layouts/plant-tracker.css"],
            // The rule misparses the nested min() in this valid minmax() track.
            rules: {
                "defensive-css/require-grid-minmax": [
                    true,
                    { ignore: [".photo-collection-grid"] },
                ],
            },
        },
        {
            files: ["docs/plant-booklet/booklet.css"],
            rules: {
                "defensive-css/require-grid-minmax": [
                    true,
                    { ignore: [".collection-photo-grid"] },
                ],
            },
        },
    ],
    rules: {
        ...Object.fromEntries(
            Object.entries(sharedConfig.rules ?? {}).filter(
                ([rule]) => !rule.startsWith("docusaurus/")
            )
        ),
        // Selectors in one declaration group share a cascade position.
        "no-descending-specificity": [
            true,
            { ignore: ["selectors-within-list"] },
        ],
        // These targets support the simple clipping/underlining used here;
        // the compatibility database also tracks unsupported variants of them.
        "plugin/no-unsupported-browser-features": [
            true,
            {
                browsers: [
                    "last 2 chrome versions",
                    "last 2 node major versions",
                    "not dead",
                ],
                ignore: ["multicolumn"],
                ignorePartialSupport: true,
            },
        ],
    },
};

export default stylelintConfig;
