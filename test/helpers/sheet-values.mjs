/**
 * @param {string[][]} values @param {number | undefined} columns @param
 *   {boolean} shouldBlank
 */
export function installerValues(values, columns, shouldBlank) {
    return values.map((row) =>
        row
            .slice(0, columns ?? row.length)
            .map((value) => (shouldBlank ? "" : value))
    );
}

/**
 * Read a rectangular range with the blank-cell behavior of the sheet mocks.
 *
 * @template T
 *
 * @param {T[][]} source
 * @param {import("../sheet-fixtures.d.ts").RangePosition} position
 *
 * @returns {(T | "")[][]}
 */
export function selectSheetValues(
    source,
    { column, columnCount, row, rowCount }
) {
    return Array.from({ length: rowCount }, (_row, rowOffset) =>
        Array.from(
            { length: columnCount },
            (_column, columnOffset) =>
                source[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? ""
        )
    );
}

/** @param {import("../logger-fixtures.d.ts").CellValue[][]} values */
export function sheetDisplayValues(values) {
    return values.map((row) => row.map((value) => String(value ?? "")));
}

/**
 * @param {import("../logger-fixtures.d.ts").CellValue[][]} rows
 * @param {number} column
 * @param {string} query
 *
 * @returns {import("../sheet-fixtures.d.ts").TextFinder}
 */
export function sheetTextFinder(rows, column, query) {
    let isExact = false;
    const finder = {
        findAll() {
            const matches = [];
            for (const [index, row] of rows.entries()) {
                const text = String(row[column - 1] ?? "");
                const isMatch = isExact ? text === query : text.includes(query);
                if (isMatch) matches.push({ getRow: () => index + 1 });
            }
            return matches;
        },
        /** @param {boolean} shouldMatchExactly */
        matchEntireCell(shouldMatchExactly) {
            isExact = shouldMatchExactly;
            return finder;
        },
    };
    return finder;
}

/**
 * @param {Set<string>} cells
 * @param {import("../sheet-fixtures.d.ts").RangePosition} position
 *
 * @returns {(object | null)[][]}
 */
export function sheetValidationValues(
    cells,
    { column, columnCount, row, rowCount }
) {
    return Array.from({ length: rowCount }, (_row, rowOffset) =>
        Array.from({ length: columnCount }, (_column, columnOffset) =>
            cells.has(`${row + rowOffset}:${column + columnOffset}`) ? {} : null
        )
    );
}
