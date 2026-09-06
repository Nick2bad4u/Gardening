import * as fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import vm from "node:vm";

const appPlantChartsSheet = "App plant charts";
const insightsDataSheet = "Insights data";
const plantTrackerSheet = "Plant tracker";
const runtime = await loadFormulaRuntime();

/** @param {string} column */
function baselineRange(column) {
    return `Baselines!$${column}$2:$${column}$31`;
}

/** @param {string} name @param {(string | number)[]} args */
function formula(name, ...args) {
    const value = /** @type {unknown} */ (runtime[name]);
    if (typeof value !== "function")
        throw new TypeError(`Missing Apps Script formula: ${name}`);
    const result = /** @type {unknown} */ (Reflect.apply(value, runtime, args));
    if (typeof result !== "string")
        throw new TypeError(`Invalid Apps Script formula: ${name}`);
    return result;
}

async function loadFormulaRuntime() {
    const context = vm.createContext({ Date, Map, Set });
    const source = await fs.readFile(
        new URL("plant-tracker.gs", import.meta.url),
        "utf8"
    );
    vm.runInContext(source, context);
    return context;
}

const benign = [
    "",
    "OK",
    "No trend",
    "No current-cycle alert",
    "Owner-confirmed normal",
];
const noAlert = (/** @type {string} */ cell) => {
    const conditions = benign.map((text) => `${cell}<>"${text}"`);
    return `AND(${conditions.join(",")})`;
};
const data = (
    /** @type {number} */ sheetId,
    /** @type {number} */ column,
    /** @type {number} */ startRowIndex,
    /** @type {number} */ endRowIndex
) => ({
    sourceRange: {
        sources: [
            {
                endColumnIndex: column + 1,
                endRowIndex,
                sheetId,
                startColumnIndex: column,
                startRowIndex,
            },
        ],
    },
});

/**
 * Build a reviewable native Sheets batch; never authenticates or writes
 * remotely. Input must be a freshly read, complete chart/format metadata
 * snapshot plus userEnteredValue cells for the derived ranges. History values
 * are never written.
 */
/**
 * @param {import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot} snapshot
 *
 * @returns {import("../../test/workbook-fixtures.d.ts").WorkbookRequest[]}
 */
