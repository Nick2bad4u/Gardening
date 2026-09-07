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

interface GardenDryDownModel {
    basis: string;
    count: number;
    date: GardenOptionalNumber;
    dry: GardenOptionalNumber;
    early: GardenOptionalNumber;
    fit: GardenOptionalNumber;
    late: GardenOptionalNumber;
    learned: number;
    loss: GardenOptionalNumber;
    readiness: string;
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

interface GardenWateringRecommendation {
    date: GardenOptionalNumber;
    guidance: string;
}
