/**
 * Native Insights charts. Build requests offline; apply only after a fresh
 * backup.
 */
const modelsTitle = "Dry-down models";
const helperTitle = "Dry-down insights";
const helperId = 907_202_601;
const firstRow = 239;
const green = { blue: 0.33, green: 0.49, red: 0.18 };
const blue = { blue: 0.71, green: 0.54, red: 0.31 };
const gold = { blue: 0.24, green: 0.65, red: 0.84 };

/**
 * @param {import("../../test/insights-fixtures.d.ts").InsightsSnapshot} snapshot
 *
 * @returns {Record<string, unknown>[]}
 */
export function buildInsightsRequests({ cells, metadata }) {
    const findSheet = (/** @type {string} */ title) => {
        const sheet = metadata.sheets.find(
            (item) => item.properties.title === title
        );
        if (sheet === undefined) throw new Error(`Missing sheet: ${title}`);
        return sheet;
    };
    if (
        metadata.sheets.some(
            (item) =>
                item.properties.title === helperTitle ||
                item.properties.sheetId === helperId
        )
    )
        throw new Error(
            "Insights helpers already exist; review instead of replaying migration"
        );
    const insights = findSheet("Insights");
    for (const title of [
        "History",
        "Baselines",
        modelsTitle,
    ])
        findSheet(title);
    if (insights.properties.gridProperties.rowCount !== firstRow)
        throw new Error("Insights layout changed; recheck append position");
    /** @type {[string, number, string][]} */
    const headerChecks = [
        [
            "History",
            0,
            "Date",
        ],
        [
            "History",
            1,
            "Plant ID",
        ],
        [
            "History",
            2,
            "Event",
        ],
        [
            "History",
            4,
            "Weight (g)",
        ],
        [
            "History",
            10,
            "Pot setup",
        ],
        [
            "History",
            28,
            "Observation quality",
        ],
        [
            "History",
            34,
            "Measurement method",
        ],
        [
            "History",
            35,
            "Record status",
        ],
        [
            "Baselines",
            0,
            "Plant ID",
        ],
        [
            "Baselines",
            2,
            "Latest weight (g)",
        ],
        [
            "Baselines",
            4,
            "Last weighed",
        ],
        [
            "Baselines",
            14,
            "Last water",
        ],
        [
            "Baselines",
            19,
            "Pot setup",
        ],
        [
            "Baselines",
            22,
            "Dry weight (g)",
        ],
        [
            "Baselines",
            24,
            "Wet weight (g)",
        ],
        [
            "Baselines",
            25,
            "Capacity (g)",
        ],
        [
            "Baselines",
            26,
            "Last setup change",
        ],
        [
            "Baselines",
            30,
            "Drying rate (g/day)",
        ],
        [
            modelsTitle,
            4,
            "Current-cycle points",
        ],
        [
            modelsTitle,
            5,
            "Learned cycles",
        ],
        [
            modelsTitle,
            6,
            "Modeled loss (g/day)",
        ],
        [
            modelsTitle,
            7,
            "Forecast date",
        ],
        [
            modelsTitle,
            8,
            "Window start",
        ],
        [
            modelsTitle,
            9,
            "Window end",
        ],
        [
            modelsTitle,
            10,
            "Forecast basis",
        ],
    ];
    for (const [
        sheet,
        column,
        expected,
    ] of headerChecks) {
        if (
            cells.every(
                (cell) =>
                    cell.sheet !== sheet ||
                    cell.row !== 0 ||
                    cell.column !== column ||
                    cell.value.stringValue !== expected
            )
        )
            throw new Error(`Source header changed: ${sheet} column ${column}`);
    }
    for (let row = 1; row <= 30; row += 1) {
        const id = `P${String(row).padStart(2, "0")}`;
        if (
            cells.every(
                (cell) =>
                    cell.sheet !== "Baselines" ||
                    cell.row !== row ||
                    cell.column !== 0 ||
                    cell.value.stringValue !== id
            )
        )
            throw new Error(`Collection roster changed at ${id}`);
    }
    const sheetId = insights.properties.sheetId;
    const template = insights.charts?.find(
        (chart) => chart.spec.title === "Recent drying rate by plant"
    );
    if (template === undefined)
        throw new Error("Missing original drying-rate chart");
    const repairedSpec = structuredClone(template.spec);
    repairedSpec.title = "Modeled drying rate by plant";
    repairedSpec.subtitle =
        "Current-cycle or historical model • grams/day • reweigh to confirm";
    repairedSpec.basicChart.series = [
        {
            colorStyle: { rgbColor: green },
            ...repairedSpec.basicChart.series?.[0],
            series: source(
                findSheet("Baselines").properties.sheetId,
                0,
                30,
                31
            ),
            targetAxis: "BOTTOM_AXIS",
        },
    ];
    repairedSpec.basicChart.axis = [
        ...repairedSpec.basicChart.axis.filter(
            (axis) => axis.position !== "BOTTOM_AXIS"
        ),
        {
            ...repairedSpec.basicChart.axis.find(
                (axis) => axis.position === "BOTTOM_AXIS"
            ),
            position: "BOTTOM_AXIS",
            title: "Modeled loss (g/day)",
        },
    ];
    const selectorRow = firstRow + 3;
    /** @type {Record<string, unknown>[]} */
    const requests = [
        {
            addSheet: {
                properties: {
                    gridProperties: {
                        columnCount: 31,
                        frozenRowCount: 1,
                        rowCount: 5000,
                    },
                    hidden: true,
                    sheetId: helperId,
                    title: helperTitle,
                },
            },
        },
        { appendDimension: { dimension: "ROWS", length: 360, sheetId } },
        { updateChartSpec: { chartId: template.chartId, spec: repairedSpec } },
        {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        numberFormat: { pattern: "0.00", type: "NUMBER" },
                    },
                },
                fields: "userEnteredFormat.numberFormat",
                range: { sheetId: helperId },
            },
        },
        write(helperId, 0, 0, [
            [
                "Plant ID",
                "Plant",
                "Latest weight (g)",
                "Last weighed",
                "Dry reference (g)",
                "Wet reference (g)",
                "Capacity (g)",
                "Last water",
                "Pot setup",
                "Current-cycle points",
                "Learned cycles",
                "Modeled loss (g/day)",
                "Forecast date",
                "Window start",
                "Window end",
                "Forecast basis",
                "Relative water remaining",
                "Mass lost since wet (g)",
                "Capacity lost / day",
                "Forecast window (days)",
                "Days since weighing",
                "Cycle anchor",
            ],
            ...Array.from({ length: 30 }, (_, index) => plantRow(index + 2)),
        ]),
        write(sheetId, firstRow, 0, [
            ["Dry-down explorer & collection comparisons"],
            [
                "Choose a plant below. Forecasts suggest when to inspect/reweigh; follow each plant’s care guidance.",
            ],
            [
                "Plant ID",
                "P01",
                `=IFNA(INDEX(Baselines!B2:B31,MATCH(B${selectorRow},Baselines!A2:A31,0)),"")`,
            ],
            [
                "Weight references describe the whole pot. Percentages are relative to wet/dry weights, not measured soil moisture.",
            ],
            [
                "Money tree: inspect the upper soil; never use a whole-pot dry forecast as a watering deadline. Royal flush: follow seasonal guidance.",
            ],
            [
                `=IFNA(INDEX('Dry-down models'!P2:P31,MATCH(B${selectorRow},'Dry-down models'!A2:A31,0)),"Collecting evidence")`,
            ],
        ]),
        {
            setDataValidation: {
                range: {
                    endColumnIndex: 2,
                    endRowIndex: selectorRow,
                    sheetId,
                    startColumnIndex: 1,
                    startRowIndex: selectorRow - 1,
                },
                rule: {
                    condition: {
                        type: "ONE_OF_RANGE",
                        values: [{ userEnteredValue: "=Baselines!$A$2:$A$31" }],
                    },
                    showCustomUi: true,
                    strict: true,
                },
            },
        },
        {
            updateDimensionProperties: {
                fields: "pixelSize",
                properties: { pixelSize: 21 },
                range: {
                    dimension: "ROWS",
                    endIndex: firstRow + 360,
                    sheetId,
                    startIndex: firstRow,
                },
            },
        },
        {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        textFormat: {
                            fontFamily: "Roboto",
                            fontSize: 11,
                            foregroundColorStyle: { rgbColor: green },
                        },
                        wrapStrategy: "WRAP",
                    },
                },
                fields: "userEnteredFormat",
                range: {
                    endColumnIndex: 18,
                    endRowIndex: firstRow + 7,
                    sheetId,
                    startColumnIndex: 0,
                    startRowIndex: firstRow,
                },
            },
        },
        {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        textFormat: { bold: true, fontSize: 18 },
                    },
                },
                fields: "userEnteredFormat.textFormat.bold,userEnteredFormat.textFormat.fontSize",
                range: {
                    endColumnIndex: 18,
                    endRowIndex: firstRow + 1,
                    sheetId,
                    startColumnIndex: 0,
                    startRowIndex: firstRow,
                },
            },
        },
        {
            repeatCell: {
                cell: {
                    note: "Select P01–P30. Only this cell is an input; chart data is derived.",
                    userEnteredFormat: {
                        backgroundColorStyle: {
                            rgbColor: { blue: 0.76, green: 0.93, red: 0.98 },
                        },
                    },
                },
                fields: "userEnteredFormat.backgroundColorStyle,note",
                range: {
                    endColumnIndex: 2,
                    endRowIndex: selectorRow,
                    sheetId,
                    startColumnIndex: 1,
                    startRowIndex: selectorRow - 1,
                },
            },
        },
        write(helperId, 0, 25, [
            [
                "Measured at",
                "Scale weight (g)",
                "Dry reference (g)",
                "Wet reference (g)",
                "Interval loss (g/day)",
                "Days after cycle anchor",
            ],
            [currentCycleFormula(selectorRow)],
        ]),
        write(helperId, 1, 27, [
            [
                `=ARRAYFORMULA(IF(Z2:Z5000="","",IF(INDEX(E2:E31,MATCH(Insights!B${selectorRow},A2:A31,0))="","",INDEX(E2:E31,MATCH(Insights!B${selectorRow},A2:A31,0)))))`,
                `=ARRAYFORMULA(IF(Z2:Z5000="","",IF(INDEX(F2:F31,MATCH(Insights!B${selectorRow},A2:A31,0))="","",INDEX(F2:F31,MATCH(Insights!B${selectorRow},A2:A31,0)))))`,
                "",
                `=ARRAYFORMULA(IF(Z2:Z5000="","",Z2:Z5000-INDEX(V2:V31,MATCH(Insights!B${selectorRow},A2:A31,0))))`,
            ],
        ]),
        write(helperId, 2, 29, [
            [
                '=ARRAYFORMULA(IF((Z3:Z5000<>"")*(Z2:Z4999<>"")*(Z3:Z5000>Z2:Z4999),(AA2:AA4999-AA3:AA5000)/(Z3:Z5000-Z2:Z4999),""))',
            ],
        ]),
        numberFormat(helperId, 1, 25, 5000, "mmm d hh:mm", "DATE_TIME"),
        {
            addProtectedRange: {
                protectedRange: {
                    description:
                        "Formula-driven Insights helpers. Change maintained source; no observation entry here.",
                    range: { sheetId: helperId },
                    warningOnly: true,
                },
            },
        },
        write(sheetId, firstRow + 6, 0, [
            [
                `=LET(idx,MATCH(B${selectorRow},'Dry-down models'!A2:A31,0),forecast,INDEX('Dry-down models'!H2:H31,idx),IF(forecast="","Predicted dry check: collecting evidence","Predicted dry check: "&TEXT(forecast,"mmm d")&" · Window: "&TEXT(INDEX('Dry-down models'!I2:I31,idx),"mmm d")&" – "&TEXT(INDEX('Dry-down models'!J2:J31,idx),"mmm d")&" · "&INDEX('Dry-down models'!K2:K31,idx)))`,
            ],
        ]),
    ];
    for (const offset of [
        0,
        1,
        3,
        4,
        5,
        6,
    ])
        requests.push({
            mergeCells: {
                mergeType: "MERGE_ALL",
                range: {
                    endColumnIndex: 18,
                    endRowIndex: firstRow + offset + 1,
                    sheetId,
                    startColumnIndex: 0,
                    startRowIndex: firstRow + offset,
                },
            },
        });
    requests.push({
        mergeCells: {
            mergeType: "MERGE_ALL",
            range: {
                endColumnIndex: 18,
                endRowIndex: selectorRow,
                sheetId,
                startColumnIndex: 2,
                startRowIndex: selectorRow - 1,
            },
        },
    });
    const addChart = (
        /** @type {string} */ title,
        /** @type {string} */ subtitle,
        /** @type {number} */ anchor,
        /** @type {number} */ row,
        /** @type {number} */ domain,
        /** @type {number[]} */ columns,
        /** @type {number} */ count,
        type = "BAR",
        unit = ""
    ) => {
        requests.push({
            addChart: {
                chart: {
                    position: {
                        overlayPosition: {
                            anchorCell: {
                                columnIndex: 0,
                                rowIndex: anchor,
                                sheetId,
                            },
                            heightPixels: 640,
                            offsetXPixels: 10,
                            offsetYPixels: 5,
                            widthPixels: 1155,
                        },
                    },
                    spec: {
                        ...structuredClone(template.spec),
                        altText: `${title}. ${subtitle}`,
                        basicChart: {
                            axis: [
                                {
                                    format: {
                                        fontFamily: "Roboto",
                                        fontSize: 11,
                                    },
                                    position: "BOTTOM_AXIS",
                                    title:
                                        type === "BAR"
                                            ? unit
                                            : "Days after latest Water / Repot",
                                },
                                {
                                    format: {
                                        fontFamily: "Roboto",
                                        fontSize: 11,
                                    },
                                    position: "LEFT_AXIS",
                                    title: type === "BAR" ? "Plant ID" : unit,
                                },
                            ],
                            chartType: type,
                            domains: [
                                {
                                    domain: source(
                                        helperId,
                                        row,
                                        domain,
                                        count
                                    ),
                                },
                            ],
                            headerCount: 1,
                            interpolateNulls: false,
                            legendPosition:
                                columns.length > 1
                                    ? "BOTTOM_LEGEND"
                                    : "NO_LEGEND",
                            lineSmoothing: false,
                            series: columns.map((column, index) => ({
                                colorStyle: {
                                    rgbColor: [
                                        green,
                                        gold,
                                        blue,
                                    ][index % 3],
                                },
                                series: source(helperId, row, column, count),
                                targetAxis:
                                    type === "BAR"
                                        ? "BOTTOM_AXIS"
                                        : "LEFT_AXIS",
                                ...(type === "SCATTER" && {
                                    lineStyle: {
                                        type:
                                            index === 0
                                                ? "SOLID"
                                                : "MEDIUM_DASHED",
                                        width: 2,
                                    },
                                    pointStyle: { size: index === 0 ? 5 : 2 },
                                }),
                            })),
                        },
                        hiddenDimensionStrategy: "SHOW_ALL",
                        subtitle,
                        title,
                    },
                },
            },
        });
    };
    addChart(
        "Current dry-down cycle • measured weights",
        "Plant selector above • scale readings with wet and dry references • gaps reflect measurement timing",
        firstRow + 7,
        0,
        30,
        [
            26,
            27,
            28,
        ],
        5000,
        "SCATTER",
        "Whole-pot weight (g)"
    );
    addChart(
        "Current dry-down cycle • interval loss",
        "Each point is loss since the previous reading • negative values are gains • equal timestamps have no rate",
        firstRow + 39,
        0,
        30,
        [29],
        5000,
        "SCATTER",
        "Measured interval loss (g/day)"
    );
    const comparisons = [
        {
            ascending: true,
            column: "Q",
            format: "0.0%",
            subtitle:
                "(Latest − dry) / (wet − dry) • below 0% or above 100% prompts review • not soil-moisture percent",
            title: "Relative water remaining by plant",
            unit: "Fraction of wet-to-dry capacity",
        },
        {
            ascending: false,
            column: "R",
            format: "0.0",
            subtitle:
                "Wet reference minus latest whole-pot weight • grams • missing current-cycle readings omitted",
            title: "Mass lost since the current wet reference",
            unit: "Mass lost (g)",
        },
        {
            ascending: true,
            column: "M",
            format: "0.0",
            subtitle:
                "Days from today: earliest / central estimate / latest • negative means elapsed • inspect and reweigh",
            title: "Predicted dry-check timing",
            unit: "Days from today",
        },
        {
            ascending: false,
            column: "T",
            format: "0.0",
            subtitle:
                "Full earliest-to-latest window • wider bars mean a less precise inspection estimate",
            title: "Forecast uncertainty by plant",
            unit: "Window width (days)",
        },
        {
            ascending: false,
            column: "S",
            format: "0.0%",
            subtitle:
                "Modeled grams/day divided by wet-to-dry capacity • compares different pot sizes",
            title: "Drying speed relative to pot capacity",
            unit: "Fraction of capacity / day",
        },
        {
            ascending: false,
            column: "J",
            format: "0",
            subtitle:
                "Current-cycle readings and completed learned cycles • counts are evidence, not a confidence score",
            title: "Evidence behind the dry-down models",
            unit: "Evidence count",
        },
        {
            ascending: false,
            column: "G",
            format: "0.0",
            subtitle:
                "Measured reference difference • whole-pot grams • missing calibration omitted",
            title: "Wet-to-dry reference capacity",
            unit: "Reference capacity (g)",
        },
        {
            ascending: false,
            column: "U",
            format: "0.0",
            subtitle:
                "Observation freshness helps prioritize reweighing • it is not a watering schedule",
            title: "Time since the latest weighing",
            unit: "Days since weighing",
        },
    ];
    for (const [index, item] of comparisons.entries()) {
        const row = 40 + index * 40;
        const { columns, data, headers } = comparisonData(item);
        const eligible =
            item.column === "M"
                ? "ISNUMBER($M$2:$M$31)*ISNUMBER($N$2:$N$31)*ISNUMBER($O$2:$O$31)"
                : `ISNUMBER($${item.column}$2:$${item.column}$31)`;
        requests.push(
            write(helperId, row, 0, [
                headers,
                [
                    `=IFNA(SORT(FILTER(${data},${eligible}),2,${item.ascending ? "TRUE" : "FALSE"}),"")`,
                ],
            ])
        );
        for (const column of columns)
            requests.push(
                numberFormat(helperId, row + 1, column, row + 31, item.format)
            );
        addChart(
            item.title,
            item.subtitle,
            firstRow + 71 + index * 32,
            row,
            0,
            columns,
            31,
            "BAR",
            item.unit
        );
    }
    requests.push(
        write(helperId, 360, 0, [
            ["Forecast basis", "Plants"],
            [
                '=IFNA(QUERY({P2:P31},"select Col1, count(Col1) where Col1 is not null group by Col1 label count(Col1) \'\'",0),"")',
            ],
        ])
    );
    addChart(
        "Forecast basis across the collection",
        "Includes plants still collecting evidence • model basis comes directly from Dry-down models",
        firstRow + 327,
        360,
        0,
        [1],
        31,
        "BAR",
        "Plants"
    );
    return requests;
}

