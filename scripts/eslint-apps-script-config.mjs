import { createHash } from "node:crypto";
import * as path from "node:path";
import ts from "typescript";

import { checkAppsScriptTypes } from "./check-apps-script-types.mjs";

/**
 * Resolve declaration references in the same program as the actual .gs source.
 * The getter defers compilation until ESLint selects the declaration override.
 *
 * @param {unknown} upstreamParser
 * @param {string} [configPath]
 *
 * @returns {import("eslint").Linter.Config}
 */
export function createAppsScriptDeclarationConfig(
    upstreamParser,
    configPath = path.resolve(
        import.meta.dirname,
        "../tsconfig.apps-script.json"
    )
) {
    if (!isTypeScriptParser(upstreamParser)) {
        throw new Error("The shared TypeScript ESLint parser is unavailable.");
    }
    /** @type {import("eslint").Linter.LanguageOptions | undefined} */
    let languageOptions;
    return {
        files: ["types/apps-script*.d.ts"],
        get languageOptions() {
            if (languageOptions === undefined) {
                const { program } = checkAppsScriptTypes(configPath);
                const source = program.getSourceFile(
                    program.getRootFileNames()[0] ?? ""
                );
                if (source === undefined) {
                    throw new Error(
                        "The Apps Script program has no root source file."
                    );
                }
                const symbols = program
                    .getTypeChecker()
                    .getSymbolsInScope(source, ts.SymbolFlags.All);
                // ESLint's cache cannot serialize a Program in parserOptions.
                // Supply it at parse time, and invalidate cached declarations
                // whenever compiler options or any program source changes.
                const fingerprint = createHash("sha256")
                    .update(ts.version)
                    .update(JSON.stringify(program.getCompilerOptions()));
                for (const file of program.getSourceFiles()) {
                    fingerprint.update(file.fileName).update(file.text);
                }
                languageOptions = {
                    // Sonar S3827 examines ESLint's lexical `through` references.
                    // Supply only names actually declared in this compiler scope.
                    globals: Object.fromEntries(
                        symbols.map((symbol) => [symbol.name, "readonly"])
                    ),
                    parser: {
                        meta: {
                            name: "gardening-apps-script-declarations",
                            version: `${upstreamParser.meta?.version ?? "unknown"}-${fingerprint.digest("hex")}`,
                        },
                        /**
                         * @param {string} code @param
                         *   {import("eslint").Linter.ParserOptions} options
                         */
                        parseForESLint: (code, options) =>
                            upstreamParser.parseForESLint(code, {
                                ...options,
                                programs: [program],
                                project: false,
                                projectService: false,
                            }),
                    },
                    parserOptions: {
                        project: false,
                        projectService: false,
                    },
                };
            }
            return languageOptions;
        },
        name: "Gardening: Apps Script ambient declaration program",
    };
}

/**
 * @param {unknown} value
 *
 * @returns {value is Extract<import("eslint").Linter.Parser, {parseForESLint: unknown}>}
 */
function isTypeScriptParser(value) {
    return (
        typeof value === "object" &&
        value !== null &&
        "parseForESLint" in value &&
        typeof value.parseForESLint === "function" &&
        "meta" in value &&
        typeof value.meta === "object" &&
        value.meta !== null &&
        "name" in value.meta &&
        value.meta.name === "typescript-eslint/parser"
    );
}

