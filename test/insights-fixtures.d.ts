import type {
    Chart,
    ChartSeries,
    ChartSpec,
    SheetMetadata,
    WorkbookSnapshot,
} from "./workbook-fixtures.js";

/** Native Sheets can omit the series field when a copied chart loses its data. */
export interface InsightsChart extends Omit<Chart, "spec"> {
    spec: Omit<ChartSpec, "basicChart"> & {
        basicChart: Omit<ChartSpec["basicChart"], "series"> & {
            series?: ChartSeries[];
        };
    };
}

export interface InsightsSnapshot extends Omit<WorkbookSnapshot, "metadata"> {
    metadata: {
        sheets: (Omit<SheetMetadata, "charts"> & {
            charts?: InsightsChart[];
        })[];
    };
}
