/* eslint unicorn/prefer-temporal: "off" -- UTC Date mirrors sensor-hourly.mjs. */
import { createHash } from "node:crypto";

import { sensorArchiveUrl } from "./sensor-archive-url.mjs";

/** @typedef {import("../../types/sensor-workbook-import.d.ts").SensorWorkbookSnapshot} Snapshot */
/** @typedef {import("../../types/sensor-workbook-import.d.ts").SensorWorkbookSheet} Sheet */
/** @typedef {import("../../types/sensor-workbook-import.d.ts").SensorWorkbookValue} Value */
/** @typedef {import("../../types/sensor-workbook-import.d.ts").SensorWorkbookImportPlan} Plan */
/** @typedef {import("../../types/sensor-history.d.ts").SensorHistoryReceipt} Receipt */

export const sensorHourlyHeaders = [
    "Hour (Eastern)",
    "Sensor ID",
    "Samples",
    ...["Body", "Probe"].flatMap((channel) =>
        [
            "Temp mean (°C)",
            "Temp min (°C)",
            "Temp max (°C)",
            "Temp samples",
            "RH mean (%)",
            "RH min (%)",
            "RH max (%)",
            "RH samples",
            "VPD mean (kPa)",
            "VPD min (kPa)",
            "VPD max (kPa)",
            "VPD samples",
        ].map((metric) => `${channel} ${metric}`)
    ),
    "Hour start (UTC)",
    "First sample (UTC)",
    "Last sample (UTC)",
    "Hour key",
];
export const sensorReceiptHeaders = [
    "Import date (UTC)",
    "Source file",
    "Sensor ID",
    "Export timezone",
    "Populated rows",
    "Empty rows skipped",
    "Duplicate rows",
    "Hourly rows",
    "SHA-256",
    "Archived source URL",
    "Source temperature unit",
    "First reading (Eastern)",
    "Last reading (Eastern)",
    "Status",
];
const registryHeaders = [
    "Sensor ID",
    "Display name",
    "Owner model label",
    "Export timezone",
    "Built-in channel",
    "Probe channel",
];
const sourcesTitle = "Sensors & imports";
const titles = [
    "Overview",
    "Hourly history",
    sourcesTitle,
    "Chart data",
];

/**
 * A read-only plan. Apply its requests as one native batch only after a fresh
 * precondition check.
 *
 * @param {import("../../types/sensor-workbook-import.d.ts").SensorWorkbookImportInput} input
 *
 * @returns {Plan}
 */
export function planSensorWorkbookImport(input) {
    const { candidate, importedAt, recorded, snapshot, sourceDetails } = input;
    assertCaptureCoverage(snapshot);
    if (!Number.isFinite(Date.parse(importedAt)) || !importedAt.endsWith("Z"))
        throw new Error("Import date must be an explicit UTC instant.");
    const { addedSources, history, historyTable, rowByKey, sourceTable } =
        validateSnapshot(snapshot, recorded, candidate);
    const details = new Map(
        sourceDetails.map((detail) => [receiptKey(detail.receipt), detail])
    );
    if (details.size !== sourceDetails.length)
        throw new Error("Duplicate source details.");
    const expectedSnapshot = structuredClone(snapshot);
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    let addedHours = 0;
    let changedHours = 0;
    let nextRow = historyTable.range.endRowIndex;
    for (const hour of candidate.hours) {
        const existingRow = rowByKey.get(hour.key);
        const values = sensorHourRow(hour);
        if (
            existingRow !== undefined &&
            areEqualValues(readRow(history, existingRow, 31), values)
        )
            continue;
        const row = existingRow ?? nextRow;
        if (existingRow === undefined) nextRow += 1;
        if (existingRow === undefined) addedHours += 1;
        else changedHours += 1;
        rowByKey.set(hour.key, row);
        write(expectedSnapshot, requests, "Hourly history", row, 0, [values]);
    }
    if ((changedHours > 0 || addedHours > 0) && addedSources.length === 0)
        throw new Error("Hourly changes have no new archived source.");
    let receiptRow = sourceTable.range.endRowIndex;
    if (addedSources.length > 0) {
        insertReceiptRows(
            expectedSnapshot,
            requests,
            receiptRow,
            addedSources.length
        );
    }
    for (const source of addedSources) {
        const detail = details.get(receiptKey(source));
        if (
            detail === undefined ||
            source.sourceUrl === null ||
            source.sourceUrl === "" ||
            !isSameReceipt(source, detail.receipt)
        )
            throw new Error(
                "Every new source requires verified archive provenance and source details."
            );
        const values = receiptValues(source, detail, importedAt);
        write(expectedSnapshot, requests, sourcesTitle, receiptRow, 0, [
            values,
        ]);
        receiptRow += 1;
    }
    if (requests.length > 0) {
        resizeTable(
            expectedSnapshot,
            requests,
            "Hourly history",
            "HourlySensorHistory",
            nextRow
        );
        resizeTable(
            expectedSnapshot,
            requests,
            sourcesTitle,
            "SensorImportLog",
            receiptRow
        );
        updateViews(
            expectedSnapshot,
            requests,
            candidate,
            rowByKey,
            nextRow,
            receiptRow
        );
    }
    return {
        addedHours,
        addedSources: addedSources.length,
        changedHours,
        expectedDigest: sensorWorkbookDigest(expectedSnapshot),
        expectedSnapshot,
        preconditionDigest: sensorWorkbookDigest(snapshot),
        requests,
        schemaVersion: 1,
        spreadsheetId: snapshot.spreadsheetId,
    };
}

