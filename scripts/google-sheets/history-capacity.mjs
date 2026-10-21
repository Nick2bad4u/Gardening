import { createHash } from "node:crypto";

import {
    cycleComparisonFormula,
    cycleSnapshotReadyCondition,
    cycleSnapshotStatusFormula,
    gateCycleSnapshotFormula,
} from "./cycle-comparison.mjs";
import {
    chartObservationLimit,
    historyLastRow,
    historyObservationCapacity,
} from "./history-capacity-config.mjs";
import { plantColor } from "./plant-chart-colors.mjs";
import { fullHistoryWateringGaps } from "./watering-intervals.mjs";

const environmentData = "Environment data";
const dryDownInsights = "Dry-down insights";
const plantColorData = "Plant color data";
const wateringIntervals = "Watering intervals";
const workbookAnalytics = "Workbook analytics";
const workbookCalculations = "Workbook calculations";
const historyAnchors = "History anchors";
const historyAnchorsSheetId = 907_202_613;
const historyAnchorsLastRow = historyLastRow + 1;
const historyAnchorsColumns = 9;
const historyAnchorsMarker = "Garden History anchor index v1";
const oldLastRow = 5000;
const cellBudget = 20_000_000;
const knownMissingSeriesCharts = new Map([
    [213_038_661, { dimension: false, domain: 85, plant: "P29" }],
    [801_463_046, { dimension: true, domain: 18, plant: "P38" }],
    [1_578_223_443, { dimension: false, domain: 88, plant: "P30" }],
]);
const fullSheets = new Map([
    ["App insight activity", historyLastRow],
    ["App plant charts", historyLastRow],
    ["History", historyLastRow],
    ["History view", historyLastRow],
    ["Insights data", historyLastRow],
    ["Integrity", historyObservationCapacity + 61],
    ["Light & humidity", historyObservationCapacity + 189],
    [environmentData, historyLastRow],
]);
const protectedDataSheets = new Set([
    "App bulk",
    "App entries",
    "History",
    "RO refills",
]);

/**
 * Re-read exactly the captured native ranges and full metadata immediately
 * before applying this plan. This check does not make separate Sheets calls
 * atomic.
 *
 * @param {{ preconditionDigest: string }} plan
 * @param {import("../../types/history-capacity.d.ts").HistoryCapacitySnapshot} fresh
 */
export function assertHistoryCapacityPreconditions(plan, fresh) {
    if (plan.preconditionDigest !== digest(fresh))
        throw new Error(
            "Workbook drift since capacity planning; capture and review again"
        );
}

/**
 * Plan the one-time 5,000-to-50,001-row migration from complete native metadata
 * and captured user-entered cells. Full raw projections grow; chart-only
 * helpers retain their current allocation and display the latest 4,999 relevant
 * points. Apply preparation, formulas, then chart specifications after a
 * native-copy rehearsal. Clear the four guarded custom-function anchors, deploy
 * the matching ordinary-execution analytics refresher and dynamic plant-page
 * allocator, then run an initial successful refresh before verifying charts or
 * enabling the larger save limit. The cleared spill anchors become read-only
 * materialized values; Integrity monitors headers, identity and freshness.
 *
 * @param {import("../../types/history-capacity.d.ts").HistoryCapacitySnapshot} snapshot
 * @param {import("../../types/history-capacity.d.ts").HistoryCapacityOptions} options
 *
 * @returns {import("../../types/history-capacity.d.ts").HistoryCapacityPlan}
 */
export function buildHistoryCapacityRequests(snapshot, options) {
    validateSnapshot(snapshot, options);
    const sheets = new Map(
        snapshot.metadata.sheets.map((sheet) => [sheet.properties.title, sheet])
    );
    const { allocatedCellsAfter, allocatedCellsBefore, prepareRequests } =
        prepareWorkbook(snapshot);
    const edits = [
        ...historyAnchorHelperEdits(),
        ...formulaEdits(snapshot, options.activePlantIds),
    ];
    addAnalyticsMetadata(snapshot, edits);
    addIntegrityEdits(snapshot, edits);
    /** @type {Record<string, unknown>[]} */
    const formulaRequests = [];
    for (const edit of edits) {
        const sheet = sheets.get(edit.sheet);
        const sheetId =
            edit.sheet === historyAnchors
                ? historyAnchorsSheetId
                : sheet?.properties.sheetId;
        if (sheetId === undefined) throw new Error("Missing edit sheet");
        formulaRequests.push(write(sheetId, edit.row, edit.column, edit.after));
    }
    const chartRequests = chartChanges(snapshot);
    return {
        allocatedCellsAfter,
        allocatedCellsBefore,
        chartRequests,
        edits,
        formulaRequests,
        historyLastRow,
        observationCapacity: historyObservationCapacity,
        preconditionDigest: digest(snapshot),
        prepareRequests,
    };
}

/**
 * Replace only parsed A1 range endpoints outside spreadsheet string literals.
 * Numbers in labels, chart helper bounds, and Plant color data comparison
 * blocks remain untouched.
 *
 * @param {string} formula
 */
export function extendHistoryFormulaReferences(formula) {
    return outsideStrings(formula, (part) =>
        part.replaceAll(
            /(?<sheet>'(?:App insight activity|App plant charts|Environment data|History|History view|Insights data)'|History)!(?<start>\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?)5000\b/gv,
            (
                /** @type {string} */ _match,
                /** @type {string} */ sheet,
                /** @type {string} */ start
            ) =>
                sheet === "'Environment data'" && /\$?[M-V]\$?\d+:/v.test(start)
                    ? `${sheet}!${start}${oldLastRow}`
                    : `${sheet}!${start}${historyLastRow}`
        )
    );
}

/** @param {string} formula */
export function recentHistoryChartFormula(formula) {
    if (!formula.startsWith("=")) throw new Error("Expected chart formula");
    return `=LET(capacityRows,SORT(${formula.slice(1)},1,TRUE),CHOOSEROWS(capacityRows,SEQUENCE(MIN(${chartObservationLimit},ROWS(capacityRows)),1,MAX(1,ROWS(capacityRows)-${chartObservationLimit - 1}))))`;
}

/**
 * @param {import("../../types/history-capacity.d.ts").HistoryCapacitySnapshot} snapshot
 * @param {import("../../types/history-capacity.d.ts").HistoryCapacityEdit[]} edits
 */
function addAnalyticsMetadata(snapshot, edits) {
    const labels = [
        "Analytics calculated at",
        "Analytics status",
        "Cycle plant ID",
        "Cycle pot setup",
    ];
    for (const [offset, label] of labels.entries()) {
        const column = offset + 7;
        for (const row of [0, 1]) {
            if (
                snapshot.cells.some(
                    (cell) =>
                        cell.sheet === workbookCalculations &&
                        cell.row === row &&
                        cell.column === column
                )
            )
                throw new Error("Occupied analytics metadata destination");
            edits.push({
                after:
                    row === 0
                        ? label
                        : column === 8
                          ? "Awaiting native refresh"
                          : "",
                before: "",
                column,
                row,
                sheet: workbookCalculations,
            });
        }
    }
}

