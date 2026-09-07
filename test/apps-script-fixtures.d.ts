import type { DailyApi } from "./daily-dashboard-fixtures.js";
import type {
    Bootstrap,
    CellValue,
    ObservationPayload,
} from "./logger-fixtures.js";
import type {
    HistoryDetailValue,
    WebHistoryDetails,
    WebHistoryFilters,
    WebPlantWeightReadModel,
    WebRecentObservation,
    WebWeightReadModels,
} from "./logger-workflow-fixtures.js";

export interface ActivitySummary {
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
}
export interface AppendResult {
    duplicate: boolean;
    eventNames: string[];
    historyRows: number;
    observationDate: Date;
    potSetup: number;
    recordedAt: Date;
    requestId: string;
    targetRow: number;
}
export type AppsScriptArguments<K extends AppsScriptFunctionName> =
    AppsScriptTestApi[K] extends (...args: infer A) => unknown ? A : never;
export type AppsScriptFunctionName = {
    [K in keyof AppsScriptTestApi]: AppsScriptTestApi[K] extends (
        ...args: never[]
    ) => unknown
        ? K
        : never;
}[keyof AppsScriptTestApi];
/**
 * Public and internal functions exercised through the Apps Script VM. Inputs at
 * this runtime boundary may intentionally be malformed. The sheet mocks
 * themselves have separately checked method and cell-value contracts.
 */