/**
 * Classifies a fresh read after an uncertain API result; never assumes success.
 *
 * @param {Plan} plan @param {Snapshot} fresh @returns {"ready" | "applied"}
 */
export function reconcileSensorWorkbookImport(plan, fresh) {
    if (fresh.spreadsheetId !== plan.spreadsheetId)
        throw new Error("Wrong destination workbook.");
    const digest = sensorWorkbookDigest(fresh);
    if (digest === plan.expectedDigest) return "applied";
    if (digest === plan.preconditionDigest) return "ready";
    throw new Error(
        "Workbook drift or partial outcome; rebuild the plan from a fresh complete archive and snapshot before writing."
    );
}

/**
 * @param {import("../../types/sensor-hourly.d.ts").SensorHourSummary} hour
 *
 * @returns {Value[]}
 */
export function sensorHourRow(hour) {
    return [
        easternLabel(hour.hourStartUtc),
        hour.sensorId,
        hour.sampleCount,
        ...[hour.builtIn, hour.probe].flatMap((channel) =>
            [
                channel.temperatureC,
                channel.humidity,
                channel.vpd,
            ].flatMap((metric) => [
                metric.mean,
                metric.min,
                metric.max,
                metric.count,
            ])
        ),
        dateSerial(hour.hourStartUtc),
        dateSerial(hour.firstObservedAt),
        dateSerial(hour.lastObservedAt),
        hour.key,
    ];
}

/** @param {Snapshot} snapshot */
export function sensorWorkbookDigest(snapshot) {
    assertCaptureCoverage(snapshot);
    const normalized = titles.map((title) => {
        const current = sheet(snapshot, title);
        const cells = [];
        for (
            let row = 0;
            row < current.properties.gridProperties.rowCount;
            row += 1
        ) {
            const values = nativeRow(
                current,
                row,
                current.properties.gridProperties.columnCount
            );
            if (values.some((value) => value.userEnteredValue !== undefined))
                cells.push([row, values]);
        }
        return {
            cells,
            charts: current.charts ?? [],
            properties: current.properties,
            tables: current.tables ?? [],
        };
    });
    return createHash("sha256")
        .update(
            canonicalJson({
                normalized,
                spreadsheetId: snapshot.spreadsheetId,
            })
        )
        .digest("hex");
}

/** @param {Value[]} actual @param {Value[]} expected */
function areEqualValues(actual, expected) {
    return (
        actual.length === expected.length &&
        actual.every((value, index) => {
            const target = expected[index];
            return typeof value === "number" && typeof target === "number"
                ? Math.abs(value - target) <=
                      Math.max(1, Math.abs(value), Math.abs(target)) * 1e-12
                : value === target;
        })
    );
}

