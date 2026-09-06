import type { Window } from "happy-dom";

export interface Bootstrap {
    events: string[];
    links: Record<string, string>;
    plants: PlantSummary[];
    recent: Record<string, number | string>[];
    serverTime: string;
    version: string;
}

export type CellValue =
    | boolean
    | Date
    | null
    | number
    | string
    | undefined;

export interface LoggerOptions {
    batchSaveStatus?: ((request: ObservationPayload) => string) | string;
    bootstrapBehavior?: ScriptBehaviors["getWebAppBootstrap"];
    bootstrapData?: Bootstrap;
    configureWindow?: (window: Window) => void;
    matchMediaUnavailable?: boolean;
    online?: boolean;
    pendingSave?: object;
    saveStatus?: string;
    storage?: Record<string, string>;
    storageUnavailable?: boolean;
}

export interface ObservationPayload {
    condition?: string;
    events?: string[];
    expectedCount?: number;
    flowerCount?: string;
    flowerDetails?: string;
    height?: string;
    measurementMethod?: string;
    measurementQuality?: string;
    measurementUnit?: string;
    notes?: string;
    nutrientAmount?: string;
    nutrientProduct?: string;
    nutrientsUsed?: string;
    observedAt?: string;
    pestIssue?: string;
    pestTreatment?: string;
    photoUrl?: string;
    plantId?: string;
    plantIds?: string[];
    potSetup?: string;
    potSize?: string;
    requestId: string;
    rotationDegrees?: string;
    weight?: string;
    weightState?: string;
    width?: string;
}

export interface PlantSummary {
    activitySummary?: {
        averageDryDownGramsPerDay: "" | number;
        averageWaterIntervalDays: "" | number;
        dryDownDays: "" | number;
        dryDownReadingCount: number;
        recentDryDownDays: "" | number;
        recentDryDownGramsPerDay: "" | number;
        totalMeasurements: number;
        totalWaterings: number;
        totalWeights: number;
        waterIntervalCount: number;
    };
    currentImageUrl?: string;
    currentPotSize: string;
    daysSinceWater: number | string;
    dryForecastBasis?: string;
    dryForecastWindow?: string;
    dryOrLowestWeight: number | string;
    dryOrLowestWeightBasis: string;
    dryOrLowestWeightDate: string;
    fieldGuideUrl: string;
    historyUrl: string;
    id: string;
    label: string;
    lastWatered: string;
    latestWeight: number | string;
    name: string;
    nextDryCheck?: string;
    nurseryLabelImageUrl?: string;
    potSetup: number;
    recommendedWaterDate?: string;
    scientificName: string;
    wateringGuidance?: string;
}

export interface QueuedObservation {
    addedAt: string;
    attemptedAt?: string;
    error?: string;
    payload: Omit<ObservationPayload, "requestId">;
    requestId: string;
}

export interface ScriptArguments {
    getRecentWebObservations: [limit: number];
    getWebAppBootstrap: [];
    getWebBatchSaveStatus: [requests: ObservationPayload[]];
    getWebSaveStatus: [request: ObservationPayload];
    saveBulkCareObservation: [payload: ObservationPayload];
    saveWebObservation: [payload: ObservationPayload];
    saveWebObservationBatch: [payloads: ObservationPayload[]];
}

export type ScriptBehaviors = {
    [M in keyof ScriptArguments]?: (handlers: ScriptHandlers<M>) => void;
};

export type ScriptCall = {
    [M in keyof ScriptArguments]: { args: ScriptArguments[M]; method: M };
}[keyof ScriptArguments];

export interface ScriptHandlers<M extends keyof ScriptArguments> {
    args: ScriptArguments[M];
    failure: (error: unknown) => void;
    // These are runtime response boundaries: malformed responses are intentional
    // test inputs, and the real client is responsible for checking their shape.
    success: (response: unknown) => void;
}
