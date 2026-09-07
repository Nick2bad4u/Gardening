/** Native chart colors belong to permanent plant IDs, never row positions. */
import palette from "./plant-colors.json" with { type: "json" };

export const plantColorSheetId = 907_202_602;

/**
 * Build only the new legend sheet and the existing individual plant chart
 * styles.
 *
 * @param {import("../../test/plant-chart-colors-fixtures.d.ts").PlantColorSnapshot} snapshot
 *
 * @returns {Record<string, unknown>[]}
 */
export function buildPlantColorKeyRequests({ cells, metadata }) {
    if (
        metadata.sheets.some(
            (sheet) =>
                sheet.properties.title === "Plant colors" ||
                sheet.properties.sheetId === plantColorSheetId
        )
    )
        throw new Error(
            "Plant colors already exists; review instead of replaying installation"
        );
    const roster = palette.map((color) => {
        const idCell = cells.find(
            (cell) =>
                cell.sheet === "Plant tracker" &&
                cell.column === 0 &&
                cell.value.stringValue === color.id
        );
        const name = cells.find(
            (cell) =>
                cell.sheet === "Plant tracker" &&
                cell.column === 1 &&
                cell.row === idCell?.row
        )?.value.stringValue;
        const sheet = metadata.sheets.find((item) =>
            item.properties.title.startsWith(`${color.id} `)
        );
        if (name === undefined || name === "" || sheet === undefined)
            throw new Error(`Missing plant record or chart page: ${color.id}`);
        return { ...color, colorName: color.name, name, sheet };
    });
    const sheetId = plantColorSheetId;
    /** @type {Record<string, unknown>[]} */
    const requests = [
        {
            addSheet: {
                properties: {
                    gridProperties: {
                        columnCount: 6,
                        frozenRowCount: 4,
                        hideGridlines: true,
                        rowCount: 38,
                    },
                    index: metadata.sheets.length,
                    sheetId,
                    title: "Plant colors",
                },
            },
        },
    ];
    const rows = [
        [
            "Plant color key",
            "",
            "",
            "",
            "",
            "",
        ],
        [
            "The same plant keeps the same color across Insights and its own charts.",
            "",
            "",
            "",
            "",
            "",
        ],
        [
            "Use the plant name and ID alongside color; similar hues can be harder to distinguish.",
            "",
            "",
            "",
            "",
            "",
        ],
        [
            "Plant ID",
            "Plant / planter",
            "Color",
            "Hex",
            "Swatch",
            "Plant charts",
        ],
        ...roster.map((plant) => [
            plant.id,
            plant.name,
            plant.colorName,
            plant.hex,
            "",
            `=HYPERLINK("#gid=${plant.sheet.properties.sheetId}","Open charts")`,
        ]),
    ];
    requests.push(
        {
            updateCells: {
                fields: "userEnteredValue",
                rows: rows.map((row) => ({
                    values: row.map((value) => ({
                        userEnteredValue: value.startsWith("=")
                            ? { formulaValue: value }
                            : { stringValue: value },
                    })),
                })),
                start: { columnIndex: 0, rowIndex: 0, sheetId },
            },
        },
        {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        textFormat: { fontFamily: "Roboto", fontSize: 11 },
                        verticalAlignment: "MIDDLE",
                    },
                },
                fields: "userEnteredFormat",
                range: { sheetId },
            },
        }
    );
    for (const rowIndex of [
        0,
        1,
        2,
    ])
        requests.push({
            mergeCells: {
                mergeType: "MERGE_ALL",
                range: {
                    endColumnIndex: 6,
                    endRowIndex: rowIndex + 1,
                    sheetId,
                    startColumnIndex: 0,
                    startRowIndex: rowIndex,
                },
            },
        });
    for (const rowIndex of [0, 3])
        requests.push({
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        backgroundColorStyle: {
                            rgbColor: { blue: 0.17, green: 0.24, red: 0.09 },
                        },
                        textFormat: {
                            bold: true,
                            fontFamily: "Roboto",
                            fontSize: rowIndex === 0 ? 19 : 11,
                            foregroundColorStyle: {
                                rgbColor: { blue: 1, green: 1, red: 1 },
                            },
                        },
                    },
                },
                fields: "userEnteredFormat",
                range: {
                    endRowIndex: rowIndex + 1,
                    sheetId,
                    startRowIndex: rowIndex,
                },
            },
        });
    for (const [index, width] of [
        100,
        350,
        140,
        110,
        125,
        135,
    ].entries())
        requests.push({
            updateDimensionProperties: {
                fields: "pixelSize",
                properties: { pixelSize: width },
                range: {
                    dimension: "COLUMNS",
                    endIndex: index + 1,
                    sheetId,
                    startIndex: index,
                },
            },
        });
    requests.push({
        updateDimensionProperties: {
            fields: "pixelSize",
            properties: { pixelSize: 32 },
            range: { dimension: "ROWS", endIndex: 34, sheetId, startIndex: 0 },
        },
    });
    for (const [index, plant] of roster.entries()) {
        requests.push({
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        backgroundColorStyle: {
                            rgbColor: plantColor(plant.id),
                        },
                    },
                },
                fields: "userEnteredFormat.backgroundColorStyle",
                range: {
                    endColumnIndex: 5,
                    endRowIndex: index + 5,
                    sheetId,
                    startColumnIndex: 4,
                    startRowIndex: index + 4,
                },
            },
        });
        if (plant.sheet.charts === undefined) continue;
        for (const chart of plant.sheet.charts)
            requests.push(colorPlantPageChart(chart, plant.id));
    }
    return requests;
}