/** @param {Snapshot} snapshot */
function assertCaptureCoverage(snapshot) {
    if (!Array.isArray(snapshot.capturedRanges))
        throw new Error(
            "Snapshot requires explicit capturedRanges; omitted cells are not evidence of emptiness."
        );
    for (const title of titles) {
        const target = sheet(snapshot, title);
        const rows = target.properties.gridProperties.rowCount;
        const columns = target.properties.gridProperties.columnCount;
        const isCovered = snapshot.capturedRanges.some((range) => {
            const [rawTitle, coordinates] = range.split("!", 2);
            const name = rawTitle
                ?.replaceAll(/^'|'$/gv, "")
                .replaceAll("''", "'");
            const match = /^A1:(?<columns>[A-Z]+)(?<rows>[1-9]\d*)$/v.exec(
                coordinates ?? ""
            )?.groups;
            const columnLabel = match?.["columns"];
            const rowLabel = match?.["rows"];
            if (
                name !== title ||
                columnLabel === undefined ||
                rowLabel === undefined
            )
                return false;
            let endColumn = 0;
            for (const letter of columnLabel)
                endColumn = endColumn * 26 + (letter.codePointAt(0) ?? 0) - 64;
            return Number(rowLabel) >= rows && endColumn >= columns;
        });
        if (!isCovered)
            throw new Error(
                `Incomplete captured range for ${title}; capture A1 through all ${rows} required rows and ${columns} columns.`
            );
    }
}

/** @param {Sheet} target @param {number} first @param {number} columns */
function assertNoRowsBeyondTable(target, first, columns) {
    for (
        let row = first;
        row < target.properties.gridProperties.rowCount;
        row += 1
    )
        if (readRow(target, row, columns).some((value) => value !== null))
            throw new Error("Hourly data exists outside its native table.");
}

/**
 * @param {Sheet} current @param {number} row @param {number} column
 * @param {string | undefined} formula @param {Map<number, string[]>} permitted
 */
function assertReceiptFormula(current, row, column, formula, permitted) {
    if (formula === undefined) return;
    if (current.properties.title === sourcesTitle)
        throw new Error(
            "Receipt insertion cannot rebase formulas on the import sheet."
        );
    if (!/sensors\s*&\s*imports/iv.test(formula)) return;
    const isPermitted =
        current.properties.title === "Overview" &&
        column === 1 &&
        permitted.get(row)?.includes(formula) === true;
    if (!isPermitted)
        throw new Error(
            "Receipt insertion has an unsupported cross-sheet formula dependency."
        );
}
/**
 * Fail closed on dependencies that native row insertion would rebase.
 *
 * @param {Snapshot} snapshot @param {number} start
 */
function assertReceiptInsertionShape(snapshot, start) {
    if (snapshot.sheets.length !== titles.length)
        throw new Error(
            "Receipt insertion requires the four reviewed workbook sheets only."
        );
    const sources = sheet(snapshot, sourcesTitle);
    if ((sources.charts?.length ?? 0) > 0)
        throw new Error(
            "Receipt insertion cannot rebase charts on the import sheet."
        );
    const permitted = new Map([
        [
            9,
            [
                `='Sensors & imports'!F${start}`,
                `=SUM('Sensors & imports'!F12:F${start})`,
            ],
        ],
        [10, [`='Sensors & imports'!G${start}`]],
    ]);
    for (const current of snapshot.sheets) {
        if (
            JSON.stringify(current.charts ?? []).includes(
                `"sheetId":${sources.properties.sheetId}`
            )
        )
            throw new Error(
                "Receipt insertion cannot rebase chart references to the import sheet."
            );
        for (
            let row = 0;
            row < current.properties.gridProperties.rowCount;
            row += 1
        ) {
            const values = nativeRow(
                current,
                row,
                current.properties.gridProperties.columnCount
            );
            for (const [column, value] of values.entries())
                assertReceiptFormula(
                    current,
                    row,
                    column,
                    value.userEnteredValue?.formulaValue,
                    permitted
                );
        }
    }
}
/**
 * @param {Sheet} target @param {number} row @param {Value[]} values @param
 *   {string} message
 */
