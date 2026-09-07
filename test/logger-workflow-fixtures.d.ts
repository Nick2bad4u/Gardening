export type HistoryDetailValue =
    | boolean
    | number
    | string;

/** Raw sheet text stays text. The client renders every value via textContent. */
export interface WebHistoryDetails {
    condition?: HistoryDetailValue;
    correctionReason?: HistoryDetailValue;
    correctsObservationId?: HistoryDetailValue;
    entrySource?: HistoryDetailValue;
    flowerCount?: HistoryDetailValue;
    flowerDetails?: HistoryDetailValue;
    height?: number;
    heightCm?: HistoryDetailValue;
    heightIn?: number;
    measurementMethod?: HistoryDetailValue;
    measurementUnit?: string;
    medium?: HistoryDetailValue;
    notes?: HistoryDetailValue;
    nutrientAmount?: HistoryDetailValue;
    nutrientProduct?: HistoryDetailValue;
    nutrientsUsed?: HistoryDetailValue;
    observationQuality?: HistoryDetailValue;
    pestIssue?: HistoryDetailValue;
    pestTreatment?: HistoryDetailValue;
    photoUrl?: HistoryDetailValue;
    potLabel?: HistoryDetailValue;
    potSetup?: HistoryDetailValue;
    potSize?: HistoryDetailValue;
    previousPotSize?: HistoryDetailValue;
    recordedAtIso?: string;
    recordStatus?: HistoryDetailValue;
    rotationDegrees?: HistoryDetailValue;
    saveGroup?: HistoryDetailValue;
    soilMoisture?: HistoryDetailValue;
    waterAmount?: HistoryDetailValue;
    wateringApplication?: HistoryDetailValue;
    width?: number;
    widthCm?: HistoryDetailValue;
    widthIn?: number;
}

/** Additive server reads; older cached bootstraps can omit these fields. */
export interface WebHistoryFilters {
    event?: string;
    plantId?: string;
}

export interface WebPlantWeightReadModel {
    latestWeight: "" | number;
    latestWeightAt: string;
    weightSeries: WebWeightSeries;
}

export interface WebRecentObservation {
    details: WebHistoryDetails;
    event: string;
    name: string;
    observationId: string;
    observedAt: string;
    observedAtIso: string;
    plantId: string;
    weight: "" | number;
    weightState: string;
}

export interface WebWeightPoint {
    breakBefore: boolean;
    observationId: string;
    observedAt: string;
    weight: number;
}

export interface WebWeightReadModels {
    byPlant: Map<string, WebPlantWeightReadModel>;
    dayKey: string;
    weighedTodayPlantIds: string[];
}

export interface WebWeightSeries {
    /** Unusable current-span weights, plus undated/future current-setup weights. */
    excludedCount: number;
    points: WebWeightPoint[];
    potSetup: number;
    previousDry: null | { observedAt: string; weight: number };
    setupStartedAt: string;
    startedAt: string;
    startKind:
        | ""
        | "First reading"
        | "Repot"
        | "Water";
    waterings: { application: string; observedAt: string }[];
}
