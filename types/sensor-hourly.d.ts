export interface SensorChannelSummary {
    humidity: SensorMetricSummary;
    temperatureC: SensorMetricSummary;
    vpd: SensorMetricSummary;
}

/** One physical sensor's fixed UTC hour, including partial observed hours. */
export interface SensorHourSummary {
    builtIn: SensorChannelSummary;
    firstObservedAt: string;
    hourEndUtc: string;
    hourStartUtc: string;
    key: string;
    lastObservedAt: string;
    probe: SensorChannelSummary;
    sampleCount: number;
    sensorId: string;
}

/** Statistics from nonmissing raw samples; no source values are rounded. */
export interface SensorMetricSummary {
    count: number;
    max: null | number;
    mean: null | number;
    min: null | number;
}