/**
 * @param {import("../../types/history-capacity.d.ts").HistoryCapacitySnapshot} snapshot
 * @param {import("../../types/history-capacity.d.ts").HistoryCapacityEdit[]} edits
 */
function addIntegrityEdits(snapshot, edits) {
    // F5 compares exact formula text. Refresh only its embedded expected anchors
    // from the same reviewed edits, preserving every independent check.
    const check = snapshot.cells.find(
        (cell) =>
            cell.sheet === "Integrity" && cell.row === 4 && cell.column === 5
    );
    if (check?.value.formulaValue?.includes("FORMULATEXT(") !== true)
        throw new Error("Missing independent formula-anchor check");
    let anchorCheck = check.value.formulaValue;
    for (const edit of edits) {
        if (edit.after === "" && String(edit.before).startsWith("=GARDEN_")) {
            const reference = `'${edit.sheet}'!${columnName(edit.column)}${edit.row + 1}`;
            const prior = `N(IFERROR(FORMULATEXT(${reference}),"")<>"${String(edit.before).replaceAll('"', '""')}")`;
            if (!anchorCheck.includes(prior))
                throw new Error(
                    `Missing materialized anchor Integrity check: ${reference}`
                );
            const contract = materializedAnchorContract(
                edit.sheet,
                edit.column
            );
            anchorCheck = anchorCheck.replace(prior, () => contract);
            continue;
        }
        if (
            typeof edit.before === "string" &&
            edit.before.startsWith("=") &&
            typeof edit.after === "string" &&
            edit.after.startsWith("=")
        )
            anchorCheck = anchorCheck.replaceAll(
                `"${edit.before.replaceAll('"', '""')}"`,
                () => `"${String(edit.after).replaceAll('"', '""')}"`
            );
    }
    const helperChecks = historyAnchorHelperEdits().map((edit) => {
        const reference = `'${historyAnchors}'!${columnName(edit.column)}${edit.row + 1}`;
        const expected = String(edit.after).replaceAll('"', '""');
        return String(edit.after).startsWith("=")
            ? `N(IFERROR(FORMULATEXT(${reference}),"")<>"${expected}")`
            : `IFERROR(N(${reference}<>"${expected}"),1)`;
    });
    anchorCheck = `=SUM(${anchorCheck.slice(1)},${helperChecks.join(",")},IFERROR(N(NOT(${cycleSnapshotReadyCondition({ inventoryLastRow: 37 })})),1))`;
    if (anchorCheck !== check.value.formulaValue)
        edits.push({
            after: anchorCheck,
            before: check.value.formulaValue,
            column: 5,
            row: 4,
            sheet: "Integrity",
        });
    for (const [
        column,
        before,
        after,
    ] of /** @type {[number, string | number, string | number][]} */ ([
        [
            5,
            oldLastRow,
            historyLastRow,
        ],
        [
            7,
            "Includes row 1 headers; 4,999 supported observation slots.",
            "Includes row 1 headers; 50,000 supported observation slots.",
        ],
    ])) {
        const found = snapshot.cells.find(
            (cell) =>
                cell.sheet === "Integrity" &&
                cell.row === 12 &&
                cell.column === column
        );
        if ((found?.value.numberValue ?? found?.value.stringValue) !== before)
            throw new Error(
                "Integrity supported capacity drift or migration already installed"
            );
        edits.push({ after, before, column, row: 12, sheet: "Integrity" });
    }
}

/** @param {string} title @param {number} rows */
function captureRows(title, rows) {
    if (/^P\d{2} /v.test(title)) return 141;
    if (
        [
            "App plant charts",
            environmentData,
            "History view",
            plantColorData,
            wateringIntervals,
            workbookAnalytics,
        ].includes(title)
    )
        return 2;
    if ([dryDownInsights, "Insights data"].includes(title)) return 40;
    return title === "Light & humidity" ? 190 : rows;
}

/** @param {import("../../types/history-capacity.d.ts").HistoryCapacitySnapshot} snapshot */
function chartChanges(snapshot) {
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    const sheetNames = new Map(
        snapshot.metadata.sheets.map((sheet) => [
            sheet.properties.sheetId,
            sheet.properties.title,
        ])
    );
    const charts = snapshot.metadata.sheets.flatMap(
        (sheet) => sheet.charts ?? []
    );
    const owners = new Map(
        snapshot.metadata.sheets.flatMap((sheet) =>
            (sheet.charts ?? []).map((chart) => [
                chart.chartId,
                sheet.properties.title,
            ])
        )
    );
    for (const chart of charts) {
        const spec = structuredClone(chart.spec);
        repairKnownMissingChartSeries(
            chart.chartId,
            spec,
            owners.get(chart.chartId) ?? "",
            sheetNames
        );
        /**
         * @type {Partial<
         *     import("../../test/workbook-fixtures.d.ts").ChartSpec["basicChart"]
         * >}
         */
        const basic = spec.basicChart;
        const data = [
            ...(basic.domains ?? []).map((domain) => domain.domain),
            ...(basic.series ?? []).map((series) => series.series),
        ];
        let isWindowed = false;
        const sources = data.flatMap((entry) => entry.sourceRange.sources);
        for (const source of sources) {
            if (updateChartSource(source, sheetNames)) isWindowed = true;
        }
        if (isWindowed) {
            const label =
                "Latest 4,999 relevant points; summaries use full history.";
            const previous = spec.subtitle ?? "";
            spec.subtitle = previous === "" ? label : `${previous} · ${label}`;
        }
        if (JSON.stringify(spec) !== JSON.stringify(chart.spec))
            requests.push({
                updateChartSpec: { chartId: chart.chartId, spec },
            });
    }
    return requests;
}

/** @param {string} name */
function columnIndex(name) {
    let index = 0;
    for (let position = 0; position < name.length; position += 1)
        index = index * 26 + (name.codePointAt(position) ?? 64) - 64;
    return index - 1;
}

/** @param {number} column */
function columnName(column) {
    let label = "";
    for (
        let index = column + 1;
        index > 0;
        index = Math.floor((index - 1) / 26)
    )
        label = String.fromCodePoint(65 + ((index - 1) % 26)) + label;
    return label;
}

/** @param {import("../../types/history-capacity.d.ts").HistoryCapacitySnapshot} snapshot */
function digest(snapshot) {
    return createHash("sha256")
        .update(
            JSON.stringify({
                ...snapshot,
                cells: snapshot.cells.map((cell) => {
                    const captured = { ...cell };
                    delete captured.effectiveValue;
                    return captured;
                }),
            })
        )
        .digest("hex");
}

/**
 * @param {import("../../types/history-capacity.d.ts").HistoryCapacitySnapshot["metadata"]["sheets"][number]} sheet
 * @param {number} target @param {Record<string, unknown>[]} requests
 */
