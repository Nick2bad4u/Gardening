import { createHash } from "node:crypto";

import palette from "./plant-colors.json" with { type: "json" };

export const environmentSheetId = 907_202_611;
export const environmentDataSheetId = 907_202_612;
const font = "JetBrains Mono";
const title = "Light & humidity";
const helper = "Environment data";
const humidityLabel = "Relative humidity (%)";
const headers = [
    "Observed at",
    "Plant ID",
    "Event",
    "Estimated PPFD (µmol/m²/s)",
    "Illuminance (lux)",
    humidityLabel,
    "Recorded quality",
    "Recorded method",
    "Original notes / location",
    "Observation ID",
];

/**
 * @typedef {{
 *     value?: import("../../test/workbook-fixtures.d.ts").EnteredValue;
 *     effectiveValue?: import("../../test/workbook-fixtures.d.ts").EnteredValue;
 *     row: number;
 *     column: number;
 *     sheet: string;
 * }} EnvironmentCell
 *
 * @typedef {{
 *     metadata: import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot["metadata"];
 *     cells: EnvironmentCell[];
 *     dashboardReadBounds: { rowCount: number; columnCount: number };
 * }} EnvironmentSnapshot
 */

/**
 * @param {{ preconditionDigest: string }} plan @param {EnvironmentSnapshot}
 *   fresh
 */
export function assertWorkbookEnvironmentPreconditions(plan, fresh) {
    if (environmentSnapshotDigest(fresh) !== plan.preconditionDigest)
        throw new Error(
            "Workbook drift since planning; rebuild from the fresh snapshot"
        );
}