export function buildWorkbookAuditRequests({ cells, metadata }) {
    const sheets = new Map(
        metadata.sheets.map((sheet) => [sheet.properties.title, sheet])
    );
    /** @param {string} name */
    const sheetNamed = (name) => {
        const sheet = sheets.get(name);
        if (!sheet) throw new Error(`Missing sheet: ${name}`);
        return sheet;
    };
    const cell = (
        /** @type {string} */ name,
        /** @type {number} */ row,
        /** @type {number} */ column
    ) =>
        cells.find(
            (item) =>
                item.sheet === name &&
                item.row === row &&
                item.column === column
        )?.value;
    const { ids, plants } = preflightWorkbook(sheets, cell);
    /** @type {import("../../test/workbook-fixtures.d.ts").WorkbookRequest[]} */
    const requests = [];
    const idOf = (/** @type {string} */ name) =>
        sheetNamed(name).properties.sheetId;
    const range = (
        /** @type {string} */ name,
        /** @type {number} */ row,
        /** @type {number} */ column,
        rows = 1,
        columns = 1
    ) => ({
        endColumnIndex: column + columns,
        endRowIndex: row + rows,
        sheetId: idOf(name),
        startColumnIndex: column,
        startRowIndex: row,
    });
    const write = (
        /** @type {string} */ name,
        /** @type {number} */ row,
        /** @type {number} */ column,
        /** @type {string[][]} */ values
    ) => {
        requests.push({
            updateCells: {
                fields: "userEnteredValue",
                rows: values.map((rowValues) => ({
                    values: rowValues.map((/** @type {string} */ value) => ({
                        userEnteredValue:
                            typeof value === "string" && value.startsWith("=")
                                ? { formulaValue: value }
                                : { stringValue: value },
                    })),
                })),
                start: {
                    columnIndex: column,
                    rowIndex: row,
                    sheetId: idOf(name),
                },
            },
        });
    };
    const format = (
        /** @type {string} */ name,
        /** @type {number} */ row,
        /** @type {number} */ column,
        /** @type {number | undefined} */ rows,
        /** @type {number | undefined} */ columns,
        /** @type {import("../../test/workbook-fixtures.d.ts").CellFormat} */ userEnteredFormat,
        /** @type {string} */ note = ""
    ) => {
        requests.push({
            repeatCell: {
                cell: { userEnteredFormat, ...(note && { note }) },
                fields: [
                    ...Object.keys(userEnteredFormat).map(
                        (key) => `userEnteredFormat.${key}`
                    ),
                    ...(note ? ["note"] : []),
                ].join(","),
                range: range(name, row, column, rows, columns),
            },
        });
    };
    const width = (
        /** @type {string} */ name,
        /** @type {number} */ startIndex,
        /** @type {number} */ endIndex,
        /** @type {number} */ pixelSize
    ) => {
        requests.push({
            updateDimensionProperties: {
                fields: "pixelSize",
                properties: { pixelSize },
                range: {
                    dimension: "COLUMNS",
                    endIndex,
                    sheetId: idOf(name),
                    startIndex,
                },
            },
        });
    };
    const resizeRows = (
        /** @type {string} */ name,
        /** @type {number} */ startIndex,
        /** @type {number} */ endIndex
    ) => {
        requests.push({
            autoResizeDimensions: {
                dimensions: {
                    dimension: "ROWS",
                    endIndex,
                    sheetId: idOf(name),
                    startIndex,
                },
            },
        });
    };
    const columns = (
        /** @type {string} */ name,
        /** @type {number} */ count
    ) => {
        if (sheetNamed(name).properties.gridProperties.columnCount < count)
            requests.push({
                appendDimension: {
                    dimension: "COLUMNS",
                    length:
                        count -
                        sheetNamed(name).properties.gridProperties.columnCount,
                    sheetId: idOf(name),
                },
            });
    };

    // The timeline may grow beyond its original 250-day display window.
    for (const name of [insightsDataSheet, "App insight activity"]) {
        const sheet = sheets.get(name);
        if (!sheet) throw new Error(`Missing sheet: ${name}`);
        const count = sheet.properties.gridProperties.rowCount;
        if (count < 5000)
            requests.push({
                appendDimension: {
                    dimension: "ROWS",
                    length: 5000 - count,
                    sheetId: idOf(name),
                },
            });
    }
    write("App insight activity", 1, 0, [
        [
            "=IFNA(FILTER('Insights data'!A2:D5000,'Insights data'!A2:A5000<>\"\"),\"\")",
        ],
    ]);

    write(
        "Baselines",
        1,
        10,
        ids.map((_, i) => [formula("remeasureStatusFormula_", i + 2)])
    );
    write("Dashboard", 1, 16, [["Current curve supported"]]);
    write("Dashboard", 2, 16, [
        [
            '=COUNTIF(Baselines!$I$2:$I$31,"Current cycle supported")&" / "&COUNTA(Baselines!$A$2:$A$31)',
        ],
    ]);
    write(appPlantChartsSheet, 1, 0, [[formula("appPlantChartsFormula_")]]);

    rewriteInsightHeaders(cells, write);
    for (let row = 2; row <= 31; row += 1) {
        const noAlertCondition = noAlert(`Baselines!J${row}`);
        write(insightsDataSheet, row - 1, 20, [
            [
                `=Baselines!A${row}`,
                `=Baselines!B${row}`,
                `=N(Baselines!H${row}<>"Calibrated")`,
                `=N(Baselines!K${row}="Due now")`,
                `=N(${noAlertCondition})`,
            ],
        ]);
        if (row >= 30) writeMissingPotHelpers(row, cell, write);
    }

    const baselineConditions = benign.map(
        (value) => `${baselineRange("J")},"<>${value}"`
    );
    const integrity = new Map([
        [13, `=COUNTIF(${baselineRange("K")},"Due now")`],
        [
            14,
            `=COUNTIFS(${baselineRange("A")},"<>",${baselineRange("H")},"<>Calibrated")`,
        ],
        [15, `=COUNTIFS(${baselineConditions.join(",")})`],
        [
            16,
            `=COUNTIFS(${baselineRange("I")},"Current cycle supported",${baselineRange("H")},"<>Calibrated")`,
        ],
        [18, `=COUNTIF(${baselineRange("N")},"No anchor")`],
    ]);
    for (const [row, expression] of integrity)
        write("Integrity", row, 1, [[expression]]);
    write("Integrity", 16, 0, [["Current curve supported but uncalibrated"]]);
    write("Integrity", 17, 2, [['=IF(B18>=0,"Info","Fail")']]);
    write("Integrity", 14, 3, [
        [
            "Needs a usable completed dry endpoint and wet reference in the current pot setup; collect observations, not a forced watering.",
        ],
    ]);
    write("Integrity", 13, 3, [
        [
            "Visual estimates stay in the ledger, but do not enter measured growth charts.",
        ],
    ]);
    const errorRanges = [
        "History!A2:AP5000",
        "Baselines!A2:AJ1000",
        "'Plant tracker'!A2:AJ1000",
        "Dashboard!A1:X254",
        "Insights!A1:R239",
        "'Insights data'!A1:AD5000",
        "'Dry-down models'!A1:P1000",
        "'App plant charts'!A1:H5000",
    ];
    const errorChecks = errorRanges.map(
        (value) => `ARRAYFORMULA(N(ISERROR(${value})))`
    );
    write("Integrity", 11, 1, [[`=SUM(${errorChecks.join(",")})`]]);
    for (let row = 2; row <= 31; row += 1) {
        const noAlertCondition = noAlert(`Baselines!J${row}`);
        const priority = `=IFS(${noAlertCondition},"Attention",Baselines!K${row}="Due now","Action due",Baselines!H${row}<>"Calibrated","Collect data",TRUE,"OK")`;
        const action = `=TEXTJOIN(" · ",TRUE,IF(Baselines!K${row}="Due now","Take a ruler-based height/width measurement",""),IF(Baselines!H${row}<>"Calibrated","Collect cycle observations in setup "&Baselines!T${row},""),IF(${noAlertCondition},"Reweigh to confirm "&LOWER(Baselines!J${row}),""))`;
        if (row <= 29) {
            write("Integrity", row + 21, 3, [[priority]]);
            write("Integrity", row + 21, 5, [[action]]);
        } else {
            if (cell("Integrity", row + 21, 0))
                throw new Error("New Integrity destination is not blank");
            write("Integrity", row + 21, 0, [
                [
                    `=Baselines!A${row}`,
                    `=Baselines!B${row}`,
                    `=Baselines!S${row}`,
                    priority,
                    `="Trend: "&Baselines!I${row}&" · calibration: "&Baselines!H${row}&" · trend review: "&Baselines!J${row}`,
                    action,
                    `=Baselines!C${row}`,
                    `=Baselines!E${row}`,
                    `=Baselines!R${row}`,
                    `="Anchor: "&Baselines!N${row}&" · "&Baselines!L${row}`,
                ],
            ]);
        }
    }

    columns(insightsDataSheet, 30);
    write(insightsDataSheet, 0, 26, [
        [
            "Plant ID",
            "Plant",
            "Measured height (cm)",
            "Measured width (cm)",
        ],
    ]);
    for (let row = 2; row <= 31; row += 1) {
        const latest = (/** @type {string} */ column) =>
            `=IFNA(INDEX(SORT(FILTER({'App plant charts'!$A$2:$A$5000,'App plant charts'!$${column}$2:$${column}$5000},'App plant charts'!$B$2:$B$5000=$AA${row},'App plant charts'!$${column}$2:$${column}$5000<>""),1,FALSE),1,2)*2.54,"")`;
        write(insightsDataSheet, row - 1, 26, [
            [
                `=Baselines!A${row}`,
                `=Baselines!B${row}`,
                latest("E"),
                latest("F"),
            ],
        ]);
    }

    for (const sheet of plants) {
        const name = sheet.properties.title;
        const sheetId = sheet.properties.sheetId;
        columns(name, 22);
        write(name, 11, 18, [
            [
                "Date",
                "Weight (g)",
                "Measured height (cm)",
                "Measured width (cm)",
            ],
        ]);
        write(name, 12, 18, [
            [formula("plantChartHelperFormula_", name.slice(0, 3))],
        ]);
        write(name, 11, 2, [["Recorded state"]]);
        format(name, 12, 18, 988, 1, {
            numberFormat: {
                pattern: "mmm d, yyyy h:mm am/pm",
                type: "DATE_TIME",
            },
        });
        format(name, 12, 19, 988, 3, {
            numberFormat: { pattern: "0.0#", type: "NUMBER" },
        });
        requests.push({
            updateDimensionProperties: {
                fields: "hiddenByUser",
                properties: { hiddenByUser: true },
                range: {
                    dimension: "COLUMNS",
                    endIndex: 22,
                    sheetId,
                    startIndex: 18,
                },
            },
        });
        const charts = required(sheet.charts);
        for (const chart of charts) {
            requests.push({
                updateChartSpec: {
                    chartId: chart.chartId,
                    spec: plantChartSpec(chart.spec, sheetId),
                },
            });
        }
    }
    requests.push(
        ...insightChartRequests(
            sheetNamed("Insights").charts,
            idOf(insightsDataSheet),
            idOf("Baselines")
        )
    );

    // Repair known legacy conditions in place; retain unrelated rules and colors.
    for (const name of [
        "Dashboard",
        "Baselines",
        plantTrackerSheet,
    ]) {
        const sheet = sheetNamed(name);
        const formats = sheet.conditionalFormats;
        if (formats === undefined) continue;
        for (const [index, original] of formats.entries()) {
            const rule = repairedConditionalRule(original, name);
            if (JSON.stringify(rule) !== JSON.stringify(original)) {
                requests.push({
                    updateConditionalFormatRule: {
                        index,
                        rule,
                        sheetId: sheet.properties.sheetId,
                    },
                });
            }
        }
    }

    columns("Dashboard", 24);
    columns("Baselines", 36);
    const displayedColumns = {
        Baselines: 36,
        Dashboard: 24,
        History: 42,
        [plantTrackerSheet]: 36,
    };
    for (const [name, count] of Object.entries(displayedColumns)) {
        requests.push(...expandedDecorationRequests(sheetNamed(name), count));
    }
    format("Dashboard", 6, 10, 30, 2, {
        numberFormat: { pattern: "0.0#", type: "NUMBER" },
    });
    format("Dashboard", 6, 12, 30, 2, {
        numberFormat: { pattern: "0", type: "NUMBER" },
    });
    format("Dashboard", 6, 23, 30, 1, {
        numberFormat: { pattern: "0", type: "NUMBER" },
    });
    format(
        "Dashboard",
        6,
        14,
        30,
        1,
        { numberFormat: { pattern: '0.0 "days"', type: "NUMBER" } },
        "Historical mean spacing, not a recommended watering interval or dry-down forecast."
    );
    format(
        "Baselines",
        1,
        12,
        30,
        1,
        { numberFormat: { pattern: "0.0%", type: "PERCENT" } },
        "Recent daily loss divided by current weight. Early-cycle loss is not extrapolated across the full cycle."
    );
    format(plantTrackerSheet, 1, 32, 30, 2, {
        numberFormat: { pattern: "0.0#", type: "NUMBER" },
    });
    format(insightsDataSheet, 1, 28, 30, 2, {
        numberFormat: { pattern: "0.0#", type: "NUMBER" },
    });
    format(appPlantChartsSheet, 1, 0, 4999, 1, {
        numberFormat: { pattern: "mmm d, yyyy h:mm am/pm", type: "DATE_TIME" },
    });
    format(appPlantChartsSheet, 1, 2, 4999, 1, {
        numberFormat: { pattern: "0.0", type: "NUMBER" },
    });
    format(appPlantChartsSheet, 1, 3, 4999, 1, {
        numberFormat: { pattern: "0.000", type: "NUMBER" },
    });
    format(appPlantChartsSheet, 1, 4, 4999, 3, {
        numberFormat: { pattern: "0.0#", type: "NUMBER" },
    });
    format(appPlantChartsSheet, 1, 7, 4999, 1, {
        numberFormat: { pattern: "0.0", type: "NUMBER" },
    });
    format("Dashboard", 6, 0, 30, 24, {
        verticalAlignment: "MIDDLE",
        wrapStrategy: "WRAP",
    });
    format("Integrity", 23, 0, 30, 10, {
        verticalAlignment: "MIDDLE",
        wrapStrategy: "WRAP",
    });
    format("Integrity", 51, 6, 2, 1, {
        numberFormat: { pattern: "0.0", type: "NUMBER" },
    });
    format("Integrity", 51, 7, 2, 1, {
        numberFormat: { pattern: "mmm d, yyyy", type: "DATE_TIME" },
    });
    width("Dashboard", 9, 10, 245);
    resizeRows("Dashboard", 6, 36);
    resizeRows("Baselines", 1, 31);
    resizeRows("Integrity", 23, 53);
    return requests;
}

