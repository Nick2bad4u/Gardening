import { createHash } from "node:crypto";

const statusRanges = ["Integrity!$C$5:$C$21", "Integrity!$G$5:$G$14"];
const statuses = [
    "Pass",
    "Fail",
    "Action",
    "Info",
];
const font = "JetBrains Mono";
const calculations = "Workbook calculations";
const primaryAnchors = [
    { column: 0, prefix: "=LET(", row: 0, sheet: "History view" },
    {
        column: 0,
        prefix: "=GARDEN_DRY_DOWN(",
        row: 1,
        sheet: "Dry-down models",
    },
    { column: 4, prefix: "=NOW()", row: 1, sheet: calculations },
    { column: 5, prefix: "=INT(E2)", row: 1, sheet: calculations },
    {
        column: 0,
        prefix: "=GARDEN_CYCLE_COMPARISON(",
        row: 0,
        sheet: "Workbook analytics",
    },
    {
        column: 0,
        prefix: "=GARDEN_ENVIRONMENT_READINGS(",
        row: 0,
        sheet: "Environment data",
    },
    {
        column: 22,
        prefix: "=GARDEN_RECORDED_LOCATIONS(",
        row: 0,
        sheet: "Environment data",
    },
];

/**
 * Verify a newly captured snapshot immediately before applying the plan. This
 * is a read-only precondition, not an atomic Google Sheets transaction.
 *
 * @param {Pick<
 *     import("../../types/workbook-integrity.d.ts").IntegrityPlan,
 *     "preconditionDigest"
 * >} plan
 * @param {import("../../types/workbook-integrity.d.ts").IntegritySnapshot} fresh
 */
export function assertWorkbookIntegrityPreconditions(plan, fresh) {
    if (plan.preconditionDigest !== digest(fresh))
        throw new Error(
            "Workbook drift since Integrity planning; rebuild from a fresh snapshot"
        );
}

/**
 * Install the adjacent E4:H14 checks and two Dashboard links only. Existing
 * formulas are read as the reviewed baseline, never replaced or repaired. Empty
 * destinations must be explicitly covered by the supplied read ranges. Rehearse
 * generated formulas in a native copy before production use.
 *
 * @param {import("../../types/workbook-integrity.d.ts").IntegritySnapshot} snapshot
 * @param {import("../../types/workbook-integrity.d.ts").IntegrityOptions} options
 *
 * @returns {import("../../types/workbook-integrity.d.ts").IntegrityPlan}
 */
