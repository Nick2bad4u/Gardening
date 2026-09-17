import { plantColor } from "./plant-chart-colors.mjs";
import palette from "./plant-colors.json" with { type: "json" };

const intervalFont = "JetBrains Mono";

export const wateringIntervalSheetId = 907_202_605;
export const wateringIntervalTitle = "Time between waterings";

/**
 * Plan an additive native Sheets migration from freshly read chart metadata,
 * History headers, and every plant page's A108:K132 destination cells. Apply
 * helperRequests first, verify calculated sources, then apply chartRequests. No
 * credentials, network access, logger deployment, or canonical-data writes.
 *
 * @param {import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot} snapshot
 */
export function buildWateringIntervalRequests({ cells, metadata }) {
    if (
        metadata.sheets.some(
            (sheet) =>
                sheet.properties.title === "Watering intervals" ||
                sheet.properties.sheetId === wateringIntervalSheetId
        )
    )
        throw new Error(
            "Watering intervals already exists; do not replay installation"
        );
    for (const [column, label] of /** @type {[number, string][]} */ ([
        [0, "Date"],
        [1, "Plant ID"],
        [2, "Event"],
        [35, "Record status"],
    ])) {
        if (
            cells.every(
                (cell) =>
                    cell.sheet !== "History" ||
                    cell.row !== 0 ||
                    cell.column !== column ||
                    cell.value.stringValue !== label
            )
        )
            throw new Error(`Unexpected History header: ${label}`);
    }
    const history = metadata.sheets.find(
        (sheet) => sheet.properties.title === "History"
    );
    if (history?.properties.gridProperties.rowCount !== 5000)
        throw new Error(
            "Review the History capacity before installing interval charts"
        );
    const pages = metadata.sheets.filter((sheet) =>
        /^P\d{2} /v.test(sheet.properties.title)
    );
    if (pages.length !== palette.length)
        throw new Error("Expected exactly 30 plant pages");
    const sheetId = wateringIntervalSheetId;
    /** @type {Record<string, unknown>[]} */
    const helperRequests = [
        {
            addSheet: {
                properties: {
                    gridProperties: {
                        columnCount: 90,
                        frozenRowCount: 1,
                        rowCount: 5000,
                    },
                    hidden: true,
                    sheetId,
                    title: "Watering intervals",
                },
            },
        },
        {
            addProtectedRange: {
                protectedRange: {
                    description:
                        "Derived watering intervals; edit the canonical History through the logger.",
                    range: { sheetId },
                    warningOnly: true,
                },
            },
        },
    ];
    /** @type {Record<string, unknown>[]} */
    const chartRequests = [];
    for (const [index, plant] of palette.entries()) {
        const matches = pages.filter((sheet) =>
            sheet.properties.title.startsWith(`${plant.id} `)
        );
        const page = matches[0];
        if (
            !page ||
            matches.length !== 1 ||
            page.charts?.length !== 3 ||
            page.charts.some(
                (chart) =>
                    !chart.position ||
                    chart.position.overlayPosition.anchorCell.rowIndex >= 108
            )
        )
            throw new Error(`Review the existing chart layout for ${plant.id}`);
        if (
            cells.some(
                (cell) =>
                    cell.sheet === page.properties.title &&
                    cell.row >= 107 &&
                    cell.row < 132 &&
                    cell.column < 11 &&
                    Object.values(cell.value).some((value) => value !== "")
            )
        )
            throw new Error(`Occupied interval-chart destination: ${plant.id}`);
        const startColumnIndex = index * 3;
        const daysColumn = columnName(startColumnIndex + 2);
        const data = (/** @type {number} */ column) => ({
            sourceRange: {
                sources: [
                    {
                        endColumnIndex: column + 1,
                        endRowIndex: 5000,
                        sheetId,
                        startColumnIndex: column,
                        startRowIndex: 0,
                    },
                ],
            },
        });
        helperRequests.push(
            {
                updateCells: {
                    fields: "userEnteredValue,note",
                    rows: [
                        {
                            values: [
                                "Previous watering",
                                "Watering date",
                                "Days between waterings",
                            ].map((label) => ({
                                userEnteredValue: {
                                    stringValue: `${plant.id} · ${label}`,
                                },
                            })),
                        },
                        {
                            values: [
                                {
                                    note: "Distinct active Water dates, sorted oldest first. Same-day entries combine. All watering applications and pot setups are included. First date has no interval. Calendar-day differences, not a recommended schedule.",
                                    userEnteredValue: {
                                        formulaValue: wateringIntervalFormula(
                                            plant.id
                                        ),
                                    },
                                },
                            ],
                        },
                    ],
                    start: {
                        columnIndex: startColumnIndex,
                        rowIndex: 0,
                        sheetId,
                    },
                },
            },
            {
                repeatCell: {
                    cell: {
                        userEnteredFormat: {
                            numberFormat: {
                                pattern: "mmm d, yyyy",
                                type: "DATE",
                            },
                        },
                    },
                    fields: "userEnteredFormat.numberFormat",
                    range: {
                        endColumnIndex: startColumnIndex + 2,
                        endRowIndex: 5000,
                        sheetId,
                        startColumnIndex,
                        startRowIndex: 1,
                    },
                },
            },
            {
                repeatCell: {
                    cell: {
                        userEnteredFormat: {
                            numberFormat: {
                                pattern: '0" days"',
                                type: "NUMBER",
                            },
                        },
                    },
                    fields: "userEnteredFormat.numberFormat",
                    range: {
                        endColumnIndex: startColumnIndex + 3,
                        endRowIndex: 5000,
                        sheetId,
                        startColumnIndex: startColumnIndex + 2,
                        startRowIndex: 1,
                    },
                },
            },
            {
                updateCells: {
                    fields: "userEnteredValue,note",
                    rows: [
                        {
                            values: [
                                {
                                    note: "The chart below updates from History. Days since the latest watering remain in E6; that unfinished interval is not plotted here.",
                                    userEnteredValue: {
                                        formulaValue: `=LET(intervals,COUNT('Watering intervals'!${daysColumn}2:${daysColumn}5000),IF(intervals=0,"Time between waterings · waiting for a second watering date","Time between waterings · latest gap: "&INDEX('Watering intervals'!${daysColumn}2:${daysColumn}5000,intervals)&" days · "&intervals&IF(intervals=1," completed interval"," completed intervals")))`,
                                    },
                                },
                            ],
                        },
                    ],
                    start: {
                        columnIndex: 0,
                        rowIndex: 108,
                        sheetId: page.properties.sheetId,
                    },
                },
            },
            {
                mergeCells: {
                    mergeType: "MERGE_ALL",
                    range: {
                        endColumnIndex: 8,
                        endRowIndex: 109,
                        sheetId: page.properties.sheetId,
                        startColumnIndex: 0,
                        startRowIndex: 108,
                    },
                },
            },
            {
                repeatCell: {
                    cell: {
                        userEnteredFormat: {
                            textFormat: {
                                bold: true,
                                fontFamily: intervalFont,
                                fontSize: 12,
                                foregroundColorStyle: {
                                    rgbColor: {
                                        blue: 0.17,
                                        green: 0.24,
                                        red: 0.09,
                                    },
                                },
                            },
                            verticalAlignment: "MIDDLE",
                            wrapStrategy: "WRAP",
                        },
                    },
                    fields: "userEnteredFormat",
                    range: {
                        endColumnIndex: 8,
                        endRowIndex: 109,
                        sheetId: page.properties.sheetId,
                        startColumnIndex: 0,
                        startRowIndex: 108,
                    },
                },
            },
            {
                updateDimensionProperties: {
                    fields: "pixelSize",
                    properties: { pixelSize: 36 },
                    range: {
                        dimension: "ROWS",
                        endIndex: 109,
                        sheetId: page.properties.sheetId,
                        startIndex: 108,
                    },
                },
            }
        );
        chartRequests.push({
            addChart: {
                chart: {
                    position: {
                        overlayPosition: {
                            anchorCell: {
                                columnIndex: 0,
                                rowIndex: 110,
                                sheetId: page.properties.sheetId,
                            },
                            heightPixels: 440,
                            offsetYPixels: 7,
                            widthPixels: 952,
                        },
                    },
                    spec: {
                        altText: `${plant.id}: completed intervals between recorded watering dates. Taller bars mean more days. Requires two distinct watering dates; this describes past care, not a watering schedule.`,
                        basicChart: {
                            axis: [
                                {
                                    position: "BOTTOM_AXIS",
                                    title: "Watering date",
                                },
                                {
                                    position: "LEFT_AXIS",
                                    title: "Days since previous watering",
                                    viewWindowOptions: { viewWindowMin: 0 },
                                },
                            ],
                            chartType: "COLUMN",
                            domains: [{ domain: data(startColumnIndex + 1) }],
                            headerCount: 1,
                            legendPosition: "NO_LEGEND",
                            series: [
                                {
                                    colorStyle: {
                                        rgbColor: plantColor(plant.id),
                                    },
                                    dataLabel: {
                                        placement: "OUTSIDE_END",
                                        textFormat: {
                                            bold: true,
                                            fontFamily: intervalFont,
                                            fontSize: 12,
                                        },
                                        type: "DATA",
                                    },
                                    series: data(startColumnIndex + 2),
                                    targetAxis: "LEFT_AXIS",
                                },
                            ],
                        },
                        fontName: intervalFont,
                        hiddenDimensionStrategy: "SHOW_ALL",
                        subtitle:
                            "Calendar days · date = later watering · same-day entries combined · all pot setups",
                        subtitleTextFormat: { fontSize: 10 },
                        subtitleTextPosition: { horizontalAlignment: "CENTER" },
                        title: wateringIntervalTitle,
                        titleTextFormat: {
                            bold: true,
                            fontSize: 16,
                            foregroundColorStyle: {
                                rgbColor: {
                                    blue: 0.176,
                                    green: 0.31,
                                    red: 0.082,
                                },
                            },
                        },
                        titleTextPosition: { horizontalAlignment: "CENTER" },
                    },
                },
            },
        });
    }
    return { chartRequests, helperRequests };
}

