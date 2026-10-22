import { createHash } from "node:crypto";

import { isRecord } from "../build-data.mjs";
import {
    extendInventoryFormula,
    shiftInventoryRow,
} from "./inventory-expansion.mjs";
import { plantColor } from "./plant-chart-colors.mjs";
import palette from "./plant-colors.json" with { type: "json" };

/** @typedef {import("./inventory-expansion.mjs").NativeSnapshot} NativeSnapshot */
/** @typedef {import("./inventory-expansion.mjs").Cell} Cell */
/** @typedef {import("./inventory-expansion.mjs").EnteredValue} Value */
/** @typedef {{ sheet: string; row: number; column: number; cell: Cell }} Entry */
/**
 * @typedef {{
 *     metadata: NativeSnapshot;
 *     full: NativeSnapshot;
 *     intake: NativeSnapshot[];
 * }} Snapshot
 */
/** @typedef {Record<string, unknown>} Request */

const colorsTitle = "Plant colors";
const trackerTitle = "Plant tracker";
const environmentTitle = "Light & humidity";
const insightsTitle = "Insights data";
const calculations = "Workbook calculations";
const comparisons = "Plant comparisons";
const comparisonId = 907_202_614;
const colorSheet = "Plant color data";
const excluded = new Set([
    "App bulk",
    "App entries",
    "History",
    "History view",
    "RO refills",
]);
const site = "https://nick2bad4u.github.io/Gardening";
export const houseplantAdditions = Object.freeze([
    {
        care: "Keep lightly moist and aerated; do not wait for whole-pot drought. Confirm drainage and check the actual root zone.",
        contents: "Fittonia albivenis · Network News™ Nightly™ (nursery label)",
        id: "P39",
        inventory: "Houseplant-06",
        label: "#13",
        name: "Fittonia Nightly",
        sheetId: 202_610_390,
        slug: "fittonia-albivenis-nightly",
        title: "P39 Fittonia Nightly",
    },
    {
        care: "Allow partial drying; check below the surface and confirm drainage. Avoid persistently wet medium.",
        contents:
            "Peperomia obtusifolia · Savory Delights™ Spice is Nice™ (nursery label)",
        id: "P40",
        inventory: "Houseplant-07",
        label: "#14",
        name: "Peperomia Spice is Nice",
        sheetId: 202_610_400,
        slug: "peperomia-obtusifolia-spice-is-nice",
        title: "P40 Peperomia Spice is Nice",
    },
]);
const oldIds = [
    ...Array.from(
        { length: 32 },
        (_, index) => `P${String(index + 1).padStart(2, "0")}`
    ),
    "P35",
    "P36",
    "P37",
    "P38",
];
const allIds = [
    ...oldIds,
    "P39",
    "P40",
];

/**
 * Require a completed refresh after values were applied. Read native effective
 * cells from Workbook calculations E1:I2, Dry-down models A1:B39, and Baselines
 * A1:T39. valuesAppliedAt is the operation's Sheets serial datetime in the
 * workbook timezone, not the old analytics timestamp. Keep full refreshes idle
 * through chart application/readback; Ready can retain a previous snapshot
 * while another refresh is running.
 *
 * @param {ReturnType<typeof buildHouseplantEnrollment>} plan
 * @param {NativeSnapshot} fresh
 * @param {number} valuesAppliedAt
 */
export function assertHouseplantChartPreconditions(
    plan,
    fresh,
    valuesAppliedAt
) {
    const captured = flatten([fresh]);
    /** @param {string} sheet @param {number} row @param {number} column */
    const value = (sheet, row, column) => {
        const cell = captured.get(key(sheet, row, column))?.cell;
        return cell?.effectiveValue ?? cell?.userEnteredValue;
    };
    const previous = plan.analyticsCalculatedBefore;
    const calculated = value(calculations, 1, 7)?.numberValue;
    if (
        typeof previous !== "number" ||
        typeof calculated !== "number" ||
        valuesAppliedAt < previous ||
        calculated <= previous ||
        calculated < valuesAppliedAt ||
        !Number.isFinite(valuesAppliedAt) ||
        value(calculations, 1, 8)?.stringValue !== "Ready"
    )
        throw new Error(
            "Charts require a completed Ready analytics refresh after enrollment values"
        );
    assertChartClock(calculated, value(calculations, 1, 4));
    for (const [index, id] of allIds.entries())
        if (value("Dry-down models", index + 1, 0)?.stringValue !== id)
            throw new Error("Charts require the refreshed 38-pot model roster");
    for (const [index, plant] of houseplantAdditions.entries()) {
        const row = 37 + index;
        const modelSetup = value("Dry-down models", row, 1)?.numberValue;
        if (
            typeof modelSetup !== "number" ||
            value("Baselines", row, 0)?.stringValue !== plant.id ||
            modelSetup !== value("Baselines", row, 19)?.numberValue
        )
            throw new Error(
                "Charts require model setups matching enrolled Baselines"
            );
    }
    return true;
}

/**
 * Final compaction gate: re-read the entire narrow archive and full chart
 * metadata AFTER applying values and charts. This deliberately uses the new
 * expected state, not the original pre-preparation digest. Canonical/staging/RO
 * snapshot comparisons remain a separate operator gate throughout the rollout.
 *
 * @param {ReturnType<typeof buildHouseplantEnrollment>} plan
 * @param {NativeSnapshot} metadata
 * @param {NativeSnapshot} comparisonCells
 */
export function assertHouseplantCompactionPreconditions(
    plan,
    metadata,
    comparisonCells
) {
    const archive = metadata.sheets.find(
        (sheet) => sheet.properties.sheetId === comparisonId
    );
    if (
        archive?.properties.title !== comparisons ||
        archive.properties.gridProperties.rowCount !== 1568 ||
        archive.properties.gridProperties.columnCount !== 6
    )
        throw new Error(
            "Comparison archive metadata changed before compaction"
        );
    const captured = flatten([comparisonCells]);
    for (const edit of plan.edits) {
        if (edit.sheet !== comparisons) continue;
        const actual = captured.get(key(comparisons, edit.row, edit.column))
            ?.cell.userEnteredValue;
        if (JSON.stringify(actual) !== JSON.stringify(edit.value))
            throw new Error(
                `Comparison archive readback mismatch at row ${edit.row + 1}, column ${edit.column + 1}`
            );
    }
    const charts = metadata.sheets.flatMap((sheet) => sheet.charts ?? []);
    if (charts.length !== 190)
        throw new Error("Expected 190 charts before compaction");
    for (const id of plan.originalChartIds)
        if (charts.every((chart) => chart.chartId !== id))
            throw new Error(`Existing chart disappeared: ${id}`);
    for (const chart of charts)
        walk(chart.spec, (item) => {
            if (
                item["sheetId"] === 907_202_603 &&
                Number(item["endRowIndex"]) > 5001
            )
                throw new Error(
                    `Chart ${chart.chartId} still references the wide comparison tail`
                );
        });
    return true;
}

/** @param {{ preconditionDigest: string }} plan @param {Snapshot} fresh */
export function assertHouseplantEnrollmentPreconditions(plan, fresh) {
    if (plan.preconditionDigest !== houseplantEnrollmentDigest(fresh))
        throw new Error("Workbook drift since houseplant enrollment planning");
}