export function buildWorkbookIntegrityRequests(snapshot, options) {
    const {
        activePlantIds,
        historyLastRow = 5000,
        remainingWarningRows = 500,
    } = options;
    validateOptions(activePlantIds, historyLastRow, remainingWarningRows);
    const { cell, requireRead, sheet } = accessors(snapshot);
    const integrity = sheet("Integrity");
    const dashboard = sheet("Dashboard");
    validateDestinations(snapshot, historyLastRow);
    const requiredTerms = anchorChecks(snapshot, activePlantIds.length);
    const anchorFormula = `=IFERROR(SUM(${requiredTerms.join(",")}),1)`;
    if (anchorFormula.length > 45_000)
        throw new Error(
            "Required-anchor formula exceeds the reviewed size budget"
        );
    const inventoryEnd = activePlantIds.length + 2;
    requireRead("Plant tracker", 1, 0, inventoryEnd, 1);
    const capturedIds = Array.from({ length: inventoryEnd - 1 }, (_, index) => {
        const entry = cell("Plant tracker", index + 1, 0);
        return (
            entry?.effectiveValue?.stringValue ?? entry?.value.stringValue ?? ""
        );
    }).filter(Boolean);
    if (JSON.stringify(capturedIds) !== JSON.stringify(activePlantIds))
        throw new Error("Active Plant tracker inventory changed");
    const expected = `{"${activePlantIds.join('";"')}"}`;
    const tracker = `'Plant tracker'!A2:A${inventoryEnd}`;
    const baseline = `Baselines!A2:A${inventoryEnd}`;
    const projections = [
        { column: 0, range: baseline, row: 1, sheet: "Baselines" },
        {
            column: 1,
            range: `Dashboard!B7:B${inventoryEnd + 5}`,
            row: 6,
            sheet: "Dashboard",
        },
        {
            column: 0,
            range: `'Workbook calculations'!A2:A${inventoryEnd}`,
            row: 1,
            sheet: calculations,
        },
        {
            column: 0,
            range: `'Dry-down models'!A2:A${inventoryEnd}`,
            row: 1,
            sheet: "Dry-down models",
        },
    ];
    for (const projection of projections) {
        sheet(projection.sheet);
        requireRead(
            projection.sheet,
            projection.row,
            projection.column,
            projection.row + activePlantIds.length + 1,
            projection.column + 1
        );
    }
    const rows = [
        [
            "Additional check",
            "Result",
            "Status",
            "Meaning",
        ],
        [
            "Required calculation anchors",
            anchorFormula,
            statusFormula(5),
            "Changed/missing primary formulas or missing per-plant latest-weight formulas. Zero means the checked anchors match.",
        ],
        [
            "History view observation IDs",
            identityCoverageFormula(
                `History!AA2:AA${historyLastRow}`,
                `'History view'!AA2:AA${historyLastRow}`
            ),
            statusFormula(6),
            "Canonical and projected IDs must match exactly once, including Removed records.",
        ],
        [
            "Inventory / Baselines plant IDs",
            `=IFERROR(${identityCoverageFormula(expected, tracker).slice(1)}+${identityCoverageFormula(tracker, baseline).slice(1)},1)`,
            statusFormula(7),
            "Maintained inventory and Baselines each contain every active plant exactly once.",
        ],
        ...projections.slice(1).map((projection, index) => [
            `${projection.sheet} plant IDs`,
            identityCoverageFormula(tracker, projection.range),
            statusFormula(index + 8),
            "Every active plant must appear once; blank evidence remains valid.",
        ]),
        [
            "Reserved History rows used",
            "=MAX(ARRAYFORMULA(IF((LEN(History!A2:A)+LEN(History!P2:P)+LEN(History!AA2:AA))>0,ROW(History!A2:A)-1,0)))",
            '=IFERROR(IF(AND(ISFORMULA(F11),ISNUMBER(F11)),"Info","Fail"),"Fail")',
            "Last occupied observation/request/ID row less the header; includes reservations and gaps.",
        ],
        [
            "Supported rows remaining",
            `=MAX(0,${historyLastRow - 1}-F11)`,
            '=IFERROR(IF(AND(ISFORMULA(F12),ISNUMBER(F12)),"Info","Fail"),"Fail")',
            "A save may use several event rows. No automatic expansion is implied.",
        ],
        [
            "Supported last History row",
            historyLastRow,
            '=IF(F13=5000,"Info","Fail")',
            "Includes row 1 headers; 4,999 supported observation slots.",
        ],
        [
            "History capacity",
            `=IF(F11>=F13-1,"Full or exceeded",IF(F12<=${remainingWarningRows},"Approaching limit","Available"))`,
            `=IFERROR(IF(F11>=F13-1,"Fail",IF(F12<=${remainingWarningRows},"Action","Pass")),"Fail")`,
            `Review capacity with ${remainingWarningRows} or fewer slots remaining. Extend every projection before raising the bound.`,
        ],
    ];
    const links = snapshot.cells.filter(
        (entry) =>
            entry.sheet === "Dashboard" &&
            entry.value.formulaValue?.includes(
                `"#gid=${integrity.properties.sheetId}&range=A4:D21"`
            ) === true
    );
    if (links.length !== 2)
        throw new Error(
            "Expected exactly two existing Dashboard Integrity links"
        );
    const requests = [write(integrity.properties.sheetId, 3, 4, rows)];
    const seen = new Set();
    for (const link of links) {
        requireRead(
            "Dashboard",
            link.row,
            link.column,
            link.row + 1,
            link.column + 1
        );
        const formula = link.value.formulaValue ?? "";
        const status = formula.includes('" failed check"')
            ? "Fail"
            : formula.includes('" follow-up check"')
              ? "Action"
              : null;
        if (
            !status ||
            seen.has(status) ||
            !formula.includes("Integrity!$C$5:$C$21") ||
            !formula.includes('"Checks unavailable"')
        )
            throw new Error("Unexpected Dashboard Integrity indicator formula");
        seen.add(status);
        requests.push(
            write(dashboard.properties.sheetId, link.row, link.column, [
                [
                    workbookIntegrityIndicatorFormula(
                        status,
                        integrity.properties.sheetId
                    ),
                ],
            ])
        );
    }
    return {
        anchorCount: requiredTerms.length,
        footprint: [
            "Integrity!E4:H14",
            ...links.map((link) => `Dashboard!${a1(link.row, link.column)}`),
            "Dashboard!U3:V3 / W3:AE3 existing indicator format rules",
            "Integrity!E:H column widths and shared rows 5:14 automatic heights",
        ],
        preconditionDigest: digest(snapshot),
        requests: [
            ...requests,
            ...indicatorFormatRequests(dashboard),
            {
                repeatCell: {
                    cell: {
                        userEnteredFormat: {
                            textFormat: { fontFamily: font, fontSize: 10 },
                            verticalAlignment: "TOP",
                            wrapStrategy: "WRAP",
                        },
                    },
                    fields: "userEnteredFormat.textFormat.fontFamily,userEnteredFormat.textFormat.fontSize,userEnteredFormat.verticalAlignment,userEnteredFormat.wrapStrategy",
                    range: {
                        endColumnIndex: 8,
                        endRowIndex: 14,
                        sheetId: integrity.properties.sheetId,
                        startColumnIndex: 4,
                        startRowIndex: 3,
                    },
                },
            },
            {
                repeatCell: {
                    cell: {
                        userEnteredFormat: {
                            backgroundColor: {
                                blue: 0.18,
                                green: 0.24,
                                red: 0.09,
                            },
                            textFormat: {
                                bold: true,
                                foregroundColor: { blue: 1, green: 1, red: 1 },
                            },
                        },
                    },
                    fields: "userEnteredFormat.backgroundColor,userEnteredFormat.textFormat.bold,userEnteredFormat.textFormat.foregroundColor",
                    range: {
                        endColumnIndex: 8,
                        endRowIndex: 4,
                        sheetId: integrity.properties.sheetId,
                        startColumnIndex: 4,
                        startRowIndex: 3,
                    },
                },
            },
            ...[
                { endIndex: 5, pixelSize: 280, startIndex: 4 },
                { endIndex: 7, pixelSize: 90, startIndex: 5 },
                { endIndex: 8, pixelSize: 360, startIndex: 7 },
            ].map(({ endIndex, pixelSize, startIndex }) => ({
                updateDimensionProperties: {
                    fields: "pixelSize",
                    properties: { pixelSize },
                    range: {
                        dimension: "COLUMNS",
                        endIndex,
                        sheetId: integrity.properties.sheetId,
                        startIndex,
                    },
                },
            })),
            {
                autoResizeDimensions: {
                    dimensions: {
                        dimension: "ROWS",
                        endIndex: 14,
                        sheetId: integrity.properties.sheetId,
                        startIndex: 4,
                    },
                },
            },
        ],
    };
}