/** @param {string} id */
export function plantColor(id) {
    const color = palette.find((entry) => entry.id === id);
    if (color === undefined) throw new Error(`Unknown plant color: ${id}`);
    return {
        blue: Number.parseInt(color.hex.slice(5, 7), 16) / 255,
        green: Number.parseInt(color.hex.slice(3, 5), 16) / 255,
        red: Number.parseInt(color.hex.slice(1, 3), 16) / 255,
    };
}

export const plantColorDataSheetId = 907_202_603;

/**
 * Bind point colors to a fixed ID order and selected-cycle series to one ID
 * each. All formulas read existing helpers; canonical observations are never
 * rewritten.
 *
 * @param {import("../../test/plant-chart-colors-fixtures.d.ts").PlantColorSnapshot} snapshot
 *
 * @returns {Record<string, unknown>[]}
 */
export function buildPlantInsightColorRequests({ cells, metadata }) {
    if (
        metadata.sheets.some(
            (sheet) =>
                sheet.properties.title === "Plant color data" ||
                sheet.properties.sheetId === plantColorDataSheetId
        )
    )
        throw new Error(
            "Plant color data already exists; review instead of replaying installation"
        );
    const insights = metadata.sheets.find(
        (sheet) => sheet.properties.title === "Insights"
    );
    if (insights?.charts?.length !== 19)
        throw new Error("Insights chart inventory changed");
    const selector = cells.filter(
        (cell) =>
            cell.sheet === "Insights" &&
            cell.column === 0 &&
            cell.value.stringValue === "Plant ID"
    );
    if (selector.length !== 1 || selector[0] === undefined)
        throw new Error("Cannot identify the Insights plant selector");
    const selectorRow = selector[0].row;
    const selectorA1 = `Insights!$B$${selectorRow + 1}`;
    const helperId = plantColorDataSheetId;
    /** @type {Record<string, unknown>[]} */
    const requests = [
        {
            addSheet: {
                properties: {
                    gridProperties: {
                        columnCount: 127,
                        frozenRowCount: 1,
                        rowCount: 5001,
                    },
                    hidden: true,
                    sheetId: helperId,
                    title: "Plant color data",
                },
            },
        },
    ];
    const aggregates = new Set([
        "Calibration status",
        "Care activity timeline",
        "Forecast basis across the collection",
    ]);
    requests.push({
        repeatCell: {
            cell: {
                userEnteredFormat: {
                    numberFormat: { pattern: "0.0", type: "NUMBER" },
                },
            },
            fields: "userEnteredFormat.numberFormat",
            range: { sheetId: helperId },
        },
    });
    let comparisonIndex = 0;
    let selectedColumn = 7;
    for (const chart of insights.charts) {
        if (aggregates.has(chart.spec.title)) continue;
        const spec = structuredClone(chart.spec);
        const basic = spec.basicChart;
        if (basic.headerCount !== 1 || basic.domains.length !== 1)
            throw new Error(`Unsupported chart headers: ${spec.title}`);
        if (spec.title.startsWith("Current dry-down cycle")) {
            const selected = colorSelectedChart(
                spec,
                metadata,
                selectorA1,
                selectedColumn
            );
            requests.push(...selected.requests);
            selectedColumn = selected.nextColumn;
        } else {
            requests.push(
                colorComparisonChart(spec, metadata, comparisonIndex),
                comparisonNumberFormat(spec.title, comparisonIndex)
            );
            comparisonIndex += 1;
        }
        spec.hiddenDimensionStrategy = "SHOW_ALL";
        requests.push({ updateChartSpec: { chartId: chart.chartId, spec } });
    }
    if (comparisonIndex !== 14 || selectedColumn !== 127)
        throw new Error("Plant chart layout changed");
    requests.push({
        addProtectedRange: {
            protectedRange: {
                description:
                    "Derived plant chart colors; edit source observations through the logger",
                range: { sheetId: helperId },
                warningOnly: true,
            },
        },
    });
    for (const plant of palette)
        requests.push({
            addConditionalFormatRule: {
                index: 0,
                rule: {
                    booleanRule: {
                        condition: {
                            type: "TEXT_EQ",
                            values: [{ userEnteredValue: plant.id }],
                        },
                        format: {
                            backgroundColorStyle: {
                                rgbColor: plantColor(plant.id),
                            },
                            textFormat: {
                                bold: true,
                                foregroundColorStyle: {
                                    rgbColor: plantColorText(plant.id),
                                },
                            },
                        },
                    },
                    ranges: [
                        {
                            endColumnIndex: 2,
                            endRowIndex: selectorRow + 1,
                            sheetId: insights.properties.sheetId,
                            startColumnIndex: 1,
                            startRowIndex: selectorRow,
                        },
                    ],
                },
            },
        });
    return requests;
}