/**
 * One-time 5.37.1 / 36-pot to 5.38.0 / 38-pot migration. `full` must be a
 * complete entered-value/validation read of EVERY non-intake sheet, including
 * blank trailing grid cells; `intake` supplies the captured schema headers. No
 * API is called here. Apply preparation and values, complete a new 38-pot
 * analytics refresh, then use finalizeHouseplantEnrollmentCharts with fresh
 * readiness cells before applying full chart specs. Verify charts before
 * compaction. Never rewrite specs from an empty native chart readback. Rehearse
 * on a native Drive copy first. Existing observations, staging values, RO data,
 * and chart identities survive. The narrow comparison archive preserves the old
 * derived blocks while avoiding another 500-row allocation across a 167-column
 * chart-helper grid.
 *
 * @param {Snapshot} snapshot
 */
export function buildHouseplantEnrollment(snapshot) {
    const { full, metadata } = snapshot;
    const sheets = new Map(
        metadata.sheets.map((sheet) => [sheet.properties.title, sheet])
    );
    const entries = flatten([full, ...snapshot.intake]);
    /** @param {string} title */
    const meta = (title) => {
        const result = sheets.get(title);
        if (!result) throw new Error(`Missing sheet: ${title}`);
        return result;
    };
    /** @param {string} title @param {number} row @param {number} column */
    const cell = (title, row, column) =>
        entries.get(key(title, row, column))?.cell;
    /** @param {string} title @param {number} row @param {number} column */
    const value = (title, row, column) =>
        cell(title, row, column)?.userEnteredValue;
    /** @param {string} title */
    const sourceEntries = (title) =>
        entries
            .values()
            .filter((entry) => entry.sheet === title)
            .toArray();

    validateSourceRoster(snapshot, meta, value);
    validateDestinations(metadata, sheets, value);
    const template = meta("P37 Arctic Ice");
    function validateTemplate() {
        if (
            template.charts?.length !== 4 ||
            value(template.properties.title, 140, 0)?.formulaValue?.includes(
                "50001"
            ) !== true
        )
            throw new Error("Current full-history plant-page template changed");
        if (
            sourceEntries(template.properties.title).some(
                (entry) =>
                    entry.row > 140 && entry.cell.userEnteredValue !== undefined
            )
        )
            throw new Error(
                "Plant-page template contains entered history-tail data"
            );
        if (
            value("Integrity", 59, 0)?.stringValue !==
            "Critical source-row exceptions"
        )
            throw new Error("Integrity exception section moved");
        if (
            meta(colorSheet).properties.gridProperties.rowCount !== 6023 ||
            meta(colorSheet).properties.gridProperties.columnCount !== 159
        )
            throw new Error("Color-helper allocation changed");
        for (const entry of sourceEntries(colorSheet))
            if (
                entry.row >= 5001 &&
                entry.column >= 6 &&
                entry.cell.userEnteredValue
            )
                throw new Error(
                    "Occupied color-helper tail outside comparison archive"
                );
    }
    validateTemplate();

    /** @type {Request[]} */ const prepareRequests = [];
    /** @type {Request[]} */ const chartRequests = [];
    /** @type {Request[]} */ const compactRequests = [];
    /**
     * @type {Map<
     *     string,
     *     { sheet: string; row: number; column: number; value: Value }
     * >}
     */ const edits = new Map();
    /**
     * @type {{
     *     sheet: string;
     *     startRow: number;
     *     endRow: number;
     *     startColumn: number;
     *     endColumn: number;
     * }[]}
     */ const emptyRanges = [];
    /**
     * @param {string} title @param {number} row @param {number} column @param
     *   {Value} next
     */
    const write = (title, row, column, next) =>
        edits.set(key(title, row, column), {
            column,
            row,
            sheet: title,
            value: next,
        });
    /**
     * @param {string} title @param {number} row @param {number} column @param
     *   {string | number | boolean} next
     */
    const put = (title, row, column, next) =>
        write(title, row, column, entered(next));
    /**
     * @param {string} title @param {number} startRow @param {number} endRow
     * @param {number} startColumn @param {number} endColumn
     */
    function requireEmpty(title, startRow, endRow, startColumn, endColumn) {
        if (
            sourceEntries(title).some(
                (entry) =>
                    entry.row >= startRow &&
                    entry.row < endRow &&
                    entry.column >= startColumn &&
                    entry.column < endColumn &&
                    (entry.cell.userEnteredValue !== undefined ||
                        entry.cell.effectiveValue !== undefined)
            )
        )
            throw new Error(
                `Occupied enrollment destination: ${title} R${startRow + 1}:R${endRow}`
            );
        emptyRanges.push({
            endColumn,
            endRow,
            sheet: title,
            startColumn,
            startRow,
        });
    }
    /** @param {string} title @param {number} rows @param {number} columns */
    function grow(title, rows, columns) {
        const sheet = meta(title);
        for (const [
            dimension,
            wanted,
            actual,
        ] of /** @type {[string, number, number][]} */ ([
            [
                "ROWS",
                rows,
                sheet.properties.gridProperties.rowCount,
            ],
            [
                "COLUMNS",
                columns,
                sheet.properties.gridProperties.columnCount,
            ],
        ]))
            if (wanted > actual)
                prepareRequests.push({
                    appendDimension: {
                        dimension,
                        length: wanted - actual,
                        sheetId: sheet.properties.sheetId,
                    },
                });
    }
    /**
     * @param {string} title @param {number} sourceRow @param {number} targetRow
     * @param {number} firstColumn @param {number} lastColumn @param {string}
     *   sourceId @param {string} id
     */
    function copyRow(
        title,
        sourceRow,
        targetRow,
        firstColumn,
        lastColumn,
        sourceId,
        id
    ) {
        requireEmpty(title, targetRow, targetRow + 1, firstColumn, lastColumn);
        prepareRequests.push(
            formatCopy(
                meta(title).properties.sheetId,
                sourceRow,
                firstColumn,
                targetRow,
                firstColumn,
                1,
                lastColumn - firstColumn
            )
        );
        const rowEntries = sourceEntries(title).filter(
            (entry) =>
                entry.row === sourceRow &&
                entry.column >= firstColumn &&
                entry.column < lastColumn
        );
        for (const entry of rowEntries) {
            if (!entry.cell.userEnteredValue) continue;
            const next = transformValue(
                entry.cell.userEnteredValue,
                (formula) => {
                    const extended = extend(formula, title);
                    return shiftInventoryRow(
                        shiftInventoryRow(
                            extended,
                            sourceRow + 1,
                            targetRow + 1
                        ),
                        sourceId === "P37" ? 36 : 37,
                        id === "P39" ? 38 : 39
                    ).replaceAll(sourceId, () => id);
                },
                sourceId,
                id
            );
            write(title, targetRow, entry.column, next);
        }
    }

    grow(calculations, 39, 11);
    grow("Workbook analytics", 5001, 126);
    grow("Watering intervals", 5000, 114);
    grow(colorSheet, 6023, 167);
    grow("App bulk", 1000, 76);
    grow(colorsTitle, 42, 6);
    grow("Watering calendar", 42, 57);
    prepareRequests.push(
        {
            insertDimension: {
                inheritFromBefore: true,
                range: {
                    dimension: "ROWS",
                    endIndex: 61,
                    sheetId: meta("Integrity").properties.sheetId,
                    startIndex: 59,
                },
            },
        },
        {
            addSheet: {
                properties: {
                    gridProperties: { columnCount: 6, rowCount: 1568 },
                    hidden: true,
                    sheetId: comparisonId,
                    title: comparisons,
                },
            },
        },
        {
            addProtectedRange: {
                protectedRange: {
                    description:
                        "Derived plant comparisons and preserved comparison archive; record care through the logger.",
                    range: { sheetId: comparisonId },
                    warningOnly: true,
                },
            },
        }
    );
    for (const [index, plant] of houseplantAdditions.entries()) {
        prepareRequests.push(
            {
                duplicateSheet: {
                    insertSheetIndex:
                        (meta("P38 Terrarium").properties.index ?? 42) +
                        index +
                        1,
                    newSheetId: plant.sheetId,
                    newSheetName: plant.title,
                    sourceSheetId: template.properties.sheetId,
                },
            },
            {
                addProtectedRange: {
                    protectedRange: {
                        description: `Garden workbook · ${plant.title} · confirm manual edits`,
                        range: { sheetId: plant.sheetId },
                        warningOnly: true,
                    },
                },
            }
        );
    }

    // Rewrite only known roster bounds; neither History's capacity nor raw
    // observations are rewritten. The full capture finds lower-page formulas.
    for (const entry of entries.values()) {
        if (
            excluded.has(entry.sheet) ||
            entry.cell.userEnteredValue?.formulaValue === undefined
        )
            continue;
        const before = entry.cell.userEnteredValue.formulaValue;
        let after = manualCareAggregate(extend(before, entry.sheet), entry);
        if (entry.sheet === "Integrity" && entry.column === 5)
            after = extendIntegrityRosterCheck(after, entry.row);
        if (after !== before)
            write(
                entry.sheet,
                entry.row >= 59 && entry.sheet === "Integrity"
                    ? entry.row + 2
                    : entry.row,
                entry.column,
                { formulaValue: after }
            );
    }
    const rowTemplates =
        /** @type {[string, number, number, number, number][]} */ ([
            [
                trackerTitle,
                35,
                37,
                0,
                36,
            ],
            [
                "Baselines",
                35,
                37,
                0,
                36,
            ],
            [
                "Dashboard",
                40,
                42,
                0,
                33,
            ],
            [
                "Quick log",
                38,
                40,
                0,
                15,
            ],
            [
                insightsTitle,
                35,
                37,
                15,
                30,
            ],
            [
                "Dry-down insights",
                35,
                37,
                0,
                24,
            ],
            [
                calculations,
                35,
                37,
                0,
                3,
            ],
            [
                "Workbook analytics",
                35,
                37,
                5,
                8,
            ],
            [
                "Watering calendar",
                38,
                40,
                0,
                57,
            ],
            [
                colorsTitle,
                38,
                40,
                0,
                6,
            ],
            [
                colorSheet,
                35,
                37,
                127,
                133,
            ],
            [
                environmentTitle,
                41,
                43,
                0,
                14,
            ],
            [
                "Containers",
                35,
                37,
                0,
                19,
            ],
            [
                "Container members",
                43,
                44,
                0,
                10,
            ],
        ]);
    function appendPlants() {
        for (const [index, plant] of houseplantAdditions.entries()) {
            for (const [
                title,
                from,
                to,
                first,
                last,
            ] of rowTemplates)
                copyRow(title, from, to + index, first, last, "P37", plant.id);
            // Inserted Integrity rows are empty by construction, not old title rows.
            const integrityEntries = sourceEntries("Integrity").filter(
                (entry) =>
                    entry.row === 58 &&
                    entry.cell.userEnteredValue !== undefined
            );
            for (const entry of integrityEntries)
                write(
                    "Integrity",
                    59 + index,
                    entry.column,
                    transformValue(
                        entry.cell.userEnteredValue ?? {},
                        (formula) =>
                            shiftInventoryRow(
                                extend(formula, "Integrity"),
                                37,
                                38 + index
                            ),
                        "P38",
                        plant.id
                    )
                );
            put(trackerTitle, 37 + index, 0, plant.id);
            put(trackerTitle, 37 + index, 1, plant.name);
            put(trackerTitle, 37 + index, 2, plant.contents);
            put(
                trackerTitle,
                37 + index,
                13,
                `=HYPERLINK("${site}/plants/${plant.slug}/","Open")`
            );
            put(trackerTitle, 37 + index, 14, plant.label);
            put(trackerTitle, 37 + index, 27, "Not recorded");
            put(
                trackerTitle,
                37 + index,
                28,
                "Nursery container in owner photographs supplied 2026-10-21; size, drainage, medium, and placement unrecorded."
            );
            put(trackerTitle, 37 + index, 29, "");
            put(
                trackerTitle,
                37 + index,
                30,
                "Owner photographs and Proven Winners leafjoy littles nursery label, 2026-10-21"
            );
            put("Baselines", 37 + index, 0, plant.id);
            put("Baselines", 37 + index, 1, plant.name);
            put(
                "Baselines",
                37 + index,
                7,
                '="Manual houseplant care; inspect mix and drainage"'
            );
            put("Baselines", 37 + index, 19, 1);
            for (const column of [
                22,
                24,
                25,
                30,
                31,
                34,
            ])
                put("Baselines", 37 + index, column, '=""');
            put(
                "Baselines",
                37 + index,
                9,
                '="Manual substrate and plant-condition check"'
            );
            put(
                "Baselines",
                37 + index,
                11,
                '="Manual houseplant care; inspect mix and drainage"'
            );
            put("Baselines", 37 + index, 32, '="Manual houseplant care"');
            put("Integrity", 59 + index, 3, "Manual care");
            put(
                "Integrity",
                59 + index,
                4,
                "Assess substrate, drainage, and plant condition; dry-cycle calibration is not a care target."
            );
            put("Integrity", 59 + index, 5, plant.care);
            put(insightsTitle, 37 + index, 22, "=0");
            put(insightsTitle, 37 + index, 24, "=0");
            put(
                insightsTitle,
                37 + index,
                17,
                `=IFNA(MAX(FILTER(History!$A$2:$A$50001,History!$B$2:$B$50001=$P${38 + index},History!$C$2:$C$50001="Repot",History!$AJ$2:$AJ$50001<>"Removed")),"")`
            );
            const medium = edits.get(key("Baselines", 37 + index, 17))?.value
                .formulaValue;
            if (medium === undefined)
                throw new Error("Missing medium formula template");
            put(
                "Baselines",
                37 + index,
                17,
                medium.replace(
                    /IF\(\$T(?:38|39)=1,"[^"]*","Not recorded"\)/v,
                    '"Not recorded"'
                )
            );
            put(
                "Dashboard",
                42 + index,
                0,
                `=HYPERLINK("#gid=${plant.sheetId}","View")`
            );
            put(colorsTitle, 40 + index, 0, plant.id);
            put(colorsTitle, 40 + index, 1, plant.name);
            const color = palette.find((item) => item.id === plant.id);
            if (!color) throw new Error(`Missing palette: ${plant.id}`);
            put(colorsTitle, 40 + index, 2, color.name);
            put(colorsTitle, 40 + index, 3, color.hex);
            put(
                colorsTitle,
                40 + index,
                5,
                `=HYPERLINK("#gid=${plant.sheetId}","Open charts")`
            );
            prepareRequests.push({
                repeatCell: {
                    cell: {
                        userEnteredFormat: {
                            backgroundColorStyle: {
                                rgbColor: plantColor(plant.id),
                            },
                        },
                    },
                    fields: "userEnteredFormat.backgroundColorStyle",
                    range: range(
                        meta(colorsTitle).properties.sheetId,
                        40 + index,
                        4,
                        1,
                        1
                    ),
                },
            });
            put("App bulk", 0, 74 + index, `${plant.id} weight (g)`);
            populateCatalog(plant, index, put);

            const pageEntries = sourceEntries(template.properties.title).filter(
                (entry) => entry.cell.userEnteredValue !== undefined
            );
            for (const entry of pageEntries) {
                const next = transformValue(
                    entry.cell.userEnteredValue ?? {},
                    (formula) =>
                        extend(formula, template.properties.title)
                            .replaceAll("P37", () => plant.id)
                            .replaceAll("202610370", () =>
                                String(plant.sheetId)
                            )
                            .replaceAll(
                                /(?<prefix>(?:'Plant tracker'|Baselines)!\$?[A-Z]{1,3}\$?)36\b/gv,
                                (_match, prefix) =>
                                    `${String(prefix)}${38 + index}`
                            ),
                    "P37",
                    plant.id
                );
                write(plant.title, entry.row, entry.column, next);
            }
            put(plant.title, 0, 0, `${plant.id} · ${plant.name}`);
            put(plant.title, 1, 0, plant.contents);
            put(
                plant.title,
                2,
                3,
                `=HYPERLINK("${site}/plants/${plant.slug}/","Open field guide ↗")`
            );
            const next = houseplantAdditions[index + 1];
            put(
                plant.title,
                2,
                6,
                `=HYPERLINK("#gid=${next?.sheetId ?? 261_928_558}","Next · ${next?.id ?? "P01"} →")`
            );
            for (const [
                title,
                from,
                to,
                width,
            ] of /** @type {[string, number, number, number][]} */ ([
                [
                    "Watering intervals",
                    102,
                    108 + index * 3,
                    3,
                ],
                [
                    "Workbook analytics",
                    114,
                    120 + index * 3,
                    3,
                ],
                [
                    colorSheet,
                    151,
                    159 + index * 4,
                    4,
                ],
            ])) {
                prepareRequests.push(
                    formatCopy(
                        meta(title).properties.sheetId,
                        0,
                        from,
                        0,
                        to,
                        meta(title).properties.gridProperties.rowCount,
                        width
                    )
                );
                const helperEntries = sourceEntries(title).filter(
                    (entry) =>
                        entry.row < 2 &&
                        entry.column >= from &&
                        entry.column < from + width &&
                        entry.cell.userEnteredValue !== undefined
                );
                for (const entry of helperEntries)
                    write(
                        title,
                        entry.row,
                        to + entry.column - from,
                        transformValue(
                            entry.cell.userEnteredValue ?? {},
                            (formula) =>
                                extend(formula, title).replaceAll(
                                    "P37",
                                    () => plant.id
                                ),
                            "P37",
                            plant.id
                        )
                    );
            }
        }
    }
    appendPlants();
    put("P38 Terrarium", 2, 6, '=HYPERLINK("#gid=202610390","Next · P39 →")');
    archiveComparisons(
        sourceEntries(colorSheet),
        write,
        prepareRequests,
        meta(colorSheet).properties.sheetId
    );
    extendValidation(entries, meta, prepareRequests);
    prepareRequests.push({
        setDataValidation: {
            range: {
                endColumnIndex: 76,
                sheetId: meta("App bulk").properties.sheetId,
                startColumnIndex: 74,
                startRowIndex: 1,
            },
            rule: {
                condition: {
                    type: "NUMBER_GREATER",
                    values: [{ userEnteredValue: "0" }],
                },
                showCustomUi: true,
                strict: true,
            },
        },
    });
    extendMetadata(metadata, prepareRequests);
    for (const sheet of metadata.sheets) {
        if (sheet.charts === undefined) continue;
        for (const chart of sheet.charts) {
            const spec = structuredClone(chart.spec);
            extendChart(spec, metadata);
            if (JSON.stringify(spec) !== JSON.stringify(chart.spec))
                chartRequests.push({
                    updateChartSpec: { chartId: chart.chartId, spec },
                });
        }
    }
    const originalIntegrity = value("Integrity", 11, 1)?.formulaValue;
    if (originalIntegrity?.startsWith("=SUM(") !== true)
        throw new Error("Missing error-scan anchor");
    const scanTerms = [
        ...houseplantAdditions.map(
            (plant) =>
                `SUM(ARRAYFORMULA(N(ISERROR('${plant.title}'!A1:INDEX('${plant.title}'!V:V,140+MAX(1,COUNTIF(History!$B$2:$B$50001,"${plant.id}")))))))`
        ),
        `SUM(ARRAYFORMULA(N(ISERROR('${comparisons}'!A1:F1568))))`,
        "SUM(ARRAYFORMULA(N(ISERROR('Watering intervals'!DE1:DJ5000))))",
        "SUM(ARRAYFORMULA(N(ISERROR('Workbook analytics'!DQ1:DV5001))))",
        "SUM(ARRAYFORMULA(N(ISERROR('Plant color data'!FD1:FK5001))))",
        "SUM(ARRAYFORMULA(N(ISERROR('Workbook calculations'!A38:C39))))",
        "SUM(ARRAYFORMULA(N(ISERROR('Watering calendar'!A41:BE42))))",
        "SUM(ARRAYFORMULA(N(ISERROR('Container members'!A45:J46))))",
        "SUM(ARRAYFORMULA(N(ISERROR(Containers!A38:S39))))",
    ];
    put(
        "Integrity",
        11,
        1,
        `${extend(originalIntegrity, "Integrity").slice(0, -1)},${scanTerms.join(",")})`
    );
    compactRequests.push({
        deleteDimension: {
            range: {
                dimension: "ROWS",
                endIndex: 6023,
                sheetId: meta(colorSheet).properties.sheetId,
                startIndex: 5001,
            },
        },
    });
    const valueRequests = edits
        .values()
        .map((edit) => ({
            updateCells: {
                fields: "userEnteredValue",
                rows: [{ values: [{ userEnteredValue: edit.value }] }],
                start: {
                    columnIndex: edit.column,
                    rowIndex: edit.row,
                    sheetId:
                        edit.sheet === comparisons
                            ? comparisonId
                            : (houseplantAdditions.find(
                                  (plant) => plant.title === edit.sheet
                              )?.sheetId ??
                              meta(edit.sheet).properties.sheetId),
                },
            },
        }))
        .toArray();
    const allocatedBefore = metadata.sheets.reduce(
        (sum, sheet) =>
            sum +
            sheet.properties.gridProperties.rowCount *
                sheet.properties.gridProperties.columnCount,
        0
    );
    const allocatedAfter =
        allocatedBefore +
        226_116 +
        30_006 +
        30_000 +
        40_008 +
        11 +
        2000 +
        12 +
        114 +
        9408 +
        20 -
        162_498;
    const worstCaseCells = allocatedAfter + (50_140 - 5139) * 22;
    if (worstCaseCells >= 20_000_000)
        throw new Error(
            `Enrollment exceeds 20,000,000-cell budget: ${worstCaseCells}`
        );
    return {
        allocatedAfter,
        allocatedBefore,
        analyticsCalculatedBefore: analyticsTime(value(calculations, 1, 7)),
        chartRequests,
        chartTemplate: structuredClone(template),
        compactRequests,
        edits: edits.values().toArray(),
        emptyRanges,
        newPageChartFinalizationRequired: true,
        originalChartIds: metadata.sheets.flatMap((sheet) =>
            (sheet.charts ?? []).map((chart) => chart.chartId)
        ),
        preconditionDigest: houseplantEnrollmentDigest(snapshot),
        prepareRequests: deduplicate(prepareRequests),
        valueRequests,
        worstCaseCells,
    };
}