export interface AppsScriptTestApi {
    appendObservation_: (spreadsheet: unknown, input: unknown) => AppendResult;
    appendPreparedWebObservationBatch_: (
        spreadsheet: unknown,
        items: unknown,
        results: unknown
    ) => {
        historyWriteMs: number;
        validationCleanupMs: number;
        validationRowsCleared: number;
    };
    applyBulkEvent_: (quickLog: unknown) => void;
    appPlantChartsFormula_: () => string;
    appSheetBulkPayloadsFromRow_: (
        row: unknown,
        roundId: unknown
    ) => {
        payload: {
            condition: string;
            entrySource: string;
            events: string[];
            notes: string;
            nutrientAmount: string;
            nutrientProduct: string;
            nutrientsUsed: string;
            observedAt: unknown;
            pestIssue: string;
            pestTreatment: string;
            plantId: string;
            requestId: unknown;
            rotationDegrees: unknown;
            soilMoisture: string;
            waterAmount: unknown;
            wateringApplication: string;
            weight: unknown;
            weightState: string;
        };
        plantId: string;
    }[];
    appSheetBulkWateredPlants_: (value: unknown) => Set<string>;
    appSheetEventList_: (value: unknown) => string[];
    archiveQuickLogRow_: (quickLog: unknown, rowNumber: unknown) => void;
    assertHeaders_: (
        sheet: unknown,
        expected: unknown,
        rowNumber: unknown
    ) => void;
    assertUniqueIdsInRows_: (rows: unknown, sheetName: unknown) => void;
    assertUniquePlantIds_: (plants: unknown) => void;
    baselinePotSetupData_: (baselines: unknown) => {
        potSetupColumn: number;
        rows: CellValue[][];
    };
    baselineViewRow_: (rowNumber: unknown, plant: unknown) => CellValue[];
    buildEventNames_: (
        selectedEvent: unknown,
        weightState: unknown,
        weight: unknown,
        height: unknown,
        width: unknown,
        condition: unknown,
        notes: unknown
    ) => string[];
    buildEventNamesFromList_: (
        requestedEvents: unknown,
        weightState: unknown,
        weight: unknown,
        height: unknown,
        width: unknown,
        condition: unknown,
        notes: unknown
    ) => string[];
    cleanText_: (value: unknown) => string;
    columnName_: (columnNumber: unknown) => string;
    comparableHistoryValue_: (value: unknown) => number | string;
    currentLabelForPlant_: (spreadsheet: unknown, plantId: unknown) => string;
    dashboardViewRow_: (
        spreadsheet: unknown,
        plant: unknown,
        index: unknown
    ) => CellValue[];
    dashboardWeightCountFormula_: (row: number) => string;
    dateSortValue_: (value: unknown) => number;
    doGet: () => object;
    dryDownModelFormula_: () => string;
    dryDownModelsFromHistory_: (
        historyRows: unknown,
        plantIds: unknown,
        timeZone: unknown
    ) => Map<
        string,
        {
            basis: string;
            waterDate: string;
            waterGuidance: string;
            window: string;
        }
    >;
    dryDownPrior_: (
        learned: unknown,
        currentDate: unknown
    ) => { log: number; spread: number };
    dryDownSerialDate_: (value: unknown, timeZone: unknown) => number;
    dryOrLowestWeightsFromRows_: (
        historyRows: unknown
    ) => Map<string, { basis: string; observedAt: CellValue; weight: number }>;
    ensureAppSheetEntryColumns_: (
        sheet: unknown,
        shouldConfigureColumn?: boolean
    ) => boolean;
    ensureHistoryDetailColumns_: (history: unknown) => void;
    ensureHistoryGrid_: (history: unknown) => void;
    ensureHistoryMeasurementColumns_: (
        history: unknown,
        shouldConfigureColumn?: boolean
    ) => void;
    ensureHistoryProvenanceColumns_: (history: unknown) => void;
    ensureHistoryRequestIdColumn_: (history: unknown) => void;
    ensureHistoryRotationColumns_: (
        history: unknown,
        shouldConfigureColumn?: boolean
    ) => void;
    ensureHistoryView_: (spreadsheet: unknown) => boolean;
    ensureHistoryWaterColumns_: (
        history: unknown,
        shouldConfigureColumn?: boolean
    ) => undefined;
    ensureQuickLogWaterColumns_: (
        quickLog: unknown,
        shouldConfigureColumns?: boolean
    ) => boolean;
    ensureSheetRowCapacity_: (sheet: unknown, requiredRows: unknown) => void;
    eventDetailsFromPayload_: (
        payload: unknown,
        eventNames: unknown,
        plant: unknown
    ) => {
        flowerCount: string;
        flowerDetails: string;
        nutrientAmount: string;
        nutrientProduct: string;
        nutrientsUsed: string;
        pestIssue: string;
        pestTreatment: string;
        photoUrl: string;
        potSize: string;
        previousPotSize: string;
        rotationDegrees: string;
        waterAmount: string;
        wateringApplication: string;
    };
    existingObservationResult_: (
        input: unknown,
        requestId: unknown,
        existingRequestRows: unknown,
        existingValues: unknown
    ) => AppendResult | null;
    fieldGuideUrlForRow_: (formulaRow: unknown) => string;
    fitDryDownCurve_: (
        points: unknown,
        dry: unknown,
        tolerance: unknown
    ) => {
        count: number;
        decay: number;
        error: number;
        fit: number;
        gain: boolean;
        span: number;
    };
    formatClientDate_: (
        value: unknown,
        timeZone: unknown,
        pattern: unknown
    ) => string;
    formulaString_: (value: unknown) => string;
    GARDEN_DRY_DOWN: (history: unknown, plantIds: unknown) => DryDownRow[];
    getGardenSpreadsheet_: () => object;
    getRecentObservations_: (
        spreadsheet: unknown,
        timeZone: unknown,
        limit: unknown,
        plantNames?: Map<unknown, unknown>
    ) => WebRecentObservation[];
    getRecentWebObservations: (
        limit: unknown,
        filters?: unknown
    ) => WebRecentObservation[];
    getWebAppBootstrap: () => Omit<Bootstrap, "plants"> & {
        dayKey: string;
        plants: (Bootstrap["plants"][number] &
            WebPlantWeightReadModel & {
                activitySummary: ActivitySummary;
            })[];
        timeZone: string;
        weighedTodayPlantIds: string[];
    };
    getWebBatchSaveStatus: (requests: unknown) => SaveStatus[];
    getWebSaveStatus: (payload: unknown) => SaveStatus;
    historyObservationSnapshot_: (history: unknown) => {
        lastReservedRow: number;
        rowsByRequest: Map<
            string,
            { rowNumber: number; values: CellValue[] }[]
        >;
    };
    historyProvenanceRow_: (
        input: unknown,
        requestId: unknown,
        eventName: unknown,
        eventIndex: unknown
    ) => CellValue[];
    historyRecordsShareSave_: (left: unknown, right: unknown) => boolean;
    historyRowsForRequest_: (history: unknown, requestId: unknown) => number[];
    inferredWeightStatesByRow_: (historyRows: unknown) => Map<number, string>;
    installAppSheetBulkSheet: () => {
        columnCount: number;
        created: boolean;
        migrated: boolean;
        plantCount: number;
        sheet: "App bulk";
    };
    installAppSheetIntake: () => {
        bulk: {
            columnCount: number;
            created: boolean;
            migrated: boolean;
            plantCount: number;
            sheet: "App bulk";
        };
        entryColumnsChanged: boolean;
    };
    installAppSheetQueueTrigger: () => {
        created: boolean;
        handler: string;
        removedDuplicateCount: number;
        removedTriggerCount: unknown;
    };
    installDailyCareDashboard: DailyApi["installDailyCareDashboard"];
    installDashboardWeightCounts: () => {
        plants: number;
        range: string;
        version: string;
    };
    installDryDownLearning: () => {
        baselineColumns: number;
        historyChanged: boolean;
        loggerVersion: string;
        plants: number;
    };
    installGardenLogger: () => void;
    installWateringRecommendations: () => {
        historyChanged: boolean;
        loggerVersion: string;
        plants: number;
    };
    isGooglePhotosShareUrl_: (value: unknown) => boolean;
    lastHistoryDataRow_: (history: unknown) => number;
    lastHistoryReservedRow_: (history: unknown) => number;
    latestPotSizesByPlant_: (spreadsheet: unknown) => Map<string, string>;
    LockService: {
        getScriptLock: () => {
            releaseLock: () => void;
            tryLock: (milliseconds?: number) => boolean;
        };
    };
    markSaveError_: (saveCell: unknown, message: unknown) => void;
    measuredDimensionCondition_: () => string;
    measurementToCentimeters_: (value: unknown, unit: unknown) => "" | number;
    migrateLegacyAppSheetBulkSheet_: (sheet: unknown) => boolean;
    normalizeAppSheetBulkAction_: (value: unknown) => string;
    normalizeDate_: (value: unknown) => Date;
    normalizeMeasurementMethod_: (
        value: unknown,
        eventNames: unknown
    ) => string;
    normalizeMeasurementQuality_: (
        value: unknown,
        eventNames: unknown,
        measurementMethod?: unknown
    ) => string;
    normalizeMeasurementUnit_: (
        value: unknown,
        eventNames: unknown,
        fallback?: string
    ) => string;
    normalizeRecentLimit_: (value: unknown) => number;
    normalizeRequestId_: (value: unknown, isRequired?: boolean) => string;
    normalizeWebEntrySource_: (value: unknown) => string;
    normalizeWebHistoryFilters_: (
        filters: unknown,
        plantNames: Map<string, string>
    ) => WebHistoryFilters;
    normalizeWeightState_: (value: unknown, weight: unknown) => "" | "Routine";
    onEdit: (event?: unknown) => void;
    onOpen: () => void;
    openHistory: () => void;
    openMobileEntry: () => void;
    openQuickLog: () => void;
    optionalColumnForHeader_: (
        sheet: unknown,
        expectedHeader: unknown
    ) => number;
    optionalPositiveInteger_: (value: unknown, label: unknown) => "" | number;
    optionalPositiveNumber_: (value: unknown, label: unknown) => "" | number;
    organizeWorkbookSheets_: (spreadsheet: unknown) => void;
    plantActivitySummary_: (
        historyRows: CellValue[][],
        plantId: string,
        potSetup: number
    ) => ActivitySummary;
    plantChartHelperFormula_: (plantId: unknown) => string;
    plantNamesById_: (spreadsheet: unknown) => Map<string, string>;
    plantPageHistoryFormula_: (plantId: unknown) => string;
    plantPageSheet_: (
        spreadsheet: unknown,
        plantId: unknown
    ) => { getName: () => string };
    plantRecordForId_: (spreadsheet: unknown, plantId: unknown) => PlantRecord;
    plantRecordsById_: (spreadsheet: unknown) => Map<string, PlantRecord>;
    positiveInteger_: (value: unknown, label: unknown) => number;
    prepareWebObservation_: (
        spreadsheet: unknown,
        payload: unknown,
        plantRecords?: unknown
    ) => {
        observation: {
            condition: string;
            currentLabel: unknown;
            details: {
                flowerCount: string;
                flowerDetails: string;
                nutrientAmount: string;
                nutrientProduct: string;
                nutrientsUsed: string;
                pestIssue: string;
                pestTreatment: string;
                photoUrl: string;
                potSize: string;
                previousPotSize: string;
                rotationDegrees: string;
                waterAmount: string;
                wateringApplication: string;
            };
            entrySource: string;
            eventNames: unknown[];
            height: unknown;
            measurementMethod: string;
            measurementQuality: string;
            measurementUnit: unknown;
            medium: string;
            notes: string;
            observationDate: Date;
            plantId: string;
            potSetup: unknown;
            requestId: unknown;
            soilMoisture: string;
            weight: number | string;
            weightState: string;
            width: unknown;
        };
        plant: unknown;
    };
    processAppSheetEntry: (entryId: unknown) => { ok: boolean };
    processQueuedAppSheetEntries: () => {
        [key: string]: unknown;
        bulk: { [key: string]: unknown; retryCount: number };
    };
    readHistorySnapshot_: (spreadsheet: unknown) => CellValue[][];
    recentObservationsFromRows_: (
        historyRows: unknown,
        timeZone: unknown,
        limit: unknown,
        plantNames: unknown,
        filters?: unknown
    ) => WebRecentObservation[];
    refreshBaselineView_: (spreadsheet: unknown, plants: unknown) => void;
    refreshDashboardView_: (spreadsheet: unknown, plants: unknown) => void;
    refreshDryDownModels_: (spreadsheet: unknown) => void;
    refreshGardenWorkbook: () => {
        baselineColumns: number;
        dashboardColumns: number;
        loggerVersion: string;
        plantPages: number;
    };
    refreshGardenWorkbookPages01To10: () => {
        firstPlant: unknown;
        lastPlant: unknown;
        loggerVersion: string;
        plantPages: number;
    };
    refreshGardenWorkbookPages11To20: () => {
        firstPlant: unknown;
        lastPlant: unknown;
        loggerVersion: string;
        plantPages: number;
    };
    refreshGardenWorkbookPages21To30: () => {
        firstPlant: unknown;
        lastPlant: unknown;
        loggerVersion: string;
        plantPages: number;
    };
    refreshPlantPage_: (
        spreadsheet: unknown,
        plants: unknown,
        index: unknown,
        plant: unknown
    ) => void;
    remeasureStatusFormula_: (row: unknown) => string;
    removeSelectedHistoryObservations: () => void;
    requiredColumnForHeader_: (
        sheet: unknown,
        expectedHeader: unknown
    ) => number;
    requireSheet_: (spreadsheet: unknown, name: unknown) => object;
    safeSheetText_: (value: unknown) => string;
    saveBulkCareObservation: (payload: unknown) => {
        duplicateCount: unknown;
        events: string[];
        message: string;
        ok: boolean;
        plantCount: unknown;
    };
    saveBulkWaterObservation: (payload?: unknown) => {
        duplicateCount: unknown;
        events: string[];
        message: string;
        ok: boolean;
        plantCount: unknown;
    };
    savedRequestStatus_: (history: unknown, requestId: unknown) => SaveStatus;
    saveWebObservation: (payload: unknown) => SaveResult;
    saveWebObservationBatch: (payloads: WebPayload[]) => BatchResult;
    SpreadsheetApp: { flush: () => void; openById: () => object };
    stampEntryStartedAt_: (quickLog: unknown, editedRange: unknown) => void;
    storedObservationRows_: (
        input: unknown,
        requestId: unknown,
        targetRow: unknown,
        recordedAt: unknown
    ) => CellValue[][];
    uniqueTextValues_: (values: unknown) => string[];
    updateBaselinePotSetup_: (
        spreadsheet: unknown,
        plantId: unknown,
        potSetup: unknown
    ) => void;
    updateInferredEvent_: (
        quickLog: unknown,
        rowNumber: unknown,
        columnNumber: unknown
    ) => void;
    Utilities: {
        formatDate: (date: Date, zone: string, pattern: string) => string;
    };
    validateMeasurementEvents_: (
        eventNames: unknown,
        weight: unknown,
        height: unknown,
        width: unknown
    ) => void;
    wateringReadinessGuidance_: (plantId: unknown) =>
        | "Confirm the root zone is dry and the plant is ready; reduce watering during rest. No fixed extra dry days."
        | "Confirm the shared root zone is dry and inspect every component; no fixed extra dry days."
        | "During active growth, let much of the mix dry; no extra drought delay. If resting, inspect before watering.";
    wateringRecommendation_: (
        plantId: unknown,
        model: unknown
    ) =>
        | { date: number; guidance: string }
        | { date: string; guidance: unknown };
    webHistoryDetails_: (row: unknown) => WebHistoryDetails;
    webHistoryDetailValue_: (value: unknown) => HistoryDetailValue;
    webHistoryTimestamp_: (value: unknown) => number;
    webPlantWeightReadModel_: (
        records: unknown,
        potSetup: number,
        nowMs: number,
        previousDry: unknown
    ) => WebPlantWeightReadModel;
    webWeightReadModelsFromRows_: (
        historyRows: unknown,
        baselineSetups: Map<string, number>,
        now: Date,
        timeZone: string
    ) => WebWeightReadModels;
    workbookPlantRecords_: (spreadsheet: unknown) => PlantRecord[];
    writeStoredObservationRows_: (
        history: unknown,
        targetRow: unknown,
        storedRows: unknown
    ) => {
        historyWriteMs: number;
        validationCleanupMs: number;
        validationRowsCleared: unknown;
    };
}
export interface BatchResult {
    failedCount: number;
    message: string;
    ok: boolean;
    results: {
        duplicate?: boolean;
        error?: string;
        historyRows?: number;
        message?: string;
        ok: boolean;
        plantId?: string;
        requestId: string;
        retryable?: boolean;
    }[];
    savedCount: number;
}
export type DryDownRow = [
    plant: string,
    setup: number,
    dry: "" | number,
    wet: "" | number,
    count: number,
    learned: "" | number,
    loss: "" | number,
    date: "" | number,
    early: "" | number,
    late: "" | number,
    basis: string,
    readiness: string,
    review: string,
    fit: "" | number,
    waterDate: "" | number,
    waterGuidance: string,
];
export interface PlantRecord {
    currentPotSize?: string;
    fieldGuideUrl?: string;
    id: string;
    label?: string;
    name?: string;
    potSetup?: number;
    row?: number;
    scientificName?: string;
}

export interface RecentObservation {
    [key: string]: CellValue;
    event: string;
    observedAt: string;
    plantId: string;
    potSetup: number;
    recordedAt: string;
}
export interface SaveResult {
    duplicate: boolean;
    events: string[];
    historyRows: number;
    label: string;
    message: string;
    observedAt: string;
    ok: boolean;
    plantId: string;
    plantName: string;
    recordedAt: string;
    requestId: string;
}
export interface SaveStatus {
    expectedCount?: number;
    message?: string;
    requestId: string;
    savedCount?: number;
    state: string;
}
export type WebPayload = {
    [K in keyof ObservationPayload]?: CellValue | string[];
} & {
    entrySource?: string;
    events?: string[];
    plantId?: string;
    requestId?: string;
};