/** @param {EnvironmentSnapshot} snapshot */
export function buildWorkbookEnvironmentRequests(snapshot) {
    const { dashboardRequests, endChartRow, firstChartRow, orderedCharts } =
        dashboardLayoutRequests(snapshot);
    const { metadata } = snapshot;
    const summaryHeader = 6;
    const summaryEnd = summaryHeader + 1 + palette.length;
    const comparisonStart = summaryEnd + 3;
    const selectorRow = comparisonStart + 69;
    const seriesStart = selectorRow + 4;
    const evidenceHeader = seriesStart + 69;
    const finalRow = evidenceHeader + 5000;
    /** @type {Record<string, unknown>[]} */
    const prepareRequests = [...dashboardRequests];
    for (const [
        name,
        id,
        rows,
        columns,
        hidden,
    ] of /** @type {[string, number, number, number, boolean][]} */ ([
        [
            title,
            environmentSheetId,
            finalRow,
            10,
            false,
        ],
        [
            helper,
            environmentDataSheetId,
            5000,
            18,
            true,
        ],
    ])) {
        prepareRequests.push(
            {
                addSheet: {
                    properties: {
                        gridProperties: {
                            columnCount: columns,
                            frozenRowCount: name === title ? 7 : 1,
                            hideGridlines: true,
                            rowCount: rows,
                        },
                        hidden,
                        sheetId: id,
                        title: name,
                    },
                },
            },
            {
                addProtectedRange: {
                    protectedRange: {
                        description:
                            "Derived environmental evidence; record observations in the logger.",
                        range: { sheetId: id },
                        warningOnly: true,
                    },
                },
            },
            {
                repeatCell: {
                    cell: {
                        userEnteredFormat: {
                            textFormat: { fontFamily: font, fontSize: 10 },
                            verticalAlignment: "TOP",
                            wrapStrategy: "WRAP",
                        },
                    },
                    fields: "userEnteredFormat",
                    range: { sheetId: id },
                },
            }
        );
    }
    prepareRequests.push(
        {
            updateDimensionProperties: {
                fields: "pixelSize",
                properties: { pixelSize: 145 },
                range: {
                    dimension: "COLUMNS",
                    endIndex: 10,
                    sheetId: environmentSheetId,
                    startIndex: 0,
                },
            },
        },
        {
            updateDimensionProperties: {
                fields: "pixelSize",
                properties: { pixelSize: 24 },
                range: {
                    dimension: "ROWS",
                    endIndex: evidenceHeader,
                    sheetId: environmentSheetId,
                    startIndex: 0,
                },
            },
        },
        {
            updateDimensionProperties: {
                fields: "pixelSize",
                properties: { pixelSize: 420 },
                range: {
                    dimension: "COLUMNS",
                    endIndex: 9,
                    sheetId: environmentSheetId,
                    startIndex: 8,
                },
            },
        },
        {
            setDataValidation: {
                range: {
                    endColumnIndex: 2,
                    endRowIndex: selectorRow + 1,
                    sheetId: environmentSheetId,
                    startColumnIndex: 1,
                    startRowIndex: selectorRow,
                },
                rule: {
                    condition: {
                        type: "ONE_OF_LIST",
                        values: palette.map(({ id }) => ({
                            userEnteredValue: id,
                        })),
                    },
                    showCustomUi: true,
                    strict: true,
                },
            },
        }
    );
    for (const [
        startIndex,
        endIndex,
        pixelSize,
    ] of [
        [
            summaryHeader,
            summaryHeader + 1,
            54,
        ],
        [
            summaryHeader + 1,
            summaryEnd,
            48,
        ],
        [
            evidenceHeader,
            evidenceHeader + 1,
            54,
        ],
    ])
        prepareRequests.push({
            updateDimensionProperties: {
                fields: "pixelSize",
                properties: { pixelSize },
                range: {
                    dimension: "ROWS",
                    endIndex,
                    sheetId: environmentSheetId,
                    startIndex,
                },
            },
        });
    const formulaRequests = [
        update(environmentDataSheetId, 0, 0, [
            ["=GARDEN_ENVIRONMENT_READINGS(History!A2:AS5000)"],
        ]),
        update(environmentSheetId, 0, 0, [
            ["Light & humidity · recorded environmental evidence"],
        ]),
        update(environmentSheetId, 1, 0, [
            [
                "Readings at canopy top. Record exact location, device/app preset, light setting and time in Notes; historical location is only known when recorded.",
            ],
        ]),
        update(environmentSheetId, 2, 0, [
            [
                "PPFD is an estimate; lux is measured illuminance. RH is independent. Blank means no reading; zero is a reading. No conversions, DLI or care targets.",
            ],
        ]),
        update(environmentSheetId, 3, 0, [
            ["Calculated as of", "='Workbook calculations'!$E$2"],
        ]),
        update(environmentSheetId, 4, 0, [
            [
                "Cached calculations may lag. Absolute observation dates below identify the actual evidence.",
            ],
        ]),
        update(environmentSheetId, summaryHeader, 0, [
            [
                "Plant ID",
                "Plant / planter",
                "Estimated PPFD (µmol/m²/s)",
                "PPFD observed at",
                "Illuminance (lux)",
                "Lux observed at",
                humidityLabel,
                "RH observed at",
            ],
        ]),
        update(environmentSheetId, selectorRow, 0, [
            ["Selected plant", palette[0]?.id ?? ""],
        ]),
        update(environmentSheetId, selectorRow + 1, 0, [
            [
                `=IF(COUNTIF('${helper}'!B2:B5000,B${selectorRow + 1})=0,"No light or humidity readings recorded for this plant.","Selected plant: original evidence below the charts; each metric keeps its own observation time.")`,
            ],
        ]),
        update(environmentSheetId, evidenceHeader, 0, [headers]),
        update(environmentSheetId, evidenceHeader + 1, 0, [
            [
                `=IFNA(FILTER('${helper}'!A2:J5000,'${helper}'!B2:B5000=$B$${selectorRow + 1}),"")`,
            ],
        ]),
    ];
    for (const [index, { id }] of palette.entries()) {
        const row = summaryHeader + 1 + index;
        formulaRequests.push(
            update(environmentSheetId, row, 0, [
                [
                    id,
                    `=XLOOKUP(A${row + 1},'Plant tracker'!A2:A${palette.length + 1},'Plant tracker'!B2:B${palette.length + 1},"")`,
                    ...[
                        "D",
                        "E",
                        "F",
                    ].flatMap((column) => [
                        latestFormula(id, column, column),
                        latestFormula(id, column, "A"),
                    ]),
                ],
            ])
        );
    }
    for (const [
        index,
        [
            column,
            summaryColumn,
            selectedColumn,
            label,
        ],
    ] of /** @type {[string, string, string, string][]} */ ([
        [
            "D",
            "C",
            "N",
            "PPFD",
        ],
        [
            "E",
            "E",
            "P",
            "lux",
        ],
        [
            "F",
            "G",
            "R",
            "humidity",
        ],
    ]).entries()) {
        formulaRequests.push(
            update(environmentDataSheetId, 0, 12 + index * 2, [
                ["Observed at", headers[index + 3] ?? ""],
            ]),
            update(environmentDataSheetId, 1, 12 + index * 2, [
                [
                    `=IFNA(FILTER(HSTACK(A2:A5000,${column}2:${column}5000),B2:B5000='${title}'!$B$${selectorRow + 1},ISNUMBER(${column}2:${column}5000)),"")`,
                ],
            ]),
            update(environmentSheetId, comparisonStart + index * 23 - 1, 0, [
                [
                    `=IF(COUNT(${summaryColumn}${summaryHeader + 2}:${summaryColumn}${summaryEnd})=0,"No ${label} readings recorded.","Latest recorded values; dates may differ across plants.")`,
                ],
            ]),
            update(environmentSheetId, seriesStart + index * 23 - 1, 0, [
                [
                    `=IF(COUNT('${helper}'!${selectedColumn}2:${selectedColumn}5000)=0,"No ${label} readings for selected plant.","Recorded observations; points do not imply continuous monitoring.")`,
                ],
            ])
        );
    }
    for (const row of [
        0,
        1,
        2,
        4,
        selectorRow + 1,
        ...[
            0,
            1,
            2,
        ].flatMap((i) => [
            comparisonStart + i * 23 - 1,
            seriesStart + i * 23 - 1,
        ]),
    ])
        prepareRequests.push({
            mergeCells: {
                mergeType: "MERGE_ALL",
                range: {
                    endColumnIndex: 8,
                    endRowIndex: row + 1,
                    sheetId: environmentSheetId,
                    startColumnIndex: 0,
                    startRowIndex: row,
                },
            },
        });
    prepareRequests.push({
        updateDimensionProperties: {
            fields: "pixelSize",
            properties: { pixelSize: 48 },
            range: {
                dimension: "ROWS",
                endIndex: 3,
                sheetId: environmentSheetId,
                startIndex: 1,
            },
        },
    });

    for (const column of [
        3,
        5,
        7,
    ])
        prepareRequests.push(
            dateFormat(
                environmentSheetId,
                summaryHeader + 1,
                summaryEnd,
                column
            )
        );
    prepareRequests.push(
        dateFormat(environmentSheetId, 3, 4, 1),
        dateFormat(environmentSheetId, evidenceHeader + 1, finalRow, 0)
    );
    for (const column of [
        0,
        12,
        14,
        16,
    ])
        prepareRequests.push(
            dateFormat(environmentDataSheetId, 1, 5000, column)
        );
    for (const row of [
        0,
        summaryHeader,
        evidenceHeader,
    ])
        prepareRequests.push({
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        backgroundColorStyle: {
                            rgbColor: { blue: 0.89, green: 0.94, red: 0.9 },
                        },
                        textFormat: { bold: true, fontFamily: font },
                    },
                },
                fields: "userEnteredFormat.backgroundColorStyle,userEnteredFormat.textFormat",
                range: {
                    endColumnIndex: row === evidenceHeader ? 10 : 8,
                    endRowIndex: row + 1,
                    sheetId: environmentSheetId,
                    startColumnIndex: 0,
                    startRowIndex: row,
                },
            },
        });
    const chartRequests = [
        "Estimated PPFD (µmol/m²/s)",
        "Measured illuminance (lux)",
        humidityLabel,
    ].flatMap((metric, index) => [
        chartRequest(
            907_202_613 + index,
            metric,
            "Latest recorded value per plant · compare observation dates in the table",
            environmentSheetId,
            summaryHeader,
            summaryEnd,
            0,
            2 + index * 2,
            comparisonStart + index * 23,
            "COLUMN"
        ),
        chartRequest(
            907_202_616 + index,
            metric,
            "Selected plant · recorded points; no conversion or care threshold",
            environmentDataSheetId,
            0,
            5000,
            12 + index * 2,
            13 + index * 2,
            seriesStart + index * 23,
            "SCATTER"
        ),
    ]);
    for (const id of [
        907_202_613,
        907_202_614,
        907_202_615,
        907_202_616,
        907_202_617,
        907_202_618,
    ])
        if (
            metadata.sheets.some(
                (entry) =>
                    entry.charts?.some((chart) => chart.chartId === id) === true
            )
        )
            throw new Error(`Chart ID ${id} is occupied`);
    formulaRequests.push(integrityRequest(snapshot, finalRow));
    return {
        chartRequests,
        formulaRequests,
        preconditionDigest: environmentSnapshotDigest(snapshot),
        prepareRequests,
        verification: {
            dashboardChartIds: orderedCharts.map((chart) => chart.chartId),
            dashboardFirstChartRow: firstChartRow + 1,
            evidence: `A${evidenceHeader + 1}:J${finalRow}`,
            integrityRanges: [
                `'${helper}'!A1:J5000`,
                `'${helper}'!M1:R5000`,
                `'${title}'!A1:J${finalRow}`,
                "History!AQ2:AS5000",
            ],
            preserve: [
                "History",
                "App entries",
                "App bulk",
                "RO refills",
                "Existing chart specifications and IDs",
                "Original tab relative order",
            ],
            selector: `B${selectorRow + 1}`,
            summary: `A${summaryHeader + 1}:H${summaryEnd}`,
            writeFootprint: [
                "Integrity!B12 formula scan extension",
                `Dashboard chart positions and empty row heights ${firstChartRow + 1}:${endChartRow}`,
                `New ${title} sheet`,
                `New ${helper} sheet`,
            ],
        },
    };
}

