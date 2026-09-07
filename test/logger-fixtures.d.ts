import type { Window } from "happy-dom";

import type { LoggerCorrectionApi } from "./logger-correction-fixtures.js";
import type {
    WebHistoryFilters,
    WebRecentObservation,
    WebWeightSeries,
} from "./logger-workflow-fixtures.js";

export interface Bootstrap {
    dayKey?: string;
    events: string[];
    links: Record<string, string>;
    plants: PlantSummary[];
    recent: (Record<string, number | string> | WebRecentObservation)[];
    serverTime: string;
    timeZone?: string;
    version: string;
    weighedTodayPlantIds?: string[];
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
    latestWeightAt?: string;
    name: string;
    nextDryCheck?: string;
    nurseryLabelImageUrl?: string;
    potSetup: number;
    recommendedWaterDate?: string;
    scientificName: string;
    wateringGuidance?: string;
    weightSeries?: WebWeightSeries;
}

export interface QueuedObservation {
    addedAt: string;
    attemptedAt?: string;
    error?: string;
    payload: Omit<ObservationPayload, "requestId">;
    requestId: string;
}

export interface ScriptArguments {
    getRecentWebObservations: [limit: number, filters?: WebHistoryFilters];
    getWebAppBootstrap: [];
    getWebBatchSaveStatus: [requests: ObservationPayload[]];
    getWebCorrectionEntry: Parameters<
        LoggerCorrectionApi["getWebCorrectionEntry"]
    >;
    getWebCorrectionStatus: Parameters<
        LoggerCorrectionApi["getWebCorrectionStatus"]
    >;
    getWebSaveStatus: [request: ObservationPayload];
    previewWebObservationCorrection: Parameters<
        LoggerCorrectionApi["previewWebObservationCorrection"]
    >;
    saveBulkCareObservation: [payload: ObservationPayload];
    saveWebObservation: [payload: ObservationPayload];
    saveWebObservationBatch: [payloads: ObservationPayload[]];
    saveWebObservationCorrection: Parameters<
        LoggerCorrectionApi["saveWebObservationCorrection"]
    >;
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