/**
 * Only current-setup scale readings after the current Water/Repot anchor.
 * Numeric text, estimates and removed records are excluded; equal timestamps
 * remain visible but cannot produce an interval rate.
 *
 * @param {number} selectorRow
 */
export function currentCycleFormula(selectorRow) {
    return `=IFNA(LET(plant,Insights!B${selectorRow},setup,INDEX(I2:I31,MATCH(plant,A2:A31,0)),anchor,INDEX(V2:V31,MATCH(plant,A2:A31,0)),SORT(FILTER({History!A2:A5000,History!E2:E5000},History!B2:B5000=plant,History!C2:C5000="Weigh",ISNUMBER(History!A2:A5000),ISNUMBER(History!E2:E5000),History!E2:E5000>0,History!K2:K5000=setup,History!A2:A5000>=anchor,History!AJ2:AJ5000<>"Removed",REGEXMATCH(LOWER(History!AC2:AC5000&" "&History!AI2:AI5000),"estimat")=FALSE),1,TRUE)),"")`;
}

/** @param {{ column: string; unit: string }} item */
function comparisonData(item) {
    if (item.column === "M")
        return {
            columns: [
                1,
                2,
                3,
            ],
            data: "{$A$2:$A$31,$N$2:$N$31-TODAY(),$M$2:$M$31-TODAY(),$O$2:$O$31-TODAY()}",
            headers: [
                "Plant ID",
                "Earliest (days)",
                "Estimate (days)",
                "Latest (days)",
            ],
        };
    if (item.column === "J")
        return {
            columns: [1, 2],
            data: "{$A$2:$A$31,$J$2:$J$31,$K$2:$K$31}",
            headers: [
                "Plant ID",
                "Current-cycle readings",
                "Learned cycles",
            ],
        };
    return {
        columns: [1],
        data: `{$A$2:$A$31,$${item.column}$2:$${item.column}$31}`,
        headers: ["Plant ID", item.unit],
    };
}