/** @param {string} formula @param {string} title */
export function extendHouseplantFormula(formula, title = "") {
    return extend(formula, title);
}

/**
 * Apply these complete reviewed specs only after the successful refresh gate.
 * The original chart template prevents empty native readbacks losing series,
 * colors, data labels, and axis titles. Keep delete/add pairs in one API
 * batch.
 *
 * @param {ReturnType<typeof buildHouseplantEnrollment>} plan
 * @param {NativeSnapshot} metadata
 * @param {NativeSnapshot} fresh
 * @param {number} valuesAppliedAt
 */
export function finalizeHouseplantEnrollmentCharts(
    plan,
    metadata,
    fresh,
    valuesAppliedAt
) {
    assertHouseplantChartPreconditions(plan, fresh, valuesAppliedAt);
    return [
        ...structuredClone(plan.chartRequests),
        ...finalizeHouseplantPageCharts(metadata, plan.chartTemplate),
    ];
}

/**
 * Pure spec builder for the eight new pages. Use the guarded enrollment
 * finalizer for app, retaining the reviewed pre-migration template.
 *
 * @param {NativeSnapshot} metadata
 * @param {import("./inventory-expansion.mjs").Sheet | undefined} [reviewedTemplate]
 */
export function finalizeHouseplantPageCharts(metadata, reviewedTemplate) {
    /** @type {Request[]} */ const requests = [];
    const template =
        reviewedTemplate ??
        metadata.sheets.find(
            (sheet) => sheet.properties.title === "P37 Arctic Ice"
        );
    if (template?.charts?.length !== 4)
        throw new Error("Missing current page chart template");
    for (const [index, plant] of houseplantAdditions.entries()) {
        const page = metadata.sheets.find(
            (sheet) => sheet.properties.sheetId === plant.sheetId
        );
        if (page?.charts?.length !== 4)
            throw new Error(`Expected four new charts on ${plant.id}`);
        for (const native of page.charts) {
            const original = template.charts.find(
                (chart) => chart.spec["title"] === native.spec["title"]
            );
            if (!original) throw new Error("Unknown duplicated chart role");
            const spec = structuredClone(original.spec);
            walk(spec, (item) => {
                if (item["sheetId"] === template.properties.sheetId)
                    item["sheetId"] = plant.sheetId;
                if (
                    item["sheetId"] === 907_202_605 &&
                    typeof item["startColumnIndex"] === "number" &&
                    typeof item["endColumnIndex"] === "number"
                ) {
                    item["startColumnIndex"] += 6 + index * 3;
                    item["endColumnIndex"] += 6 + index * 3;
                }
                replaceChartIdentity(item, plant.id);
            });
            recolorPageSeries(spec, plant.id);
            if (
                spec["title"] ===
                "Weight trend after latest Water / Repot anchor"
            )
                spec["subtitle"] =
                    "Measured weights in the current pot setup after the latest Water / Repot anchor • observations only; inspect substrate and plant condition for watering. · Latest 4,999 relevant points; summaries use full history.";
            requests.push(...finalizeNewChart(native, spec, plant.sheetId));
        }
    }
    return requests;
}
/**
 * Native before-image, excluding volatile calculation results. @param
 * {Snapshot} snapshot
 */
