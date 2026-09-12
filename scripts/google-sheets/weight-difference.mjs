import { plantColor } from "./plant-chart-colors.mjs";
import palette from "./plant-colors.json" with { type: "json" };

const label = "Current weight difference (g)";
const chartTitle = "Current weight difference · latest minus dry reference";
const chartId = 907_202_604;
const signedGrams = "+0.0;-0.0;0.0";
const note =
    "Latest measured whole-pot weight minus the completed-cycle dry reference for the current pot setup. Positive = above the reference; negative = below it. Blank means a reading or dry reference is unavailable. This is not a soil-moisture measurement or an automatic watering instruction.";

/**
 * One-time native presentation migration. The supplied snapshot must include
 * Dashboard A1:X40, all plant headers A1:J10, Daily care A40:H40, Dry-down
 * insights W1:X31, and Integrity B12. Build and rehearse before use. Never
 * changes canonical observations, staging schemas, or existing charts.
 *
 * @param {import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot} snapshot
 *
 * @returns {Record<string, unknown>[]}
 */
export function buildWeightDifferenceRequests({ cells, metadata }) {
    const { cell, errorScan, find, pages } = validateSnapshot({
        cells,
        metadata,
    });
    const dashboard = find("Dashboard");
    const insights = find("Insights");
    const helper = find("Dry-down insights");
    const daily = find("Daily care");
    const integrity = find("Integrity");

    /** @type {Record<string, unknown>[]} */
    const requests = [];
    const dashboardId = dashboard.properties.sheetId;
    if (dashboard.properties.gridProperties.columnCount < 25)
        requests.push({
            appendDimension: {
                dimension: "COLUMNS",
                length: 25 - dashboard.properties.gridProperties.columnCount,
                sheetId: dashboardId,
            },
        });
    requests.push(
        {
            insertRange: {
                range: range(dashboardId, 5, 8, 31, 1),
                shiftDimension: "COLUMNS",
            },
        },
        write(dashboardId, 5, 8, [
            [label],
            ...palette.map((_, index) => [
                difference(`G${index + 7}`, `H${index + 7}`),
            ]),
        ]),
        format(
            dashboardId,
            5,
            8,
            1,
            1,
            {
                backgroundColor: rgb("#174a68"),
                textFormat: { bold: true, foregroundColor: rgb("#ffffff") },
                verticalAlignment: "MIDDLE",
                wrapStrategy: "WRAP",
            },
            note
        ),
        format(dashboardId, 6, 8, 30, 1, {
            backgroundColor: rgb("#edf5fb"),
            horizontalAlignment: "CENTER",
            numberFormat: { pattern: signedGrams, type: "NUMBER" },
            textFormat: { bold: true, foregroundColor: rgb("#174a68") },
            verticalAlignment: "MIDDLE",
        }),
        size(dashboardId, "COLUMNS", 8, 9, 165),
        // Inserting only table cells keeps the KPI cards in place. Restore the
        // explicit error-scan exclusions in case Sheets expands a containing range.
        write(integrity.properties.sheetId, 11, 1, [[errorScan]])
    );
    if (dashboard.basicFilter) {
        requests.push({
            setBasicFilter: {
                filter: {
                    ...dashboard.basicFilter,
                    range: {
                        ...dashboard.basicFilter.range,
                        endColumnIndex: 25,
                    },
                },
            },
        });
    }
    if (dashboard.protectedRanges !== undefined) {
        for (const protection of dashboard.protectedRanges) {
            if (
                protection.range.startColumnIndex === 0 &&
                protection.range.endColumnIndex === 23
            )
                requests.push({
                    updateProtectedRange: {
                        fields: "range",
                        protectedRange: {
                            protectedRangeId: protection.protectedRangeId,
                            range: { ...protection.range, endColumnIndex: 25 },
                        },
                    },
                });
        }
    }
    requests.push(
        write(daily.properties.sheetId, 39, 5, [[label]]),
        format(
            daily.properties.sheetId,
            39,
            5,
            1,
            1,
            { backgroundColor: rgb("#174a68") },
            note
        ),
        format(daily.properties.sheetId, 40, 5, 30, 1, {
            backgroundColor: rgb("#edf5fb"),
            numberFormat: { pattern: signedGrams, type: "NUMBER" },
            textFormat: { bold: true, foregroundColor: rgb("#174a68") },
        })
    );

    for (const page of pages) {
        const id = page.properties.sheetId;
        const title = page.properties.title;
        requests.push(
            write(id, 7, 0, [
                [label, difference("B6", "B7")],
                ["Last weighed", cell(title, 7, 1)?.formulaValue ?? ""],
                ["Pot / setup", cell(title, 8, 1)?.formulaValue ?? ""],
            ]),
            {
                mergeCells: {
                    mergeType: "MERGE_ALL",
                    range: range(id, 9, 1, 1, 2),
                },
            },
            format(id, 0, 0, 10, 10, {
                verticalAlignment: "MIDDLE",
                wrapStrategy: "WRAP",
            }),
            format(id, 0, 0, 1, 10, {
                backgroundColor: rgb("#173c2b"),
                textFormat: {
                    bold: true,
                    fontSize: 18,
                    foregroundColor: rgb("#ffffff"),
                },
            }),
            format(id, 1, 0, 1, 10, {
                backgroundColor: rgb("#e8f1ea"),
                textFormat: {
                    fontSize: 12,
                    foregroundColor: rgb("#24533f"),
                    italic: true,
                },
            }),
            format(id, 2, 0, 1, 10, {
                backgroundColor: rgb("#f6f7f3"),
                textFormat: { bold: true, foregroundColor: rgb("#24533f") },
            })
        );
        for (const section of [
            {
                column: 0,
                dark: "#174a68",
                label: "#dcecf7",
                light: "#edf5fb",
                title: "⚖ Current Weight",
                width: 3,
            },
            {
                column: 3,
                dark: "#725316",
                label: "#f6eacb",
                light: "#fff9eb",
                title: "💧 Care Forecast",
                width: 3,
            },
            {
                column: 6,
                dark: "#574372",
                label: "#e9def4",
                light: "#f5f0fa",
                title: "🔎 Data Quality",
                width: 4,
            },
        ]) {
            requests.push(
                write(id, 3, section.column, [[section.title]]),
                format(id, 3, section.column, 1, section.width, {
                    backgroundColor: rgb(section.dark),
                    textFormat: {
                        bold: true,
                        fontSize: 12,
                        foregroundColor: rgb("#ffffff"),
                    },
                }),
                format(id, 4, section.column, 6, section.width, {
                    backgroundColor: rgb(section.light),
                    textFormat: {
                        fontSize: 11,
                        foregroundColor: rgb(section.dark),
                    },
                }),
                format(id, 4, section.column, 6, 1, {
                    backgroundColor: rgb(section.label),
                    textFormat: { bold: true, fontSize: 10 },
                })
            );
        }
        requests.push(
            format(id, 4, 1, 4, 2, {
                textFormat: { bold: true, fontSize: 13 },
            }),
            format(
                id,
                7,
                0,
                1,
                3,
                {
                    backgroundColor: rgb("#d4e9f7"),
                    textFormat: { foregroundColor: rgb("#174a68") },
                },
                note
            ),
            format(id, 7, 1, 1, 2, {
                numberFormat: { pattern: signedGrams, type: "NUMBER" },
            }),
            format(id, 8, 1, 1, 2, {
                numberFormat: {
                    pattern: "mmm d, yyyy h:mm am/pm",
                    type: "DATE_TIME",
                },
            }),
            format(id, 9, 1, 1, 2, {
                numberFormat: { pattern: "@", type: "TEXT" },
            }),
            size(id, "ROWS", 0, 1, 44),
            size(id, "ROWS", 1, 2, 30),
            size(id, "ROWS", 2, 4, 32),
            size(id, "ROWS", 4, 10, 44),
            {
                autoResizeDimensions: {
                    dimensions: {
                        dimension: "ROWS",
                        endIndex: 10,
                        sheetId: id,
                        startIndex: 4,
                    },
                },
            }
        );
    }

    const helperId = helper.properties.sheetId;
    const values = "Dashboard!$I$7:$I$36";
    const ids = "Dashboard!$B$7:$B$36";
    const lookup = (/** @type {string} */ key) =>
        `=IFNA(INDEX(FILTER(${values},${ids}=${key},ISNUMBER(${values})),1),"")`;
    requests.push(
        write(helperId, 0, 22, [
            [label, "Plant"],
            ...palette.map((plant) => [
                lookup(`"${plant.id}"`),
                `="${plant.id} · "&XLOOKUP("${plant.id}",'Plant tracker'!$A$2:$A$31,'Plant tracker'!$B$2:$B$31,"")`,
            ]),
        ]),
        format(helperId, 1, 22, 30, 1, {
            numberFormat: { pattern: signedGrams, type: "NUMBER" },
        })
    );
    const insightsId = insights.properties.sheetId;
    requests.push({
        unmergeCells: { range: range(insightsId, 227, 2, 1, 16) },
    });
    for (const [column, width] of /** @type {const} */ ([
        [2, 8],
        [10, 3],
        [13, 5],
    ]))
        requests.push({
            mergeCells: {
                mergeType: "MERGE_ALL",
                range: range(insightsId, 227, column, 1, width),
            },
        });
    requests.push(
        write(insightsId, 227, 10, [[label]]),
        write(insightsId, 227, 13, [[lookup("$B$228")]]),
        format(
            insightsId,
            227,
            10,
            1,
            3,
            {
                backgroundColor: rgb("#dcecf7"),
                textFormat: { bold: true, foregroundColor: rgb("#174a68") },
                verticalAlignment: "MIDDLE",
                wrapStrategy: "WRAP",
            },
            note
        ),
        format(insightsId, 227, 13, 1, 5, {
            backgroundColor: rgb("#edf5fb"),
            numberFormat: { pattern: signedGrams, type: "NUMBER" },
            textFormat: {
                bold: true,
                fontSize: 14,
                foregroundColor: rgb("#174a68"),
            },
            verticalAlignment: "MIDDLE",
        }),
        size(insightsId, "ROWS", 227, 228, 44),
        {
            appendDimension: {
                dimension: "ROWS",
                length: 49,
                sheetId: insightsId,
            },
        },
        {
            addChart: {
                chart: {
                    chartId,
                    position: {
                        overlayPosition: {
                            anchorCell: {
                                columnIndex: 0,
                                rowIndex: 585,
                                sheetId: insightsId,
                            },
                            heightPixels: 1000,
                            offsetXPixels: 10,
                            offsetYPixels: 5,
                            widthPixels: 1155,
                        },
                    },
                    spec: {
                        altText: note,
                        backgroundColorStyle: { rgbColor: rgb("#ffffff") },
                        basicChart: {
                            axis: [
                                {
                                    format: { fontSize: 11 },
                                    position: "BOTTOM_AXIS",
                                    title: "Latest weight − dry reference (g)",
                                },
                                {
                                    format: { fontSize: 11 },
                                    position: "LEFT_AXIS",
                                    title: "Plant",
                                },
                            ],
                            chartType: "BAR",
                            domains: [
                                {
                                    domain: {
                                        sourceRange: {
                                            sources: [
                                                range(helperId, 0, 23, 31, 1),
                                            ],
                                        },
                                    },
                                },
                            ],
                            headerCount: 1,
                            legendPosition: "NO_LEGEND",
                            series: [
                                {
                                    dataLabel: {
                                        textFormat: { fontSize: 9 },
                                        type: "DATA",
                                    },
                                    series: {
                                        sourceRange: {
                                            sources: [
                                                range(helperId, 0, 22, 31, 1),
                                            ],
                                        },
                                    },
                                    styleOverrides: palette.map(
                                        (plant, index) => ({
                                            colorStyle: {
                                                rgbColor: plantColor(plant.id),
                                            },
                                            index,
                                        })
                                    ),
                                    targetAxis: "BOTTOM_AXIS",
                                },
                            ],
                        },
                        fontName: "Roboto",
                        hiddenDimensionStrategy: "SHOW_ALL",
                        subtitle:
                            "Positive = above dry reference · negative = below · missing references stay blank · color identifies the plant",
                        subtitleTextFormat: { fontSize: 11 },
                        title: chartTitle,
                        titleTextFormat: {
                            fontSize: 18,
                            foregroundColor: rgb("#2e7d32"),
                        },
                    },
                },
            },
        }
    );
    return requests;
}