/**
 * Repair styles Google discarded while an interval chart had no series. Counts
 * must come from a fresh read of calculated positive gaps, never from the
 * existence of helper formulas. This changes chart specifications only: IDs,
 * positions, unrelated charts, and canonical data remain untouched.
 *
 * @param {import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot} snapshot
 * @param {string[]} plantIds
 * @param {{ completedIntervalsByPlant: Record<string, number> }} options
 *
 * @returns {Record<string, unknown>[]}
 */
export function buildWateringIntervalStyleRepairRequests(
    { metadata },
    plantIds,
    { completedIntervalsByPlant }
) {
    const uniquePlants = new Set(plantIds);
    if (uniquePlants.size !== plantIds.length)
        throw new Error("Do not repeat plants in an interval style repair");
    const helpers = metadata.sheets.filter(
        ({ properties }) =>
            properties.sheetId === wateringIntervalSheetId ||
            properties.title === "Watering intervals"
    );
    const helper = helpers[0];
    if (
        helpers.length !== 1 ||
        helper?.properties.sheetId !== wateringIntervalSheetId ||
        helper.properties.title !== "Watering intervals" ||
        helper.properties.gridProperties.rowCount !== 5000 ||
        helper.properties.gridProperties.columnCount !== 90
    )
        throw new Error("Review the installed Watering intervals helper");
    return plantIds.map((plantId) => {
        const index = palette.findIndex(({ id }) => id === plantId);
        if (index === -1) throw new Error(`Unknown plant: ${plantId}`);
        const count = completedIntervalsByPlant[plantId];
        if (count === undefined || !Number.isSafeInteger(count) || count <= 0)
            throw new Error(
                `Verify positive completed intervals for ${plantId}`
            );
        const chart = intervalRepairChart(metadata, plantId);
        const spec = structuredClone(chart.spec);
        const basic =
            /**
             * @type {Omit<typeof spec.basicChart, "series" | "axis"> & {
             *     chartType?: string;
             *     series?: import("../../test/workbook-fixtures.d.ts").ChartSeries[];
             *     axis?: IntervalRepairAxis[];
             * }}
             */ (spec.basicChart);
        const series = basic.series ?? [];
        if (
            basic.chartType !== "COLUMN" ||
            basic.domains.length !== 1 ||
            !intervalRepairRangeMatches(
                basic.domains[0]?.domain,
                index * 3 + 1
            ) ||
            series.length > 1 ||
            (series.length === 1 &&
                !intervalRepairRangeMatches(series[0]?.series, index * 3 + 2))
        )
            throw new Error(
                `Unexpected watering interval source bindings for ${plantId}`
            );
        const repairedAxes = intervalRepairAxes(basic.axis ?? [], plantId);
        return {
            updateChartSpec: {
                chartId: chart.chartId,
                spec: {
                    ...spec,
                    basicChart: {
                        ...basic,
                        axis: repairedAxes,
                        series: [
                            {
                                ...series[0],
                                colorStyle: { rgbColor: plantColor(plantId) },
                                dataLabel: {
                                    placement: "OUTSIDE_END",
                                    textFormat: {
                                        bold: true,
                                        fontFamily: intervalFont,
                                        fontSize: 12,
                                    },
                                    type: "DATA",
                                },
                                series: series[0]?.series ?? {
                                    sourceRange: {
                                        sources: [
                                            {
                                                endColumnIndex: index * 3 + 3,
                                                endRowIndex: 5000,
                                                sheetId:
                                                    wateringIntervalSheetId,
                                                startColumnIndex: index * 3 + 2,
                                                startRowIndex: 0,
                                            },
                                        ],
                                    },
                                },
                                targetAxis: "LEFT_AXIS",
                            },
                        ],
                    },
                },
            },
        };
    });
}