export function houseplantEnrollmentDigest(snapshot) {
    return createHash("sha256")
        .update(
            JSON.stringify(
                snapshot,
                (property, /** @type {unknown} */ value) =>
                    [
                        "effectiveFormat",
                        "effectiveValue",
                        "formattedValue",
                        "spreadsheetId",
                        "spreadsheetUrl",
                    ].includes(property)
                        ? undefined
                        : value
            )
        )
        .digest("hex");
}
/** @param {Value | undefined} value */
function analyticsTime(value) {
    const timestamp = value?.numberValue;
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp))
        throw new Error("Missing pre-enrollment analytics timestamp");
    return timestamp;
}
/**
 * @param {Entry[]} entries @param {(title: string, row: number, column: number,
 *   value: Value) => unknown} write @param {Request[]} prepare @param {number}
 *   sheetId
 */
function archiveComparisons(entries, write, prepare, sheetId) {
    prepare.push({
        copyPaste: {
            destination: range(comparisonId, 0, 0, 1022, 6),
            pasteType: "PASTE_FORMAT",
            source: range(sheetId, 5001, 0, 1022, 6),
        },
    });
    const archiveEntries = entries.filter(
        (entry) =>
            entry.row >= 5001 &&
            entry.column < 6 &&
            entry.cell.userEnteredValue !== undefined
    );
    for (const entry of archiveEntries)
        write(
            comparisons,
            entry.row - 5001,
            entry.column,
            transformValue(
                entry.cell.userEnteredValue ?? {},
                (formula) =>
                    shiftInventoryRow(
                        extend(formula, colorSheet),
                        entry.row + 1,
                        entry.row - 5000
                    ),
                "",
                ""
            )
        );
    for (let block = 0; block < 14; block += 1) {
        const from = 5505 + block * 37;
        const to = 1022 + block * 39;
        const header = entries.find(
            (entry) => entry.row === from && entry.column === 0
        )?.cell.userEnteredValue?.stringValue;
        if (header !== "Plant ID")
            throw new Error(`Comparison block changed: ${block}`);
        for (const [index, id] of oldIds.entries())
            if (
                entries.find(
                    (entry) =>
                        entry.row === from + index + 1 && entry.column === 0
                )?.cell.userEnteredValue?.stringValue !== id
            )
                throw new Error(
                    `Comparison roster changed: block ${block} / ${id}`
                );
        prepare.push({
            copyPaste: {
                destination: range(comparisonId, to, 0, 37, 6),
                pasteType: "PASTE_FORMAT",
                source: range(sheetId, from, 0, 37, 6),
            },
        });
        for (let offset = 0; offset < 39; offset += 1) {
            const sourceRow = from + Math.min(offset, 36);
            const rowEntries = entries.filter(
                (entry) =>
                    entry.row === sourceRow &&
                    entry.column < 6 &&
                    entry.cell.userEnteredValue !== undefined
            );
            for (const entry of rowEntries) {
                const targetRow = to + offset;
                const id = allIds[offset - 1] ?? "";
                write(
                    comparisons,
                    targetRow,
                    entry.column,
                    transformValue(
                        entry.cell.userEnteredValue ?? {},
                        (formula) =>
                            shiftInventoryRow(
                                extend(formula, colorSheet),
                                sourceRow + 1,
                                targetRow + 1
                            ).replaceAll("P38", () => id),
                        offset > 36 ? "P38" : "",
                        offset > 36 ? id : ""
                    )
                );
            }
        }
    }
}

