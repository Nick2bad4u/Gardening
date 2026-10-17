import type { EnteredValue, SheetMetadata } from "../test/workbook-fixtures.js";

export interface IntegrityCell {
    column: number;
    effectiveValue?: EnteredValue;
    row: number;
    sheet: string;
    value: EnteredValue;
}

export interface IntegrityOptions {
    activePlantIds: string[];
    /** Last supported physical History row, including the header. */
    historyLastRow?: number;
    /** A warning, not a projected date or automatic capacity expansion. */
    remainingWarningRows?: number;
}

export interface IntegrityPlan {
    anchorCount: number;
    footprint: string[];
    preconditionDigest: string;
    requests: Record<string, unknown>[];
}

/** Captured grid coordinates are zero-based and end-exclusive. */
export interface IntegrityReadRange {
    endColumn: number;
    endRow: number;
    sheet: string;
    startColumn: number;
    startRow: number;
}

export interface IntegritySnapshot {
    cells: IntegrityCell[];
    metadata: {
        sheets: (SheetMetadata & {
            merges?: {
                endColumnIndex: number;
                endRowIndex: number;
                startColumnIndex: number;
                startRowIndex: number;
            }[];
        })[];
    };
    readRanges: IntegrityReadRange[];
}
