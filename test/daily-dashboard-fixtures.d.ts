export interface DailyApi {
    dailyCareErrorScanFormula_: (formula: string) => string;
    dailyCareIndicatorFormula_: (
        status: string,
        id: number,
        range: string
    ) => string;
    dailyCareRow_: (
        plant: { id: string; pageId: number },
        row: number,
        bounds: DailyBounds
    ) => string[];
    dailyCareTestHeaders_: () => { baseline: string[]; dashboard: string[] };
    dailyCareWeightFormula_: (row: number, bounds: DailyBounds) => string;
    installDailyCareDashboard: () => DailyResult;
}

export interface DailyBounds {
    baseline: number;
    history: number;
    integrity: number;
    tracker: number;
}

export type DailyCell =
    | boolean
    | number
    | string;

export interface DailyFilter {
    criteria: Map<number, string>;
    getColumnFilterCriteria: (column: number) => null | string;
    range: string;
    remove: () => void;
    setColumnFilterCriteria: (column: number, value: string) => void;
}

export interface DailyRange {
    breakApart: () => DailyRange;
    clearContent: () => DailyRange;
    clearFormat: () => DailyRange;
    createFilter: () => DailyFilter;
    getA1Notation: () => string;
    getColumn: () => number;
    getDisplayValue: () => string;
    getDisplayValues: () => string[][];
    getFormula: () => string;
    getFormulas: () => string[][];
    getLastColumn: () => number;
    getMergedRanges: () => DailyRange[];
    getNote: () => string;
    getNumColumns: () => number;
    getNumRows: () => number;
    getRow: () => number;
    getValues: () => DailyCell[][];
    merge: () => DailyRange;
    setBackground: (value: string) => DailyRange;
    setFontColor: (value: string) => DailyRange;
    setFontWeight: (value: string) => DailyRange;
    setFormula: (value: string) => DailyRange;
    setNote: (value: string) => DailyRange;
    setNumberFormat: (value: string) => DailyRange;
    setValue: (value: DailyCell) => DailyRange;
    setValues: (value: DailyCell[][]) => DailyRange;
    setVerticalAlignment: (value: string) => DailyRange;
    setWrap: (shouldWrap: boolean) => DailyRange;
}

export interface DailyResult {
    checksRange: string;
    dashboardFrozenColumns: number;
    dashboardRange: string;
    historyChanged: boolean;
    integrityRange: string;
    mainRange: string;
    plants: number;
    sheet: string;
    sheetId: number;
}

export interface DailyRule {
    background: string;
    formula: string;
    getRanges: () => DailyRange[];
}

export interface DailyRuleBuilder {
    build: () => DailyRule;
    setBackground: (value: string) => DailyRuleBuilder;
    setFontColor: (value: string) => DailyRuleBuilder;
    setRanges: (value: DailyRange[]) => DailyRuleBuilder;
    whenFormulaSatisfied: (value: string) => DailyRuleBuilder;
}
