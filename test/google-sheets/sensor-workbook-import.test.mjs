import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";

import { aggregateSensorHours } from "../../scripts/google-sheets/sensor-hourly.mjs";
import { parseAeroLabCsv } from "../../scripts/google-sheets/sensor-import.mjs";
import {
    planSensorWorkbookImport,
    reconcileSensorWorkbookImport,
    sensorHourlyHeaders,
    sensorHourRow,
    sensorReceiptHeaders,
    sensorWorkbookDigest,
} from "../../scripts/google-sheets/sensor-workbook-import.mjs";

const header =
    "Timestamp(1 min),Built-in Temperature(℃),Built-in Humidity(%),Built-in VPD(kPa),Probe Temperature(℃),Probe Humidity(%),Probe VPD(kPa)";
const first = "2026/10/16 12:10:00,10,20,1,30,40,2";
const second = "2026/10/16 12:20:00,20,40,3,50,60,4";
const third = "2026/10/16 13:10:00,30,60,5,70,80,6";
const sensorId = "sensor-01";
const timeZone = "America/New_York";

/**
 * @param {import("../../types/sensor-workbook-import.d.ts").SensorWorkbookSnapshot} snapshot
 * @param {string} title @param {number} row @param {number} column
 */
function cell(snapshot, title, row, column) {
    return snapshot.sheets.find((entry) => entry.properties.title === title)
        ?.data?.[0]?.rowData?.[row]?.values?.[column]?.userEnteredValue;
}
function fixture() {
    const oldSource = receipt("a", 1);
    const newSource = receipt("b", 3);
    const recorded = preparation([first], [oldSource]);
    const candidate = preparation(
        [
            first,
            second,
            third,
        ],
        [oldSource, newSource]
    );
    /** @type {import("../../types/sensor-workbook-import.d.ts").SensorWorkbookSnapshot} */
    const snapshot = {
        capturedRanges: [
            "Overview!A1:AE170",
            "'Hourly history'!A1:AE170",
            "'Sensors & imports'!A1:AE170",
            "'Chart data'!A1:AE170",
        ],
        sheets: [
            "Overview",
            "Hourly history",
            "Sensors & imports",
            "Chart data",
        ].map((title, sheetId) => ({
            data: [{ rowData: [] }],
            properties: {
                gridProperties: { columnCount: 31, rowCount: 170 },
                sheetId,
                title,
            },
            tables: [],
        })),
        spreadsheetId: "test-workbook",
    };
    const [
        ,
        history,
        sourceSheet,
    ] = snapshot.sheets;
    if (!history || !sourceSheet) throw new Error("Fixture missing sheets");
    history.tables = [
        {
            name: "HourlySensorHistory",
            range: {
                endColumnIndex: 31,
                endRowIndex: 2,
                sheetId: 1,
                startColumnIndex: 0,
                startRowIndex: 0,
            },
            tableId: "hours",
        },
    ];
    sourceSheet.tables = [
        {
            name: "SensorRegistry",
            range: {
                endColumnIndex: 6,
                endRowIndex: 6,
                sheetId: 2,
                startRowIndex: 4,
            },
            tableId: "registry",
        },
        {
            name: "SensorImportLog",
            range: {
                endColumnIndex: 14,
                endRowIndex: 12,
                sheetId: 2,
                startRowIndex: 10,
            },
            tableId: "imports",
        },
    ];
    put(snapshot, "Hourly history", 0, sensorHourlyHeaders);
    const hour = recorded.hours[0];
    if (!hour) throw new Error("Fixture hour missing");
    put(snapshot, "Hourly history", 1, sensorHourRow(hour));
    put(snapshot, "Sensors & imports", 4, [
        "Sensor ID",
        "Display name",
        "Owner model label",
        "Export timezone",
        "Built-in channel",
        "Probe channel",
    ]);
    put(snapshot, "Sensors & imports", 5, [
        sensorId,
        "Test sensor",
        "Owner model",
        timeZone,
        "Body",
        "Unassigned",
    ]);
    put(snapshot, "Sensors & imports", 10, sensorReceiptHeaders);
    put(snapshot, "Sensors & imports", 11, [
        46_000,
        "original-name.csv",
        sensorId,
        timeZone,
        1,
        0,
        0,
        1,
        oldSource.sha256,
        oldSource.sourceUrl,
        "°C",
        "2026-10-16 12:10 EDT",
        "2026-10-16 12:10 EDT",
        "Imported",
    ]);
    put(snapshot, "Sensors & imports", 12, [
        "Important instructions must survive expansion",
    ]);
    return {
        candidate,
        importedAt: "2026-10-17T00:00:00Z",
        recorded,
        snapshot,
        sourceDetails: [
            {
                duplicateRows: 1,
                firstObservedAt: "2026-10-16T16:10:00.000Z",
                hourlyRows: 2,
                lastObservedAt: "2026-10-16T17:10:00.000Z",
                receipt: newSource,
                temperatureUnit: "°C",
            },
        ],
    };
}
/**
 * @param {string[]} rows @param
 *   {import("../../types/sensor-history.d.ts").SensorHistoryReceipt[]} sources
 */