function extendMetadata(sheet, target, requests) {
    const { gridProperties, sheetId } = sheet.properties;
    const extend = (
        /** @type {import("../../test/workbook-fixtures.d.ts").GridRange} */ range
    ) => ({
        ...range,
        ...(range.endRowIndex === gridProperties.rowCount && {
            endRowIndex: target,
        }),
    });
    if (
        target > gridProperties.rowCount &&
        sheet.basicFilter?.range.endRowIndex === gridProperties.rowCount
    ) {
        const filter = {
            ...sheet.basicFilter,
            range: extend(sheet.basicFilter.range),
        };
        delete filter.sortSpecs;
        requests.push({ setBasicFilter: { filter } });
    }
    if (sheet.protectedRanges !== undefined) {
        for (const protectedRange of sheet.protectedRanges)
            if (
                target > gridProperties.rowCount &&
                protectedRange.range.endRowIndex === gridProperties.rowCount
            )
                requests.push({
                    updateProtectedRange: {
                        fields: "range",
                        protectedRange: {
                            ...protectedRange,
                            range: extend(protectedRange.range),
                        },
                    },
                });
    }
    if (sheet.bandedRanges !== undefined) {
        for (const banding of sheet.bandedRanges)
            if (
                target > gridProperties.rowCount &&
                banding.range.endRowIndex === gridProperties.rowCount
            )
                requests.push({
                    updateBanding: {
                        bandedRange: {
                            ...banding,
                            range: extend(banding.range),
                        },
                        fields: "range",
                    },
                });
    }
    const conditions = sheet.conditionalFormats ?? [];
    for (const [index, rule] of conditions.entries()) {
        const copy = structuredClone(rule);
        copy.ranges = copy.ranges.map((range) => extend(range));
        if (copy.booleanRule?.condition.type === "CUSTOM_FORMULA")
            for (const value of copy.booleanRule.condition.values)
                value.userEnteredValue = extendHistoryFormulaReferences(
                    value.userEnteredValue
                );
        if (JSON.stringify(copy) !== JSON.stringify(rule))
            requests.push({
                updateConditionalFormatRule: { index, rule: copy, sheetId },
            });
    }
}

/**
 * @param {import("../../types/history-capacity.d.ts").HistoryCapacitySnapshot} snapshot
 * @param {string[]} ids
 */
function formulaEdits(snapshot, ids) {
    /** @type {import("../../types/history-capacity.d.ts").HistoryCapacityEdit[]} */
    const edits = [];
    for (const cell of snapshot.cells) {
        const before = cell.value.formulaValue;
        if (
            before === undefined ||
            (protectedDataSheets.has(cell.sheet) &&
                (cell.sheet !== "History" || cell.column !== 13))
        )
            continue;
        let after = transformFormula(before, cell, ids);
        if (
            cell.sheet === "Integrity" &&
            cell.row === 12 &&
            cell.column === 6
        ) {
            if (before !== '=IF(F13=5000,"Info","Fail")')
                throw new Error("Integrity capacity status drift");
            after = `=IF(F13=${historyLastRow},"Info","Fail")`;
        }
        if (
            cell.sheet === "Integrity" &&
            cell.row === 11 &&
            cell.column === 5
        ) {
            if (before !== "=MAX(0,4999-F11)")
                throw new Error("Integrity remaining capacity drift");
            after = `=MAX(0,${historyObservationCapacity}-F11)`;
        }
        if (after !== before)
            edits.push({
                after,
                before,
                column: cell.column,
                row: cell.row,
                sheet: cell.sheet,
            });
    }
    return edits;
}

/**
 * @param {string} formula @param
 *   {import("../../types/workbook-integrity.d.ts").IntegrityCell} cell @param
 *   {number} inventoryLastRow
 */
function gatedCycleConsumer(formula, cell, inventoryLastRow) {
    if (
        cell.sheet === workbookAnalytics &&
        cell.row <= 1 &&
        cell.column >= 9 &&
        cell.column <= 119
    ) {
        if (
            (cell.row === 1 && !formula.startsWith("=VSTACK(")) ||
            (cell.row === 0 && !/^="P\d{2} · "&[BCD]1$/v.test(formula))
        )
            throw new Error("Cycle chart helper formula drift");
        return gateCycleSnapshotFormula(formula, {
            inventoryLastRow: inventoryLastRow,
        });
    }
    if (
        cell.sheet === "Insights" &&
        cell.column === 0 &&
        cell.row >= 836 &&
        cell.row <= 838
    ) {
        const expected = [
            `=B228&" · "&XLOOKUP(B228,'Plant tracker'!$A$2:$A$37,'Plant tracker'!$B$2:$B$37,"")`,
            `="Solid circles: "&'Workbook analytics'!B1`,
            `="Dotted diamonds: "&'Workbook analytics'!C1&" · Dashed squares: "&'Workbook analytics'!D1`,
        ];
        if (formula !== expected[cell.row - 836])
            throw new Error("Cycle view label formula drift");
        return cell.row === 836
            ? `${formula}&" · "&${cycleSnapshotStatusFormula({ inventoryLastRow: inventoryLastRow }).slice(1)}`
            : gateCycleSnapshotFormula(formula, {
                  inventoryLastRow: inventoryLastRow,
              });
    }

    return null;
}

/**
 * @param {string} formula @param
 *   {import("../../types/workbook-integrity.d.ts").IntegrityCell} cell
 */
function gatedModelConsumer(formula, cell) {
    // The legacy Insights note retained the original 30-pot return range even
    // after its lookup range grew to the current 36-pot roster.
    const modelFormula =
        formula ===
            "=IFNA(INDEX('Dry-down models'!P2:P31,MATCH(B228,'Dry-down models'!A2:A37,0)),\"Collecting evidence\")" &&
        cell.sheet === "Insights" &&
        cell.row === 230 &&
        cell.column === 0
            ? formula.replace("P2:P31", "P2:P37")
            : formula;
    const plant =
        cell.sheet === "Dashboard"
            ? `$B${cell.row + 1}`
            : cell.sheet === "Baselines" || cell.sheet === dryDownInsights
              ? `$A${cell.row + 1}`
              : cell.sheet === "Insights" &&
                  cell.column === 0 &&
                  (cell.row === 230 || cell.row === 231)
                ? "B228"
                : cell.sheet === plantColorData &&
                    cell.row === 1 &&
                    cell.column >= 128 &&
                    cell.column <= 132
                  ? '"P01"'
                  : null;
    if (plant === null || !formula.includes(plant))
        throw new Error("Unknown materialized model consumer");
    const state = "'Workbook calculations'!";
    const ready = `AND(${state}$I$2="Ready",ISNUMBER(${state}$H$2),${state}$H$2>0,${state}$H$2<=${state}$E$2,${state}$E$2-${state}$H$2<=15/1440,IFNA(XLOOKUP(${plant},'Dry-down models'!$A$2:$A$37,'Dry-down models'!$B$2:$B$37),0)=XLOOKUP(${plant},Baselines!$A$2:$A$37,Baselines!$T$2:$T$37,-1))`;
    const gated = `=IF(IFERROR(${ready},FALSE),${modelFormula.slice(1)},"")`;
    if (cell.sheet === "Baselines" && cell.column === 9)
        return `=LET(manualReview,XLOOKUP(${plant},'Plant tracker'!$A$2:$A$37,'Plant tracker'!$AD$2:$AD$37,""),IF(manualReview<>"",manualReview,${gated.slice(1)}))`;
    return gated;
}