/**
 * Mirror the 15-minute eligibility window used by native model helper formulas.
 *
 * @param {number} calculated @param {Value | undefined} clockValue
 */
function assertChartClock(calculated, clockValue) {
    const clock = clockValue?.numberValue;
    if (
        typeof clock !== "number" ||
        !Number.isFinite(clock) ||
        !Number.isFinite(calculated) ||
        calculated > clock ||
        (clock - calculated) * 1440 > 15
    )
        throw new Error(
            "Charts require a valid workbook clock and analytics no older than 15 minutes"
        );
}
/** @param {import("./inventory-expansion.mjs").Sheet} sheet */
function capturedSheetEntries(sheet) {
    /** @type {Entry[]} */ const entries = [];
    const blocks = sheet.data ?? [];
    for (const data of blocks) {
        const rows = data.rowData ?? [];
        for (const [rowOffset, row] of rows.entries()) {
            const cells = row.values ?? [];
            for (const [columnOffset, cell] of cells.entries())
                entries.push({
                    cell,
                    column: (data.startColumn ?? 0) + columnOffset,
                    row: (data.startRow ?? 0) + rowOffset,
                    sheet: sheet.properties.title,
                });
        }
    }
    return entries;
}
/** @param {Request[]} requests */
function deduplicate(requests) {
    const unique = new Map(
        requests.map((request) => [JSON.stringify(request), request])
    );
    return unique.values().toArray();
}
/** @param {string | number | boolean} value @returns {Value} */
function entered(value) {
    if (typeof value === "number") return { numberValue: value };
    if (typeof value === "boolean") return { boolValue: value };
    return value.startsWith("=")
        ? { formulaValue: value }
        : { stringValue: value };
}

