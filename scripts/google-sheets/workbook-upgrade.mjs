import { cycleComparisonFormula } from "./cycle-comparison.mjs";
import {
    compactSelectedPlantSeries,
    plantColor,
    selectedPlantColorFormula,
    sharedSelectedRoleFormula,
} from "./plant-chart-colors.mjs";
import palette from "./plant-colors.json" with { type: "json" };
import {
    buildWateringCalendarRequests,
    plantEvidenceFormulas,
    roSummaryFormulas,
    wateringCalendarSheetId,
    wateringSummaryFormulas,
} from "./workbook-analytics.mjs";

export const calculationsSheetId = 907_202_607;
export const analyticsSheetId = 907_202_608;
const clock = "'Workbook calculations'!$E$2";
const font = "JetBrains Mono";
const inventoryEnd = palette.length + 1;
const cycleLastColumn = columnName(11 + palette.length * 3);
const timestampFormat = "mmm d, yyyy h:mm am/pm";
const refillTitle = "RO refills";
const calculatedLabel = "Calculated as of";

/**
 * Guarded, one-time additive migration. Supply all entered cells in the working
 * sheets (not effective spill values) and fresh native metadata. The caller
 * must compare returned preconditions with a second fresh read before writing.
 * Apply prepareRequests, then formulaRequests, verify calculated outputs, and
 * only then chartRequests. Factory functions come from the checked-in logger.
 *
 * @param {import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot} snapshot
 * @param {{
 *     latestPair: (row: number) => string;
 *     plantHistory: (id: string) => string;
 * }} factories
 */
export function buildWorkbookUpgradeRequests(snapshot, factories) {
    const context = migrationContext(snapshot);
    const {
        cells,
        emptyRanges,
        formulaRequests,
        metadata,
        preconditions,
        prepareRequests,
        sheet,
        value,
    } = context;
    for (const [title, id] of [
        ["Workbook calculations", calculationsSheetId],
        ["Workbook analytics", analyticsSheetId],
    ]) {
        if (
            metadata.sheets.some(
                (entry) =>
                    entry.properties.title === title ||
                    entry.properties.sheetId === id
            )
        )
            throw new Error(
                `${String(title)} already exists; do not replay migration`
            );
    }
    if (
        sheet("History").properties.gridProperties.rowCount !== 5000 ||
        sheet("History").properties.gridProperties.columnCount !== 42
    )
        throw new Error("Expected the 5,000-row, 42-column History contract");
    const trackerIds = cells
        .filter(
            (cell) =>
                cell.sheet === "Plant tracker" &&
                cell.column === 0 &&
                cell.row >= 1 &&
                cell.row <= palette.length
        )
        .map((cell) => cell.value.stringValue);
    if (
        trackerIds.length !== palette.length ||
        palette.some(({ id }) => !trackerIds.includes(id))
    )
        throw new Error(
            `Expected the maintained Plant tracker inventory in A2:A${palette.length + 1}`
        );
    const pages = palette.map(({ id }, index) => {
        const matches = metadata.sheets.filter((entry) =>
            entry.properties.title.startsWith(`${id} `)
        );
        if (matches.length !== 1) throw new Error(`Expected one ${id} page`);
        const page = matches[0];
        if (!page) throw new Error(`Missing ${id} page`);
        const title = page.properties.title;
        const history = value(title, 12, 0).formulaValue;
        if (
            history?.includes(`plant,"${id}"`) !== true ||
            !history.includes("HSTACK(") ||
            !history.includes("History!$A$2:$A$5000")
        )
            throw new Error(`Unexpected history anchor on ${title}`);
        if (value("Baselines", index + 1, 0).stringValue !== id)
            throw new Error(
                `Unexpected Baselines inventory at row ${index + 2}`
            );
        if (
            value("Baselines", index + 1, 2).formulaValue?.startsWith(
                "=INDEX(IFNA(LET(setup,"
            ) !== true
        )
            throw new Error(`Unexpected latest-weight formula for ${id}`);
        if (
            value("Baselines", index + 1, 4).formulaValue?.startsWith(
                "=INDEX(IFNA(LET(setup,"
            ) !== true
        )
            throw new Error(`Unexpected latest-time formula for ${id}`);
        return page;
    });
    if (value("Insights", 227, 1).stringValue === undefined)
        throw new Error("Missing existing Insights B228 plant selector");
    for (const id of [907_202_609, 907_202_610]) {
        if (
            metadata.sheets.some(
                (entry) =>
                    entry.charts?.some((chart) => chart.chartId === id) === true
            )
        )
            throw new Error(`Chart ${id} already exists`);
    }
    prepareRequests.push(
        ...newHelper(
            "Workbook calculations",
            calculationsSheetId,
            palette.length + 2,
            6
        ),
        ...newHelper(
            "Workbook analytics",
            analyticsSheetId,
            5001,
            12 + palette.length * 3
        ),
        ...buildWateringCalendarRequests(snapshot, { clockReference: clock })
    );
    const cycleFormula = cycleComparisonFormula();
    formulaRequests.push(
        update(calculationsSheetId, 0, 0, [
            [
                entered("Plant ID"),
                entered("Latest measured weight (g)"),
                entered("Latest measured at"),
            ],
        ]),
        update(calculationsSheetId, 0, 4, [
            [entered(calculatedLabel), entered("Calculation date")],
            [entered("=NOW()"), entered("=INT(E2)")],
        ]),
        update(analyticsSheetId, 0, 0, [[entered(cycleFormula)]]),
        update(analyticsSheetId, 0, 9, [
            [entered("Days since watering")],
            [entered('=VSTACK(A2:A5000,"")')],
        ])
    );
    for (const [plantIndex, { id }] of palette.entries()) {
        for (const [cycleIndex, source] of [
            "B",
            "C",
            "D",
        ].entries()) {
            const coloredFormula = selectedPlantColorFormula(
                "'Insights'!$B$228",
                id,
                `'Workbook analytics'!$${source}$2:$${source}$5000`
            );
            formulaRequests.push(
                update(analyticsSheetId, 0, 10 + plantIndex * 3 + cycleIndex, [
                    [entered(`="${id} · "&${source}1`)],
                    [entered(coloredFormula)],
                ])
            );
        }
    }
    for (const [index, source] of ["C", "D"].entries()) {
        const sharedFormula = sharedSelectedRoleFormula(
            `${source}2:${source}5000`
        );
        formulaRequests.push(
            update(analyticsSheetId, 0, 10 + palette.length * 3 + index, [
                [entered(`=${source}1`)],
                [entered(sharedFormula)],
            ])
        );
    }
    formulaRequests.push(
        update(analyticsSheetId, 0, 5, [
            [
                entered("Plant ID"),
                entered("Previous gap (days)"),
                entered("Latest gap (days)"),
            ],
        ])
    );

    addPlantPages(context, pages, factories);
    addDashboard(context);
    addInsights(context);
    addRefillSummary(context);
    addDerivedFormulas(context, pages);
    const insights = sheet("Insights").properties.sheetId;
    const chartRequests = [gapChart(insights), cycleChart(insights)];
    return {
        chartRequests,
        emptyRanges,
        formulaRequests,
        preconditions,
        prepareRequests,
        verification: {
            chartIds: [907_202_609, 907_202_610],
            existingCharts: metadata.sheets
                .flatMap((entry) => entry.charts ?? [])
                .map((chart) => structuredClone(chart)),
            historyEndRow: 5139,
            historyStartRow: 141,
            sharedClock: clock,
        },
    };
}

