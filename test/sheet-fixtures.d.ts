import type { CellValue } from "./logger-fixtures.js";

export interface DataRange {
    clearContent: () => DataRange;
    getColumn: () => number;
    getDisplayValue: () => string;
    getDisplayValues: () => string[][];
    getFormula: () => string;
    getFormulas: () => string[][];
    getLastColumn: () => number;
    getLastRow: () => number;
    getNumColumns: () => number;
    getNumRows: () => number;
    getRow: () => number;
    getSheet: () => DataSheet;
    getValue: () => CellValue;
    getValues: () => CellValue[][];
    protect: () => Protection;
    setBackground: (value: string) => DataRange;
    setDataValidation: (value: null | Validation) => DataRange;
    setFontColor: (value: string) => DataRange;
    setFontWeight: (value: string) => DataRange;
    setFormula: (value: string) => DataRange;
    setNote: (value: string) => DataRange;
    setNumberFormat: (value: string) => DataRange;
    setValue: (value: CellValue) => DataRange;
    setValues: (value: CellValue[][]) => DataRange;
}
export interface DataSheet {
    __dataValidationCalls: (RangePosition & {
        validation: null | Validation;
    })[];
    __protections: Protection[];
    __rows: CellValue[][];
    getIndex: () => number;
    getLastColumn: () => number;
    getLastRow: () => number;
    getMaxColumns: () => number;
    getMaxRows: () => number;
    getName: () => string;
    getParent: () => null | object;
    getProtections: () => Protection[];
    getRange: (
        row: number,
        column: number,
        rowCount?: number,
        columnCount?: number
    ) => DataRange;
    hideColumns: (column: number, count?: number) => DataSheet;
    insertColumnsAfter: (column: number, count: number) => DataSheet;
    setColumnWidth: (column: number, width: number) => DataSheet;
    setColumnWidths: (
        column: number,
        count: number,
        width: number
    ) => DataSheet;
    setFrozenRows: (rows: number) => DataSheet;
    setHiddenGridlines: (shouldHide: boolean) => DataSheet;
    setParent: (value: object) => void;
}
export interface HistoryRange {
    clearContent: () => HistoryRange;
    clearDataValidations: () => HistoryRange;
    createTextFinder: (query: string) => TextFinder;
    getDataValidations: () => (null | object)[][];
    getDisplayValue: () => string;
    getDisplayValues: () => string[][];
    getValues: () => CellValue[][];
    protect: () => Protection;
    setDataValidation: (validation: null | object) => HistoryRange;
    setNote: (note: string) => HistoryRange;
    setNotes: (notes: string[][]) => HistoryRange;
    setNumberFormat: (format: string) => HistoryRange;
    setValue: (value: CellValue) => HistoryRange;
    setValues: (values: CellValue[][]) => HistoryRange;
}
export interface HistorySheet {
    __clearDataValidationCalls: RangePosition[];
    __protections: Protection[];
    __rangeReads: RangePosition[];
    __rows: CellValue[][];
    __setValuesCalls: RangePosition[];
    __validationCells: Set<string>;
    getLastRow: () => number;
    getMaxColumns: () => number;
    getMaxRows: () => number;
    getName: () => string;
    getProtections: () => Protection[];
    getRange: (
        row: number,
        column: number,
        rowCount?: number,
        columnCount?: number
    ) => HistoryRange;
    hideColumns: (column: number, count?: number) => void;
    insertColumnsAfter: (column: number, count: number) => void;
    insertRowsAfter: (row: number, count: number) => void;
}
export interface Protection {
    getDescription: () => string;
    getRange: () => object;
    isWarningOnly: () => boolean;
    setDescription: (value: string) => Protection;
    setRange: (value: object) => Protection;
    setWarningOnly: (isEnabled: boolean) => Protection;
}
export interface RangePosition {
    column: number;
    columnCount: number;
    row: number;
    rowCount: number;
}
export interface RuntimeOptions {
    globals?: Record<string, unknown>;
    spreadsheet?: object;
    SpreadsheetApp?: object;
    Utilities?: {
        formatDate?: (value: Date, zone?: string, pattern?: string) => string;
        getUuid?: () => string;
    };
}
export interface TextFinder {
    findAll: () => { getRow: () => number }[];
    matchEntireCell: (isEnabled: boolean) => TextFinder;
}
export interface Validation {
    allowInvalid?: boolean;
    showDropdown?: boolean;
    type?: string;
    values?: (number | string)[];
}
