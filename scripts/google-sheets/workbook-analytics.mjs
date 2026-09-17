import { plantColor } from "./plant-chart-colors.mjs";
import palette from "./plant-colors.json" with { type: "json" };

export const wateringCalendarSheetId = 907_202_606;

/**
 * A derived calendar only: the canonical ledger and existing tabs are
 * untouched. Caller must supply fresh metadata and History header cells before
 * installation.
 *
 * @param {import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot} snapshot
 * @param {{ clockReference: string; sheetId?: number }} options
 *
 * @returns {Record<string, unknown>[]}
 */
export function buildWateringCalendarRequests(
    { cells, metadata },
    { clockReference, sheetId = wateringCalendarSheetId }
) {
    if (!Number.isSafeInteger(sheetId) || sheetId < 0)
        throw new Error("Calendar sheet ID must be a nonnegative integer");
    if (
        metadata.sheets.some(
            ({ properties }) =>
                properties.sheetId === sheetId ||
                properties.title === "Watering calendar"
        )
    )
        throw new Error(
            "Watering calendar already exists; do not replay installation"
        );
    const ledger = metadata.sheets.find(
        ({ properties }) => properties.title === "History"
    );
    if (
        ledger?.properties.gridProperties.rowCount !== 5000 ||
        ledger.properties.gridProperties.columnCount !== 42
    )
        throw new Error("Review the 5,000-row, 42-column History contract");
    for (const [column, label] of /** @type {[number, string][]} */ ([
        [0, "Date"],
        [1, "Plant ID"],
        [2, "Event"],
        [16, "Nutrients used"],
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
    const formulas = wateringCalendarFormulas(clockReference);
    const range = {
        endColumnIndex: 57,
        endRowIndex: 34,
        sheetId,
        startColumnIndex: 1,
        startRowIndex: 4,
    };
    return [
        {
            addSheet: {
                properties: {
                    gridProperties: {
                        columnCount: 57,
                        frozenColumnCount: 1,
                        frozenRowCount: 4,
                        hideGridlines: true,
                        rowCount: 40,
                    },
                    sheetId,
                    title: "Watering calendar",
                },
            },
        },
        {
            addProtectedRange: {
                protectedRange: {
                    description:
                        "Read-only watering history; use the logger for observations.",
                    range: { sheetId },
                    warningOnly: true,
                },
            },
        },
        {
            updateCells: {
                fields: "userEnteredValue",
                rows: [
                    {
                        values: [
                            text(
                                "Watering calendar · recorded events, not a care schedule"
                            ),
                        ],
                    },
                    {
                        values: [
                            text("Calculated as of"),
                            formula(`=${clockReference}`),
                        ],
                    },
                    {
                        values: [
                            text("Legend"),
                            text(
                                "Fed = Yes; Plain = No; Unknown = missing; Mixed = multiple classes on one date"
                            ),
                        ],
                    },
                    { values: [text("Plant ID"), formula(formulas.dates)] },
                    ...formulas.plantRows.map(
                        ({ formula: value, plantId }) => ({
                            values: [text(plantId), formula(value)],
                        })
                    ),
                ],
                start: { columnIndex: 0, rowIndex: 0, sheetId },
            },
        },
        {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        textFormat: {
                            fontFamily: "JetBrains Mono",
                            fontSize: 10,
                        },
                    },
                },
                fields: "userEnteredFormat.textFormat",
                range: { sheetId },
            },
        },
        {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        numberFormat: {
                            pattern: "mmm d, yyyy h:mm am/pm",
                            type: "DATE_TIME",
                        },
                    },
                },
                fields: "userEnteredFormat.numberFormat",
                range: {
                    endColumnIndex: 2,
                    endRowIndex: 2,
                    sheetId,
                    startColumnIndex: 1,
                    startRowIndex: 1,
                },
            },
        },
        {
            mergeCells: {
                mergeType: "MERGE_ALL",
                range: {
                    endColumnIndex: 4,
                    endRowIndex: 2,
                    sheetId,
                    startColumnIndex: 1,
                    startRowIndex: 1,
                },
            },
        },
        {
            repeatCell: {
                cell: { userEnteredFormat: { wrapStrategy: "WRAP" } },
                fields: "userEnteredFormat.wrapStrategy",
                range: {
                    endColumnIndex: 1,
                    endRowIndex: 2,
                    sheetId,
                    startColumnIndex: 0,
                    startRowIndex: 1,
                },
            },
        },
        {
            repeatCell: {
                cell: { userEnteredFormat: { textFormat: { fontSize: 9 } } },
                fields: "userEnteredFormat.textFormat.fontSize",
                range: {
                    endColumnIndex: 4,
                    endRowIndex: 2,
                    sheetId,
                    startColumnIndex: 1,
                    startRowIndex: 1,
                },
            },
        },
        {
            updateDimensionProperties: {
                fields: "pixelSize",
                properties: { pixelSize: 42 },
                range: {
                    dimension: "ROWS",
                    endIndex: 2,
                    sheetId,
                    startIndex: 1,
                },
            },
        },
        {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        numberFormat: { pattern: "ddd m/d", type: "DATE" },
                        textFormat: {
                            bold: true,
                            fontFamily: "JetBrains Mono",
                        },
                    },
                },
                fields: "userEnteredFormat",
                range: {
                    endColumnIndex: 57,
                    endRowIndex: 4,
                    sheetId,
                    startColumnIndex: 1,
                    startRowIndex: 3,
                },
            },
        },
        {
            updateDimensionProperties: {
                fields: "pixelSize",
                properties: { pixelSize: 88 },
                range: {
                    dimension: "COLUMNS",
                    endIndex: 57,
                    sheetId,
                    startIndex: 0,
                },
            },
        },
        ...palette.map(({ id }, index) => ({
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        textFormat: {
                            bold: true,
                            foregroundColorStyle: { rgbColor: plantColor(id) },
                        },
                    },
                },
                fields: "userEnteredFormat.textFormat.bold,userEnteredFormat.textFormat.foregroundColorStyle",
                range: {
                    endColumnIndex: 1,
                    endRowIndex: index + 5,
                    sheetId,
                    startColumnIndex: 0,
                    startRowIndex: index + 4,
                },
            },
        })),
        ...[
            { blue: 0.78, green: 0.92, label: "Fed", red: 0.78 },
            { blue: 0.97, green: 0.89, label: "Plain", red: 0.79 },
            { blue: 0.78, green: 0.91, label: "Unknown", red: 0.98 },
            { blue: 0.94, green: 0.84, label: "Mixed", red: 0.91 },
        ].map(({ label, ...color }) => ({
            addConditionalFormatRule: {
                index: 0,
                rule: {
                    booleanRule: {
                        condition: {
                            type: "TEXT_EQ",
                            values: [{ userEnteredValue: label }],
                        },
                        format: { backgroundColorStyle: { rgbColor: color } },
                    },
                    ranges: [range],
                },
            },
        })),
    ];
}