/**
 * Replace references only outside Sheets string literals. @param {string}
 * formula
 */
export function normalizeDerivedFormula(formula) {
    return formula
        .split(/(?<literal>"(?:[^"]|"")*")/v)
        .map((part, index) =>
            index % 2
                ? part
                : part
                      .replaceAll(/\bNOW\(\)/gv, () => clock)
                      .replaceAll(
                          /\bTODAY\(\)/gv,
                          () => "'Workbook calculations'!$F$2"
                      )
                      .replaceAll(
                          /(?<sheet>'Plant tracker'|Baselines)!\$?(?<column>[A-Z]+):\$?\k<column>\b/gv,
                          (
                              /** @type {string} */ _,
                              /** @type {string} */ sheet,
                              /** @type {string} */ column
                          ) =>
                              `${sheet}!$${column}$2:$${column}$${inventoryEnd}`
                      )
        )
        .join("");
}

/**
 * @param {ReturnType<typeof migrationContext>} context
 */
function addDashboard(context) {
    const { blank, formulaRequests, prepareRequests, sheet, value, write } =
        context;
    if (value("Dashboard", 5, 22).stringValue !== "Recommended water date")
        throw new Error("Unexpected Dashboard forecast heading");
    const dashboard = sheet("Dashboard").properties.sheetId;
    write("Dashboard", 5, 22, "Model water-date estimate");
    write("Dashboard", 5, 23, "Model readiness notes");
    write("Dashboard", 5, 15, "Avg completed gap (days)");
    blank("Dashboard", 3, 4, 0, 8);
    blank("Dashboard", 4, 5, 0, 8);
    write(
        "Dashboard",
        3,
        0,
        '=HYPERLINK("https://nick2bad4u.github.io/Gardening/layouts/daily-report.html","Open daily care report ↗")'
    );
    write(
        "Dashboard",
        3,
        3,
        "Model dates are estimates; use daily report and plant checks."
    );
    prepareRequests.push({
        mergeCells: {
            mergeType: "MERGE_ALL",
            range: grid(dashboard, 3, 4, 3, 8),
        },
    });
    write("Dashboard", 4, 0, calculatedLabel);
    write("Dashboard", 4, 1, `=${clock}`);
    write("Dashboard", 4, 3, "Calculated as of ← · cached workbook time");
    prepareRequests.push(
        format(grid(dashboard, 3, 5, 0, 8), {
            horizontalAlignment: "LEFT",
            textFormat: { bold: false, fontFamily: font, fontSize: 10 },
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
        }),
        {
            updateDimensionProperties: {
                fields: "hiddenByUser,pixelSize",
                properties: { hiddenByUser: false, pixelSize: 32 },
                range: {
                    dimension: "ROWS",
                    endIndex: 4,
                    sheetId: dashboard,
                    startIndex: 3,
                },
            },
        },
        {
            updateDimensionProperties: {
                fields: "hiddenByUser,pixelSize",
                properties: { hiddenByUser: false, pixelSize: 26 },
                range: {
                    dimension: "ROWS",
                    endIndex: 5,
                    sheetId: dashboard,
                    startIndex: 4,
                },
            },
        },
        {
            mergeCells: {
                mergeType: "MERGE_ALL",
                range: grid(dashboard, 3, 4, 0, 3),
            },
        },
        {
            mergeCells: {
                mergeType: "MERGE_ALL",
                range: grid(dashboard, 4, 5, 1, 3),
            },
        },
        {
            mergeCells: {
                mergeType: "MERGE_ALL",
                range: grid(dashboard, 4, 5, 3, 8),
            },
        },
        numberFormat(grid(dashboard, 4, 5, 1, 3), "DATE_TIME", timestampFormat)
    );
    formulaRequests.push({
        repeatCell: {
            cell: {
                note: "Active recorded Water events. Completed gaps combine same-day watering dates; historical gaps are not a watering schedule.",
            },
            fields: "note",
            range: grid(dashboard, 5, 6, 13, 14),
        },
    });
    for (const [index, { id }] of palette.entries()) {
        const row = index + 6;
        if (value("Dashboard", row, 1).stringValue !== id)
            throw new Error(`Unexpected Dashboard plant order for ${id}`);
        const column = columnName(index * 3 + 2);
        write(
            "Dashboard",
            row,
            15,
            `=IFERROR(AVERAGE('Watering intervals'!${column}$2:${column}$5000),"—")`
        );
    }
    for (const [start, end] of [
        [11, 15],
        [24, 31],
    ]) {
        prepareRequests.push(
            {
                addDimensionGroup: {
                    range: {
                        dimension: "COLUMNS",
                        endIndex: end,
                        sheetId: dashboard,
                        startIndex: start,
                    },
                },
            },
            {
                updateDimensionGroup: {
                    dimensionGroup: {
                        collapsed: true,
                        depth: 1,
                        range: {
                            dimension: "COLUMNS",
                            endIndex: end,
                            sheetId: dashboard,
                            startIndex: start,
                        },
                    },
                    fields: "collapsed",
                },
            }
        );
    }
}

