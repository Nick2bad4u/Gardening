const legacyCount =
    '=COUNTIFS(History!$C$2:$C$5000,"<>Check",History!$H$2:$H$5000,"<>")';
const legacyException = '((History!C2:C5000<>"Check")*(History!H2:H5000<>""))';

/**
 * Repair only the condition-event predicate in the Integrity summary and list.
 * Inspect and historical Check conditions are valid; Removed rows are history.
 * Re-read the snapshot immediately before applying this one-time migration.
 *
 * @param {import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot} snapshot
 *
 * @returns {import("../../test/workbook-fixtures.d.ts").WorkbookRequest[]}
 */
export function buildIntegrityConditionRequests({ cells, metadata }) {
    const integrity = metadata.sheets.find(
        (sheet) => sheet.properties.title === "Integrity"
    );
    const history = metadata.sheets.find(
        (sheet) => sheet.properties.title === "History"
    );
    if (
        !integrity ||
        !history ||
        history.properties.gridProperties.rowCount < 5000 ||
        history.properties.gridProperties.columnCount < 36
    )
        throw new Error("Integrity repair requires the current History schema");

    /** @param {string} sheet @param {number} row @param {number} column */
    const value = (sheet, row, column) =>
        cells.find(
            (cell) =>
                cell.sheet === sheet &&
                cell.row === row &&
                cell.column === column
        )?.value;
    for (const [column, header] of /** @type {const} */ ([
        [2, "Event"],
        [7, "Plant condition"],
        [35, "Record status"],
    ])) {
        if (value("History", 0, column)?.stringValue !== header)
            throw new Error(`History header changed: ${header}`);
    }
    if (
        value("Integrity", 8, 0)?.stringValue !==
            "Medium leaked into plant condition" ||
        value("Integrity", 8, 1)?.formulaValue !== legacyCount ||
        value("Integrity", 8, 2)?.formulaValue !== '=IF(B9=0,"Pass","Fail")'
    )
        throw new Error(
            "Integrity summary changed or repair already installed"
        );

    const headings = cells.filter(
        (cell) =>
            cell.sheet === "Integrity" &&
            cell.column === 0 &&
            cell.value.stringValue === "Critical source-row exceptions"
    );
    if (headings.length !== 1 || !headings[0])
        throw new Error("Integrity exception heading is missing or ambiguous");
    const row = headings[0].row + 2;
    if (row >= integrity.properties.gridProperties.rowCount)
        throw new Error(
            "Integrity exception formula changed or repair installed"
        );
    const formula = repairExceptionFormula(
        value("Integrity", row, 0)?.formulaValue
    );

    /**
     * @param {number} targetRow
     * @param {number} column
     * @param {string} formulaValue
     */
    const write = (targetRow, column, formulaValue) => ({
        updateCells: {
            fields: "userEnteredValue",
            rows: [{ values: [{ userEnteredValue: { formulaValue } }] }],
            start: {
                columnIndex: column,
                rowIndex: targetRow,
                sheetId: integrity.properties.sheetId,
            },
        },
    });
    return [
        write(
            8,
            1,
            '=SUMPRODUCT((History!$C$2:$C$5000<>"Check")*(History!$C$2:$C$5000<>"Inspect")*(History!$H$2:$H$5000<>"")*(History!$AJ$2:$AJ$5000<>"Removed"))'
        ),
        write(row, 0, formula),
    ];
}

/** @param {string | undefined} formula */
function repairExceptionFormula(formula) {
    if (
        formula === undefined ||
        !formula.startsWith("=IFNA(FILTER(") ||
        !formula.endsWith(',"No critical source-integrity violations")') ||
        formula.split(legacyException).length !== 2
    )
        throw new Error(
            "Integrity exception formula changed or repair installed"
        );
    return formula.replace(
        legacyException,
        '((History!C2:C5000<>"Check")*(History!C2:C5000<>"Inspect")*(History!H2:H5000<>"")*(History!AJ2:AJ5000<>"Removed"))'
    );
}