/**
 * Count missing, duplicate and unexpected IDs in both directions, failing
 * closed on errors. Empty matched populations correctly produce zero.
 *
 * @param {string} expected
 * @param {string} actual
 */
export function identityCoverageFormula(expected, actual) {
    return `=IFERROR(SUM(ARRAYFORMULA(IF(${expected}="",0,N(COUNTIF(${actual},${expected})<>1))))+SUM(ARRAYFORMULA(IF(${actual}="",0,N(COUNTIF(${expected},${actual})<>1)))),1)`;
}

/**
 * The same fail-closed expression is maintained by the bound logger.
 *
 * @param {"Fail" | "Action"} status
 * @param {number} sheetId
 */
export function workbookIntegrityIndicatorFormula(status, sheetId) {
    if (!Number.isSafeInteger(sheetId) || sheetId < 0)
        throw new TypeError("Invalid Integrity sheet ID");
    const countTerms = statusRanges.map(
        (range) => `COUNTIF(${range},"${status}")`
    );
    const availableTerms = statusRanges.flatMap((range) =>
        statuses.map((value) => `COUNTIF(${range},"${value}")`)
    );
    const count = `SUM(${countTerms.join(",")})`;
    const requiredStatuses = [
        ...Array.from(
            { length: 17 },
            (_, index) => `ISFORMULA(Integrity!C${index + 5})`
        ),
        ...Array.from(
            { length: 10 },
            (_, index) => `ISFORMULA(Integrity!G${index + 5})`
        ),
    ];
    const available = `AND(SUM(${availableTerms.join(",")})=27,${requiredStatuses.join(",")})`;
    const empty = status === "Fail" ? "0 · Healthy" : "0 · None outstanding";
    const label = status === "Fail" ? " failed check" : " follow-up check";
    return `=HYPERLINK("#gid=${sheetId}&range=A4:H21",IFERROR(IF(${available},IF(${count}=0,"${empty}",${count}&"${label}"&IF(${count}=1,"","s")),"Checks unavailable"),"Checks unavailable"))`;
}

/** @param {number} row @param {number} column */
function a1(row, column) {
    let label = "";
    for (
        let value = column + 1;
        value > 0;
        value = Math.floor((value - 1) / 26)
    )
        label = String.fromCodePoint(65 + ((value - 1) % 26)) + label;
    return `${label}${row + 1}`;
}