/**
 * Observation summaries retain original dates, dose units and provenance. A
 * Check event alone never establishes that a physical inspection happened.
 * Explicit photo-only wording in Check notes is surfaced as recorded evidence,
 * rather than inferring an inspection type from a generic Check event.
 * Consumers should display conditionEvidence and conditionNotes together. Label
 * the feeding count "Plain-water events after feed time": only strictly later
 * observation timestamps count. Same-time events are not ordered because
 * correction appends can change physical row order without changing event
 * time.
 *
 * @param {string} plantId
 * @param {string} [clockReference]
 */
export function plantEvidenceFormulas(plantId, clockReference) {
    const observation = (
        /** @type {string} */ condition,
        /** @type {string} */ value
    ) => latest(plantId, condition, value, clockReference);
    const photo = `${history("X")}<>""`;
    const condition = `${history("H")}<>""`;
    const feed = `${history("C")}="Water",${history("Q")}="Yes"`;
    const originalOrUnknown = (/** @type {string} */ column) =>
        `ARRAYFORMULA(IF(${history(column)}="","Unknown",${history(column)}))`;
    const url = observation(photo, history("X")).slice(1);
    return {
        condition: observation(condition, history("H")),
        conditionDate: observation(condition, history("A")),
        conditionEvidence: observation(
            condition,
            `ARRAYFORMULA(IF(${history("C")}="Photo","Photo-only observation",IF((${history("C")}="Check")*REGEXMATCH(${history("I")}&"","(?i)photo[- ]only"),"Photo-only Check record",${history("C")}&" record"))&IF(${history("AC")}<>""," · "&${history("AC")},"")&IF(${history("AI")}<>""," · "&${history("AI")},""))`
        ),
        conditionNotes: observation(
            condition,
            `ARRAYFORMULA(IF(${history("I")}="","",${history("I")}))`
        ),
        feedDate: observation(feed, history("A")),
        feedDose: observation(feed, originalOrUnknown("S")),
        feedProduct: observation(feed, originalOrUnknown("R")),
        photoDate: observation(photo, history("A")),
        photoLink: `=LET(url,${url},IF(url="","",HYPERLINK(url,"Open latest photo")))`,
        plainWaterEventsSinceFeed: `=LET(lastDate,IFNA(MAX(FILTER(${history("A")},${active(plantId, clockReference)},${feed})),""),IF(lastDate="","",IFNA(ROWS(FILTER(${history("A")},${active(plantId, clockReference)},${history("C")}="Water",${history("Q")}="No",${history("A")}>lastDate)),0)))`,
    };
}