/** @param {string} sheet @param {string} column @param {number} row */
function lookup(sheet, column, row) {
    const range = `'${sheet}'!$${column}$2:$${column}$31`;
    return `IFNA(INDEX(FILTER(${range},'${sheet}'!$A$2:$A$31=$A${row},${range}<>""),1),"")`;
}

/**
 * @param {number} sheetId @param {number} row @param {number} column @param
 *   {number} endRow @param {string} pattern @param {string} type
 */
function numberFormat(sheetId, row, column, endRow, pattern, type = "NUMBER") {
    return {
        repeatCell: {
            cell: { userEnteredFormat: { numberFormat: { pattern, type } } },
            fields: "userEnteredFormat.numberFormat",
            range: {
                endColumnIndex: column + 1,
                endRowIndex: endRow,
                sheetId,
                startColumnIndex: column,
                startRowIndex: row,
            },
        },
    };
}

/** @param {number} row */
function plantRow(row) {
    const baselineColumns = [
        "B",
        "C",
        "E",
        "W",
        "Y",
        "Z",
        "O",
        "T",
    ];
    const modelColumns = [
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
    ];
    return [
        `=Baselines!A${row}`,
        ...baselineColumns.map(
            (column) => `=${lookup("Baselines", column, row)}`
        ),
        ...modelColumns.map(
            (column) => `=${lookup("Dry-down models", column, row)}`
        ),
        `=IF(AND(ISNUMBER(C${row}),ISNUMBER(E${row}),G${row}>0,ISNUMBER(G${row})),(C${row}-E${row})/G${row},"")`,
        `=IF(AND(ISNUMBER(C${row}),ISNUMBER(F${row}),ISNUMBER(H${row}),D${row}>=H${row}),F${row}-C${row},"")`,
        `=IF(AND(ISNUMBER(L${row}),ISNUMBER(G${row}),G${row}>0),L${row}/G${row},"")`,
        `=IF(AND(ISNUMBER(N${row}),ISNUMBER(O${row})),O${row}-N${row},"")`,
        `=IF(ISNUMBER(D${row}),NOW()-D${row},"")`,
        `=MAX(N(H${row}),N(${lookup("Baselines", "AA", row)}))`,
    ];
}

/**
 * @param {number} sheetId @param {number} row @param {number} column @param
 *   {number} count
 */
function source(sheetId, row, column, count) {
    return {
        sourceRange: {
            sources: [
                {
                    endColumnIndex: column + 1,
                    endRowIndex: row + count,
                    sheetId,
                    startColumnIndex: column,
                    startRowIndex: row,
                },
            ],
        },
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
            rows: values.map((items) => ({
                values: items.map((value) => ({
                    userEnteredValue: value.startsWith("=")
                        ? { formulaValue: value }
                        : { stringValue: value },
                })),
            })),
            start: { columnIndex: column, rowIndex: row, sheetId },
        },
    };
}
