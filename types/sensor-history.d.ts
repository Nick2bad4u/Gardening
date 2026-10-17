import type { SensorHourSummary } from "./sensor-hourly.js";

/** Private local archive manifest; paths are relative to its containing folder. */
export interface SensorHistoryManifest {
    schemaVersion: 1;
    sources: SensorHistorySource[];
}

/**
 * Verified raw-file provenance and summaries rebuilt from deduplicated
 * readings.
 */
export interface SensorHistoryPreparation {
    counts: {
        duplicateRows: number;
        hourlyRows: number;
        populatedRows: number;
        sourceFiles: number;
        uniqueReadings: number;
    };
    hours: SensorHourSummary[];
    schemaVersion: 1;
    sensors: { sensorId: string; timeZone: string }[];
    sources: SensorHistoryReceipt[];
}

export interface SensorHistoryReceipt {
    fileName: string;
    populatedRows: number;
    sensorId: string;
    sha256: string;
    skippedEmptyRows: number;
    sourceUrl: null | string;
    timeZone: string;
}

export interface SensorHistorySource {
    csvPath: string;
    sensorId: string;
    sha256: string;
    sourceUrl?: string;
    timeZone: string;
}