/**
 * Validate the complete subset of native Sheets metadata used by this audit.
 * Preserve additional native metadata so chart/style updates retain it.
 *
 * @param {unknown} value
 *
 * @returns {import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot}
 */
export function parseWorkbookSnapshot(value) {
    const snapshot = record(value);
    const metadata = record(snapshot["metadata"]);
    const sheets = array(metadata["sheets"]);
    for (const sheet of sheets) checkSheet(sheet);
    const cells = array(snapshot["cells"]);
    for (const cellValue of cells) {
        const cell = record(cellValue);
        checkFields(cell, { column: "number", row: "number", sheet: "string" });
        checkFields(
            record(cell["value"]),
            {},
            {
                boolValue: "boolean",
                formulaValue: "string",
                numberValue: "number",
                stringValue: "string",
            }
        );
    }
    return /** @type {import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot} */ (
        value
    );
}

/** @param {unknown} value @returns {unknown[]} */
function array(value) {
    if (!Array.isArray(value))
        throw new TypeError("Expected a workbook metadata array");
    /** @type {unknown[]} */
    return value.map((/** @type {unknown} */ entry) => entry);
}

/** @param {unknown} value */
function checkChart(value) {
    const chart = record(value);
    checkFields(chart, { chartId: "number" });
    if (chart["position"] !== undefined) {
        const position = record(chart["position"]);
        const overlay = record(position["overlayPosition"]);
        checkFields(record(overlay["anchorCell"]), {
            columnIndex: "number",
            rowIndex: "number",
        });
    }
    const spec = record(chart["spec"]);
    checkFields(
        spec,
        { title: "string" },
        { hiddenDimensionStrategy: "string", subtitle: "string" }
    );
    if (spec["titleTextFormat"] !== undefined)
        checkFields(record(spec["titleTextFormat"]), {}, { italic: "boolean" });
    const basic = record(spec["basicChart"]);
    checkFields(
        basic,
        {},
        { interpolateNulls: "boolean", lineSmoothing: "boolean" }
    );
    const axes = array(basic["axis"]);
    for (const axis of axes)
        checkFields(record(axis), { position: "string" }, { title: "string" });
    const domains = array(basic["domains"]);
    for (const domain of domains) checkChartData(record(domain)["domain"]);
    const chartSeries = array(basic["series"]);
    for (const series of chartSeries) checkChartSeries(series);
}

