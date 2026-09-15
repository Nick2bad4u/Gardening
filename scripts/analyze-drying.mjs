import { readFile } from "node:fs/promises";
import * as path from "node:path";
import vm from "node:vm";

import { isRecord, parseJson } from "./build-data.mjs";

const columns = [
    "Date",
    "Plant ID",
    "Event",
    "Weight state",
    "Weight (g)",
    "Pot setup",
    "Request ID",
    "Save group / batch ID",
    "Record status",
    "Watering application",
    "Observation quality",
    "Measurement method",
    "Observation ID",
    "Corrects observation ID",
];

/**
 * Analyze a fresh, unformatted History export with the actual workbook
 * detector. Returns evidence, not an automatic watering or nutrient decision.
 * Numeric dates remain Sheets serials in the workbook timezone; no UTC
 * reinterpretation.
 *
 * @param {unknown} input
 */
export async function analyzeDrying(input) {
    if (
        !isRecord(input) ||
        !Array.isArray(input["history"]) ||
        !Array.isArray(input["plantIds"])
    )
        throw new TypeError(
            "Expected history (including headers) and plantIds arrays."
        );
    const readAt = input["readAt"];
    if (typeof readAt !== "string")
        throw new TypeError(
            "readAt must identify when the live source was read, with a timezone."
        );
    try {
        Temporal.Instant.from(readAt);
    } catch (error) {
        throw new TypeError("readAt needs a valid instant with a timezone.", {
            cause: error,
        });
    }
    const [rawHeader, ...rawRows] = dataList(input["history"]);
    const header = dataList(rawHeader);
    if (!Array.isArray(header)) throw new TypeError("Missing History headers.");
    const indexes = columns.map((name) => {
        const index = header.indexOf(name);
        if (index === -1 || header.lastIndexOf(name) !== index)
            throw new TypeError(`Missing or duplicate History column: ${name}`);
        return index;
    });
    const ids = dataList(input["plantIds"]).map((id) => {
        if (typeof id !== "string" || !/^P\d{2,3}$/v.test(id))
            throw new TypeError("Invalid plant ID.");
        return id;
    });
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length || ids.length === 0)
        throw new TypeError("Plant IDs must be nonempty and unique.");
    const rows = rawRows.map((rawRow) => {
        const row = dataList(rawRow);
        return indexes.map((index) => {
            const cell = row[index] ?? "";
            if (
                typeof cell !== "string" &&
                typeof cell !== "boolean" &&
                typeof cell !== "number"
            )
                throw new TypeError("Invalid History cell.");
            return cell;
        });
    });
    if (rows.some((row) => row[0] !== "" && typeof row[0] !== "number"))
        throw new TypeError(
            "Read History with UNFORMATTED_VALUE so dates remain numeric Sheets serials."
        );
    const source = await readFile(
        new URL("google-sheets/plant-tracker.gs", import.meta.url),
        "utf8"
    );
    /** @type {Record<string, unknown>} */
    const context = vm.createContext({ Date, Map, Set });
    vm.runInContext(source, context, { filename: "plant-tracker.gs" });
    for (const name of [
        "GARDEN_DRY_DOWN",
        "dryDownRecordsByPlant_",
        "dryDownCycles_",
        "cycleInspectionEvidence_",
    ])
        if (typeof context[name] !== "function")
            throw new TypeError(`Missing detector function: ${name}`);
    const api =
        /**
         * @type {{
         *     GARDEN_DRY_DOWN: (
         *         rows: GardenHistoryRow[],
         *         ids: string[][]
         *     ) => GardenDryDownRow[];
         *     dryDownRecordsByPlant_: (
         *         rows: GardenHistoryRow[]
         *     ) => Map<string, DryDownRecord[]>;
         *     dryDownCycles_: (
         *         records: DryDownRecord[]
         *     ) => GardenDryDownCycle[];
         *     cycleInspectionEvidence_: (
         *         points: DryDownRecord[],
         *         dry: GardenOptionalNumber,
         *         date: number
         *     ) => GardenInspectionEvidence;
         * }}
         */ (/** @type {unknown} */ (context));
    const {
        cycleInspectionEvidence_: inspectCycle,
        dryDownCycles_: buildCycles,
        dryDownRecordsByPlant_: groupRecords,
        GARDEN_DRY_DOWN: runModel,
    } = api;
    const grouped = groupRecords(rows);
    const models = runModel(
        rows,
        ids.map((id) => [id])
    );
    return {
        detectorVersion: String(
            vm.runInContext("GARDEN_LOGGER.version", context)
        ),
        pots: models.map((model) => {
            const records = (grouped.get(model[0]) ?? []).filter(
                (record) => record.setup === model[1]
            );
            const cycle = buildCycles(records).at(-1);
            const distinctPoints = new Map(
                (cycle?.points ?? []).map((point) => [point.date, point])
            );
            const points = distinctPoints.values().toArray();
            const evidence = cycle
                ? inspectCycle(
                      points,
                      cycle.wet ? model[2] : "",
                      cycle.water.date
                  )
                : null;
            return {
                evidence:
                    evidence === null
                        ? null
                        : {
                              ...evidence,
                              tail: evidence.tail.map(({ date, weight }) => ({
                                  date,
                                  weight,
                              })),
                          },
                id: model[0],
                inspectionSupported:
                    model[7] !== "" && model[10].includes("inspect moisture"),
                model,
                points: points.map(({ date, weight }) => ({ date, weight })),
                waterDate: cycle?.water.date ?? null,
            };
        }),
        readAt,
    };
}

/** @param {unknown} value @returns {unknown[]} */
function dataList(value) {
    if (!Array.isArray(value)) throw new TypeError("Expected an array.");
    return /** @type {unknown[]} */ (value);
}

if (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === import.meta.filename
) {
    const inputPath = process.argv[2];
    if (inputPath === undefined || inputPath === "")
        throw new TypeError(
            "Usage: node scripts/analyze-drying.mjs <fresh-history-snapshot.json>"
        );
    const result = await analyzeDrying(
        parseJson(await readFile(inputPath, "utf8"), isRecord, inputPath)
    );
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
