import * as path from "node:path";
import ts from "typescript";

/** @import {Diagnostic} from "typescript" */

/**
 * Check exact .gs contents as classic JavaScript without writing build
 * artifacts. TypeScript's public config extension hook discovers .gs files; the
 * compiler host mirrors their names to .js because createProgram requires JS/TS
 * extensions.
 *
 * @param {string} configPath - Apps Script tsconfig, resolved from the current
 *   directory.
 *
 * @returns {{
 *     diagnostics: Diagnostic[];
 *     formattedDiagnostics: string;
 *     inputFiles: string[];
 *     program: import("typescript").Program;
 * }}
 */
export function checkAppsScriptTypes(configPath) {
    const configFileName = path.resolve(configPath);
    /** @type {Diagnostic[]} */
    const configErrors = [];
    const parsed = ts.getParsedCommandLineOfConfigFile(
        configFileName,
        undefined,
        {
            ...ts.sys,
            onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
                configErrors.push(diagnostic);
            },
        },
        undefined,
        undefined,
        [
            {
                extension: ".gs",
                isMixedContent: false,
                scriptKind: ts.ScriptKind.JS,
            },
        ]
    );
    if (parsed === undefined) {
        throw new Error(formatDiagnostics(configErrors));
    }
    const inputFiles = parsed.fileNames.filter((file) => file.endsWith(".gs"));
    if (inputFiles.length === 0) {
        throw new Error(`No .gs inputs found in '${configFileName}'.`);
    }
    /** @type {Map<string, string>} */
    const originals = new Map(
        inputFiles.map((file) => [canonicalPath(`${file}.js`), file])
    );

    /**
     * @param {Diagnostic} diagnostic
     *
     * @returns {Diagnostic}
     */
    function originalDiagnostic(diagnostic) {
        const original =
            diagnostic.file === undefined
                ? undefined
                : originals.get(canonicalPath(diagnostic.file.fileName));
        return {
            ...diagnostic,
            ...(original !== undefined &&
                diagnostic.file !== undefined && {
                    file: { ...diagnostic.file, fileName: original },
                }),
            ...(diagnostic.relatedInformation !== undefined && {
                relatedInformation: diagnostic.relatedInformation.map(
                    (related) => originalDiagnostic(related)
                ),
            }),
        };
    }

    /** @type {Diagnostic[]} */
    const diagnostics = [...configErrors, ...parsed.errors];
    const host = ts.createCompilerHost(parsed.options);
    const readFile = host.readFile.bind(host);
    const fileExists = host.fileExists.bind(host);
    const getSourceFile = host.getSourceFile.bind(host);
    host.readFile = (fileName) =>
        readFile(originals.get(canonicalPath(fileName)) ?? fileName);
    host.fileExists = (fileName) =>
        fileExists(originals.get(canonicalPath(fileName)) ?? fileName);
    host.getSourceFile = (
        fileName,
        languageVersion,
        onError,
        shouldCreateNewSourceFile
    ) => {
        const original = originals.get(canonicalPath(fileName));
        if (original === undefined) {
            return getSourceFile(
                fileName,
                languageVersion,
                onError,
                shouldCreateNewSourceFile
            );
        }
        const source = readFile(original);
        return source === undefined
            ? undefined
            : ts.createSourceFile(
                  fileName,
                  source,
                  languageVersion,
                  true,
                  ts.ScriptKind.JS
              );
    };
    const program = ts.createProgram({
        host,
        options: parsed.options,
        rootNames: parsed.fileNames.map((file) =>
            file.endsWith(".gs") ? `${file}.js` : file
        ),
    });
    diagnostics.push(
        ...ts
            .getPreEmitDiagnostics(program)
            .map((diagnostic) => originalDiagnostic(diagnostic))
    );
    return {
        diagnostics,
        formattedDiagnostics: formatDiagnostics(diagnostics),
        inputFiles,
        program,
    };
}

/** @param {string} fileName @returns {string} */
function canonicalPath(fileName) {
    const absolute = path.resolve(fileName).replaceAll("\\", "/");
    return ts.sys.useCaseSensitiveFileNames ? absolute : absolute.toLowerCase();
}

/** @param {Diagnostic[]} diagnostics @returns {string} */
function formatDiagnostics(diagnostics) {
    return ts.formatDiagnostics(diagnostics, {
        getCanonicalFileName: canonicalPath,
        getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
        getNewLine: () => "\n",
    });
}

if (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === import.meta.filename
) {
    try {
        const result = checkAppsScriptTypes(
            process.argv[2] ?? "tsconfig.apps-script.json"
        );
        if (result.diagnostics.length > 0) {
            console.error(result.formattedDiagnostics);
            process.exitCode = 1;
        } else {
            console.log(
                `Apps Script typecheck passed (${result.inputFiles.length} .gs files).`
            );
        }
    } catch (error) {
        console.error(String(error));
        process.exitCode = 1;
    }
}
