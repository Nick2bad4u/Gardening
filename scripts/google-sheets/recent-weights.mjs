import { plantColor } from "./plant-chart-colors.mjs";
import palette from "./plant-colors.json" with { type: "json" };

/** @param {string | undefined} audit */
function recentErrorScan(audit) {
    if (
        audit === undefined ||
        !audit.includes("Dashboard!Y1:Z254") ||
        !audit.includes("'Dry-down models'!A1:P1000")
    )
        throw new Error(
            "Unexpected Integrity formula; review the scan before migration"
        );
    return `${audit
        .replace("Dashboard!Y1:Z254", "Dashboard!Y1:AE254")
        .replace("'Dry-down models'!A1:P1000", "'Dry-down models'!A1:V1000")
        .slice(
            0,
            -1
        )},ARRAYFORMULA(N(ISERROR('Daily care'!I40:N70))),ARRAYFORMULA(N(ISERROR('Plant color data'!DX1:EC31))))`;
}

export const recentWeightHeaders = [
    "Last weight change (g)",
    "Last interval loss (g/day)",
    "Average of last 3 weights (g)",
    "Average change across last 3 weights (g)",
    "Last 3 readings loss (g/day)",
    "Curve inspection",
];

/**
 * @param {import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot["cells"]} cells
 * @param {string} title @param {number} header @param {number} column
 */
function assertEmptyDestination(cells, title, header, column) {
    const isOccupied = cells.some(
        (cell) =>
            cell.sheet === title &&
            cell.row >= header &&
            cell.row <= header + 30 &&
            cell.column >= column &&
            cell.column < column + 6 &&
            Object.values(cell.value).some((value) => value !== "")
    );
    if (isOccupied)
        throw new Error(
            `${title} destination is occupied; do not replay migration`
        );
}
const notes = [
    "Latest minus previous measured weight. Negative = weight lost. Current watering cycle and pot setup only; estimated readings excluded; latest record wins for a duplicate timestamp.",
    "Previous minus latest measured weight divided by actual elapsed days. Positive = loss; negative = gain. Not a soil-moisture reading or a universal watering threshold.",
    "Arithmetic mean of the latest three distinct measured weights in the current watering cycle. Blank until three exist. A weight average cannot be normalized to grams per day.",
    "Mean of the two signed changes joining the latest three readings: (latest minus oldest) / 2. This is per interval, not per day.",
    "Oldest minus latest of the last three measured weights, divided by their total elapsed days. This weights unequal intervals by time rather than averaging their daily rates.",
    "A reference crossing or sustained plateau prompts a moisture inspection, not automatic watering. Plateau criteria are a documented heuristic; references are never automatically rewritten. Money tree and Royal Flush retain their special checks.",
];

/**
 * Scoped native migration; build from freshly read metadata and entered cells.
 * It appends dashboard metrics and charts without moving existing columns,
 * changing canonical history, or changing any AppSheet staging schema.
 *
 * @param {import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot} snapshot
 *
 * @returns {Record<string, unknown>[]}
 */
