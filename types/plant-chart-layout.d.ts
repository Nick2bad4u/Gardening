import type { PlantColorSeries } from "../test/plant-chart-colors-fixtures.js";
import type { ChartData, SheetMetadata } from "../test/workbook-fixtures.js";

export interface ChartAxis {
    format?: Record<string, unknown>;
    position: string;
    title?: string;
    titleTextPosition?: object;
    viewWindowOptions?: Record<string, unknown>;
}
export interface LayoutChart {
    border?: { color?: object; colorStyle?: object };
    chartId: number;
    position: {
        overlayPosition: {
            anchorCell: {
                columnIndex?: number;
                rowIndex?: number;
                sheetId?: number;
            };
            heightPixels: number;
            offsetXPixels?: number;
            offsetYPixels?: number;
            widthPixels: number;
        };
    };
    spec: {
        altText?: string;
        basicChart: {
            axis: ChartAxis[];
            chartType: string;
            domains: { domain: ChartData }[];
            headerCount?: number;
            legendPosition?: string;
            series?: PlantColorSeries[];
        };
        fontName?: string;
        subtitle?: string;
        subtitleTextFormat?: Record<string, unknown>;
        subtitleTextPosition?: object;
        title: string;
        titleTextFormat?: Record<string, unknown>;
        titleTextPosition?: object;
    };
}
export interface PlantLayoutSnapshot {
    columnDimensions: { columns: RowDimension[]; sheetId: number }[];
    metadata: {
        sheets: (Omit<SheetMetadata, "charts"> & { charts?: LayoutChart[] })[];
    };
    rowDimensions: { rows: RowDimension[]; sheetId: number }[];
    weightMinimums: { minimum: null | number; sheetId: number }[];
}
export interface RowDimension {
    hiddenByFilter?: boolean;
    hiddenByUser?: boolean;
    pixelSize?: number;
}