/** @param {string} plant @param {string} ids @param {string} values */
export function fixedPlantMetricFormula(plant, ids, values) {
    return `=IFNA(INDEX(FILTER(${values},${ids}=${plant},ISNUMBER(${values})),1),"")`;
}

/** @param {string} selector @param {string} plantId @param {string} source */
export function selectedPlantColorFormula(selector, plantId, source) {
    return `=VSTACK(IF(${selector}="${plantId}",ARRAYFORMULA(IF(ISNUMBER(${source}),${source},"")),ARRAYFORMULA(IF(ROW(${source})>0,"",""))),IFERROR(INDEX(FILTER(${source},ISNUMBER(${source})),1),0))`;
}

/**
 * @param {import("../../test/plant-chart-colors-fixtures.d.ts").PlantColorChart["spec"]} spec
 * @param {import("../../test/plant-chart-colors-fixtures.d.ts").PlantColorSnapshot["metadata"]} metadata
 * @param {number} comparisonIndex
 */
function colorComparisonChart(spec, metadata, comparisonIndex) {
    const basic = spec.basicChart;
    const helperId = plantColorDataSheetId;

    const domain = singleSource(basic.domains[0]?.domain);
    const dataSheet = metadata.sheets.find(
        (sheet) => sheet.properties.sheetId === domain.sheetId
    );
    if (dataSheet === undefined)
        throw new Error(`Missing chart source: ${spec.title}`);
    const domainColumn = domain.startColumnIndex ?? 0;
    const keyColumn =
        dataSheet.properties.title === "Insights data" &&
        [
            21,
            27,
            29,
        ].includes(domainColumn)
            ? 26
            : domainColumn;
    const key = {
        ...domain,
        endColumnIndex: keyColumn + 1,
        startColumnIndex: keyColumn,
    };
    const keyA1 = nativeA1(metadata, key);
    const isScatter = basic.chartType === "SCATTER";
    const sources = [
        ...(isScatter ? [domain] : []),
        ...basic.series.map((entry) => singleSource(entry.series)),
    ];
    const row = comparisonIndex * 35;
    const rows = [
        [
            "Plant ID",
            ...sources.map(
                (source) =>
                    `=${nativeA1(metadata, { ...source, endRowIndex: (source.startRowIndex ?? 0) + 1 })}`
            ),
        ],
        ...palette.map((plant, index) => [
            plant.id,
            ...sources.map((source) =>
                fixedPlantMetricFormula(
                    `$A${row + index + 2}`,
                    keyA1,
                    nativeA1(metadata, source)
                )
            ),
        ]),
    ];
    const write = colorWrite(helperId, row, 0, rows);
    basic.domains = [
        { domain: colorData(helperId, row, isScatter ? 1 : 0, 31) },
    ];
    for (const [index, series] of basic.series.entries()) {
        series.series = colorData(
            helperId,
            row,
            index + (isScatter ? 2 : 1),
            31
        );
        series.styleOverrides = palette.map((plant, pointIndex) => ({
            colorStyle: { rgbColor: plantColor(plant.id) },
            index: pointIndex,
        }));
    }
    if (isScatter) {
        const series = basic.series[0];
        if (series === undefined)
            throw new Error("Shape-map series is missing");
        series.pointStyle = { ...series.pointStyle, size: 8 };
        series.dataLabel = {
            customLabelData: colorData(helperId, row, 0, 31),
            textFormat: { fontFamily: "Roboto", fontSize: 9 },
            type: "CUSTOM",
        };
    }
    return write;
}