/** @param {string} formula @param {string} title */
function extend(formula, title) {
    let next = extendInventoryFormula(formula, 36, 2);
    if (title === "Dry-down insights")
        next = next.replaceAll(/(?<=[A-Z]\$?2:\$?[A-Z]{1,3}\$?)37\b/gv, "39");
    if (title === environmentTitle)
        next = next.replaceAll(/(?<=[A-Z]\$?8:\$?[A-Z]{1,3}\$?)43\b/gv, "45");
    next = next.replaceAll(
        /(?<prefix>'Dry-down insights'!\$?[A-Z]{1,3}\$?)(?<start>41|81|121|161|201|241|281|321):(?<last>\$?[A-Z]{1,3}\$?)(?<end>\d{2,3})\b/gv,
        (match, prefix, start, last, end) =>
            Number(end) === Number(start) + 36
                ? `${String(prefix)}${String(start)}:${String(last)}${Number(end) + 2}`
                : match
    );
    next = next.replaceAll(
        /'Plant color data'!(?<first>\$?[A-F]\$?)(?<start>500[2-9]|50[1-9]\d|5[1-9]\d{2}|60[01]\d|602[0-3]):(?<last>\$?[A-F]\$?)(?<end>\d{1,5})/gv,
        (_match, first, start, last, end) => {
            if (Number(end) > 6023 || Number(end) < 5002)
                throw new Error(
                    "Comparison reference crosses archive boundary"
                );
            return `'${comparisons}'!${String(first)}${Number(start) - 5001}:${String(last)}${Number(end) - 5001}`;
        }
    );
    return next;
}

/** @param {Record<string, unknown>} spec @param {NativeSnapshot} metadata */
function extendChart(spec, metadata) {
    const ids = new Map(
        metadata.sheets.map((sheet) => [
            sheet.properties.sheetId,
            sheet.properties.title,
        ])
    );
    walk(spec, (item) => {
        const overrides = item["styleOverrides"];
        if (
            Array.isArray(overrides) &&
            overrides.length === 36 &&
            overrides.every(
                (override, index) =>
                    isRecord(override) &&
                    Number(override["index"] ?? 0) === index
            )
        ) {
            for (const [index, plant] of houseplantAdditions.entries())
                overrides.push({
                    colorStyle: { rgbColor: plantColor(plant.id) },
                    index: 36 + index,
                });
        }
        const title = ids.get(Number(item["sheetId"]));
        if (title === colorSheet && Number(item["startRowIndex"]) >= 5001) {
            const start = Number(item["startRowIndex"]);
            const end = Number(item["endRowIndex"]);
            if (
                start >= 5505 &&
                (start - 5505) % 37 === 0 &&
                end === start + 37
            ) {
                item["startRowIndex"] = 1022 + ((start - 5505) / 37) * 39;
                item["endRowIndex"] = Number(item["startRowIndex"]) + 39;
            } else {
                item["startRowIndex"] = start - 5001;
                item["endRowIndex"] = end - 5001;
            }
            item["sheetId"] = comparisonId;
            return;
        }
        if (
            [
                "Baselines",
                colorSheet,
                "Dry-down insights",
                insightsTitle,
                trackerTitle,
                "Workbook analytics",
            ].includes(title ?? "") &&
            item["endRowIndex"] === 37 &&
            Number(item["startRowIndex"] ?? 0) < 2
        )
            item["endRowIndex"] = 39;
        if (title === "Dashboard" && item["endRowIndex"] === 42)
            item["endRowIndex"] = 44;
        if (
            title === environmentTitle &&
            item["endRowIndex"] === 43 &&
            item["startRowIndex"] === 6
        )
            item["endRowIndex"] = 45;
    });
    // Compact selected-plant charts retain their shared previous/older roles;
    // append the selected-current series for each new identity only.
    const basic = spec["basicChart"];
    if (!isRecord(basic) || !Array.isArray(basic["series"])) return;
    const series = records(basic["series"]);
    for (const [
        sheetId,
        oldColumn,
        newColumn,
        stride,
    ] of /** @type {[number, number, number, number][]} */ ([
        [
            907_202_608,
            117,
            120,
            3,
        ],
        [
            907_202_603,
            155,
            159,
            4,
        ],
        [
            907_202_603,
            158,
            162,
            4,
        ],
    ])) {
        const original = series.find(
            (item) =>
                JSON.stringify(item).includes(`"sheetId":${sheetId},`) &&
                JSON.stringify(item).includes(
                    `"startColumnIndex":${oldColumn},`
                )
        );
        if (!original) continue;
        for (const [index, plant] of houseplantAdditions.entries()) {
            const next = structuredClone(original);
            walk(next, (item) => {
                if (
                    item["sheetId"] !== sheetId ||
                    item["startColumnIndex"] !== oldColumn
                ) {
                    return;
                }

                item["startColumnIndex"] = newColumn + index * stride;
                item["endColumnIndex"] = Number(item["startColumnIndex"]) + 1;
            });
            if (isRecord(next)) {
                delete next["color"];
                next["colorStyle"] = { rgbColor: plantColor(plant.id) };
            }
            series.push(next);
        }
    }
    basic["series"] = series;
}

/** @param {string} formula @param {number} row */
function extendIntegrityRosterCheck(formula, row) {
    if (row === 4) {
        const count = "COUNTA('Dry-down models'!A2:A39)=36";
        const lastAnchor = "N(NOT(ISFORMULA('Workbook calculations'!B37)))";
        if (!formula.includes(count) || !formula.includes(lastAnchor))
            throw new Error("Integrity primary-anchor contract changed");
        return formula
            .replace(count, "COUNTA('Dry-down models'!A2:A39)=38")
            .replace(
                lastAnchor,
                () =>
                    `${lastAnchor},N(NOT(ISFORMULA('Workbook calculations'!B38))),N(NOT(ISFORMULA('Workbook calculations'!B39)))`
            );
    }
    if (row < 6 || row > 9) return formula;
    let next = formula
        .replaceAll("A2:A38", "A2:A39")
        .replaceAll("Dashboard!B7:B43", "Dashboard!B7:B44");
    if (row === 6) {
        const beforeIds = oldIds.map((id) => `"${id}"`).join(";");
        const before = `{${beforeIds}}`;
        if (!formula.includes(before))
            throw new Error("Integrity explicit-roster contract changed");
        const afterIds = allIds.map((id) => `"${id}"`).join(";");
        const after = `{${afterIds}}`;
        next = next.replaceAll(before, () => after);
    }
    return next;
}