/**
 * @param {ReturnType<typeof migrationContext>} context
 * @param {import("../../test/workbook-fixtures.d.ts").SheetMetadata[]} pages
 */
function addDerivedFormulas(context, pages) {
    const { cells, owned, value, write } = context;
    const derivedSheets = new Set([
        "App insight activity",
        "App insight calibration",
        "App insight followups",
        "App plant charts",
        "Baselines",
        "Dashboard",
        "Dry-down insights",
        "Dry-down models",
        "Insights",
        "Insights data",
        "Plant color data",
        "Plant tracker",
        "Watering intervals",
        ...pages.map((page) => page.properties.title),
    ]);
    for (const cell of cells) {
        if (
            !derivedSheets.has(cell.sheet) ||
            owned.has(key(cell.sheet, cell.row, cell.column)) ||
            cell.value.formulaValue === undefined ||
            cell.value.formulaValue === ""
        )
            continue;
        const old = cell.value.formulaValue;
        const formula = normalizeDerivedFormula(old);
        if (formula !== old) write(cell.sheet, cell.row, cell.column, formula);
    }
    const oldScan = value("Integrity", 11, 1).formulaValue;
    if (
        oldScan?.startsWith("=SUM(") !== true ||
        !oldScan.includes("Dashboard!U4:X") ||
        oldScan.includes("Dashboard!U2:") ||
        oldScan.includes("Dashboard!A1:X")
    )
        throw new Error(
            "Unexpected Integrity scan; review circular Dashboard dependency"
        );
    const additional = [
        ...pages.map((page, index) => {
            const reference = `'${page.properties.title.replaceAll("'", "''")}'`;
            return `${reference}!A1:INDEX(${reference}!V1:V5139,140+MAX(1,COUNTIF(History!$B$2:$B$5000,"${String(palette[index]?.id)}")))`;
        }),
        `'Watering intervals'!A1:${columnName(palette.length * 3 - 1)}5000`,
        "'Dry-down insights'!A1:AE5000",
        `'Workbook calculations'!A1:F${palette.length + 2}`,
        "'Workbook analytics'!A1:INDEX('Workbook analytics'!D1:D5001,MIN(5001,MAX(2,COUNTA(History!A2:A5000)+2)))",
        `'Workbook analytics'!F1:H${inventoryEnd}`,
        `'Workbook analytics'!J1:INDEX('Workbook analytics'!${cycleLastColumn}1:${cycleLastColumn}5001,MIN(5001,MAX(2,COUNTA(History!A2:A5000)+2)))`,
        `'Workbook analytics'!J5001:${cycleLastColumn}5001`,
        "'Watering calendar'!A1:BE40",
        "Insights!A226:W900",
    ];
    write(
        "Integrity",
        11,
        1,
        `${
            oldScan.slice(0, -1) +
            additional
                .map((range) => `,SUM(ARRAYFORMULA(N(ISERROR(${range}))))`)
                .join("")
        })`
    );
}

/**
 * @param {ReturnType<typeof migrationContext>} context
 */
