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
    flowerCount?: unknown;
    flowerDetails?: unknown;
    nutrientAmount?: unknown;
    nutrientProduct?: unknown;
    nutrientsUsed?: unknown;
    pestIssue?: unknown;
    pestTreatment?: unknown;
    photoUrl?: unknown;
    potSize?: unknown;
    rotationDegrees?: unknown;
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
    flowerCount?: GardenOptionalNumber;
    flowerDetails?: string;
    nutrientAmount?: string;
    nutrientProduct?: string;
    nutrientsUsed?: string;
    pestIssue?: string;
    pestTreatment?: string;
    photoUrl?: string;
    potSize?: string;
    previousPotSize?: string;
    rotationDegrees?: GardenOptionalNumber;
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
