import type { LeafVpdSnapshot } from "./leaf-vpd-migration.js";

export interface WateringMapFeedPlan {
    allocatedCellsAfter: number;
    allocatedCellsBefore: number;
    footprint: string[];
    preconditionDigest: string;
    requests: Record<string, unknown>[];
    sheetId: number;
}

export interface WateringMapFeedSnapshot {
    cells: LeafVpdSnapshot["cells"];
    metadata: {
        properties: { locale?: string; timeZone: string };
        sheets: (LeafVpdSnapshot["metadata"]["sheets"][number] & {
            properties: LeafVpdSnapshot["metadata"]["sheets"][number]["properties"] & {
                hidden?: boolean;
                index: number;
                sheetType?: string;
            };
        })[];
        spreadsheetId: string;
    };
    /**
     * True only after capturing every sheet and full charts/protections
     * metadata.
     */
    metadataComplete: boolean;
    readRanges: LeafVpdSnapshot["readRanges"];
}