/** @param {NativeSnapshot} metadata @param {Request[]} requests */
function extendMetadata(metadata, requests) {
    const ends = new Map([
        ["Baselines", 37],
        ["Container members", 44],
        ["Containers", 37],
        ["Dashboard", 42],
        ["Integrity", 59],
        ["Quick log", 40],
        ["Watering calendar", 40],
        [colorsTitle, 40],
        [environmentTitle, 43],
        [trackerTitle, 37],
    ]);
    for (const sheet of metadata.sheets) {
        const end = ends.get(sheet.properties.title);
        if (end === undefined) continue;
        /** @param {unknown} object */
        const patch = (object) => {
            walk(object, (item) => {
                if (
                    item["endRowIndex"] === end &&
                    Number(item["startRowIndex"] ?? 0) < 24
                )
                    item["endRowIndex"] = end + 2;
            });
        };
        if (isRecord(sheet["basicFilter"])) {
            const filter = structuredClone(sheet["basicFilter"]);
            patch(filter);
            if (
                JSON.stringify(filter) !== JSON.stringify(sheet["basicFilter"])
            ) {
                delete filter["sortSpecs"];
                requests.push({ setBasicFilter: { filter } });
            }
        }
        const conditionalFormats = records(sheet["conditionalFormats"] ?? []);
        for (const [index, original] of conditionalFormats.entries()) {
            const rule = structuredClone(original);
            patch(rule);
            if (JSON.stringify(rule) !== JSON.stringify(original))
                requests.push({
                    updateConditionalFormatRule: {
                        index,
                        rule,
                        sheetId: sheet.properties.sheetId,
                    },
                });
        }
        const bandedRanges = records(sheet["bandedRanges"] ?? []);
        for (const original of bandedRanges) {
            const bandedRange = structuredClone(original);
            patch(bandedRange);
            if (JSON.stringify(bandedRange) !== JSON.stringify(original))
                requests.push({
                    updateBanding: { bandedRange, fields: "range" },
                });
        }
    }
}

/**
 * @param {Map<string, Entry>} entries @param {(title: string) =>
 *   import("./inventory-expansion.mjs").Sheet} meta @param {Request[]}
 *   requests
 */
function extendValidation(entries, meta, requests) {
    for (const entry of entries.values()) {
        if (excluded.has(entry.sheet) || !entry.cell.dataValidation) continue;
        const before = JSON.stringify(entry.cell.dataValidation);
        let after = extend(before, entry.sheet);
        if (
            entry.sheet === environmentTitle &&
            entry.row === 115 &&
            entry.column === 1
        ) {
            const rule = parseRecord(after);
            const condition = rule["condition"];
            if (!isRecord(condition))
                throw new Error("Missing selector condition");
            const ids = records(condition["values"]).map(
                (item) => item["userEnteredValue"]
            );
            if (JSON.stringify(ids) !== JSON.stringify(oldIds))
                throw new Error("Environment selector roster changed");
            condition["values"] = allIds.map((userEnteredValue) => ({
                userEnteredValue,
            }));
            after = JSON.stringify(rule);
        }
        if (before !== after)
            requests.push({
                setDataValidation: {
                    range: range(
                        meta(entry.sheet).properties.sheetId,
                        entry.row,
                        entry.column,
                        1,
                        1
                    ),
                    rule: parseRecord(after),
                },
            });
    }
    requests.push({
        setDataValidation: {
            range: {
                endColumnIndex: 3,
                sheetId: meta("App entries").properties.sheetId,
                startColumnIndex: 2,
                startRowIndex: 1,
            },
            rule: {
                condition: {
                    type: "ONE_OF_LIST",
                    values: allIds.map((userEnteredValue) => ({
                        userEnteredValue,
                    })),
                },
                showCustomUi: true,
                strict: true,
            },
        },
    });
}

/**
 * Native rehearsal showed updateChartSpec retaining the duplicated interval
 * chart altText. Recreate only that NEW chart, preserving ID, position and
 * border. Send the ordered delete/add pair together in one atomic batchUpdate
 * request.
 * https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#AddChartRequest
 * https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
 *
 * @param {{ chartId: number; spec: Record<string, unknown> }} native
 * @param {Record<string, unknown>} spec
 * @param {number} sheetId
 *
 * @returns {Request[]}
 */
function finalizeNewChart(native, spec, sheetId) {
    if (
        typeof spec["altText"] !== "string" ||
        spec["altText"] === native.spec["altText"]
    )
        return [{ updateChartSpec: { chartId: native.chartId, spec } }];
    const chart = /** @type {Record<string, unknown>} */ (
        structuredClone(native)
    );
    const position = chart["position"];
    const overlay = isRecord(position)
        ? position["overlayPosition"]
        : undefined;
    const anchor = isRecord(overlay) ? overlay["anchorCell"] : undefined;
    if (
        spec["title"] !== "Time between waterings" ||
        !isRecord(anchor) ||
        anchor["sheetId"] !== sheetId
    )
        throw new Error(
            "Refusing to recreate a chart outside the new interval-chart role"
        );
    chart["spec"] = spec;
    return [
        { deleteEmbeddedObject: { objectId: native.chartId } },
        { addChart: { chart } },
    ];
}

/** @param {NativeSnapshot[]} snapshots */
function flatten(snapshots) {
    /** @type {Map<string, Entry>} */ const result = new Map();
    for (const snapshot of snapshots) {
        for (const sheet of snapshot.sheets) {
            for (const entry of capturedSheetEntries(sheet)) {
                const location = key(entry.sheet, entry.row, entry.column);
                const previous = result.get(location);
                result.set(location, {
                    ...entry,
                    cell: { ...previous?.cell, ...entry.cell },
                });
            }
        }
    }
    return result;
}
/**
 * @param {number} sheetId @param {number} fromRow @param {number} fromColumn
 * @param {number} toRow @param {number} toColumn @param {number} rows @param
 *   {number} columns
 */
function formatCopy(
    sheetId,
    fromRow,
    fromColumn,
    toRow,
    toColumn,
    rows,
    columns
) {
    return {
        copyPaste: {
            destination: range(sheetId, toRow, toColumn, rows, columns),
            pasteType: "PASTE_FORMAT",
            source: range(sheetId, fromRow, fromColumn, rows, columns),
        },
    };
}

/** @param {string} title @param {number} row @param {number} column */
function key(title, row, column) {
    return `${title}:${row}:${column}`;
}

/**
 * Only P39/P40 are newly enrolled in manual care; existing pot policy is
 * unchanged.
 *
 * @param {string} formula @param {Entry} entry
 */