/** @param {number} row */
function groupedHistoryAnchorFormula(row) {
    const prefix = `'${historyAnchors}'!`;
    const directory = (/** @type {string} */ column) =>
        `${prefix}$${column}$3:INDEX(${prefix}$${column}$3:$${column}$${historyAnchorsLastRow},MAX(1,${prefix}$D$4))`;
    const dates = `${prefix}$F$3:$F$${historyAnchorsLastRow}`;
    const boundedDates = `INDEX(${dates},firstAnchor):INDEX(${dates},lastAnchor)`;
    const lookup = `LET(groupKey,B${row}&"|"&TEXT(K${row},"0"),firstAnchor,XLOOKUP(groupKey,${directory("G")},${directory("H")},0,0,2),lastAnchor,XLOOKUP(groupKey,${directory("G")},${directory("I")},0,0,2),anchor,IF(firstAnchor=0,0,XLOOKUP(A${row},${boundedDates},${boundedDates},0,-1,2)),IF(anchor=0,"",anchor))`;
    const fast = `IF(OR(B${row}="",E${row}="",K${row}=""),"",IF(${prefix}$D$3=0,"",${lookup}))`;
    return `=IF(${prefix}$D$2,${fast},${historyAnchorFormula(row, historyLastRow).slice(1)})`;
}

/** @param {number} row @param {number} lastRow */
function historyAnchorFormula(row, lastRow) {
    const range = (/** @type {string} */ column) =>
        `$${column}$2:$${column}$${lastRow}`;
    return `=IF(OR(B${row}="",E${row}="",K${row}=""),"",LET(anchor,IFNA(MAX(FILTER(${range("A")},${range("B")}=B${row},${range("K")}=K${row},${range("A")}<=A${row},REGEXMATCH(${range("C")},"^(Water|Repot)$"),${range("AJ")}<>"Removed")),0),IF(anchor=0,"",anchor)))`;
}

/** @returns {import("../../types/history-capacity.d.ts").HistoryCapacityEdit[]} */
function historyAnchorHelperEdits() {
    const source = historyAnchorSource;
    const empty = [
        "A",
        "B",
        "C",
        "E",
        "K",
        "AJ",
    ]
        .map((column) => `(${source(column)}="")`)
        .join("*");
    const valid = [
        `ISNUMBER(${source("A")})`,
        `ISTEXT(${source("B")})`,
        `(${source("B")}<>"")`,
        `ISTEXT(${source("C")})`,
        `(${source("C")}<>"")`,
        `ISNUMBER(${source("K")})`,
        `(ISNUMBER(${source("E")})+(${source("E")}=""))`,
        `(ISTEXT(${source("AJ")})+(${source("AJ")}=""))`,
    ].join("*");
    const canonical = `REGEXMATCH(${source("B")},"^P[0-9]{2}$")*ISNUMBER(${source("K")})*(${source("K")}>=1)*(${source("K")}<=999999999)*(${source("K")}=INT(${source("K")}))`;
    const bounded = historyAnchorHelperRange;
    const keys = bounded("E");
    const entries = /** @type {[number, number, string][]} */ ([
        [
            0,
            0,
            historyAnchorsMarker,
        ],
        [
            1,
            0,
            "Raw timestamp",
        ],
        [
            1,
            1,
            "Raw plant",
        ],
        [
            1,
            2,
            "Raw setup",
        ],
        [
            0,
            3,
            `=IFERROR(SUMPRODUCT(N(((${empty})+(${valid}))>0))=ROWS(${source("A")}),FALSE)`,
        ],
        [
            1,
            3,
            `=IF($D$1,IFERROR(SUMPRODUCT(N(((${empty})+(${canonical}))>0))=ROWS(${source("A")}),FALSE),FALSE)`,
        ],
        [
            2,
            3,
            `=IF($D$2,SUMPRODUCT(N(REGEXMATCH(${source("C")},"^(Water|Repot)$"))*N(${source("AJ")}<>"Removed")),0)`,
        ],
        [
            3,
            3,
            `=IF(AND($D$2,$D$3>0),COUNTUNIQUE(${keys}),0)`,
        ],
        [
            2,
            0,
            `=IF($D$2,IFNA(FILTER({${source("A")},${source("B")},${source("K")}},REGEXMATCH(${source("C")},"^(Water|Repot)$"),${source("AJ")}<>"Removed"),{"","",""}),{"","",""})`,
        ],
        [
            2,
            4,
            `=IF(AND($D$2,$D$3>0),SORT(ARRAYFORMULA({${bounded("B")}&"|"&TEXT(${bounded("C")},"0"),${bounded("A")}}),1,TRUE,2,TRUE),{"",""})`,
        ],
        [
            1,
            6,
            `=IF(AND($D$2,$D$3>0),QUERY({${keys},SEQUENCE($D$3)},"select Col1,min(Col2),max(Col2) where Col1 is not null group by Col1 order by Col1 label Col1 'Key',min(Col2) 'First',max(Col2) 'Last'",0),{"Key","First","Last"})`,
        ],
    ]);
    return entries.map(
        ([
            row,
            column,
            after,
        ]) => ({
            after,
            before: "",
            column,
            row,
            sheet: historyAnchors,
        })
    );
}

/** @param {string} column */
function historyAnchorHelperRange(column) {
    return `$${column}$3:INDEX($${column}$3:$${column}$${historyAnchorsLastRow},MAX(1,$D$3))`;
}

/** @param {string} column */
function historyAnchorSource(column) {
    return `History!$${column}$2:$${column}$${historyLastRow}`;
}

/** @param {string} formula @param {string[]} ids */
function inlineIntervalGaps(formula, ids) {
    let result = formula;
    {
        /** @type {Map<string, string>} */
        const gaps = new Map();
        result = outsideStrings(result, (part) =>
            part.replaceAll(
                /'Watering intervals'!\$?(?<column>[A-Z]+)\$?2:\$?\k<column>\$?5000\b/gv,
                (
                    /** @type {string} */ _match,
                    /** @type {string} */ column
                ) => {
                    const index = columnIndex(column);
                    const id = ids[(index - 2) / 3];
                    if (id === undefined || index % 3 !== 2)
                        throw new Error(
                            "Unknown full-history interval consumer"
                        );
                    const variable = `capacityGaps${id}`;
                    gaps.set(variable, fullHistoryWateringGaps(id));
                    return variable;
                }
            )
        );
        if (gaps.size > 0)
            result = `=LET(${[...gaps].flat().join(",")},${result.slice(1)})`;
    }
    return result;
}