export function buildRecentWeightRequests({ cells, metadata }) {
    const find = (/** @type {string} */ title) => {
        const sheet = metadata.sheets.find((s) => s.properties.title === title);
        if (!sheet) throw new Error(`Missing sheet: ${title}`);
        return sheet;
    };
    const daily = find("Daily care"),
        dashboard = find("Dashboard"),
        insights = find("Insights"),
        models = find("Dry-down models");
    const chartData = find("Plant color data");
    const integrity = find("Integrity");
    const entered = (
        /** @type {string} */ sheet,
        /** @type {number} */ row,
        /** @type {number} */ column
    ) =>
        cells.find(
            (c) => c.sheet === sheet && c.row === row && c.column === column
        )?.value;
    for (const [
        sheet,
        row,
        column,
        header,
    ] of /** @type {[string, number, number, string][]} */ ([
        [
            "Dashboard",
            5,
            24,
            "Weight measurements",
        ],
        [
            "Daily care",
            39,
            1,
            "Plant ID",
        ],
        [
            "Dry-down models",
            0,
            15,
            "Watering guidance",
        ],
        [
            "History",
            0,
            35,
            "Record status",
        ],
    ]))
        if (entered(sheet, row, column)?.stringValue !== header)
            throw new Error(
                `Unexpected ${sheet} header at ${row + 1}:${column + 1}`
            );
    const audit = recentErrorScan(entered("Integrity", 11, 1)?.formulaValue);
    /** @type {Record<string, unknown>[]} */
    const requests = recentChartHelperRequests(chartData);
    for (const [
        sheet,
        header,
        column,
        key,
    ] of /** @type {[typeof dashboard, number, number, string][]} */ ([
        [
            dashboard,
            5,
            25,
            "B",
        ],
        [
            daily,
            39,
            8,
            "B",
        ],
    ])) {
        const id = sheet.properties.sheetId,
            title = sheet.properties.title;
        assertEmptyDestination(cells, title, header, column);
        if (sheet.properties.gridProperties.columnCount < column + 6)
            requests.push({
                appendDimension: {
                    dimension: "COLUMNS",
                    length:
                        column +
                        6 -
                        sheet.properties.gridProperties.columnCount,
                    sheetId: id,
                },
            });
        requests.push(
            write(id, header, column, [
                recentWeightHeaders,
                ...palette.map((_, index) =>
                    [
                        "Q",
                        "R",
                        "S",
                        "T",
                        "U",
                        "V",
                    ].map(
                        (source) =>
                            `=IFNA(INDEX('Dry-down models'!${source}$2:${source}$31,MATCH($${key}${header + index + 2},'Dry-down models'!$A$2:$A$31,0)),"")`
                    )
                ),
            ])
        );
        for (const index of recentWeightHeaders.keys()) {
            requests.push(
                {
                    repeatCell: {
                        cell: {
                            note: notes[index],
                            userEnteredFormat: {
                                backgroundColor: rgb("#174a68"),
                                textFormat: {
                                    bold: true,
                                    foregroundColor: rgb("#ffffff"),
                                },
                                verticalAlignment: "MIDDLE",
                                wrapStrategy: "WRAP",
                            },
                        },
                        fields: "note,userEnteredFormat",
                        range: range(id, header, column + index, 1, 1),
                    },
                },
                {
                    repeatCell: {
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: rgb("#edf5fb"),
                                textFormat: { foregroundColor: rgb("#174a68") },
                                verticalAlignment: "MIDDLE",
                                wrapStrategy: "WRAP",
                                ...(index < 5 && {
                                    numberFormat: {
                                        pattern: [0, 3].includes(index)
                                            ? "+0.0;-0.0;0.0"
                                            : "0.00",
                                        type: "NUMBER",
                                    },
                                }),
                            },
                        },
                        fields: "userEnteredFormat",
                        range: range(id, header + 1, column + index, 30, 1),
                    },
                }
            );
        }
        requests.push(
            {
                updateDimensionProperties: {
                    fields: "pixelSize",
                    properties: { pixelSize: 78 },
                    range: {
                        dimension: "ROWS",
                        endIndex: header + 1,
                        sheetId: id,
                        startIndex: header,
                    },
                },
            },
            {
                updateDimensionProperties: {
                    fields: "pixelSize",
                    properties: { pixelSize: 150 },
                    range: {
                        dimension: "COLUMNS",
                        endIndex: column + 5,
                        sheetId: id,
                        startIndex: column,
                    },
                },
            },
            {
                updateDimensionProperties: {
                    fields: "pixelSize",
                    properties: { pixelSize: 240 },
                    range: {
                        dimension: "COLUMNS",
                        endIndex: column + 6,
                        sheetId: id,
                        startIndex: column + 5,
                    },
                },
            }
        );
        if (sheet.basicFilter)
            requests.push({
                setBasicFilter: {
                    filter: {
                        ...sheet.basicFilter,
                        range: {
                            ...sheet.basicFilter.range,
                            endColumnIndex: column + 6,
                        },
                    },
                },
            });
        requests.push({
            addProtectedRange: {
                protectedRange: {
                    description:
                        "Derived recent weight metrics; edit History through the logger",
                    range: range(id, header, column, 31, 6),
                    warningOnly: true,
                },
            },
        });
    }
    requests.push(
        write(models.properties.sheetId, 0, 16, [recentWeightHeaders]),
        {
            repeatCell: {
                cell: { note: "Garden logger managed Daily care v3" },
                fields: "note",
                range: range(daily.properties.sheetId, 0, 0, 1, 1),
            },
        }
    );
    if (daily.protectedRanges) {
        for (const protection of daily.protectedRanges) {
            if (protection.range.startRowIndex === undefined)
                requests.push({
                    updateProtectedRange: {
                        fields: "description",
                        protectedRange: {
                            description: "Garden logger managed Daily care v3",
                            protectedRangeId: protection.protectedRangeId,
                        },
                    },
                });
        }
    }
    if (insights.properties.gridProperties.rowCount < 785)
        requests.push({
            appendDimension: {
                dimension: "ROWS",
                length: 785 - insights.properties.gridProperties.rowCount,
                sheetId: insights.properties.sheetId,
            },
        });
    const specs = [
        {
            columns: [26, 29],
            id: 907_202_605,
            row: 40,
            sheet: dashboard,
            subtitle:
                "Actual elapsed time · current cycle only · a low rate prompts inspection, not automatic watering",
            title: "Recent measured loss · last interval and last 3 readings",
            unit: "Weight loss (g/day); positive = drying",
        },
        {
            columns: [25, 28],
            id: 907_202_606,
            row: 634,
            sheet: insights,
            subtitle:
                "Average change uses the two intervals joining the last three measured weights",
            title: "Recent weight changes · last interval and three-reading average",
            unit: "Weight change (g); negative = loss",
        },
        {
            columns: [26, 29],
            id: 907_202_607,
            row: 684,
            sheet: insights,
            subtitle:
                "Time-weighted three-reading rate · compare each pot with itself, not a universal 1 g/day cutoff",
            title: "Recent daily loss · actual time between readings",
            unit: "Weight loss (g/day); positive = drying",
        },
        {
            columns: [27],
            id: 907_202_608,
            row: 734,
            sheet: insights,
            subtitle:
                "Current watering cycle and setup · blank until three measured readings exist",
            title: "Average of the last three measured weights",
            unit: "Whole-pot weight (g)",
        },
    ];
    for (const spec of specs) {
        if (
            metadata.sheets.some(
                (s) => s.charts?.some((c) => c.chartId === spec.id) === true
            )
        )
            throw new Error(
                "Recent weight charts already exist; do not replay migration"
            );
        requests.push({
            addChart: {
                chart: {
                    chartId: spec.id,
                    position: {
                        overlayPosition: {
                            anchorCell: {
                                columnIndex: 0,
                                rowIndex: spec.row,
                                sheetId: spec.sheet.properties.sheetId,
                            },
                            heightPixels: 1000,
                            offsetXPixels: 10,
                            offsetYPixels: 5,
                            widthPixels: 1155,
                        },
                    },
                    spec: {
                        altText: notes.join(" "),
                        basicChart: {
                            axis: [
                                { position: "BOTTOM_AXIS", title: spec.unit },
                                {
                                    position: "LEFT_AXIS",
                                    title: "Plant / label",
                                },
                            ],
                            chartType: "BAR",
                            domains: [
                                {
                                    domain: {
                                        sourceRange: {
                                            sources: [
                                                range(
                                                    chartData.properties
                                                        .sheetId,
                                                    0,
                                                    127,
                                                    31,
                                                    1
                                                ),
                                            ],
                                        },
                                    },
                                },
                            ],
                            headerCount: 1,
                            legendPosition:
                                spec.columns.length > 1
                                    ? "BOTTOM_LEGEND"
                                    : "NO_LEGEND",
                            series: spec.columns.map((column, seriesIndex) => ({
                                dataLabel: {
                                    textFormat: { fontSize: 8 },
                                    type: "DATA",
                                },
                                series: {
                                    sourceRange: {
                                        sources: [
                                            range(
                                                chartData.properties.sheetId,
                                                0,
                                                column + 103,
                                                31,
                                                1
                                            ),
                                        ],
                                    },
                                },
                                styleOverrides: palette.map((plant, index) => ({
                                    colorStyle: {
                                        rgbColor:
                                            seriesIndex === 0
                                                ? plantColor(plant.id)
                                                : lighten(plantColor(plant.id)),
                                    },
                                    index,
                                })),
                                targetAxis: "BOTTOM_AXIS",
                            })),
                        },
                        fontName: "Roboto",
                        hiddenDimensionStrategy: "SHOW_ALL",
                        subtitle: spec.subtitle,
                        subtitleTextFormat: { fontSize: 11 },
                        title: spec.title,
                        titleTextFormat: { fontSize: 18 },
                    },
                },
            },
        });
    }
    // Write after column expansion: Sheets shifts formerly out-of-grid references.
    requests.push(write(integrity.properties.sheetId, 11, 1, [[audit]]));
    return requests;
}

