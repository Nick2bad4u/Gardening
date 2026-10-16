import { readFile } from "node:fs/promises";

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
    "Support",
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
    Support: { supportAction: "Adjust", supportDetails: "Loosened tie" },
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
const plants = Array.from({ length: 36 }, (_, index) => ({
    currentLocation: "Upper shelf",
    currentPotSize:
        index === 35
            ? "Glass jar with cork lid; seller-listed 6.3 × 3.9 in (16 × 10 cm); dimension orientation unverified"
            : "4 in",
    daysSinceWater: 4,
    dryOrLowestWeight: index === 35 ? "" : 390,
    dryOrLowestWeightDate: "Sep 1, 2026",
    fieldGuideUrl: "https://example.test/guide#parodia-leninghausii",
    historyUrl: "https://example.test/history",
    id: `P${String(index + (index < 32 ? 1 : 3)).padStart(2, "0")}`,
    label:
        index < 24
            ? String.fromCodePoint(65 + Math.floor(index / 4)) +
              String((index % 4) + 1)
            : `#${String(index - 23)}`,
    lastWatered: "Sep 5, 2026",
    latestWeight: 430,
    latestWeightAt: "2026-09-09T14:00:00Z",
    name:
        index === 35
            ? "Mixed tropical terrarium"
            : (namedPlants[`P${String(index + 1).padStart(2, "0")}`] ??
              `Collection plant ${index + 1}`),
    potSetup: 1,
    scientificName:
        index === 35
            ? "Probable Fittonia albivenis + Hypoestes phyllostachya; tentative Pilea cf. depressa; fern-like foliage and moss unidentified"
            : "Parodia leninghausii",
    ...(index === 35 && {
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

/** Build the actual logger with a deterministic, entirely local service bridge. */
export function loggerBrowserFixture() {
    const bridge = `<script>
        const fixtureBootstrap = ${JSON.stringify(bootstrap)};
        localStorage.setItem("gardenLoggerObservationQueueV1", JSON.stringify(
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
                getRecentWebObservations() { success(fixtureBootstrap.recent); },
                saveWebObservation() { failure({ message: "Fixture writes are disabled." }); },
                saveWebObservationBatch() { failure({ message: "Fixture writes are disabled." }); },
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