/**
 * Emit maintained source for parent integration; no Node APIs enter Apps
 * Script.
 */
export function environmentAppsScriptSource() {
    return `/**
 * Read-only environmental observations. No volatile custom-function input.
 * @param {GardenHistoryRow[]} history Native History A:AS.
 * @returns {GardenCell[][]}
 * @customfunction
 */
function GARDEN_ENVIRONMENT_READINGS(history) {
    return environmentRows_(history, new Date(), {
        corrections: historyCorrectionContext_,
        active: activeHistoryRow_,
        timestamp: webHistoryTimestamp_,
    });
}

/**
 * @param {GardenHistoryRow[]} history
 * @param {Date} asOf
 * @param {{corrections: (rows: GardenHistoryRow[]) => {order: number[], superseded: Set<number>}, active: (row: GardenHistoryRow) => boolean, timestamp: (value: unknown) => number}} helpers
 * @returns {GardenCell[][]}
 */
${environmentRows.toString().replace("function environmentRows(", "function environmentRows_(").replaceAll(".toSorted(", ".sort(")}

/** @param {GardenCell | undefined} value @param {number} [maximum] */
${environmentNumber.toString()}
`;
}

/**
 * One correction-aware environmental projection, independent of pot setup and
 * watering. Helpers are the canonical bound logger functions, injected for
 * tests. Output dates remain native Date values; blanks and numeric zero stay
 * distinct.
 *
 * @param {GardenHistoryRow[]} history
 * @param {Date} asOf
 * @param {{
 *     corrections: (rows: GardenHistoryRow[]) => {
 *         order: number[];
 *         superseded: Set<number>;
 *     };
 *     active: (row: GardenHistoryRow) => boolean;
 *     timestamp: (value: unknown) => number;
 * }} helpers
 *
 * @returns {GardenCell[][]}
 */