/**
 * Calendar dates follow the workbook time zone, including date-only imports.
 *
 * @param {string} plantId
 */
export function wateringIntervalFormula(plantId) {
    if (palette.every((plant) => plant.id !== plantId))
        throw new Error(`Unknown plant: ${plantId}`);
    return `=IFNA(LET(dates,SORT(UNIQUE(ARRAYFORMULA(INT(FILTER(History!$A$2:$A$5000,History!$B$2:$B$5000="${plantId}",History!$C$2:$C$5000="Water",History!$AJ$2:$AJ$5000<>"Removed",ISNUMBER(History!$A$2:$A$5000),History!$A$2:$A$5000>0)))),1,TRUE),count,ROWS(dates),IF(count<2,{"","",""},LET(previous,FILTER(dates,SEQUENCE(count)<count),current,FILTER(dates,SEQUENCE(count)>1),HSTACK(previous,current,ARRAYFORMULA(current-previous))))),{"","",""})`;
}

/** @param {number} column */
function columnName(column) {
    let name = "";
    for (
        let value = column + 1;
        value > 0;
        value = Math.floor((value - 1) / 26)
    )
        name = String.fromCodePoint(65 + ((value - 1) % 26)) + name;
    return name;
}

/**
 * @typedef {{
 *     position: string;
 *     title?: string;
 *     format?: Record<string, unknown>;
 *     viewWindowOptions?: Record<string, unknown>;
 * }} IntervalRepairAxis
 */

