import { describe, expect, it } from "vitest";

import {
    assertHistoryCapacityPreconditions,
    buildHistoryCapacityRequests,
    extendHistoryFormulaReferences,
    recentHistoryChartFormula,
} from "../../scripts/google-sheets/history-capacity.mjs";
import { wateringIntervalFormula } from "../../scripts/google-sheets/watering-intervals.mjs";
import { required } from "../helpers/required.mjs";

/**
 * @returns {{
 *     snapshot: import("../../types/history-capacity.d.ts").HistoryCapacitySnapshot;
 *     options: import("../../types/history-capacity.d.ts").HistoryCapacityOptions;
 * }}
 */
function fixture() {
    const ids = [
        ...Array.from({ length: 32 }, (_, index) => index + 1),
        35,
        36,
        37,
        38,
    ].map((number) => `P${String(number).padStart(2, "0")}`);
    const dimensions = /** @type {[string, number, number][]} */ ([
        [
            "Dashboard",
            254,
            33,
        ],
        [
            "RO refills",
            1000,
            20,
        ],
        [
            "Insights",
            1000,
            23,
        ],
        [
            "Plant tracker",
            1000,
            36,
        ],
        [
            "History",
            5000,
            67,
        ],
        [
            "History view",
            5000,
            67,
        ],
        [
            "Baselines",
            1000,
            36,
        ],
        ...ids.map(
            (id) =>
                /** @type {[string, number, number]} */ ([
                    `${id} Synthetic plant`,
                    5139,
                    22,
                ])
        ),
        [
            "Quick log",
            103,
            15,
        ],
        [
            "Plant colors",
            40,
            6,
        ],
        [
            "Integrity",
            414,
            10,
        ],
        [
            "Insights data",
            5000,
            30,
        ],
        [
            "Dry-down insights",
            5000,
            31,
        ],
        [
            "Plant color data",
            6023,
            159,
        ],
        [
            "Dry-down models",
            1000,
            26,
        ],
        [
            "Watering intervals",
            5000,
            108,
        ],
        [
            "App bulk",
            1000,
            74,
        ],
        [
            "App entries",
            1000,
            59,
        ],
        [
            "App insight activity",
            5000,
            4,
        ],
        [
            "App insight calibration",
            250,
            2,
        ],
        [
            "App insight followups",
            250,
            5,
        ],
        [
            "App plant charts",
            5000,
            8,
        ],
        [
            "Workbook calculations",
            38,
            6,
        ],
        [
            "Workbook analytics",
            5001,
            120,
        ],
        [
            "Watering calendar",
            40,
            57,
        ],
        [
            "Containers",
            100,
            26,
        ],
        [
            "Container members",
            100,
            26,
        ],
        [
            "Light & humidity",
            5188,
            22,
        ],
        [
            "Environment data",
            5000,
            27,
        ],
    ]);
    /** @type {import("../../types/history-capacity.d.ts").HistoryCapacitySnapshot} */
    const snapshot = {
        cells: [],
        chartsCaptured: true,
        metadata: {
            sheets: dimensions.map(
                (
                    [
                        title,
                        rowCount,
                        columnCount,
                    ],
                    sheetId
                ) => ({
                    charts: [],
                    properties: {
                        gridProperties: { columnCount, rowCount },
                        sheetId,
                        title,
                    },
                })
            ),
        },
        readRanges: dimensions.map(
            ([
                sheet,
                endRow,
                endColumn,
            ]) => ({
                endColumn,
                endRow,
                sheet,
                startColumn: 0,
                startRow: 0,
            })
        ),
    };
    const options = {
        activePlantIds: ids,
        historyHeaders: Array.from(
            { length: 67 },
            (_, index) => `Synthetic header ${index + 1}`
        ),
    };
    /**
     * @param {string} sheet @param {number} row @param {number} column @param
     *   {string | number} content
     */
    const add = (sheet, row, column, content) => {
        snapshot.cells.push({
            column,
            row,
            sheet,
            value:
                typeof content === "number"
                    ? { numberValue: content }
                    : content.startsWith("=")
                      ? { formulaValue: content }
                      : { stringValue: content },
        });
    };
    for (const [column, header] of options.historyHeaders.entries())
        add("History", 0, column, header);
    const intervalSheet = required(
        snapshot.metadata.sheets.find(
            (sheet) => sheet.properties.title === "Watering intervals"
        )
    );
    const anchorSeries = "{History!$O$2:$O$5000,History!$E$2:$E$5000}";
    for (const [index, id] of ids.entries()) {
        add("Plant tracker", index + 1, 0, id);
        const name = `${id} Synthetic plant`;
        const page = required(
            snapshot.metadata.sheets.find(
                (sheet) => sheet.properties.title === name
            )
        );
        page.charts = Array.from({ length: 4 }, (_, chartIndex) => {
            const range = {
                endColumnIndex: chartIndex === 3 ? 2 : 17,
                endRowIndex: chartIndex === 3 ? 5000 : 1000,
                sheetId:
                    chartIndex === 3
                        ? intervalSheet.properties.sheetId
                        : page.properties.sheetId,
                startColumnIndex: chartIndex === 3 ? 1 : 16,
                startRowIndex: chartIndex === 3 ? 0 : 11,
            };
            return {
                chartId: index * 4 + chartIndex,
                position: {
                    overlayPosition: {
                        anchorCell: {
                            columnIndex: 0,
                            rowIndex: chartIndex * 30,
                        },
                    },
                },
                spec: {
                    basicChart: {
                        axis: [{ position: "BOTTOM_AXIS", title: "Keep axis" }],
                        domains: [
                            {
                                domain: {
                                    sourceRange: { sources: [{ ...range }] },
                                },
                            },
                        ],
                        series: [
                            {
                                colorStyle: {
                                    rgbColor: {
                                        blue: 0.1,
                                        green: 0.6,
                                        red: 0.2,
                                    },
                                },
                                series: {
                                    sourceRange: {
                                        sources: [
                                            {
                                                ...range,
                                                endColumnIndex:
                                                    range.endColumnIndex + 1,
                                                startColumnIndex:
                                                    range.startColumnIndex + 1,
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                    },
                    subtitle: "Recorded evidence",
                    title: `Synthetic chart ${chartIndex}`,
                },
            };
        });
        add(
            name,
            12,
            16,
            `=IFERROR(SORT(FILTER(${anchorSeries},History!$B$2:$B$5000="${id}"),1,TRUE),"")`
        );
        add(
            name,
            12,
            18,
            `=IFNA(FILTER('App plant charts'!A2:D5000,'App plant charts'!B2:B5000="${id}"),"")`
        );
        add(
            name,
            140,
            0,
            `=IFNA(FILTER(History!A2:L5000,History!B2:B5000="${id}"),"")`
        );
        add("Watering intervals", 0, index * 3, `${id} · Previous watering`);
        add(
            "Watering intervals",
            1,
            index * 3,
            wateringIntervalFormula(id, { historyLastRow: 5000 })
        );
    }
    for (const [
        sheet,
        row,
        column,
        formula,
    ] of /** @type {[string, number, number, string][]} */ ([
        [
            "History view",
            0,
            0,
            "=LET(rows,History!A2:BO5000,VSTACK(History!A1:BO1,rows))",
        ],
        [
            "Dry-down models",
            1,
            0,
            "=GARDEN_DRY_DOWN({ARRAYFORMULA(N(History!A2:A5000)),History!B2:E5000,History!K2:K5000,History!P2:P5000,History!AD2:AD5000,History!AJ2:AJ5000,History!AO2:AO5000,History!AC2:AC5000,History!AI2:AI5000,History!AA2:AA5000,History!AE2:AE5000},'Plant tracker'!A2:A37)",
        ],
        [
            "Workbook analytics",
            0,
            0,
            '=GARDEN_CYCLE_COMPARISON(History!A2:AP5000,Insights!$B$228,IFNA(XLOOKUP(Insights!$B$228,Baselines!A2:A37,Baselines!T2:T37),""))',
        ],
        [
            "Environment data",
            0,
            0,
            "=GARDEN_ENVIRONMENT_READINGS(History!A2:BH5000)",
        ],
        [
            "Environment data",
            0,
            22,
            "=GARDEN_RECORDED_LOCATIONS(History!A2:BH5000)",
        ],
        [
            "App plant charts",
            1,
            0,
            '=IFNA(FILTER(History!A2:H5000,History!A2:A5000<>""),"")',
        ],
        [
            "Insights data",
            0,
            0,
            '=QUERY(History!A2:H5000,"select Col1",0)',
        ],
        [
            "App insight activity",
            1,
            0,
            "=IFNA(FILTER('Insights data'!A2:D5000,'Insights data'!A2:A5000<>\"\"),\"\")",
        ],
        [
            "Light & humidity",
            189,
            0,
            "=IFNA(FILTER('Environment data'!A2:L5000,'Environment data'!B2:B5000=$B$116),\"\")",
        ],
        [
            "Dry-down insights",
            1,
            25,
            '=IFNA(FILTER({History!A2:A5000,History!E2:E5000},History!B2:B5000="P01"),"")',
        ],
        [
            "Integrity",
            61,
            0,
            '=IFNA(FILTER(History!A2:H5000,History!A2:A5000=""),"No errors")',
        ],
        [
            "Integrity",
            4,
            5,
            "=IFERROR(N(FORMULATEXT('Dry-down models'!A2)<>\"=GARDEN_DRY_DOWN(History!A2:AP5000)\"),1)",
        ],
        [
            "Integrity",
            11,
            5,
            "=MAX(0,4999-F11)",
        ],
        [
            "Integrity",
            12,
            6,
            '=IF(F13=5000,"Info","Fail")',
        ],
        [
            "P01 Synthetic plant",
            15,
            1,
            "=IFNA(MIN(FILTER('Watering intervals'!$C$2:$C$5000,ISNUMBER('Watering intervals'!$C$2:$C$5000),'Watering intervals'!$C$2:$C$5000>0)),\"\")",
        ],
        [
            "P01 Synthetic plant",
            108,
            0,
            "=LET(intervals,COUNT('Watering intervals'!C2:C5000),IF(intervals=0,\"Waiting\",INDEX('Watering intervals'!C2:C5000,intervals)))",
        ],
        [
            "Workbook analytics",
            1,
            6,
            "=IFNA(LET(gaps,FILTER('Watering intervals'!$C$2:$C$5000,ISNUMBER('Watering intervals'!$C$2:$C$5000)),IF(ROWS(gaps)<2,\"\",INDEX(gaps,ROWS(gaps)-1))),\"\")",
        ],
        [
            "History",
            1,
            13,
            '=IF(OR(B2="",E2="",K2=""),"",LET(anchor,IFNA(MAX(FILTER($A$2:$A$5000,$B$2:$B$5000=B2,$K$2:$K$5000=K2,$A$2:$A$5000<=A2,REGEXMATCH($C$2:$C$5000,"^(Water|Repot)$"),$AJ$2:$AJ$5000<>"Removed")),0),IF(anchor=0,"",anchor)))',
        ],
    ]))
        add(sheet, row, column, formula);
    const materializedAnchors = snapshot.cells.filter(
        (cell) =>
            (cell.sheet === "Dry-down models" &&
                cell.row === 1 &&
                cell.column === 0) ||
            (cell.row === 0 &&
                ((cell.sheet === "Workbook analytics" && cell.column === 0) ||
                    (cell.sheet === "Environment data" &&
                        (cell.column === 0 || cell.column === 22))))
    );
    const anchorChecks = materializedAnchors
        .map(
            (cell) =>
                `N(IFERROR(FORMULATEXT('${cell.sheet}'!${cell.column === 22 ? "W" : "A"}${cell.row + 1}),"")<>"${required(cell.value.formulaValue).replaceAll('"', '""')}")`
        )
        .join(",");
    required(
        snapshot.cells.find(
            (cell) => cell.sheet === "Integrity" && cell.row === 4
        )
    ).value = {
        formulaValue: `=IFERROR(SUM(${anchorChecks},N(IFERROR(FORMULATEXT('Workbook calculations'!E2),"")<>"=NOW()"),N(NOT(ISFORMULA('Workbook calculations'!B2)))),1)`,
    };
    add("Workbook analytics", 1, 9, '=VSTACK(A2:A5000,"")');
    for (const [index, id] of ids.entries()) {
        const startColumn = 10 + index * 3 + (index >= 34 ? 2 : 0);
        for (const [role, column] of [
            "B",
            "C",
            "D",
        ].entries()) {
            add(
                "Workbook analytics",
                0,
                startColumn + role,
                `="${id} · "&${column}1`
            );
            add(
                "Workbook analytics",
                1,
                startColumn + role,
                `=VSTACK(${column}2:${column}5000,0)`
            );
        }
    }
    add("Workbook analytics", 1, 112, "=VSTACK(C2:C5000,0)");
    add("Workbook analytics", 1, 113, "=VSTACK(D2:D5000,0)");
    add(
        "Insights",
        836,
        0,
        `=B228&" · "&XLOOKUP(B228,'Plant tracker'!$A$2:$A$37,'Plant tracker'!$B$2:$B$37,"")`
    );
    add("Insights", 837, 0, `="Solid circles: "&'Workbook analytics'!B1`);
    add(
        "Insights",
        838,
        0,
        `="Dotted diamonds: "&'Workbook analytics'!C1&" · Dashed squares: "&'Workbook analytics'!D1`
    );
    add("History", 1, 0, 46_300);
    add("History", 1, 1, "P01");
    add("History", 1, 37, '=IF(F2="","",F2/2.54)');
    add("App entries", 1, 0, "Pending real observation");
    add("App bulk", 1, 0, "Pending real batch");
    add("RO refills", 1, 0, "Preserve refill");
    add("Plant color data", 5001, 0, "Keep comparison block");
    add("Integrity", 12, 5, 5000);
    add(
        "Integrity",
        12,
        7,
        "Includes row 1 headers; 4,999 supported observation slots."
    );
    return { options, snapshot };
}

function missingSeriesFixture() {
    const result = fixture();
    const repairs = [
        {
            chartId: 213_038_661,
            columns: [86],
            dimension: false,
            domain: 85,
            plant: "P29",
            rgb: { blue: 114 / 255, green: 69 / 255, red: 119 / 255 },
        },
        {
            chartId: 1_578_223_443,
            columns: [89],
            dimension: false,
            domain: 88,
            plant: "P30",
            rgb: { blue: 108 / 255, green: 156 / 255, red: 126 / 255 },
        },
        {
            chartId: 801_463_046,
            columns: [20, 21],
            dimension: true,
            domain: 18,
            plant: "P38",
            rgb: { blue: 137 / 255, green: 156 / 255, red: 61 / 255 },
        },
    ];
    const intervalSheet = required(
        result.snapshot.metadata.sheets.find(
            (sheet) => sheet.properties.title === "Watering intervals"
        )
    );
    for (const repair of repairs) {
        const page = required(
            result.snapshot.metadata.sheets.find((sheet) =>
                sheet.properties.title.startsWith(`${repair.plant} `)
            )
        );
        const chart = required(page.charts?.[repair.dimension ? 2 : 3]);
        chart.chartId = repair.chartId;
        chart.spec.title = repair.dimension
            ? "Plant dimensions • measurement history"
            : "Time between waterings";
        const basic = {
            ...chart.spec.basicChart,
            axis: repair.dimension
                ? [{ position: "BOTTOM_AXIS", title: "Date" }]
                : [
                      { position: "BOTTOM_AXIS", title: "Watering date" },
                      { position: "LEFT_AXIS" },
                  ],
            chartType: repair.dimension ? "LINE" : "COLUMN",
            domains: [
                {
                    domain: {
                        sourceRange: {
                            sources: [
                                {
                                    endColumnIndex: repair.domain + 1,
                                    endRowIndex: repair.dimension ? 1000 : 5000,
                                    sheetId: repair.dimension
                                        ? page.properties.sheetId
                                        : intervalSheet.properties.sheetId,
                                    startColumnIndex: repair.domain,
                                    startRowIndex: repair.dimension ? 11 : 0,
                                },
                            ],
                        },
                    },
                },
            ],
            headerCount: 1,
            series: [],
        };
        chart.spec.basicChart = basic;
    }
    const unrelated = required(
        result.snapshot.metadata.sheets.find((sheet) =>
            sheet.properties.title.startsWith("P28 ")
        )?.charts?.[3]
    );
    unrelated.chartId = 1_834_724_344;
    unrelated.spec.basicChart.series = [];
    return { ...result, repairs };
}

describe("history capacity migration", () => {
    it("accepts recalculated effective values while rejecting canonical value and validation drift", () => {
        expect.hasAssertions();

        const { options, snapshot } = fixture();
        const canonical = required(
            snapshot.cells.find(
                (cell) =>
                    cell.sheet === "History" &&
                    cell.row === 1 &&
                    cell.column === 0
            )
        );
        canonical.effectiveValue = { numberValue: 46_300 };
        canonical.dataValidation = {
            condition: { type: "DATE_IS_VALID" },
            strict: true,
        };
        const plan = buildHistoryCapacityRequests(snapshot, options);
        const refreshed = structuredClone(snapshot);
        const recalculated = required(
            refreshed.cells.find(
                (cell) =>
                    cell.sheet === "History" &&
                    cell.row === 1 &&
                    cell.column === 0
            )
        );
        recalculated.effectiveValue = { numberValue: 46_301 };

        expect(() => {
            assertHistoryCapacityPreconditions(plan, refreshed);
        }).not.toThrow();

        recalculated.value = { numberValue: 46_301 };

        expect(() => {
            assertHistoryCapacityPreconditions(plan, refreshed);
        }).toThrow("Workbook drift");

        const validationDrift = structuredClone(snapshot);
        const changedValidation = required(
            validationDrift.cells.find(
                (cell) =>
                    cell.sheet === "History" &&
                    cell.row === 1 &&
                    cell.column === 0
            )
        );
        required(changedValidation.dataValidation).strict = false;

        expect(() => {
            assertHistoryCapacityPreconditions(plan, validationDrift);
        }).toThrow("Workbook drift");
    });

    it("selects recent anchor-chart readings by observation date and ledger row before restoring elapsed days", () => {
        expect.hasAssertions();

        const { options, snapshot } = fixture();
        const { edits } = buildHistoryCapacityRequests(snapshot, options);
        const anchor = required(
            edits.find(
                (edit) =>
                    edit.sheet === "P01 Synthetic plant" &&
                    edit.row === 12 &&
                    edit.column === 16
            )
        );

        expect(anchor.after).toBe(
            '=IFERROR(LET(records,FILTER({History!$A$2:$A$50001,ROW(History!$A$2:$A$50001),History!$O$2:$O$50001,History!$E$2:$E$50001},History!$B$2:$B$50001="P01"),recent,SORTN(records,4999,0,1,FALSE,2,FALSE),SORT(CHOOSECOLS(recent,3,4),1,TRUE)),"")'
        );
    });

    it("allocates full projections within the budget without growing wide chart helpers or every plant", () => {
        expect.hasAssertions();

        const { options, snapshot } = fixture();
        const original = structuredClone(snapshot);
        const plan = buildHistoryCapacityRequests(snapshot, options);

        expect(plan.observationCapacity).toBe(50_000);
        expect(plan.historyLastRow).toBe(50_001);
        expect(plan.allocatedCellsBefore).toBe(7_749_766);
        expect(plan.allocatedCellsAfter).toBe(18_371_651);
        expect(snapshot).toStrictEqual(original);

        const grows = plan.prepareRequests.filter(
            (request) => request["appendDimension"] !== undefined
        );

        expect(grows).toHaveLength(9);

        const calculationSheet = required(
            snapshot.metadata.sheets.find(
                (sheet) => sheet.properties.title === "Workbook calculations"
            )
        );
        const timestampFormat = {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        numberFormat: {
                            pattern: "mmm d, yyyy h:mm:ss AM/PM",
                            type: "DATE_TIME",
                        },
                    },
                },
                fields: "userEnteredFormat.numberFormat",
                range: {
                    endColumnIndex: 8,
                    endRowIndex: 2,
                    sheetId: calculationSheet.properties.sheetId,
                    startColumnIndex: 7,
                    startRowIndex: 1,
                },
            },
        };

        expect(plan.prepareRequests).toContainEqual(timestampFormat);

        const formatIndex = plan.prepareRequests.findIndex(
            (request) => request["repeatCell"] !== undefined
        );

        expect(plan.prepareRequests[formatIndex - 1]).toStrictEqual({
            appendDimension: {
                dimension: "COLUMNS",
                length: 5,
                sheetId: calculationSheet.properties.sheetId,
            },
        });

        const wideIds = snapshot.metadata.sheets
            .filter(
                (sheet) =>
                    [
                        "Plant color data",
                        "Watering intervals",
                        "Workbook analytics",
                    ].includes(sheet.properties.title) ||
                    /^P\d{2} /v.test(sheet.properties.title)
            )
            .map((sheet) => sheet.properties.sheetId);
        for (const request of grows)
            expect(wideIds).not.toContain(
                /** @type {{ sheetId: number }} */ (request["appendDimension"])
                    .sheetId
            );

        expect(
            plan.edits.filter((edit) => edit.sheet === "History")
        ).toStrictEqual([expect.objectContaining({ column: 13, row: 1 })]);
        expect(
            plan.edits.some((edit) =>
                [
                    "App bulk",
                    "App entries",
                    "Plant color data",
                    "RO refills",
                ].includes(edit.sheet)
            )
        ).toBe(false);
    });

    it("keeps summary statistics and status on all gaps while limiting plotted points", () => {
        expect.hasAssertions();

        const { options, snapshot } = fixture();
        const { edits } = buildHistoryCapacityRequests(snapshot, options);
        const summaryEdits = edits.filter(
            (entry) =>
                (entry.sheet === "P01 Synthetic plant" &&
                    [15, 108].includes(entry.row)) ||
                (entry.sheet === "Workbook analytics" && entry.column === 6)
        );
        for (const edit of summaryEdits) {
            expect(edit.after).toContain("History!$A$2:$A$50001");
            expect(edit.after).toContain("capacityGapsP01");
            expect(edit.after).not.toContain("CHOOSEROWS");
            expect(edit.after).not.toContain("'Watering intervals'!");
        }
        const minimum = required(
            edits.find(
                (entry) =>
                    entry.sheet === "P01 Synthetic plant" && entry.row === 15
            )
        );

        expect(minimum.after).toContain(
            "MIN(FILTER(capacityGapsP01,ISNUMBER(capacityGapsP01),capacityGapsP01>0))"
        );

        const plot = required(
            edits.find(
                (entry) =>
                    entry.sheet === "Watering intervals" && entry.column === 0
            )
        );

        expect(plot.after).toContain("MIN(4999,ROWS(capacityRows))");

        const history = required(
            edits.find(
                (entry) =>
                    entry.sheet === "P01 Synthetic plant" && entry.row === 140
            )
        );

        expect(history.after).toContain("History!A2:L50001");
        expect(history.after).not.toContain("capacityRows");
    });

    it("preserves all unrelated chart specification fields and changes only plot ranges and subtitles", () => {
        expect.hasAssertions();

        const { options, snapshot } = fixture();
        const { chartRequests } = buildHistoryCapacityRequests(
            snapshot,
            options
        );

        expect(chartRequests).toHaveLength(144);

        for (const request of chartRequests) {
            const update =
                /**
                 * @type {{
                 *     chartId: number;
                 *     spec: import("../workbook-fixtures.d.ts").ChartSpec;
                 * }}
                 */ (request["updateChartSpec"]);
            const old = required(
                snapshot.metadata.sheets
                    .flatMap((sheet) => sheet.charts ?? [])
                    .find((chart) => chart.chartId === update.chartId)
            );
            const normalized = structuredClone(update.spec);
            normalized.subtitle = required(old.spec.subtitle);
            const ranges = [
                ...normalized.basicChart.domains.map((domain) => domain.domain),
                ...normalized.basicChart.series.map((series) => series.series),
            ].flatMap((data) => data.sourceRange.sources);
            for (const range of ranges)
                range.endRowIndex =
                    range.endRowIndex === 5011
                        ? 1000
                        : required(range.endRowIndex);

            expect(normalized).toStrictEqual(old.spec);
            expect(update.spec.subtitle).toContain(
                "Latest 4,999 relevant points"
            );
        }
    });

    it("repairs only the three native-rejected missing-series charts with their maintained semantic bindings", () => {
        expect.hasAssertions();

        const { options, repairs, snapshot } = missingSeriesFixture();
        const { chartRequests } = buildHistoryCapacityRequests(
            snapshot,
            options
        );
        const updates = chartRequests.map(
            (request) =>
                /**
                 * @type {{
                 *     chartId: number;
                 *     spec: import("../workbook-fixtures.d.ts").ChartSpec;
                 * }}
                 */ (request["updateChartSpec"])
        );
        for (const repair of repairs) {
            const update = required(
                updates.find((entry) => entry.chartId === repair.chartId)
            );
            const original = required(
                snapshot.metadata.sheets
                    .flatMap((sheet) => sheet.charts ?? [])
                    .find((chart) => chart.chartId === repair.chartId)
            );

            expect(
                update.spec.basicChart.series.map(
                    (series) =>
                        required(series.series.sourceRange.sources[0])
                            .startColumnIndex
                )
            ).toStrictEqual(repair.columns);

            for (const series of update.spec.basicChart.series) {
                expect(series.colorStyle?.rgbColor).toStrictEqual(repair.rgb);
                expect(series.targetAxis).toBe("LEFT_AXIS");
                expect(
                    required(series.series.sourceRange.sources[0]).endRowIndex
                ).toBe(repair.dimension ? 5011 : 5000);
            }
            const normalized = structuredClone(update.spec);
            normalized.subtitle = required(original.spec.subtitle);
            normalized.basicChart.series = [];
            normalized.basicChart.axis = normalized.basicChart.axis.slice(
                0,
                original.spec.basicChart.axis.length
            );
            const normalizedSources = normalized.basicChart.domains.flatMap(
                (domain) => domain.domain.sourceRange.sources
            );
            for (const source of normalizedSources)
                source.endRowIndex = repair.dimension ? 1000 : 5000;

            expect(normalized).toStrictEqual(original.spec);
        }

        expect(
            required(updates.find((entry) => entry.chartId === 1_834_724_344))
                .spec.basicChart.series
        ).toStrictEqual([]);
        expect(
            required(updates.find((entry) => entry.chartId === 801_463_046))
                .spec.basicChart.axis
        ).toContainEqual(
            expect.objectContaining({
                position: "LEFT_AXIS",
                title: "Size (cm)",
            })
        );
    });

    it.each([
        "binding",
        "existing-series",
        "owner",
    ])("rejects known missing-series chart %s drift", (fault) => {
        expect.hasAssertions();

        const { options, snapshot } = missingSeriesFixture();
        const page = required(
            snapshot.metadata.sheets.find((sheet) =>
                sheet.properties.title.startsWith("P29 ")
            )
        );
        const chart = required(page.charts?.[3]);
        switch (fault) {
            case "binding": {
                required(
                    chart.spec.basicChart.domains[0]?.domain.sourceRange
                        .sources[0]
                ).startColumnIndex = 84;
                break;
            }
            case "existing-series": {
                chart.spec.basicChart.series = [
                    {
                        series: required(chart.spec.basicChart.domains[0])
                            .domain,
                    },
                ];
                break;
            }
            case "owner": {
                chart.chartId = 801_463_046;
                break;
            }
            default: {
                throw new Error("Unknown chart fixture fault");
            }
        }

        expect(() => buildHistoryCapacityRequests(snapshot, options)).toThrow(
            "Known missing-series"
        );
    });

    it.each([
        "metadata",
        "integrity",
        "helper",
    ])(
        "rejects materialization %s drift before producing requests",
        (fault) => {
            expect.hasAssertions();

            const { options, snapshot } = fixture();
            switch (fault) {
                case "helper": {
                    snapshot.cells = snapshot.cells.filter(
                        (cell) =>
                            cell.sheet !== "Workbook analytics" ||
                            cell.row !== 1 ||
                            cell.column !== 112
                    );
                    break;
                }
                case "integrity": {
                    required(
                        snapshot.cells.find(
                            (cell) =>
                                cell.sheet === "Integrity" && cell.row === 4
                        )
                    ).value.formulaValue = "=1";
                    break;
                }
                case "metadata": {
                    snapshot.cells.push({
                        column: 7,
                        row: 0,
                        sheet: "Workbook calculations",
                        value: { stringValue: "Existing content" },
                    });
                    break;
                }
                default: {
                    throw new Error("Unknown materialization fixture fault");
                }
            }

            expect(() =>
                buildHistoryCapacityRequests(snapshot, options)
            ).toThrow(/anchor|metadata/iv);
        }
    );

    it("gates every model consumer surface by freshness and current setup while preserving manual review", () => {
        expect.hasAssertions();

        const { options, snapshot } = fixture();
        const consumers = [
            { column: 8, plant: "$A2", row: 1, sheet: "Baselines" },
            { column: 22, plant: "$B7", row: 6, sheet: "Dashboard" },
            { column: 9, plant: "$A2", row: 1, sheet: "Dry-down insights" },
            { column: 0, plant: "B228", row: 230, sheet: "Insights" },
            { column: 128, plant: '"P01"', row: 1, sheet: "Plant color data" },
            { column: 9, plant: "$A2", row: 1, sheet: "Baselines" },
        ];
        for (const consumer of consumers)
            snapshot.cells.push({
                ...consumer,
                value: {
                    formulaValue: `=XLOOKUP(${consumer.plant},'Dry-down models'!$A$2:$A$37,'Dry-down models'!$L$2:$L$37,"")`,
                },
            });
        const plan = buildHistoryCapacityRequests(snapshot, options);
        for (const consumer of consumers) {
            const edit = required(
                plan.edits.find(
                    (entry) =>
                        entry.sheet === consumer.sheet &&
                        entry.row === consumer.row &&
                        entry.column === consumer.column
                )
            );

            expect(edit.after).toContain(
                "'Workbook calculations'!$I$2=\"Ready\""
            );
            expect(edit.after).toContain("<=15/1440");
            expect(edit.after).toContain("'Dry-down models'!$B$2:$B$37");
            expect(edit.after).toContain(
                `XLOOKUP(${consumer.plant},Baselines!$A$2:$A$37,Baselines!$T$2:$T$37,-1)`
            );
            expect(edit.after).toContain(String(edit.before).slice(1));
        }
        const manualReview = required(
            plan.edits.find(
                (entry) => entry.sheet === "Baselines" && entry.column === 9
            )
        );

        expect(manualReview.after).toContain(
            'IF(manualReview<>"",manualReview,IF('
        );
        expect(manualReview.after).toContain("'Plant tracker'!$AD$2:$AD$37");
    });

    it("clears exactly the four guarded UDF anchors and monitors materialized freshness and identity", () => {
        expect.hasAssertions();

        const { options, snapshot } = fixture();
        const plan = buildHistoryCapacityRequests(snapshot, options);
        const cleared = plan.edits.filter(
            (entry) =>
                entry.after === "" &&
                String(entry.before).startsWith("=GARDEN_")
        );

        expect(cleared).toHaveLength(4);
        expect(
            cleared.map(
                (entry) => `${entry.sheet}:${entry.row}:${entry.column}`
            )
        ).toStrictEqual([
            "Dry-down models:1:0",
            "Workbook analytics:0:0",
            "Environment data:0:0",
            "Environment data:0:22",
        ]);

        const integrity = String(
            required(
                plan.edits.find(
                    (entry) => entry.sheet === "Integrity" && entry.row === 4
                )
            ).after
        );

        expect(integrity).not.toContain("GARDEN_");
        expect(integrity).toContain(
            `N(IFERROR(FORMULATEXT('Workbook calculations'!E2),"")<>"=NOW()")`
        );
        expect(integrity).not.toContain("Analytics calculated at");
        expect(integrity).toContain("ISFORMULA('Workbook calculations'!B2)");
        expect(integrity).toContain("'Workbook calculations'!$I$2=\"Ready\"");
        expect(integrity).toContain("<=15/1440");
        expect(integrity).toContain(
            "'Workbook calculations'!$J$2='Insights'!$B$228"
        );
        expect(integrity).toContain(
            "'Workbook calculations'!$K$2=IFNA(XLOOKUP("
        );
        expect(integrity).toContain("COUNTA('Dry-down models'!A2:A37)=36");
        expect(integrity).toContain(
            "'Environment data'!AA1=\"Observation ID\""
        );
        expect(
            plan.edits.filter(
                (entry) =>
                    entry.sheet === "Workbook calculations" && entry.column >= 7
            )
        ).toHaveLength(8);

        for (const edit of cleared) {
            const index = plan.edits.indexOf(edit);

            expect(plan.formulaRequests[index]).toMatchObject({
                updateCells: {
                    fields: "userEnteredValue",
                    rows: [{ values: [{}] }],
                },
            });
        }
    });

    it("updates embedded Integrity anchor expectations, capacity, and existing derived History formulas", () => {
        expect.hasAssertions();

        const { options, snapshot } = fixture();
        const plan = buildHistoryCapacityRequests(snapshot, options);

        expect(
            required(
                plan.edits.find(
                    (entry) => entry.sheet === "Integrity" && entry.row === 4
                )
            ).after
        ).toContain("'Dry-down models'!A1=\"Plant ID\"");
        expect(
            required(plan.edits.find((entry) => entry.sheet === "History"))
                .after
        ).toContain("$A$2:$A$50001");
        expect(plan.edits).toContainEqual({
            after: 50_001,
            before: 5000,
            column: 5,
            row: 12,
            sheet: "Integrity",
        });
    });

    it("extends filtering without replaying sort operations or changing unrelated filters", () => {
        expect.hasAssertions();

        const { options, snapshot } = fixture();
        for (const title of ["History", "Baselines"]) {
            const sheet = required(
                snapshot.metadata.sheets.find(
                    (entry) => entry.properties.title === title
                )
            );
            sheet.basicFilter = {
                criteria: { 2: { hiddenValues: ["Removed"] } },
                range: {
                    endColumnIndex: sheet.properties.gridProperties.columnCount,
                    endRowIndex: sheet.properties.gridProperties.rowCount,
                    sheetId: sheet.properties.sheetId,
                    startColumnIndex: 0,
                    startRowIndex: 0,
                },
                sortSpecs: [{ dimensionIndex: 0, sortOrder: "DESCENDING" }],
            };
        }
        const { prepareRequests } = buildHistoryCapacityRequests(
            snapshot,
            options
        );
        const filters = prepareRequests.filter(
            (request) => request["setBasicFilter"] !== undefined
        );

        expect(filters).toHaveLength(1);
        expect(JSON.stringify(filters)).toContain('"endRowIndex":50001');
        expect(JSON.stringify(filters)).toContain('"hiddenValues":["Removed"]');
        expect(JSON.stringify(filters)).not.toContain("sortSpecs");
    });

    it("rejects stale snapshots and already expanded workbooks", () => {
        expect.hasAssertions();

        const { options, snapshot } = fixture();
        const plan = buildHistoryCapacityRequests(snapshot, options);

        expect(() => {
            assertHistoryCapacityPreconditions(plan, structuredClone(snapshot));
        }).not.toThrow();

        snapshot.cells.push({
            column: 0,
            row: 2,
            sheet: "History",
            value: { numberValue: 46_301 },
        });

        expect(() => {
            assertHistoryCapacityPreconditions(plan, snapshot);
        }).toThrow("drift");

        required(
            snapshot.metadata.sheets.find(
                (sheet) => sheet.properties.title === "History"
            )
        ).properties.gridProperties.rowCount = 50_001;
        required(
            snapshot.readRanges.find((range) => range.sheet === "History")
        ).endRow = 50_001;

        expect(() => buildHistoryCapacityRequests(snapshot, options)).toThrow(
            "migration replay"
        );
    });

    it.each([
        "capture",
        "charts",
        "bound",
        "header",
        "mapping",
        "occupied",
        "anchor",
        "budget",
    ])("rejects %s uncertainty before producing requests", (fault) => {
        expect.hasAssertions();

        const { options, snapshot } = fixture();
        switch (fault) {
            case "anchor": {
                snapshot.cells = snapshot.cells.filter(
                    (cell) =>
                        cell.sheet !== "P01 Synthetic plant" || cell.row !== 140
                );
                break;
            }
            case "bound": {
                required(
                    snapshot.cells.find(
                        (cell) => cell.sheet === "Dry-down models"
                    )
                ).value.formulaValue = "=GARDEN_DRY_DOWN(History!A2:AP6000)";
                break;
            }
            case "budget": {
                required(
                    snapshot.metadata.sheets.find(
                        (sheet) => sheet.properties.title === "Containers"
                    )
                ).properties.gridProperties.rowCount = 100_000;
                required(
                    snapshot.readRanges.find(
                        (range) => range.sheet === "Containers"
                    )
                ).endRow = 100_000;
                break;
            }
            case "capture": {
                snapshot.readRanges = snapshot.readRanges.filter(
                    (range) => range.sheet !== "Plant color data"
                );
                break;
            }
            case "charts": {
                snapshot.chartsCaptured = false;
                break;
            }
            case "header": {
                options.historyHeaders[0] = "Changed header";
                break;
            }
            case "mapping": {
                required(
                    snapshot.cells.find(
                        (cell) =>
                            cell.sheet === "Watering intervals" &&
                            cell.row === 0
                    )
                ).value.stringValue = "P99 · Previous watering";
                break;
            }
            case "occupied": {
                snapshot.cells.push({
                    column: 0,
                    row: 62,
                    sheet: "Integrity",
                    value: { stringValue: "Do not overwrite" },
                });
                break;
            }
            default: {
                throw new Error("Unknown fixture fault");
            }
        }

        expect(() => buildHistoryCapacityRequests(snapshot, options)).toThrow(
            /bound|budget|captur|header|mapping|metadata|occupied|projection/iv
        );
    });
});

describe("capacity formula boundaries", () => {
    it("changes full-history ranges without replacing string literals, unrelated 5000s or chart-only columns", () => {
        expect.hasAssertions();
        expect(
            extendHistoryFormulaReferences(
                "=IF(History!A2:A5000=\"History!A2:A5000\",'Environment data'!A2:L5000,'Environment data'!M2:R5000)+SUM('Plant color data'!A5002:F6023)+5000"
            )
        ).toBe(
            "=IF(History!A2:A50001=\"History!A2:A5000\",'Environment data'!A2:L50001,'Environment data'!M2:R5000)+SUM('Plant color data'!A5002:F6023)+5000"
        );
    });

    it("requires a formula before adding a chronological chart window", () => {
        expect.hasAssertions();
        expect(() => recentHistoryChartFormula("not a formula")).toThrow(
            "Expected chart formula"
        );
        expect(
            recentHistoryChartFormula(
                '=IFNA(FILTER(A2:B50001,A2:A50001<>""),"")'
            )
        ).toContain("MAX(1,ROWS(capacityRows)-4998)");
    });
});