/**
 * Partial refills count by their recorded positive gallons. A zero is not a new
 * container fill; a missing empty date is not a remaining-volume estimate.
 */
export function roSummaryFormulas() {
    const validDates = `ISNUMBER(${ro("A")}),${ro("A")}>0`;
    const lastVisit = `IFNA(MAX(FILTER(${ro("A")},${validDates})),"")`;
    return {
        containers: [
            { empty: "C", fill: "B", label: "5 gal carboy" },
            { empty: "E", fill: "D", label: "5.3 gal carboy" },
            { empty: "G", fill: "F", label: "3 gal jug" },
            { empty: "I", fill: "H", label: "5 gal jug" },
        ].map(({ empty, fill, label }) => {
            const records = `SORT(FILTER({${ro("A")},ROW(${ro("A")}),${ro(fill)},ARRAYFORMULA(IF(${ro(empty)}="","",${ro(empty)}))},${validDates},ISNUMBER(${ro(fill)}),${ro(fill)}>0),1,FALSE,2,FALSE)`;
            return {
                emptyDate: `=IFNA(INDEX(${records},1,4),"")`,
                label,
                lastFillDate: `=IFNA(INDEX(${records},1,1),"")`,
                lastFillGallons: `=IFNA(INDEX(${records},1,3),"")`,
                status: `=IFNA(LET(record,${records},emptied,INDEX(record,1,4),IF(emptied="","Not marked empty","Emptied · "&TEXT(emptied,"mmm d, yyyy"))),"No recorded fill")`,
            };
        }),
        latestVisitDate: `=${lastVisit}`,
        latestVisitGallons: `=LET(lastDate,${lastVisit},IF(lastDate="","",SUM(FILTER(${ro("J")},${ro("A")}=lastDate))))`,
    };
}

/**
 * The last 56 calendar dates, inclusive of the shared clock date. One FILTER
 * per plant feeds its 56 cells; missing nutrient history is never plain water.
 *
 * @param {string} clockReference
 */