export function environmentRows(history, asOf, helpers) {
    const context = helpers.corrections(history);
    return [
        [
            "Observed at",
            "Plant ID",
            "Event",
            "Estimated PPFD (µmol/m²/s)",
            "Illuminance (lux)",
            "Relative humidity (%)",
            "Recorded quality",
            "Recorded method",
            "Original notes / location",
            "Observation ID",
        ],
        ...history
            .map((row, index) => ({
                index,
                order: context.order[index] ?? index,
                row,
                time: helpers.timestamp(row[0]),
            }))
            .filter(
                ({ index, row, time }) =>
                    helpers.active(row) &&
                    !context.superseded.has(index) &&
                    time > 0 &&
                    time <= asOf.getTime() &&
                    typeof row[1] === "string" &&
                    row[1].trim() !== "" &&
                    ["Humidity", "Light"].includes(String(row[2]))
            )
            .toSorted(
                (a, b) =>
                    a.time - b.time || a.order - b.order || a.index - b.index
            )
            .map(({ row }) => [
                row[0] ?? "",
                row[1] ?? "",
                row[2] ?? "",
                row[2] === "Light" ? environmentNumber(row[43]) : "",
                row[2] === "Light" ? environmentNumber(row[44]) : "",
                row[2] === "Humidity" ? environmentNumber(row[42], 100) : "",
                row[28] ?? "",
                row[34] ?? "",
                row[8] ?? "",
                row[26] ?? "",
            ])
            .filter((row) => row[3] !== "" || row[4] !== "" || row[5] !== ""),
    ];
}

