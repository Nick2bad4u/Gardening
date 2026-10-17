import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { parseArgs } from "node:util";

import { sensorArchiveUrl } from "./google-sheets/sensor-archive-url.mjs";
import { aggregateSensorHours } from "./google-sheets/sensor-hourly.mjs";
import {
    parseAeroLabCsv,
    planSensorImport,
} from "./google-sheets/sensor-import.mjs";

/**
 * Rebuild hourly history from verified raw exports. Reads only local files;
 * conflicts or invalid records reject the entire preparation.
 *
 * @param {{ manifestPath: string }} options
 *
 * @returns {Promise<
 *     import("../types/sensor-history.d.ts").SensorHistoryPreparation
 * >}
 */
export async function prepareSensorHistory({ manifestPath }) {
    nonemptyString(manifestPath, "manifestPath");
    const manifestFile = path.resolve(manifestPath);
    const manifest = validateManifest(
        /** @type {unknown} */ (
            JSON.parse(await readFile(manifestFile, "utf8"))
        )
    );
    const parsedSources = await Promise.all(
        manifest.sources.map(async (source) => {
            const csvPath = path.resolve(
                path.dirname(manifestFile),
                source.csvPath
            );
            const bytes = await readFile(csvPath);
            const sha256 = createHash("sha256").update(bytes).digest("hex");
            if (sha256 !== source.sha256)
                throw new Error(
                    `SHA-256 mismatch for ${path.basename(csvPath)}.`
                );
            const parsed = parseAeroLabCsv(bytes.toString("utf8"), source);
            if (parsed.issues.length > 0)
                throw new Error(
                    `CSV issues in ${path.basename(csvPath)}: ${parsed.issues.length} invalid record(s); first at record ${parsed.issues[0]?.row ?? "unknown"}.`
                );
            return {
                readings: parsed.readings,
                receipt: {
                    fileName: path.basename(csvPath),
                    populatedRows: parsed.readings.length,
                    sensorId: source.sensorId,
                    sha256,
                    skippedEmptyRows: parsed.skippedEmptyRows,
                    sourceUrl: source.sourceUrl ?? null,
                    timeZone: source.timeZone,
                },
            };
        })
    );
    // Resolve equivalent Celsius/Fahrenheit evidence consistently before raw
    // deduplication; never merge already-averaged hourly summaries.
    const readings = parsedSources
        .flatMap((source) => source.readings)
        .toSorted(compareReadings);
    const plan = planSensorImport(readings);
    if (plan.conflicts.length > 0)
        throw new Error(
            `Cannot prepare sensor history: ${plan.conflicts.length} conflicting reading key(s).`
        );
    const hours = aggregateSensorHours(plan.additions);
    const sensorMap = new Map(
        manifest.sources.map(({ sensorId, timeZone }) => [
            sensorId,
            { sensorId, timeZone },
        ])
    );
    const sensors = Array.from(sensorMap.values(), (sensor) => sensor).toSorted(
        (a, b) => a.sensorId.localeCompare(b.sensorId, "en")
    );
    return {
        counts: {
            duplicateRows: readings.length - plan.additions.length,
            hourlyRows: hours.length,
            populatedRows: readings.length,
            sourceFiles: manifest.sources.length,
            uniqueReadings: plan.additions.length,
        },
        hours,
        schemaVersion: 1,
        sensors,
        sources: parsedSources.map(({ receipt }) => receipt),
    };
}

const usage = `Prepare read-only hourly sensor history from archived AeroLab CSV files.

node scripts/prepare-sensor-history.mjs --manifest <private-manifest.json>
node scripts/prepare-sensor-history.mjs --help

The manifest uses schemaVersion 1 and a nonempty sources array. Each source
requires csvPath, sensorId, timeZone and the original file's lowercase SHA-256;
sourceUrl is optional. Relative CSV paths resolve beside the manifest.
JSON is written to stdout. No files, spreadsheets or services are modified.
`;

/**
 * @param {import("../types/sensor-import.d.ts").SensorReading} left
 * @param {import("../types/sensor-import.d.ts").SensorReading} right
 */
