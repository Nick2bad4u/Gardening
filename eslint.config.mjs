import { createConfig } from "eslint-config-nick2bad4u";

import parser from "./scripts/html-eslint-parser.mjs";

/** @type {import("eslint").Linter.Config[]} */
const sharedConfig = createConfig({
    allowDefaultProjectFilePatterns: [],
    // This is a private gardening notebook, not a distributable open-source package.
    // Its contribution/release policy is defined in AGENTS.md.
    plugins: { "repo-compliance": false, "testing-library": false },
    vitest: { files: ["test/**/*.test.mjs"] },
}).flatMap(
    /** @returns {import("eslint").Linter.Config[]} */ (entry) => {
        if (
            entry.ignores?.includes(
                "scripts/**/*.{js,jsx,mjs,cjs,ts,tsx,cts,mts}"
            ) === true
        ) {
            return [
                {
                    ...entry,
                    ignores: entry.ignores.filter(
                        (pattern) =>
                            pattern !==
                            "scripts/**/*.{js,jsx,mjs,cjs,ts,tsx,cts,mts}"
                    ),
                },
            ];
        }
        // JavaScript comment rules cannot inspect the HTML parser's comment AST.
        // Keep those rules on scripts; the shared HTML rules still check markup.
        if (
            entry.rules?.["@stylistic/spaced-comment"] !== undefined &&
            entry.files === undefined
        ) {
            return [
                ...(entry.plugins ? [{ plugins: entry.plugins }] : []),
                { ...entry, files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"] },
            ];
        }
        if (entry.name === "🧪 Test Signal: All") {
            return [{ ...entry, files: ["test/**/*.test.mjs"] }];
        }
        if (entry.name?.startsWith("🎭 Playwright E2E Tests:") === true) {
            return [{ ...entry, files: ["test/e2e/**/*.spec.ts"] }];
        }
        return [entry];
    }
);

/** @type {import("eslint").Linter.Config[]} */
const config = [
    ...sharedConfig,
    {
        files: ["**/*.{yaml,yml}"],
        name: "Gardening: YAML and shared formatter agreement",
        rules: {
            "yamllint/yamllint": [
                "error",
                { configFile: "yaml-policy.config.mjs" },
            ],
        },
    },
    {
        files: ["**/*.toml"],
        name: "Gardening: TOML validation with Prettier formatting",
        rules: {
            "tombi/tombi": [
                "error",
                { check: false, format: false, lint: true },
            ],
        },
    },
    {
        files: [
            ".github/workflows/logger-coverage.yml",
            ".github/workflows/sonarqube-cloud.yml",
        ],
        name: "Gardening: direct pull requests without a merge queue",
        // The live repository ruleset has no merge queue. Keep these checks
        // on their existing push/pull_request payloads until one is configured.
        rules: { "github-actions/require-merge-group-trigger": "off" },
    },
    {
        files: [".github/workflows/pages.yml"],
        name: "Gardening: serialized production deployment",
        rules: {
            "github-actions/require-workflow-concurrency": [
                "error",
                { requireCancelInProgress: false },
            ],
        },
    },
    {
        files: ["**/*.html"],
        languageOptions: { parser },
        name: "Gardening: HTML parser and maintained markup conventions",
        rules: {
            // Prettier owns HTML whitespace and attribute layout. Its handling
            // of inline text boundaries deliberately differs from these rules.
            "@html-eslint/attrs-newline": "off",
            "@html-eslint/element-newline": "off",
            // Public plant anchors use slugs; Apps Script bindings use camelCase.
            "@html-eslint/id-naming-convention": [
                "error",
                "regex",
                { pattern: "^[a-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*$" },
            ],
            "@html-eslint/no-extra-spacing-tags": "off",
            "@html-eslint/sort-attrs": "off",
            "@html-eslint/use-baseline": ["error", { available: 2024 }],
        },
    },
    {
        files: ["docs/plant-booklet/index.html"],
        name: "Gardening: separately routed field-guide pages",
        // Each hidden profile template owns a page heading. Browser tests check
        // that the active route exposes one heading to assistive technology.
        rules: { "@html-eslint/no-multiple-h1": "off" },
    },
    {
        files: [
            "docs/plant-booklet/index.html",
            "docs/layouts/photo-album.html",
        ],
        name: "Gardening: previews with CSS-reserved image geometry",
        // These exact classes own both dimensions or a width plus aspect ratio.
        // External capture dimensions are unknown; do not invent intrinsic sizes.
        rules: {
            "@html-eslint/require-explicit-size": [
                "error",
                {
                    allowClass: [
                        "plant-avatar--hero",
                        "collection-preview-image",
                    ],
                },
            ],
        },
    },
    {
        files: ["scripts/google-sheets/Index.html"],
        name: "Gardening: Apps Script HTML service document",
        rules: {
            // HtmlService ignores inline viewport tags; doGet().addMetaTag()
            // supplies it, and the source-contract checker verifies that call.
            "@html-eslint/require-meta-viewport": "off",
            // The authenticated RPC form has no public social-preview page.
            "@html-eslint/require-open-graph-protocol": "off",
        },
    },
    {
        files: [
            "assets/collection-photos/photo-manifest.json",
            "assets/plants/photo-manifest.json",
        ],
        name: "Gardening: ordered photo evidence manifests",
        // Generators group identity, provenance and license fields in a stable
        // human-readable schema. Preserve that order and the archive hashes.
        rules: { "json/sort-keys": "off" },
    },
    {
        files: ["**/AGENTS*.md"],
        name: "Gardening: instruction filename convention",
        // Match the standalone Remark ignore scope for non-prose instructions;
        // Markdown syntax rules continue checking these files.
        rules: { "remark/remark": "off" },
    },
    {
        files: ["package.json"],
        name: "Gardening: private static-site manifest",
        // The manifest installs development tools; it exposes no Node entry point or consumer peers.
        rules: {
            // The source-location adapter is intentionally tied to these exact
            // private parser implementations and refuses unverified upgrades.
            "node-dependencies/absolute-version": [
                "error",
                {
                    dependencies: "never",
                    devDependencies: "never",
                    overridePackages: {
                        "@html-eslint/parser": "always",
                        "es-html-parser": "always",
                    },
                },
            ],
            "package-json/require-contributors": "off",
            "package-json/require-dependencies": "off",
            "package-json/require-main": "off",
            "package-json/require-peerDependencies": "off",
            "package-json/require-peerDependenciesMeta": "off",
        },
    },
    {
        files: ["test/**/*.test.mjs"],
        name: "Gardening: typed JavaScript Vitest contracts",
        rules: {
            // JSDoc/inferred implementations are checked by tsc. JavaScript
            // cannot spell TypeScript accessibility modifiers or vi.fn<T>().
            "@typescript-eslint/explicit-member-accessibility": "off",
            "vitest/require-mock-type-parameters": "off",
            "vitest/valid-expect": ["error", { maxArgs: 2 }],
        },
    },
    {
        files: ["test/google-sheets/**/*.test.mjs"],
        name: "Gardening: native Apps Script date and cell fixtures",
        rules: {
            "sonarjs/no-floating-point-equality": "off",
            // Date instances and exact stored numeric values are part of the
            // Google Sheets contract, including invalid-date regression cases.
            "unicorn/prefer-temporal": "off",
        },
    },
    {
        files: [
            "test/booklet-client.test.mjs",
            "test/google-sheets/logger-client.test.mjs",
            "test/google-sheets/plant-tracker.test.mjs",
        ],
        name: "Gardening: state transition regression assertions",
        // Repeating an assertion after an intervening action verifies retries,
        // print restoration and persistence. This rule does not track actions.
        rules: { "test-signal/no-duplicate-assertions": "off" },
    },
    {
        files: ["test/google-sheets/logger-client.test.mjs"],
        name: "Gardening: browser fixture cleanup",
        // AfterEach restores mocked timers and closes each disposable document.
        rules: { "vitest/no-hooks": "off" },
    },
    {
        files: [
            "scripts/check-google-sheets-logger.mjs",
            "scripts/check-plant-booklet.mjs",
            "scripts/google-sheets/workbook-audit.mjs",
            "test/booklet-client.test.mjs",
            "test/google-sheets/*.test.mjs",
        ],
        name: "Gardening: trusted offline script harnesses",
        // These compile/evaluate checked-in scripts and literal fault fixtures.
        // VM is a runtime emulator here, never a sandbox for external content.
        rules: { "sdl/no-node-vm-run-in-context": "off" },
    },
    {
        files: [
            "scripts/check-google-sheets-logger.mjs",
            "scripts/check-plant-booklet.mjs",
        ],
        name: "Gardening: source-contract patterns",
        // Interpolated patterns contain fixed attribute names or escaped,
        // validated icon/plant IDs, not arbitrary user-authored expressions.
        rules: { "security/detect-non-literal-regexp": "off" },
    },
    {
        files: ["test/booklet-client.test.mjs"],
        name: "Gardening: isolated booklet DOM fixture",
        rules: {
            // RequestAnimationFrame receives a timestamp, not a Node error.
            "n/no-callback-literal": "off",
            // This test seeds Happy DOM with an owned inline HTML fixture.
            "sdl/no-inner-html": "off",
            "unicorn/no-unsafe-dom-html": "off",
        },
    },
    {
        files: ["test/google-sheets/logger-client.test.mjs"],
        name: "Gardening: isolated Apps Script HTML fixture",
        // Load the checked-in self-contained client in a disposable test window.
        rules: {
            "no-unsanitized/method": "off",
            "sdl/no-document-write": "off",
        },
    },
    {
        files: [
            "eslint.config.mjs",
            "playwright.config.ts",
            "test/e2e/serve-pages.ts",
        ],
        name: "Gardening: local browser test server",
        rules: {
            "sdl/no-insecure-url": [
                "error",
                { exceptions: [/^http:\/\/127\.0\.0\.1:4173$/v.source] },
            ],
            "unicorn/prefer-https": [
                "error",
                { ignore: ["http://127.0.0.1:4173"] },
            ],
        },
    },

    {
        files: ["docs/**/*.js"],
        name: "Gardening: browser document lifetimes",
        rules: {
            "import-x/extensions": [
                "error",
                "ignorePackages",
                { js: "always" },
            ],
            "import-x/no-nodejs-modules": "error",
            "listeners/no-inline-function-event-listener": "off",
            // These scripts initialize one document. Navigation discards its listeners;
            // removing them on pagehide would break restoration from the browser back cache.
            "listeners/no-missing-remove-event-listener": "off",
            "math/prefer-math-sum-precise": "off",
            // Node's API availability table cannot classify browser globals.
            "n/no-unsupported-features/node-builtins": "off",
            // Browser clients retain ES2024 compatibility; Node build tools can use newer APIs.
            "unicorn/prefer-error-is-error": "off",
            "unicorn/prefer-temporal": "off",
        },
    },

    {
        files: ["docs/plant-booklet/booklet.js"],
        languageOptions: { sourceType: "script" },
        name: "Gardening: classic browser entry points",
        // The HTML and VM-based checks load these as classic scripts.
        rules: { "import-x/unambiguous": "off" },
    },

    {
        files: [
            "scripts/*.mjs",
            "scripts/google-sheets/workbook-audit.mjs",
            "test/e2e/serve-pages.ts",
        ],
        name: "Gardening: artifact builders and local preview server",
        // Local tools intentionally read repository paths and explicit CLI input.
        // Generated writes stay below their resolved output roots; the HTTP
        // server validates its decoded path before reading a file.
        rules: { "security/detect-non-literal-fs-filename": "off" },
    },
    {
        files: ["scripts/*.mjs"],
        name: "Gardening: command-line build reports",
        rules: {
            // The required Node 26.7 runtime has no Math.sumPrecise implementation.
            "math/prefer-math-sum-precise": "off",
            "no-console": [
                "error",
                {
                    allow: [
                        "log",
                        "info",
                        "warn",
                        "error",
                    ],
                },
            ],
        },
    },
];

export default config;