/** @param {IntervalRepairAxis[]} axes @param {string} plantId */
function intervalRepairAxes(axes, plantId) {
    if (axes.filter(({ position }) => position === "LEFT_AXIS").length > 1)
        throw new Error(`Duplicate watering interval left axis for ${plantId}`);
    const left = axes.find(({ position }) => position === "LEFT_AXIS");
    const restored = {
        ...left,
        format: { fontFamily: intervalFont, ...left?.format },
        position: "LEFT_AXIS",
        title: "Days since previous watering",
        viewWindowOptions: { ...left?.viewWindowOptions, viewWindowMin: 0 },
    };
    return left
        ? axes.map((axis) => (axis.position === "LEFT_AXIS" ? restored : axis))
        : [...axes, restored];
}

/**
 * @param {import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot["metadata"]} metadata
 * @param {string} plantId
 */
function intervalRepairChart(metadata, plantId) {
    const pages = metadata.sheets.filter(({ properties }) =>
        properties.title.startsWith(`${plantId} `)
    );
    const page = pages[0];
    const charts =
        page?.charts?.filter(
            ({ spec }) => spec.title === wateringIntervalTitle
        ) ?? [];
    const chart = charts[0];
    if (pages.length !== 1 || charts.length !== 1 || !chart?.position)
        throw new Error(
            `Review the unique watering interval chart for ${plantId}`
        );
    return chart;
}

/**
 * @param {import("../../test/workbook-fixtures.d.ts").ChartData | undefined} data
 * @param {number} column
 */
function intervalRepairRangeMatches(data, column) {
    const sources = data?.sourceRange.sources ?? [];
    const range = sources[0];
    return (
        sources.length === 1 &&
        range?.sheetId === wateringIntervalSheetId &&
        (range.startRowIndex ?? 0) === 0 &&
        range.endRowIndex === 5000 &&
        range.startColumnIndex === column &&
        range.endColumnIndex === column + 1
    );
}
