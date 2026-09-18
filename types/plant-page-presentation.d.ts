export interface PageCell {
    dataValidation?: Record<string, unknown>;
    formattedValue?: string;
    note?: string;
    textFormatRuns?: object[];
    userEnteredFormat?: Record<string, unknown>;
    userEnteredValue?: {
        boolValue?: boolean;
        formulaValue?: string;
        numberValue?: number;
        stringValue?: string;
    };
}

export interface PageDimension {
    hiddenByFilter?: boolean;
    hiddenByUser?: boolean;
    pixelSize?: number;
}

export interface PageRange {
    endColumnIndex: number;
    endRowIndex: number;
    sheetId?: number;
    startColumnIndex: number;
    startRowIndex: number;
}

export interface PlantPagePresentationSnapshot {
    sheets: PresentationPage[];
}

export interface PresentationPage {
    data: {
        columnMetadata: PageDimension[];
        rowData: { values?: PageCell[] }[];
        rowMetadata: PageDimension[];
        startColumn?: number;
        startRow?: number;
    }[];
    merges: PageRange[];
    properties: {
        gridProperties: { columnCount: number; rowCount: number };
        sheetId: number;
        title: string;
    };
}