/**
 * @param {number} sheetId @param {number} row @param {number} column @param
 *   {number} count
 */
function colorData(sheetId, row, column, count) {
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
 * @param {import("../../test/plant-chart-colors-fixtures.d.ts").PlantColorChart} chart
 * @param {string} plantId
 */
function colorPlantPageChart(chart, plantId) {
    const spec = structuredClone(chart.spec);
    for (const [seriesIndex, series] of spec.basicChart.series.entries()) {
        delete series.color;
        delete series.styleOverrides;
        series.colorStyle = { rgbColor: plantColor(plantId) };
        if (
            spec.basicChart.chartType === "LINE" &&
            spec.basicChart.series.length > 1
        ) {
            series.lineStyle = {
                type: seriesIndex === 0 ? "SOLID" : "MEDIUM_DASHED",
                width: 2,
            };
            series.pointStyle = {
                shape: seriesIndex === 0 ? "CIRCLE" : "DIAMOND",
                size: 5,
            };
        }
    }

    return { updateChartSpec: { chartId: chart.chartId, spec } };
}

/**
 * @param {import("../../test/plant-chart-colors-fixtures.d.ts").PlantColorChart["spec"]} spec
 * @param {import("../../test/plant-chart-colors-fixtures.d.ts").PlantColorSnapshot["metadata"]} metadata
 * @param {string} selectorA1 @param {number} firstColumn
 */
function colorSelectedChart(spec, metadata, selectorA1, firstColumn) {
    const basic = spec.basicChart;
    const helperId = plantColorDataSheetId;
    let selectedColumn = firstColumn;
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    const domain = singleSource(basic.domains[0]?.domain);
    const domainHeader = nativeA1(metadata, {
        ...domain,
        endRowIndex: (domain.startRowIndex ?? 0) + 1,
    });
    const domainValues = nativeA1(metadata, {
        ...domain,
        startRowIndex: (domain.startRowIndex ?? 0) + 1,
    });
    // A numeric sentinel at a blank x-coordinate keeps Sheets from discarding
    // inactive color series. Reuse an actual metric value so it cannot expand
    // the y-axis; the blank domain gives it no plotted coordinate.
    requests.push(
        colorWrite(helperId, 0, 6, [
            [`=${domainHeader}`],
            [`=VSTACK(ARRAYFORMULA(${domainValues}),"")`],
        ])
    );
    basic.domains = [{ domain: colorData(helperId, 0, 6, 5001) }];
    /** @type {import("../../test/plant-chart-colors-fixtures.d.ts").PlantColorSeries[]} */
    const series = [];
    for (const plant of palette) {
        for (const [metricIndex, original] of basic.series.entries()) {
            if (selectedColumn >= 127)
                throw new Error("Selected-cycle series layout changed");
            const source = singleSource(original.series);
            const sourceA1 = nativeA1(metadata, {
                ...source,
                startRowIndex: (source.startRowIndex ?? 0) + 1,
            });
            const metric =
                basic.series.length === 1
                    ? "Interval loss"
                    : [
                          "Measured weight",
                          "Dry reference",
                          "Wet reference",
                      ][metricIndex];
            if (metric === undefined)
                throw new Error("Selected-cycle metrics changed");
            requests.push(
                colorWrite(helperId, 0, selectedColumn, [
                    [`${plant.id} · ${metric}`],
                    [selectedPlantColorFormula(selectorA1, plant.id, sourceA1)],
                ])
            );
            const colored = structuredClone(original);
            delete colored.color;
            delete colored.styleOverrides;
            colored.colorStyle = { rgbColor: plantColor(plant.id) };
            colored.series = colorData(helperId, 0, selectedColumn, 5001);
            colored.pointStyle = {
                shape:
                    metricIndex === 0
                        ? "CIRCLE"
                        : metricIndex === 1
                          ? "DIAMOND"
                          : "SQUARE",
                size: metricIndex === 0 ? 5 : 2,
            };
            colored.lineStyle = {
                type:
                    metricIndex === 0
                        ? "SOLID"
                        : metricIndex === 1
                          ? "DOTTED"
                          : "MEDIUM_DASHED",
                width: 2,
            };
            series.push(colored);
            selectedColumn += 1;
        }
    }
    basic.series = series;
    basic.legendPosition = "NO_LEGEND";
    spec.subtitle =
        basic.series.length === 90
            ? "Selected plant color • solid circles: measured • dotted diamonds: dry • dashed squares: wet"
            : "Selected plant color • loss since the previous reading • negative values are gains";
    spec.altText = `${spec.title}. ${spec.subtitle}`;
    return { nextColumn: selectedColumn, requests };
}

/**
 * @param {number} sheetId @param {number} row @param {number} column @param
 *   {string[][]} values
 */
function colorWrite(sheetId, row, column, values) {
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

/** @param {string} title @param {number} block */
function comparisonNumberFormat(title, block) {
    const isPercentage =
        title === "Relative water remaining by plant" ||
        title === "Drying speed relative to pot capacity";
    const whole = new Set([
        "Data-quality follow-ups by plant",
        "Evidence behind the dry-down models",
        "Tracking coverage by plant",
        "Watering recency by plant",
    ]);
    return {
        repeatCell: {
            cell: {
                userEnteredFormat: {
                    numberFormat: {
                        pattern: isPercentage
                            ? "0.0%"
                            : whole.has(title)
                              ? "0"
                              : "0.0",
                        type: isPercentage ? "PERCENT" : "NUMBER",
                    },
                },
            },
            fields: "userEnteredFormat.numberFormat",
            range: {
                endColumnIndex: 6,
                endRowIndex: block * 35 + 31,
                sheetId: plantColorDataSheetId,
                startColumnIndex: 1,
                startRowIndex: block * 35 + 1,
            },
        },
    };
}

/**
 * @param {import("../../test/plant-chart-colors-fixtures.d.ts").PlantColorSnapshot["metadata"]} metadata
 * @param {import("../../test/workbook-fixtures.d.ts").GridRange} range
 */
function nativeA1(metadata, range) {
    const sheet = metadata.sheets.find(
        (item) => item.properties.sheetId === range.sheetId
    );
    if (
        sheet === undefined ||
        range.endRowIndex === undefined ||
        range.endColumnIndex === undefined ||
        range.endColumnIndex !== (range.startColumnIndex ?? 0) + 1
    )
        throw new Error("Unbounded or unsupported chart source");
    const column = sheetColumn(range.endColumnIndex);
    return `'${sheet.properties.title.replaceAll("'", "''")}'!$${column}$${(range.startRowIndex ?? 0) + 1}:$${column}$${range.endRowIndex}`;
}

/**
 * Choose the more legible black or white text for a plant-colored cell.
 *
 * @param {string} plantId
 */
function plantColorText(plantId) {
    const { blue, green, red } = plantColor(plantId);
    const linear = [
        red,
        green,
        blue,
    ].map((channel) =>
        channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4
    );
    const luminance =
        (linear[0] ?? 0) * 0.2126 +
        (linear[1] ?? 0) * 0.7152 +
        (linear[2] ?? 0) * 0.0722;
    const channel = luminance > 0.179 ? 0 : 1;
    return { blue: channel, green: channel, red: channel };
}

/** @param {number} index */
function sheetColumn(index) {
    let result = "";
    for (let value = index; value > 0; value = Math.floor((value - 1) / 26))
        result = String.fromCodePoint(65 + ((value - 1) % 26)) + result;
    return result;
}

/** @param {import("../../test/workbook-fixtures.d.ts").ChartData | undefined} data */
function singleSource(data) {
    const sources = data?.sourceRange.sources;
    if (sources?.length !== 1 || sources[0] === undefined)
        throw new Error("Expected one contiguous chart source");
    return sources[0];
}