/** @param {unknown} value */
function checkChartData(value) {
    const chartData = record(value);
    const sourceRange = record(chartData["sourceRange"]);
    const sources = array(sourceRange["sources"]);
    for (const range of sources) checkGridRange(range);
}

/** @param {unknown} value */
function checkChartSeries(value) {
    const series = record(value);
    checkChartData(series["series"]);
    checkFields(series, {}, { targetAxis: "string" });
    if (series["dataLabel"] !== undefined)
        checkChartData(record(series["dataLabel"])["customLabelData"]);
    if (series["pointStyle"] !== undefined)
        checkFields(record(series["pointStyle"]), { size: "number" });
    if (series["colorStyle"] !== undefined) {
        const color = record(series["colorStyle"]);
        checkFields(record(color["rgbColor"]), {
            blue: "number",
            green: "number",
            red: "number",
        });
    }
}

/** @param {unknown} value */
function checkConditionalFormat(value) {
    const format = record(value);
    const ranges = array(format["ranges"]);
    for (const range of ranges) checkGridRange(range);
    if (format["gradientRule"] !== undefined) record(format["gradientRule"]);
    if (format["booleanRule"] !== undefined) {
        const rule = record(format["booleanRule"]);
        const condition = record(rule["condition"]);
        checkFields(condition, { type: "string" });
        const values = array(condition["values"]);
        for (const item of values)
            checkFields(record(item), { userEnteredValue: "string" });
    }
}

