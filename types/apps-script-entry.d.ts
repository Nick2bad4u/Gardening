interface GardenAnalyticsRefreshResult {
    calculatedAt?: string;
    historyRows?: number;
    message?: string;
    payloadBytes?: number;
    skipped?: true;
    status:
        | "Busy"
        | "Ready"
        | "Refresh failed";
}

interface GardenBatchStatusRequest {
    expectedCount?: number;
    plantId?: string;
    requestId: string;
}

interface GardenBulkReceipt {
    message: string;
    requestCount: number;
    savedAt: "" | Date;
    savedCount: number;
    status:
        | "Needs correction"
        | "Retry"
        | "Saved";
}

interface GardenDiagnosticContext {
    operation: string;
    runId: string;
    startedAt: number;
}

type GardenEntryObservation = globalThis.GardenStoredObservationInput;

/** Raw RPC object keys remain unknown until their field validators run. */
interface GardenEntryPayload {
    condition?: unknown;
    entrySource?: unknown;
    environmentAspect?: unknown;
    environmentFrom?: unknown;
    environmentTo?: unknown;
    events?: unknown;
    expectedCount?: unknown;
    flowerCount?: unknown;
    flowerDetails?: unknown;
    height?: unknown;
    inventoryRevision?: unknown;
    leafAirTemperature?: unknown;
    leafAirTemperatureUnit?: unknown;
    leafHumidity?: unknown;
    leafTemperature?: unknown;
    leafTemperatureUnit?: unknown;
    leafVpd?: unknown;
    leafVpdSource?: unknown;
    lux?: unknown;
    measurementMethod?: unknown;
    measurementQuality?: unknown;
    measurementUnit?: unknown;
    medium?: unknown;
    mistAmountMl?: unknown;
    mistDetails?: unknown;
    mistTargets?: unknown;
    moveFrom?: unknown;
    moveTo?: unknown;
    notes?: unknown;
    nutrientAmount?: unknown;
    nutrientProduct?: unknown;
    nutrientsUsed?: unknown;
    observedAt?: unknown;
    pestIssue?: unknown;
    pestTreatment?: unknown;
    photoUrl?: unknown;
    plantId?: unknown;
    plantIds?: unknown;
    potSize?: unknown;
    ppfd?: unknown;
    propagationDetails?: unknown;
    propagationMethod?: unknown;
    relativeHumidity?: unknown;
    requestId?: unknown;
    rotationDegrees?: unknown;
    soilMoisture?: unknown;
    supportAction?: unknown;
    supportDetails?: unknown;
    temperature?: unknown;
    temperatureC?: unknown;
    temperatureTarget?: unknown;
    temperatureUnit?: unknown;
    waterAmount?: unknown;
    wateringApplication?: unknown;
    weight?: unknown;
    weightState?: unknown;
    width?: unknown;
}

type GardenEntryPlant = globalThis.GardenPlantData;

type GardenEntryQueueSummary = ReturnType<
    typeof globalThis.appSheetQueueSummary_
>;

interface GardenEntryReceipt {
    historyRows: number;
    message: string;
    requestId: string;
    savedAt: "" | Date;
    status:
        | "Needs correction"
        | "Retry"
        | "Saved";
}

type GardenEntryWriteResult = ReturnType<
    typeof globalThis.observationWriteResult_
>;
type GardenHistorySnapshot = ReturnType<
    typeof globalThis.historyObservationSnapshot_
>;
interface GardenHistorySnapshotEntry {
    rowNumber: number;
    values: globalThis.GardenHistoryRow;
}
interface GardenIndexedWebObservation {
    index: number;
    value: GardenPreparedWebObservation;
}
type GardenPendingObservationResults = (GardenWebObservationResult | null)[];
interface GardenPreparedWebObservation {
    observation: GardenEntryObservation;
    plant: GardenEntryPlant;
}

interface GardenWebObservationFailure {
    duplicate?: never;
    errorCode:
        | "HISTORY_CAPACITY"
        | "HISTORY_CONFLICT"
        | "VALIDATION";
    historyRows?: never;
    message: string;
    ok: false;
    plantId: string;
    plantName?: string;
    requestId: string;
    retryable: boolean;
}

type GardenWebObservationResult =
    GardenWebObservationFailure | GardenWebObservationSuccess;

interface GardenWebObservationSuccess {
    duplicate: boolean;
    events: string[];
    historyRows: number;
    label: string;
    message: string;
    observedAt: string;
    ok: true;
    plantId: string;
    plantName: string;
    recordedAt: string;
    requestId: string;
    retryable?: never;
}

interface GardenWorkbookPlant {
    fieldGuideUrl: string;
    id: string;
    label: string;
    name: string;
    scientificName: string;
    trackerRow: number;
}
