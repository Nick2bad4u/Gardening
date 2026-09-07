import { ESLint, Linter } from "eslint";
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

import config from "../eslint.config.mjs";
import { checkAppsScriptTypes } from "../scripts/check-apps-script-types.mjs";
import appsScriptConfig, {
    createAppsScriptDeclarationConfig,
} from "../scripts/eslint-apps-script-config.mjs";

const root = path.resolve(import.meta.dirname, "..");
const fixtureRoot = path.join(root, "test/fixtures/apps-script-checker");
const checkerPath = path.join(root, "scripts/check-apps-script-types.mjs");

describe("apps script type checker", () => {
    it("checks Google services, domain declarations, ES2023 APIs and shared script globals", () => {
        expect.hasAssertions();

        const result = checkAppsScriptTypes(
            path.join(fixtureRoot, "tsconfig.valid.json")
        );

        expect(result.formattedDiagnostics).toBe("");
        expect(
            result.inputFiles
                .map((file) => path.basename(file))
                .toSorted((left, right) => left.localeCompare(right))
        ).toStrictEqual(["entry.gs", "shared.gs"]);
    });

    it("reports real service, argument, domain, implicit-any and unavailable-global errors at original locations", () => {
        expect.hasAssertions();

        const result = checkAppsScriptTypes(
            path.join(fixtureRoot, "tsconfig.invalid.json")
        );

        expect(result.diagnostics.map(({ code }) => code)).toStrictEqual([
            2339,
            2345,
            2322,
            7006,
            2584,
            2591,
        ]);
        expect(result.formattedDiagnostics).toContain(
            "entry.gs(2,16): error TS2339"
        );
        expect(result.formattedDiagnostics).toContain(
            "entry.gs(3,25): error TS2345"
        );
        expect(result.formattedDiagnostics).not.toContain(".gs.js");
        expect(
            result.diagnostics.every(
                (diagnostic) =>
                    diagnostic.file?.fileName.endsWith("entry.gs") === true
            )
        ).toBe(true);
    });

    it.each([
        {
            config: "tsconfig.invalid.json",
            message: "entry.gs(2,16): error TS2339",
        },
        { config: "tsconfig.empty.json", message: "No .gs inputs found" },
        { config: "does-not-exist.json", message: "error TS5083" },
    ])(
        "fails the command for $config",
        ({ config: fixtureConfig, message }) => {
            expect.hasAssertions();

            const result = spawnSync(
                process.execPath,
                [checkerPath, path.join(fixtureRoot, fixtureConfig)],
                { cwd: root, encoding: "utf8" }
            );

            expect(result.status).toBe(1);
            expect(result.stderr).toContain(message);
            expect(result.stdout).toBe("");
        }
    );
});

describe("apps script ESLint environment", () => {
    it("resolves cross-file and source-derived ambient types while still flagging an undeclared name", async () => {
        expect.hasAssertions();

        const upstream = config.find(
            (entry) => entry.name === "🗄️ Type Declarations: TypeScript Parser"
        )?.languageOptions?.["parser"];
        const declarationConfig = createAppsScriptDeclarationConfig(
            upstream,
            path.join(fixtureRoot, "tsconfig.ambient.json")
        );
        const eslint = new ESLint({
            cwd: root,
            overrideConfig: [
                ...config
                    .filter((entry) => entry.plugins !== undefined)
                    .map((entry) => ({ plugins: entry.plugins ?? {} })),
                {
                    ...declarationConfig,
                    files: ["test/fixtures/apps-script-checker/*.d.ts"],
                    rules: {
                        "@typescript-eslint/no-redundant-type-constituents":
                            "error",
                        "sonarjs/no-reference-error": "error",
                    },
                },
            ],
            overrideConfigFile: true,
        });
        const result = await eslint.lintFiles([
            path.join(fixtureRoot, "ambient.d.ts"),
        ]);

        expect(
            result.flatMap(({ messages }) =>
                messages.map(({ line, ruleId }) => ({ line, ruleId }))
            )
        ).toStrictEqual([{ line: 4, ruleId: "sonarjs/no-reference-error" }]);

        const checked = checkAppsScriptTypes(
            path.join(fixtureRoot, "tsconfig.ambient.json")
        );

        expect(checked.diagnostics.map(({ code }) => code)).toStrictEqual([
            2304,
        ]);
    }, 20_000);

    it("routes .gs through the repository config with service globals and no Node globals", async () => {
        expect.hasAssertions();

        const eslint = new ESLint({ cwd: root });
        const result = await eslint.lintText(
            "/* exported onOpen */\nfunction onOpen() { Logger.log(SpreadsheetApp.getActive(), process.version); }",
            { filePath: "scripts/google-sheets/lint-fixture.gs" }
        );

        expect(
            result.map(({ messages }) => messages.map(({ ruleId }) => ruleId))
        ).toStrictEqual([["no-undef"]]);
    }, 20_000);

    it("recognizes exported callbacks while still reporting unused helpers", () => {
        expect.hasAssertions();

        const linter = new Linter();
        const result = linter.verify(
            "/* exported onOpen */\nfunction onOpen() { Logger.log(SpreadsheetApp.getActive(), Sheets.Spreadsheets); }\nfunction unusedHelper() { return 1; }",
            [appsScriptConfig],
            { filename: "scripts/google-sheets/lint-fixture.gs" }
        );

        expect(
            result.map(({ line, ruleId }) => ({ line, ruleId }))
        ).toStrictEqual([{ line: 3, ruleId: "no-unused-vars" }]);
    });

    it("rejects browser and Node globals, reassigned services and incorrect callback returns", () => {
        expect.hasAssertions();

        const linter = new Linter();
        const result = linter.verify(
            'document.title = "invalid";\nprocess.exitCode = 1;\nSpreadsheetApp = {};\n[1].map(() => {});',
            [appsScriptConfig],
            { filename: "scripts/google-sheets/lint-fixture.gs" }
        );

        expect(result.map(({ ruleId }) => ruleId)).toStrictEqual([
            "no-undef",
            "no-undef",
            "no-global-assign",
            "array-callback-return",
        ]);
    });
});
