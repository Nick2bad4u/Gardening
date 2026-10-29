import { createHash } from "node:crypto";

import { isRecord } from "../build-data.mjs";
import { shiftInventoryRow } from "./inventory-expansion.mjs";
import { plantColor } from "./plant-chart-colors.mjs";
import palette from "./plant-colors.json" with { type: "json" };

/** @typedef {import("./inventory-expansion.mjs").NativeSnapshot} NativeSnapshot */
/** @typedef {import("./inventory-expansion.mjs").EnteredValue} Value */
/** @typedef {import("./inventory-expansion.mjs").Cell & { note?: string }} Cell */
/**
 * @typedef {{
 *     metadata: NativeSnapshot;
 *     full: NativeSnapshot;
 *     intake: NativeSnapshot[];
 * }} Snapshot
 */
/** @typedef {{ sheet: string; row: number; column: number; cell: Cell }} Entry */
/** @typedef {Record<string, unknown>} Request */
/** @typedef {(title: string) => import("./inventory-expansion.mjs").Sheet} Meta */
/** @typedef {(title: string) => Entry[]} Entries */
/**
 * @typedef {(
 *     title: string,
 *     row: number,
 *     col: number,
 *     entered: Value
 * ) => unknown} Write
 */
/**
 * @typedef {(
 *     title: string,
 *     row: number,
 *     col: number,
 *     text: string | number
 * ) => unknown} Put
 */
/**
 * @typedef {(
 *     title: string,
 *     row: number,
 *     col: number,
 *     rows: number,
 *     cols: number
 * ) => void} Empty
 */

export const alpineSpiresAddition = Object.freeze({
    care: "Allow the upper mix to begin drying, then inspect the root zone and drainage. Avoid persistently wet roots and whole-pot drought; no cactus dry-weight trigger.",
    contents: "Aglaonema commutatum · Igneous™ Alpine Spires™ (nursery label)",
    id: "P41",
    inventory: "Houseplant-08",
    label: "#15",
    name: "Alpine Spires Chinese evergreen",
    sheetId: 202_610_410,
    slug: "aglaonema-commutatum-alpine-spires",
    title: "P41 Alpine Spires",
});

const oldIds = [
    ...Array.from(
        { length: 32 },
        (_, i) => `P${String(i + 1).padStart(2, "0")}`
    ),
    "P35",
    "P36",
    "P37",
    "P38",
    "P39",
    "P40",
];
const allIds = [...oldIds, "P41"];
const excluded = new Set([
    "App bulk",
    "App entries",
    "History",
    "History view",
    "RO refills",
]);
const trackerTitle = "Plant tracker";
const calculationsTitle = "Workbook calculations";
const colorsTitle = "Plant colors";
const environmentTitle = "Light & humidity";
const templateTitle = "P40 Peperomia Spice is Nice";
const site = "https://nick2bad4u.github.io/Gardening";
const comparisonTitle = "Plant comparisons";
const bounded = new Set([
    "Baselines",
    calculationsTitle,
    "Containers",
    "Dry-down insights",
    "Dry-down models",
    "Insights data",
    "Plant color data",
    trackerTitle,
    "Workbook analytics",
]);

/**
 * Ignore volatile calculated cells, retaining stored
 * source/validation/metadata. @param {Snapshot} snapshot
 */