function assertRow(target, row, values, message) {
    assertValues(readRow(target, row, values.length), values, message);
}
/** @param {Value[]} actual @param {Value[]} expected @param {string} message */
function assertValues(actual, expected, message) {
    if (!areEqualValues(actual, expected)) throw new Error(message);
}
/** @param {unknown} value @returns {string} */
function canonicalJson(value) {
    if (Array.isArray(value))
        return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
    if (typeof value === "object" && value !== null) {
        const entries = Object.entries(value)
            .filter(([, item]) => item !== undefined)
            .toSorted(([left], [right]) => left.localeCompare(right, "en"));
        const properties = entries
            .map(
                ([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`
            )
            .join(",");
        return `{${properties}}`;
    }
    return JSON.stringify(value);
}
/** @param {Value} value @param {boolean} [allowFormulas] */
function cellValue(value, allowFormulas = false) {
    if (value === null) return {};
    return {
        userEnteredValue:
            typeof value === "number"
                ? { numberValue: value }
                : allowFormulas && value.startsWith("=")
                  ? { formulaValue: value }
                  : { stringValue: value },
    };
}
/** @param {string} instant */
function dateSerial(instant) {
    return Date.parse(instant) / 86_400_000 + 25_569;
}
/** @param {string} instant */
function easternLabel(instant) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
        minute: "2-digit",
        month: "2-digit",
        timeZone: "America/New_York",
        timeZoneName: "short",
        year: "numeric",
    });
    const parts = Object.fromEntries(
        formatter
            .formatToParts(new Date(instant))
            .map(({ type, value }) => [type, value])
    );
    return `${String(parts["year"])}-${String(parts["month"])}-${String(parts["day"])} ${String(parts["hour"])}:${String(parts["minute"])} ${String(parts["timeZoneName"])}`;
}
/** @param {Snapshot} snapshot @param {Sheet} target */
function extendCapture(snapshot, target) {
    let column = target.properties.gridProperties.columnCount;
    let label = "";
    while (column > 0) {
        const remainder = (column - 1) % 26;
        label = String.fromCodePoint(65 + remainder) + label;
        column = Math.floor((column - 1) / 26);
    }
    snapshot.capturedRanges.push(
        `'${target.properties.title}'!A1:${label}${target.properties.gridProperties.rowCount}`
    );
}

/**
 * Insert above notes rather than eventually overwriting them as the log grows.
 *
 * @param {Snapshot} snapshot @param {Record<string, unknown>[]} requests @param
 *   {number} start @param {number} count
 */
function insertReceiptRows(snapshot, requests, start, count) {
    const target = sheet(snapshot, sourcesTitle);
    assertReceiptInsertionShape(snapshot, start);
    if (
        target.tables?.some(
            (entry) =>
                entry.name !== "SensorImportLog" &&
                entry.range.endRowIndex > start
        ) === true
    )
        throw new Error(
            "Another native table overlaps the receipt insertion area."
        );
    const previous = Array.from(
        { length: target.properties.gridProperties.rowCount },
        (_, row) => ({
            values: nativeRow(
                target,
                row,
                target.properties.gridProperties.columnCount
            ),
        })
    );
    previous.splice(
        start,
        0,
        ...Array.from({ length: count }, () => ({ values: [] }))
    );
    target.properties.gridProperties.rowCount += count;
    extendCapture(snapshot, target);
    target.data = [{ rowData: previous, startColumn: 0, startRow: 0 }];
    requests.push({
        insertDimension: {
            inheritFromBefore: true,
            range: {
                dimension: "ROWS",
                endIndex: start + count,
                sheetId: target.properties.sheetId,
                startIndex: start,
            },
        },
    });
}
/** @param {Receipt} left @param {Receipt | undefined} right */
function isSameReceipt(left, right) {
    return (
        left.sensorId === right?.sensorId &&
        left.sha256 === right.sha256 &&
        left.timeZone === right.timeZone &&
        left.populatedRows === right.populatedRows &&
        left.skippedEmptyRows === right.skippedEmptyRows &&
        left.sourceUrl === right.sourceUrl
    );
}
/**
 * @param {Sheet} target @param {number} row @param {number} columns @returns
 *   {import("../../types/sensor-workbook-import.d.ts").SensorWorkbookCell[]}
 */
function nativeRow(target, row, columns) {
    const result = Array.from(
        { length: columns },
        () =>
            /** @type {import("../../types/sensor-workbook-import.d.ts").SensorWorkbookCell} */ ({})
    );
    if (target.data === undefined) return result;
    for (const block of target.data) {
        const values = block.rowData?.[row - (block.startRow ?? 0)]?.values;
        if (!values) continue;
        for (const [index, cell] of values.entries()) {
            const column = index + (block.startColumn ?? 0);
            if (column < columns) {
                result[column] = cell.userEnteredValue
                    ? { userEnteredValue: cell.userEnteredValue }
                    : {};
            }
        }
    }
    return result;
}
/**
 * @param {Sheet} target @param {number} row @param {number} columns @returns
 *   {Value[]}
 */
function readRow(target, row, columns) {
    return nativeRow(target, row, columns).map(
        ({ userEnteredValue: value }) => {
            if (value?.boolValue !== undefined)
                throw new Error("Unexpected boolean in sensor workbook.");
            return (
                value?.formulaValue ??
                value?.numberValue ??
                value?.stringValue ??
                null
            );
        }
    );
}
/** @param {Receipt} source */
function receiptKey(source) {
    return `${source.sensorId}|${source.sha256}`;
}
/** @param {Receipt[]} receipts */
function receiptMap(receipts) {
    for (const source of receipts) {
        if (
            source.sourceUrl !== null &&
            sensorArchiveUrl(source.sourceUrl) !== source.sourceUrl
        )
            throw new Error("Prepared source URL must already be canonical.");
    }
    const result = new Map(
        receipts.map((source) => [receiptKey(source), source])
    );
    if (result.size !== receipts.length)
        throw new Error("Duplicate archive source identity.");
    return result;
}
/**
 * @param {Receipt} source @param
 *   {import("../../types/sensor-workbook-import.d.ts").SensorWorkbookSourceDetail}
 *   detail @param {string} importedAt
 */
function receiptValues(source, detail, importedAt) {
    return [
        dateSerial(importedAt),
        source.fileName,
        source.sensorId,
        source.timeZone,
        source.populatedRows,
        source.skippedEmptyRows,
        detail.duplicateRows,
        detail.hourlyRows,
        source.sha256,
        source.sourceUrl,
        detail.temperatureUnit,
        detail.firstObservedAt === null
            ? null
            : easternLabel(detail.firstObservedAt),
        detail.lastObservedAt === null
            ? null
            : easternLabel(detail.lastObservedAt),
        "Imported",
    ];
}
/**
 * @param {Snapshot} snapshot @param {Record<string, unknown>[]} requests @param
 *   {string} title @param {string} name @param {number} endRow
 */
function resizeTable(snapshot, requests, title, name, endRow) {
    const target = sheet(snapshot, title).tables?.find(
        (entry) => entry.name === name
    );
    if (!target) throw new Error("Native table disappeared.");
    if (target.range.endRowIndex === endRow) return;
    target.range.endRowIndex = endRow;
    requests.push({
        updateTable: {
            fields: "range",
            table: { range: target.range, tableId: target.tableId },
        },
    });
}
/** @param {Snapshot} snapshot @param {string} title */
function sheet(snapshot, title) {
    const matches = snapshot.sheets.filter(
        (entry) => entry.properties.title === title
    );
    if (matches.length !== 1 || !matches[0])
        throw new Error(`Missing or duplicate sheet: ${title}.`);
    return matches[0];
}
/**
 * @param {Sheet} target @param {string} name @param {number} startRow @param
 *   {number} columns
 */
function table(target, name, startRow, columns) {
    const matches = target.tables?.filter((entry) => entry.name === name) ?? [];
    const result = matches[0];
    if (
        matches.length !== 1 ||
        result?.range.sheetId !== target.properties.sheetId ||
        (result.range.startRowIndex ?? 0) !== startRow ||
        (result.range.startColumnIndex ?? 0) !== 0 ||
        result.range.endColumnIndex !== columns
    )
        throw new Error(`Missing or changed native table: ${name}.`);
    return result;
}
/**
 * @param {Snapshot} snapshot @param {Record<string, unknown>[]} requests @param
 *   {import("../../types/sensor-history.d.ts").SensorHistoryPreparation}
 *   candidate @param {Map<string, number>} rows @param {number} lastRow @param
 *   {number} receiptEnd
 */
function updateViews(snapshot, requests, candidate, rows, lastRow, receiptEnd) {
    const latest = candidate.hours
        .toSorted((a, b) => a.hourStartUtc.localeCompare(b.hourStartUtc))
        .at(-1);
    if (!latest) throw new Error("No sensor hours available.");
    const latestRow = (rows.get(latest.key) ?? -1) + 1;
    write(
        snapshot,
        requests,
        "Overview",
        5,
        1,
        [
            [`=SUM('Hourly history'!C2:C${lastRow})`],
            [`=COUNTA('Hourly history'!AE2:AE${lastRow})`],
            [`=COUNTIF('Hourly history'!C2:C${lastRow},60)`],
            [`=COUNTIF('Hourly history'!C2:C${lastRow},"<60")`],
            [`=SUM('Sensors & imports'!F12:F${receiptEnd})`],
            [`='Sensors & imports'!G${receiptEnd}`],
        ],
        true
    );
    write(
        snapshot,
        requests,
        "Overview",
        8,
        4,
        [[`='Hourly history'!A${latestRow}`]],
        true
    );
    write(snapshot, requests, "Overview", 10, 4, [
        [easternLabel(latest.lastObservedAt)],
    ]);
    const metricColumns = [
        [
            "D",
            "E",
            "F",
            "G",
        ],
        [
            "H",
            "I",
            "J",
            "K",
        ],
        [
            "L",
            "M",
            "N",
            "O",
        ],
        [
            "P",
            "Q",
            "R",
            "S",
        ],
        [
            "T",
            "U",
            "V",
            "W",
        ],
        [
            "X",
            "Y",
            "Z",
            "AA",
        ],
    ];
    write(
        snapshot,
        requests,
        "Overview",
        15,
        2,
        metricColumns.map((columns) =>
            columns.map((column) => `='Hourly history'!${column}${latestRow}`)
        ),
        true
    );
    const byTime = new Map(
        candidate.hours
            .filter((hour) => hour.sensorId === latest.sensorId)
            .map((hour) => [hour.hourStartUtc, rows.get(hour.key)])
    );
    const chart = Array.from({ length: 168 }, (_, index) => {
        const instant = new Date(
            Date.parse(latest.hourStartUtc) - (167 - index) * 3_600_000
        );
        const time = instant.toISOString();
        const sourceRow = byTime.get(time);
        return [
            easternLabel(time),
            ...[
                "D",
                "P",
                "H",
                "T",
                "L",
                "X",
            ].map((column) =>
                sourceRow === undefined
                    ? null
                    : `='Hourly history'!${column}${sourceRow + 1}`
            ),
        ];
    });
    write(snapshot, requests, "Chart data", 1, 0, chart, true);
}

/**
 * @param {Sheet} sources @param {number} sourceEnd @param
 *   {import("../../types/sensor-history.d.ts").SensorHistoryPreparation}
 *   recorded @param
 *   {import("../../types/sensor-history.d.ts").SensorHistoryPreparation}
 *   candidate
 */
function validateReceipts(sources, sourceEnd, recorded, candidate) {
    const recordedSources = receiptMap(recorded.sources);
    const candidateSources = receiptMap(candidate.sources);
    for (const [key, source] of recordedSources) {
        if (!isSameReceipt(source, candidateSources.get(key)))
            throw new Error(
                "Candidate archive omits or changes a recorded source."
            );
    }
    const seenReceipts = new Set();
    for (let index = 11; index < sourceEnd; index += 1) {
        const row = readRow(sources, index, 14);
        const key = `${String(row[2])}|${String(row[8])}`;
        const receipt = recordedSources.get(key);
        if (!receipt || seenReceipts.has(key) || row[13] !== "Imported")
            throw new Error(
                "Duplicate, incomplete, or unrepresented live import receipt."
            );
        seenReceipts.add(key);
        assertValues(
            row.slice(2, 6),
            [
                receipt.sensorId,
                receipt.timeZone,
                receipt.populatedRows,
                receipt.skippedEmptyRows,
            ],
            "Live source receipt drift"
        );
        if (row[9] !== receipt.sourceUrl)
            throw new Error("Archived source URL drift.");
    }
    if (seenReceipts.size !== recordedSources.size)
        throw new Error(
            "Recorded archive contains sources absent from live receipts."
        );
    // Receipt rows share this sheet with instructions below; detect only receipt identities outside its table.
    for (
        let index = sourceEnd;
        index < sources.properties.gridProperties.rowCount;
        index += 1
    ) {
        if (readRow(sources, index, 14)[8] !== null)
            throw new Error("Import receipt exists outside its native table.");
    }
    return recordedSources;
}
/**
 * @param {Snapshot} snapshot @param
 *   {import("../../types/sensor-history.d.ts").SensorHistoryPreparation}
 *   recorded @param
 *   {import("../../types/sensor-history.d.ts").SensorHistoryPreparation}
 *   candidate
 */
function validateSnapshot(snapshot, recorded, candidate) {
    const history = sheet(snapshot, "Hourly history");
    const sources = sheet(snapshot, sourcesTitle);
    const historyTable = table(history, "HourlySensorHistory", 0, 31);
    const sourceTable = table(sources, "SensorImportLog", 10, 14);
    const registryTable = table(sources, "SensorRegistry", 4, 6);
    assertRow(history, 0, sensorHourlyHeaders, "Hourly history schema");
    assertRow(sources, 10, sensorReceiptHeaders, "Import receipt schema");
    assertRow(sources, 4, registryHeaders, "Sensor registry schema");
    /** @type {Map<string, string>} */
    const zones = new Map();
    for (let index = 5; index < registryTable.range.endRowIndex; index += 1) {
        const row = readRow(sources, index, 6);
        if (
            typeof row[0] !== "string" ||
            typeof row[3] !== "string" ||
            zones.has(row[0])
        )
            throw new Error("Invalid or duplicate registered sensor.");
        zones.set(row[0], row[3]);
    }
    for (const sensor of Iterator.concat(recorded.sensors, candidate.sensors)) {
        if (zones.get(sensor.sensorId) !== sensor.timeZone)
            throw new Error(`Sensor registry mismatch: ${sensor.sensorId}.`);
        // Current workbook's headings and civil-time display explicitly say Eastern.
        if (sensor.timeZone !== "America/New_York")
            throw new Error(
                "This workbook requires an explicit layout migration for non-Eastern sensors."
            );
    }
    const recordedSources = validateReceipts(
        sources,
        sourceTable.range.endRowIndex,
        recorded,
        candidate
    );
    assertNoRowsBeyondTable(history, historyTable.range.endRowIndex, 31);
    const existingHours = new Map(
        recorded.hours.map((hour) => [hour.key, hour])
    );
    const candidateHours = new Map(
        candidate.hours.map((hour) => [hour.key, hour])
    );
    if (
        existingHours.size !== recorded.hours.length ||
        candidateHours.size !== candidate.hours.length
    )
        throw new Error("Duplicate hourly keys in prepared history.");
    /** @type {Map<string, number>} */
    const rowByKey = new Map();
    for (let index = 1; index < historyTable.range.endRowIndex; index += 1) {
        const actual = readRow(history, index, 31);
        const key = actual[30];
        const original =
            typeof key === "string" ? existingHours.get(key) : undefined;
        if (typeof key !== "string" || !original || rowByKey.has(key))
            throw new Error("Unexpected or duplicate live hour key.");
        assertValues(
            actual,
            sensorHourRow(original),
            "Live hourly data differs from recorded archive"
        );
        rowByKey.set(key, index);
    }
    if (rowByKey.size !== existingHours.size)
        throw new Error("Live hourly history is incomplete.");
    for (const key of existingHours.keys()) {
        if (!candidateHours.has(key))
            throw new Error("Candidate removes an existing hour.");
    }
    const addedSources = candidate.sources.filter(
        (source) => !recordedSources.has(receiptKey(source))
    );
    return { addedSources, history, historyTable, rowByKey, sourceTable };
}

/**
 * @param {Snapshot} snapshot @param {Record<string, unknown>[]} requests @param
 *   {string} title @param {number} row @param {number} column @param
 *   {Value[][]} values @param {boolean} [allowFormulas]
 */
function write(
    snapshot,
    requests,
    title,
    row,
    column,
    values,
    allowFormulas = false
) {
    const target = sheet(snapshot, title);
    const required = row + values.length;
    if (required > target.properties.gridProperties.rowCount) {
        requests.push({
            appendDimension: {
                dimension: "ROWS",
                length: required - target.properties.gridProperties.rowCount,
                sheetId: target.properties.sheetId,
            },
        });
        target.properties.gridProperties.rowCount = required;
        extendCapture(snapshot, target);
    }
    const rows = values.map((rowValues) => ({
        values: rowValues.map((value) => cellValue(value, allowFormulas)),
    }));
    requests.push({
        updateCells: {
            fields: "userEnteredValue",
            rows,
            start: {
                columnIndex: column,
                rowIndex: row,
                sheetId: target.properties.sheetId,
            },
        },
    });
    // Normalize the predicted snapshot to one dense value block for exact read-back comparison.
    const all = Array.from(
        { length: target.properties.gridProperties.rowCount },
        (_, index) => ({
            values: nativeRow(
                target,
                index,
                target.properties.gridProperties.columnCount
            ),
        })
    );
    for (const [index, entry] of rows.entries()) {
        all[row + index]?.values.splice(
            column,
            entry.values.length,
            ...entry.values
        );
    }
    target.data = [{ rowData: all, startColumn: 0, startRow: 0 }];
}