function manualCareAggregate(formula, entry) {
    const exclusions =
        'Baselines!$A$2:$A$39,"<>P39",Baselines!$A$2:$A$39,"<>P40"';
    if (entry.sheet === "Integrity" && entry.column === 1) {
        if (entry.row === 14 || entry.row === 15) {
            if (!formula.startsWith("=COUNTIFS(") || !formula.endsWith(")"))
                throw new Error(
                    "Manual-care Integrity COUNTIFS contract changed"
                );
            return `${formula.slice(0, -1)},${exclusions})`;
        }
        if (entry.row === 18) {
            if (formula !== '=COUNTIF(Baselines!$N$2:$N$39,"No anchor")')
                throw new Error(
                    "Manual-care Integrity anchor contract changed"
                );
            return `=COUNTIFS(Baselines!$N$2:$N$39,"No anchor",${exclusions})`;
        }
    }
    if (
        entry.sheet === "Dashboard" &&
        entry.row === 2 &&
        [
            14,
            16,
            18,
        ].includes(entry.column)
    ) {
        const denominator = "COUNTA(Baselines!$A$2:$A$39)";
        if (!formula.includes(denominator))
            throw new Error(
                "Manual-care Dashboard denominator contract changed"
            );
        return formula.replace(
            denominator,
            () => `COUNTIFS(Baselines!$A$2:$A$39,"<>",${exclusions})`
        );
    }
    return formula;
}

/** @param {string} text */
function parseRecord(text) {
    /** @type {unknown} */ const parsed = JSON.parse(text);
    if (!isRecord(parsed)) throw new Error("Expected a native metadata object");
    return parsed;
}

/**
 * @param {(typeof houseplantAdditions)[number]} plant @param {number} index
 * @param {(
 *     title: string,
 *     row: number,
 *     column: number,
 *     value: string | number | boolean
 * ) => unknown} put
 */
function populateCatalog(plant, index, put) {
    const row = 37 + index;
    for (const [column, value] of /** @type {[number, string | number][]} */ ([
        [0, plant.id],
        [2, plant.name],
        [3, "Single profile"],
        [4, 1],
        [5, plant.contents],
        [13, plant.care],
        [
            14,
            "Nursery pot; size, drainage, medium, placement, and prior watering unrecorded.",
        ],
        [15, `=HYPERLINK("${site}/containers/${plant.id}/","Open container")`],
        [
            16,
            `=HYPERLINK("#gid=${plant.sheetId}&range=A1","Open workbook page")`,
        ],
        [
            17,
            "Retailer unrecorded; Proven Winners leafjoy littles nursery branding",
        ],
        [18, "Exact purchase date unrecorded; photographs supplied 2026-10-21"],
    ]))
        put("Containers", row, column, value);
    for (const [column, value] of /** @type {[number, string][]} */ ([
        [0, plant.inventory],
        [1, plant.contents],
        [2, plant.id],
        [4, `=HYPERLINK("${site}/plants/${plant.slug}/","Open plant profile")`],
        [5, `=HYPERLINK("${site}/containers/${plant.id}/","Open container")`],
        [
            6,
            `=HYPERLINK("#gid=${plant.sheetId}&range=A1","Open workbook page")`,
        ],
        [
            7,
            "Retailer unrecorded; Proven Winners leafjoy littles nursery branding",
        ],
        [8, "Exact purchase date unrecorded; photographs supplied 2026-10-21"],
        [
            9,
            "Nursery-label identity; photographs consistent with labelled species; commercial series name preserved as printed.",
        ],
    ]))
        put("Container members", 44 + index, column, value);
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

/** @param {Record<string, unknown>} spec @param {string} id */
function recolorPageSeries(spec, id) {
    const basic = spec["basicChart"];
    if (!isRecord(basic) || !Array.isArray(basic["series"])) return;
    const seriesList = basic["series"];
    for (const series of seriesList) {
        if (!isRecord(series)) continue;
        delete series["color"];
        series["colorStyle"] = { rgbColor: plantColor(id) };
    }
}

/** @param {unknown} value @returns {Record<string, unknown>[]} */
function records(value) {
    if (!Array.isArray(value))
        throw new Error("Expected native metadata records");
    return value.map((/** @type {unknown} */ item) => {
        if (!isRecord(item))
            throw new Error("Malformed native metadata record");
        return item;
    });
}

/** @param {Record<string, unknown>} item @param {string} id */
function replaceChartIdentity(item, id) {
    for (const [property, value] of Object.entries(item)) {
        if (typeof value === "string")
            item[property] = value.replaceAll("P37", () => id);
    }
}

/**
 * @param {Value} value @param {(formula: string) => string} transform @param
 *   {string} oldId @param {string} id
 */
function transformValue(value, transform, oldId, id) {
    const next = structuredClone(value);
    if (next.formulaValue !== undefined)
        next.formulaValue = transform(next.formulaValue);
    if (next.stringValue !== undefined)
        next.stringValue = next.stringValue.replaceAll(oldId, () => id);
    return next;
}

/**
 * @param {NativeSnapshot} metadata @param {Map<string,
 *   NativeSnapshot["sheets"][number]>} sheets @param {(title: string, row:
 *   number, column: number) => Value | undefined} value
 */
function validateDestinations(metadata, sheets, value) {
    for (const plant of houseplantAdditions)
        if (
            metadata.sheets.some(
                (sheet) =>
                    sheet.properties.sheetId === plant.sheetId ||
                    sheet.properties.title.startsWith(`${plant.id} `)
            )
        )
            throw new Error(`Enrollment already installed: ${plant.id}`);
    if (
        sheets.has(comparisons) ||
        metadata.sheets.some(
            (sheet) => sheet.properties.sheetId === comparisonId
        )
    )
        throw new Error("Comparison destination already exists");
    for (const [
        title,
        column,
        expected,
    ] of /** @type {[string, number, string][]} */ ([
        [
            "History",
            66,
            "Leaf VPD source",
        ],
        [
            "App entries",
            58,
            "Leaf VPD source",
        ],
        [
            "App bulk",
            73,
            "Support details",
        ],
    ])) {
        if (value(title, 0, column)?.stringValue !== expected)
            throw new Error(`Changed intake header: ${title} / ${expected}`);
    }
}

/**
 * @param {Snapshot} snapshot @param {(title: string) =>
 *   import("./inventory-expansion.mjs").Sheet} meta @param {(title: string,
 *   row: number, column: number) => Value | undefined} value
 */
function validateSourceRoster(snapshot, meta, value) {
    const { full, metadata } = snapshot;
    for (const sheet of metadata.sheets)
        if (
            !excluded.has(sheet.properties.title) &&
            full.sheets.every(
                (current) => current.properties.title !== sheet.properties.title
            )
        )
            throw new Error(
                `Missing complete source capture: ${sheet.properties.title}`
            );
    if (
        metadata.sheets.length !== 65 ||
        metadata.sheets.reduce(
            (sum, sheet) => sum + (sheet.charts?.length ?? 0),
            0
        ) !== 182
    )
        throw new Error("Expected the reviewed 65-sheet / 182-chart workbook");
    for (const [index, id] of oldIds.entries())
        if (value(trackerTitle, index + 1, 0)?.stringValue !== id)
            throw new Error(`Current roster changed at ${id}`);
    for (const [title, columns] of /** @type {[string, number][]} */ ([
        ["History", 67],
        ["App entries", 59],
        ["App bulk", 74],
    ]))
        if (meta(title).properties.gridProperties.columnCount !== columns)
            throw new Error(`Intake schema changed: ${title}`);
    if (meta("History").properties.gridProperties.rowCount !== 50_001)
        throw new Error("Expected 50,000 History slots");
}

/**
 * @param {unknown} value @param {(record: Record<string, unknown>) => void}
 *   visit
 */
function walk(value, visit) {
    if (Array.isArray(value)) {
        for (const child of value) walk(child, visit);
        return;
    }
    if (!isRecord(value)) return;
    visit(value);
    for (const child of Object.values(value)) walk(child, visit);
}