/** @param {EnvironmentSnapshot} snapshot */
export function environmentSnapshotDigest(snapshot) {
    return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

/**
 * @param {number} chartId @param {string} metric @param {string} subtitle
 * @param {number} sheetId @param {number} startRowIndex @param {number}
 *   endRowIndex @param {number} domainColumn @param {number} seriesColumn
 * @param {number} anchorRow @param {string} chartType
 */
function chartRequest(
    chartId,
    metric,
    subtitle,
    sheetId,
    startRowIndex,
    endRowIndex,
    domainColumn,
    seriesColumn,
    anchorRow,
    chartType
) {
    const data = (/** @type {number} */ column) => ({
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
    return {
        addChart: {
            chart: {
                chartId,
                position: {
                    overlayPosition: {
                        anchorCell: {
                            columnIndex: 0,
                            rowIndex: anchorRow,
                            sheetId: environmentSheetId,
                        },
                        heightPixels: 500,
                        offsetXPixels: 0,
                        offsetYPixels: 0,
                        widthPixels: 1120,
                    },
                },
                spec: {
                    basicChart: {
                        axis: [
                            {
                                format: { fontFamily: font },
                                position: "BOTTOM_AXIS",
                                title:
                                    chartType === "SCATTER"
                                        ? "Observed at"
                                        : "Plant ID",
                            },
                            {
                                format: { fontFamily: font },
                                position: "LEFT_AXIS",
                                title: metric,
                            },
                        ],
                        chartType,
                        domains: [{ domain: data(domainColumn) }],
                        headerCount: 1,
                        interpolateNulls: false,
                        legendPosition: "NO_LEGEND",
                        series: [
                            {
                                colorStyle: {
                                    rgbColor: {
                                        blue: 0.4,
                                        green: 0.49,
                                        red: 0.18,
                                    },
                                },
                                dataLabel: {
                                    textFormat: { fontFamily: font },
                                    type: "NONE",
                                },
                                ...(chartType === "SCATTER" && {
                                    pointStyle: {
                                        shape: "CIRCLE",
                                        size: 5,
                                    },
                                }),
                                series: data(seriesColumn),
                                targetAxis: "LEFT_AXIS",
                            },
                        ],
                    },
                    fontName: font,
                    hiddenDimensionStrategy: "SHOW_ALL",
                    subtitle,
                    subtitleTextFormat: { fontFamily: font },
                    title: metric,
                    titleTextFormat: { bold: true, fontFamily: font },
                },
            },
        },
    };
}

/** @param {EnvironmentSnapshot} snapshot */
function dashboardLayoutRequests(snapshot) {
    const { cells, dashboard } = validateEnvironmentSnapshot(snapshot);
    const bounds = dashboard.properties.gridProperties;
    if (
        snapshot.dashboardReadBounds.rowCount !== bounds.rowCount ||
        snapshot.dashboardReadBounds.columnCount !== bounds.columnCount
    )
        throw new Error(
            "Read the complete bounded Dashboard grid before planning"
        );
    const occupied = cells.filter(
        (cell) =>
            cell.sheet === "Dashboard" &&
            (Object.keys(cell.value ?? {}).length > 0 ||
                Object.keys(cell.effectiveValue ?? {}).length > 0)
    );
    const lastOccupiedRow = Math.max(-1, ...occupied.map((cell) => cell.row));
    const charts = dashboard.charts;
    if (charts === undefined || charts.length === 0)
        throw new Error("Missing full Dashboard chart metadata");
    const firstChartRow = lastOccupiedRow + 4;
    const orderedCharts = charts.toSorted((a, b) => {
        const left = a.position?.overlayPosition.anchorCell;
        const right = b.position?.overlayPosition.anchorCell;
        if (!left || !right)
            throw new Error("Missing Dashboard chart position");
        return (
            left.rowIndex - right.rowIndex ||
            left.columnIndex - right.columnIndex
        );
    });
    let endChartRow = firstChartRow;
    const chartAnchors = orderedCharts.map((chart) => {
        const overlay = /** @type {{ heightPixels?: number } | undefined} */ (
            chart.position?.overlayPosition
        );
        if (
            !overlay ||
            !Number.isFinite(overlay.heightPixels) ||
            (overlay.heightPixels ?? 0) <= 0
        )
            throw new Error("Missing Dashboard chart pixel dimensions");
        const anchor = endChartRow;
        endChartRow += Math.ceil((overlay.heightPixels ?? 0) / 24) + 3;
        return anchor;
    });
    if (endChartRow > bounds.rowCount)
        throw new Error("Dashboard lacks verified empty space below data");
    /** @type {Record<string, unknown>[]} */
    const dashboardRequests = [
        {
            updateDimensionProperties: {
                fields: "pixelSize,hiddenByUser",
                properties: { hiddenByUser: false, pixelSize: 24 },
                range: {
                    dimension: "ROWS",
                    endIndex: endChartRow,
                    sheetId: dashboard.properties.sheetId,
                    startIndex: firstChartRow,
                },
            },
        },
    ];
    for (const [index, chart] of orderedCharts.entries()) {
        const overlay = chart.position?.overlayPosition;
        if (!overlay)
            throw new Error("Incomplete Dashboard chart specification");
        dashboardRequests.push({
            updateEmbeddedObjectPosition: {
                fields: "anchorCell,offsetXPixels,offsetYPixels",
                newPosition: {
                    overlayPosition: {
                        anchorCell: {
                            columnIndex: 0,
                            rowIndex: chartAnchors[index],
                            sheetId: dashboard.properties.sheetId,
                        },
                        offsetXPixels: 0,
                        offsetYPixels: 0,
                    },
                },
                objectId: chart.chartId,
            },
        });
    }
    return { dashboardRequests, endChartRow, firstChartRow, orderedCharts };
}

/**
 * @param {number} sheetId @param {number} startRowIndex @param {number}
 *   endRowIndex @param {number} column
 */
function dateFormat(sheetId, startRowIndex, endRowIndex, column) {
    return {
        repeatCell: {
            cell: {
                userEnteredFormat: {
                    numberFormat: {
                        pattern: "mmm d, yyyy h:mm am/pm",
                        type: "DATE_TIME",
                    },
                },
            },
            fields: "userEnteredFormat.numberFormat",
            range: {
                endColumnIndex: column + 1,
                endRowIndex,
                sheetId,
                startColumnIndex: column,
                startRowIndex,
            },
        },
    };
}

/** @param {GardenCell | undefined} value @param {number} [maximum] */
function environmentNumber(value, maximum = Infinity) {
    return typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= maximum
        ? value
        : "";
}

/** @param {EnvironmentSnapshot} snapshot @param {number} finalRow */
function integrityRequest(snapshot, finalRow) {
    const integrity = snapshot.metadata.sheets.find(
        (entry) => entry.properties.title === "Integrity"
    );
    const formula = snapshot.cells.find(
        (cell) =>
            cell.sheet === "Integrity" && cell.row === 11 && cell.column === 1
    )?.value?.formulaValue;
    if (
        !integrity ||
        formula?.startsWith("=SUM(") !== true ||
        !formula.endsWith(")") ||
        !formula.includes("ISERROR(History!A2:AP5000)") ||
        !formula.includes("Dashboard!U4:X254") ||
        formula.includes("Environment data") ||
        formula.includes("Light & humidity")
    )
        throw new Error(
            "Integrity B12 formula drift or environment scan already installed"
        );
    const ranges = [
        `'${title}'!A1:J${finalRow}`,
        `'${helper}'!A1:J5000`,
        `'${helper}'!M1:R5000`,
        "History!AQ2:AS5000",
    ];
    const extension = ranges
        .map((range) => `SUM(ARRAYFORMULA(N(ISERROR(${range}))))`)
        .join(",");
    return update(integrity.properties.sheetId, 11, 1, [
        [`${formula.slice(0, -1)},${extension})`],
    ]);
}

/** @param {string} id @param {string} metric @param {string} result */
function latestFormula(id, metric, result) {
    return `=XLOOKUP(1,ARRAYFORMULA(('${helper}'!$B$2:$B$5000="${id}")*ISNUMBER('${helper}'!$${metric}$2:$${metric}$5000)),'${helper}'!$${result}$2:$${result}$5000,"",0,-1)`;
}

/**
 * @param {number} sheetId @param {number} row @param {number} column @param
 *   {string[][]} rows
 */
function update(sheetId, row, column, rows) {
    return {
        updateCells: {
            fields: "userEnteredValue",
            rows: rows.map((values) => ({
                values: values.map((value) => ({
                    userEnteredValue: value.startsWith("=")
                        ? { formulaValue: value }
                        : { stringValue: value },
                })),
            })),
            start: { columnIndex: column, rowIndex: row, sheetId },
        },
    };
}

/**
 * Guarded additive plan. Full Dashboard entered/effective cell bounds must be
 * read, including currently empty destination rows. Revalidate immediately
 * before applying preparation, then formulas, then charts after calculation.
 *
 * @param {EnvironmentSnapshot} snapshot
 */
function validateEnvironmentSnapshot(snapshot) {
    const { cells, metadata } = snapshot;
    const sheet = (/** @type {string} */ name) => {
        const result = metadata.sheets.find(
            (entry) => entry.properties.title === name
        );
        if (!result) throw new Error(`Missing ${name}`);
        return result;
    };
    const ledger = sheet("History");
    if (
        ledger.properties.gridProperties.rowCount !== 5000 ||
        ledger.properties.gridProperties.columnCount !== 45
    )
        throw new Error("History schema drift: expected A:AS and 5,000 rows");
    for (const [column, label] of /** @type {[number, string][]} */ ([
        [0, "Date"],
        [1, "Plant ID"],
        [2, "Event"],
        [8, "Notes"],
        [26, "Observation ID"],
        [28, "Observation quality"],
        [30, "Corrects observation ID"],
        [34, "Measurement method"],
        [35, "Record status"],
        [42, humidityLabel],
        [43, "PPFD (µmol/m²/s)"],
        [44, "Illuminance (lux)"],
    ])) {
        if (
            cells.every(
                (cell) =>
                    cell.sheet !== "History" ||
                    cell.row !== 0 ||
                    cell.column !== column ||
                    cell.value?.stringValue !== label
            )
        )
            throw new Error(`History header drift: ${label}`);
    }
    const tracker = cells
        .filter(
            (cell) =>
                cell.sheet === "Plant tracker" &&
                cell.column === 0 &&
                cell.row >= 1 &&
                cell.row <= palette.length
        )
        .toSorted((a, b) => a.row - b.row);
    if (
        tracker.length !== palette.length ||
        tracker.some(
            (cell, index) => cell.value?.stringValue !== palette[index]?.id
        )
    )
        throw new Error("Plant tracker inventory drift");
    for (const [name, id] of /** @type {[string, number][]} */ ([
        [title, environmentSheetId],
        [helper, environmentDataSheetId],
    ])) {
        if (
            metadata.sheets.some(
                (entry) =>
                    entry.properties.title === name ||
                    entry.properties.sheetId === id
            )
        )
            throw new Error(
                `${name} already exists; refuse replay or occupied destination`
            );
    }
    return { cells, dashboard: sheet("Dashboard"), metadata };
}