/** @param {import("../../types/workbook-integrity.d.ts").IntegritySnapshot} snapshot */
function accessors(snapshot) {
    /** @param {string} name */
    const sheet = (name) => {
        const matches = snapshot.metadata.sheets.filter(
            (entry) => entry.properties.title === name
        );
        if (matches.length !== 1 || !matches[0])
            throw new Error(`Missing or ambiguous sheet: ${name}`);
        return matches[0];
    };
    /** @param {string} name @param {number} row @param {number} column */
    const cell = (name, row, column) => {
        const matches = snapshot.cells.filter(
            (entry) =>
                entry.sheet === name &&
                entry.row === row &&
                entry.column === column
        );
        if (matches.length > 1)
            throw new Error(`Duplicate captured cell: ${name}`);
        return matches[0];
    };
    /**
     * @param {string} name @param {number} startRow @param {number} startColumn
     * @param {number} endRow @param {number} endColumn
     */
    const requireRead = (name, startRow, startColumn, endRow, endColumn) => {
        if (
            snapshot.readRanges.every(
                (range) =>
                    range.sheet !== name ||
                    range.startRow > startRow ||
                    range.startColumn > startColumn ||
                    range.endRow < endRow ||
                    range.endColumn < endColumn
            )
        )
            throw new Error(
                `Missing complete captured range: ${name} ${a1(startRow, startColumn)}:${a1(endRow - 1, endColumn - 1)}`
            );
    };
    return { cell, requireRead, sheet };
}

/**
 * @param {import("../../types/workbook-integrity.d.ts").IntegritySnapshot} snapshot
 * @param {number} plantCount
 */
function anchorChecks(snapshot, plantCount) {
    const { cell, requireRead, sheet } = accessors(snapshot);
    const terms = primaryAnchors.map((anchor) => {
        sheet(anchor.sheet);
        requireRead(
            anchor.sheet,
            anchor.row,
            anchor.column,
            anchor.row + 1,
            anchor.column + 1
        );
        const formula = cell(anchor.sheet, anchor.row, anchor.column)?.value
            .formulaValue;
        if (formula?.startsWith(anchor.prefix) !== true)
            throw new Error(
                `Required formula anchor changed: ${anchor.sheet} ${a1(anchor.row, anchor.column)}`
            );
        return `N(IFERROR(FORMULATEXT(${reference(anchor.sheet, a1(anchor.row, anchor.column))}),"")<>"${formula.replaceAll('"', '""')}")`;
    });
    for (let row = 1; row <= plantCount; row += 1) {
        requireRead(calculations, row, 1, row + 1, 2);
        if ((cell(calculations, row, 1)?.value.formulaValue ?? "") === "")
            throw new Error("Missing latest-weight calculation anchor");
        terms.push(`N(NOT(ISFORMULA('Workbook calculations'!B${row + 1})))`);
    }
    return terms;
}

