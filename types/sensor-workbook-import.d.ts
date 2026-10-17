import type {
    SensorHistoryPreparation,
    SensorHistoryReceipt,
} from "./sensor-history.js";

export interface SensorWorkbookCell {
    userEnteredValue?: {
        boolValue?: boolean;
        formulaValue?: string;
        numberValue?: number;
        stringValue?: string;
    };
}

export interface SensorWorkbookImportInput {
    candidate: SensorHistoryPreparation;
    importedAt: string;
    recorded: SensorHistoryPreparation;
    snapshot: SensorWorkbookSnapshot;
    sourceDetails: SensorWorkbookSourceDetail[];
}

export interface SensorWorkbookImportPlan {
    addedHours: number;
    addedSources: number;
    changedHours: number;
    expectedDigest: string;
    expectedSnapshot: SensorWorkbookSnapshot;
    preconditionDigest: string;
    requests: Record<string, unknown>[];
    schemaVersion: 1;
    spreadsheetId: string;
}

export interface SensorWorkbookSheet {
    charts?: unknown[];
    data?: {
        rowData?: { values?: SensorWorkbookCell[] }[];
        startColumn?: number;
        startRow?: number;
    }[];
    properties: {
        gridProperties: { columnCount: number; rowCount: number };
        sheetId: number;
        title: string;
    };
    tables?: {
        name: string;
        range: {
            endColumnIndex: number;
            endRowIndex: number;
            sheetId: number;
            startColumnIndex?: number;
            startRowIndex?: number;
        };
        tableId: string;
    }[];
}

/**
 * Native spreadsheets.get response; include the complete allocated grid of
 * every managed sheet, native tables, and chart metadata.
 */
export interface SensorWorkbookSnapshot {
    capturedRanges: string[];
    sheets: SensorWorkbookSheet[];
    spreadsheetId: string;
}

export interface SensorWorkbookSourceDetail {
    duplicateRows: number;
    firstObservedAt: null | string;
    hourlyRows: number;
    lastObservedAt: null | string;
    receipt: SensorHistoryReceipt;
    temperatureUnit: string;
}

export type SensorWorkbookValue =
    | null
    | number
    | string;
