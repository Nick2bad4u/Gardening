interface GardenDailyCareBounds {
    baseline: number;
    history: number;
    integrity: number;
    model: number;
    tracker: number;
}

interface GardenDailyCareDestination {
    daily: GardenSheet | null;
    marker: string;
    protection: GoogleAppsScript.Spreadsheet.Protection | undefined;
}

interface GardenDailyCarePlant {
    id: string;
    name: string;
    pageId: number;
}

interface GardenDailyCareSources {
    baselines: GardenSheet;
    bounds: GardenDailyCareBounds;
    dashboard: GardenSheet;
    errorFormula: string;
    integrity: GardenSheet;
    plants: GardenDailyCarePlant[];
    tracker: GardenSheet;
}

type GardenDailyCareStatus = "Action" | "Fail";

type GardenWorkbookViewPlant = GardenWorkbookPlant;