export function wateringCalendarFormulas(clockReference) {
    validateClock(clockReference);
    return {
        dates: `=SEQUENCE(1,56,INT(${clockReference})-55,1)`,
        plantRows: palette.map(({ id }) => ({
            formula: `=LET(records,IFNA(FILTER({${history("A")},${history("Q")}},${active(id, clockReference)},${history("C")}="Water",${history("A")}>=(INT(${clockReference})-55),${history("A")}<(INT(${clockReference})+1)),{0,""}),days,ARRAYFORMULA(INT(INDEX(records,0,1))),nutrients,INDEX(records,0,2),MAP(SEQUENCE(1,56,INT(${clockReference})-55,1),LAMBDA(day,LET(flags,IFNA(FILTER(nutrients,days=day),"__NO_WATER__"),fed,SUM(ARRAYFORMULA(N(flags="Yes"))),plain,SUM(ARRAYFORMULA(N(flags="No"))),unknown,SUM(ARRAYFORMULA(N((flags<>"Yes")*(flags<>"No")))),IF(INDEX(flags,1,1)="__NO_WATER__","",IF((N(fed>0)+N(plain>0)+N(unknown>0))>1,"Mixed",IF(fed>0,"Fed",IF(plain>0,"Plain","Unknown"))))))))`,
            plantId: id,
        })),
        startDate: `=INT(${clockReference})-55`,
    };
}

/**
 * Completed calendar-day gaps reuse the installed, same-day-deduplicated
 * helper. With no completed gap the descriptive statistics remain blank and
 * count is 0.
 *
 * @param {string} plantId
 */
export function wateringSummaryFormulas(plantId) {
    const column = columnName(plantIndex(plantId) * 3 + 2);
    const range = `'Watering intervals'!$${column}$2:$${column}$5000`;
    const values = `FILTER(${range},ISNUMBER(${range}),${range}>0)`;
    return {
        count: `=COUNT(${range})`,
        latest: `=IFNA(LET(gaps,${values},INDEX(gaps,ROWS(gaps))),"")`,
        maximum: `=IFNA(MAX(${values}),"")`,
        median: `=IFNA(MEDIAN(${values}),"")`,
        minimum: `=IFNA(MIN(${values}),"")`,
    };
}

/** @param {string} plantId @param {string} [clockReference] */
function active(plantId, clockReference) {
    plantIndex(plantId);
    if (clockReference !== undefined) validateClock(clockReference);
    const cutoff =
        clockReference === undefined
            ? ""
            : `,${history("A")}<=${clockReference}`;
    return `${history("B")}="${plantId}",${history("AJ")}<>"Removed",ISNUMBER(${history("A")}),${history("A")}>0${cutoff}`;
}

/** @param {number} index */
function columnName(index) {
    let result = "";
    for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26))
        result = String.fromCodePoint(65 + ((value - 1) % 26)) + result;
    return result;
}

/** @param {string} formulaValue */
function formula(formulaValue) {
    return { userEnteredValue: { formulaValue } };
}

/** @param {string} column */
function history(column) {
    return `History!$${column}$2:$${column}$5000`;
}

/**
 * Descriptive latest-evidence/product ties show the newer physical ledger row,
 * including appended corrections. This is not detector event ordering and must
 * not be used to infer which same-time event occurred first.
 *
 * @param {string} plantId
 * @param {string} condition
 * @param {string} value
 * @param {string} [clockReference]
 */
function latest(plantId, condition, value, clockReference) {
    return `=IFNA(INDEX(SORT(FILTER({${history("A")},ROW(${history("A")}),${value}},${active(plantId, clockReference)},${condition}),1,FALSE,2,FALSE),1,3),"")`;
}

/** @param {string} plantId */
function plantIndex(plantId) {
    const index = palette.findIndex((plant) => plant.id === plantId);
    if (index === -1) throw new Error(`Unknown plant: ${plantId}`);
    return index;
}

/** @param {string} column */
function ro(column) {
    return `'RO refills'!$${column}$20:$${column}$1000`;
}

/** @param {string} stringValue */
function text(stringValue) {
    return { userEnteredValue: { stringValue } };
}
/** @param {string} reference */
function validateClock(reference) {
    if (
        !/^(?:'[\w \-]+'|[A-Za-z]\w*)!\$?[A-Z]{1,3}\$?[1-9]\d*$/v.test(
            reference
        )
    )
        throw new Error(
            "Clock must be one explicit sheet-qualified cell reference"
        );
}
