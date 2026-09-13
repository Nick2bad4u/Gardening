interface DryDownRecord {
    application: string;
    date: number;
    estimated: boolean;
    event: string;
    index: number;
    save: string;
    setup: number;
    weight: number;
}

interface GardenDryDownCurve {
    count: number;
    decay: number;
    error: number;
    fit: number;
    gain: boolean;
    span: number;
}

interface GardenDryDownCycle {
    beforeDry: DryDownRecord | undefined;
    dry: DryDownRecord | null;
    next: DryDownRecord | undefined;
    points: DryDownRecord[];
    water: DryDownRecord;
    wet: DryDownRecord | undefined;
}

interface GardenDryDownForecastAnchors {
    currentDate: number;
    dry: number;
    latest: DryDownRecord;
}

interface GardenDryDownModel {
    basis: string;
    count: number;
    date: GardenOptionalNumber;
    dry: GardenOptionalNumber;
    early: GardenOptionalNumber;
    fit: GardenOptionalNumber;
    inspection: string;
    late: GardenOptionalNumber;
    learned: number;
    loss: GardenOptionalNumber;
    readiness: string;
    recent: GardenRecentWeightMetrics;
    review: string;
    setup: number;
    wet: GardenOptionalNumber;
}

type GardenDryDownRow = [
    plantId: string,
    setup: number,
    dry: GardenOptionalNumber,
    wet: GardenOptionalNumber,
    count: number,
    learned: number,
    loss: GardenOptionalNumber,
    date: GardenOptionalNumber,
    early: GardenOptionalNumber,
    late: GardenOptionalNumber,
    basis: string,
    readiness: string,
    review: string,
    fit: GardenOptionalNumber,
    waterDate: GardenOptionalNumber,
    waterGuidance: string,
    ...recent: GardenRecentWeightMetrics,
    inspection: string,
];

interface GardenDryDownSummary {
    basis: string;
    waterDate: string;
    waterGuidance: string;
    window: string;
}

interface GardenLearnedDryDownCurve extends GardenDryDownCurve {
    ended: number;
}

type GardenRecentWeightMetrics = [
    lastChange: GardenOptionalNumber,
    lastLossPerDay: GardenOptionalNumber,
    meanWeight: GardenOptionalNumber,
    meanChange: GardenOptionalNumber,
    recentLossPerDay: GardenOptionalNumber,
];

interface GardenWateringRecommendation {
    date: GardenOptionalNumber;
    guidance: string;
}
