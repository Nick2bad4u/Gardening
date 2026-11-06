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
        sheets: (Omit<
            LeafVpdSnapshot["metadata"]["sheets"][number],
            "protectedRanges"
        > & {
            properties: LeafVpdSnapshot["metadata"]["sheets"][number]["properties"] & {
                hidden?: boolean;
                index: number;
                sheetType?: string;
            };
            protectedRanges?: (NonNullable<
                LeafVpdSnapshot["metadata"]["sheets"][number]["protectedRanges"]
            >[number] & {
                unprotectedRanges?: { sheetId: number }[];
            })[];
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