/**
 * @param {Record<string, unknown>} value
 * @param {Record<string, "boolean" | "number" | "string">} requiredFields
 * @param {Record<string, "boolean" | "number" | "string">} [optionalFields]
 */
function checkFields(value, requiredFields, optionalFields = {}) {
    for (const [key, type] of Object.entries(requiredFields))
        checkPrimitive(value[key], type, key);
    for (const [key, type] of Object.entries(optionalFields)) {
        if (value[key] !== undefined) checkPrimitive(value[key], type, key);
    }
}

/** @param {unknown} value */
function checkGridRange(value) {
    checkFields(
        record(value),
        {},
        {
            endColumnIndex: "number",
            endRowIndex: "number",
            sheetId: "number",
            startColumnIndex: "number",
            startRowIndex: "number",
        }
    );
}

/** @param {import("../../test/workbook-fixtures.d.ts").SheetMetadata} sheet */
function checkPlantChartInventory(sheet) {
    if (sheet.properties.gridProperties.columnCount !== 18)
        throw new Error(
            `Review existing helper columns before migration: ${sheet.properties.title}`
        );
    if (
        sheet.charts?.length !== 3 ||
        sheet.charts.every(
            (/** @type {{ spec: { title: string } }} */ chart) =>
                chart.spec.title !== "Plant dimensions • measurement history"
        ) ||
        sheet.charts.every(
            (/** @type {{ spec: { title: string } }} */ chart) =>
                chart.spec.title !== "Weight history • calendar time"
        )
    )
        throw new Error(
            `Unexpected chart inventory: ${sheet.properties.title}`
        );
}

/**
 * @param {unknown} value @param {"boolean" | "number" | "string"} type @param
 *   {string} key
 */
function checkPrimitive(value, type, key) {
    if (
        typeof value !== type ||
        (typeof value === "number" && !Number.isFinite(value))
    ) {
        throw new TypeError(`Invalid workbook field: ${key}`);
    }
}