// Apps Script executes classic scripts in its own V8 environment. These are
// standard service globals from @types/google-apps-script 2.0.13, not Node or DOM
// globals. Sheets v4 is enabled in scripts/google-sheets/appsscript.json; other
// advanced services require deliberate additions when enabled.
/** @type {import("eslint").Linter.Config} */
const appsScriptConfig = {
    files: ["scripts/google-sheets/*.gs"],
    languageOptions: {
        ecmaVersion: 2023,
        globals: {
            Browser: "readonly",
            CacheService: "readonly",
            CalendarApp: "readonly",
            CardService: "readonly",
            Charts: "readonly",
            ConferenceDataService: "readonly",
            console: "readonly",
            ContactsApp: "readonly",
            ContentService: "readonly",
            DataStudioApp: "readonly",
            DocumentApp: "readonly",
            DriveApp: "readonly",
            FormApp: "readonly",
            GmailApp: "readonly",
            GroupsApp: "readonly",
            HtmlService: "readonly",
            Jdbc: "readonly",
            LanguageApp: "readonly",
            LinearOptimizationService: "readonly",
            LockService: "readonly",
            Logger: "readonly",
            MailApp: "readonly",
            Maps: "readonly",
            MimeType: "readonly",
            PropertiesService: "readonly",
            ScriptApp: "readonly",
            Session: "readonly",
            Sheets: "readonly",
            SitesApp: "readonly",
            SlidesApp: "readonly",
            SpreadsheetApp: "readonly",
            UrlFetchApp: "readonly",
            Utilities: "readonly",
            XmlService: "readonly",
        },
        sourceType: "script",
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    name: "Gardening: Apps Script correctness and service globals",
    // ESLint 10 recommended built-in correctness rules, spelled out so this
    // private repo does not import a transitive @eslint/js dependency. Additional
    // runtime-neutral checks follow; TypeScript owns service and domain typing.
    rules: {
        "array-callback-return": "error",
        "constructor-super": "error",
        eqeqeq: ["error", "always"],
        "for-direction": "error",
        "getter-return": "error",
        "no-async-promise-executor": "error",
        "no-case-declarations": "error",
        "no-class-assign": "error",
        "no-compare-neg-zero": "error",
        "no-cond-assign": "error",
        "no-const-assign": "error",
        "no-constant-binary-expression": "error",
        "no-constant-condition": "error",
        "no-control-regex": "error",
        "no-debugger": "error",
        "no-delete-var": "error",
        "no-dupe-args": "error",
        "no-dupe-class-members": "error",
        "no-dupe-else-if": "error",
        "no-dupe-keys": "error",
        "no-duplicate-case": "error",
        "no-empty": "error",
        "no-empty-character-class": "error",
        "no-empty-pattern": "error",
        "no-empty-static-block": "error",
        "no-eval": "error",
        "no-ex-assign": "error",
        "no-extend-native": "error",
        "no-extra-boolean-cast": "error",
        "no-fallthrough": "error",
        "no-func-assign": "error",
        "no-global-assign": "error",
        "no-implied-eval": "error",
        "no-import-assign": "error",
        "no-invalid-regexp": "error",
        "no-irregular-whitespace": "error",
        "no-loss-of-precision": "error",
        "no-misleading-character-class": "error",
        "no-new-native-nonconstructor": "error",
        "no-new-wrappers": "error",
        "no-nonoctal-decimal-escape": "error",
        "no-obj-calls": "error",
        "no-octal": "error",
        "no-param-reassign": "error",
        "no-prototype-builtins": "error",
        "no-redeclare": "error",
        "no-regex-spaces": "error",
        "no-return-assign": "error",
        "no-self-assign": "error",
        "no-self-compare": "error",
        "no-setter-return": "error",
        "no-shadow-restricted-names": "error",
        "no-sparse-arrays": "error",
        "no-this-before-super": "error",
        "no-throw-literal": "error",
        "no-unassigned-vars": "error",
        "no-undef": "error",
        "no-unexpected-multiline": "error",
        "no-unneeded-ternary": "error",
        "no-unreachable": "error",
        "no-unsafe-finally": "error",
        "no-unsafe-negation": "error",
        "no-unsafe-optional-chaining": "error",
        "no-unused-expressions": "error",
        "no-unused-labels": "error",
        "no-unused-private-class-members": "error",
        "no-unused-vars": "error",
        "no-useless-assignment": "error",
        "no-useless-backreference": "error",
        "no-useless-call": "error",
        "no-useless-catch": "error",
        "no-useless-escape": "error",
        "no-var": "error",
        "no-with": "error",
        "object-shorthand": "error",
        "prefer-const": "error",
        "preserve-caught-error": "error",
        radix: "error",
        "require-yield": "error",
        "use-isnan": "error",
        "valid-typeof": "error",
    },
};

export default appsScriptConfig;
