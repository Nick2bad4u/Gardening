export interface CellFormat {
    numberFormat?: { pattern: string; type: string };
    verticalAlignment?: string;
    wrapStrategy?: string;
}
export interface Chart {
    chartId: number;
    position?: {
        overlayPosition: {
            anchorCell: { columnIndex: number; rowIndex: number };
        };
    };
    spec: ChartSpec;
}
export interface ChartData {
    sourceRange: { sources: GridRange[] };
}
export interface ChartSeries {
    colorStyle?: { rgbColor: { blue: number; green: number; red: number } };
    dataLabel?: { customLabelData: ChartData };
    pointStyle?: { size: number };
    series: ChartData;
    targetAxis?: string;
}
export interface ChartSpec {
    basicChart: {
        axis: { position: string; title?: string }[];
        domains: { domain: ChartData }[];
        interpolateNulls?: boolean;
        lineSmoothing?: boolean;
        series: ChartSeries[];
    };
    hiddenDimensionStrategy?: string;
    subtitle?: string;
    title: string;
    titleTextFormat?: { italic?: boolean };
}
export interface ConditionalFormat {
    booleanRule?: {
        condition: { type: string; values: { userEnteredValue: string }[] };
    };
    gradientRule?: object;
    ranges: GridRange[];
}
export interface EnteredValue {
    boolValue?: boolean;
    formulaValue?: string;
    numberValue?: number;
    stringValue?: string;
}
export interface GridRange {
    endColumnIndex?: number;
    endRowIndex?: number;
    sheetId?: number;
    startColumnIndex?: number;
    startRowIndex?: number;
}
export interface SheetMetadata {
    bandedRanges?: { bandedRangeId: number; range: GridRange }[];
    basicFilter?: { range: GridRange };
    charts?: Chart[];
    conditionalFormats?: ConditionalFormat[];
    properties: {
        gridProperties: { columnCount: number; rowCount: number };
        sheetId: number;
        title: string;
    };
    protectedRanges?: {
        protectedRangeId: number;
        range: GridRange;
        warningOnly?: boolean;
    }[];
}
export interface WorkbookRequest {
    addConditionalFormatRule?: { index: number; rule: ConditionalFormat };
    appendDimension?: { dimension: string; length: number; sheetId: number };
    autoResizeDimensions?: {
        dimensions: {
            dimension: string;
            endIndex: number;
            sheetId: number;
            startIndex: number;
        };
    };
    deleteConditionalFormatRule?: { index: number; sheetId: number };
    repeatCell?: {
        cell: { note?: string; userEnteredFormat: CellFormat };
        fields: string;
        range: GridRange;
    };
    setBasicFilter?: { filter: { range: GridRange } };
    setDataValidation?: object;
    updateBanding?: {
        bandedRange: { bandedRangeId: number; range: GridRange };
        fields: string;
    };
    updateCells?: {
        fields: string;
        rows: { values: { userEnteredValue: EnteredValue }[] }[];
        start: { columnIndex: number; rowIndex: number; sheetId: number };
    };
    updateChartSpec?: { chartId: number; spec: ChartSpec };
    updateConditionalFormatRule?: {
        index: number;
        rule: ConditionalFormat;
        sheetId: number;
    };
    updateDimensionProperties?: {
        fields: string;
        properties: { hiddenByUser?: boolean; pixelSize?: number };
        range: {
            dimension: string;
            endIndex: number;
            sheetId: number;
            startIndex: number;
        };
    };
    updateEmbeddedObjectPosition?: object;
    updateProtectedRange?: {
        fields: string;
        protectedRange: { protectedRangeId: number; range: GridRange };
    };
}
export interface WorkbookSnapshot {
    cells: {
        column: number;
        row: number;
        sheet: string;
        value: EnteredValue;
    }[];
    metadata: { sheets: SheetMetadata[] };
}