/**
 * @param {import("../../types/plant-chart-layout.js").LayoutChart["spec"]["basicChart"]} basic
 * @param {{ dimension: boolean; domain: number; plant: string }} known
 * @param {string} owner
 * @param {Map<number, string>} sheetNames
 */
function knownChartDomain(basic, known, owner, sheetNames) {
    const sources = basic.domains.flatMap(
        (domain) => domain.domain.sourceRange.sources
    );
    const source = sources[0];
    const expectedSheet = known.dimension ? owner : wateringIntervals;
    if (
        source === undefined ||
        basic.domains.length !== 1 ||
        sources.length !== 1 ||
        sheetNames.get(source.sheetId ?? -1) !== expectedSheet ||
        source.startColumnIndex !== known.domain ||
        source.endColumnIndex !== known.domain + 1 ||
        source.startRowIndex !== (known.dimension ? 11 : 0) ||
        source.endRowIndex !== (known.dimension ? 1000 : 5000)
    )
        throw new Error(`Known missing-series domain drift: ${known.plant}`);
    return source;
}
/** @param {string} sheet @param {number} column */
function materializedAnchorContract(sheet, column) {
    if (sheet === "Dry-down models")
        return `N(NOT(AND('Dry-down models'!A1="Plant ID",COUNTA('Dry-down models'!A2:A37)=36,SUMPRODUCT(N('Dry-down models'!A2:A37<>'Plant tracker'!A2:A37))=0,NOT(ISFORMULA('Dry-down models'!A2)))))`;
    if (sheet === workbookAnalytics)
        return `N(NOT(AND('Workbook analytics'!A1="Days since watering",NOT(ISFORMULA('Workbook analytics'!A1)))))`;
    if (column === 0)
        return `N(NOT(AND('Environment data'!A1="Observed at",'Environment data'!B1="Plant ID",NOT(ISFORMULA('Environment data'!A1)))))`;
    return `N(NOT(AND('Environment data'!W1="Observed at",'Environment data'!X1="Plant ID",'Environment data'!Y1="Previous location",'Environment data'!Z1="Recorded location",'Environment data'!AA1="Observation ID",NOT(ISFORMULA('Environment data'!W1)))))`;
}
/**
 * Keep direct dependencies while reducing native custom-function parameters.
 *
 * @param {string} formula @param
 *   {import("../../types/workbook-integrity.d.ts").IntegrityCell} cell @param
 *   {number} inventoryLastRow
 */
function materializedInputFormula(formula, cell, inventoryLastRow) {
    if (
        cell.sheet === "Dry-down models" &&
        cell.row === 1 &&
        cell.column === 0
    ) {
        const expected = `=GARDEN_DRY_DOWN({ARRAYFORMULA(N(History!A2:A5000)),History!B2:E5000,History!K2:K5000,History!P2:P5000,History!AD2:AD5000,History!AJ2:AJ5000,History!AO2:AO5000,History!AC2:AC5000,History!AI2:AI5000,History!AA2:AA5000,History!AE2:AE5000},'Plant tracker'!A2:A${inventoryLastRow})`;
        if (formula !== expected)
            throw new Error("Dry-down dependency formula drift");
        return "";
    }
    if (
        cell.sheet === workbookAnalytics &&
        cell.row === 0 &&
        cell.column === 0
    ) {
        const options = {
            historyLastRow: oldLastRow,
            inventoryLastRow,
            plantCell: "Insights!$B$228",
        };
        if (formula !== cycleComparisonFormula(options))
            throw new Error("Cycle comparison dependency formula drift");
        return "";
    }
    if (cell.sheet === environmentData && cell.row === 0 && cell.column === 0) {
        if (formula !== "=GARDEN_ENVIRONMENT_READINGS(History!A2:BH5000)")
            throw new Error("Environment dependency formula drift");
        return "";
    }
    if (
        cell.sheet === environmentData &&
        cell.row === 0 &&
        cell.column === 22
    ) {
        if (formula !== "=GARDEN_RECORDED_LOCATIONS(History!A2:BH5000)")
            throw new Error("Location dependency formula drift");
        return "";
    }
    return null;
}

/** @param {string} formula @param {(part: string) => string} transform */
function outsideStrings(formula, transform) {
    return formula
        .split(/(?<literal>"(?:[^"]|"")*")/v)
        .map((part, index) => (index % 2 === 0 ? transform(part) : part))
        .join("");
}

/** @param {import("../../types/history-capacity.d.ts").HistoryCapacitySnapshot} snapshot */
function prepareWorkbook(snapshot) {
    /** @type {Record<string, unknown>[]} */
    const prepareRequests = [];
    let allocatedCellsBefore = 0;
    let allocatedCellsAfter = historyAnchorsLastRow * historyAnchorsColumns;
    for (const sheet of snapshot.metadata.sheets) {
        const { gridProperties, sheetId, title } = sheet.properties;
        const target = fullSheets.get(title) ?? gridProperties.rowCount;
        const columns =
            title === workbookCalculations ? 11 : gridProperties.columnCount;
        allocatedCellsBefore +=
            gridProperties.rowCount * gridProperties.columnCount;
        allocatedCellsAfter += target * columns;
        if (columns > gridProperties.columnCount)
            prepareRequests.push({
                appendDimension: {
                    dimension: "COLUMNS",
                    length: columns - gridProperties.columnCount,
                    sheetId,
                },
            });
        if (title === workbookCalculations)
            prepareRequests.push({
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
                        sheetId,
                        startColumnIndex: 7,
                        startRowIndex: 1,
                    },
                },
            });
        if (target > gridProperties.rowCount) {
            prepareRequests.push(
                {
                    appendDimension: {
                        dimension: "ROWS",
                        length: target - gridProperties.rowCount,
                        sheetId,
                    },
                },
                {
                    copyPaste: {
                        destination: {
                            endColumnIndex: gridProperties.columnCount,
                            endRowIndex: target,
                            sheetId,
                            startColumnIndex: 0,
                            startRowIndex: gridProperties.rowCount,
                        },
                        pasteType: "PASTE_FORMAT",
                        source: {
                            endColumnIndex: gridProperties.columnCount,
                            endRowIndex: gridProperties.rowCount,
                            sheetId,
                            startColumnIndex: 0,
                            startRowIndex: gridProperties.rowCount - 1,
                        },
                    },
                }
            );
            if (title === "History")
                prepareRequests.push({
                    copyPaste: {
                        destination: {
                            endColumnIndex: 67,
                            endRowIndex: target,
                            sheetId,
                            startColumnIndex: 0,
                            startRowIndex: oldLastRow,
                        },
                        pasteType: "PASTE_DATA_VALIDATION",
                        source: {
                            endColumnIndex: 67,
                            endRowIndex: oldLastRow,
                            sheetId,
                            startColumnIndex: 0,
                            startRowIndex: oldLastRow - 1,
                        },
                    },
                });
        }
        extendMetadata(sheet, target, prepareRequests);
    }
    prepareRequests.push(
        {
            addSheet: {
                properties: {
                    gridProperties: {
                        columnCount: historyAnchorsColumns,
                        rowCount: historyAnchorsLastRow,
                    },
                    hidden: true,
                    sheetId: historyAnchorsSheetId,
                    title: historyAnchors,
                },
            },
        },
        {
            addProtectedRange: {
                protectedRange: {
                    description:
                        "Derived History anchor index; maintain through the logger.",
                    range: { sheetId: historyAnchorsSheetId },
                    warningOnly: true,
                },
            },
        }
    );
    // At most 50,000 observations can belong to one plant. Existing 4,999-slot
    // pages only need extra rows after that threshold; reserve the worst case.
    const growthReserve = (historyObservationCapacity - 4999) * 22;
    if (allocatedCellsAfter + growthReserve > cellBudget)
        throw new Error(
            "Capacity plan exceeds the reviewed 20-million-cell budget including plant-page growth"
        );

    return { allocatedCellsAfter, allocatedCellsBefore, prepareRequests };
}

