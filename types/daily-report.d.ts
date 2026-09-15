export interface DailyReport {
    coverage:
        | "complete"
        | "partial"
        | "unavailable";
    date: string;
    generatedAt: string;
    mixes: ReportMix[];
    notes: string[];
    pots: ReportPot[];
    sourceReadAt: null | string;
    summary: string;
    timeZone: "America/New_York";
    totalPots: null | number;
    version: 2;
}

export interface ReportMix {
    condition: string;
    gramsPerGallon: null | number;
    id: string;
    name: string;
    product: string;
    rationale: string;
}

export interface ReportPot {
    action:
        | "check"
        | "none"
        | "reference"
        | "unresolved"
        | "water"
        | "weigh";
    cycleStartedAt: null | string;
    dryReferenceGrams: null | number;
    id: string;
    label: string;
    latest: null | ReportWeight;
    metricsNote: string;
    mixId: null | string;
    name: string;
    plateau:
        | "confirmed"
        | "not-supported"
        | "unavailable";
    plateauPoints: ReportWeight[];
    previous: null | ReportWeight;
    reason: string;
    recommendation: string;
}

export interface ReportWeight {
    at: string;
    grams: number;
}