function addInsights(context) {
    const { blank, formulaRequests, prepareRequests, remember, sheet, write } =
        context;
    const insights = sheet("Insights").properties.sheetId;
    const insightProps = sheet("Insights").properties.gridProperties;
    if (insightProps.rowCount < 900)
        prepareRequests.push({
            appendDimension: {
                dimension: "ROWS",
                length: 900 - insightProps.rowCount,
                sheetId: insights,
            },
        });
    if (insightProps.columnCount < 23)
        prepareRequests.push({
            appendDimension: {
                dimension: "COLUMNS",
                length: 23 - insightProps.columnCount,
                sheetId: insights,
            },
        });
    blank("Insights", 0, 4, 19, 23);
    blank("Insights", 836, 839, 0, 18);
    write(
        "Insights",
        836,
        0,
        `=B228&" · "&XLOOKUP(B228,'Plant tracker'!$A$2:$A$${inventoryEnd},'Plant tracker'!$B$2:$B$${inventoryEnd},"")`
    );
    write("Insights", 837, 0, "=\"Solid circles: \"&'Workbook analytics'!B1");
    write(
        "Insights",
        838,
        0,
        "=\"Dotted diamonds: \"&'Workbook analytics'!C1&\" · Dashed squares: \"&'Workbook analytics'!D1"
    );
    for (let row = 836; row < 839; row += 1)
        prepareRequests.push({
            mergeCells: {
                mergeType: "MERGE_ALL",
                range: grid(insights, row, row + 1, 0, 18),
            },
        });
    prepareRequests.push(
        format(grid(insights, 836, 839, 0, 18), {
            textFormat: { fontFamily: font },
            wrapStrategy: "WRAP",
        })
    );
    write("Insights", 0, 19, calculatedLabel);
    write("Insights", 1, 19, `=${clock}`);
    write(
        "Insights",
        2,
        19,
        "Past watering gaps describe history; model dates require the daily report and plant checks."
    );
    prepareRequests.push(
        numberFormat(
            grid(insights, 1, 2, 19, 23),
            "DATE_TIME",
            timestampFormat
        ),
        format(grid(insights, 0, 4, 19, 23), {
            textFormat: { fontFamily: font },
            wrapStrategy: "WRAP",
        })
    );
    /** @type {[string, number, number][]} */
    const links = [
        [
            "Watering history",
            insights,
            790,
        ],
        [
            "Current cycle",
            insights,
            226,
        ],
        [
            "Collection comparisons",
            insights,
            297,
        ],
        [
            "Model evidence",
            insights,
            457,
        ],
        [
            "Watering calendar",
            wateringCalendarSheetId,
            1,
        ],
    ];
    let indexText = "";
    const runs = [];
    for (const [
        label,
        target,
        row,
    ] of links) {
        if (indexText) indexText += "  ·  ";
        runs.push({
            format: { link: { uri: `#gid=${target}&range=A${row}` } },
            startIndex: indexText.length,
        });
        indexText += label;
    }
    remember("Insights", 1, 0);
    formulaRequests.push({
        updateCells: {
            fields: "userEnteredValue,textFormatRuns",
            rows: [
                {
                    values: [
                        {
                            textFormatRuns: runs,
                            userEnteredValue: { stringValue: indexText },
                        },
                    ],
                },
            ],
            start: { columnIndex: 0, rowIndex: 1, sheetId: insights },
        },
    });
}

/**
 * @param {ReturnType<typeof migrationContext>} context
 * @param {import("../../test/workbook-fixtures.d.ts").SheetMetadata[]} pages
 * @param {Parameters<typeof buildWorkbookUpgradeRequests>[1]} factories
 */