function compareReadings(left, right) {
    return (
        left.sensorId.localeCompare(right.sensorId, "en") ||
        left.observedAt.localeCompare(right.observedAt, "en") ||
        left.builtIn.temperatureUnit.localeCompare(
            right.builtIn.temperatureUnit,
            "en"
        ) ||
        left.probe.temperatureUnit.localeCompare(
            right.probe.temperatureUnit,
            "en"
        )
    );
}

/**
 * @param {unknown} value
 * @param {string} label
 */
function nonemptyString(value, label) {
    if (typeof value !== "string" || value.trim() === "")
        throw new TypeError(`${label} must be a nonempty string.`);
    return value;
}

/** @param {string[]} args */
async function runCli(args) {
    try {
        const { values } = parseArgs({
            allowPositionals: false,
            args,
            options: {
                help: { type: "boolean" },
                manifest: { type: "string" },
            },
            strict: true,
        });
        if (values.help === true) {
            process.stdout.write(usage);
            return;
        }
        const manifestPath = nonemptyString(values.manifest, "--manifest");
        process.stdout.write(
            `${JSON.stringify(await prepareSensorHistory({ manifestPath }), null, 2)}\n`
        );
    } catch (error) {
        const message =
            typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof error.message === "string"
                ? error.message
                : "Sensor history preparation failed.";
        process.stderr.write(
            `Sensor history: ${message.replaceAll(/\s+/gv, " ").slice(0, 400)}\n`
        );
        process.exitCode = 1;
    }
}

/**
 * @param {unknown} value
 * @param {string[]} allowed
 * @param {string} label
 *
 * @returns {Record<string, unknown>}
 */
function strictObject(value, allowed, label) {
    if (typeof value !== "object" || value === null || Array.isArray(value))
        throw new TypeError(`${label} must be an object.`);
    const record = /** @type {Record<string, unknown>} */ (value);
    if (Object.keys(record).some((key) => !allowed.includes(key)))
        throw new TypeError(`${label} contains unknown fields.`);
    return record;
}

/**
 * @param {unknown} value
 *
 * @returns {import("../types/sensor-history.d.ts").SensorHistoryManifest}
 */
function validateManifest(value) {
    const manifest = strictObject(
        value,
        ["schemaVersion", "sources"],
        "Manifest"
    );
    if (
        manifest["schemaVersion"] !== 1 ||
        !Array.isArray(manifest["sources"]) ||
        manifest["sources"].length === 0
    )
        throw new TypeError(
            "Manifest requires schemaVersion 1 and a nonempty sources array."
        );
    const sources = manifest["sources"].map((source) => validateSource(source));
    /** @type {Map<string, string>} */
    const zones = new Map();
    for (const source of sources) {
        const previous = zones.get(source.sensorId);
        if (previous !== undefined && previous !== source.timeZone)
            throw new Error(
                `Inconsistent timeZone for sensor ${source.sensorId}.`
            );
        zones.set(source.sensorId, source.timeZone);
    }
    return { schemaVersion: 1, sources };
}

/**
 * @param {unknown} value
 *
 * @returns {import("../types/sensor-history.d.ts").SensorHistorySource}
 */
function validateSource(value) {
    const source = strictObject(
        value,
        [
            "csvPath",
            "sensorId",
            "timeZone",
            "sha256",
            "sourceUrl",
        ],
        "Source"
    );
    const csvPath = nonemptyString(source["csvPath"], "Source csvPath");
    const sensorId = nonemptyString(source["sensorId"], "Source sensorId");
    const timeZone = nonemptyString(source["timeZone"], "Source timeZone");
    const sha256 = nonemptyString(source["sha256"], "Source sha256");
    if (!/^[\da-f]{64}$/v.test(sha256))
        throw new TypeError(
            "Source sha256 must be 64 lowercase hexadecimal characters."
        );
    // Validate even an empty export's timezone before reading any source files.
    const formatter = new Intl.DateTimeFormat("en", { timeZone });
    formatter.resolvedOptions();
    const sourceUrl =
        source["sourceUrl"] === undefined
            ? undefined
            : sensorArchiveUrl(source["sourceUrl"]);
    return {
        csvPath,
        sensorId,
        sha256,
        ...(sourceUrl !== undefined && { sourceUrl }),
        timeZone,
    };
}

if (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === import.meta.filename
)
    await runCli(process.argv.slice(2));
