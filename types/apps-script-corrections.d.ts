interface GardenCorrectionAttempted extends GardenCorrectionOperationIdentity {
    status: "attempted";
}
/** Exact canonical cell types established by correction row validation. */
type GardenCorrectionCanonicalRow = [
    date: Date,
    ...fields: GardenCorrectionRowFields,
];
/** Native Sheets v4 request types retain optional service/API members. */
type GardenCorrectionCellData = GoogleAppsScript.Sheets.Schema.CellData;
type GardenCorrectionChanges = Record<string, GardenCorrectionScalar>;
interface GardenCorrectionContext {
    baseRevision: string;
    contextDigest: string;
    fields: GardenCorrectionField[];
    notices: string[];
    original: GardenCorrectionEntry;
    siblings: GardenCorrectionEntry[];
    timeZone: string;
}
/** Removed legacy siblings can retain a blank observation date. */
type GardenCorrectionDisplayRow = [
    date: "" | Date,
    ...fields: GardenCorrectionRowFields,
];
interface GardenCorrectionEntry {
    correctionReason: string;
    correctsObservationId: string;
    event: GardenCorrectionEvent;
    label: string;
    observationDate: string;
    observationId: string;
    plantId: string;
    potSetup: GardenOptionalNumber;
    recordedAt: string;
    recordStatus: GardenCorrectionRecordStatus;
    requestId: string;
    saveGroupId: string;
    values: Record<string, GardenCorrectionScalar>;
}
type GardenCorrectionEvent =
    | "Check"
    | "Clean"
    | "Environment"
    | "Flower"
    | "Humidity"
    | "Inspect"
    | "Leaf VPD"
    | "Light"
    | "Measure"
    | "Mist"
    | "Move"
    | "Note"
    | "Other"
    | "Pest"
    | "Photo"
    | "Propagate"
    | "Prune"
    | "Repot"
    | "Rotation"
    | "Support"
    | "Temperature"
    | "Water"
    | "Weigh";
interface GardenCorrectionField {
    key: string;
    label: string;
    options: string[];
    required: boolean;
    type: GardenCorrectionFieldType;
    unit: string;
}
type GardenCorrectionFieldColumn =
    | 0
    | 4
    | 5
    | 6
    | 7
    | 8
    | 16
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23
    | 24
    | 25
    | 28
    | 32
    | 33
    | 34
    | 36
    | 39
    | 40
    | 41
    | 42
    | 43
    | 44
    | 45
    | 46
    | 47
    | 48
    | 49
    | 50
    | 51
    | 52
    | 53
    | 54
    | 55
    | 56
    | 57
    | 58
    | 59
    | 60
    | 61
    | 62
    | 63
    | 64
    | 65
    | 66;
interface GardenCorrectionFieldDefinition extends GardenCorrectionField {
    column: GardenCorrectionFieldColumn;
    events: GardenCorrectionEvent[];
}
type GardenCorrectionFieldSpec = [
    key: string,
    column: GardenCorrectionFieldColumn,
    label: string,
    type?: GardenCorrectionFieldType,
    options?: readonly string[],
    required?: boolean,
    unit?: string,
    events?: GardenCorrectionEvent[],
];
type GardenCorrectionFieldType =
    | "datetime"
    | "number"
    | "select"
    | "text"
    | "url";
interface GardenCorrectionMissing extends GardenCorrectionOperationIdentity {
    status: "missing";
}
type GardenCorrectionOperation =
    GardenCorrectionAttempted | GardenCorrectionRejected;
interface GardenCorrectionOperationIdentity {
    observationId: string;
    operationDigest: string;
    payloadDigest: string;
    requestId: string;
}
interface GardenCorrectionOriginal extends GardenCorrectionRowSnapshot {
    values: GardenCorrectionCanonicalRow;
}
interface GardenCorrectionPayload {
    action?:
        | "edit"
        | "move"
        | "remove";
    baseRevision: string;
    changes: GardenCorrectionChanges;
    destinationPlantId?: string;
    observationId: string;
    payloadDigest: string;
    reason: string;
}
interface GardenCorrectionPreview extends GardenCorrectionContext {
    differences: {
        after: GardenCorrectionScalar | undefined;
        before: GardenCorrectionScalar | undefined;
        key: string;
        label: string;
    }[];
    payloadDigest: string;
    previewToken: string;
    replacement: GardenCorrectionEntry;
}
type GardenCorrectionRecordStatus =
    | ""
    | "Active"
    | "Removed";
