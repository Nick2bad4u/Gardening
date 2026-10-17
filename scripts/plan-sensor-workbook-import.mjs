import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { parseArgs } from "node:util";

import { aggregateSensorHours } from "./google-sheets/sensor-hourly.mjs";
import {
    parseAeroLabCsv,
    planSensorImport,
} from "./google-sheets/sensor-import.mjs";
import {
    planSensorWorkbookImport,
    reconcileSensorWorkbookImport,
} from "./google-sheets/sensor-workbook-import.mjs";
import { prepareSensorHistory } from "./prepare-sensor-history.mjs";

/**
 * Reconstruct both archives from verified bytes before producing native
 * requests.
 *
 * @param {{
 *     snapshotPath: string;
 *     recordedManifestPath: string;
 *     manifestPath: string;
 *     importedAt: string;
 * }} options
 */
export async function prepareSensorWorkbookImport(options) {
    const recorded = await prepareSensorHistory({
        manifestPath: options.recordedManifestPath,
    });
    const candidate = await prepareSensorHistory({
        manifestPath: options.manifestPath,
    });
    const snapshot =
        /** @type {import("../types/sensor-workbook-import.d.ts").SensorWorkbookSnapshot} */ (
            await readJson(options.snapshotPath)
        );
    const manifest =
        /** @type {import("../types/sensor-history.d.ts").SensorHistoryManifest} */ (
            await readJson(options.manifestPath)
        );
    const recordedKeys = new Set(
        recorded.sources.map((source) => `${source.sensorId}|${source.sha256}`)
    );
    const orderedSources = manifest.sources.toSorted(
        (left, right) =>
            Number(!recordedKeys.has(`${left.sensorId}|${left.sha256}`)) -
            Number(!recordedKeys.has(`${right.sensorId}|${right.sha256}`))
    );
    /** @type {import("../types/sensor-import.d.ts").SensorReading[]} */
    const accumulated = [];
    /** @type {import("../types/sensor-workbook-import.d.ts").SensorWorkbookSourceDetail[]} */
    const sourceDetails = [];
    const manifestDirectory = path.dirname(path.resolve(options.manifestPath));
    const parsedSources = await Promise.all(
        orderedSources.map(async (source) => {
            const bytes = await readFile(
                path.resolve(manifestDirectory, source.csvPath)
            );
            if (
                createHash("sha256").update(bytes).digest("hex") !==
                source.sha256
            )
                throw new Error(
                    "Archive changed while preparing the import plan."
                );
            return {
                parsed: parseAeroLabCsv(bytes.toString("utf8"), source),
                source,
            };
        })
    );
    for (const { parsed, source } of parsedSources) {
        const overlap = planSensorImport(parsed.readings, accumulated);
        if (parsed.issues.length > 0 || overlap.conflicts.length > 0)
            throw new Error(
                "Archive changed or conflicts during receipt preparation."
            );
        for (const reading of overlap.additions) accumulated.push(reading);
        const receipt = candidate.sources.find(
            (entry) =>
                entry.sensorId === source.sensorId &&
                entry.sha256 === source.sha256
        );
        if (receipt === undefined)
            throw new Error("Archive manifest changed during preparation.");
        const hours = aggregateSensorHours(parsed.readings);
        const first = hours.at(0);
        const last = hours.at(-1);
        const units = new Set(
            parsed.readings.flatMap((reading) => [
                reading.builtIn.temperatureUnit,
                reading.probe.temperatureUnit,
            ])
        );
        sourceDetails.push({
            duplicateRows: parsed.readings.length - overlap.additions.length,
            firstObservedAt: first?.firstObservedAt ?? null,
            hourlyRows: hours.length,
            lastObservedAt: last?.lastObservedAt ?? null,
            receipt,
            temperatureUnit: Array.from(units, (unit) => `°${unit}`).join(
                " / "
            ),
        });
    }
    return planSensorWorkbookImport({
        candidate,
        importedAt: options.importedAt,
        recorded,
        snapshot,
        sourceDetails,
    });
}

const usage = `Prepare a read-only, preconditioned native sensor workbook import.

node scripts/plan-sensor-workbook-import.mjs --snapshot <native-grid.json> --recorded-manifest <recorded.json> --manifest <complete-plus-new.json> --imported-at <UTC-ISO>
node scripts/plan-sensor-workbook-import.mjs --snapshot <fresh-native-grid.json> --reconcile <saved-plan.json>

Capture all four managed sheets with userEnteredValue, sheet/grid properties,
native tables and chart metadata using spreadsheets.get(includeGridData:true).
Before applying the requests in ONE batch, reconcile against a fresh read.
After an uncertain write, read again: ready permits retry; applied means no retry;
drift stops the operation. No command here writes files or calls Google APIs.
`;

/** @param {string[]} args */
async function executeCli(args) {
    const { values } = parseArgs({
        allowPositionals: false,
        args,
        options: {
            help: { type: "boolean" },
            "imported-at": { type: "string" },
            manifest: { type: "string" },
            reconcile: { type: "string" },
            "recorded-manifest": { type: "string" },
            snapshot: { type: "string" },
        },
        strict: true,
    });
    if (values.help === true) {
        process.stdout.write(usage);
        return;
    }
    const snapshotPath = required(values.snapshot, "--snapshot");
    if (values.reconcile !== undefined) {
        if (
            values.manifest !== undefined ||
            values["recorded-manifest"] !== undefined ||
            values["imported-at"] !== undefined
        )
            throw new Error(
                "Reconcile does not accept import preparation arguments."
            );
        const plan =
            /** @type {import("../types/sensor-workbook-import.d.ts").SensorWorkbookImportPlan} */ (
                await readJson(values.reconcile)
            );
        const snapshot =
            /** @type {import("../types/sensor-workbook-import.d.ts").SensorWorkbookSnapshot} */ (
                await readJson(snapshotPath)
            );
        process.stdout.write(
            `${JSON.stringify({ outcome: reconcileSensorWorkbookImport(plan, snapshot) })}\n`
        );
        return;
    }
    const result = await prepareSensorWorkbookImport({
        importedAt: required(values["imported-at"], "--imported-at"),
        manifestPath: required(values.manifest, "--manifest"),
        recordedManifestPath: required(
            values["recorded-manifest"],
            "--recorded-manifest"
        ),
        snapshotPath,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

/** @param {string} file @returns {Promise<unknown>} */
async function readJson(file) {
    /** @type {unknown} */
    const result = JSON.parse(await readFile(file, "utf8"));
    if (typeof result !== "object" || result === null || Array.isArray(result))
        throw new Error("Expected a JSON object document.");
    return result;
}

/** @param {unknown} value @param {string} label */
function required(value, label) {
    if (typeof value !== "string" || value.trim() === "")
        throw new Error(`${label} is required.`);
    return value;
}

/** @param {string[]} args */
async function runCli(args) {
    try {
        await executeCli(args);
    } catch (error) {
        const message =
            typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof error.message === "string"
                ? error.message
                : "Sensor workbook planning failed.";
        process.stderr.write(
            `Sensor workbook: ${message.replaceAll(/\s+/gv, " ").slice(0, 400)}\n`
        );
        process.exitCode = 1;
    }
}

if (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === import.meta.filename
)
    await runCli(process.argv.slice(2));