/** @param {unknown} value */
function checkSheet(value) {
    const sheet = record(value);
    const properties = record(sheet["properties"]);
    checkFields(properties, { sheetId: "number", title: "string" });
    checkFields(record(properties["gridProperties"]), {
        columnCount: "number",
        rowCount: "number",
    });
    const charts = optionalArray(sheet["charts"]);
    for (const chart of charts) checkChart(chart);
    const conditionalFormats = optionalArray(sheet["conditionalFormats"]);
    for (const format of conditionalFormats) checkConditionalFormat(format);
    if (sheet["basicFilter"] !== undefined)
        checkGridRange(record(sheet["basicFilter"])["range"]);
    const bandedRanges = optionalArray(sheet["bandedRanges"]);
    for (const bandValue of bandedRanges) {
        const band = record(bandValue);
        checkFields(band, { bandedRangeId: "number" });
        checkGridRange(band["range"]);
    }
    const protectedRanges = optionalArray(sheet["protectedRanges"]);
    for (const protectionValue of protectedRanges) {
        const protection = record(protectionValue);
        checkFields(
            protection,
            { protectedRangeId: "number" },
            { warningOnly: "boolean" }
        );
        checkGridRange(protection["range"]);
    }
}

/**
 * @param {import("../../test/workbook-fixtures.d.ts").SheetMetadata} sheet
 * @param {number} count @returns
 *   {import("../../test/workbook-fixtures.d.ts").WorkbookRequest[]}
 */
function expandedDecorationRequests(sheet, count) {
    /** @type {import("../../test/workbook-fixtures.d.ts").WorkbookRequest[]} */
    const requests = [];
    if (sheet.basicFilter !== undefined)
        requests.push({
            setBasicFilter: {
                filter: {
                    ...sheet.basicFilter,
                    range: {
                        ...sheet.basicFilter.range,
                        endColumnIndex: count,
                    },
                },
            },
        });
    if (!["Baselines", "Dashboard"].includes(sheet.properties.title))
        return requests;
    if (sheet.bandedRanges !== undefined) {
        for (const band of sheet.bandedRanges)
            requests.push({
                updateBanding: {
                    bandedRange: {
                        bandedRangeId: band.bandedRangeId,
                        range: { ...band.range, endColumnIndex: count },
                    },
                    fields: "range",
                },
            });
    }
    if (sheet.protectedRanges !== undefined) {
        for (const protection of sheet.protectedRanges) {
            if (protection.warningOnly === true)
                requests.push({
                    updateProtectedRange: {
                        fields: "range",
                        protectedRange: {
                            protectedRangeId: protection.protectedRangeId,
                            range: {
                                ...protection.range,
                                endColumnIndex: count,
                            },
                        },
                    },
                });
        }
    }
    return requests;
}

/**
 * @param {import("../../test/workbook-fixtures.d.ts").ChartSpec["basicChart"]} basic
 * @param {number} endRowIndex
 */
function extendChartRows(basic, endRowIndex) {
    const domains = basic.domains.map((item) => item.domain);
    const series = basic.series.map((item) => item.series);
    const parts = [...domains, ...series];
    for (const part of parts) {
        for (const source of part.sourceRange.sources)
            source.endRowIndex = endRowIndex;
    }
}

/**
 * @param {import("../../test/workbook-fixtures.d.ts").Chart[] | undefined} charts
 * @param {number} helperId
 * @param {number} baselineId
 *
 * @returns {import("../../test/workbook-fixtures.d.ts").WorkbookRequest[]}
 */
function insightChartRequests(charts, helperId, baselineId) {
    if (charts === undefined) return [];
    /** @type {import("../../test/workbook-fixtures.d.ts").WorkbookRequest[]} */
    const requests = [];
    for (const chart of charts) {
        const spec = insightChartSpec(chart.spec, helperId, baselineId);
        if (spec !== undefined)
            requests.push({
                updateChartSpec: { chartId: chart.chartId, spec },
            });
    }
    return requests;
}

/**
 * @param {import("../../test/workbook-fixtures.d.ts").ChartSpec} original
 * @param {number} helperId @param {number} baselineId
 */
function insightChartSpec(original, helperId, baselineId) {
    const spec = structuredClone(original);
    const basic = spec.basicChart;
    if (spec.title.startsWith("Plant dimensions")) {
        required(basic.domains[0]).domain = data(helperId, 27, 0, 31);
        for (const [index, series] of basic.series.entries())
            series.series = data(helperId, 28 + index, 0, 31);
        return spec;
    }
    if (spec.title.startsWith("Plant shape map")) {
        required(basic.domains[0]).domain = data(helperId, 29, 0, 31);
        const series = required(basic.series[0]);
        series.series = data(helperId, 28, 0, 31);
        required(series.dataLabel).customLabelData = data(helperId, 26, 0, 31);
        return spec;
    }
    switch (spec.title) {
        case "Care activity timeline": {
            extendChartRows(basic, 5000);
            return spec;
        }
        case "Data-quality follow-ups by plant": {
            extendChartRows(basic, 31);
            return spec;
        }
        case "Recent drying rate by plant": {
            required(basic.series[0]).series = data(baselineId, 30, 0, 31);
            required(
                basic.axis.find((axis) => axis.position === "BOTTOM_AXIS")
            ).title = "Recent loss (g/day)";
            spec.subtitle =
                "Recent same-cycle loss • not a constant rate or a watering deadline";
            return spec;
        }
        default: {
            return undefined;
        }
    }
}