function addPlantPages(context, pages, factories) {
    const { blank, formulaRequests, prepareRequests, remember, value, write } =
        context;
    for (const [index, plant] of palette.entries()) {
        const page = pages[index];
        if (!page) throw new Error(`Missing page for ${plant.id}`);
        const { gridProperties, sheetId, title } = page.properties;
        write(title, 3, 3, "Model estimates");
        write(title, 6, 3, "Model dry-check estimate");
        // Only the old spill anchor is cleared. Never clear effective history
        // values or helper columns N:V, nor the existing A109 chart status.
        blank(title, 13, 43, 0, 10);
        blank(title, 138, gridProperties.rowCount, 0, 12);
        if (gridProperties.rowCount < 5139)
            prepareRequests.push({
                appendDimension: {
                    dimension: "ROWS",
                    length: 5139 - gridProperties.rowCount,
                    sheetId,
                },
            });
        prepareRequests.push({
            copyPaste: {
                destination: grid(sheetId, 139, 140, 0, 11),
                pasteType: "PASTE_FORMAT",
                source: grid(sheetId, 11, 12, 0, 11),
            },
        });
        remember(title, 12, 0);
        prepareRequests.push(update(sheetId, 12, 0, [[entered("")]]));
        write(
            title,
            10,
            0,
            `=HYPERLINK("#gid=${sheetId}&range=A140","Jump to complete history ↓")`
        );
        for (let column = 0; column < 11; column += 1) {
            const heading = value(title, 11, column).stringValue;
            if (heading === undefined || heading === "")
                throw new Error(`Missing history header on ${title}`);
            write(title, 139, column, heading);
            remember(title, 11, column);
        }
        prepareRequests.push(
            update(sheetId, 11, 0, [
                Array.from({ length: 11 }, () => entered("")),
            ])
        );
        for (const [start, end] of [
            [0, 3],
            [3, 6],
            [6, 10],
        ])
            prepareRequests.push({
                mergeCells: {
                    mergeType: "MERGE_ALL",
                    range: grid(sheetId, 11, 12, Number(start), Number(end)),
                },
            });
        write(
            title,
            11,
            0,
            `=HYPERLINK("#gid=${sheetId}&range=A54","Jump to charts ↓")`
        );
        write(title, 11, 3, calculatedLabel);
        write(title, 11, 6, `=${clock}`);
        prepareRequests.push(
            format(grid(sheetId, 11, 12, 6, 10), {
                numberFormat: { pattern: timestampFormat, type: "DATE_TIME" },
                textFormat: {
                    bold: true,
                    fontFamily: font,
                    fontSize: 9,
                    foregroundColorStyle: {
                        rgbColor: { blue: 1, green: 1, red: 1 },
                    },
                },
            })
        );
        for (const [
            start,
            end,
            pixelSize,
        ] of [
            [
                8,
                10,
                66,
            ],
            [
                23,
                24,
                54,
            ],
            [
                26,
                27,
                66,
            ],
        ])
            prepareRequests.push({
                updateDimensionProperties: {
                    fields: "pixelSize",
                    properties: { pixelSize },
                    range: {
                        dimension: "ROWS",
                        endIndex: end,
                        sheetId,
                        startIndex: start,
                    },
                },
            });
        write(title, 139, 11, "Photo");
        const historyFormula = factories.plantHistory(plant.id);
        if (
            !historyFormula.includes(`plant,"${plant.id}"`) ||
            !historyFormula.includes("History!$X$2:$X$5000") ||
            !historyFormula.includes("HSTACK(")
        )
            throw new Error(
                `Invalid relocated history factory for ${plant.id}`
            );
        write(title, 140, 0, historyFormula);
        write(
            title,
            138,
            0,
            `=HYPERLINK("#gid=${sheetId}&range=A54","Back to charts ↑")`
        );
        const pair = factories.latestPair(index + 2);
        if (
            !pair.includes(clock) ||
            !pair.includes("HSTACK(INDEX(readings,1,1),INDEX(readings,1,2))")
        )
            throw new Error(
                "Latest-pair factory must reuse the correction-aware pair and shared clock"
            );
        formulaRequests.push(
            update(calculationsSheetId, index + 1, 0, [
                [entered(plant.id), entered(pair)],
            ])
        );
        for (const [column, source] of /** @type {[number, string][]} */ ([
            [2, "B"],
            [4, "C"],
        ]))
            write(
                "Baselines",
                index + 1,
                column,
                `=XLOOKUP($A${index + 2},'Workbook calculations'!$A$2:$A$${inventoryEnd},'Workbook calculations'!$${source}$2:$${source}$${inventoryEnd},"")`
            );
        const intervals = wateringSummaryFormulas(plant.id);
        const gapColumn = columnName(index * 3 + 2);
        const gapRange = `'Watering intervals'!$${gapColumn}$2:$${gapColumn}$5000`;
        formulaRequests.push(
            update(analyticsSheetId, index + 1, 5, [
                [
                    entered(plant.id),
                    entered(
                        `=IFNA(LET(gaps,FILTER(${gapRange},ISNUMBER(${gapRange}),${gapRange}>0),IF(ROWS(gaps)<2,"",INDEX(gaps,ROWS(gaps)-1))),"")`
                    ),
                    entered(intervals.latest),
                ],
            ])
        );
        const evidence = plantEvidenceFormulas(plant.id, clock);
        const summary = [
            [
                14,
                "Watering history",
                "Completed calendar-day gaps · not a schedule",
            ],
            [
                15,
                "Latest gap (days)",
                intervals.latest,
            ],
            [
                16,
                "Median gap (days)",
                intervals.median,
            ],
            [
                17,
                "Shortest gap (days)",
                intervals.minimum,
            ],
            [
                18,
                "Longest gap (days)",
                intervals.maximum,
            ],
            [
                19,
                "Completed intervals",
                intervals.count,
            ],
            [
                21,
                "Latest recorded evidence",
                "Photo records do not establish a physical inspection",
            ],
            [
                22,
                "Photo",
                evidence.photoLink,
            ],
            [
                23,
                "Photo observed",
                evidence.photoDate,
            ],
            [
                24,
                "Condition",
                evidence.condition,
            ],
            [
                25,
                "Condition observed",
                evidence.conditionDate,
            ],
            [
                26,
                "Evidence source",
                evidence.conditionEvidence,
            ],
            [
                27,
                "Observation notes",
                evidence.conditionNotes,
            ],
            [
                29,
                "Feeding history",
                "Recorded events only · same-time events not ordered",
            ],
            [
                30,
                "Last recorded feed",
                evidence.feedDate,
            ],
            [
                31,
                "Product",
                evidence.feedProduct,
            ],
            [
                32,
                "Recorded dose",
                evidence.feedDose,
            ],
            [
                33,
                "Plain-water events after feed time",
                evidence.plainWaterEventsSinceFeed,
            ],
            [
                35,
                calculatedLabel,
                `=${clock}`,
            ],
            [
                36,
                "Care plan",
                '=HYPERLINK("https://nick2bad4u.github.io/Gardening/layouts/daily-report.html","Open daily report")',
            ],
            [
                38,
                "Dimension evidence",
                `=LET(n,COUNTIFS(History!$B$2:$B$5000,"${plant.id}",History!$C$2:$C$5000,"Measure",History!$AC$2:$AC$5000,"Measured",History!$AJ$2:$AJ$5000,"<>Removed")+COUNTIFS(History!$B$2:$B$5000,"${plant.id}",History!$C$2:$C$5000,"Measure",History!$AC$2:$AC$5000,"Corrected",History!$AI$2:$AI$5000,"Ruler",History!$AJ$2:$AJ$5000,"<>Removed"),IF(n=0,"No measured size baseline",IF(n=1,"One measured size baseline",n&" measured size records")))`,
            ],
        ];
        for (const [
            row,
            label,
            content,
        ] of summary) {
            const rowIndex = Number(row) - 1;
            write(title, rowIndex, 0, String(label));
            write(title, rowIndex, 3, String(content));
            for (const [from, to] of [
                [0, 3],
                [3, 10],
            ])
                prepareRequests.push({
                    mergeCells: {
                        mergeType: "MERGE_ALL",
                        range: grid(
                            sheetId,
                            rowIndex,
                            rowIndex + 1,
                            Number(from),
                            Number(to)
                        ),
                    },
                });
        }
        prepareRequests.push(
            format(grid(sheetId, 13, 43, 0, 10), {
                textFormat: { fontFamily: font, fontSize: 10 },
                verticalAlignment: "TOP",
                wrapStrategy: "WRAP",
            }),
            format(grid(sheetId, 13, 43, 0, 3), {
                textFormat: { bold: true, fontFamily: font },
            })
        );
        for (const row of [
            23,
            25,
            30,
            35,
        ])
            prepareRequests.push(
                numberFormat(
                    grid(sheetId, row - 1, row, 3, 10),
                    "DATE_TIME",
                    timestampFormat
                )
            );
        prepareRequests.push(
            numberFormat(grid(sheetId, 14, 19, 3, 10), "NUMBER", "0"),
            numberFormat(grid(sheetId, 15, 16, 3, 10), "NUMBER", "0.#"),
            numberFormat(grid(sheetId, 32, 33, 3, 10), "NUMBER", "0"),
            format(grid(sheetId, 140, 5139, 0, 12), {
                textFormat: { fontFamily: font },
            }),
            format(grid(sheetId, 139, 140, 11, 12), {
                textFormat: { bold: true, fontFamily: font },
            }),
            numberFormat(
                grid(sheetId, 140, 5139, 0, 1),
                "DATE_TIME",
                timestampFormat
            ),
            numberFormat(grid(sheetId, 140, 5139, 3, 4), "NUMBER", "0.000"),
            numberFormat(grid(sheetId, 140, 5139, 4, 7), "NUMBER", "0.0"),
            format(grid(sheetId, 140, 5139, 7, 10), {
                verticalAlignment: "TOP",
                wrapStrategy: "WRAP",
            })
        );
        relocateHistoryRules(context, page);
    }
}

