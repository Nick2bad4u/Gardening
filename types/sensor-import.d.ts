export interface SensorImportPlan {
    additions: SensorReading[];
    conflicts: {
        existing: SensorReading[];
        incoming: SensorReading[];
        key: string;
    }[];
    duplicates: {
        existing: SensorReading;
        incoming: SensorReading;
        key: string;
    }[];
}

/**
 * Original sensor values and their normalized temperature. Missing values
 * remain null.
 */
export interface SensorMetrics {
    humidity: null | number;
    temperature: null | number;
    temperatureC: null | number;
    temperatureUnit: "C" | "F";
    vpd: null | number;
}

export interface SensorParseOptions {
    sensorId: string;
    timeZone: string;
}

export interface SensorParseResult {
    format: "aerolab-csv";
    issues: { message: string; row: number }[];
    readings: SensorReading[];
    skippedEmptyRows: number;
    sourceHeaders: string[];
}

/**
 * One wide observation; identity excludes location, filename and measured
 * values.
 */
export interface SensorReading {
    builtIn: SensorMetrics;
    key: string;
    observedAt: string;
    probe: SensorMetrics;
    rawTimestamp: string;
    sensorId: string;
    sourceRow: number;
    timeZone: string;
}