/** @param {string} latest @param {string} dry @returns {string} */
function difference(latest, dry) {
    return `=IF(AND(ISNUMBER(${latest}),${latest}>0,ISNUMBER(${dry}),${dry}>0),${latest}-${dry},"")`;
}

/**
 * @param {number} sheetId @param {number} row @param {number} column @param
 *   {number} rows @param {number} columns @param {Record<string, unknown>}
 *   properties @param {string} [cellNote]
 */
function format(sheetId, row, column, rows, columns, properties, cellNote) {
    const fields = Object.entries(properties).flatMap(([key, value]) =>
        key === "textFormat"
            ? Object.keys(/** @type {object} */ (value)).map(
                  (name) => `userEnteredFormat.textFormat.${name}`
              )
            : [`userEnteredFormat.${key}`]
    );
    if (cellNote !== undefined) fields.push("note");
    return {
        repeatCell: {
            cell: {
                userEnteredFormat: properties,
                ...(cellNote !== undefined && { note: cellNote }),
            },
            fields: fields.join(","),
            range: range(sheetId, row, column, rows, columns),
        },
    };
}

/**
 * @param {number} sheetId @param {number} row @param {number} column @param
 *   {number} rows @param {number} columns
 */
function range(sheetId, row, column, rows, columns) {
    return {
        endColumnIndex: column + columns,
        endRowIndex: row + rows,
        sheetId,
        startColumnIndex: column,
        startRowIndex: row,
    };
}