/** @param {unknown} value @returns {unknown[]} */
function optionalArray(value) {
    return value === undefined ? [] : array(value);
}

/**
 * @param {import("../../test/workbook-fixtures.d.ts").ChartSpec} original
 * @param {number} sheetId
 */
function plantChartSpec(original, sheetId) {
    const spec = structuredClone(original);
    const basic = spec.basicChart;
    const isDimensions =
        spec.title === "Plant dimensions • measurement history";
    if (!isDimensions && spec.title !== "Weight history • calendar time") {
        extendChartRows(basic, 1000);
        return spec;
    }
    basic.domains = [{ domain: data(sheetId, 18, 11, 1000) }];
    basic.series = (isDimensions ? [20, 21] : [19]).map((column, index) => ({
        colorStyle: {
            rgbColor:
                index === 0
                    ? { blue: 0.33, green: 0.49, red: 0.18 }
                    : { blue: 0.24, green: 0.65, red: 0.84 },
        },
        pointStyle: { size: 5 },
        series: data(sheetId, column, 11, 1000),
        targetAxis: "LEFT_AXIS",
    }));
    basic.axis = [
        ...basic.axis.filter((axis) => axis.position !== "LEFT_AXIS"),
        {
            position: "LEFT_AXIS",
            title: isDimensions ? "Size (cm)" : "Weight (g)",
        },
    ];
    basic.interpolateNulls = true;
    basic.lineSmoothing = false;
    spec.hiddenDimensionStrategy = "SHOW_ALL";
    if (isDimensions)
        spec.subtitle =
            "Measured dimensions only • estimates remain in the history ledger • two readings needed for a trend";
    return spec;
}

/**
 * @param {Map<
 *     string,
 *     import("../../test/workbook-fixtures.d.ts").SheetMetadata
 * >} sheets
 * @param {(
 *     name: string,
 *     row: number,
 *     column: number
 * ) => import("../../test/workbook-fixtures.d.ts").EnteredValue | undefined} cell
 */
function preflightWorkbook(sheets, cell) {
    const requiredSheets = [
        "Dashboard",
        "Baselines",
        plantTrackerSheet,
        "Insights",
        insightsDataSheet,
        "Integrity",
        "History",
        appPlantChartsSheet,
    ];
    for (const name of requiredSheets)
        if (!sheets.has(name)) throw new Error(`Missing sheet: ${name}`);
    if (
        cell("Baselines", 0, 0)?.stringValue !== "Plant ID" ||
        cell("Dashboard", 5, 1)?.stringValue !== "Plant ID"
    )
        throw new Error("Unexpected workbook headers");
    const plants = sheets
        .values()
        .filter((sheet) => /^P\d{2} /v.test(sheet.properties.title))
        .toArray();
    const ids = plants
        .map((sheet) => sheet.properties.title.slice(0, 3))
        .toSorted((left, right) => left.localeCompare(right));
    if (
        ids.length !== 30 ||
        ids.some((id, i) => id !== `P${String(i + 1).padStart(2, "0")}`)
    )
        throw new Error("Expected the reviewed P01–P30 inventory");
    for (const [index, id] of ids.entries())
        if (cell("Baselines", index + 1, 0)?.stringValue !== id)
            throw new Error("Baselines order changed; reread and review");
    for (const sheet of plants) checkPlantChartInventory(sheet);
    if (
        required(sheets.get(insightsDataSheet)).properties.gridProperties
            .columnCount !== 25
    )
        throw new Error("Review existing Insights helper columns");
    return { ids, plants };
}

/** @param {string | undefined} filename */
async function readSnapshot(filename) {
    if (filename === undefined || filename === "")
        throw new Error("Missing workbook snapshot path");
    const text = await fs.readFile(filename, "utf8");
    const value = /** @type {unknown} */ (JSON.parse(text));
    return parseWorkbookSnapshot(value);
}

/** @param {unknown} value @returns {Record<string, unknown>} */
function record(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new TypeError("Expected a workbook metadata object");
    }
    return /** @type {Record<string, unknown>} */ (value);
}

/**
 * @param {import("../../test/workbook-fixtures.d.ts").ConditionalFormat} original
 * @param {string} name
 */