export function alpineSpiresEnrollmentDigest(snapshot) {
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

/**
 * Require a native analytics refresh after values were applied. No locally
 * calculated reference result substitutes for this ordinary bound-script gate.
 *
 * @param {NativeSnapshot} fresh @param {number} valuesAppliedAt
 */
export function assertAlpineSpiresChartPreconditions(fresh, valuesAppliedAt) {
    const cells = flatten([fresh]);
    /** @param {string} title @param {number} row @param {number} col */
    const v = (title, row, col) => {
        const cell = cells.get(key(title, row, col))?.cell;
        return cell?.effectiveValue ?? cell?.userEnteredValue;
    };
    const clock = v(calculationsTitle, 1, 4)?.numberValue,
        time = v(calculationsTitle, 1, 7)?.numberValue;
    if (
        typeof time !== "number" ||
        typeof clock !== "number" ||
        v(calculationsTitle, 1, 8)?.stringValue !== "Ready" ||
        time < valuesAppliedAt ||
        time > clock ||
        clock - time > 15 / 1440
    )
        throw new Error(
            "Fresh native analytics refresh required before chart enrollment"
        );
    for (const [i, id] of allIds.entries())
        if (v("Dry-down models", i + 1, 0)?.stringValue !== id)
            throw new Error(`Native model roster missing ${id}`);
    if (
        v("Baselines", 39, 0)?.stringValue !== "P41" ||
        v("Baselines", 39, 19)?.numberValue !== 1
    )
        throw new Error("P41 baseline setup missing");
    return true;
}

/** @param {{ preconditionDigest: string }} plan @param {Snapshot} snapshot */
export function assertAlpineSpiresEnrollmentPreconditions(plan, snapshot) {
    if (plan.preconditionDigest !== alpineSpiresEnrollmentDigest(snapshot))
        throw new Error(
            "Workbook drift since Alpine Spires enrollment planning"
        );
}

/**
 * One-time, source-first 38-to-39 container enrollment. Capture every
 * non-intake sheet's entered values/validation across its complete grid before
 * planning. Apply prepareRequests, then valueRequests, refresh native
 * analytics, verify readiness, and finalize charts. The first 1,022 archived
 * comparison rows and all existing observation/staging/RO values remain outside
 * the write set.
 *
 * @param {Snapshot} snapshot
 */
export function buildAlpineSpiresEnrollment(snapshot) {
    const { metadata } = snapshot;
    const cells = flatten([snapshot.full, ...snapshot.intake]);
    const sheets = new Map(metadata.sheets.map((s) => [s.properties.title, s]));
    /** @param {string} title */
    const meta = (title) => {
        const sheet = sheets.get(title);
        if (!sheet) throw new Error(`Missing sheet: ${title}`);
        return sheet;
    };
    /** @param {string} title @param {number} row @param {number} col */
    const value = (title, row, col) =>
        cells.get(key(title, row, col))?.cell.userEnteredValue;
    /** @param {string} title */
    const entries = (title) =>
        cells
            .values()
            .filter((e) => e.sheet === title)
            .toArray();
    validate(snapshot, meta, value);
    const template = meta(templateTitle);
    validateTemplate(
        template,
        entries(templateTitle),
        value(templateTitle, 140, 0)
    );

    /** @type {Request[]} */ const prepareRequests = [];
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
     * @param {string} title @param {number} row @param {number} col @param
     *   {Value} entered
     */
    const write = (title, row, col, entered) =>
        edits.set(key(title, row, col), {
            column: col,
            row,
            sheet: title,
            value: entered,
        });
    /**
     * @param {string} title @param {number} row @param {number} col @param
     *   {string | number} text
     */
    const put = (title, row, col, text) =>
        write(
            title,
            row,
            col,
            typeof text === "number"
                ? { numberValue: text }
                : text.startsWith("=")
                  ? { formulaValue: text }
                  : { stringValue: text }
        );
    /**
     * @param {string} title @param {number} row @param {number} col @param
     *   {number} rows @param {number} cols
     */
    function requireEmpty(title, row, col, rows, cols) {
        if (
            entries(title).some(
                (e) =>
                    e.row >= row &&
                    e.row < row + rows &&
                    e.column >= col &&
                    e.column < col + cols &&
                    (e.cell.userEnteredValue !== undefined ||
                        e.cell.effectiveValue !== undefined)
            )
        )
            throw new Error(
                `Occupied enrollment destination: ${title} R${row + 1}C${col + 1}`
            );
        emptyRanges.push({
            endColumn: col + cols,
            endRow: row + rows,
            sheet: title,
            startColumn: col,
            startRow: row,
        });
    }
    /** @param {string} title @param {number} rows @param {number} cols */
    function grow(title, rows, cols) {
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
                cols,
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
     * @param {string} title @param {number} from @param {number} to @param
     *   {number} first @param {number} last @param {boolean} [isNew]
     */
    function copyRow(title, from, to, first, last, isNew = false) {
        if (!isNew) requireEmpty(title, to, first, 1, last - first);
        prepareRequests.push(
            formatCopy(
                meta(title).properties.sheetId,
                from,
                first,
                to,
                first,
                1,
                last - first
            ),
            {
                copyPaste: {
                    destination: grid(
                        meta(title).properties.sheetId,
                        to,
                        first,
                        1,
                        last - first
                    ),
                    pasteType: "PASTE_DATA_VALIDATION",
                    source: grid(
                        meta(title).properties.sheetId,
                        from,
                        first,
                        1,
                        last - first
                    ),
                },
            }
        );
        const sourceRow = entries(title).filter(
            (e) =>
                e.row === from &&
                e.column >= first &&
                e.column < last &&
                e.cell.userEnteredValue !== undefined
        );
        for (const e of sourceRow)
            write(
                title,
                to,
                e.column,
                transform(e.cell.userEnteredValue ?? {}, (f) =>
                    copiedRowFormula(f, title, from, to)
                )
            );
    }
    grow(calculationsTitle, 40, 11);
    grow("Workbook analytics", 5001, 129);
    grow("Watering intervals", 5000, 117);
    grow("Plant color data", 5001, 171);
    grow("App bulk", 1000, 77);
    grow(colorsTitle, 43, 6);
    grow("Watering calendar", 43, 57);
    grow(comparisonTitle, 1582, 6);
    const compactedCells = compactEnvironmentColumns(
        metadata,
        cells,
        meta,
        prepareRequests
    );
    prepareRequests.push(
        {
            insertDimension: {
                inheritFromBefore: true,
                range: {
                    dimension: "ROWS",
                    endIndex: 62,
                    sheetId: meta("Integrity").properties.sheetId,
                    startIndex: 61,
                },
            },
        },
        {
            duplicateSheet: {
                insertSheetIndex: (template.properties.index ?? 44) + 1,
                newSheetId: alpineSpiresAddition.sheetId,
                newSheetName: alpineSpiresAddition.title,
                sourceSheetId: template.properties.sheetId,
            },
        },
        {
            addProtectedRange: {
                protectedRange: {
                    description:
                        "Garden workbook · P41 Alpine Spires · confirm manual edits",
                    range: { sheetId: alpineSpiresAddition.sheetId },
                    warningOnly: true,
                },
            },
        }
    );

    for (const e of cells.values()) {
        const before = e.cell.userEnteredValue?.formulaValue;
        if (
            before === undefined ||
            e.sheet === comparisonTitle ||
            excluded.has(e.sheet)
        )
            continue;
        const after = extendAlpineSpiresFormula(before, e.sheet);
        if (after !== before)
            write(
                e.sheet,
                e.row + Number(e.sheet === "Integrity" && e.row >= 61),
                e.column,
                { formulaValue: after }
            );
    }
    for (const [
        title,
        from,
        to,
        first,
        last,
    ] of /** @type {[string, number, number, number, number][]} */ ([
        [
            trackerTitle,
            38,
            39,
            0,
            36,
        ],
        [
            "Baselines",
            38,
            39,
            0,
            36,
        ],
        [
            "Dashboard",
            43,
            44,
            0,
            33,
        ],
        [
            "Quick log",
            41,
            42,
            0,
            15,
        ],
        [
            "Insights data",
            38,
            39,
            15,
            30,
        ],
        [
            "Dry-down insights",
            38,
            39,
            0,
            24,
        ],
        [
            calculationsTitle,
            38,
            39,
            0,
            3,
        ],
        [
            "Workbook analytics",
            38,
            39,
            5,
            8,
        ],
        [
            "Watering calendar",
            41,
            42,
            0,
            57,
        ],
        [
            colorsTitle,
            41,
            42,
            0,
            6,
        ],
        [
            "Plant color data",
            38,
            39,
            127,
            133,
        ],
        [
            "Containers",
            38,
            39,
            0,
            19,
        ],
        [
            "Container members",
            45,
            46,
            0,
            10,
        ],
    ]))
        copyRow(title, from, to, first, last);
    // Inserted Integrity row is empty by construction. Its formulas reference
    // baseline rows, not the visually separated roster row number.
    copyRow("Integrity", 60, 61, 0, 10, true);
    const integrityTemplate = entries("Integrity").filter(
        (e) => e.row === 60 && e.cell.userEnteredValue !== undefined
    );
    for (const e of integrityTemplate)
        write(
            "Integrity",
            61,
            e.column,
            transform(e.cell.userEnteredValue ?? {}, (f) =>
                shiftInventoryRow(
                    extendAlpineSpiresFormula(f, "Integrity"),
                    39,
                    40
                )
            )
        );

    moveEnvironmentSummary(meta, entries, prepareRequests, write, requireEmpty);
    copyRow(environmentTitle, 44, 45, 0, 14, true);
    put("Integrity", 61, 5, alpineSpiresAddition.care);
    populateCatalog(put);
    put(trackerTitle, 39, 0, "P41");
    put(trackerTitle, 39, 1, alpineSpiresAddition.name);
    put(trackerTitle, 39, 2, alpineSpiresAddition.contents);
    put(
        trackerTitle,
        39,
        13,
        `=HYPERLINK("${site}/plants/${alpineSpiresAddition.slug}/","Open")`
    );
    put(trackerTitle, 39, 14, "#15");
    put(trackerTitle, 39, 27, "Not recorded");
    put(
        trackerTitle,
        39,
        28,
        "Acquired October 28, 2026; current pot size, drainage, medium and placement unrecorded. Repot and specimen photographs pending."
    );
    put(trackerTitle, 39, 29, "");
    put(
        trackerTitle,
        39,
        30,
        "Home Depot; owner-reported purchase October 28, 2026, $19.99; Proven Winners leafjoy label"
    );
    put("Baselines", 39, 0, "P41");
    put("Baselines", 39, 1, alpineSpiresAddition.name);
    put("Baselines", 39, 19, 1);
    const medium = requiredFormula(
        value("Baselines", 38, 17),
        "Baseline medium"
    );
    put(
        "Baselines",
        39,
        17,
        extendAlpineSpiresFormula(medium, "Baselines")
            .replaceAll("$A39", "$A40")
            .replaceAll("$T39", "$T40")
    );
    put(
        "Dashboard",
        44,
        0,
        `=HYPERLINK("#gid=${alpineSpiresAddition.sheetId}","View")`
    );
    const color = palette.find((p) => p.id === "P41");
    if (!color) throw new Error("Missing P41 palette entry");
    put(colorsTitle, 42, 0, "P41");
    put(colorsTitle, 42, 1, alpineSpiresAddition.name);
    put(colorsTitle, 42, 2, color.name);
    put(colorsTitle, 42, 3, color.hex);
    put(
        colorsTitle,
        42,
        5,
        `=HYPERLINK("#gid=${alpineSpiresAddition.sheetId}","Open charts")`
    );
    prepareRequests.push({
        repeatCell: {
            cell: {
                userEnteredFormat: {
                    backgroundColorStyle: { rgbColor: plantColor("P41") },
                },
            },
            fields: "userEnteredFormat.backgroundColorStyle",
            range: grid(meta(colorsTitle).properties.sheetId, 42, 4, 1, 1),
        },
    });
    put("App bulk", 0, 76, "P41 weight (g)");
    addHelpers(meta, entries, prepareRequests, write, requireEmpty);
    addComparisons(meta, entries, prepareRequests, write);
    addPage(template, entries(templateTitle), write, put);
    put(
        templateTitle,
        2,
        6,
        `=HYPERLINK("#gid=${alpineSpiresAddition.sheetId}","Next · P41 →")`
    );
    addValidation(meta, cells, prepareRequests);
    addMetadata(metadata, prepareRequests);
    const sourceErrorScan = requiredFormula(
        value("Integrity", 11, 1),
        "Integrity error scan"
    );
    const errorScan = narrowEnvironmentErrorScan(
        extendAlpineSpiresFormula(sourceErrorScan, "Integrity")
    );
    if (!errorScan.startsWith("=SUM(") || !errorScan.endsWith(")"))
        throw new Error("Integrity error scan changed");
    const terms = [
        `SUM(ARRAYFORMULA(N(ISERROR('${alpineSpiresAddition.title}'!A1:INDEX('${alpineSpiresAddition.title}'!V:V,140+MAX(1,COUNTIF(History!$B$2:$B$50001,"P41")))))))`,
        "SUM(ARRAYFORMULA(N(ISERROR('Watering intervals'!DK1:DM5000))))",
        "SUM(ARRAYFORMULA(N(ISERROR('Workbook analytics'!DW1:DY5001))))",
        "SUM(ARRAYFORMULA(N(ISERROR('Plant color data'!FL1:FO5001))))",
        "SUM(ARRAYFORMULA(N(ISERROR('Workbook calculations'!A40:C40))))",
        "SUM(ARRAYFORMULA(N(ISERROR('Plant comparisons'!A1:F1582))))",
    ];
    put("Integrity", 11, 1, `${errorScan.slice(0, -1)},${terms.join(",")})`);
    const chartRequests = existingChartRequests(metadata);
    const values = edits.values().toArray();
    const valueRequests = values.map((edit) => ({
        updateCells: {
            fields: "userEnteredValue",
            rows: [{ values: [{ userEnteredValue: edit.value }] }],
            start: {
                columnIndex: edit.column,
                rowIndex: edit.row,
                sheetId:
                    edit.sheet === alpineSpiresAddition.title
                        ? alpineSpiresAddition.sheetId
                        : meta(edit.sheet).properties.sheetId,
            },
        },
    }));
    const { allocatedBefore, growth } = allocationBudget(
        metadata,
        prepareRequests
    );
    const allocatedAfter =
        allocatedBefore -
        compactedCells +
        growth +
        10 +
        template.properties.gridProperties.rowCount *
            template.properties.gridProperties.columnCount;
    const worstCaseCells =
        allocatedAfter +
        (50_140 - template.properties.gridProperties.rowCount) *
            template.properties.gridProperties.columnCount;
    if (worstCaseCells >= 20_000_000)
        throw new Error(
            `Enrollment exceeds the 20,000,000-cell budget: current ${allocatedAfter}, full-page ${worstCaseCells}`
        );
    return {
        allocatedAfter,
        allocatedBefore,
        chartRequests,
        chartTemplate: completeChartTemplate(metadata),
        compactedCells,
        edits: values,
        emptyRanges,
        newPageChartFinalizationRequired: true,
        originalChartIds: metadata.sheets.flatMap((s) =>
            (s.charts ?? []).map((c) => c.chartId)
        ),
        preconditionDigest: alpineSpiresEnrollmentDigest(snapshot),
        prepareRequests,
        valueRequests,
        worstCaseCells,
    };
}

/**
 * Extend only reviewed inventory bounds; observation limits stay unchanged.
 *
 * @param {string} formula @param {string} [title]
 */
export function extendAlpineSpiresFormula(formula, title = "") {
    let next = formula.replaceAll(
        /(?<name>'[^']{1,40}'|[A-Za-z][ A-Za-z]{0,39})!(?<first>\$?[A-Z]{1,3}\$?\d{1,6}):(?<last>\$?[A-Z]{1,3}\$?)(?<end>\d{1,6})(?!\d)/gv,
        (match, name, first, last, end) => {
            const sheet = String(name).replaceAll("'", "");
            const row = Number(end);
            if (
                (row === 39 && bounded.has(sheet)) ||
                (sheet === "Dashboard" && row === 44) ||
                (sheet === "Container members" && row === 46)
            )
                return `${String(name)}!${String(first)}:${String(last)}${row + 1}`;
            if (sheet === "Dry-down insights") {
                const start = /\d{1,6}$/v.exec(String(first))?.[0];
                if (
                    start !== undefined &&
                    [
                        41,
                        81,
                        121,
                        161,
                        201,
                        241,
                        281,
                        321,
                    ].includes(Number(start)) &&
                    row === Number(start) + 38
                )
                    return `${String(name)}!${String(first)}:${String(last)}${row + 1}`;
            }
            if (sheet === comparisonTitle) {
                const start = Number(/\d{1,6}$/v.exec(String(first))?.[0]);
                if (
                    start >= 1023 &&
                    (start - 1023) % 39 === 0 &&
                    row === start + 38
                ) {
                    const shifted = start + (start - 1023) / 39;
                    const firstReference = String(first).replace(
                        /\d{1,6}$/v,
                        () => String(shifted)
                    );
                    return `${String(name)}!${firstReference}:${String(last)}${shifted + 39}`;
                }
            }
            return match;
        }
    );
    switch (title) {
        case "Dry-down insights": {
            next = next.replaceAll(
                /(?<=[A-Z]\$?2:\$?[A-Z]{1,3}\$?)39\b/gv,
                "40"
            );
            break;
        }
        case environmentTitle: {
            next = next.replaceAll(
                /(?<=[A-Z]\$?8:\$?[A-Z]{1,3}\$?)45\b/gv,
                "46"
            );
            break;
        }
        default: {
            break;
        }
    }
    const beforeRoster = rosterArray(oldIds);
    next = next.replaceAll(beforeRoster, () => rosterArray(allIds));
    next = next.replaceAll(
        "COUNTA('Dry-down models'!A2:A40)=38",
        "COUNTA('Dry-down models'!A2:A40)=39"
    );
    if (
        title === "Integrity" &&
        next.includes("N(NOT(ISFORMULA('Workbook calculations'!B39)))")
    )
        next = next.replace(
            "N(NOT(ISFORMULA('Workbook calculations'!B39)))",
            "N(NOT(ISFORMULA('Workbook calculations'!B39))),N(NOT(ISFORMULA('Workbook calculations'!B40)))"
        );
    if (["Dashboard", "Integrity"].includes(title))
        next = next.replaceAll(
            'Baselines!$A$2:$A$40,"<>P40"',
            'Baselines!$A$2:$A$40,"<>P40",Baselines!$A$2:$A$40,"<>P41"'
        );
    return next;
}
/**
 * @param {ReturnType<typeof buildAlpineSpiresEnrollment>} plan @param
 *   {NativeSnapshot} metadata @param {NativeSnapshot} fresh @param {number}
 *   valuesAppliedAt
 */
export function finalizeAlpineSpiresEnrollmentCharts(
    plan,
    metadata,
    fresh,
    valuesAppliedAt
) {
    assertAlpineSpiresChartPreconditions(fresh, valuesAppliedAt);
    const page = metadata.sheets.find(
        (s) => s.properties.sheetId === alpineSpiresAddition.sheetId
    );
    if (page?.charts?.length !== 4 || plan.chartTemplate.charts?.length !== 4) {
        throw new Error("Expected four new P41 chart roles");
    }
    /** @type {Request[]} */ const requests = structuredClone(
        plan.chartRequests
    );
    for (const native of page.charts) {
        const original = plan.chartTemplate.charts.find(
            (c) => c.spec["title"] === native.spec["title"]
        );
        if (!original) throw new Error("Unknown new chart role");
        const spec = structuredClone(original.spec);
        walk(spec, (r) => {
            if (r["sheetId"] === plan.chartTemplate.properties.sheetId)
                r["sheetId"] = alpineSpiresAddition.sheetId;
            if (
                r["sheetId"] === 907_202_605 &&
                typeof r["startColumnIndex"] === "number" &&
                typeof r["endColumnIndex"] === "number"
            ) {
                r["startColumnIndex"] += 114;
                r["endColumnIndex"] += 114;
            }
            for (const [p, v] of Object.entries(r))
                if (typeof v === "string")
                    r[p] = v
                        .replaceAll("P01", "P41")
                        .replaceAll(
                            "Moon cactus",
                            () => alpineSpiresAddition.name
                        );
        });
        styleNewChart(spec);
        if (spec["title"] === "Time between waterings") {
            const chart = structuredClone(native);
            chart.spec = spec;
            requests.push(
                { deleteEmbeddedObject: { objectId: native.chartId } },
                { addChart: { chart } }
            );
        } else
            requests.push({
                updateChartSpec: { chartId: native.chartId, spec },
            });
    }
    return requests;
}
/**
 * @param {Meta} meta @param {Entries} entries @param {Request[]} prepare @param
 *   {Write} write
 */
function addComparisons(meta, entries, prepare, write) {
    const original = entries(comparisonTitle);
    const byCell = new Map(
        original.map((e) => [`${e.row}:${e.column}`, e.cell.userEnteredValue])
    );
    // Copy from the bottom so overlapping destination blocks cannot overwrite
    // a later source template. Copy each final row before its overlapping block.
    for (let b = 13; b >= 0; b -= 1) {
        const from = 1022 + b * 39,
            to = 1022 + b * 40;
        prepare.push(
            formatCopy(
                meta(comparisonTitle).properties.sheetId,
                from + 38,
                0,
                to + 39,
                0,
                1,
                6
            ),
            formatCopy(
                meta(comparisonTitle).properties.sheetId,
                from,
                0,
                to,
                0,
                39,
                6
            )
        );
        for (let offset = 0; offset < 40; offset += 1)
            for (let column = 0; column < 6; column += 1) {
                const sourceRow = from + Math.min(offset, 38),
                    targetRow = to + offset;
                const v = byCell.get(`${sourceRow}:${column}`) ?? {};
                const next = comparisonValue(
                    v,
                    sourceRow,
                    targetRow,
                    offset === 39
                );
                write(comparisonTitle, targetRow, column, next);
            }
    }
}
/**
 * @param {Meta} meta @param {Entries} entries @param {Request[]} prepare @param
 *   {Write} write @param {Empty} requireEmpty
 */
function addHelpers(meta, entries, prepare, write, requireEmpty) {
    for (const [
        title,
        from,
        to,
        width,
    ] of /** @type {[string, number, number, number][]} */ ([
        [
            "Watering intervals",
            111,
            114,
            3,
        ],
        [
            "Workbook analytics",
            123,
            126,
            3,
        ],
        [
            "Plant color data",
            163,
            167,
            4,
        ],
    ])) {
        requireEmpty(
            title,
            0,
            to,
            meta(title).properties.gridProperties.rowCount,
            width
        );
        prepare.push(
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
        const helperEntries = entries(title).filter(
            (e) =>
                e.row < 2 &&
                e.column >= from &&
                e.column < from + width &&
                e.cell.userEnteredValue !== undefined
        );
        for (const e of helperEntries)
            write(
                title,
                e.row,
                to + e.column - from,
                transform(e.cell.userEnteredValue ?? {}, (f) =>
                    extendAlpineSpiresFormula(f, title).replaceAll("P40", "P41")
                )
            );
    }
}
/** @param {NativeSnapshot} metadata @param {Request[]} requests */
function addMetadata(metadata, requests) {
    const ends = new Map([
        ["Baselines", 39],
        ["Container members", 46],
        ["Containers", 39],
        ["Dashboard", 44],
        ["Integrity", 61],
        ["Quick log", 42],
        ["Watering calendar", 42],
        [colorsTitle, 42],
        [trackerTitle, 39],
    ]);
    for (const s of metadata.sheets) {
        const end = ends.get(s.properties.title);
        if (end === undefined) continue;
        /** @param {unknown} value */
        const patch = (value) => {
            walk(value, (r) => {
                if (
                    r["sheetId"] === s.properties.sheetId &&
                    r["endRowIndex"] === end &&
                    Number(r["startRowIndex"] ?? 0) < 24
                )
                    r["endRowIndex"] = end + 1;
            });
        };
        if (isRecord(s["basicFilter"])) {
            const filter = structuredClone(s["basicFilter"]);
            patch(filter);
            if (JSON.stringify(filter) !== JSON.stringify(s["basicFilter"])) {
                delete filter["sortSpecs"];
                requests.push({ setBasicFilter: { filter } });
            }
        }
        const formats = records(s["conditionalFormats"] ?? []);
        for (const [index, source] of formats.entries()) {
            const rule = structuredClone(source);
            patch(rule);
            if (JSON.stringify(rule) !== JSON.stringify(source))
                requests.push({
                    updateConditionalFormatRule: {
                        index,
                        rule,
                        sheetId: s.properties.sheetId,
                    },
                });
        }
        const bands = records(s["bandedRanges"] ?? []);
        for (const source of bands) {
            const bandedRange = structuredClone(source);
            patch(bandedRange);
            if (JSON.stringify(bandedRange) !== JSON.stringify(source))
                requests.push({
                    updateBanding: { bandedRange, fields: "range" },
                });
        }
    }
}
/**
 * @param {import("./inventory-expansion.mjs").Sheet} template @param {Entry[]}
 *   entries @param {Write} write @param {Put} put
 */
function addPage(template, entries, write, put) {
    const entered = entries.filter(
        (e) => e.cell.userEnteredValue !== undefined
    );
    for (const e of entered)
        write(
            alpineSpiresAddition.title,
            e.row,
            e.column,
            transform(e.cell.userEnteredValue ?? {}, (f) =>
                extendAlpineSpiresFormula(f, template.properties.title)
                    .replaceAll("P40", "P41")
                    .replaceAll("202610400", "202610410")
                    .replaceAll(
                        /(?<=(?:'Plant tracker'|Baselines)!\$?[A-Z]{1,3}\$?)39\b/gv,
                        "40"
                    )
                    .replaceAll(
                        /'Watering intervals'![$0-9:A-Z]{1,40}/gv,
                        (range) =>
                            range.replaceAll(
                                /\b(?<column>DH|DI|DJ)(?=\$?\d)/gv,
                                (_match, column) =>
                                    ({ DH: "DK", DI: "DL", DJ: "DM" })[
                                        String(column)
                                    ] ?? String(column)
                            )
                    )
            )
        );
    put(alpineSpiresAddition.title, 0, 0, `P41 · ${alpineSpiresAddition.name}`);
    put(alpineSpiresAddition.title, 1, 0, alpineSpiresAddition.contents);
    put(
        alpineSpiresAddition.title,
        2,
        3,
        `=HYPERLINK("${site}/plants/${alpineSpiresAddition.slug}/","Open field guide ↗")`
    );
    put(
        alpineSpiresAddition.title,
        2,
        6,
        '=HYPERLINK("#gid=261928558","Next · P01 →")'
    );
}
/**
 * @param {Meta} meta @param {Map<string,Entry>} cells @param {Request[]}
 *   requests
 */
function addValidation(meta, cells, requests) {
    for (const e of cells.values()) {
        if (excluded.has(e.sheet) || !e.cell.dataValidation) continue;
        const before = JSON.stringify(e.cell.dataValidation);
        let after = extendAlpineSpiresFormula(before, e.sheet);
        if (
            after.includes('"userEnteredValue":"P40"') &&
            !after.includes('"userEnteredValue":"P41"')
        )
            after = after.replace(
                '"userEnteredValue":"P40"',
                '"userEnteredValue":"P40"},{"userEnteredValue":"P41"'
            );
        if (after !== before)
            requests.push({
                setDataValidation: {
                    range: grid(
                        meta(e.sheet).properties.sheetId,
                        e.row + Number(e.sheet === "Integrity" && e.row >= 61),
                        e.column,
                        1,
                        1
                    ),
                    rule: parseRecord(after),
                },
            });
    }
    requests.push(
        {
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
        },
        {
            setDataValidation: {
                range: {
                    endColumnIndex: 77,
                    sheetId: meta("App bulk").properties.sheetId,
                    startColumnIndex: 76,
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
        }
    );
}

/** @param {NativeSnapshot} metadata @param {Request[]} requests */
function allocationBudget(metadata, requests) {
    let allocatedBefore = 0,
        growth = 0;
    for (const sheet of metadata.sheets)
        allocatedBefore +=
            sheet.properties.gridProperties.rowCount *
            sheet.properties.gridProperties.columnCount;
    for (const request of requests) {
        const append = request["appendDimension"];
        if (isRecord(append)) {
            const sheet = metadata.sheets.find(
                (candidate) =>
                    candidate.properties.sheetId === append["sheetId"]
            );
            if (!sheet) throw new Error("Unknown growth sheet");
            const size =
                append["dimension"] === "ROWS"
                    ? sheet.properties.gridProperties.columnCount
                    : sheet.properties.gridProperties.rowCount;
            growth += Number(append["length"]) * size;
        }
    }
    return { allocatedBefore, growth };
}

/** @param {import("./inventory-expansion.mjs").Sheet} sheet */
function capturedEntries(sheet) {
    /** @type {Entry[]} */ const result = [];
    const blocks = sheet.data ?? [];
    for (const data of blocks) {
        const rows = data.rowData ?? [];
        for (const [r, row] of rows.entries()) {
            const cells = row.values ?? [];
            for (const [c, cell] of cells.entries())
                result.push({
                    cell,
                    column: (data.startColumn ?? 0) + c,
                    row: (data.startRow ?? 0) + r,
                    sheet: sheet.properties.title,
                });
        }
    }
    return result;
}

/** @param {string} name */
function columnIndex(name) {
    let result = 0;
    for (const character of name.replaceAll("$", ""))
        result = result * 26 + (character.codePointAt(0) ?? 64) - 64;
    return result - 1;
}

/**
 * Reclaim only the unoccupied O:V tail of the derived environment page. This
 * keeps one 50,000-observation plant page within the existing cell budget.
 * Chart positions/sizes and every populated/read/validated column survive.
 *
 * @param {NativeSnapshot} metadata @param {Map<string,Entry>} cells
 * @param {Meta} meta @param {Request[]} requests
 */
function compactEnvironmentColumns(metadata, cells, meta, requests) {
    const sheet = meta(environmentTitle);
    if (sheet.properties.gridProperties.columnCount !== 22)
        throw new Error("Environment spare-column allocation changed");
    const id = sheet.properties.sheetId;
    for (const e of cells.values()) {
        if (
            e.sheet === environmentTitle &&
            e.column >= 14 &&
            (e.cell.userEnteredValue !== undefined ||
                e.cell.effectiveValue !== undefined ||
                e.cell.dataValidation !== undefined ||
                e.cell.note !== undefined)
        )
            throw new Error(
                "Environment spare columns contain data or validation"
            );
        const storedFormula = e.cell.userEnteredValue?.formulaValue;
        const formula =
            storedFormula !== undefined &&
            e.sheet === "Integrity" &&
            e.row === 11 &&
            e.column === 1
                ? narrowEnvironmentErrorScan(storedFormula)
                : storedFormula;
        if (
            formula !== undefined &&
            formulaUsesEnvironmentTail(formula, e.sheet === environmentTitle)
        )
            throw new Error(
                `Formula references environment spare columns: ${e.sheet} R${e.row + 1}C${e.column + 1}`
            );
    }
    walk(metadata, (r) => {
        if (r["sheetId"] !== id) return;
        if (
            Number(r["startColumnIndex"] ?? 0) >= 14 ||
            Number(r["endColumnIndex"] ?? 0) > 14 ||
            Number(r["columnIndex"] ?? 0) >= 14
        )
            throw new Error(
                "Environment spare columns retain a metadata binding"
            );
    });
    requests.push({
        deleteDimension: {
            range: {
                dimension: "COLUMNS",
                endIndex: 22,
                sheetId: id,
                startIndex: 14,
            },
        },
    });
    return sheet.properties.gridProperties.rowCount * 8;
}

/**
 * @param {Value} value @param {number} sourceRow @param {number} targetRow
 * @param {boolean} isNew
 */
function comparisonValue(value, sourceRow, targetRow, isNew) {
    if (value.formulaValue !== undefined) {
        const formula = shiftInventoryRow(
            extendAlpineSpiresFormula(value.formulaValue, comparisonTitle),
            sourceRow + 1,
            targetRow + 1
        );
        return {
            formulaValue: isNew ? formula.replaceAll("P40", "P41") : formula,
        };
    }
    if (isNew && value.stringValue !== undefined)
        return { stringValue: value.stringValue.replaceAll("P40", "P41") };
    return structuredClone(value);
}

/**
 * Preserve complete series from the populated canonical page, not pruned empty
 * charts. @param {NativeSnapshot} metadata
 */
function completeChartTemplate(metadata) {
    const page = metadata.sheets.find(
        (sheet) => sheet.properties.title === "P01 Moon cactus"
    );
    if (page?.charts?.length !== 4)
        throw new Error("Complete canonical P01 chart template missing");
    const roles = new Map([
        ["Plant dimensions • measurement history", 2],
        ["Time between waterings", 1],
        ["Weight history • calendar time", 1],
        ["Weight trend after latest Water / Repot anchor", 1],
    ]);
    for (const chart of page.charts) {
        const basic = chart.spec["basicChart"],
            expected = roles.get(String(chart.spec["title"]));
        if (
            expected === undefined ||
            !isRecord(basic) ||
            records(basic["series"] ?? []).length !== expected
        )
            throw new Error("Canonical chart roles or series changed");
    }
    return structuredClone(page);
}

/**
 * Dashboard display rows have a five-row header offset from tracker/baseline
 * rows. Rebase their direct plant links independently of their local cells.
 * Roster lookup bounds are already extended; History references stay intact.
 *
 * @param {string} formula @param {string} title @param {number} from @param
 *   {number} to
 */
function copiedRowFormula(formula, title, from, to) {
    const extended = extendAlpineSpiresFormula(formula, title);
    const shifted = shiftInventoryRow(extended, from + 1, to + 1).replaceAll(
        "P40",
        "P41"
    );
    if (title !== "Dashboard") return shifted;
    return shifted.replaceAll(
        /(?<=(?:'Plant tracker'|Baselines)!\$?[A-Z]{1,3}\$?)39\b/gv,
        "40"
    );
}

/** @param {NativeSnapshot} metadata */
function existingChartRequests(metadata) {
    /** @type {Request[]} */ const requests = [];
    for (const sheet of metadata.sheets) {
        const charts = sheet.charts ?? [];
        for (const chart of charts) {
            const spec = extendChart(chart.spec, metadata);
            if (JSON.stringify(spec) !== JSON.stringify(chart.spec))
                requests.push({
                    updateChartSpec: { chartId: chart.chartId, spec },
                });
        }
    }
    return requests;
}

/** @param {Record<string, unknown>} original @param {NativeSnapshot} metadata */
function extendChart(original, metadata) {
    const spec = structuredClone(original);
    const titles = new Map(
        metadata.sheets.map((s) => [s.properties.sheetId, s.properties.title])
    );
    walk(spec, (r) => {
        const title = titles.get(Number(r["sheetId"]));
        if (
            title === comparisonTitle &&
            typeof r["startRowIndex"] === "number" &&
            r["startRowIndex"] >= 1022 &&
            (r["startRowIndex"] - 1022) % 39 === 0 &&
            r["endRowIndex"] === r["startRowIndex"] + 39
        ) {
            const start = r["startRowIndex"] + (r["startRowIndex"] - 1022) / 39;
            r["startRowIndex"] = start;
            r["endRowIndex"] = start + 40;
        }
        if (
            title !== undefined &&
            bounded.has(title) &&
            r["endRowIndex"] === 39 &&
            Number(r["startRowIndex"] ?? 0) < 2
        )
            r["endRowIndex"] = 40;
        if (title === "Dashboard" && r["endRowIndex"] === 44)
            r["endRowIndex"] = 45;
        if (
            title === environmentTitle &&
            r["endRowIndex"] === 45 &&
            r["startRowIndex"] === 6
        )
            r["endRowIndex"] = 46;
        const overrides = r["styleOverrides"];
        if (
            Array.isArray(overrides) &&
            overrides.length === 38 &&
            overrides.every(
                (o, i) => isRecord(o) && Number(o["index"] ?? 0) === i
            )
        )
            overrides.push({
                colorStyle: { rgbColor: plantColor("P41") },
                index: 38,
            });
    });
    const basic = spec["basicChart"];
    if (isRecord(basic) && Array.isArray(basic["series"])) {
        const list = records(basic["series"]);
        for (const [
            sheetId,
            from,
            to,
        ] of /** @type {[number, number, number][]} */ ([
            [
                907_202_608,
                123,
                126,
            ],
            [
                907_202_603,
                163,
                167,
            ],
            [
                907_202_603,
                166,
                170,
            ],
        ])) {
            const source = list.find((series) =>
                hasBinding(series, sheetId, from)
            );
            if (!isRecord(source)) continue;
            const added = structuredClone(source);
            walk(added, (r) => {
                if (
                    r["sheetId"] !== sheetId ||
                    r["startColumnIndex"] !== from
                ) {
                    return;
                }

                r["startColumnIndex"] = to;
                r["endColumnIndex"] = to + 1;
            });
            delete added["color"];
            added["colorStyle"] = { rgbColor: plantColor("P41") };
            list.push(added);
        }
        basic["series"] = list;
    }
    return spec;
}

/** @param {NativeSnapshot[]} snapshots */
function flatten(snapshots) {
    /** @type {Map<string, Entry>} */ const cells = new Map();
    for (const snapshot of snapshots)
        for (const sheet of snapshot.sheets) {
            const entries = capturedEntries(sheet);
            for (const entry of entries) {
                const id = key(entry.sheet, entry.row, entry.column);
                cells.set(id, {
                    ...entry,
                    cell: { ...cells.get(id)?.cell, ...entry.cell },
                });
            }
        }
    return cells;
}

/**
 * @param {number} sheetId @param {number} row @param {number} col @param
 *   {number} toRow @param {number} toCol @param {number} rows @param {number}
 *   cols
 */
function formatCopy(sheetId, row, col, toRow, toCol, rows, cols) {
    return {
        copyPaste: {
            destination: grid(sheetId, toRow, toCol, rows, cols),
            pasteType: "PASTE_FORMAT",
            source: grid(sheetId, row, col, rows, cols),
        },
    };
}

/** @param {string} formula @param {boolean} sameSheet */
function formulaUsesEnvironmentTail(formula, sameSheet) {
    // Inspect both ends, including full-column ranges. Strip qualified ranges
    // before considering unqualified references on the environment sheet.
    const qualifiedPattern =
        /(?<name>'[^']{1,100}'|[A-Za-z][ A-Za-z]{0,40})!(?<range>[$0-9:A-Z]{1,40})/gv;
    const qualified = formula.matchAll(qualifiedPattern);
    for (const match of qualified) {
        const name = match.groups?.["name"],
            range = match.groups?.["range"];
        if (
            name !== undefined &&
            range !== undefined &&
            name.replaceAll("'", "") === environmentTitle &&
            hasTailColumns(range)
        )
            return true;
    }
    if (!sameSheet) return false;
    const unqualified = formula.replaceAll(qualifiedPattern, "");
    const expression = unqualified.replaceAll(/"(?:[^"]|"")*"/gv, "");
    const cells = expression.matchAll(
        /(?<![0-9A-Z_])(?<range>\$?[A-Z]{1,3}\$?\d{1,6})(?![0-9A-Z_])/gv
    );
    const columns = expression.matchAll(
        /(?<![0-9A-Z_])(?<range>\$?[A-Z]{1,3}:\$?[A-Z]{1,3})(?![0-9A-Z_])/gv
    );
    const references = Iterator.concat(cells, columns);
    for (const match of references) {
        const range = match.groups?.["range"];
        if (range !== undefined && hasTailColumns(range)) return true;
    }
    return false;
}

/**
 * @param {number} sheetId @param {number} row @param {number} col @param
 *   {number} rows @param {number} cols
 */
function grid(sheetId, row, col, rows, cols) {
    return {
        endColumnIndex: col + cols,
        endRowIndex: row + rows,
        sheetId,
        startColumnIndex: col,
        startRowIndex: row,
    };
}

/**
 * @param {unknown} value @param {number} sheetId @param {number} column
 *
 * @returns {boolean}
 */
function hasBinding(value, sheetId, column) {
    if (Array.isArray(value))
        return value.some((/** @type {unknown} */ item) =>
            hasBinding(item, sheetId, column)
        );
    if (!isRecord(value)) return false;
    if (value["sheetId"] === sheetId && value["startColumnIndex"] === column)
        return true;
    return Object.values(value).some((item) =>
        hasBinding(item, sheetId, column)
    );
}

/** @param {string} range */
function hasTailColumns(range) {
    return range
        .split(":")
        .some(
            (reference) =>
                columnIndex(reference.replaceAll(/[^A-Z]/gv, "")) >= 14
        );
}

/** @param {string} title @param {number} row @param {number} col */
function key(title, row, col) {
    return `${title}:${row}:${col}`;
}

/**
 * @param {Meta} meta @param {Entries} entries @param {Request[]} prepare @param
 *   {Write} write @param {Empty} requireEmpty
 */
function moveEnvironmentSummary(meta, entries, prepare, write, requireEmpty) {
    requireEmpty(environmentTitle, 46, 0, 1, 14);
    const sheetId = meta(environmentTitle).properties.sheetId;
    const notes = entries(environmentTitle).filter(
        (e) => e.row === 45 && e.cell.userEnteredValue !== undefined
    );
    if (
        notes.length !== 2 ||
        notes.some(
            (e) =>
                ![0, 13].includes(e.column) ||
                e.cell.userEnteredValue?.formulaValue === undefined
        )
    )
        throw new Error("Environment summary boundary changed");
    const merge = meta(environmentTitle)["merges"] ?? [];
    if (
        !Array.isArray(merge) ||
        merge.every(
            (r) =>
                !isRecord(r) ||
                r["startRowIndex"] !== 45 ||
                r["endRowIndex"] !== 46 ||
                r["startColumnIndex"] !== 0 ||
                r["endColumnIndex"] !== 8
        )
    )
        throw new Error("Environment summary merge changed");
    prepare.push(
        { unmergeCells: { range: grid(sheetId, 45, 0, 1, 8) } },
        formatCopy(sheetId, 45, 0, 46, 0, 1, 14),
        {
            mergeCells: {
                mergeType: "MERGE_ALL",
                range: grid(sheetId, 46, 0, 1, 8),
            },
        }
    );
    for (const e of notes)
        write(e.sheet, 46, e.column, {
            formulaValue: extendAlpineSpiresFormula(
                requiredFormula(e.cell.userEnteredValue, "Environment summary"),
                e.sheet
            ),
        });
}

/**
 * Only the exact reviewed broad error scan loses the unused O:V tail. @param
 * {string} formula
 */
function narrowEnvironmentErrorScan(formula) {
    return formula.replaceAll(
        "'Light & humidity'!K1:V50189",
        "'Light & humidity'!K1:N50189"
    );
}

/** @param {string} text */
function parseRecord(text) {
    /** @type {unknown} */ const value = JSON.parse(text);
    if (!isRecord(value)) throw new Error("Malformed native metadata object");
    return value;
}

/** @param {Put} put */
function populateCatalog(put) {
    const p = alpineSpiresAddition;
    const source =
        "Home Depot; owner-reported purchase October 28, 2026, $19.99; Proven Winners leafjoy nursery label";
    const pending =
        "Current pot size, drainage, medium, placement and starting measurements unrecorded; repot and specimen photographs pending. Label photograph only.";
    for (const [column, text] of /** @type {[number, string | number][]} */ ([
        [0, p.id],
        [2, p.name],
        [3, "Single profile"],
        [4, 1],
        [5, p.contents],
        [13, p.care],
        [14, pending],
        [15, `=HYPERLINK("${site}/containers/P41/","Open container")`],
        [16, `=HYPERLINK("#gid=${p.sheetId}&range=A1","Open workbook page")`],
        [17, source],
        [18, "2026-10-28"],
    ]))
        put("Containers", 39, column, text);
    for (const [column, text] of /** @type {[number, string][]} */ ([
        [0, p.inventory],
        [1, p.contents],
        [2, p.id],
        [4, `=HYPERLINK("${site}/plants/${p.slug}/","Open plant profile")`],
        [5, `=HYPERLINK("${site}/containers/P41/","Open container")`],
        [6, `=HYPERLINK("#gid=${p.sheetId}&range=A1","Open workbook page")`],
        [7, source],
        [8, "2026-10-28"],
        [
            9,
            "Nursery label reads Igneous™ Alpine Spires™ / Aglaonema commutatum. Label illustration is not a specimen photograph; trade name preserved, cultivar code unverified. Owner reports barcode text trial; barcode not supplied.",
        ],
    ]))
        put("Container members", 46, column, text);
}

/** @param {unknown} value @returns {Record<string,unknown>[]} */
function records(value) {
    if (!Array.isArray(value))
        throw new Error("Expected native metadata records");
    return value.map((/** @type {unknown} */ item) => {
        if (!isRecord(item))
            throw new Error("Malformed native metadata record");
        return item;
    });
}

/** @param {Value | undefined} value @param {string} name */
function requiredFormula(value, name) {
    if (value?.formulaValue === undefined)
        throw new Error(`Missing ${name} formula`);
    return value.formulaValue;
}

/** @param {string[]} ids */
function rosterArray(ids) {
    const quoted = ids.map((id) => `"${id}"`);
    return `{${quoted.join(";")}}`;
}

/** @param {Record<string, unknown>} spec */
function styleNewChart(spec) {
    const basic = spec["basicChart"];
    if (!isRecord(basic))
        throw new Error("New plant chart lacks basic specification");
    const series = records(basic["series"] ?? []);
    for (const item of series) {
        delete item["color"];
        item["colorStyle"] = { rgbColor: plantColor("P41") };
    }
    if (spec["title"] === "Time between waterings") return;
    const axes = records(basic["axis"] ?? []);
    for (const axis of axes) {
        const bounds = axis["viewWindowOptions"];
        if (isRecord(bounds)) {
            delete bounds["viewWindowMin"];
            delete bounds["viewWindowMax"];
        }
    }
}

/** @param {Value} value @param {(formula: string) => string} formula */
function transform(value, formula) {
    if (value.formulaValue !== undefined)
        return { formulaValue: formula(value.formulaValue) };
    if (value.stringValue !== undefined)
        return { stringValue: value.stringValue.replaceAll("P40", "P41") };
    return structuredClone(value);
}

/**
 * @param {Snapshot} snapshot @param {Meta} meta @param {(title: string, row:
 *   number, col: number) => Value | undefined} value
 */
function validate(snapshot, meta, value) {
    for (const s of snapshot.metadata.sheets) {
        if (
            s.properties.sheetId === alpineSpiresAddition.sheetId ||
            s.properties.title.startsWith("P41 ")
        )
            throw new Error("P41 enrollment already installed");
        if (
            !excluded.has(s.properties.title) &&
            snapshot.full.sheets.every(
                (f) => f.properties.title !== s.properties.title
            )
        )
            throw new Error(
                `Missing complete source capture: ${s.properties.title}`
            );
    }
    validateRoster(value);
    if (value(trackerTitle, 39, 0) !== undefined)
        throw new Error("Occupied P41 roster destination");
    for (const [
        title,
        cols,
        header,
    ] of /** @type {[string, number, string][]} */ ([
        [
            "History",
            67,
            "Leaf VPD source",
        ],
        [
            "App entries",
            59,
            "Leaf VPD source",
        ],
        [
            "App bulk",
            76,
            "P40 weight (g)",
        ],
    ])) {
        if (
            meta(title).properties.gridProperties.columnCount !== cols ||
            value(title, 0, cols - 1)?.stringValue !== header
        )
            throw new Error(`Intake schema changed: ${title}`);
    }
    validateBoundaries(meta, value);
    if (meta(comparisonTitle).properties.gridProperties.rowCount !== 1568)
        throw new Error("Comparison allocation changed");
    for (let b = 0; b < 14; b += 1) {
        if (
            value(comparisonTitle, 1022 + b * 39, 0)?.stringValue !== "Plant ID"
        )
            throw new Error(`Comparison header changed: ${b}`);
        for (const [i, id] of oldIds.entries())
            if (
                value(comparisonTitle, 1023 + b * 39 + i, 0)?.stringValue !== id
            )
                throw new Error(`Comparison roster changed: ${b}/${id}`);
    }
}

/**
 * @param {Meta} meta @param {(title:
 *   string,row:number,col:number)=>Value|undefined} value
 */
function validateBoundaries(meta, value) {
    if (meta("History").properties.gridProperties.rowCount !== 50_001)
        throw new Error("History capacity changed");
    if (
        value("Integrity", 61, 0)?.stringValue !==
        "Critical source-row exceptions"
    )
        throw new Error("Integrity roster boundary moved");
}

/** @param {(title: string, row: number, col: number) => Value | undefined} value */
function validateRoster(value) {
    for (const [i, id] of oldIds.entries())
        if (value(trackerTitle, i + 1, 0)?.stringValue !== id)
            throw new Error(`Current roster changed at ${id}`);
}

/**
 * @param {import("./inventory-expansion.mjs").Sheet} template @param {Entry[]}
 *   entries @param {Value|undefined} tail
 */
function validateTemplate(template, entries, tail) {
    if (
        template.charts?.length !== 4 ||
        tail?.formulaValue?.includes("50001") !== true
    )
        throw new Error("Current full-history page template changed");
    if (
        entries.some(
            (entry) =>
                entry.row > 140 && entry.cell.userEnteredValue !== undefined
        )
    )
        throw new Error("Page template contains stored history-tail data");
}

/** @param {unknown} value @param {(item: Record<string, unknown>) => void} visit */
function walk(value, visit) {
    if (value === null || typeof value !== "object") return;
    if (isRecord(value)) visit(value);
    const descendants = Object.values(value);
    for (const child of descendants) walk(child, visit);
}