function preparation(rows, sources) {
    const readings = parseAeroLabCsv(`${header}\n${rows.join("\n")}\n`, {
        sensorId,
        timeZone,
    }).readings;
    const hours = aggregateSensorHours(readings);
    return {
        counts: {
            duplicateRows: 0,
            hourlyRows: hours.length,
            populatedRows: readings.length,
            sourceFiles: sources.length,
            uniqueReadings: readings.length,
        },
        hours,
        schemaVersion: /** @type {const} */ (1),
        sensors: [{ sensorId, timeZone }],
        sources,
    };
}
/**
 * @param {import("../../types/sensor-workbook-import.d.ts").SensorWorkbookSnapshot} snapshot
 * @param {string} title @param {number} row @param {(string | number | null)[]}
 *   values
 */
function put(snapshot, title, row, values) {
    const target = snapshot.sheets.find(
        (entry) => entry.properties.title === title
    );
    if (!target) throw new Error("Fixture sheet missing");
    target.data ??= [{ rowData: [] }];
    const [data] = target.data;
    if (!data) throw new Error("Fixture data missing");
    data.rowData ??= [];
    data.rowData[row] = {
        values: values.map((value) =>
            value === null
                ? {}
                : {
                      userEnteredValue:
                          typeof value === "number"
                              ? { numberValue: value }
                              : { stringValue: value },
                  }
        ),
    };
}
/**
 * @param {string} hash @param {number} count @returns
 *   {import("../../types/sensor-history.d.ts").SensorHistoryReceipt}
 */
function receipt(hash, count) {
    return {
        fileName: `${hash}.csv`,
        populatedRows: count,
        sensorId,
        sha256: hash.repeat(64),
        skippedEmptyRows: 0,
        sourceUrl: `https://drive.google.com/file/d/synthetic-only-${hash}/view`,
        timeZone,
    };
}

