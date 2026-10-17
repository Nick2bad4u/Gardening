import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { parseArgs } from "node:util";

import {
    parseAeroLabCsv,
    planSensorImport,
} from "./google-sheets/sensor-import.mjs";

/**
 * Inspect an export and compare its readings with earlier exports from the same
 * physical sensor. This is read-only: it does not import into any ledger.
 *
 * @param {{
 *     csvPath: string;
 *     existingCsvPaths?: string[];
 *     sensorId: string;
 *     timeZone: string;
 * }} options
 */
export async function previewSensorImport(options) {
    const interpretation = {
        sensorId: options.sensorId,
        timeZone: options.timeZone,
    };
    const csv = await readFile(options.csvPath, "utf8");
    const incoming = parseAeroLabCsv(csv, interpretation);
    const previous = await Promise.all(
        (options.existingCsvPaths ?? []).map(async (csvPath) => ({
            name: path.basename(csvPath),
            parsed: parseAeroLabCsv(
                await readFile(csvPath, "utf8"),
                interpretation
            ),
        }))
    );
    const previousReadings = previous.flatMap(({ parsed }) => parsed.readings);
    const plan = planSensorImport(incoming.readings, previousReadings);
    const issues = [
        ...incoming.issues.map((issue) => ({
            ...issue,
            file: path.basename(options.csvPath),
        })),
        ...previous.flatMap(({ name, parsed }) =>
            parsed.issues.map((issue) => ({ ...issue, file: name }))
        ),
    ];
    const times = incoming.readings
        .map((reading) => reading.observedAt)
        .toSorted((first, second) => first.localeCompare(second));
    const existingKeys = new Set(
        previousReadings.map((reading) => reading.key)
    );
    return {
        canImport: issues.length === 0 && plan.conflicts.length === 0,
        conflictExamples: plan.conflicts.slice(0, 10).map((conflict) => ({
            existing: conflict.existing,
            incoming: conflict.incoming,
            key: conflict.key,
        })),
        counts: {
            conflictingKeys: plan.conflicts.length,
            duplicateRows: plan.duplicates.length,
            emptyRowsSkipped: incoming.skippedEmptyRows,
            existingUniqueReadings: existingKeys.size,
            invalidRows: issues.length,
            newReadings: plan.additions.length,
            populatedRows: incoming.readings.length,
        },
        issues,
        mode: "preview",
        range: {
            firstObservedAt: times[0] ?? null,
            lastObservedAt: times.at(-1) ?? null,
        },
        sensorId: options.sensorId,
        source: {
            file: path.basename(options.csvPath),
            format: incoming.format,
            headers: incoming.sourceHeaders,
            sha256: createHash("sha256").update(csv).digest("hex"),
        },
        timeZone: options.timeZone,
    };
}

const usage = `Read-only AeroLab sensor import preview.

node scripts/preview-sensor-import.mjs --csv <export.csv> \
  --sensor-id <permanent-sensor-id> --time-zone <IANA-timezone> \
  [--existing <earlier-export.csv>]...

Use a permanent ID for the physical sensor. Every --existing file must belong to
that same sensor and use the specified export timezone. No data is written.
`;

/** @param {string | undefined} value */
function requiredArgument(value) {
    if (value === undefined || value === "") throw new TypeError(usage);
    return value;
}

if (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === import.meta.filename
) {
    const { values } = parseArgs({
        options: {
            csv: { type: "string" },
            existing: { multiple: true, type: "string" },
            help: { short: "h", type: "boolean" },
            "sensor-id": { type: "string" },
            "time-zone": { type: "string" },
        },
        strict: true,
    });
    if (values.help === true) process.stdout.write(usage);
    else {
        const preview = await previewSensorImport({
            csvPath: requiredArgument(values.csv),
            existingCsvPaths: values.existing ?? [],
            sensorId: requiredArgument(values["sensor-id"]),
            timeZone: requiredArgument(values["time-zone"]),
        });
        process.stdout.write(`${JSON.stringify(preview, null, 2)}\n`);
        if (!preview.canImport) process.exitCode = 1;
    }
}