function repairedConditionalRule(original, name) {
    const rule = structuredClone(original);
    const condition = rule.booleanRule?.condition;
    const conditionValue = condition?.values[0];
    const value = conditionValue?.userEnteredValue;
    if (name === "Dashboard") {
        for (const range of rule.ranges) {
            range.endRowIndex = 36;
            const firstColumn = range.startColumnIndex ?? 0;
            if (firstColumn >= 11 && firstColumn <= 14) {
                range.startColumnIndex = firstColumn + 4;
                range.endColumnIndex = (range.endColumnIndex ?? 0) + 4;
            }
        }
        if (value?.startsWith("=OR($N7=") === true)
            required(conditionValue).userEnteredValue = `=${noAlert("$R7")}`;
    }
    switch (value ?? "") {
        case "Partial calibration": {
            required(condition).type = "TEXT_CONTAINS";
            required(conditionValue).userEnteredValue = "Need";

            break;
        }
        case "Ready": {
            required(conditionValue).userEnteredValue =
                "Current cycle supported";

            break;
        }
        case "Uncalibrated": {
            required(condition).type = "TEXT_CONTAINS";
            required(conditionValue).userEnteredValue = "Collecting";

            break;
        }
        default: {
            break;
        }
    }
    if (name === "Baselines" && value?.startsWith("=OR($J2=") === true)
        required(conditionValue).userEnteredValue = `=${noAlert("$J2")}`;
    if (name === plantTrackerSheet) repairTrackerRule(rule, value);
    return rule;
}

/**
 * @param {import("../../test/workbook-fixtures.d.ts").ConditionalFormat} rule
 * @param {string | undefined} value
 */
function repairTrackerRule(rule, value) {
    const condition = rule.booleanRule?.condition;
    const conditionValue = condition?.values[0];
    if (rule.gradientRule !== undefined)
        rule.ranges = rule.ranges.filter((item) => item.startColumnIndex === 4);
    if (
        [
            "≈",
            "Collecting",
            "Likely dry now",
        ].includes(value ?? "")
    ) {
        rule.ranges = rule.ranges.filter((item) => item.startColumnIndex === 5);
        required(condition).type = "TEXT_CONTAINS";
        required(conditionValue).userEnteredValue =
            value === "Collecting"
                ? "Need"
                : value === "≈"
                  ? "Reweigh"
                  : "Overdue";
        return;
    }
    if (value === '=AND($S2<>"",$S2<>"OK")') {
        required(conditionValue).userEnteredValue = `=${noAlert("$S2")}`;
    }
}

/**
 * Preserve the owner-entered pot/acquisition evidence in Insights data S.
 *
 * @param {import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot["cells"]} cells
 * @param {(
 *     name: string,
 *     row: number,
 *     column: number,
 *     values: string[][]
 * ) => void} write
 */
function rewriteInsightHeaders(cells, write) {
    for (const item of cells) {
        if (
            item.sheet !== insightsDataSheet ||
            ![
                0,
                7,
                13,
            ].includes(item.column) ||
            item.row !== 0
        )
            continue;
        write(item.sheet, item.row, item.column, [
            [
                required(item.value.formulaValue)
                    .replaceAll("1000", "5000")
                    .replace("H2:H29", "H2:H31"),
            ],
        ]);
    }
}

/**
 * @param {number} row
 * @param {(
 *     name: string,
 *     row: number,
 *     column: number
 * ) => import("../../test/workbook-fixtures.d.ts").EnteredValue | undefined} cell
 * @param {(
 *     name: string,
 *     row: number,
 *     column: number,
 *     values: string[][]
 * ) => void} write
 */
function writeMissingPotHelpers(row, cell, write) {
    for (const column of [
        15,
        16,
        17,
        19,
    ]) {
        if (cell(insightsDataSheet, row - 1, column))
            throw new Error("New plant helper destination is not blank");
        const source = cell(insightsDataSheet, 28, column)?.formulaValue;
        if (source === undefined || source === "")
            throw new Error("Missing pot helper formula template");
        write(insightsDataSheet, row - 1, column, [
            [source.replaceAll(/(?<=[A-Z])29\b/gv, () => String(row))],
        ]);
    }
}

if (
    process.argv[1] !== undefined &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    if (process.argv.length !== 3)
        throw new Error(
            "Usage: node scripts/google-sheets/workbook-audit.mjs <fresh-snapshot.json>"
        );
    const snapshot = await readSnapshot(process.argv[2]);
    const requests = buildWorkbookAuditRequests(snapshot);
    process.stdout.write(JSON.stringify(requests));
}

/** @template T @param {T | null | undefined} value @returns {T} */
function required(value) {
    if (value === null || value === undefined)
        throw new Error("Missing workbook metadata value");
    return value;
}
