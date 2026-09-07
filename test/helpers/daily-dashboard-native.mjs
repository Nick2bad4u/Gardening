import { required } from "./required.mjs";

/** @returns {import("../daily-dashboard-fixtures.d.ts").DailyRuleBuilder} */
export function dailyRuleBuilder() {
    let background = "";
    let formula = "";
    /** @type {import("../daily-dashboard-fixtures.d.ts").DailyRange[]} */
    let ranges = [];
    const builder = {
        build: () => ({ background, formula, getRanges: () => ranges }),
        setBackground: (/** @type {string} */ value) => {
            background = value;
            return builder;
        },
        setFontColor: () => builder,
        setRanges: (
            /** @type {import("../daily-dashboard-fixtures.d.ts").DailyRange[]} */ value
        ) => {
            ranges = value;
            return builder;
        },
        whenFormulaSatisfied: (/** @type {string} */ value) => {
            formula = value;
            return builder;
        },
    };
    return builder;
}

/**
 * A sparse native Sheet mock: formulas and displayed values remain distinct.
 *
 * @param {string} name
 * @param {number} id
 */
export function dailySheet(name, id) {
    /**
     * @type {Map<
     *     string,
     *     import("../daily-dashboard-fixtures.d.ts").DailyCell
     * >}
     */
    const cells = new Map();
    /**
     * @type {Map<
     *     string,
     *     import("../daily-dashboard-fixtures.d.ts").DailyCell
     * >}
     */
    const calculated = new Map();
    /** @type {Map<string, string>} */
    const notes = new Map();
    /** @type {Map<string, string | boolean>} */
    const styles = new Map();
    /** @type {Map<number, number>} */
    const widths = new Map();
    /** @type {import("../daily-dashboard-fixtures.d.ts").DailyRange[]} */
    const merges = [];
    /** @type {string[]} */
    const writes = [];
    const state = {
        calculated,
        cells,
        charts: 0,
        columns: 42,
        filter: /** @type {import("../daily-dashboard-fixtures.d.ts").DailyFilter | null} */ (
            null
        ),
        frozenColumns: 0,
        frozenRows: 0,
        gridlinesHidden: false,
        hidden: false,
        merges,
        notes,
        protected: false,
        protectionDescription: "",
        protectionEditable: true,
        protectionEditors: ["owner", "other"],
        protectionWarning: true,
        rows: 5000,
        rules: /** @type {import("../daily-dashboard-fixtures.d.ts").DailyRule[]} */ ([]),
        styles,
        widths,
        writes,
    };
    /** @param {string} item */
    const raw = (item) => cells.get(item) ?? "";
    /** @param {string} item */
    const formula = (item) => {
        const value = raw(item);
        return typeof value === "string" && value.startsWith("=") ? value : "";
    };
    /** @param {string} item */
    const displayed = (item) =>
        calculated.get(item) ?? (formula(item) ? "" : raw(item));
    /**
     * @param {number | string} first
     * @param {number} [column]
     * @param {number} [height]
     * @param {number} [width]
     *
     * @returns {import("../daily-dashboard-fixtures.d.ts").DailyRange}
     */
    function getRange(first, column = 1, height = 1, width = 1) {
        const start =
            typeof first === "string"
                ? coordinates(first.split(":", 1)[0] ?? "")
                : { column, row: first };
        const end =
            typeof first === "string"
                ? coordinates(first.split(":", 2)[1] ?? first)
                : { column: column + width - 1, row: first + height - 1 };
        const rowCount = end.row - start.row + 1;
        if (end.row > state.rows || end.column > state.columns || rowCount < 1)
            throw new Error("Native range exceeds sheet grid");
        const columnCount = end.column - start.column + 1;
        const a1 = key(start.row, start.column);
        const notation =
            rowCount === 1 && columnCount === 1
                ? a1
                : `${a1}:${key(end.row, end.column)}`;
        const keys = Array.from({ length: rowCount }, (_, row) =>
            Array.from({ length: columnCount }, (_cell, col) =>
                key(start.row + row, start.column + col)
            )
        );
        /** @type {import("../daily-dashboard-fixtures.d.ts").DailyRange} */
        const range = {
            breakApart: () => {
                for (const merge of range.getMergedRanges())
                    merges.splice(merges.indexOf(merge), 1);
                writes.push(`unmerge:${notation}`);
                return range;
            },
            clearContent: () => {
                for (const item of keys.flat()) cells.delete(item);
                writes.push(`clear:${notation}`);
                return range;
            },
            clearFormat: () => {
                styles.clear();
                return range;
            },
            createFilter: () => {
                if (state.filter)
                    throw new Error("A native sheet has only one basic filter");
                /** @type {import("../daily-dashboard-fixtures.d.ts").DailyFilter} */
                const filter = {
                    criteria: new Map(),
                    getColumnFilterCriteria: (col) =>
                        filter.criteria.get(col) ?? null,
                    range: notation,
                    remove: () => {
                        state.filter = null;
                    },
                    setColumnFilterCriteria: (col, value) => {
                        filter.criteria.set(col, value);
                    },
                };
                state.filter = filter;
                return filter;
            },
            getA1Notation: () => notation,
            getColumn: () => start.column,
            getDisplayValue: () =>
                String(calculated.get(a1) ?? (formula(a1) ? "" : raw(a1))),
            getDisplayValues: () =>
                range.getValues().map((row) => row.map(String)),
            getFormula: () => formula(a1),
            getFormulas: () => {
                const rows = [];
                for (const row of keys) {
                    const values = Array.from(row, (item) => formula(item));
                    rows.push(values);
                }
                return rows;
            },
            getLastColumn: () => end.column,
            getMergedRanges: () =>
                merges.filter(
                    (merge) =>
                        merge.getRow() <= end.row &&
                        merge.getRow() + merge.getNumRows() > start.row &&
                        merge.getColumn() <= end.column &&
                        merge.getLastColumn() >= start.column
                ),
            getNote: () => notes.get(a1) ?? "",
            getNumColumns: () => columnCount,
            getNumRows: () => rowCount,
            getRow: () => start.row,
            getValues: () => {
                const rows = [];
                for (const row of keys) {
                    const values = Array.from(row, (item) => displayed(item));
                    rows.push(values);
                }
                return rows;
            },
            merge: () => {
                merges.push(range);
                writes.push(`merge:${notation}`);
                return range;
            },
            setBackground: (value) =>
                rangeStyle(range, styles, "background", value),
            setFontColor: (value) => rangeStyle(range, styles, "color", value),
            setFontWeight: (value) =>
                rangeStyle(range, styles, "weight", value),
            setFormula: (value) => range.setValue(value),
            setNote: (value) => {
                notes.set(a1, value);
                return range;
            },
            setNumberFormat: (value) =>
                rangeStyle(range, styles, "format", value),
            setValue: (value) => {
                cells.set(a1, value);
                writes.push(`value:${notation}`);
                return range;
            },
            setValues: (values) => {
                if (
                    values.length !== rowCount ||
                    values.some((row) => row.length !== columnCount)
                )
                    throw new Error("Native setValues dimensions differ");
                for (const [rowIndex, row] of values.entries())
                    for (const [columnIndex, value] of row.entries())
                        cells.set(
                            key(
                                start.row + rowIndex,
                                start.column + columnIndex
                            ),
                            value
                        );

                writes.push(`values:${notation}`);
                return range;
            },
            setVerticalAlignment: (value) =>
                rangeStyle(range, styles, "vertical", value),
            setWrap: (value) => rangeStyle(range, styles, "wrap", value),
        };
        return range;
    }
    const protection = {
        addEditor: (/** @type {string} */ value) => {
            state.protectionEditors.push(value);
        },
        canDomainEdit: () => false,
        canEdit: () => state.protectionEditable,
        getDescription: () => state.protectionDescription,
        getEditors: () => [...state.protectionEditors],
        removeEditors: () => {
            state.protectionEditors = ["owner"];
        },
        setDescription: (/** @type {string} */ value) => {
            state.protectionDescription = value;
            return protection;
        },
        setDomainEdit: () => {
            throw new Error(
                "Personal workbook should not change domain access"
            );
        },
        setUnprotectedRanges: () => protection,
        setWarningOnly: (/** @type {boolean} */ value) => {
            state.protectionWarning = value;
            return protection;
        },
    };
    const api = {
        autoResizeRows: (
            /** @type {number} */ row,
            /** @type {number} */ count
        ) => {
            writes.push(`resizeRows:${row}:${count}`);
        },
        getCharts: () => Array.from({ length: state.charts }, () => "chart"),
        getConditionalFormatRules: () => state.rules,
        getFilter: () => state.filter,
        getLastColumn: () =>
            Math.max(
                0,
                ...cells.keys().map((cell) => coordinates(cell).column)
            ),
        getLastRow: () =>
            Math.max(0, ...cells.keys().map((cell) => coordinates(cell).row)),
        getMaxColumns: () => state.columns,
        getMaxRows: () => state.rows,
        getName: () => name,
        getProtections: () => (state.protected ? [protection] : []),
        getRange,
        getSheetId: () => id,
        insertColumnsAfter: (
            /** @type {number} */ after,
            /** @type {number} */ count
        ) => {
            state.columns = after + count;
        },
        insertRowsAfter: (
            /** @type {number} */ after,
            /** @type {number} */ count
        ) => {
            state.rows = after + count;
        },
        protect: () => {
            state.protected = true;
            return protection;
        },
        setColumnWidth: (
            /** @type {number} */ col,
            /** @type {number} */ width
        ) => {
            widths.set(col, width);
        },
        setConditionalFormatRules: (
            /** @type {import("../daily-dashboard-fixtures.d.ts").DailyRule[]} */ rules
        ) => {
            state.rules = rules;
        },
        setFrozenColumns: (/** @type {number} */ count) => {
            if (
                merges.some(
                    (range) =>
                        range.getColumn() <= count &&
                        range.getLastColumn() > count
                )
            )
                throw new Error("Native freeze bisects merge");
            state.frozenColumns = count;
        },
        setFrozenRows: (/** @type {number} */ count) => {
            state.frozenRows = count;
        },
        setHiddenGridlines: (/** @type {boolean} */ value) => {
            state.gridlinesHidden = value;
        },
        showSheet: () => {
            state.hidden = false;
        },
    };
    return { api, state };
}

/** @param {number} column */
function columnName(column) {
    let value = column;
    let result = "";
    while (value > 0) {
        result = String.fromCodePoint(65 + ((value - 1) % 26)) + result;
        value = Math.floor((value - 1) / 26);
    }
    return result;
}

/** @param {string} cell */
function coordinates(cell) {
    const groups = required(
        required(/^(?<column>[A-Z]+)(?<row>\d+)$/v.exec(cell)).groups
    );
    let column = 0;
    const letters = required(groups["column"]);
    for (const character of letters)
        column = column * 26 + required(character.codePointAt(0)) - 64;
    return { column, row: Number(groups["row"]) };
}

/** @param {number} row @param {number} column */
function key(row, column) {
    return `${columnName(column)}${row}`;
}

/**
 * @param {import("../daily-dashboard-fixtures.d.ts").DailyRange} range
 * @param {Map<string, string | boolean>} styles
 * @param {string} method
 * @param {string | boolean} value
 */
function rangeStyle(range, styles, method, value) {
    styles.set(`${range.getA1Notation()}:${method}`, value);
    return range;
}