/** @param {{ red: number; green: number; blue: number }} color */
function lighten(color) {
    return {
        blue: color.blue * 0.6 + 0.4,
        green: color.green * 0.6 + 0.4,
        red: color.red * 0.6 + 0.4,
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
/**
 * Fixed P-ID rows keep chart colors attached when a dashboard is sorted.
 *
 * @param {import("../../test/workbook-fixtures.d.ts").SheetMetadata} sheet
 */
function recentChartHelperRequests(sheet) {
    if (sheet.properties.gridProperties.columnCount !== 127)
        throw new Error("Unexpected Plant color data append position");
    return [
        {
            appendDimension: {
                dimension: "COLUMNS",
                length: 6,
                sheetId: sheet.properties.sheetId,
            },
        },
        write(sheet.properties.sheetId, 0, 127, [
            ["Plant / label", ...recentWeightHeaders.slice(0, 5)],
            ...palette.map(({ id }) => [
                `=IFNA(INDEX(Dashboard!$C$7:$C$36,MATCH("${id}",Dashboard!$B$7:$B$36,0)),"${id}")`,
                ...[
                    "Q",
                    "R",
                    "S",
                    "T",
                    "U",
                ].map(
                    (column) =>
                        `=IFNA(INDEX('Dry-down models'!${column}$2:${column}$31,MATCH("${id}",'Dry-down models'!$A$2:$A$31,0)),"")`
                ),
            ]),
        ]),
    ];
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
 * @param {number} sheetId @param {number} row @param {number} column @param
 *   {string[][]} values
 */
function write(sheetId, row, column, values) {
    return {
        updateCells: {
            fields: "userEnteredValue",
            rows: values.map((r) => ({
                values: r.map((v) => ({
                    userEnteredValue: v.startsWith("=")
                        ? { formulaValue: v }
                        : { stringValue: v },
                })),
            })),
            start: { columnIndex: column, rowIndex: row, sheetId },
        },
    };
}