describe("sensor native workbook import planner", () => {
    it("rejects formulas and chart dependencies whose native insertion rebasing is unmodeled", () => {
        expect.hasAssertions();

        const formulaInput = fixture();
        const target = required(
            formulaInput.snapshot.sheets[2]?.data?.[0]?.rowData?.[12]
                ?.values?.[0]
        );
        target.userEnteredValue = { formulaValue: "=A13" };

        expect(() => planSensorWorkbookImport(formulaInput)).toThrow(
            "cannot rebase formulas"
        );

        const chartInput = fixture();
        required(chartInput.snapshot.sheets[2]).charts = [
            {
                position: {
                    overlayPosition: {
                        anchorCell: { rowIndex: 14, sheetId: 2 },
                    },
                },
            },
        ];

        expect(() => planSensorWorkbookImport(chartInput)).toThrow(
            "cannot rebase charts"
        );

        const external = fixture();
        required(external.snapshot.sheets[0]).data = [
            {
                rowData: [
                    {
                        values: [
                            {
                                userEnteredValue: {
                                    formulaValue: "='Sensors & imports'!A13",
                                },
                            },
                        ],
                    },
                ],
            },
        ];

        expect(() => planSensorWorkbookImport(external)).toThrow(
            "cross-sheet formula dependency"
        );
    });

    it("keeps latest-hour references chronological when an older missing hour is appended", () => {
        expect.hasAssertions();

        const input = fixture();
        input.candidate = preparation(
            [first.replace("12:10:00", "11:10:00"), first],
            input.candidate.sources
        );
        const plan = planSensorWorkbookImport(input);

        expect(plan).toMatchObject({ addedHours: 1, changedHours: 0 });
        expect(cell(plan.expectedSnapshot, "Overview", 8, 4)).toStrictEqual({
            formulaValue: "='Hourly history'!A2",
        });
        expect(cell(plan.expectedSnapshot, "Chart data", 168, 1)).toStrictEqual(
            { formulaValue: "='Hourly history'!D2" }
        );
        expect(cell(plan.expectedSnapshot, "Chart data", 167, 1)).toStrictEqual(
            { formulaValue: "='Hourly history'!D3" }
        );
    });

    it("requires complete native capture bounds before planning or retrying", () => {
        expect.hasAssertions();

        const input = fixture();
        const plan = planSensorWorkbookImport(input);
        input.snapshot.capturedRanges = ["Overview!A1:H24"];

        expect(() => planSensorWorkbookImport(input)).toThrow(
            "Incomplete captured range"
        );
        expect(() =>
            reconcileSensorWorkbookImport(plan, input.snapshot)
        ).toThrow("Incomplete captured range");
    });

    it.each(["Overview", "Chart data"])(
        "rejects a partial allocated grid on %s even when the managed formulas are covered",
        (title) => {
            expect.hasAssertions();

            const input = fixture();
            input.snapshot.capturedRanges = input.snapshot.capturedRanges.map(
                (range) =>
                    range.includes(title) ? `'${title}'!A1:H169` : range
            );

            expect(() => planSensorWorkbookImport(input)).toThrow(
                `Incomplete captured range for ${title}`
            );
        }
    );

    it("hashes metadata independently of JSON property ordering", () => {
        expect.hasAssertions();

        const input = fixture();
        const digest = sensorWorkbookDigest(input.snapshot);
        input.snapshot.sheets.reverse();
        for (const target of input.snapshot.sheets) {
            const { gridProperties, sheetId, title } = target.properties;
            target.properties = { gridProperties, sheetId, title };
        }

        expect(sensorWorkbookDigest(input.snapshot)).toBe(digest);
    });

    it("reconstructs archives through the CLI and reconciles a lost-success retry without applying again", async () => {
        expect.hasAssertions();

        const files = await cliFixture();
        const result = runCli(
            "--snapshot",
            files.snapshotPath,
            "--recorded-manifest",
            files.recordedManifestPath,
            "--manifest",
            files.manifestPath,
            "--imported-at",
            "2026-10-17T00:00:00Z"
        );

        expect(result.status, result.stderr).toBe(0);
        expect(JSON.parse(result.stdout)).toMatchObject({
            addedHours: 1,
            addedSources: 1,
            changedHours: 1,
        });

        const planPath = path.join(files.directory, "plan.json");
        const freshPath = path.join(files.directory, "fresh.json");
        await writeFile(planPath, result.stdout);
        /** @type {unknown} */
        const parsed = JSON.parse(result.stdout);
        const expected = expectedSnapshot(parsed);
        await writeFile(freshPath, JSON.stringify(expected));
        const recovered = runCli(
            "--snapshot",
            freshPath,
            "--reconcile",
            planPath
        );

        expect(recovered.status, recovered.stderr).toBe(0);
        expect(JSON.parse(recovered.stdout)).toStrictEqual({
            outcome: "applied",
        });

        const repeated = runCli(
            "--snapshot",
            freshPath,
            "--recorded-manifest",
            files.manifestPath,
            "--manifest",
            files.manifestPath,
            "--imported-at",
            "2026-10-17T00:00:00Z"
        );

        expect(repeated.status, repeated.stderr).toBe(0);
        expect(JSON.parse(repeated.stdout)).toMatchObject({
            addedSources: 0,
            requests: [],
        });

        await writeFile(files.incomingCsvPath, "changed bytes");
        const changed = runCli(
            "--snapshot",
            files.snapshotPath,
            "--recorded-manifest",
            files.recordedManifestPath,
            "--manifest",
            files.manifestPath,
            "--imported-at",
            "2026-10-17T00:00:00Z"
        );

        expect(changed.status).toBe(1);
        expect(changed.stdout).toBe("");
        expect(changed.stderr).toContain("SHA-256 mismatch");
    });

    it("returns no writes or duplicate receipt for an identical replay", () => {
        expect.hasAssertions();

        const input = fixture();
        const plan = planSensorWorkbookImport({
            ...input,
            candidate: input.recorded,
        });

        expect(plan.requests).toStrictEqual([]);
        expect(plan.addedSources).toBe(0);
        expect(plan.expectedDigest).toBe(plan.preconditionDigest);
    });

    it("recomputes a partial hour, appends only new keys, and keeps references and receipt bounds coherent", () => {
        expect.hasAssertions();

        const input = fixture();
        const original = structuredClone(input.snapshot);
        const plan = planSensorWorkbookImport(input);

        expect(input.snapshot).toStrictEqual(original);
        expect(plan).toMatchObject({
            addedHours: 1,
            addedSources: 1,
            changedHours: 1,
        });
        expect(
            cell(plan.expectedSnapshot, "Hourly history", 1, 2)
        ).toStrictEqual({ numberValue: 2 });
        expect(
            cell(plan.expectedSnapshot, "Hourly history", 1, 3)
        ).toStrictEqual({ numberValue: 15 });
        expect(
            cell(plan.expectedSnapshot, "Hourly history", 2, 30)
        ).toStrictEqual({ stringValue: "sensor-01|2026-10-16T17:00:00.000Z" });
        expect(cell(plan.expectedSnapshot, "Overview", 5, 1)).toStrictEqual({
            formulaValue: "=SUM('Hourly history'!C2:C3)",
        });
        expect(cell(plan.expectedSnapshot, "Overview", 15, 2)).toStrictEqual({
            formulaValue: "='Hourly history'!D3",
        });
        expect(cell(plan.expectedSnapshot, "Chart data", 168, 1)).toStrictEqual(
            { formulaValue: "='Hourly history'!D3" }
        );
        expect(
            cell(plan.expectedSnapshot, "Chart data", 166, 1)
        ).toBeUndefined();
        expect(
            cell(plan.expectedSnapshot, "Sensors & imports", 13, 0)
        ).toStrictEqual({
            stringValue: "Important instructions must survive expansion",
        });
        expect(
            plan.expectedSnapshot.sheets[1]?.tables?.[0]?.range.endRowIndex
        ).toBe(3);
        expect(
            plan.expectedSnapshot.sheets[2]?.tables?.[1]?.range.endRowIndex
        ).toBe(13);
    });

    it("recognizes ready, fully applied, and changed outcomes from fresh native reads", () => {
        expect.hasAssertions();

        const input = fixture();
        const plan = planSensorWorkbookImport(input);

        expect(reconcileSensorWorkbookImport(plan, input.snapshot)).toBe(
            "ready"
        );
        expect(reconcileSensorWorkbookImport(plan, plan.expectedSnapshot)).toBe(
            "applied"
        );

        const partial = structuredClone(input.snapshot);
        put(partial, "Hourly history", 2, ["partial write"]);

        expect(() => reconcileSensorWorkbookImport(plan, partial)).toThrow(
            "drift or partial outcome"
        );
        expect(() =>
            reconcileSensorWorkbookImport(plan, {
                ...input.snapshot,
                spreadsheetId: "wrong",
            })
        ).toThrow("Wrong destination");
    });

    it("rejects incomplete archives, changed provenance and live measurement edits", () => {
        expect.hasAssertions();

        const input = fixture();

        expect(() =>
            planSensorWorkbookImport({
                ...input,
                recorded: { ...input.recorded, sources: [] },
            })
        ).toThrow("unrepresented");
        expect(() =>
            planSensorWorkbookImport({
                ...input,
                candidate: {
                    ...input.candidate,
                    sources: input.candidate.sources.slice(1),
                },
            })
        ).toThrow("omits or changes");

        const edited = structuredClone(input);
        const hour = required(edited.recorded.hours[0]);
        const values = sensorHourRow(hour);
        values[3] = 999;
        put(edited.snapshot, "Hourly history", 1, values);

        expect(() => planSensorWorkbookImport(edited)).toThrow(
            "differs from recorded archive"
        );
    });

    it("rejects duplicate live keys, schema drift and cells outside managed table bounds", () => {
        expect.hasAssertions();

        const duplicate = fixture();
        const hour = required(duplicate.recorded.hours[0]);
        const table = required(duplicate.snapshot.sheets[1]?.tables?.[0]);
        put(duplicate.snapshot, "Hourly history", 2, sensorHourRow(hour));

        expect(() => planSensorWorkbookImport(duplicate)).toThrow(
            "outside its native table"
        );

        table.range.endRowIndex = 3;

        expect(() => planSensorWorkbookImport(duplicate)).toThrow(
            "duplicate live hour"
        );

        const schema = fixture();
        put(schema.snapshot, "Hourly history", 0, ["Wrong header"]);

        expect(() => planSensorWorkbookImport(schema)).toThrow("schema");
    });

    it("requires source archive URLs and treats formula-like filenames as literal strings", () => {
        expect.hasAssertions();

        const input = fixture();
        const receipt = required(input.candidate.sources[1]);
        const detail = required(input.sourceDetails[0]);
        receipt.fileName = "=IMPORTDATA(unsafe).csv";
        detail.receipt = receipt;
        const plan = planSensorWorkbookImport(input);

        expect(
            cell(plan.expectedSnapshot, "Sensors & imports", 12, 1)
        ).toStrictEqual({ stringValue: receipt.fileName });

        receipt.sourceUrl = null;

        expect(() => planSensorWorkbookImport(input)).toThrow(
            "verified archive provenance"
        );
    });

    it("ignores calculated/formatted response noise but detects formula changes", () => {
        expect.hasAssertions();

        const input = fixture();
        const digest = sensorWorkbookDigest(input.snapshot);
        const current = required(input.snapshot.sheets[0]);
        current.data = [
            {
                rowData: [
                    { values: [{ userEnteredValue: { formulaValue: "=1" } }] },
                ],
            },
        ];

        expect(sensorWorkbookDigest(input.snapshot)).not.toBe(digest);
    });
});