interface GardenCorrectionRejected extends GardenCorrectionOperationIdentity {
    code: GardenCorrectionRejectionCode;
    message: string;
    status: "rejected";
}
type GardenCorrectionRejectionCode =
    | "HISTORY_CAPACITY"
    | "HISTORY_SCHEMA"
    | "INVALID_CORRECTION"
    | "NOT_FOUND"
    | "REMOVED_ORIGINAL"
    | "SETUP_BOUNDARY"
    | "STALE_PREVIEW";
type GardenCorrectionRequestKey =
    | "action"
    | "baseRevision"
    | "changes"
    | "destinationPlantId"
    | "observationId"
    | "previewToken"
    | "reason"
    | "requestId";
type GardenCorrectionRowFields = [
    plantId: string,
    event: GardenCorrectionEvent,
    weightState: string,
    weight: GardenOptionalNumber,
    heightCm: GardenOptionalNumber,
    widthCm: GardenOptionalNumber,
    condition: string,
    notes: string,
    recorded: "" | Date,
    potSetup: GardenOptionalNumber,
    label: string,
    plantFormula: GardenCell,
    anchorFormula: GardenCell,
    daysFormula: GardenCell,
    requestId: string,
    nutrientsUsed: string,
    nutrientProduct: string,
    nutrientAmount: string,
    previousPotSize: string,
    potSize: string,
    flowerCount: GardenOptionalNumber,
    flowerDetails: string,
    photoUrl: string,
    pestIssue: string,
    pestTreatment: string,
    observationId: string,
    entrySource: string,
    measurementQuality: string,
    saveGroupId: string,
    correctsObservationId: string,
    correctionReason: string,
    soilMoisture: string,
    medium: string,
    measurementMethod: string,
    recordStatus: GardenCorrectionRecordStatus,
    measurementUnit: string,
    heightFormula: GardenCell,
    widthFormula: GardenCell,
    rotationDegrees: GardenOptionalNumber,
    wateringApplication: string,
    waterAmount: GardenOptionalNumber,
    relativeHumidity: GardenOptionalNumber,
    ppfd: GardenOptionalNumber,
    lux: GardenOptionalNumber,
    mistTargets: string,
    mistAmountMl: GardenOptionalNumber,
    mistDetails: string,
    moveFrom: string,
    moveTo: string,
    temperatureC: GardenOptionalNumber,
    temperatureTarget: string,
    temperatureUnit: string,
    environmentAspect: string,
    environmentFrom: string,
    environmentTo: string,
    propagationMethod: string,
    propagationDetails: string,
    supportAction: string,
    supportDetails: string,
    leafTemperatureC: GardenOptionalNumber,
    leafTemperatureUnit: string,
    leafAirTemperatureC: GardenOptionalNumber,
    leafAirTemperatureUnit: string,
    leafHumidity: GardenOptionalNumber,
    leafVpd: GardenOptionalNumber,
    leafVpdSource: string,
];
interface GardenCorrectionRowSnapshot {
    formulas: string[];
    rowNumber: number;
    values: GardenHistoryRow;
}
interface GardenCorrectionSaved extends GardenCorrectionOperationIdentity {
    originalObservationId: string;
    replacementObservationId: string;
    status: "saved";
}
interface GardenCorrectionSavePayload extends GardenCorrectionPayload {
    operationDigest: string;
    previewToken: string;
    requestId: string;
}
/** Production correction RPC values after boundary validation. */
type GardenCorrectionScalar = number | string;
type GardenCorrectionSheetsRequest = GoogleAppsScript.Sheets.Schema.Request;
interface GardenCorrectionSnapshot {
    history: GardenSheet;
    lastReservedRow: number;
    rows: GardenCorrectionRowSnapshot[];
    spreadsheet: GardenSpreadsheet;
    timeZone: string;
}
type GardenCorrectionValidationError = Error & {
    correctionValidationCode: GardenCorrectionRejectionCode;
};