/**
 * @param {ReturnType<typeof migrationContext>} context
 */
function addRefillSummary(context) {
    const { blank, prepareRequests, sheet, write } = context;
    const ro = sheet(refillTitle);
    blank(refillTitle, 0, 12, 14, 20);
    if (ro.properties.gridProperties.columnCount < 20)
        prepareRequests.push({
            appendDimension: {
                dimension: "COLUMNS",
                length: 20 - ro.properties.gridProperties.columnCount,
                sheetId: ro.properties.sheetId,
            },
        });
    const refill = roSummaryFormulas();
    write(refillTitle, 0, 14, "Recorded RO refills");
    write(refillTitle, 1, 14, "Latest refill date");
    write(refillTitle, 1, 15, refill.latestVisitDate);
    write(refillTitle, 2, 14, "Gallons added");
    write(refillTitle, 2, 15, refill.latestVisitGallons);
    for (const [index, label] of [
        "Container",
        "Last filled",
        "Gallons",
        "Empty date",
        "Status",
    ].entries())
        write(refillTitle, 4, index + 14, label);
    for (const [index, container] of refill.containers.entries())
        for (const [column, content] of [
            container.label,
            container.lastFillDate,
            container.lastFillGallons,
            container.emptyDate,
            container.status,
        ].entries())
            write(refillTitle, index + 5, column + 14, content);

    write(
        refillTitle,
        10,
        14,
        "Not marked empty is a missing empty date, not a remaining-volume estimate."
    );
    prepareRequests.push(
        format(grid(ro.properties.sheetId, 0, 12, 14, 20), {
            textFormat: { fontFamily: font },
            wrapStrategy: "WRAP",
        }),
        format(grid(ro.properties.sheetId, 0, 1, 14, 20), {
            textFormat: {
                bold: true,
                fontFamily: font,
                fontSize: 14,
                foregroundColorStyle: {
                    rgbColor: { blue: 0.17, green: 0.23, red: 0.08 },
                },
            },
        })
    );
    for (const column of [15, 17])
        prepareRequests.push(
            numberFormat(
                grid(ro.properties.sheetId, 5, 9, column, column + 1),
                "DATE",
                "mmm d, yyyy"
            )
        );
    prepareRequests.push(
        numberFormat(
            grid(ro.properties.sheetId, 1, 2, 15, 16),
            "DATE",
            "mmm d, yyyy"
        ),
        numberFormat(
            grid(calculationsSheetId, 1, inventoryEnd, 2, 3),
            "DATE_TIME",
            timestampFormat
        ),
        numberFormat(
            grid(calculationsSheetId, 1, 2, 4, 5),
            "DATE_TIME",
            timestampFormat
        ),
        numberFormat(
            grid(analyticsSheetId, 1, inventoryEnd, 6, 8),
            "NUMBER",
            "0"
        )
    );
    const wrappedColumns = /** @type {[string, number][]} */ ([
        ["Plant tracker", 7],
        ["History view", 8],
    ]);
    for (const [title, column] of wrappedColumns) {
        const id = sheet(title).properties.sheetId;
        const range = grid(
            id,
            1,
            title === "Plant tracker" ? inventoryEnd : 5000,
            column,
            column + 1
        );
        prepareRequests.push(
            format(range, { verticalAlignment: "TOP", wrapStrategy: "WRAP" })
        );
    }
}
/** @param {number} column */
function columnName(column) {
    let result = "";
    for (let n = column + 1; n > 0; n = Math.floor((n - 1) / 26))
        result = String.fromCodePoint(65 + ((n - 1) % 26)) + result;
    return result;
}
/** @param {number} sheetId */
function cycleChart(sheetId) {
    return {
        addChart: {
            chart: {
                chartId: 907_202_610,
                position: {
                    overlayPosition: {
                        anchorCell: { columnIndex: 0, rowIndex: 839, sheetId },
                        heightPixels: 920,
                        widthPixels: 1155,
                    },
                },
                spec: {
                    basicChart: {
                        axis: [
                            {
                                format: { fontFamily: font },
                                position: "BOTTOM_AXIS",
                                title: "Days since watering",
                            },
                            {
                                format: { fontFamily: font },
                                position: "LEFT_AXIS",
                                title: "Measured whole-pot weight (g)",
                            },
                        ],
                        chartType: "SCATTER",
                        domains: [{ domain: data(9, 5001) }],
                        headerCount: 1,
                        interpolateNulls: false,
                        legendPosition: "NO_LEGEND",
                        lineSmoothing: false,
                        series: compactSelectedPlantSeries(
                            palette.map(({ id }, plantIndex) => ({
                                colorStyle: { rgbColor: plantColor(id) },
                                lineStyle: { type: "SOLID", width: 2 },
                                pointStyle: { shape: "CIRCLE", size: 5 },
                                series: data(10 + plantIndex * 3, 5001),
                                targetAxis: "LEFT_AXIS",
                            })),
                            [0, 1].map((index) => ({
                                lineStyle: {
                                    type:
                                        index === 0
                                            ? "DOTTED"
                                            : "MEDIUM_DASHED",
                                    width: 2,
                                },
                                pointStyle: {
                                    shape: index === 0 ? "DIAMOND" : "SQUARE",
                                    size: 3,
                                },
                                series: data(
                                    10 + palette.length * 3 + index,
                                    5001
                                ),
                                targetAxis: "LEFT_AXIS",
                            }))
                        ),
                    },
                    fontName: font,
                    hiddenDimensionStrategy: "SHOW_ALL",
                    subtitle:
                        "Plant-colored solid circles: current · neutral dotted diamonds: previous · neutral dashed squares: older · same pot setup",
                    title: "Compare dry-down cycles · selected plant",
                    titleTextFormat: { fontFamily: font },
                },
            },
        },
    };
}
/** @param {number} column @param {number} endRow */
function data(column, endRow) {
    return {
        sourceRange: {
            sources: [grid(analyticsSheetId, 0, endRow, column, column + 1)],
        },
    };
}
/** @param {string} text */
function entered(text) {
    return {
        userEnteredValue: text.startsWith("=")
            ? { formulaValue: text }
            : { stringValue: text },
    };
}
/**
 * @param {Record<string, unknown>} range @param {Record<string, unknown>}
 *   userEnteredFormat
 */
