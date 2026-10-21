/** Required shape produced by the analytics CellData serialization oracle. */
type GardenAnalyticsCellsRequest = Omit<
    GardenCorrectionSheetsRequest,
    "updateCells"
> & {
    updateCells: {
        fields: string;
        range: GoogleAppsScript.Sheets.Schema.GridRange;
        rows: { values: GardenCorrectionCellData[] }[];
    };
};

/** Validated range coordinates for the analytics History reader. */
type GardenAnalyticsHistoryBlock = readonly [
    firstColumn: string,
    lastColumn: string,
    column: number,
    width: number,
];

type GardenAnalyticsPrimitive =
    | boolean
    | number
    | string;

interface GardenCorrectionLineage {
    active: boolean;
    corrects: string;
    event: string;
    id: string;
    index: number;
    plant: string;
    setup: number;
}

interface GardenEventDetailPayload {
    environmentAspect?: unknown;
    environmentFrom?: unknown;
    environmentTo?: unknown;
    flowerCount?: unknown;
    flowerDetails?: unknown;
    leafAirTemperature?: unknown;
    leafAirTemperatureUnit?: unknown;
    leafHumidity?: unknown;
    leafTemperature?: unknown;
    leafTemperatureUnit?: unknown;
    leafVpd?: unknown;
    leafVpdSource?: unknown;
    lux?: unknown;
    mistAmountMl?: unknown;
    mistDetails?: unknown;
    mistTargets?: unknown;
    moveFrom?: unknown;
    moveTo?: unknown;
    nutrientAmount?: unknown;
    nutrientProduct?: unknown;
    nutrientsUsed?: unknown;
    pestIssue?: unknown;
    pestTreatment?: unknown;
    photoUrl?: unknown;
    potSize?: unknown;
    ppfd?: unknown;
    propagationDetails?: unknown;
    propagationMethod?: unknown;
    relativeHumidity?: unknown;
    rotationDegrees?: unknown;
    supportAction?: unknown;
    supportDetails?: unknown;
    temperature?: unknown;
    temperatureC?: unknown;
    temperatureTarget?: unknown;
    temperatureUnit?: unknown;
    waterAmount?: unknown;
    wateringApplication?: unknown;
}

interface GardenHistoryOrder {
    orderIndex?: number | undefined;
    rowIndex: number;
    timestamp: number;
}

interface GardenHistorySaveIdentity {
    observedAt: GardenCell;
    saveGroup: string;
    timestamp: number;
}

interface GardenObservationDetails {
    environmentAspect?: string;
    environmentFrom?: string;
    environmentTo?: string;
    flowerCount?: GardenOptionalNumber;
    flowerDetails?: string;
    leafAirTemperatureC?: GardenOptionalNumber;
    leafAirTemperatureUnit?: string;
    leafHumidity?: GardenOptionalNumber;
    leafTemperatureC?: GardenOptionalNumber;
    leafTemperatureUnit?: string;
    leafVpd?: GardenOptionalNumber;
    leafVpdSource?: string;
    lux?: GardenOptionalNumber;
    mistAmountMl?: GardenOptionalNumber;
    mistDetails?: string;
    mistTargets?: string;
    moveFrom?: string;
    moveTo?: string;
    nutrientAmount?: string;
    nutrientProduct?: string;
    nutrientsUsed?: string;
    pestIssue?: string;
    pestTreatment?: string;
    photoUrl?: string;
    potSize?: string;
    ppfd?: GardenOptionalNumber;
    previousPotSize?: string;
    propagationDetails?: string;
    propagationMethod?: string;
    relativeHumidity?: GardenOptionalNumber;
    rotationDegrees?: GardenOptionalNumber;
    supportAction?: string;
    supportDetails?: string;
    temperatureC?: GardenOptionalNumber;
    temperatureTarget?: string;
    temperatureUnit?: string;
    waterAmount?: GardenOptionalNumber;
    wateringApplication?: string;
}

interface GardenPlantData {
    currentPotSize: string;
    fieldGuideUrl: string;
    id: string;
    label: string;
    name: string;
    potSetup: number;
    scientificName: string;
}

interface GardenPreviousDry {
    basis: string;
    observedAt: GardenCell;
    weight: number;
}

interface GardenStoredObservationInput {
    condition: string;
    correctedObservationId?: string;
    correctionReason?: string;
    currentLabel: string;
    details?: GardenObservationDetails;
    entrySource?: string;
    eventNames: string[];
    height: GardenOptionalNumber;
    measurementMethod?: string;
    measurementQuality?: string;
    measurementUnit?: string;
    medium?: string;
    notes: string;
    observationDate: Date;
    plantId: string;
    potSetup: number;
    requestId: string;
    soilMoisture?: string;
    weight: GardenOptionalNumber;
    weightState: string;
    width: GardenOptionalNumber;
}

interface GardenWaterRecord
    extends GardenHistoryOrder, GardenHistorySaveIdentity {
    plantId: string;
    potSetup: number;
}

interface GardenWebEnvironmentReadModel {
    latestAirTemperature: GardenOptionalNumber;
    latestAirTemperatureAt: string;
    latestLightAt: string;
    latestLux: GardenOptionalNumber;
    latestLuxAt: string;
    latestPpfd: GardenOptionalNumber;
    latestPpfdAt: string;
    latestRelativeHumidity: GardenOptionalNumber;
    latestRelativeHumidityAt: string;
    latestSoilTemperature: GardenOptionalNumber;
    latestSoilTemperatureAt: string;
}

type GardenWebHistoryDetails = Record<
    string,
    | boolean
    | number
    | string
>;

interface GardenWebWeightRecord
    extends GardenHistoryOrder, GardenHistorySaveIdentity {
    active: boolean;
    event: string;
    measured: boolean;
    potSetup: number;
    row: GardenHistoryRow;
    superseded: boolean;
}

interface GardenWeightPoint {
    breakBefore: boolean;
    observationId: string;
    observedAt: string;
    weight: number;
}

interface GardenWeightRecord extends GardenWaterRecord {
    weight: number;
}
