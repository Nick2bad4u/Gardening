import { readFile } from "node:fs/promises";

import { getContainers } from "../../site/lib/containers.mjs";

const source = await readFile("scripts/google-sheets/Index.html", "utf8");

const events = [
    "Water",
    "Weigh",
    "Mist",
    "Humidity",
    "Temperature",
    "Light",
    "Check",
    "Inspect",
    "Measure",
    "Rotation",
    "Move",
    "Environment",
    "Clean",
    "Prune",
    "Leaf VPD",
    "Repot",
    "Propagate",
    "Flower",
    "Photo",
    "Pest",
    "Other",
];
/** @type {Record<string, Record<string, string | number>>} */
const eventDetails = {
    Environment: {
        environmentAspect: "Airflow",
        environmentFrom: "Low",
        environmentTo: "Medium",
    },
    Humidity: { relativeHumidity: 76 },
    "Leaf VPD": {
        leafAirTemperatureC: 25,
        leafAirTemperatureUnit: "C",
        leafHumidity: 50,
        leafTemperatureC: 22,
        leafTemperatureUnit: "C",
        leafVpd: 1.0597,
        leafVpdSource: "Calculated",
    },
    Mist: {
        mistAmountMl: 5,
        mistDetails: "Measured spray",
        mistTargets: "Leaves, Exposed roots",
    },
    Move: { moveFrom: "Lower shelf", moveTo: "Upper shelf" },
    Propagate: {
        propagationDetails: "One rooted offset",
        propagationMethod: "Offset",
    },
    Temperature: {
        temperatureC: 0,
        temperatureTarget: "Air",
        temperatureUnit: "C",
    },
};
/** @type {Record<string, string>} */
const namedPlants = {
    P05: "Old Man of the Andes",
    P06: "Eastern prickly pear cactus",
};
// Only permanent identities come from maintained local content. Observations,
// names and service responses remain synthetic; this never reads Google Sheets.
const containers = await getContainers();
const plants = containers.map(({ id, label }, index) => ({
    currentLocation: "Upper shelf",
    currentPotSize:
        id === "P38"
            ? "Glass jar with cork lid; seller-listed 6.3 × 3.9 in (16 × 10 cm); dimension orientation unverified"
            : "4 in",
    daysSinceWater: 4,
    dryOrLowestWeight: id === "P38" ? "" : 390,
    dryOrLowestWeightDate: "Sep 1, 2026",
    fieldGuideUrl: "https://example.test/guide#parodia-leninghausii",
    historyUrl: "https://example.test/history",
    id,
    label,
    lastWatered: "Sep 5, 2026",
    latestWeight: 430,
    latestWeightAt: "2026-09-09T14:00:00Z",
    name:
        id === "P38"
            ? "Mixed tropical terrarium"
            : (namedPlants[id] ?? `Collection plant ${index + 1}`),
    potSetup: 1,
    scientificName:
        id === "P38"
            ? "Probable Fittonia albivenis + Hypoestes phyllostachya; tentative Pilea cf. depressa; fern-like foliage and moss unidentified"
            : "Parodia leninghausii",
    ...(id === "P38" && {
        latestAirTemperature: 0,
        latestAirTemperatureAt: "2026-09-09T13:00:00Z",
        latestLux: 450,
        latestLuxAt: "2026-09-09T13:00:00Z",
        latestPpfd: 0,
        latestPpfdAt: "2026-09-08T13:00:00Z",
        latestRelativeHumidity: 76,
        latestRelativeHumidityAt: "2026-09-09T13:00:00Z",
        latestSoilTemperature: -5,
        latestSoilTemperatureAt: "2026-09-08T13:00:00Z",
    }),
}));
const bootstrap = {
    dayKey: "2026-09-09",
    dayStartHour: 4,
    events,
    historyCapacity: {
        remainingRows: 49_500,
        supportedLastRow: 50_001,
        supportedObservationRows: 50_000,
        usedRows: 500,
    },
    links: Object.fromEntries(
        [
            "calendar",
            "fieldGuide",
            "layout",
            "photos",
            "quickLog",
            "spreadsheet",
            "tracker",
        ].map((name) => [name, `https://example.test/${name}`])
    ),
    plants,
    recent: events.map((event, index) => ({
        details: {
            notes: "Synthetic browser fixture; no live observation.",
            ...eventDetails[event],
        },
        event,
        name: "Collection plant 1",
        observationId: `fixture-${index}`,
        observedAt: "Sep 9, 2026, 10:00 AM",
        observedAtIso: "2026-09-09T14:00:00Z",
        plantId: "P01",
        weight: event === "Weigh" ? 430 : "",
    })),
    serverTime: "2026-09-09T14:00:00Z",
    timeZone: "America/New_York",
    version: "browser-fixture",
    weighedTodayPlantIds: ["P05", "P38"],
};

/**
 * Build the actual logger with a deterministic, entirely local service bridge.
 *
 * @param {{ preserveQueue?: boolean; holdBatch?: boolean }} [options]
 */
export function loggerBrowserFixture({
    holdBatch = false,
    preserveQueue = false,
} = {}) {
    const bridge = `<script>
        const fixtureBootstrap = ${JSON.stringify(bootstrap)};
        if (!${String(preserveQueue)} || !localStorage.getItem("gardenLoggerObservationQueueV1")) localStorage.setItem("gardenLoggerObservationQueueV1", JSON.stringify(
            ["P06", "P38"].map((plantId) => ({
                addedAt: "2026-09-09T14:00:00Z",
                payload: {
                    events: ["Weigh"],
                    observedAt: "2026-09-09T14:00:00Z",
                    plantId,
                    potSetup: "1",
                    weight: "430"
                },
                requestId: "browser-fixture-queue-" + plantId
            }))
        ));
        window.google = { script: { get run() {
            let success = () => {};
            let failure = () => {};
            const chain = {
                withSuccessHandler(callback) { success = callback; return chain; },
                withFailureHandler(callback) { failure = callback; return chain; },
                getWebAppBootstrap() { success(fixtureBootstrap); },
                recalculateGardenWorkbook() {
                    document.documentElement.dataset.fixtureRecalculations = String(Number(document.documentElement.dataset.fixtureRecalculations || "0") + 1);
                    window.addEventListener("fixture-confirm-recalculation", (event) => {
                        if (event.detail === "network") failure({message: "Connection lost"});
                        else success(event.detail);
                    }, {once: true});
                },
                getRecentWebObservations() { success(fixtureBootstrap.recent); },
                saveWebObservation() { failure({ message: "Fixture writes are disabled." }); },
                saveWebObservationBatch(requests) {
                    if (!${String(holdBatch)}) { failure({ message: "Fixture writes are disabled." }); return; }
                    document.documentElement.dataset.fixtureBatch = String(Number(document.documentElement.dataset.fixtureBatch || "0") + 1);
                    window.addEventListener("fixture-confirm-batch", () => success({ results: requests.map((request) => ({ok: true, requestId: request.requestId})) }), {once: true});
                },
                getWebBatchSaveStatus(requests) { success(requests.map((request) => ({requestId: typeof request === "string" ? request : request.requestId, state: "missing"}))); },
                saveBulkCareObservation() { failure({ message: "Fixture writes are disabled." }); }
            };
            return chain;
        } } };
    </script>`;
    return source.replace(
        "<head>",
        () =>
            `<head><meta name="viewport" content="width=device-width, initial-scale=1" />${bridge}`
    );
}