/**
 * Days after anchor is not an absolute timestamp; select recent observations
 * before restoring the existing elapsed-day chart domain. @param {string}
 * formula
 */
function recentAnchorWeightFormula(formula) {
    const prefix = "=IFERROR(SORT(";
    const suffix = ',1,TRUE),"")';
    const oldArray = `{History!$O$2:$O$${historyLastRow},History!$E$2:$E$${historyLastRow}}`;
    if (
        !formula.startsWith(prefix) ||
        !formula.endsWith(suffix) ||
        !formula.includes(oldArray)
    )
        throw new Error("Unexpected elapsed-day chart anchor");
    const records = formula
        .slice(prefix.length, -suffix.length)
        .replace(
            oldArray,
            () =>
                `{History!$A$2:$A$${historyLastRow},ROW(History!$A$2:$A$${historyLastRow}),History!$O$2:$O$${historyLastRow},History!$E$2:$E$${historyLastRow}}`
        );
    return `=IFERROR(LET(records,${records},recent,SORTN(records,${chartObservationLimit},0,1,FALSE,2,FALSE),SORT(CHOOSECOLS(recent,3,4),1,TRUE)),"")`;
}

/**
 * Three captured charts without series are rejected by Google's update API.
 * Restore only those proven failures from the maintained plant-layout roles:
 * interval days follow the date column; dimensions use U/V with S as domain.
 * Existing presentation fields and unrelated sparse charts are untouched.
 *
 * @param {number} chartId
 * @param {import("../../test/workbook-fixtures.d.ts").ChartSpec} spec
 * @param {string} owner
 * @param {Map<number, string>} sheetNames
 */
function repairKnownMissingChartSeries(chartId, spec, owner, sheetNames) {
    const known = knownMissingSeriesCharts.get(chartId);
    if (known === undefined) return;
    const basic =
        /** @type {import("../../types/plant-chart-layout.js").LayoutChart["spec"]} */ (
            spec
        ).basicChart;
    if (
        basic.headerCount !== 1 ||
        (basic.series?.length ?? 0) !== 0 ||
        basic.chartType !== (known.dimension ? "LINE" : "COLUMN") ||
        spec.title !==
            (known.dimension
                ? "Plant dimensions • measurement history"
                : "Time between waterings") ||
        !owner.startsWith(`${known.plant} `)
    )
        throw new Error(`Known missing-series chart drift: ${chartId}`);
    const positions = basic.axis.map((axis) => axis.position).join(",");
    if (
        positions !==
        (known.dimension ? "BOTTOM_AXIS" : "BOTTOM_AXIS,LEFT_AXIS")
    )
        throw new Error(`Known missing-series axis drift: ${chartId}`);
    const source = knownChartDomain(basic, known, owner, sheetNames);
    const columns = known.dimension ? [20, 21] : [known.domain + 1];
    basic.series = columns.map((column, index) => ({
        colorStyle: { rgbColor: plantColor(known.plant) },
        series: {
            sourceRange: {
                sources: [
                    {
                        ...source,
                        endColumnIndex: column + 1,
                        startColumnIndex: column,
                    },
                ],
            },
        },
        targetAxis: "LEFT_AXIS",
        ...(known.dimension
            ? {
                  lineStyle: {
                      type: index === 0 ? "SOLID" : "MEDIUM_DASHED",
                      width: 2,
                  },
                  pointStyle:
                      index === 0 ? { size: 5 } : { shape: "DIAMOND", size: 5 },
              }
            : {
                  dataLabel: {
                      placement: "OUTSIDE_END",
                      textFormat: {
                          bold: true,
                          fontFamily: "JetBrains Mono",
                          fontSize: 12,
                      },
                      type: "DATA",
                  },
              }),
    }));
    if (known.dimension)
        basic.axis.push({
            format: structuredClone(basic.axis[0]?.format ?? {}),
            position: "LEFT_AXIS",
            title: "Size (cm)",
            viewWindowOptions: {},
        });
}

/**
 * @param {import("../../types/history-capacity.d.ts").HistoryCapacitySnapshot} snapshot
 * @param {string} sheet @param {number} startRow @param {number} startColumn
 * @param {number} endRow @param {number} endColumn
 */
function requireCapture(
    snapshot,
    sheet,
    startRow,
    startColumn,
    endRow,
    endColumn
) {
    for (let row = startRow; row < endRow; row += 1) {
        if (
            snapshot.readRanges.every(
                (range) =>
                    range.sheet !== sheet ||
                    range.startRow > row ||
                    range.startColumn > startColumn ||
                    range.endRow <= row ||
                    range.endColumn < endColumn
            )
        )
            throw new Error(
                `Missing complete formula capture: ${sheet} row ${row + 1}`
            );
    }
}

/**
 * @param {string} formula @param
 *   {import("../../types/workbook-integrity.d.ts").IntegrityCell} cell
 */
function transformChartFormula(formula, cell) {
    let result = formula;
    const isPlant = /^P\d{2} /v.test(cell.sheet);
    const isIntervalPlot =
        cell.sheet === wateringIntervals &&
        cell.row === 1 &&
        cell.column % 3 === 0;
    const isEnvironmentPlot =
        cell.sheet === environmentData &&
        cell.row === 1 &&
        [
            12,
            14,
            16,
            18,
            20,
        ].includes(cell.column);
    const isPlantPlot = isPlant && cell.row === 12 && cell.column === 18;
    const isDryPlot =
        cell.sheet === dryDownInsights && cell.row === 1 && cell.column === 25;
    if (isEnvironmentPlot)
        result = outsideStrings(result, (part) =>
            part.replaceAll(
                /(?<start>\b[A-L]2:[A-L])5000\b/gv,
                (/** @type {string} */ _match, /** @type {string} */ start) =>
                    `${start}${historyLastRow}`
            )
        );
    if (isIntervalPlot || isEnvironmentPlot || isPlantPlot || isDryPlot) {
        if (!result.includes("FILTER(") || result.includes("capacityRows"))
            throw new Error(
                `Unexpected chart anchor ${cell.sheet}!${columnName(cell.column)}${cell.row + 1}`
            );
        result = recentHistoryChartFormula(result);
    }
    if (isPlant && cell.row === 12 && cell.column === 16)
        result = recentAnchorWeightFormula(result);
    return result;
}

