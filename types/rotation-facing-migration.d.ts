import type { LeafVpdSnapshot } from "./leaf-vpd-migration.js";

export interface RotationDegreeValidationPlan {
    footprint: string[];
    preconditionDigest: string;
    requests: Record<string, unknown>[];
}

export interface RotationFacingPlan {
    footprint: string[];
    formulaRequests: Record<string, unknown>[];
    preconditionDigest: string;
    prepareRequests: Record<string, unknown>[];
}

export interface RotationFacingSchema {
    bulk: string[];
    entries: string[];
    history: string[];
}

export interface RotationFacingSnapshot extends LeafVpdSnapshot {
    /** Full native metadata was requested, including charts and protections. */
    metadataComplete: boolean;
}