function format(range, userEnteredFormat) {
    return {
        repeatCell: {
            cell: { userEnteredFormat },
            fields: Object.keys(userEnteredFormat)
                .map((field) => `userEnteredFormat.${field}`)
                .join(","),
            range,
        },
    };
}
/** @param {number} sheetId */
function gapChart(sheetId) {
    return {
        addChart: {
            chart: {
                chartId: 907_202_609,
                position: {
                    overlayPosition: {
                        anchorCell: { columnIndex: 0, rowIndex: 789, sheetId },
                        heightPixels: 920,
                        widthPixels: 1155,
                    },
                },
                spec: {
                    basicChart: {
                        axis: [
                            {
                                format: { fontFamily: font },
                                position: "BOTTOM_AXIS",
                                title: "Plant ID",
                            },
                            {
                                format: { fontFamily: font },
                                position: "LEFT_AXIS",
                                title: "Completed gap (days)",
                            },
                        ],
                        chartType: "COLUMN",
                        domains: [{ domain: data(5, inventoryEnd) }],
                        headerCount: 1,
                        legendPosition: "BOTTOM_LEGEND",
                        series: [6, 7].map((column) => ({
                            series: data(column, inventoryEnd),
                            styleOverrides: palette.map(
                                ({ id }, pointIndex) => {
                                    const color = plantColor(id);
                                    return {
                                        colorStyle: {
                                            rgbColor:
                                                column === 7
                                                    ? color
                                                    : Object.fromEntries(
                                                          Object.entries(
                                                              color
                                                          ).map(
                                                              ([
                                                                  channel,
                                                                  channelValue,
                                                              ]) => [
                                                                  channel,
                                                                  (channelValue +
                                                                      1) /
                                                                      2,
                                                              ]
                                                          )
                                                      ),
                                        },
                                        index: pointIndex,
                                    };
                                }
                            ),
                            targetAxis: "LEFT_AXIS",
                        })),
                    },
                    fontName: font,
                    hiddenDimensionStrategy: "SHOW_ALL",
                    subtitle:
                        "Calendar days between recorded waterings · not a watering schedule",
                    title: "Completed watering gaps · previous versus latest",
                    titleTextFormat: { fontFamily: font },
                },
            },
        },
    };
}
/**
 * @param {number} sheetId @param {number} startRowIndex @param {number}
 *   endRowIndex @param {number} startColumnIndex @param {number}
 *   endColumnIndex
 */