/**
 * @param {string} formula @param
 *   {import("../../types/workbook-integrity.d.ts").IntegrityCell} cell @param
 *   {string[]} ids
 */
function transformFormula(formula, cell, ids) {
    if (cell.sheet === "Integrity" && cell.row === 4 && cell.column === 5)
        return formula;
    const materialized = materializedInputFormula(
        formula,
        cell,
        ids.length + 1
    );
    if (materialized !== null) return materialized;
    const gated = gatedCycleConsumer(formula, cell, ids.length + 1);
    if (gated !== null) return gated;
    if (cell.sheet !== "Integrity" && formula.includes("'Dry-down models'!"))
        return gatedModelConsumer(formula, cell);
    let result = extendHistoryFormulaReferences(formula);
    if (cell.sheet === "History") {
        if (
            cell.column !== 13 ||
            formula !== historyAnchorFormula(cell.row + 1, oldLastRow)
        )
            throw new Error("Unrecognized canonical derived formula");
        return groupedHistoryAnchorFormula(cell.row + 1);
    }
    if (cell.sheet === "Integrity") {
        result = outsideStrings(result, (part) =>
            part.replaceAll(
                /(?<sheet>'P\d{2} (?:[^']|'')+')!V1:V5139\b/gv,
                "$<sheet>!V:V"
            )
        );
        result = outsideStrings(result, (part) =>
            part.replaceAll(
                /(?<start>'Light & humidity'![A-Z]+1:[A-Z]+)5188\b/gv,
                (/** @type {string} */ _match, /** @type {string} */ start) =>
                    start + String(historyObservationCapacity + 189)
            )
        );
    }
    result = transformChartFormula(result, cell);
    return cell.sheet === "Integrity"
        ? result
        : inlineIntervalGaps(result, ids);
}

/**
 * @param {import("../../test/workbook-fixtures.d.ts").GridRange} source @param
 *   {Map<number, string>} names
 */
function updateChartSource(source, names) {
    const name = names.get(source.sheetId ?? -1) ?? "";
    if (
        name === "Insights data" &&
        source.endRowIndex === oldLastRow &&
        (source.startColumnIndex ?? 0) < 4
    )
        source.endRowIndex = historyLastRow;
    if (
        /^P\d{2} /v.test(name) &&
        source.startRowIndex === 11 &&
        [
            16,
            17,
            18,
            19,
            20,
            21,
        ].includes(source.startColumnIndex ?? -1)
    ) {
        if (source.endRowIndex !== 1000)
            throw new Error("Plant chart range drift");
        source.endRowIndex = 12 + chartObservationLimit;
        return true;
    }
    return (
        [
            dryDownInsights,
            environmentData,
            plantColorData,
            wateringIntervals,
            workbookAnalytics,
        ].includes(name) &&
        (source.endRowIndex ?? 0) >= oldLastRow &&
        (source.startRowIndex ?? 0) < 12
    );
}

/**
 * @param {import("../../types/history-capacity.d.ts").HistoryCapacitySnapshot} snapshot
 * @param {string[]} ids
 */
function validateAnchors(snapshot, ids) {
    for (const [
        sheet,
        row,
        column,
        prefix,
    ] of /** @type {[string, number, number, string][]} */ ([
        [
            "History view",
            0,
            0,
            "=LET(",
        ],
        [
            "Dry-down models",
            1,
            0,
            "=GARDEN_DRY_DOWN(",
        ],
        [
            workbookAnalytics,
            0,
            0,
            "=GARDEN_CYCLE_COMPARISON(",
        ],
        [
            environmentData,
            0,
            0,
            "=GARDEN_ENVIRONMENT_READINGS(",
        ],
        [
            environmentData,
            0,
            22,
            "=GARDEN_RECORDED_LOCATIONS(",
        ],
        [
            "App plant charts",
            1,
            0,
            "=IFNA(",
        ],
        [
            "Insights data",
            0,
            0,
            "=QUERY(",
        ],
        [
            "App insight activity",
            1,
            0,
            "=IFNA(",
        ],
        [
            "Light & humidity",
            189,
            0,
            "=IFNA(",
        ],
        [
            dryDownInsights,
            1,
            25,
            "=IFNA(",
        ],
        [
            "Integrity",
            61,
            0,
            "=IFNA(",
        ],
    ])) {
        if (
            snapshot.cells
                .find(
                    (cell) =>
                        cell.sheet === sheet &&
                        cell.row === row &&
                        cell.column === column
                )
                ?.value.formulaValue?.startsWith(prefix) !== true
        )
            throw new Error(`Missing or changed required anchor: ${sheet}`);
    }
    if (
        snapshot.cells.some(
            (cell) =>
                cell.sheet === "Integrity" &&
                cell.row > 61 &&
                Object.keys(cell.value).length > 0
        )
    )
        throw new Error("Occupied Integrity diagnostic spill destination");
    for (const [index, id] of ids.entries()) {
        const pages = snapshot.metadata.sheets.filter((sheet) =>
            sheet.properties.title.startsWith(`${id} `)
        );
        if (pages.length !== 1 || !pages[0])
            throw new Error(`Missing plant page: ${id}`);
        const name = pages[0].properties.title;
        for (const [row, column] of [
            [12, 16],
            [12, 18],
            [140, 0],
        ]) {
            if (
                snapshot.cells
                    .find(
                        (cell) =>
                            cell.sheet === name &&
                            cell.row === row &&
                            cell.column === column
                    )
                    ?.value.formulaValue?.includes("FILTER(") !== true
            )
                throw new Error(`Missing plant projection: ${id}`);
        }
        if (
            snapshot.cells.find(
                (cell) =>
                    cell.sheet === wateringIntervals &&
                    cell.row === 0 &&
                    cell.column === index * 3
            )?.value.stringValue !== `${id} · Previous watering`
        )
            throw new Error("Watering interval column mapping drift");
        if (
            snapshot.cells
                .find(
                    (cell) =>
                        cell.sheet === wateringIntervals &&
                        cell.row === 1 &&
                        cell.column === index * 3
                )
                ?.value.formulaValue?.startsWith("=IFNA(LET(dates,") !== true
        )
            throw new Error("Missing interval plot anchor");
    }
}

/**
 * @param {import("../../types/history-capacity.d.ts").HistoryCapacitySnapshot} snapshot
 * @param {Set<string>} titles
 */