/** @param {string} hex */
function rgb(hex) {
    return {
        blue: Number.parseInt(hex.slice(5, 7), 16) / 255,
        green: Number.parseInt(hex.slice(3, 5), 16) / 255,
        red: Number.parseInt(hex.slice(1, 3), 16) / 255,
    };
}

/**
 * @param {number} sheetId @param {string} dimension @param {number} startIndex
 * @param {number} endIndex @param {number} pixelSize
 */
function size(sheetId, dimension, startIndex, endIndex, pixelSize) {
    return {
        updateDimensionProperties: {
            fields: "pixelSize",
            properties: { pixelSize },
            range: { dimension, endIndex, sheetId, startIndex },
        },
    };
}

/** @param {import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot} snapshot */
function validateSnapshot({ cells, metadata }) {
    const cellMap = new Map(
        cells.map((cell) => [
            `${cell.sheet}:${cell.row}:${cell.column}`,
            cell.value,
        ])
    );
    const cell = (
        /** @type {string} */ sheet,
        /** @type {number} */ row,
        /** @type {number} */ column
    ) => cellMap.get(`${sheet}:${row}:${column}`);
    const find = (/** @type {string} */ title) => {
        const sheet = metadata.sheets.find(
            (item) => item.properties.title === title
        );
        if (!sheet) throw new Error(`Missing sheet: ${title}`);
        return sheet;
    };
    if (
        cell("Dashboard", 5, 8)?.stringValue !== "Predicted dry date" ||
        cell("Dashboard", 5, 7)?.stringValue !== "Dry weight (g)" ||
        cell("Dashboard", 5, 23)?.stringValue !== "Weight measurements"
    ) {
        throw new Error(
            "Dashboard layout changed or weight difference is already installed"
        );
    }
    if (
        metadata.sheets.some(
            (sheet) =>
                sheet.charts?.some(
                    (chart) =>
                        chart.chartId === chartId ||
                        chart.spec.title === chartTitle
                ) === true
        )
    ) {
        throw new Error("Weight difference chart already exists");
    }
    const insights = find("Insights");
    if (
        insights.properties.gridProperties.rowCount !== 585 ||
        insights.charts?.length !== 19
    ) {
        throw new Error(
            "Insights chart layout changed; review append position"
        );
    }
    if (
        cell("Daily care", 39, 5)?.stringValue !==
        "Difference vs last completed dry (g)"
    ) {
        throw new Error("Daily care weight header changed");
    }
    if (
        cells.some(
            (entry) =>
                entry.sheet === "Dry-down insights" &&
                entry.row >= 0 &&
                entry.row < 31 &&
                (entry.column === 22 || entry.column === 23) &&
                Object.keys(entry.value).length > 0
        )
    )
        throw new Error("Dry-down insights W:X is occupied");
    const pages = palette.map((plant, index) => {
        if (cell("Dashboard", index + 6, 1)?.stringValue !== plant.id)
            throw new Error("Dashboard plant order changed");
        const matches = metadata.sheets.filter(
            (sheet) =>
                sheet.properties.title.startsWith(`${plant.id} `) ||
                sheet.properties.title === plant.id
        );
        const page = matches[0];
        if (page === undefined || matches.length !== 1)
            throw new Error(`Missing or duplicate plant page: ${plant.id}`);
        const title = page.properties.title;
        if (
            cell(title, 7, 0)?.stringValue !== "Last weighed" ||
            cell(title, 8, 0)?.stringValue !== "Pot / setup" ||
            (cell(title, 7, 1)?.formulaValue ?? "") === "" ||
            (cell(title, 8, 1)?.formulaValue ?? "") === "" ||
            Object.keys(cell(title, 9, 0) ?? {}).length > 0 ||
            Object.keys(cell(title, 9, 1) ?? {}).length > 0
        ) {
            throw new Error(`Plant header changed: ${title}`);
        }
        return page;
    });
    const errorScan = cell("Integrity", 11, 1)?.formulaValue;
    if (
        errorScan?.includes("Dashboard!A1:T") !== true ||
        !errorScan.includes("Dashboard!U4:X") ||
        !errorScan.includes("Dashboard!Y1:Z")
    ) {
        throw new Error(
            "Unexpected Integrity scan; preserve the KPI exclusions"
        );
    }

    return { cell, errorScan, find, pages };
}

/**
 * @param {number} sheetId @param {number} row @param {number} column @param
 *   {string[][]} values
 */
function write(sheetId, row, column, values) {
    return {
        updateCells: {
            fields: "userEnteredValue",
            rows: values.map((entries) => ({
                values: entries.map((value) => ({
                    userEnteredValue: value.startsWith("=")
                        ? { formulaValue: value }
                        : { stringValue: value },
                })),
            })),
            start: { columnIndex: column, rowIndex: row, sheetId },
        },
    };
}