async function cliFixture() {
    const parent = path.resolve(tmpdir());
    const directory = await mkdtemp(
        path.join(parent, "garden-sensor-workbook-")
    );
    onTestFinished(async () => {
        const fixtureName = path.basename(directory);
        if (
            path.dirname(directory) !== parent ||
            !fixtureName.startsWith("garden-sensor-workbook-")
        )
            throw new Error("Unexpected fixture cleanup path");
        await rm(directory, { force: true, recursive: true });
    });
    const input = fixture();
    const oldCsv = `${header}\n${first}\n`;
    const newCsv = `${header}\n${first}\n${second}\n${third}\n`;
    const oldSource = {
        ...required(input.recorded.sources[0]),
        csvPath: "old.csv",
        sha256: createHash("sha256").update(oldCsv).digest("hex"),
    };
    const newSource = {
        ...required(input.candidate.sources[1]),
        csvPath: "new.csv",
        sha256: createHash("sha256").update(newCsv).digest("hex"),
    };
    const originalCell = required(
        input.snapshot.sheets[2]?.data?.[0]?.rowData?.[11]?.values?.[8]
    );
    originalCell.userEnteredValue = { stringValue: oldSource.sha256 };
    const snapshotPath = path.join(directory, "snapshot.json");
    const recordedManifestPath = path.join(directory, "recorded.json");
    const manifestPath = path.join(directory, "candidate.json");
    const incomingCsvPath = path.join(directory, "new.csv");
    const sourceManifest = [oldSource, newSource].map(
        ({ csvPath, sensorId, sha256, sourceUrl, timeZone }) => ({
            csvPath,
            sensorId,
            sha256,
            sourceUrl,
            timeZone,
        })
    );
    const recordedSources = sourceManifest.slice(0, 1);
    await Promise.all([
        writeFile(path.join(directory, "old.csv"), oldCsv),
        writeFile(incomingCsvPath, newCsv),
        writeFile(snapshotPath, JSON.stringify(input.snapshot)),
        writeFile(
            recordedManifestPath,
            JSON.stringify({
                schemaVersion: 1,
                sources: recordedSources,
            })
        ),
        writeFile(
            manifestPath,
            JSON.stringify({ schemaVersion: 1, sources: sourceManifest })
        ),
    ]);
    return {
        directory,
        incomingCsvPath,
        manifestPath,
        recordedManifestPath,
        snapshotPath,
    };
}

/** @param {unknown} value */
function expectedSnapshot(value) {
    if (
        typeof value !== "object" ||
        value === null ||
        !("expectedSnapshot" in value)
    )
        throw new Error("CLI plan missing snapshot");
    return value.expectedSnapshot;
}

/** @template T @param {T | undefined} value @returns {T} */
function required(value) {
    if (value === undefined) throw new Error("Fixture value missing");
    return value;
}

/** @param {string[]} args */
function runCli(...args) {
    return spawnSync(
        process.execPath,
        [path.resolve("scripts/plan-sensor-workbook-import.mjs"), ...args],
        { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }
    );
}
