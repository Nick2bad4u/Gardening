import type { LeafVpdSnapshot } from "./leaf-vpd-migration.js";

export interface HistoryCapacityEdit {
    after: number | string;
    before: number | string;
    column: number;
    row: number;
    sheet: string;
}

export interface HistoryCapacityOptions {
    activePlantIds: string[];
    historyHeaders: string[];
}

export interface HistoryCapacityPlan {
    allocatedCellsAfter: number;
    allocatedCellsBefore: number;
    chartRequests: Record<string, unknown>[];
    edits: HistoryCapacityEdit[];
    formulaRequests: Record<string, unknown>[];
    historyLastRow: number;
    observationCapacity: number;
    preconditionDigest: string;
    prepareRequests: Record<string, unknown>[];
}

export interface HistoryCapacitySnapshot extends LeafVpdSnapshot {
    /** True only after native metadata with chart specifications was captured. */
    chartsCaptured: boolean;
}