function validateCapturedCells(snapshot, titles) {
    const positions = new Set();
    for (const cell of snapshot.cells) {
        const key = `${cell.sheet}:${cell.row}:${cell.column}`;
        if (positions.has(key)) throw new Error("Duplicate captured cell");
        positions.add(key);
        if (
            !titles.has(cell.sheet) ||
            !Number.isSafeInteger(cell.row) ||
            !Number.isSafeInteger(cell.column) ||
            cell.row < 0 ||
            cell.column < 0
        )
            throw new Error("Invalid captured coordinate");
        if (cell.value.formulaValue !== undefined)
            validateFormulaBounds(cell.value.formulaValue, cell.sheet);
    }
}

/** @param {string} formula @param {string} sheet */
function validateFormulaBounds(formula, sheet) {
    outsideStrings(formula, (part) => {
        const matches = part.matchAll(
            /(?:'History'|History)!\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?(?<end>\d+)/gv
        );
        for (const match of matches) {
            if (
                match.groups?.["end"] !== "1" &&
                match.groups?.["end"] !== String(oldLastRow)
            )
                throw new Error(`Unknown History range bound: ${sheet}`);
        }
        return part;
    });
}

/** @param {import("../../types/history-capacity.d.ts").HistoryCapacitySnapshot["metadata"]["sheets"][number]} sheet */
function validateGrid(sheet) {
    const { gridProperties, title } = sheet.properties;
    if (title === workbookCalculations && gridProperties.columnCount !== 6)
        throw new Error("Analytics metadata allocation drift");
    if (
        !Number.isSafeInteger(gridProperties.rowCount) ||
        !Number.isSafeInteger(gridProperties.columnCount) ||
        gridProperties.rowCount < 1 ||
        gridProperties.columnCount < 1
    )
        throw new Error("Invalid grid dimensions");
    if (
        fullSheets.has(title) &&
        gridProperties.rowCount !==
            (title === "Light & humidity"
                ? 5188
                : title === "Integrity"
                  ? 414
                  : oldLastRow)
    )
        throw new Error(`Unknown old capacity or migration replay: ${title}`);
    if (
        (title === "History" || title === "History view") &&
        gridProperties.columnCount !== 67
    )
        throw new Error("History schema width drift");
    if (
        /^P\d{2} /v.test(title) &&
        (gridProperties.rowCount !== 5139 ||
            gridProperties.columnCount !== 22 ||
            sheet.charts?.length !== 4)
    )
        throw new Error(`Unexpected plant page layout: ${title}`);
}

/** @param {import("../../types/history-capacity.d.ts").HistoryCapacitySnapshot} snapshot */
function validateSheets(snapshot) {
    if (
        snapshot.metadata.sheets.some(
            (sheet) =>
                sheet.properties.title === historyAnchors ||
                sheet.properties.sheetId === historyAnchorsSheetId
        )
    )
        throw new Error("History anchor helper destination already exists");
    if (snapshot.metadata.sheets.length !== 64)
        throw new Error("Expected the reviewed 64-tab workbook");
    /** @type {Set<string>} */
    const titles = new Set();
    const sheetIds = new Set();
    for (const sheet of snapshot.metadata.sheets) {
        const { gridProperties, sheetId, title } = sheet.properties;
        if (titles.has(title) || sheetIds.has(sheetId))
            throw new Error("Duplicate sheet metadata");
        titles.add(title);
        sheetIds.add(sheetId);
        validateGrid(sheet);
        requireCapture(
            snapshot,
            title,
            0,
            0,
            captureRows(title, gridProperties.rowCount),
            gridProperties.columnCount
        );
    }
    requireCapture(snapshot, workbookAnalytics, 2, 0, 38, 8);
    requireCapture(snapshot, plantColorData, 2, 0, 5001, 6);
    requireCapture(snapshot, plantColorData, 5001, 0, 6023, 6);
    for (const title of [
        ...fullSheets.keys(),
        "Integrity",
        wateringIntervals,
        dryDownInsights,
        workbookAnalytics,
        plantColorData,
    ])
        if (!titles.has(title))
            throw new Error(`Missing required sheet: ${title}`);
    return titles;
}

/**
 * @param {import("../../types/history-capacity.d.ts").HistoryCapacitySnapshot} snapshot
 * @param {import("../../types/history-capacity.d.ts").HistoryCapacityOptions} options
 */
function validateSnapshot(snapshot, options) {
    const chartHelpers = snapshot.cells.filter(
        (cell) =>
            cell.sheet === workbookAnalytics &&
            cell.row <= 1 &&
            cell.column >= 9 &&
            cell.column <= 119 &&
            cell.value.formulaValue !== undefined
    );
    const roleLabels = snapshot.cells.filter(
        (cell) =>
            cell.sheet === "Insights" &&
            cell.column === 0 &&
            cell.row >= 836 &&
            cell.row <= 838 &&
            cell.value.formulaValue !== undefined
    );
    if (chartHelpers.length !== 219 || roleLabels.length !== 3)
        throw new Error("Cycle chart helper or label anchor drift");
    if (!snapshot.chartsCaptured)
        throw new Error("Full native chart metadata was not captured");
    const uniqueIds = new Set(options.activePlantIds);
    if (
        options.activePlantIds.length !== 36 ||
        uniqueIds.size !== 36 ||
        options.activePlantIds.some((id) => !/^P\d{2}$/v.test(id))
    )
        throw new Error("Expected the reviewed 36-plant inventory");
    if (options.historyHeaders.length !== 67)
        throw new Error("Expected the reviewed 67-column History schema");
    const titles = validateSheets(snapshot);
    validateCapturedCells(snapshot, titles);
    for (const [column, header] of options.historyHeaders.entries()) {
        if (
            snapshot.cells.find(
                (cell) =>
                    cell.sheet === "History" &&
                    cell.row === 0 &&
                    cell.column === column
            )?.value.stringValue !== header
        )
            throw new Error(`History header drift at column ${column + 1}`);
    }
    const capturedIds = snapshot.cells
        .filter(
            (cell) =>
                cell.sheet === "Plant tracker" &&
                cell.column === 0 &&
                cell.row > 0 &&
                (cell.value.stringValue ?? "") !== ""
        )
        .toSorted((a, b) => a.row - b.row)
        .map((cell) => cell.value.stringValue);
    if (JSON.stringify(capturedIds) !== JSON.stringify(options.activePlantIds))
        throw new Error("Plant tracker inventory drift");
    validateAnchors(snapshot, options.activePlantIds);
}

/**
 * @param {number} sheetId @param {number} rowIndex @param {number} column
 * @param {string | number} value
 */
function write(sheetId, rowIndex, column, value) {
    const userEnteredValue =
        typeof value === "number"
            ? { numberValue: value }
            : value.startsWith("=")
              ? { formulaValue: value }
              : { stringValue: value };
    return {
        updateCells: {
            fields: "userEnteredValue",
            rows: [{ values: [value === "" ? {} : { userEnteredValue }] }],
            start: { columnIndex: column, rowIndex, sheetId },
        },
    };
}
