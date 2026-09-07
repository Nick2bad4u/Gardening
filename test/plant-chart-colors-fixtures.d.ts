import type {
    Chart,
    ChartData,
    ChartSeries,
    ChartSpec,
    SheetMetadata,
    WorkbookSnapshot,
} from "./workbook-fixtures.js";

export interface PlantColorChart extends Omit<Chart, "position" | "spec"> {
    spec: Omit<ChartSpec, "basicChart"> & {
        altText?: string;
        basicChart: Omit<ChartSpec["basicChart"], "series"> & {
            chartType?: string;
            headerCount?: number;
            legendPosition?: string;
            series: PlantColorSeries[];
        };
    };
}
export interface PlantColorSeries extends Omit<
    ChartSeries,
    "dataLabel" | "pointStyle"
> {
    color?: { blue: number; green: number; red: number };
    dataLabel?: {
        customLabelData?: ChartData;
        textFormat?: object;
        type?: string;
    };
    lineStyle?: { type?: string; width?: number };
    pointStyle?: { shape?: string; size?: number };
    styleOverrides?: {
        colorStyle: { rgbColor: { blue: number; green: number; red: number } };
        index: number;
    }[];
}
export interface PlantColorSnapshot extends Omit<WorkbookSnapshot, "metadata"> {
    metadata: {
        sheets: (Omit<SheetMetadata, "charts"> & {
            charts?: PlantColorChart[];
        })[];
    };
}