function grid(
    sheetId,
    startRowIndex,
    endRowIndex,
    startColumnIndex,
    endColumnIndex
) {
    return {
        endColumnIndex,
        endRowIndex,
        sheetId,
        startColumnIndex,
        startRowIndex,
    };
}
/** @param {string} sheet @param {number} row @param {number} column */
function key(sheet, row, column) {
    return `${sheet}\u{0}${row}\u{0}${column}`;
}
/** @param {import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot} snapshot */
function migrationContext(snapshot) {
    const { cells, metadata } = snapshot;
    const byCell = new Map(
        cells.map((cell) => [
            key(cell.sheet, cell.row, cell.column),
            cell.value,
        ])
    );
    /** @type {Record<string, unknown>[]} */
    const prepareRequests = [];
    /** @type {Record<string, unknown>[]} */
    const formulaRequests = [];
    /** @type {typeof cells} */
    const preconditions = [];
    /**
     * @type {{
     *     sheet: string;
     *     startRow: number;
     *     endRow: number;
     *     startColumn: number;
     *     endColumn: number;
     * }[]}
     */
    const emptyRanges = [];
    const checked = new Set();
    const owned = new Set();
    /** @param {string} title */
    const sheet = (title) => {
        const found = metadata.sheets.find(
            (entry) => entry.properties.title === title
        );
        if (!found) throw new Error(`Missing ${title}`);
        return found;
    };
    /** @param {string} title @param {number} row @param {number} column */
    const value = (title, row, column) =>
        byCell.get(key(title, row, column)) ?? {};
    /** @param {string} title @param {number} row @param {number} column */
    const remember = (title, row, column) => {
        const identity = key(title, row, column);
        if (!checked.has(identity)) {
            checked.add(identity);
            preconditions.push({
                column,
                row,
                sheet: title,
                value: structuredClone(value(title, row, column)),
            });
        }
        owned.add(identity);
    };
    /**
     * @param {string} title @param {number} row @param {number} column @param
     *   {string} text
     */
    const write = (title, row, column, text) => {
        remember(title, row, column);
        formulaRequests.push(
            update(sheet(title).properties.sheetId, row, column, [
                [entered(text)],
            ])
        );
    };
    /**
     * @param {string} title @param {number} startRow @param {number} endRow
     * @param {number} startColumn @param {number} endColumn
     */
    const blank = (title, startRow, endRow, startColumn, endColumn) => {
        const occupied = cells.find(
            (cell) =>
                cell.sheet === title &&
                cell.row >= startRow &&
                cell.row < endRow &&
                cell.column >= startColumn &&
                cell.column < endColumn &&
                Object.values(cell.value).some((entry) => entry !== "")
        );
        if (occupied)
            throw new Error(
                `Occupied destination ${title}!${columnName(occupied.column)}${occupied.row + 1}`
            );
        emptyRanges.push({
            endColumn,
            endRow,
            sheet: title,
            startColumn,
            startRow,
        });
    };
    return {
        blank,
        cells,
        emptyRanges,
        formulaRequests,
        metadata,
        owned,
        preconditions,
        prepareRequests,
        remember,
        sheet,
        value,
        write,
    };
}
/**
 * @param {string} title @param {number} sheetId @param {number} rowCount @param
 *   {number} columnCount
 */
function newHelper(title, sheetId, rowCount, columnCount) {
    return [
        {
            addSheet: {
                properties: {
                    gridProperties: {
                        columnCount,
                        frozenRowCount: 1,
                        rowCount,
                    },
                    hidden: true,
                    sheetId,
                    title,
                },
            },
        },
        {
            addProtectedRange: {
                protectedRange: {
                    description: "Read-only derived workbook data",
                    range: { sheetId },
                    warningOnly: true,
                },
            },
        },
        format({ sheetId }, { textFormat: { fontFamily: font } }),
    ];
}
/**
 * @param {Record<string, unknown>} range @param {string} type @param {string}
 *   pattern
 */
function numberFormat(range, type, pattern) {
    return format(range, { numberFormat: { pattern, type } });
}
/**
 * @param {ReturnType<typeof migrationContext>} context @param
 *   {import("../../test/workbook-fixtures.d.ts").SheetMetadata} page
 */
function relocateHistoryRules(context, page) {
    const { prepareRequests } = context;
    const { sheetId } = page.properties;
    // Relocate existing history rules, retaining their exact condition and colors.
    const rules = page.conditionalFormats ?? [];
    for (const [ruleIndex, rule] of rules.entries()) {
        if (
            rule.ranges.every(
                (range) =>
                    ![12, 109].includes(range.startRowIndex ?? -1) ||
                    (range.startColumnIndex ?? 0) >= 12
            )
        ) {
            continue;
        }

        const relocated = structuredClone(rule);
        relocated.ranges = relocated.ranges.map((range) =>
            [12, 109].includes(range.startRowIndex ?? -1) &&
            (range.startColumnIndex ?? 0) < 12
                ? { ...range, endRowIndex: 5139, startRowIndex: 140 }
                : range
        );
        relocated.ranges = relocated.ranges.filter(
            (range, index, ranges) =>
                ranges.findIndex(
                    (candidate) =>
                        JSON.stringify(candidate) === JSON.stringify(range)
                ) === index
        );
        prepareRequests.push({
            updateConditionalFormatRule: {
                index: ruleIndex,
                rule: relocated,
                sheetId,
            },
        });
    }
}

/**
 * @param {number} sheetId @param {number} row @param {number} column @param
 *   {Record<string, unknown>[][]} rows
 */
function update(sheetId, row, column, rows) {
    return {
        updateCells: {
            fields: "userEnteredValue",
            rows: rows.map((values) => ({ values })),
            start: { columnIndex: column, rowIndex: row, sheetId },
        },
    };
}