/** @param {import("../../types/workbook-integrity.d.ts").IntegritySnapshot} snapshot */
function digest(snapshot) {
    return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

/**
 * Replace conditions in the four reviewed indicator rules in place, retaining
 * their exact ranges, colors, and indexes among unrelated Dashboard rules.
 *
 * @param {import("../../types/workbook-integrity.d.ts").IntegritySnapshot["metadata"]["sheets"][number]} dashboard
 */
function indicatorFormatRequests(dashboard) {
    const sheetId = dashboard.properties.sheetId;
    const rules = dashboard.conditionalFormats ?? [];
    const terms = statuses.map(
        (status) => `COUNTIF(INDIRECT("Integrity!C5:C21"),"${status}")`
    );
    const availability = `SUM(${terms.join(",")})=ROWS(INDIRECT("Integrity!C5:C21"))`;
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    for (const [
        column,
        endColumn,
        status,
        anchor,
    ] of /** @type {const} */ ([
        [
            20,
            22,
            "Fail",
            "U3",
        ],
        [
            22,
            31,
            "Action",
            "W3",
        ],
    ])) {
        for (const isHealthy of [true, false]) {
            const oldFormula = `=AND(${availability},COUNTIF(INDIRECT("Integrity!C5:C21"),"${status}")${isHealthy ? "=0" : ">0"})`;
            const matches = rules.flatMap((rule, index) => {
                const range = rule.ranges[0];
                return rule.ranges.length === 1 &&
                    range?.sheetId === sheetId &&
                    range.startRowIndex === 2 &&
                    range.endRowIndex === 3 &&
                    range.startColumnIndex === column &&
                    range.endColumnIndex === endColumn &&
                    rule.booleanRule?.condition.type === "CUSTOM_FORMULA" &&
                    rule.booleanRule.condition.values.length === 1 &&
                    rule.booleanRule.condition.values[0]?.userEnteredValue ===
                        oldFormula
                    ? [{ index, rule }]
                    : [];
            });
            const match = matches[0];
            if (matches.length !== 1 || !match?.rule.booleanRule)
                throw new Error(
                    "Dashboard Integrity conditional-format rule drift"
                );
            requests.push({
                updateConditionalFormatRule: {
                    index: match.index,
                    rule: {
                        ...match.rule,
                        booleanRule: {
                            ...match.rule.booleanRule,
                            condition: {
                                type: "CUSTOM_FORMULA",
                                values: [
                                    {
                                        userEnteredValue: isHealthy
                                            ? `=LEFT(${anchor},2)="0 "`
                                            : `=AND(ISNUMBER(SEARCH(" check",${anchor})),LEFT(${anchor},2)<>"0 ")`,
                                    },
                                ],
                            },
                        },
                    },
                    sheetId,
                },
            });
        }
    }
    return requests;
}

/** @param {string} sheet @param {string} range */
function reference(sheet, range) {
    return `'${sheet.replaceAll("'", "''")}'!${range}`;
}

/** @param {number} row */
function statusFormula(row) {
    return `=IFERROR(IF(AND(ISFORMULA(F${row}),ISNUMBER(F${row}),F${row}=0),"Pass","Fail"),"Fail")`;
}

/**
 * @param {import("../../types/workbook-integrity.d.ts").IntegritySnapshot} snapshot
 * @param {number} historyLastRow
 */
function validateDestinations(snapshot, historyLastRow) {
    const { cell, requireRead, sheet } = accessors(snapshot);
    const integrity = sheet("Integrity");
    const history = sheet("History");
    if (
        integrity.properties.gridProperties.columnCount < 8 ||
        integrity.properties.gridProperties.rowCount < 21 ||
        history.properties.gridProperties.rowCount < historyLastRow
    )
        throw new Error("Integrity or History grid is too small");
    requireRead("Integrity", 3, 4, 14, 8);
    const isOccupied = snapshot.cells.some(
        (entry) =>
            entry.sheet === "Integrity" &&
            entry.row >= 3 &&
            entry.row < 14 &&
            entry.column >= 4 &&
            entry.column < 8 &&
            Object.values(entry.value).some((value) => value !== "")
    );
    if (isOccupied)
        throw new Error(
            "Integrity destination occupied or migration already installed"
        );
    if (
        integrity.merges?.some(
            (range) =>
                range.startRowIndex < 14 &&
                range.endRowIndex > 3 &&
                range.startColumnIndex < 8 &&
                range.endColumnIndex > 4
        ) === true
    )
        throw new Error("Integrity destination contains merged cells");
    for (const [column, label] of /** @type {const} */ ([
        [0, "Date"],
        [15, "Request ID"],
        [26, "Observation ID"],
    ])) {
        requireRead("History", 0, column, 1, column + 1);
        if (cell("History", 0, column)?.value.stringValue !== label)
            throw new Error(`History header drift: ${label}`);
    }
    requireRead("Integrity", 4, 2, 21, 3);
    for (let row = 4; row < 21; row += 1) {
        if ((cell("Integrity", row, 2)?.value.formulaValue ?? "") === "")
            throw new Error("Existing Integrity status formulas are missing");
    }
}

/** @param {string[]} ids @param {number} lastRow @param {number} warning */
function validateOptions(ids, lastRow, warning) {
    if (lastRow !== 5000)
        throw new Error(
            "Review every bounded projection before changing History capacity"
        );
    if (!Number.isSafeInteger(warning) || warning < 1 || warning >= lastRow - 1)
        throw new TypeError("Invalid remaining-capacity warning");
    const unique = new Set(ids);
    if (
        ids.length === 0 ||
        ids.some((id) => !/^P\d{2}$/v.test(id)) ||
        unique.size !== ids.length
    )
        throw new Error("Expected unique active plant IDs");
}

/**
 * @param {number} sheetId @param {number} rowIndex @param {number} columnIndex
 * @param {(string | number)[][]} rows
 */
function write(sheetId, rowIndex, columnIndex, rows) {
    return {
        updateCells: {
            fields: "userEnteredValue",
            rows: rows.map((row) => ({
                values: row.map((value) => ({
                    userEnteredValue:
                        typeof value === "number"
                            ? { numberValue: value }
                            : value.startsWith("=")
                              ? { formulaValue: value }
                              : { stringValue: value },
                })),
            })),
            start: { columnIndex, rowIndex, sheetId },
        },
    };
}
