import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

// Apps Script is the source of truth; Node consumers read its actual constant
// without adding an import or generated file to the deployed logger.
async function readLoggerVersion() {
    const sourceUrl = new URL(
        "google-sheets/plant-tracker.gs",
        import.meta.url
    );
    const source = await readFile(sourceUrl, "utf8");
    const context = vm.createContext({});
    vm.runInContext(source, context, { filename: fileURLToPath(sourceUrl) });
    const version = /** @type {unknown} */ (
        vm.runInContext("GARDEN_LOGGER.version", context)
    );

    if (
        typeof version !== "string" ||
        !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/v.test(version)
    )
        throw new TypeError(
            "GARDEN_LOGGER.version must use major.minor.patch."
        );

    return version;
}

export const LOGGER_VERSION = await readLoggerVersion();
