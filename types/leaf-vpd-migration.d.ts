import type { GridRange, SheetMetadata } from "../test/workbook-fixtures.js";
import type {
    IntegrityCell,
    IntegrityReadRange,
} from "./workbook-integrity.js";

export interface LeafVpdPlan {
    footprint: string[];
    formulaRequests: Record<string, unknown>[];
    preconditionDigest: string;
    prepareRequests: Record<string, unknown>[];
}

export interface LeafVpdSchema {
    bulk: string[];
    bulkEvents: string[];
    entries: string[];
    history: string[];
}

export interface LeafVpdSnapshot {
    cells: (IntegrityCell & {
        dataValidation?: LeafVpdValidation;
        note?: string;
    })[];
    metadata: {
        sheets: (Omit<SheetMetadata, "basicFilter"> & {
            basicFilter?: {
                criteria?: Record<string, unknown>;
                filterSpecs?: unknown[];
                range: GridRange;
                sortSpecs?: unknown[];
            };
        })[];
    };
    readRanges: IntegrityReadRange[];
}

export interface LeafVpdValidation {
    condition: {
        type: string;
        values?: { userEnteredValue: string }[];
    };
    showCustomUi?: boolean;
    strict?: boolean;
}
