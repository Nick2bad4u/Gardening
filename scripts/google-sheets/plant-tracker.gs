/**
 * Bound Google Apps Script for the Garden Plant Tracker workbook.
 *
 * The mobile web app and Quick log tab are input surfaces. Each save archives
 * one or more event-specific rows in History without overwriting older data.
 */

const GARDEN_LOGGER = Object.freeze({
    version: "5.14.6",
    spreadsheetId: "1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0",
    quickLogSheet: "Quick log",
    historySheet: "History",
    plantTrackerSheet: "Plant tracker",
    baselinesSheet: "Baselines",
    appSheetEntriesSheet: "App entries",
    appSheetBulkSheet: "App bulk",
    headerRow: 4,
    bulkControlRow: 3,
    firstInputRow: 5,
    saveColumn: 3,
    dateColumn: 4,
    firstEntryColumn: 5,
    lastEntryColumn: 13,
    bulkEventColumn: 2,
    eventColumn: 5,
    weightStateColumn: 6,
    weightColumn: 7,
    heightColumn: 8,
    widthColumn: 9,
    measurementUnitColumn: 13,
    fieldGuideColumn: 14,
    currentLabelColumn: 15,
    currentPotSizeHeader: "Current pot size",
    historyColumns: 12,
    historyWeightStateColumn: 4,
    historyWeightColumn: 5,
    historyHelperStartColumn: 13,
    historyHelperColumns: 3,
    requestIdColumn: 16,
    requestIdHeader: "Request ID",
    historyDetailStartColumn: 17,
    historyDetailColumns: 10,
    historyProvenanceStartColumn: 27,
    historyProvenanceColumns: 10,
    historyMeasurementStartColumn: 37,
    historyMeasurementColumns: 3,
    historyRotationStartColumn: 40,
    historyRotationColumns: 1,
    historyStoredColumns: 40,
    historyCapacityRows: 5000,
    lockTimeoutMs: 5000,
    spreadsheetUrl:
        "https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit",
    quickLogUrl:
        "https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit?gid=2015971861#gid=2015971861",
    fieldGuideUrl: "https://nick2bad4u.github.io/Gardening/",
    trackerUrl:
        "https://nick2bad4u.github.io/Gardening/layouts/plant-tracker.html",
    historyUrl:
        "https://nick2bad4u.github.io/Gardening/layouts/plant-history.html",
    layoutUrl:
        "https://nick2bad4u.github.io/Gardening/layouts/grow-spot-layout.html",
    calendarUrl:
        "https://nick2bad4u.github.io/Gardening/layouts/indoor-acclimation-calendar.html",
    photosUrl:
        "https://nick2bad4u.github.io/Gardening/layouts/photo-album.html",
    faviconUrl: "https://i.gyazo.com/0fdb0739ffe391ade24deb6df2973a21.png",
});

const WEB_PLANT_IMAGE_URLS = Object.freeze({
    P01: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/d74483025d55eaa5a8f242b1088e63dd.jpg",
    }),
    P02: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/cf2f02119e769c5db8aef2eaaa1ecdcc.jpg",
    }),
    P03: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/16784f3bec421b84f050e72c5c8a5dae.jpg",
    }),
    P04: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/ac11466d734bfa7b406ccbd7a58057d2.jpg",
    }),
    P05: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/8d647c4e8a0306c3ec77b18fda570c7c.jpg",
    }),
    P06: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/69be73cfc39fb5819c5355e91e6402cc.jpg",
    }),
    P07: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/ce880313d0ff83b3587003c536de218a.jpg",
    }),
    P08: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/f7e1a9d53922fa92d6bf662904da0d0a.jpg",
    }),
    P09: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/c35899fe81d1be02512a3d5bdea813a3.jpg",
    }),
    P10: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/eb94b52eeafac12ce869a661fcdb3f1e.jpg",
    }),
    P11: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/51f68e4e6d970ef775550c77754c9b5d.jpg",
    }),
    P12: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/de10da31ae4d98c089486a6ef0aefbf9.jpg",
    }),
    P13: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/244b18ddb7bf6beb7942ab94ef492227.jpg",
    }),
    P14: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/018a854ff35307af4511f0333677472c.jpg",
    }),
    P15: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/1a79f72e567fd569a019855e319dd841.jpg",
    }),
    P16: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/d4a58b8c2c7fadabc2667f9d60e1906c.jpg",
    }),
    P17: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/0382998ccef80e8e35e67cd146aed6a1.jpg",
    }),
    P18: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/ebea036fd6fa53fe1ec4fe0bf45ce2e5.jpg",
    }),
    P19: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/c5553b1972af905d097020742a883ce0.jpg",
    }),
    P20: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/7954fb6f93fc71827ac45cd854eeb25a.jpg",
    }),
    P21: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/6fdda39d86f77b957ef59ffae9e8503d.jpg",
    }),
    P22: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/b193fbdcef1169d6175c324dec12c0f1.jpg",
    }),
    P23: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/387921a6f4930d7051201ed54fb9339d.jpg",
        nurseryLabelImageUrl:
            "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-08-29-p23-paper-spine-label.webp",
    }),
    P24: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/8cb990678c4ca9fd73e5953240b88487.jpg",
        nurseryLabelImageUrl:
            "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-08-29-p24-coconut-crystal-label.webp",
    }),
    P25: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/19eeb627281c6ea948a362374a27204d.jpg",
        nurseryLabelImageUrl:
            "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-08-29-p25-raindrops-label.webp",
    }),
    P26: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/a6a4ab586c57518f3fa5d785dcdb279b.jpg",
        nurseryLabelImageUrl:
            "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-08-29-p26-eves-needle-label.webp",
    }),
    P27: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/d0e5da659c8ad07efa7f1410a4be62ec.jpg",
        nurseryLabelImageUrl:
            "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-08-29-p27-black-widow-label.webp",
    }),
    P28: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/2f26321ee8048f4b88f28545beff1fc2.jpg",
        nurseryLabelImageUrl:
            "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-08-29-p28-royal-flush-label.webp",
    }),
});

const WEB_EVENT_OPTIONS = Object.freeze([
    "Water",
    "Weigh",
    "Measure",
    "Check",
    "Rotation",
    "Clean",
    "Prune",
    "Repot",
    "Flower",
    "Photo",
    "Pest",
    "Other",
]);

const BULK_WEB_EVENT_OPTIONS = Object.freeze([
    "Water",
    "Check",
    "Rotation",
    "Clean",
    "Prune",
    "Pest",
    "Other",
]);

const WEIGHT_STATE_OPTIONS = Object.freeze(["Dry", "Wet", "Routine"]);
const RECENT_LIMIT_OPTIONS = Object.freeze([10, 25, 50, 100]);

const QUICK_LOG_HEADERS = Object.freeze([
    "Plant ID",
    "Plant / current label",
    "Save",
    "Started at",
    "Event",
    "Weight state",
    "Weight (g)",
    "Height",
    "Width",
    "Plant condition",
    "Notes",
    "Pot setup",
    "Measurement unit",
]);

const HISTORY_HEADERS = Object.freeze([
    "Date",
    "Plant ID",
    "Event",
    "Weight state",
    "Weight (g)",
    "Height (cm)",
    "Width (cm)",
    "Plant condition",
    "Notes",
    "Recorded",
    "Pot setup",
    "Pot label at entry",
]);

const HISTORY_DETAIL_HEADERS = Object.freeze([
    "Nutrients used",
    "Nutrient product",
    "Nutrient amount",
    "Previous pot size",
    "Pot size",
    "Flower count",
    "Flower details",
    "Photo URL",
    "Pest / issue",
    "Treatment / action",
]);

const HISTORY_PROVENANCE_HEADERS = Object.freeze([
    "Observation ID",
    "Entry source",
    "Observation quality",
    "Save group / batch ID",
    "Corrects observation ID",
    "Correction reason",
    "Soil moisture",
    "Medium / substrate",
    "Measurement method",
    "Record status",
]);

const HISTORY_MEASUREMENT_HEADERS = Object.freeze([
    "Measurement unit",
    "Height (in)",
    "Width (in)",
]);

const HISTORY_ROTATION_HEADERS = Object.freeze(["Rotation (°)"]);

const APP_SHEET_ENTRY_LEGACY_HEADERS = Object.freeze([
    "Entry ID",
    "Started at",
    "Plant ID",
    "Events",
    "Weight state",
    "Weight (g)",
    "Height",
    "Width",
    "Measurement unit",
    "Plant condition",
    "Soil moisture",
    "Notes",
    "Nutrients used",
    "Nutrient product",
    "Nutrient amount",
    "Pot size",
    "Medium / substrate",
    "Measurement quality",
    "Measurement method",
    "Flower count",
    "Flower details",
    "Photo URL",
    "Pest / issue",
    "Treatment / action",
    "Created by",
    "Created at",
    "Status",
    "Status message",
    "Request ID",
    "History rows",
    "Saved at",
]);
const APP_SHEET_ENTRY_HEADERS = Object.freeze([
    ...APP_SHEET_ENTRY_LEGACY_HEADERS,
    "Rotation (°)",
]);
const APP_SHEET_QUEUE_STATUSES = Object.freeze(["Queued", "Retry"]);
const APP_SHEET_QUEUE_LIMIT = 50;

const APP_SHEET_BULK_V512_PLANTS = Object.freeze([
    "P01",
    "P02",
    "P03",
    "P04",
    "P05",
    "P06",
    "P07",
    "P08",
    "P09",
    "P10",
    "P11",
    "P12",
    "P13",
    "P14",
    "P15",
    "P16",
    "P17",
    "P18",
    "P19",
    "P20",
    "P21",
    "P22",
]);

const APP_SHEET_BULK_PLANTS = Object.freeze([
    ...APP_SHEET_BULK_V512_PLANTS,
    "P23",
    "P24",
    "P25",
    "P26",
    "P27",
    "P28",
]);

const APP_SHEET_BULK_LEGACY_HEADERS = Object.freeze([
    "Round ID",
    "Started at",
    "Observed at",
    "Weight state",
    ...APP_SHEET_BULK_V512_PLANTS.map((plantId) => `${plantId} weight (g)`),
    "Notes",
    "Created by",
    "Created at",
    "Status",
    "Status message",
    "Request count",
    "Saved count",
    "Saved at",
]);

const APP_SHEET_BULK_ACTION_OPTIONS = Object.freeze([
    "Water",
    "Weigh",
    "Water + weigh",
    "Rotation",
    "Check",
    "Clean",
    "Prune",
    "Pest",
    "Other",
]);

const APP_SHEET_BULK_V511_HEADERS = Object.freeze([
    "Round ID",
    "Started at",
    "Observed at",
    "Round action",
    "Watered plants",
    "Weight state",
    ...APP_SHEET_BULK_V512_PLANTS.map((plantId) => `${plantId} weight (g)`),
    "Notes",
    "Created by",
    "Created at",
    "Status",
    "Status message",
    "Request count",
    "Saved count",
    "Saved at",
]);

const APP_SHEET_BULK_V512_HEADERS = Object.freeze([
    ...APP_SHEET_BULK_V511_HEADERS.slice(0, 4),
    "Selected plants",
    ...APP_SHEET_BULK_V511_HEADERS.slice(5),
    "Rotation (°)",
    "Plant condition",
    "Soil moisture",
    "Pest / issue",
    "Treatment / action",
    "Nutrients used",
    "Nutrient product",
    "Nutrient amount",
]);

const APP_SHEET_BULK_HEADERS = Object.freeze([
    ...APP_SHEET_BULK_V512_HEADERS.slice(0, 6),
    ...APP_SHEET_BULK_PLANTS.map((plantId) => `${plantId} weight (g)`),
    ...APP_SHEET_BULK_V512_HEADERS.slice(6 + APP_SHEET_BULK_V512_PLANTS.length),
]);

const APP_SHEET_BULK_ACTION_INDEX = 3;
const APP_SHEET_BULK_SELECTED_PLANTS_INDEX = 4;
const APP_SHEET_BULK_WEIGHT_STATE_INDEX = 5;
const APP_SHEET_BULK_WEIGHT_START_INDEX = 6;
const APP_SHEET_BULK_NOTES_INDEX =
    APP_SHEET_BULK_WEIGHT_START_INDEX + APP_SHEET_BULK_PLANTS.length;
const APP_SHEET_BULK_STATUS_INDEX = APP_SHEET_BULK_NOTES_INDEX + 3;
const APP_SHEET_BULK_ROTATION_INDEX = APP_SHEET_BULK_STATUS_INDEX + 5;
const APP_SHEET_BULK_CONDITION_INDEX = APP_SHEET_BULK_ROTATION_INDEX + 1;
const APP_SHEET_BULK_SOIL_MOISTURE_INDEX = APP_SHEET_BULK_ROTATION_INDEX + 2;
const APP_SHEET_BULK_PEST_ISSUE_INDEX = APP_SHEET_BULK_ROTATION_INDEX + 3;
const APP_SHEET_BULK_PEST_TREATMENT_INDEX = APP_SHEET_BULK_ROTATION_INDEX + 4;
const APP_SHEET_BULK_NUTRIENTS_USED_INDEX = APP_SHEET_BULK_ROTATION_INDEX + 5;
const APP_SHEET_BULK_NUTRIENT_PRODUCT_INDEX = APP_SHEET_BULK_ROTATION_INDEX + 6;
const APP_SHEET_BULK_NUTRIENT_AMOUNT_INDEX = APP_SHEET_BULK_ROTATION_INDEX + 7;

const NUTRIENT_OPTIONS = Object.freeze(["Yes", "No"]);
const SOIL_MOISTURE_OPTIONS = Object.freeze([
    "Dry",
    "Slightly moist",
    "Moist",
    "Wet",
    "Unknown",
]);
const MEASUREMENT_UNIT_OPTIONS = Object.freeze(["in", "cm"]);
const MEASUREMENT_QUALITY_OPTIONS = Object.freeze(["Measured", "Estimated"]);
const MEASUREMENT_METHOD_OPTIONS = Object.freeze([
    "Ruler",
    "Estimated from photo",
    "Estimated visually",
    "Other",
    "Unspecified",
]);

// Documented starting sizes. A later Repot entry supersedes these values.
const INITIAL_POT_SIZE_BY_PLANT = Object.freeze({
    P01: "4 in",
    P02: "4 in",
    P03: "4 in",
    P04: "4 in",
    P05: "4 in",
    P06: "4 in",
    P07: "4 in",
    P08: "4 in",
    P09: "4 in",
    P10: "4 in",
    P11: "4 in",
    P12: "4 in",
    P13: "4 in",
    P14: "4 in",
    P15: "4 in",
    P16: "4 in",
    P17: "4 in",
    P18: "4 in",
    P19: "8 in wide",
    P20: "7 in diagonal",
    P21: "6 in",
    P22: "5 in",
    P23: "4 in",
    P24: "4 in",
    P25: "4 in",
    P26: "4 in",
    P27: "4 in",
    P28: "4 in",
});

function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu("Garden logger")
        .addItem("Open mobile entry", "openMobileEntry")
        .addItem("Verify logger", "installGardenLogger")
        .addItem("Verify AppSheet intake", "installAppSheetIntake")
        .addSeparator()
        .addItem("Open Quick log", "openQuickLog")
        .addItem("Open History", "openHistory")
        .addSeparator()
        .addItem(
            "Exclude selected History observations",
            "removeSelectedHistoryObservations"
        )
        .addToUi();
}

function openMobileEntry() {
    const html = HtmlService.createHtmlOutputFromFile("Index")
        .setWidth(430)
        .setHeight(680);
    SpreadsheetApp.getUi().showModalDialog(html, "Garden care logger");
}

function doGet() {
    return HtmlService.createHtmlOutputFromFile("Index")
        .setTitle("Garden care logger")
        .setFaviconUrl(GARDEN_LOGGER.faviconUrl)
        .addMetaTag(
            "viewport",
            "width=device-width, initial-scale=1, viewport-fit=cover"
        )
        .addMetaTag("mobile-web-app-capable", "yes")
        .addMetaTag("apple-mobile-web-app-capable", "yes");
}

function getWebAppBootstrap() {
    const spreadsheet = getGardenSpreadsheet_();
    const tracker = requireSheet_(spreadsheet, GARDEN_LOGGER.plantTrackerSheet);
    const baselines = requireSheet_(spreadsheet, GARDEN_LOGGER.baselinesSheet);
    const historyRows = readHistorySnapshot_(spreadsheet);
    const trackerRowCount = Math.max(0, tracker.getLastRow() - 1);
    const currentPotSizeColumn = optionalColumnForHeader_(
        tracker,
        GARDEN_LOGGER.currentPotSizeHeader
    );
    const trackerColumnCount = Math.max(
        GARDEN_LOGGER.currentLabelColumn,
        currentPotSizeColumn
    );
    const trackerRange = trackerRowCount
        ? tracker.getRange(2, 1, trackerRowCount, trackerColumnCount)
        : null;
    const trackerValues = trackerRange ? trackerRange.getValues() : [];
    const trackerFormulas = trackerRange ? trackerRange.getFormulas() : [];
    const baselineValues = baselinePotSetupData_(baselines).rows;
    const potSetupByPlant = new Map(
        baselineValues.map(([plantId, potSetup]) => [
            cleanText_(plantId),
            potSetup || 1,
        ])
    );
    const potSizeByPlant = latestPotSizesFromRows_(historyRows);
    const dryOrLowestWeightByPlant = dryOrLowestWeightsFromRows_(historyRows);
    const timeZone = spreadsheet.getSpreadsheetTimeZone();

    const plants = trackerValues
        .filter(([plantId]) => cleanText_(plantId))
        .map((row, index) => {
            const [
                plantId,
                commonName,
                scientificName,
                lastWatered,
                daysSinceWater,
                ,
                latestWeight,
            ] = row;
            const label = row[GARDEN_LOGGER.currentLabelColumn - 1];
            const fieldGuideUrl = fieldGuideUrlForRow_(trackerFormulas[index]);
            const imageUrls = WEB_PLANT_IMAGE_URLS[cleanText_(plantId)] || {};
            const dryOrLowestWeight = dryOrLowestWeightByPlant.get(
                cleanText_(plantId)
            );
            return {
                id: cleanText_(plantId),
                name: cleanText_(commonName),
                scientificName: cleanText_(scientificName),
                label: cleanText_(label),
                currentImageUrl: imageUrls.currentImageUrl || "",
                nurseryLabelImageUrl: imageUrls.nurseryLabelImageUrl || "",
                potSetup: positiveInteger_(
                    potSetupByPlant.get(cleanText_(plantId)) || 1,
                    "Pot setup"
                ),
                currentPotSize:
                    cleanText_(row[currentPotSizeColumn - 1]) ||
                    potSizeByPlant.get(cleanText_(plantId)) ||
                    "Not logged",
                lastWatered: formatClientDate_(
                    lastWatered,
                    timeZone,
                    "MMM d, yyyy"
                ),
                daysSinceWater:
                    daysSinceWater === "" || daysSinceWater === null
                        ? ""
                        : Number(daysSinceWater),
                latestWeight:
                    latestWeight === "" || latestWeight === null
                        ? ""
                        : Number(latestWeight),
                dryOrLowestWeight: dryOrLowestWeight
                    ? dryOrLowestWeight.weight
                    : "",
                dryOrLowestWeightBasis: dryOrLowestWeight
                    ? dryOrLowestWeight.basis
                    : "",
                dryOrLowestWeightDate: dryOrLowestWeight
                    ? formatClientDate_(
                          dryOrLowestWeight.observedAt,
                          timeZone,
                          "MMM d, yyyy"
                      )
                    : "",
                fieldGuideUrl,
                historyUrl: `${GARDEN_LOGGER.historyUrl}?id=${encodeURIComponent(cleanText_(plantId))}`,
            };
        });
    assertUniquePlantIds_(plants);
    const plantNames = new Map(plants.map((plant) => [plant.id, plant.name]));

    return {
        version: GARDEN_LOGGER.version,
        timeZone,
        serverTime: new Date().toISOString(),
        events: [...WEB_EVENT_OPTIONS],
        links: {
            spreadsheet: GARDEN_LOGGER.spreadsheetUrl,
            quickLog: GARDEN_LOGGER.quickLogUrl,
            fieldGuide: GARDEN_LOGGER.fieldGuideUrl,
            tracker: GARDEN_LOGGER.trackerUrl,
            layout: GARDEN_LOGGER.layoutUrl,
            calendar: GARDEN_LOGGER.calendarUrl,
            photos: GARDEN_LOGGER.photosUrl,
        },
        plants,
        recent: recentObservationsFromRows_(
            historyRows,
            timeZone,
            10,
            plantNames
        ),
    };
}

function normalizeWeightState_(value, weight) {
    const weightState = cleanText_(value);
    if (weightState && !WEIGHT_STATE_OPTIONS.includes(weightState)) {
        throw new Error("Weight state must be Dry, Wet, or Routine.");
    }
    if (weight === "") return "";
    return weightState || "Routine";
}

function validateMeasurementEvents_(eventNames, weight, height, width) {
    if (eventNames.includes("Weigh") && weight === "") {
        throw new Error("Enter a weight for the Weigh event.");
    }
    if (eventNames.includes("Measure") && height === "" && width === "") {
        throw new Error("Enter a height or width for the Measure event.");
    }
}

function normalizeMeasurementQuality_(value, eventNames, measurementMethod) {
    if (!eventNames.includes("Measure")) return "";
    if (measurementMethod === "Ruler") return "Measured";
    if (
        measurementMethod === "Estimated from photo" ||
        measurementMethod === "Estimated visually"
    )
        return "Estimated";
    const normalized = cleanText_(value) || "Estimated";
    if (!MEASUREMENT_QUALITY_OPTIONS.includes(normalized)) {
        throw new Error("Measurement quality must be Measured or Estimated.");
    }
    return normalized;
}

function normalizeMeasurementUnit_(value, eventNames, fallback = "cm") {
    if (!eventNames.includes("Measure")) return "";
    const raw = cleanText_(value).toLowerCase() || fallback;
    const aliases = {
        in: "in",
        inch: "in",
        inches: "in",
        cm: "cm",
        centimeter: "cm",
        centimeters: "cm",
        centimetre: "cm",
        centimetres: "cm",
    };
    const normalized = aliases[raw];
    if (!MEASUREMENT_UNIT_OPTIONS.includes(normalized)) {
        throw new Error("Measurement unit must be in or cm.");
    }
    return normalized;
}

function measurementToCentimeters_(value, unit) {
    if (value === "") return "";
    if (unit !== "in") return value;
    return Math.round(Number(value) * 2.54 * 10000) / 10000;
}

function normalizeMeasurementMethod_(value, eventNames) {
    if (!eventNames.includes("Measure")) return "";
    const normalized = cleanText_(value) || "Unspecified";
    if (!MEASUREMENT_METHOD_OPTIONS.includes(normalized)) {
        throw new Error(
            `Measurement method must be one of: ${MEASUREMENT_METHOD_OPTIONS.join(", ")}.`
        );
    }
    return normalized;
}

function prepareWebObservation_(spreadsheet, payload, plantRecords) {
    const plantId = cleanText_(payload && payload.plantId);
    const plant = plantRecords
        ? plantRecords.get(plantId)
        : plantRecordForId_(spreadsheet, plantId);
    if (!plant) throw new Error("Choose a valid plant.");

    const requestedEvents = Array.isArray(payload.events)
        ? WEB_EVENT_OPTIONS.filter((eventName) =>
              payload.events.includes(eventName)
          )
        : [];
    const weight = optionalPositiveNumber_(payload.weight, "Weight");
    const heightInput = optionalPositiveNumber_(payload.height, "Height");
    const widthInput = optionalPositiveNumber_(payload.width, "Width");
    const condition = cleanText_(payload.condition);
    const soilMoisture = cleanText_(payload.soilMoisture);
    const medium = cleanText_(payload.medium);
    const notes = cleanText_(payload.notes);
    const weightState = normalizeWeightState_(payload.weightState, weight);

    const eventNames = buildEventNamesFromList_(
        requestedEvents,
        weightState,
        weight,
        heightInput,
        widthInput,
        condition || soilMoisture,
        notes
    );
    validateMeasurementEvents_(eventNames, weight, heightInput, widthInput);
    const measurementMethod = normalizeMeasurementMethod_(
        payload && payload.measurementMethod,
        eventNames
    );
    const measurementQuality = normalizeMeasurementQuality_(
        payload && payload.measurementQuality,
        eventNames,
        measurementMethod
    );
    // Old queued drafts were created by a centimeters-only form, so an absent
    // unit remains centimeters for backward-compatible retries. Logger 5.8
    // always sends an explicit unit and defaults new form entries to inches.
    const measurementUnit = normalizeMeasurementUnit_(
        payload && payload.measurementUnit,
        eventNames,
        "cm"
    );
    const height = measurementToCentimeters_(heightInput, measurementUnit);
    const width = measurementToCentimeters_(widthInput, measurementUnit);
    const details = eventDetailsFromPayload_(payload, eventNames, plant);

    const requestId = normalizeRequestId_(payload && payload.requestId, true);
    const observationDate = normalizeDate_(payload.observedAt);
    const potSetup = eventNames.includes("Repot")
        ? plant.potSetup + 1
        : plant.potSetup;
    return {
        plant,
        observation: {
            plantId,
            eventNames,
            observationDate,
            weightState,
            weight,
            height,
            width,
            condition,
            soilMoisture,
            medium,
            notes,
            potSetup,
            currentLabel: plant.label,
            requestId,
            details,
            entrySource: normalizeWebEntrySource_(
                payload && payload.entrySource
            ),
            measurementQuality,
            measurementMethod,
            measurementUnit,
        },
    };
}

/**
 * AppSheet automation entrypoint. AppSheet writes only to the flat intake
 * table; this bridge then archives the entry through the same canonical,
 * idempotent History writer used by the mobile logger.
 */
function processAppSheetEntry(entryId) {
    const spreadsheet = getGardenSpreadsheet_();
    const entries = requireSheet_(
        spreadsheet,
        GARDEN_LOGGER.appSheetEntriesSheet
    );
    ensureAppSheetEntryColumns_(entries);
    assertHeaders_(entries, APP_SHEET_ENTRY_HEADERS, 1);

    const normalizedEntryId = cleanText_(entryId);
    if (!normalizedEntryId) throw new Error("AppSheet Entry ID is required.");

    const rowCount = Math.max(0, entries.getLastRow() - 1);
    if (!rowCount) {
        throw new Error(`AppSheet entry ${normalizedEntryId} was not found.`);
    }
    const rows = entries
        .getRange(2, 1, rowCount, APP_SHEET_ENTRY_HEADERS.length)
        .getValues();
    const matches = rows
        .map((row, index) => ({ row, rowNumber: index + 2 }))
        .filter(({ row }) => cleanText_(row[0]) === normalizedEntryId);
    if (matches.length !== 1) {
        throw new Error(
            matches.length
                ? `AppSheet Entry ID ${normalizedEntryId} is duplicated.`
                : `AppSheet entry ${normalizedEntryId} was not found.`
        );
    }

    const { row, rowNumber } = matches[0];
    const storedStatus = cleanText_(row[26]);
    const storedRequestId = cleanText_(row[28]);
    if (storedStatus === "Saved") {
        return {
            ok: true,
            duplicate: true,
            entryId: normalizedEntryId,
            requestId: storedRequestId,
            historyRows: Number(row[29]) || 0,
            message: cleanText_(row[27]) || "This AppSheet entry is saved.",
        };
    }

    const requestId = normalizeRequestId_(
        storedRequestId || `appsheet-${normalizedEntryId}`,
        true
    );
    const payload = appSheetPayloadFromRow_(row, requestId);
    try {
        const batch = saveWebObservationBatch([payload]);
        const result = batch.results[0];
        if (result && result.ok) {
            writeAppSheetEntryReceipt_(entries, rowNumber, {
                status: "Saved",
                message: result.message,
                requestId,
                historyRows: result.historyRows,
                savedAt: new Date(),
            });
            SpreadsheetApp.flush();
            return {
                ...result,
                entryId: normalizedEntryId,
            };
        }

        const message =
            (result && result.message) ||
            "This entry needs correction before it can be saved.";
        writeAppSheetEntryReceipt_(entries, rowNumber, {
            status: result && result.retryable ? "Retry" : "Needs correction",
            message,
            requestId,
            historyRows: 0,
            savedAt: "",
        });
        SpreadsheetApp.flush();
        return {
            ...(result || { ok: false, retryable: false, message }),
            entryId: normalizedEntryId,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        writeAppSheetEntryReceipt_(entries, rowNumber, {
            status: "Retry",
            message,
            requestId,
            historyRows: 0,
            savedAt: "",
        });
        SpreadsheetApp.flush();
        throw error;
    }
}

/**
 * Processes AppSheet intake rows from the same bound project as the mobile
 * logger. AppSheet supports only standalone Apps Script projects, so a
 * time-driven trigger keeps canonical History writes inside this project's
 * shared script lock instead of introducing a second, uncoordinated writer.
 */
function processQueuedAppSheetEntries() {
    const startedAt = Date.now();
    const spreadsheet = getGardenSpreadsheet_();
    const entries = requireSheet_(
        spreadsheet,
        GARDEN_LOGGER.appSheetEntriesSheet
    );
    ensureAppSheetEntryColumns_(entries);
    assertHeaders_(entries, APP_SHEET_ENTRY_HEADERS, 1);

    const rowCount = Math.max(0, entries.getLastRow() - 1);
    if (!rowCount) {
        return finishAppSheetQueueRun_(
            spreadsheet,
            appSheetQueueSummary_(0, [], 0, startedAt)
        );
    }

    const rows = entries
        .getRange(2, 1, rowCount, APP_SHEET_ENTRY_HEADERS.length)
        .getValues();
    const idCounts = new Map();
    rows.forEach((row) => {
        const entryId = cleanText_(row[0]);
        if (entryId) idCounts.set(entryId, (idCounts.get(entryId) || 0) + 1);
    });

    const queued = rows
        .map((row, index) => ({ row, rowNumber: index + 2 }))
        .filter(({ row }) =>
            APP_SHEET_QUEUE_STATUSES.includes(cleanText_(row[26]))
        );
    const selected = queued.slice(0, APP_SHEET_QUEUE_LIMIT);
    const deferredCount = Math.max(0, queued.length - selected.length);
    const receipts = [];
    const pending = [];

    selected.forEach(({ row, rowNumber }) => {
        const entryId = cleanText_(row[0]);
        const storedRequestId = cleanText_(row[28]);
        try {
            if (!entryId) throw new Error("AppSheet Entry ID is required.");
            if (idCounts.get(entryId) !== 1) {
                throw new Error(`AppSheet Entry ID ${entryId} is duplicated.`);
            }
            const requestId = normalizeRequestId_(
                storedRequestId || `appsheet-${entryId}`,
                true
            );
            pending.push({
                entryId,
                payload: appSheetPayloadFromRow_(row, requestId),
                requestId,
                rowNumber,
            });
        } catch (error) {
            receipts.push({
                rowNumber,
                status: "Needs correction",
                message: error instanceof Error ? error.message : String(error),
                requestId: storedRequestId,
                historyRows: 0,
                savedAt: "",
            });
        }
    });

    if (pending.length) {
        try {
            const batch = saveWebObservationBatch(
                pending.map(({ payload }) => payload)
            );
            pending.forEach((item, index) => {
                const result = batch.results[index];
                const ok = Boolean(result && result.ok);
                const retryable = Boolean(result && result.retryable);
                receipts.push({
                    rowNumber: item.rowNumber,
                    status: ok
                        ? "Saved"
                        : retryable
                          ? "Retry"
                          : "Needs correction",
                    message:
                        (result && result.message) ||
                        "This entry needs correction before it can be saved.",
                    requestId: item.requestId,
                    historyRows: ok ? Number(result.historyRows) || 0 : 0,
                    savedAt: ok ? new Date() : "",
                });
            });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            pending.forEach((item) => {
                receipts.push({
                    rowNumber: item.rowNumber,
                    status: "Retry",
                    message,
                    requestId: item.requestId,
                    historyRows: 0,
                    savedAt: "",
                });
            });
        }
    }

    /* v8 ignore next -- Receipt and empty-queue paths are both covered; V8 reports a synthetic alternate branch. */
    if (receipts.length) {
        receipts.forEach((receipt) =>
            writeAppSheetEntryReceipt_(entries, receipt.rowNumber, receipt)
        );
        SpreadsheetApp.flush();
    }

    const summary = appSheetQueueSummary_(
        queued.length,
        receipts,
        deferredCount,
        startedAt
    );
    return finishAppSheetQueueRun_(spreadsheet, summary);
}

function appSheetQueueSummary_(
    queuedCount,
    receipts,
    deferredCount,
    startedAt
) {
    const savedCount = receipts.filter(
        ({ status }) => status === "Saved"
    ).length;
    const needsCorrectionCount = receipts.filter(
        ({ status }) => status === "Needs correction"
    ).length;
    const retryCount = receipts.filter(
        ({ status }) => status === "Retry"
    ).length;
    return {
        ok: needsCorrectionCount === 0 && retryCount === 0,
        queuedCount,
        processedCount: receipts.length,
        savedCount,
        needsCorrectionCount,
        retryCount,
        deferredCount,
        elapsedMs: Date.now() - startedAt,
    };
}

function finishAppSheetQueueRun_(spreadsheet, entrySummary) {
    const bulkSummary = processQueuedAppSheetBulkEntries_(spreadsheet);
    const summary = {
        ...entrySummary,
        ok: entrySummary.ok && bulkSummary.ok,
        bulk: bulkSummary,
    };
    console.info(
        JSON.stringify({
            loggerVersion: GARDEN_LOGGER.version,
            operation: "processQueuedAppSheetEntries",
            queuedCount: summary.queuedCount,
            processedCount: summary.processedCount,
            savedCount: summary.savedCount,
            needsCorrectionCount: summary.needsCorrectionCount,
            retryCount: summary.retryCount,
            deferredCount: summary.deferredCount,
            bulkQueuedCount: bulkSummary.queuedCount,
            bulkProcessedCount: bulkSummary.processedCount,
            bulkSavedRoundCount: bulkSummary.savedRoundCount,
            bulkRequestedCount: bulkSummary.requestedCount,
            bulkSavedRequestCount: bulkSummary.savedRequestCount,
            bulkNeedsCorrectionCount: bulkSummary.needsCorrectionCount,
            bulkRetryCount: bulkSummary.retryCount,
            bulkDeferredCount: bulkSummary.deferredCount,
            elapsedMs: summary.elapsedMs + bulkSummary.elapsedMs,
        })
    );
    return summary;
}

/**
 * Expands each queued AppSheet bulk-care row into stable per-plant requests.
 * A whole Water, Weigh, or Water + weigh round is kept together, so a normal
 * 28-plant round reaches the canonical writer in one saveWebObservationBatch()
 * call.
 */
function processQueuedAppSheetBulkEntries_(spreadsheet) {
    const startedAt = Date.now();
    const bulkSheet = spreadsheet.getSheetByName(
        GARDEN_LOGGER.appSheetBulkSheet
    );
    if (!bulkSheet) {
        return appSheetBulkQueueSummary_(false, 0, [], 0, startedAt);
    }
    migrateLegacyAppSheetBulkSheet_(bulkSheet);
    assertHeaders_(bulkSheet, APP_SHEET_BULK_HEADERS, 1);

    const rowCount = Math.max(0, bulkSheet.getLastRow() - 1);
    if (!rowCount) {
        return appSheetBulkQueueSummary_(true, 0, [], 0, startedAt);
    }

    const rows = bulkSheet
        .getRange(2, 1, rowCount, APP_SHEET_BULK_HEADERS.length)
        .getValues();
    const idCounts = new Map();
    rows.forEach((row) => {
        const roundId = cleanText_(row[0]);
        /* v8 ignore next -- Rows with and without round IDs are both covered; VM coverage reports a synthetic alternate branch. */
        if (roundId) {
            idCounts.set(roundId, (idCounts.get(roundId) || 0) + 1);
        }
    });

    const queued = rows
        .map((row, index) => ({ row, rowNumber: index + 2 }))
        .filter(({ row }) =>
            APP_SHEET_QUEUE_STATUSES.includes(
                cleanText_(row[APP_SHEET_BULK_STATUS_INDEX])
            )
        );
    const receipts = [];
    const pendingRounds = [];
    let selectedRequestCount = 0;
    let deferredCount = 0;

    queued.forEach(({ row, rowNumber }) => {
        const roundId = cleanText_(row[0]);
        try {
            /* v8 ignore next -- Missing and populated round IDs are both covered; VM coverage reports a synthetic alternate branch. */
            if (!roundId) throw new Error("AppSheet Round ID is required.");
            if (idCounts.get(roundId) !== 1) {
                throw new Error(`AppSheet Round ID ${roundId} is duplicated.`);
            }
            const requests = appSheetBulkPayloadsFromRow_(row, roundId);
            if (!requests.length) {
                throw new Error(
                    "Select at least one watered plant or enter at least one weight before sending this round."
                );
            }
            if (
                selectedRequestCount > 0 &&
                selectedRequestCount + requests.length > APP_SHEET_QUEUE_LIMIT
            ) {
                deferredCount += 1;
                return;
            }
            selectedRequestCount += requests.length;
            pendingRounds.push({ roundId, rowNumber, requests });
        } catch (error) {
            receipts.push({
                rowNumber,
                status: "Needs correction",
                message: error instanceof Error ? error.message : String(error),
                requestCount: 0,
                savedCount: 0,
                savedAt: "",
            });
        }
    });

    const pendingRequests = pendingRounds.flatMap(({ requests }) => requests);
    if (pendingRequests.length) {
        try {
            const batch = saveWebObservationBatch(
                pendingRequests.map(({ payload }) => payload)
            );
            let resultIndex = 0;
            pendingRounds.forEach((round) => {
                const results = round.requests.map((request) => ({
                    plantId: request.plantId,
                    result: batch.results[resultIndex++],
                }));
                const savedCount = results.filter(
                    ({ result }) => result && result.ok
                ).length;
                const failures = results.filter(
                    ({ result }) => !result || !result.ok
                );
                const hasDeterministicFailure = failures.some(
                    ({ result }) => result && !result.retryable
                );
                const status = failures.length
                    ? hasDeterministicFailure
                        ? "Needs correction"
                        : "Retry"
                    : "Saved";
                receipts.push({
                    rowNumber: round.rowNumber,
                    status,
                    message: appSheetBulkResultMessage_(
                        round.requests.length,
                        savedCount,
                        failures
                    ),
                    requestCount: round.requests.length,
                    savedCount,
                    savedAt: status === "Saved" ? new Date() : "",
                });
            });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            pendingRounds.forEach((round) => {
                receipts.push({
                    rowNumber: round.rowNumber,
                    status: "Retry",
                    message,
                    requestCount: round.requests.length,
                    savedCount: 0,
                    savedAt: "",
                });
            });
        }
    }

    /* v8 ignore next -- Receipt and empty-queue paths are both covered; V8 reports a synthetic alternate branch. */
    if (receipts.length) {
        receipts.forEach((receipt) =>
            writeAppSheetBulkReceipt_(bulkSheet, receipt.rowNumber, receipt)
        );
        SpreadsheetApp.flush();
    }

    const summary = appSheetBulkQueueSummary_(
        true,
        queued.length,
        receipts,
        deferredCount,
        startedAt
    );
    console.info(
        JSON.stringify({
            loggerVersion: GARDEN_LOGGER.version,
            operation: "processQueuedAppSheetBulkEntries",
            queuedCount: summary.queuedCount,
            processedCount: summary.processedCount,
            savedRoundCount: summary.savedRoundCount,
            requestedCount: summary.requestedCount,
            savedRequestCount: summary.savedRequestCount,
            needsCorrectionCount: summary.needsCorrectionCount,
            retryCount: summary.retryCount,
            deferredCount: summary.deferredCount,
            elapsedMs: summary.elapsedMs,
        })
    );
    return summary;
}

function appSheetBulkPayloadsFromRow_(row, roundId) {
    const observedAt = row[2] || row[1] || "";
    const action = normalizeAppSheetBulkAction_(
        row[APP_SHEET_BULK_ACTION_INDEX]
    );
    const includesWater = action === "Water" || action === "Water + weigh";
    const includesWeigh = action === "Weigh" || action === "Water + weigh";
    const selectedPlants =
        includesWeigh && !includesWater
            ? new Set()
            : appSheetBulkSelectedPlants_(
                  row[APP_SHEET_BULK_SELECTED_PLANTS_INDEX]
              );
    const weightState =
        cleanText_(row[APP_SHEET_BULK_WEIGHT_STATE_INDEX]) ||
        (action === "Water + weigh" ? "Wet" : "Routine");
    const notes = cleanText_(row[APP_SHEET_BULK_NOTES_INDEX]);
    const sharedDetails = {
        rotationDegrees: row[APP_SHEET_BULK_ROTATION_INDEX],
        condition: cleanText_(row[APP_SHEET_BULK_CONDITION_INDEX]),
        soilMoisture: cleanText_(row[APP_SHEET_BULK_SOIL_MOISTURE_INDEX]),
        pestIssue: cleanText_(row[APP_SHEET_BULK_PEST_ISSUE_INDEX]),
        pestTreatment: cleanText_(row[APP_SHEET_BULK_PEST_TREATMENT_INDEX]),
        nutrientsUsed: cleanText_(row[APP_SHEET_BULK_NUTRIENTS_USED_INDEX]),
        nutrientProduct: cleanText_(row[APP_SHEET_BULK_NUTRIENT_PRODUCT_INDEX]),
        nutrientAmount: cleanText_(row[APP_SHEET_BULK_NUTRIENT_AMOUNT_INDEX]),
    };

    const weights = new Map();
    APP_SHEET_BULK_PLANTS.forEach((plantId, index) => {
        if (!includesWeigh) return;
        const weight = row[APP_SHEET_BULK_WEIGHT_START_INDEX + index];
        if (
            (typeof weight === "number" && Number.isFinite(weight)) ||
            cleanText_(weight)
        ) {
            weights.set(plantId, weight);
        }
    });
    if (includesWater && !selectedPlants.size) {
        throw new Error("Select at least one watered plant for this round.");
    }
    if (!includesWater && !includesWeigh && !selectedPlants.size) {
        throw new Error("Select at least one plant for this round.");
    }
    if (includesWeigh && !weights.size) {
        throw new Error("Enter at least one plant weight for this round.");
    }

    return APP_SHEET_BULK_PLANTS.flatMap((plantId) => {
        const events = [];
        /* v8 ignore next -- Watered and unwatered plants are both covered; VM coverage reports a synthetic alternate branch. */
        if (includesWater && selectedPlants.has(plantId)) events.push("Water");
        const hasWeight = weights.has(plantId);
        const weight = hasWeight ? weights.get(plantId) : "";
        if (hasWeight) events.push("Weigh");
        if (!includesWater && !includesWeigh && selectedPlants.has(plantId)) {
            events.push(action);
        }
        if (!events.length) return [];
        const requestId = normalizeRequestId_(
            `appsheet-bulk-${roundId}-${plantId}`,
            true
        );
        return [
            {
                plantId,
                payload: {
                    requestId,
                    observedAt,
                    plantId,
                    events,
                    weightState: hasWeight ? weightState : "",
                    weight,
                    notes,
                    ...sharedDetails,
                    entrySource: "AppSheet bulk",
                },
            },
        ];
    });
}

function normalizeAppSheetBulkAction_(value) {
    const action = cleanText_(value) || "Weigh";
    if (!APP_SHEET_BULK_ACTION_OPTIONS.includes(action)) {
        throw new Error(
            `Round action must be one of: ${APP_SHEET_BULK_ACTION_OPTIONS.join(", ")}.`
        );
    }
    return action;
}

function appSheetBulkSelectedPlants_(value) {
    const values = Array.isArray(value)
        ? value
        : cleanText_(value)
              .split(/\s*[,;]\s*/)
              .filter(Boolean);
    const selected = new Set(values.map((plantId) => cleanText_(plantId)));
    const invalid = [...selected].filter(
        (plantId) => !APP_SHEET_BULK_PLANTS.includes(plantId)
    );
    /* v8 ignore next -- Valid and invalid selected plant IDs are both covered; VM coverage reports a synthetic alternate branch. */
    if (invalid.length) {
        throw new Error(`Unknown selected plant ID: ${invalid.join(", ")}.`);
    }
    return selected;
}

// Compatibility alias for older tests, open Apps Script tabs, and callers.
function appSheetBulkWateredPlants_(value) {
    return appSheetBulkSelectedPlants_(value);
}

function appSheetBulkResultMessage_(requestCount, savedCount, failures) {
    /* v8 ignore next -- Successful and partially failed round receipts are both covered; VM coverage reports a synthetic alternate branch. */
    if (!failures.length) {
        return `${savedCount} plant update${savedCount === 1 ? "" : "s"} saved.`;
    }
    const details = failures
        .map(({ plantId, result }) => {
            const message =
                (result && result.message) ||
                "The server returned no result for this plant.";
            return `${plantId}: ${message}`;
        })
        .join(" ");
    return `${savedCount} of ${requestCount} saved. ${details}`;
}

function writeAppSheetBulkReceipt_(sheet, rowNumber, receipt) {
    sheet
        .getRange(rowNumber, APP_SHEET_BULK_STATUS_INDEX + 1, 1, 5)
        .setValues([
            [
                receipt.status,
                safeSheetText_(receipt.message),
                receipt.requestCount,
                receipt.savedCount,
                receipt.savedAt,
            ],
        ]);
    sheet
        .getRange(rowNumber, APP_SHEET_BULK_STATUS_INDEX + 5)
        .setNumberFormat("M/d/yyyy h:mm:ss am/pm");
}

function appSheetBulkQueueSummary_(
    installed,
    queuedCount,
    receipts,
    deferredCount,
    startedAt
) {
    const savedRoundCount = receipts.filter(
        ({ status }) => status === "Saved"
    ).length;
    const needsCorrectionCount = receipts.filter(
        ({ status }) => status === "Needs correction"
    ).length;
    const retryCount = receipts.filter(
        ({ status }) => status === "Retry"
    ).length;
    return {
        ok: needsCorrectionCount === 0 && retryCount === 0,
        installed,
        queuedCount,
        processedCount: receipts.length,
        savedRoundCount,
        requestedCount: receipts.reduce(
            (sum, receipt) => sum + (Number(receipt.requestCount) || 0),
            0
        ),
        savedRequestCount: receipts.reduce(
            (sum, receipt) => sum + (Number(receipt.savedCount) || 0),
            0
        ),
        needsCorrectionCount,
        retryCount,
        deferredCount,
        elapsedMs: Date.now() - startedAt,
    };
}

/**
 * Creates or verifies the flat AppSheet bulk-care intake sheet. This is a
 * staging surface only; the trigger moves queued weight, watering, rotation,
 * and other supported bulk-care rounds through the canonical History writer.
 */
function installAppSheetBulkSheet() {
    const spreadsheet = getGardenSpreadsheet_();
    let sheet = spreadsheet.getSheetByName(GARDEN_LOGGER.appSheetBulkSheet);
    const created = !sheet;
    /* v8 ignore next -- Existing-sheet and create-sheet installers are both covered; VM coverage reports a synthetic alternate branch. */
    if (!sheet) {
        const entries = requireSheet_(
            spreadsheet,
            GARDEN_LOGGER.appSheetEntriesSheet
        );
        sheet = spreadsheet.insertSheet(
            GARDEN_LOGGER.appSheetBulkSheet,
            entries.getIndex()
        );
    }

    if (!sheet.getLastRow()) {
        ensureSheetColumnCapacity_(sheet, APP_SHEET_BULK_HEADERS.length);
        sheet
            .getRange(1, 1, 1, APP_SHEET_BULK_HEADERS.length)
            .setValues([[...APP_SHEET_BULK_HEADERS]]);
    }
    const migrated = migrateLegacyAppSheetBulkSheet_(sheet);
    assertHeaders_(sheet, APP_SHEET_BULK_HEADERS, 1);

    const dataRowCount = Math.max(1, sheet.getMaxRows() - 1);
    const actionValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList(APP_SHEET_BULK_ACTION_OPTIONS, true)
        .setAllowInvalid(false)
        .build();
    const weightStateValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList(WEIGHT_STATE_OPTIONS, true)
        .setAllowInvalid(false)
        .build();
    const weightValidation = SpreadsheetApp.newDataValidation()
        .requireNumberGreaterThan(0)
        .setAllowInvalid(false)
        .build();
    const statusValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList(
            ["Queued", "Retry", "Saved", "Needs correction"],
            true
        )
        .setAllowInvalid(false)
        .build();

    sheet
        .getRange(2, APP_SHEET_BULK_ACTION_INDEX + 1, dataRowCount, 1)
        .setDataValidation(actionValidation);
    sheet
        .getRange(2, APP_SHEET_BULK_ACTION_INDEX + 1, dataRowCount, 2)
        .setNumberFormat("@");
    sheet
        .getRange(2, APP_SHEET_BULK_WEIGHT_STATE_INDEX + 1, dataRowCount, 1)
        .setDataValidation(weightStateValidation);
    sheet
        .getRange(
            2,
            APP_SHEET_BULK_WEIGHT_START_INDEX + 1,
            dataRowCount,
            APP_SHEET_BULK_PLANTS.length
        )
        .setDataValidation(weightValidation)
        .setNumberFormat("0.0");
    sheet
        .getRange(2, APP_SHEET_BULK_STATUS_INDEX + 1, dataRowCount, 1)
        .setDataValidation(statusValidation);
    const rotationValidation = SpreadsheetApp.newDataValidation()
        .requireNumberBetween(1, 360)
        .setAllowInvalid(false)
        .build();
    const soilMoistureValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList(SOIL_MOISTURE_OPTIONS, true)
        .setAllowInvalid(false)
        .build();
    const nutrientValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList(NUTRIENT_OPTIONS, true)
        .setAllowInvalid(false)
        .build();
    sheet
        .getRange(2, APP_SHEET_BULK_ROTATION_INDEX + 1, dataRowCount, 1)
        .setDataValidation(rotationValidation)
        .setNumberFormat("0.##");
    sheet
        .getRange(2, APP_SHEET_BULK_SOIL_MOISTURE_INDEX + 1, dataRowCount, 1)
        .setDataValidation(soilMoistureValidation);
    sheet
        .getRange(2, APP_SHEET_BULK_NUTRIENTS_USED_INDEX + 1, dataRowCount, 1)
        .setDataValidation(nutrientValidation);

    sheet
        .getRange(1, 1, 1, APP_SHEET_BULK_HEADERS.length)
        .setBackground("#24533f")
        .setFontColor("#ffffff")
        .setFontWeight("bold");
    sheet
        .getRange(2, 2, dataRowCount, 2)
        .setNumberFormat("M/d/yyyy h:mm:ss am/pm");
    sheet
        .getRange(2, APP_SHEET_BULK_NOTES_INDEX + 3, dataRowCount, 1)
        .setNumberFormat("M/d/yyyy h:mm:ss am/pm");
    sheet
        .getRange(2, APP_SHEET_BULK_STATUS_INDEX + 5, dataRowCount, 1)
        .setNumberFormat("M/d/yyyy h:mm:ss am/pm");
    sheet.setFrozenRows(1);
    sheet.setHiddenGridlines(true);
    sheet.setColumnWidth(1, 130);
    sheet.setColumnWidths(2, 3, 165);
    sheet.setColumnWidth(APP_SHEET_BULK_ACTION_INDEX + 1, 135);
    sheet.setColumnWidth(APP_SHEET_BULK_SELECTED_PLANTS_INDEX + 1, 240);
    sheet.setColumnWidth(APP_SHEET_BULK_WEIGHT_STATE_INDEX + 1, 120);
    sheet.setColumnWidths(
        APP_SHEET_BULK_WEIGHT_START_INDEX + 1,
        APP_SHEET_BULK_PLANTS.length,
        105
    );
    sheet.setColumnWidth(APP_SHEET_BULK_NOTES_INDEX + 1, 280);
    sheet.setColumnWidth(APP_SHEET_BULK_ROTATION_INDEX + 1, 110);
    sheet.setColumnWidths(APP_SHEET_BULK_CONDITION_INDEX + 1, 4, 190);
    sheet.setColumnWidths(APP_SHEET_BULK_NUTRIENTS_USED_INDEX + 1, 3, 160);
    sheet.hideColumns(APP_SHEET_BULK_NOTES_INDEX + 2, 7);

    const result = {
        created,
        migrated,
        sheet: GARDEN_LOGGER.appSheetBulkSheet,
        columnCount: APP_SHEET_BULK_HEADERS.length,
        plantCount: APP_SHEET_BULK_PLANTS.length,
    };
    console.info(
        JSON.stringify({
            loggerVersion: GARDEN_LOGGER.version,
            operation: "installAppSheetBulkSheet",
            ...result,
        })
    );
    return result;
}

function migrateLegacyAppSheetBulkSheet_(sheet) {
    const hasHeaders = (expectedHeaders) => {
        if (sheet.getLastColumn() < expectedHeaders.length) return false;
        const currentHeaders = sheet
            .getRange(1, 1, 1, expectedHeaders.length)
            .getDisplayValues()[0]
            .map((value) => value.trim());
        return expectedHeaders.every(
            (header, index) => currentHeaders[index] === header
        );
    };

    if (hasHeaders(APP_SHEET_BULK_HEADERS)) return false;

    let migrated = false;
    if (sheet.getLastColumn() >= APP_SHEET_BULK_LEGACY_HEADERS.length) {
        const legacyHeaders = sheet
            .getRange(1, 1, 1, APP_SHEET_BULK_LEGACY_HEADERS.length)
            .getDisplayValues()[0]
            .map((value) => value.trim());
        const isLegacy = APP_SHEET_BULK_LEGACY_HEADERS.every(
            (header, index) => legacyHeaders[index] === header
        );
        if (isLegacy) {
            sheet.insertColumnsAfter(3, 2);
            sheet
                .getRange(1, 4, 1, 2)
                .setValues([["Round action", "Watered plants"]]);
            const migratedRows = Math.max(0, sheet.getLastRow() - 1);
            /* v8 ignore next -- Header-only and populated legacy migrations are both covered; VM coverage reports a synthetic alternate branch. */
            if (migratedRows) {
                sheet.getRange(2, 4, migratedRows, 1).setValue("Weigh");
            }
            migrated = true;
        }
    }

    const hasV511Headers = () => {
        if (sheet.getLastColumn() < APP_SHEET_BULK_V511_HEADERS.length) {
            return false;
        }
        const currentHeaders = sheet
            .getRange(1, 1, 1, APP_SHEET_BULK_V511_HEADERS.length)
            .getDisplayValues()[0]
            .map((value) => value.trim());
        return APP_SHEET_BULK_V511_HEADERS.every(
            (header, index) =>
                currentHeaders[index] === header ||
                (index === APP_SHEET_BULK_SELECTED_PLANTS_INDEX &&
                    currentHeaders[index] === "Selected plants")
        );
    };

    if (hasV511Headers()) {
        ensureSheetColumnCapacity_(sheet, APP_SHEET_BULK_V512_HEADERS.length);
        sheet
            .getRange(1, 1, 1, APP_SHEET_BULK_V512_HEADERS.length)
            .setValues([[...APP_SHEET_BULK_V512_HEADERS]]);
        migrated = true;
    }

    if (!hasHeaders(APP_SHEET_BULK_V512_HEADERS)) return migrated;

    const insertedWeightColumns =
        APP_SHEET_BULK_PLANTS.length - APP_SHEET_BULK_V512_PLANTS.length;
    const oldLastWeightColumn =
        APP_SHEET_BULK_WEIGHT_START_INDEX + APP_SHEET_BULK_V512_PLANTS.length;
    sheet.insertColumnsAfter(oldLastWeightColumn, insertedWeightColumns);
    sheet
        .getRange(1, 1, 1, APP_SHEET_BULK_HEADERS.length)
        .setValues([[...APP_SHEET_BULK_HEADERS]]);
    return true;
}

function ensureAppSheetEntryColumns_(sheet, configureColumn = false) {
    const currentWidth = Math.min(
        sheet.getLastColumn(),
        APP_SHEET_ENTRY_LEGACY_HEADERS.length
    );
    if (currentWidth < APP_SHEET_ENTRY_LEGACY_HEADERS.length) return false;
    const currentHeaders = sheet
        .getRange(1, 1, 1, APP_SHEET_ENTRY_LEGACY_HEADERS.length)
        .getDisplayValues()[0]
        .map((value) => value.trim());
    const compatible = APP_SHEET_ENTRY_LEGACY_HEADERS.every(
        (header, index) => currentHeaders[index] === header
    );
    if (!compatible) return false;

    ensureSheetColumnCapacity_(sheet, APP_SHEET_ENTRY_HEADERS.length);
    const rotationCell = sheet.getRange(1, APP_SHEET_ENTRY_HEADERS.length);
    const changed = rotationCell.getDisplayValue().trim() !== "Rotation (°)";
    if (changed) rotationCell.setValue("Rotation (°)");
    if (configureColumn) {
        const dataRowCount = Math.max(1, sheet.getMaxRows() - 1);
        const rotationValidation = SpreadsheetApp.newDataValidation()
            .requireNumberBetween(1, 360)
            .setAllowInvalid(false)
            .build();
        sheet
            .getRange(2, APP_SHEET_ENTRY_HEADERS.length, dataRowCount, 1)
            .setDataValidation(rotationValidation)
            .setNumberFormat("0.##");
        rotationCell
            .setBackground("#24533f")
            .setFontColor("#ffffff")
            .setFontWeight("bold");
        sheet.setColumnWidth(APP_SHEET_ENTRY_HEADERS.length, 110);
    }
    return changed;
}

function ensureSheetColumnCapacity_(sheet, requiredColumns) {
    const currentColumns = sheet.getMaxColumns();
    const missingColumns = requiredColumns - currentColumns;
    if (missingColumns > 0) {
        sheet.insertColumnsAfter(currentColumns, missingColumns);
    }
}

function installAppSheetQueueTrigger() {
    const handler = "processQueuedAppSheetEntries";
    const matching = ScriptApp.getProjectTriggers().filter(
        (trigger) => trigger.getHandlerFunction() === handler
    );
    // Apps Script does not expose a trigger's minute interval. Create the new
    // schedule before deleting legacy copies so a transient creation failure
    // cannot leave the bridge without any trigger.
    ScriptApp.newTrigger(handler).timeBased().everyMinutes(5).create();
    matching.forEach((trigger) => ScriptApp.deleteTrigger(trigger));

    const result = {
        handler,
        created: true,
        removedTriggerCount: matching.length,
        removedDuplicateCount: Math.max(0, matching.length - 1),
    };
    console.info(
        JSON.stringify({
            loggerVersion: GARDEN_LOGGER.version,
            operation: "installAppSheetQueueTrigger",
            ...result,
        })
    );
    return result;
}

function appSheetPayloadFromRow_(row, requestId) {
    return {
        requestId,
        observedAt: row[1] || "",
        plantId: cleanText_(row[2]),
        events: appSheetEventList_(row[3]),
        weightState: cleanText_(row[4]),
        weight: row[5],
        height: row[6],
        width: row[7],
        measurementUnit: cleanText_(row[8]) || "in",
        condition: cleanText_(row[9]),
        soilMoisture: cleanText_(row[10]),
        notes: cleanText_(row[11]),
        nutrientsUsed: cleanText_(row[12]),
        nutrientProduct: cleanText_(row[13]),
        nutrientAmount: cleanText_(row[14]),
        potSize: cleanText_(row[15]),
        medium: cleanText_(row[16]),
        measurementQuality: cleanText_(row[17]),
        measurementMethod: cleanText_(row[18]),
        flowerCount: row[19],
        flowerDetails: cleanText_(row[20]),
        photoUrl: cleanText_(row[21]),
        pestIssue: cleanText_(row[22]),
        pestTreatment: cleanText_(row[23]),
        rotationDegrees: row[31],
        entrySource: "AppSheet",
    };
}

function appSheetEventList_(value) {
    /* v8 ignore next -- Enum arrays and delimited strings are both covered; VM coverage reports a synthetic alternate branch. */
    if (Array.isArray(value)) return uniqueTextValues_(value);
    return uniqueTextValues_(cleanText_(value).split(/\s*(?:,|;)\s*/));
}

function writeAppSheetEntryReceipt_(sheet, rowNumber, receipt) {
    sheet
        .getRange(rowNumber, 27, 1, 5)
        .setValues([
            [
                receipt.status,
                safeSheetText_(receipt.message),
                receipt.requestId,
                receipt.historyRows,
                receipt.savedAt,
            ],
        ]);
    sheet.getRange(rowNumber, 31).setNumberFormat("M/d/yyyy h:mm:ss am/pm");
}

function appendPreparedWebObservation_(spreadsheet, prepared) {
    const result = appendObservation_(spreadsheet, prepared.observation);
    if (prepared.observation.eventNames.includes("Repot")) {
        updateBaselinePotSetup_(
            spreadsheet,
            prepared.observation.plantId,
            result.potSetup
        );
    }

    return webObservationResult_(prepared, result);
}

function webObservationResult_(prepared, result) {
    const { plant } = prepared;
    const { requestId, plantId } = prepared.observation;
    return {
        ok: true,
        duplicate: result.duplicate,
        requestId,
        plantId,
        plantName: plant.name,
        label: plant.label,
        events: result.eventNames,
        historyRows: result.historyRows,
        observedAt: result.observationDate.toISOString(),
        recordedAt: result.recordedAt.toISOString(),
        message: result.duplicate
            ? `${result.eventNames.join(" + ")} was already saved for ${plant.name}. No duplicate was added.`
            : `${result.eventNames.join(" + ")} saved for ${plant.name}.`,
    };
}

function saveWebObservation(payload) {
    const spreadsheet = getGardenSpreadsheet_();
    const prepared = prepareWebObservation_(spreadsheet, payload);
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(GARDEN_LOGGER.lockTimeoutMs)) {
        throw new Error(
            "Another reading is finishing. Your entry is still safe on this screen; wait a few seconds and tap Save again."
        );
    }

    try {
        return appendPreparedWebObservation_(spreadsheet, prepared);
    } finally {
        flushAndReleaseLock_(lock);
    }
}

/**
 * Saves a phone-side queue in one Apps Script request. Each item keeps its own
 * request ID, so a retry can safely finish a partially completed batch without
 * duplicating observations that already reached History.
 */
function saveWebObservationBatch(payloads) {
    if (!Array.isArray(payloads) || payloads.length < 1) {
        throw new Error("The observation queue is empty.");
    }
    if (payloads.length > 50) {
        throw new Error("Send at most 50 queued observations at a time.");
    }

    const startedAt = Date.now();
    const results = Array(payloads.length).fill(null);
    const requestIds = payloads.map((payload, index) => {
        try {
            return normalizeRequestId_(payload && payload.requestId, true);
        } catch (error) {
            results[index] = {
                ok: false,
                requestId: cleanText_(payload && payload.requestId),
                plantId: cleanText_(payload && payload.plantId),
                retryable: false,
                errorCode: "VALIDATION",
                message: error instanceof Error ? error.message : String(error),
            };
            return "";
        }
    });
    const validRequestIds = requestIds.filter(Boolean);
    if (new Set(validRequestIds).size !== validRequestIds.length) {
        throw new Error(
            "Every queued observation must have a unique request ID."
        );
    }

    const spreadsheet = getGardenSpreadsheet_();
    const plantRecords = plantRecordsById_(spreadsheet);
    const prepared = [];
    payloads.forEach((payload, index) => {
        /* v8 ignore next -- Prevalidated failures and valid payload preparation are both covered; VM coverage reports a synthetic alternate branch. */
        if (results[index]) return;
        try {
            prepared.push({
                index,
                value: prepareWebObservation_(
                    spreadsheet,
                    payload,
                    plantRecords
                ),
            });
        } catch (error) {
            results[index] = {
                ok: false,
                requestId: requestIds[index],
                plantId: cleanText_(payload && payload.plantId),
                retryable: false,
                errorCode: "VALIDATION",
                message: error instanceof Error ? error.message : String(error),
            };
        }
    });

    /* v8 ignore next -- All-invalid and writable mixed batches are both covered; VM coverage reports a synthetic alternate branch. */
    if (!prepared.length) {
        return batchObservationResult_(results);
    }

    const preparedAt = Date.now();
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(GARDEN_LOGGER.lockTimeoutMs)) {
        throw new Error(
            "Another reading is finishing. The queue remains on this phone; wait a few seconds and send it again."
        );
    }

    const lockedAt = Date.now();
    let writeTiming = {
        validationCleanupMs: 0,
        validationRowsCleared: 0,
        historyWriteMs: 0,
    };
    try {
        writeTiming = appendPreparedWebObservationBatch_(
            spreadsheet,
            prepared,
            results
        );
        prepared
            .filter(
                (item) =>
                    results[item.index] &&
                    results[item.index].ok &&
                    item.value.observation.eventNames.includes("Repot")
            )
            .forEach((item) =>
                updateBaselinePotSetup_(
                    spreadsheet,
                    item.value.observation.plantId,
                    item.value.observation.potSetup
                )
            );
    } finally {
        const flushStartedAt = Date.now();
        try {
            flushAndReleaseLock_(lock);
        } finally {
            const completedAt = Date.now();
            const completedResults = results.filter(Boolean);
            console.info(
                JSON.stringify({
                    loggerVersion: GARDEN_LOGGER.version,
                    operation: "saveWebObservationBatch",
                    requestedCount: payloads.length,
                    newRowCount: completedResults.reduce(
                        (count, result) =>
                            count +
                            (result.ok && !result.duplicate
                                ? result.historyRows
                                : 0),
                        0
                    ),
                    duplicateCount: completedResults.filter(
                        (result) => result.ok && result.duplicate
                    ).length,
                    failureCount:
                        payloads.length -
                        completedResults.filter((result) => result.ok).length,
                    prepareMs: preparedAt - startedAt,
                    lockWaitMs: lockedAt - preparedAt,
                    validationCleanupMs: writeTiming.validationCleanupMs,
                    validationRowsCleared: writeTiming.validationRowsCleared,
                    historyWriteMs: writeTiming.historyWriteMs,
                    flushMs: completedAt - flushStartedAt,
                    elapsedMs: completedAt - startedAt,
                })
            );
        }
    }

    const batchResult = batchObservationResult_(results);
    return batchResult;
}

function batchObservationResult_(results) {
    const savedCount = results.filter((result) => result.ok).length;
    return {
        ok: savedCount === results.length,
        savedCount,
        failedCount: results.length - savedCount,
        results,
        message:
            savedCount === results.length
                ? `${savedCount} queued observation${savedCount === 1 ? "" : "s"} saved.`
                : `${savedCount} queued observation${savedCount === 1 ? "" : "s"} saved; ${results.length - savedCount} still need attention.`,
    };
}

function appendPreparedWebObservationBatch_(spreadsheet, items, results) {
    const history = requireSheet_(spreadsheet, GARDEN_LOGGER.historySheet);
    prepareHistoryForObservationWrites_(history);
    const snapshot = historyObservationSnapshot_(history);
    let nextRow = Math.max(snapshot.lastReservedRow + 1, 2);
    const repairs = [];
    const newRows = [];
    let newRowsStart = 0;
    const pendingResults = [];
    const writeTiming = {
        validationCleanupMs: 0,
        validationRowsCleared: 0,
        historyWriteMs: 0,
    };

    items.forEach(({ index, value: prepared }) => {
        const input = prepared.observation;
        const requestId = input.requestId;
        try {
            const existing = snapshot.rowsByRequest.get(requestId) || [];
            /* New request IDs and existing retry IDs are both covered; V8 reports a synthetic alternate branch. */
            /* v8 ignore else */
            if (existing.length) {
                const existingResult = existingObservationResult_(
                    input,
                    requestId,
                    existing.map((entry) => entry.rowNumber),
                    existing.map((entry) => entry.values)
                );
                /* Complete retries and incomplete reservations are both covered; V8 reports a synthetic alternate branch. */
                /* v8 ignore else */
                if (existingResult) {
                    results[index] = webObservationResult_(
                        prepared,
                        existingResult
                    );
                    return;
                }
            }

            const targetRow = existing.length ? existing[0].rowNumber : nextRow;
            const recordedAt = new Date();
            const storedRows = storedObservationRows_(
                input,
                requestId,
                targetRow,
                recordedAt
            );
            if (existing.length) {
                repairs.push({ targetRow, storedRows });
            } else {
                if (!newRowsStart) newRowsStart = targetRow;
                newRows.push(...storedRows);
                nextRow += storedRows.length;
            }
            pendingResults.push({
                index,
                prepared,
                result: observationWriteResult_(
                    input,
                    requestId,
                    targetRow,
                    recordedAt,
                    false
                ),
            });
        } catch (error) {
            results[index] = {
                ok: false,
                requestId,
                plantId: input.plantId,
                plantName: prepared.plant.name,
                retryable: false,
                errorCode: "HISTORY_CONFLICT",
                message: error instanceof Error ? error.message : String(error),
            };
        }
    });

    repairs.forEach(({ targetRow, storedRows }) => {
        const timing = writeStoredObservationRows_(
            history,
            targetRow,
            storedRows
        );
        writeTiming.validationCleanupMs += timing.validationCleanupMs;
        writeTiming.validationRowsCleared += timing.validationRowsCleared;
        writeTiming.historyWriteMs += timing.historyWriteMs;
    });
    /* v8 ignore next -- New-row and duplicate-or-repair-only batches are both covered; VM coverage reports a synthetic alternate branch. */
    if (newRows.length) {
        const timing = writeStoredObservationRows_(
            history,
            newRowsStart,
            newRows
        );
        writeTiming.validationCleanupMs += timing.validationCleanupMs;
        writeTiming.validationRowsCleared += timing.validationRowsCleared;
        writeTiming.historyWriteMs += timing.historyWriteMs;
    }
    pendingResults.forEach(({ index, prepared, result }) => {
        results[index] = webObservationResult_(prepared, result);
    });
    return writeTiming;
}

function historyObservationSnapshot_(history) {
    const rowCount = Math.max(0, history.getLastRow() - 1);
    const rowsByRequest = new Map();
    /* v8 ignore next -- Empty and populated History snapshots are both tested; V8 reports a synthetic alternate branch. */
    if (!rowCount) return { lastReservedRow: 1, rowsByRequest };

    const storedRows = history
        .getRange(2, 1, rowCount, GARDEN_LOGGER.historyStoredColumns)
        .getValues();
    let lastReservedRow = 1;
    storedRows.forEach((values, index) => {
        const rowNumber = index + 2;
        const requestId = cleanText_(values[GARDEN_LOGGER.requestIdColumn - 1]);
        if (cleanText_(values[0]) || cleanText_(values[1]) || requestId) {
            lastReservedRow = rowNumber;
        }
        /* v8 ignore next -- Reserved rows with and without request IDs are both covered; VM coverage reports a synthetic alternate branch. */
        if (!requestId) return;

        if (!rowsByRequest.has(requestId)) rowsByRequest.set(requestId, []);
        rowsByRequest.get(requestId).push({ rowNumber, values });
    });
    return { lastReservedRow, rowsByRequest };
}

function saveBulkCareObservation(payload) {
    const spreadsheet = getGardenSpreadsheet_();
    const plantIds = uniqueTextValues_(
        Array.isArray(payload && payload.plantIds) ? payload.plantIds : []
    );
    if (!plantIds.length) throw new Error("Choose at least one plant.");

    const eventNames = normalizeBulkWebEvents_(payload && payload.events);
    const entrySource = normalizeWebEntrySource_(
        (payload && payload.entrySource) || "Mobile bulk care"
    );

    const plantRecords = plantRecordsById_(spreadsheet);
    const plants = plantIds.map((plantId) => {
        const plant = plantRecords.get(plantId);
        /* v8 ignore next -- Valid and invalid bulk-watering plant IDs are both tested; V8 reports a synthetic alternate branch. */
        if (!plant) throw new Error(`Plant ID ${plantId} is not valid.`);
        return plant;
    });
    const details = eventDetailsFromPayload_(payload, eventNames, null);
    const notes = cleanText_(payload && payload.notes);
    const observationDate = normalizeDate_(payload && payload.observedAt);
    const baseRequestId = normalizeRequestId_(
        payload && payload.requestId,
        true
    );
    let batch;
    try {
        batch = saveWebObservationBatch(
            plants.map((plant) => ({
                requestId: `${baseRequestId.slice(0, 88)}-${plant.id}`,
                observedAt: observationDate,
                plantId: plant.id,
                events: eventNames,
                notes,
                nutrientsUsed: details.nutrientsUsed,
                nutrientProduct: details.nutrientProduct,
                nutrientAmount: details.nutrientAmount,
                condition: cleanText_(payload && payload.condition),
                soilMoisture: cleanText_(payload && payload.soilMoisture),
                pestIssue: details.pestIssue,
                pestTreatment: details.pestTreatment,
                rotationDegrees: details.rotationDegrees,
                entrySource,
            }))
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("Another reading is finishing")) {
            throw new Error(
                "Another reading is finishing. The bulk-care round remains on this screen; wait a few seconds and save again."
            );
        }
        throw error;
    }
    const failedIndex = batch.results.findIndex(
        (result) => !result || !result.ok
    );
    /* v8 ignore else -- Success and per-entry failure responses are both covered; V8 reports a synthetic alternate branch. */
    if (failedIndex >= 0) {
        const failed = batch.results[failedIndex];
        throw new Error(
            (failed && failed.message) ||
                "The bulk-care round could not be saved. Try again with the same round."
        );
    }

    const duplicates = batch.results.filter(
        (result) => result.duplicate
    ).length;
    let message;
    if (duplicates === plants.length) {
        message = `This ${plants.length}-plant ${eventNames.join(" + ")} round was already saved. No duplicates were added.`;
    } else {
        const plantSuffix = plants.length === 1 ? "" : "s";
        message = `${eventNames.join(" + ")} saved for ${plants.length} plant${plantSuffix}.`;
    }
    return {
        ok: true,
        plantCount: plants.length,
        duplicateCount: duplicates,
        events: eventNames,
        message,
    };
}

function normalizeBulkWebEvents_(events) {
    const requested = uniqueTextValues_(Array.isArray(events) ? events : []);
    /* v8 ignore else -- Empty and populated event lists are both covered; V8 reports a synthetic alternate branch. */
    if (!requested.length) {
        throw new Error("Choose at least one bulk-care event.");
    }
    const invalid = requested.filter(
        (eventName) => !BULK_WEB_EVENT_OPTIONS.includes(eventName)
    );
    /* v8 ignore else -- Supported and unsupported bulk events are both covered; V8 reports a synthetic alternate branch. */
    if (invalid.length) {
        throw new Error(
            `Bulk care supports only: ${BULK_WEB_EVENT_OPTIONS.join(", ")}.`
        );
    }
    return BULK_WEB_EVENT_OPTIONS.filter((eventName) =>
        requested.includes(eventName)
    );
}

// Backward-compatible endpoint for logger tabs opened before 5.12.0.
function saveBulkWaterObservation(payload) {
    return saveBulkCareObservation({
        ...payload,
        events: ["Water"],
        entrySource: "Mobile bulk water",
    });
}

function getRecentWebObservations(limit) {
    const spreadsheet = getGardenSpreadsheet_();
    return getRecentObservations_(
        spreadsheet,
        spreadsheet.getSpreadsheetTimeZone(),
        normalizeRecentLimit_(limit)
    );
}

/**
 * Checks whether a browser save request reached History after its callback was
 * lost. The browser keeps the same request ID across retries, so this read lets
 * it clear an already-saved draft without asking the user to discard it.
 */
function getWebSaveStatus(payload) {
    const spreadsheet = getGardenSpreadsheet_();
    const history = requireSheet_(spreadsheet, GARDEN_LOGGER.historySheet);
    assertHeaders_(history, HISTORY_HEADERS, 1);
    ensureHistoryRequestIdColumn_(history);

    const requestId = normalizeRequestId_(payload && payload.requestId, true);
    const plantIds = uniqueTextValues_(
        Array.isArray(payload && payload.plantIds) ? payload.plantIds : []
    );
    const requestIds = plantIds.length
        ? plantIds.map((plantId) => `${requestId.slice(0, 88)}-${plantId}`)
        : [requestId];
    const requests = requestIds.map((candidateId) =>
        savedRequestStatus_(history, candidateId)
    );
    const savedCount = requests.filter(
        (request) => request.state === "saved"
    ).length;
    let state = "missing";
    if (savedCount === requestIds.length) {
        state = "saved";
    } else if (
        savedCount > 0 ||
        requests.some((request) => request.state === "incomplete")
    ) {
        state = "partial";
    }

    let message =
        "This request is not in History yet. Retry with the same entry to save it safely.";
    if (state === "saved") {
        message = "The entry is already in History.";
    } else if (state === "partial") {
        message =
            "Part of this request reached History. Retry with the same entry to finish it safely.";
    }

    return {
        state,
        requestId,
        expectedCount: requestIds.length,
        savedCount,
        message,
    };
}

function getWebBatchSaveStatus(requests) {
    if (!Array.isArray(requests) || requests.length > 50) {
        throw new Error("Provide up to 50 queued request IDs.");
    }
    const normalized = requests.map(normalizeBatchStatusRequest_);
    if (
        new Set(normalized.map(({ requestId }) => requestId)).size !==
        normalized.length
    ) {
        throw new Error("Queued request IDs must be unique.");
    }

    const spreadsheet = getGardenSpreadsheet_();
    const history = requireSheet_(spreadsheet, GARDEN_LOGGER.historySheet);
    assertHeaders_(history, HISTORY_HEADERS, 1);
    ensureHistoryRequestIdColumn_(history);
    const snapshot = historyObservationSnapshot_(history);
    return normalized.map((request) =>
        savedRequestStatusFromSnapshot_(snapshot, request)
    );
}

function normalizeBatchStatusRequest_(request) {
    /* v8 ignore next -- Legacy string IDs and structured status descriptors are both covered; VM coverage reports a synthetic alternate branch. */
    if (typeof request === "string") {
        return { requestId: normalizeRequestId_(request, true) };
    }
    const requestId = normalizeRequestId_(request && request.requestId, true);
    const plantId = cleanText_(request && request.plantId);
    const rawExpectedCount = request && request.expectedCount;
    if (rawExpectedCount === undefined || rawExpectedCount === null) {
        return { requestId, plantId };
    }
    const expectedCount = Number(rawExpectedCount);
    if (
        !Number.isInteger(expectedCount) ||
        expectedCount < 1 ||
        expectedCount > WEB_EVENT_OPTIONS.length + 1
    ) {
        throw new Error(
            `Expected History rows must be an integer from 1 to ${WEB_EVENT_OPTIONS.length + 1}.`
        );
    }
    return { requestId, plantId, expectedCount };
}

function savedRequestStatusFromSnapshot_(snapshot, request) {
    const entries = snapshot.rowsByRequest.get(request.requestId) || [];
    const expectedCount = request.expectedCount;
    const includeShape =
        Boolean(request.plantId) || expectedCount !== undefined;
    /* v8 ignore next -- Missing and present request IDs are both tested; V8 reports a synthetic alternate branch. */
    if (!entries.length) {
        return {
            state: "missing",
            requestId: request.requestId,
            ...(includeShape ? { savedCount: 0 } : {}),
            ...(expectedCount !== undefined ? { expectedCount } : {}),
        };
    }

    const contiguous = entries.every(
        (entry, index) => entry.rowNumber === entries[0].rowNumber + index
    );
    const completeEntries = entries.filter(
        ({ values }) =>
            values[0] instanceof Date &&
            cleanText_(values[1]) &&
            cleanText_(values[2]) &&
            (!request.plantId || cleanText_(values[1]) === request.plantId)
    );
    const expectedShape =
        (expectedCount === undefined || entries.length === expectedCount) &&
        completeEntries.length === entries.length;
    const state = contiguous && expectedShape ? "saved" : "incomplete";
    return {
        state,
        requestId: request.requestId,
        ...(includeShape ? { savedCount: completeEntries.length } : {}),
        ...(expectedCount !== undefined ? { expectedCount } : {}),
    };
}

function onEdit(event) {
    if (!event || !event.range) return;

    const range = event.range;
    const sheet = range.getSheet();
    if (sheet.getName() !== GARDEN_LOGGER.quickLogSheet) return;

    if (
        range.getRow() === GARDEN_LOGGER.bulkControlRow &&
        range.getColumn() === GARDEN_LOGGER.saveColumn &&
        event.value === "TRUE"
    ) {
        applyBulkEvent_(sheet);
        return;
    }

    if (
        range.getRow() >= GARDEN_LOGGER.firstInputRow &&
        range.getLastRow() >= GARDEN_LOGGER.firstInputRow
    ) {
        stampEntryStartedAt_(sheet, range);
        if (range.getNumRows() === 1 && range.getNumColumns() === 1) {
            updateInferredEvent_(sheet, range.getRow(), range.getColumn());
        }
    }

    if (
        range.getRow() < GARDEN_LOGGER.firstInputRow ||
        range.getColumn() !== GARDEN_LOGGER.saveColumn ||
        event.value !== "TRUE"
    ) {
        return;
    }

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(GARDEN_LOGGER.lockTimeoutMs)) {
        markSaveError_(
            range,
            "Another reading is finishing. This row was not cleared; wait a few seconds and tap Save again."
        );
        return;
    }

    try {
        archiveQuickLogRow_(sheet, range.getRow());
    } catch (error) {
        markSaveError_(
            range,
            error instanceof Error ? error.message : String(error)
        );
    } finally {
        flushAndReleaseLock_(lock);
    }
}

function installGardenLogger() {
    const spreadsheet = SpreadsheetApp.getActive();
    const quickLog = requireSheet_(spreadsheet, GARDEN_LOGGER.quickLogSheet);
    const history = requireSheet_(spreadsheet, GARDEN_LOGGER.historySheet);

    assertHeaders_(quickLog, QUICK_LOG_HEADERS, GARDEN_LOGGER.headerRow);
    assertHeaders_(history, HISTORY_HEADERS, 1);
    const scriptTimeZone = Session.getScriptTimeZone();
    const spreadsheetTimeZone = spreadsheet.getSpreadsheetTimeZone();
    if (scriptTimeZone !== spreadsheetTimeZone) {
        throw new Error(
            `Apps Script timezone (${scriptTimeZone}) must match the spreadsheet timezone (${spreadsheetTimeZone}).`
        );
    }
    const bootstrap = getWebAppBootstrap();
    assertUniquePlantIds_(bootstrap.plants);
    ensureHistoryRequestIdColumn_(history);
    ensureHistoryDetailColumns_(history);
    ensureHistoryProvenanceColumns_(history);
    ensureHistoryMeasurementColumns_(history, true);
    ensureHistoryRotationColumns_(history, true);
    const appEntries = requireSheet_(
        spreadsheet,
        GARDEN_LOGGER.appSheetEntriesSheet
    );
    ensureAppSheetEntryColumns_(appEntries, true);
    ensureQuickLogValidations_(quickLog);
    ensureWarningOnlyProtection_(
        quickLog,
        GARDEN_LOGGER.firstInputRow,
        1,
        bootstrap.plants.length,
        2,
        "Garden logger managed Quick log identity columns (A:B)"
    );
    const historyDataRows = Math.max(1, history.getMaxRows() - 1);
    ensureWarningOnlyProtection_(
        history,
        2,
        GARDEN_LOGGER.historyHelperStartColumn,
        historyDataRows,
        GARDEN_LOGGER.historyHelperColumns,
        "Garden logger derived helper formulas (M:O)"
    );
    ensureWarningOnlyProtection_(
        history,
        2,
        GARDEN_LOGGER.requestIdColumn,
        historyDataRows,
        1,
        "Garden logger retry keys (P)"
    );
    ensureWarningOnlyProtection_(
        history,
        2,
        GARDEN_LOGGER.historyProvenanceStartColumn,
        historyDataRows,
        6,
        "Garden logger observation identity and correction provenance (AA:AF)"
    );
    ensureWarningOnlyProtection_(
        history,
        2,
        GARDEN_LOGGER.historyProvenanceStartColumn +
            GARDEN_LOGGER.historyProvenanceColumns -
            1,
        historyDataRows,
        1,
        "Garden logger active/removed record status (AJ)"
    );
    ensureWarningOnlyProtection_(
        history,
        2,
        GARDEN_LOGGER.historyMeasurementStartColumn + 1,
        historyDataRows,
        2,
        "Garden logger derived inch conversions (AL:AM)"
    );
    history.hideColumns(GARDEN_LOGGER.requestIdColumn);
    history.hideColumns(GARDEN_LOGGER.historyProvenanceStartColumn, 6);

    PropertiesService.getDocumentProperties().setProperties({
        gardenLoggerVersion: GARDEN_LOGGER.version,
        gardenLoggerInstalledAt: new Date().toISOString(),
    });

    quickLog
        .getRange("E4")
        .setNote(
            "Optional main event. Wet describes a weight without creating a Water event; weight infers Weigh; height or width infers Measure."
        );
    quickLog
        .getRange("D4")
        .setNote(
            "Automatically stamped when the first unsaved entry is made on this plant row. You can edit it for a backdated observation."
        );
    quickLog
        .getRange("C4")
        .setNote(
            `Garden logger ${GARDEN_LOGGER.version} verified. One Save tap can archive multiple event rows.`
        );
    spreadsheet.toast(
        `Logger ${GARDEN_LOGGER.version} is ready. Wet weights are independent from watering, and rotations default to 90° when selected.`,
        "Garden logger verified",
        6
    );
}

function installAppSheetIntake() {
    const spreadsheet = getGardenSpreadsheet_();
    const entries = requireSheet_(
        spreadsheet,
        GARDEN_LOGGER.appSheetEntriesSheet
    );
    const entryColumnsChanged = ensureAppSheetEntryColumns_(entries, true);
    const bulk = installAppSheetBulkSheet();
    return { entryColumnsChanged, bulk };
}

function openQuickLog() {
    activateSheet_(GARDEN_LOGGER.quickLogSheet, "D5");
}

function openHistory() {
    activateSheet_(GARDEN_LOGGER.historySheet, "A2");
}

/**
 * Excludes selected observations from analysis without destroying their audit
 * trail. The source values, retry key, event details, and formulas stay intact.
 */
function removeSelectedHistoryObservations() {
    const spreadsheet = SpreadsheetApp.getActive();
    const history = requireSheet_(spreadsheet, GARDEN_LOGGER.historySheet);
    const activeSheet = spreadsheet.getActiveSheet();
    const selection = spreadsheet.getActiveRange();
    if (!selection || activeSheet.getName() !== GARDEN_LOGGER.historySheet) {
        spreadsheet.toast(
            "Select one or more observation rows on History first.",
            "Nothing removed",
            6
        );
        return;
    }

    const firstRow = Math.max(2, selection.getRow());
    const lastRow = selection.getLastRow();
    /* v8 ignore next -- Header-only and data-row selections are both tested; V8 reports a synthetic alternate branch. */
    if (firstRow > lastRow) {
        spreadsheet.toast(
            "The History header cannot be removed.",
            "Nothing removed",
            6
        );
        return;
    }
    /* Both large selections and ordinary selections are covered. */
    /* istanbul ignore else */
    if (lastRow - firstRow + 1 > 100) {
        throw new Error("Remove no more than 100 History rows at once.");
    }

    const values = history
        .getRange(
            firstRow,
            1,
            lastRow - firstRow + 1,
            GARDEN_LOGGER.historyColumns
        )
        .getDisplayValues();
    const observations = values
        .map((row, index) => ({ rowNumber: firstRow + index, values: row }))
        .filter(({ values: row }) =>
            row.slice(0, GARDEN_LOGGER.historyColumns).some(cleanText_)
        );
    /* v8 ignore next -- Empty and populated selections are both tested; V8 reports a synthetic alternate branch. */
    if (!observations.length) {
        spreadsheet.toast(
            "The selected History rows do not contain observations.",
            "Nothing removed",
            6
        );
        return;
    }

    const preview = observations
        .slice(0, 8)
        .map(
            ({ rowNumber, values: row }) =>
                `Row ${rowNumber}: ${[
                    row[0],
                    row[1],
                    row[2],
                    row[4] && `${row[4]} g`,
                ]
                    .filter(Boolean)
                    .join(" · ")}`
        )
        .join("\n");
    const overflow =
        observations.length > 8
            ? `\n…and ${observations.length - 8} more selected observation(s).`
            : "";
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
        `Exclude ${observations.length} History observation${observations.length === 1 ? "" : "s"} from analysis?`,
        `${preview}${overflow}\n\nThe original record will be preserved. Its status will become Removed and the correction reason will be timestamped for auditability.`,
        ui.ButtonSet.YES_NO
    );
    /* Confirmation and cancellation are both covered. */
    /* istanbul ignore else */
    if (response !== ui.Button.YES) return;

    ensureHistoryProvenanceColumns_(history);
    const provenance = history
        .getRange(
            firstRow,
            GARDEN_LOGGER.historyProvenanceStartColumn,
            lastRow - firstRow + 1,
            GARDEN_LOGGER.historyProvenanceColumns
        )
        .getValues();
    const removedAt = Utilities.formatDate(
        new Date(),
        spreadsheet.getSpreadsheetTimeZone(),
        "yyyy-MM-dd HH:mm:ss z"
    );
    const observationRows = new Set(
        observations.map(({ rowNumber }) => rowNumber)
    );
    provenance.forEach((row, index) => {
        if (!observationRows.has(firstRow + index)) return;
        row[5] = `Excluded from active analysis through the Garden logger menu on ${removedAt}.`;
        row[9] = "Removed";
    });
    history
        .getRange(
            firstRow,
            GARDEN_LOGGER.historyProvenanceStartColumn,
            provenance.length,
            GARDEN_LOGGER.historyProvenanceColumns
        )
        .setValues(provenance);
    spreadsheet.toast(
        `${observations.length} observation${observations.length === 1 ? "" : "s"} excluded with its audit trail preserved. Derived views will recalculate.`,
        "History corrected",
        7
    );
}

function archiveQuickLogRow_(quickLog, rowNumber) {
    const spreadsheet = quickLog.getParent();

    const rowRange = quickLog.getRange(
        rowNumber,
        1,
        1,
        QUICK_LOG_HEADERS.length
    );
    const values = rowRange.getValues()[0];
    const [
        labelId,
        ,
        ,
        dateInput,
        eventInput,
        weightStateInput,
        weightInput,
        heightInput,
        widthInput,
        conditionInput,
        notesInput,
        potSetupInput,
        measurementUnitInput,
    ] = values;

    const id = cleanText_(labelId);
    /* v8 ignore next -- Missing-ID rejection and valid-row archival are both tested; V8 reports a synthetic alternate branch. */
    if (!id) throw new Error("This row has no Plant ID.");

    const weight = optionalPositiveNumber_(weightInput, "Weight");
    const heightEntered = optionalPositiveNumber_(heightInput, "Height");
    const widthEntered = optionalPositiveNumber_(widthInput, "Width");
    const condition = cleanText_(conditionInput);
    const notes = cleanText_(notesInput);
    const selectedEvent = cleanText_(eventInput);
    let weightState = cleanText_(weightStateInput);

    if (selectedEvent && !WEB_EVENT_OPTIONS.includes(selectedEvent)) {
        throw new Error(
            `Event must be one of: ${WEB_EVENT_OPTIONS.join(", ")}.`
        );
    }
    if (weightState && !WEIGHT_STATE_OPTIONS.includes(weightState)) {
        throw new Error("Weight state must be Dry, Wet, or Routine.");
    }

    if (weight === "" && weightState) {
        throw new Error(
            "Weight state was selected, but no weight was entered."
        );
    }
    if (weight !== "" && !weightState) weightState = "Routine";
    if (selectedEvent === "Weigh" && weight === "") {
        throw new Error("Weigh was selected, but no weight was entered.");
    }
    if (
        selectedEvent === "Measure" &&
        heightEntered === "" &&
        widthEntered === ""
    ) {
        throw new Error(
            "Measure was selected, but no height or width was entered."
        );
    }

    const eventNames = buildEventNames_(
        selectedEvent,
        weightState,
        weight,
        heightEntered,
        widthEntered,
        condition,
        notes
    );
    const measurementUnit = normalizeMeasurementUnit_(
        measurementUnitInput,
        eventNames,
        "in"
    );
    const height = measurementToCentimeters_(heightEntered, measurementUnit);
    const width = measurementToCentimeters_(widthEntered, measurementUnit);
    const potSetup = positiveInteger_(potSetupInput || 1, "Pot setup");
    const observationDate = normalizeDate_(dateInput);
    const currentLabel = currentLabelForPlant_(spreadsheet, id);
    const result = appendObservation_(spreadsheet, {
        plantId: id,
        eventNames,
        observationDate,
        weightState,
        weight,
        height,
        width,
        condition,
        soilMoisture: "",
        medium: "",
        notes,
        potSetup,
        currentLabel,
        requestId: Utilities.getUuid(),
        entrySource: "Quick log",
        measurementQuality: eventNames.includes("Measure") ? "Estimated" : "",
        measurementMethod: eventNames.includes("Measure") ? "Unspecified" : "",
        measurementUnit,
    });

    quickLog.getRange(rowNumber, 4, 1, 8).clearContent();
    const saveCell = quickLog.getRange(rowNumber, GARDEN_LOGGER.saveColumn);
    saveCell.setValue(false);
    saveCell.setBackground("#dcebdd");

    const eventSummary = eventNames.join(" + ");
    saveCell.setNote(
        `Saved ${eventSummary} for ${id} at ${Utilities.formatDate(
            result.recordedAt,
            spreadsheet.getSpreadsheetTimeZone(),
            "M/d/yyyy h:mm:ss a"
        )}.`
    );

    spreadsheet.toast(
        `${eventSummary} saved for ${id}. ${result.historyRows} History row${
            result.historyRows === 1 ? "" : "s"
        } added.`,
        "Observation archived",
        6
    );
}

function appendObservation_(spreadsheet, input) {
    const history = requireSheet_(spreadsheet, GARDEN_LOGGER.historySheet);
    prepareHistoryForObservationWrites_(history);

    const requestId = normalizeRequestId_(input.requestId);
    const existingRequestRows = historyRowsForRequest_(history, requestId);
    if (existingRequestRows.length) {
        const existingValues = history
            .getRange(
                existingRequestRows[0],
                1,
                existingRequestRows.length,
                GARDEN_LOGGER.historyStoredColumns
            )
            .getValues();
        const existingResult = existingObservationResult_(
            input,
            requestId,
            existingRequestRows,
            existingValues
        );
        if (existingResult) return existingResult;
    }

    const targetRow = existingRequestRows.length
        ? existingRequestRows[0]
        : Math.max(lastHistoryReservedRow_(history) + 1, 2);
    const recordedAt = new Date();
    const storedRows = storedObservationRows_(
        input,
        requestId,
        targetRow,
        recordedAt
    );
    writeStoredObservationRows_(history, targetRow, storedRows);
    return observationWriteResult_(
        input,
        requestId,
        targetRow,
        recordedAt,
        false
    );
}

function prepareHistoryForObservationWrites_(history) {
    assertHeaders_(history, HISTORY_HEADERS, 1);
    ensureHistoryGrid_(history);
    ensureHistoryRequestIdColumn_(history);
    ensureHistoryDetailColumns_(history);
    ensureHistoryProvenanceColumns_(history);
    ensureHistoryMeasurementColumns_(history);
    ensureHistoryRotationColumns_(history);
}

function existingObservationResult_(
    input,
    requestId,
    existingRequestRows,
    existingValues
) {
    const expectedRows = input.eventNames.length;
    const firstRow = existingRequestRows[0];
    const contiguous = existingRequestRows.every(
        (rowNumber, index) => rowNumber === firstRow + index
    );
    /* v8 ignore next -- Wrong-length and noncontiguous request shapes are both covered; V8 reports a synthetic alternate branch. */
    if (existingRequestRows.length !== expectedRows || !contiguous) {
        throw new Error(
            "This saved request has an unexpected History shape. Open History and check the newest rows before retrying."
        );
    }

    const complete = existingValues.every(
        (row) =>
            row[0] instanceof Date && cleanText_(row[1]) && cleanText_(row[2])
    );
    /* v8 ignore next -- Complete retries and incomplete reservations are both tested; V8 reports a synthetic alternate branch. */
    if (!complete) return null;

    const recordedAt =
        existingValues[0][9] instanceof Date
            ? existingValues[0][9]
            : new Date();
    const expectedValues = storedObservationRows_(
        input,
        requestId,
        firstRow,
        recordedAt
    );
    const sameRequest = existingValues.every((row, index) =>
        sameCanonicalObservationRow_(row, expectedValues[index])
    );
    /* v8 ignore next -- Exact retries and changed-payload conflicts are both covered; V8 reports a synthetic alternate branch. */
    if (!sameRequest) {
        throw new Error(
            "This retry no longer matches the entry that was already saved. Refresh to restore the pending entry."
        );
    }
    return observationWriteResult_(
        input,
        requestId,
        firstRow,
        recordedAt,
        true,
        existingValues[0][0],
        positiveInteger_(
            existingValues[0][10] || input.potSetup || 1,
            "Pot setup"
        )
    );
}

function sameCanonicalObservationRow_(actual, expected) {
    // Formula helpers, recorded-at timestamps, mutable plant metadata, the
    // derived previous-pot value, record status, and inch formulas are not
    // part of the browser request. Everything else below is canonical user
    // input or request provenance and must still match for an idempotent retry.
    const comparableColumns = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 15, 16, 17, 18, 20, 21, 22, 23, 24, 25, 26,
        27, 28, 29, 30, 31, 32, 33, 34, 36, 39,
    ];
    return comparableColumns.every(
        (index) =>
            comparableHistoryValue_(actual[index]) ===
            comparableHistoryValue_(expected[index])
    );
}

function comparableHistoryValue_(value) {
    /* v8 ignore next -- Date and scalar comparisons are both covered; V8 reports a synthetic alternate branch. */
    if (value instanceof Date) return value.getTime();
    return value === null || value === undefined ? "" : String(value).trim();
}

function storedObservationRows_(input, requestId, targetRow, recordedAt) {
    const safeCondition = safeSheetText_(input.condition);
    const safeNotes = safeSheetText_(input.notes);
    const safeCurrentLabel = safeSheetText_(input.currentLabel);
    const details = input.details || {};
    return input.eventNames.map((eventName, index) => {
        const rowNumber = targetRow + index;
        const primaryEvent = index === 0;
        const core = [
            input.observationDate,
            input.plantId,
            eventName,
            eventName === "Weigh" ? input.weightState : "",
            eventName === "Weigh" ? input.weight : "",
            eventName === "Measure" ? input.height : "",
            eventName === "Measure" ? input.width : "",
            eventName === "Check" ? safeCondition : "",
            primaryEvent ? safeNotes : "",
            recordedAt,
            input.potSetup,
            safeCurrentLabel,
        ];
        const detail = [
            eventName === "Water" ? safeSheetText_(details.nutrientsUsed) : "",
            eventName === "Water"
                ? safeSheetText_(details.nutrientProduct)
                : "",
            eventName === "Water" ? safeSheetText_(details.nutrientAmount) : "",
            eventName === "Repot"
                ? safeSheetText_(details.previousPotSize)
                : "",
            eventName === "Repot" ? safeSheetText_(details.potSize) : "",
            eventName === "Flower" ? details.flowerCount : "",
            eventName === "Flower" ? safeSheetText_(details.flowerDetails) : "",
            eventName === "Photo" ? safeSheetText_(details.photoUrl) : "",
            eventName === "Pest" ? safeSheetText_(details.pestIssue) : "",
            eventName === "Pest" ? safeSheetText_(details.pestTreatment) : "",
        ];
        return [
            ...core,
            ...historyHelperFormulas_(rowNumber),
            requestId,
            ...detail,
            ...historyProvenanceRow_(input, requestId, eventName, index),
            ...historyMeasurementRow_(input, eventName, rowNumber),
            ...historyRotationRow_(input, eventName),
        ];
    });
}

function writeStoredObservationRows_(history, targetRow, storedRows) {
    const requiredLastRow = targetRow + storedRows.length - 1;
    if (requiredLastRow > history.getMaxRows()) {
        history.insertRowsAfter(
            history.getMaxRows(),
            requiredLastRow - history.getMaxRows()
        );
    }
    const validationStartedAt = Date.now();
    const validationRowsCleared = clearUnexpectedMeasurementValidations_(
        history,
        targetRow,
        storedRows.length
    )
        ? storedRows.length
        : 0;
    const validationCompletedAt = Date.now();
    history
        .getRange(
            targetRow,
            1,
            storedRows.length,
            GARDEN_LOGGER.historyStoredColumns
        )
        .setValues(storedRows);
    history
        .getRange(targetRow, 1, storedRows.length, 1)
        .setNumberFormat("M/d/yyyy h:mm am/pm");
    history
        .getRange(targetRow, 10, storedRows.length, 1)
        .setNumberFormat("M/d/yyyy h:mm:ss am/pm");
    return {
        validationCleanupMs: validationCompletedAt - validationStartedAt,
        validationRowsCleared,
        historyWriteMs: Date.now() - validationCompletedAt,
    };
}

function clearUnexpectedMeasurementValidations_(history, targetRow, rowCount) {
    const range = history.getRange(
        targetRow,
        GARDEN_LOGGER.historyMeasurementStartColumn + 1,
        rowCount,
        2
    );
    const validations = range.getDataValidations();
    const unexpected = validations.some((row) =>
        row.some((validation) => Boolean(validation))
    );
    if (unexpected) range.clearDataValidations();
    return unexpected;
}

function observationWriteResult_(
    input,
    requestId,
    targetRow,
    recordedAt,
    duplicate,
    observationDate = input.observationDate,
    potSetup = input.potSetup
) {
    return {
        duplicate,
        requestId,
        eventNames: [...input.eventNames],
        historyRows: input.eventNames.length,
        observationDate,
        potSetup,
        recordedAt,
        targetRow,
    };
}

function historyHelperFormulas_(rowNumber) {
    const lastRow = GARDEN_LOGGER.historyCapacityRows;
    return [
        `=IF(B${rowNumber}="","",IFNA(XLOOKUP(B${rowNumber},'Plant tracker'!$A$2:$A$100,'Plant tracker'!$B$2:$B$100)&IF(L${rowNumber}<>""," · "&L${rowNumber},""),B${rowNumber}))`,
        `=IF(OR(B${rowNumber}="",E${rowNumber}="",K${rowNumber}=""),"",LET(anchor,IFNA(MAX(FILTER($A$2:$A$${lastRow},$B$2:$B$${lastRow}=B${rowNumber},$K$2:$K$${lastRow}=K${rowNumber},$A$2:$A$${lastRow}<=A${rowNumber},REGEXMATCH($C$2:$C$${lastRow},"^(Water|Repot)$"),$AJ$2:$AJ$${lastRow}<>"Removed")),0),IF(anchor=0,"",anchor)))`,
        `=IF(OR(A${rowNumber}="",N${rowNumber}=""),"",A${rowNumber}-N${rowNumber})`,
    ];
}

function historyProvenanceRow_(input, requestId, eventName, eventIndex) {
    const measurementQuality = cleanText_(input.measurementQuality);
    const measurementMethod = cleanText_(input.measurementMethod);
    const correctionReason = safeSheetText_(input.correctionReason);
    const correctedObservationId = safeSheetText_(input.correctedObservationId);
    let quality = "Observed";
    let method = "Observed";
    if (correctionReason) {
        quality = "Corrected";
    } else if (eventName === "Weigh") {
        quality = "Measured";
        method = "Scale";
        /* v8 ignore next -- Measure and non-Measure provenance rows are both asserted; V8 reports a synthetic alternate branch. */
    } else if (eventName === "Measure") {
        quality = measurementQuality || "Estimated";
        method = measurementMethod || "Unspecified";
    }

    return [
        `${requestId}:${eventIndex + 1}:${eventName.toLowerCase()}`,
        safeSheetText_(input.entrySource || "Apps Script"),
        quality,
        requestId,
        correctedObservationId,
        correctionReason,
        eventName === "Check" ? safeSheetText_(input.soilMoisture) : "",
        eventName === "Repot" ? safeSheetText_(input.medium) : "",
        method,
        "Active",
    ];
}

function historyMeasurementRow_(input, eventName, rowNumber) {
    return [
        eventName === "Measure"
            ? cleanText_(input.measurementUnit) || "cm"
            : "",
        `=IF(F${rowNumber}="","",F${rowNumber}/2.54)`,
        `=IF(G${rowNumber}="","",G${rowNumber}/2.54)`,
    ];
}

function historyRotationRow_(input, eventName) {
    return [
        eventName === "Rotation"
            ? Number(input.details && input.details.rotationDegrees) || 90
            : "",
    ];
}

function buildEventNamesFromList_(
    requestedEvents,
    weightState,
    weight,
    height,
    width,
    condition,
    notes
) {
    const eventNames = [];
    const addUnique = (eventName) => {
        if (eventName && !eventNames.includes(eventName))
            eventNames.push(eventName);
    };

    requestedEvents.forEach(addUnique);
    /* Observations with and without a weight are both tested; V8 reports a synthetic alternate branch. */
    /* v8 ignore else */
    if (weight !== "") addUnique("Weigh");
    /* v8 ignore else -- Measured and non-measured observations are both covered; V8 reports a synthetic alternate branch. */
    if (height !== "" || width !== "") addUnique("Measure");
    /* Both outcomes have tests; V8 reports a synthetic alternate branch for this one-sided guard. */
    /* v8 ignore else */
    if (condition) addUnique("Check");
    /* Both outcomes have tests; V8 reports a synthetic alternate branch for this one-sided guard. */
    /* v8 ignore else */
    if (eventNames.length === 0 && notes) addUnique("Note");

    const waterIndex = eventNames.indexOf("Water");
    const weighIndex = eventNames.indexOf("Weigh");
    /* v8 ignore else -- Water/Weigh reordering and already-ordered observations are both covered; V8 reports a synthetic alternate branch. */
    if (waterIndex >= 0 && weighIndex >= 0 && waterIndex < weighIndex) {
        eventNames.splice(waterIndex, 1);
        eventNames.splice(eventNames.indexOf("Weigh") + 1, 0, "Water");
    }

    /* Both outcomes have tests; V8 reports a synthetic alternate branch for this one-sided guard. */
    /* v8 ignore else */
    if (eventNames.length === 0) {
        throw new Error(
            "Choose an event or enter a measurement, condition, or note."
        );
    }
    return eventNames;
}

function eventDetailsFromPayload_(payload, eventNames, plant) {
    const details = {
        nutrientsUsed: "",
        nutrientProduct: "",
        nutrientAmount: "",
        previousPotSize: "",
        potSize: "",
        flowerCount: "",
        flowerDetails: "",
        photoUrl: "",
        pestIssue: "",
        pestTreatment: "",
        rotationDegrees: "",
    };

    addWaterDetails_(details, payload, eventNames);
    addRepotDetails_(details, payload, eventNames, plant);
    addFlowerDetails_(details, payload, eventNames);
    addPhotoDetails_(details, payload, eventNames);
    addPestDetails_(details, payload, eventNames);
    addRotationDetails_(details, payload, eventNames);

    return details;
}

function addRotationDetails_(details, payload, eventNames) {
    if (!eventNames.includes("Rotation")) return;
    const raw = cleanText_(payload && payload.rotationDegrees) || "90";
    const rotationDegrees = Number(raw);
    if (
        !Number.isFinite(rotationDegrees) ||
        rotationDegrees <= 0 ||
        rotationDegrees > 360
    ) {
        throw new Error(
            "Rotation must be more than 0 and at most 360 degrees."
        );
    }
    details.rotationDegrees = rotationDegrees;
}

function addWaterDetails_(details, payload, eventNames) {
    if (!eventNames.includes("Water")) return;

    const nutrientsUsed = cleanText_(payload && payload.nutrientsUsed);
    const nutrientProduct = cleanText_(payload && payload.nutrientProduct);
    const nutrientAmount = cleanText_(payload && payload.nutrientAmount);
    if (!NUTRIENT_OPTIONS.includes(nutrientsUsed)) {
        throw new Error("For Water, choose whether nutrients were used.");
    }
    /* v8 ignore else -- Complete and incomplete nutrient details are both covered; V8 reports a synthetic alternate branch. */
    if (nutrientsUsed === "Yes" && (!nutrientProduct || !nutrientAmount)) {
        throw new Error(
            "Enter both the nutrient product and amount used with this watering."
        );
    }

    details.nutrientsUsed = nutrientsUsed;
    /* v8 ignore next -- Yes and No nutrient paths are both covered. */
    if (nutrientsUsed === "Yes") {
        details.nutrientProduct = nutrientProduct;
        details.nutrientAmount = nutrientAmount;
    }
}

function addRepotDetails_(details, payload, eventNames, plant) {
    if (!eventNames.includes("Repot")) return;

    const potSize = cleanText_(payload && payload.potSize);
    /* v8 ignore next -- Missing and valid pot-size paths are both covered. */
    if (!potSize) {
        throw new Error("Enter the new pot size for the Repot event.");
    }

    details.previousPotSize = cleanText_(plant && plant.currentPotSize);
    details.potSize = potSize;
}

function addFlowerDetails_(details, payload, eventNames) {
    /* v8 ignore else -- Flower and non-Flower observations are both covered; V8 reports a synthetic alternate branch. */
    if (!eventNames.includes("Flower")) return;

    const flowerCount = optionalPositiveInteger_(
        payload && payload.flowerCount,
        "Flower count"
    );
    const flowerDetails = cleanText_(payload && payload.flowerDetails);
    if (flowerCount === "" && !flowerDetails) {
        throw new Error(
            "Enter a flower count, a description, or both for the Flower event."
        );
    }

    details.flowerCount = flowerCount;
    details.flowerDetails = flowerDetails;
}

function addPhotoDetails_(details, payload, eventNames) {
    /* v8 ignore next -- Photo and non-Photo event detail paths are both tested; V8 reports a synthetic alternate branch. */
    if (!eventNames.includes("Photo")) return;

    const photoUrl = cleanText_(payload && payload.photoUrl);
    /* v8 ignore next -- Valid and invalid Google Photos links are both covered. */
    if (!isGooglePhotosShareUrl_(photoUrl)) {
        throw new Error(
            "Photo needs a Google Photos share link from photos.google.com or photos.app.goo.gl."
        );
    }

    details.photoUrl = photoUrl;
}

function addPestDetails_(details, payload, eventNames) {
    /* v8 ignore next -- Pest and non-pest events are both covered. */
    if (!eventNames.includes("Pest")) return;

    const pestIssue = cleanText_(payload && payload.pestIssue);
    const pestTreatment = cleanText_(payload && payload.pestTreatment);
    /* v8 ignore next -- Complete and incomplete pest details are both covered. */
    if (!pestIssue || !pestTreatment) {
        throw new Error(
            "Describe both the pest or issue and the treatment or action taken."
        );
    }

    details.pestIssue = pestIssue;
    details.pestTreatment = pestTreatment;
}

function isGooglePhotosShareUrl_(value) {
    return /^https:\/\/(?:photos\.google\.com|photos\.app\.goo\.gl)(?:[/:?#]|$)/i.test(
        cleanText_(value)
    );
}

function plantRecordForId_(spreadsheet, plantId) {
    /* v8 ignore next -- Empty, invalid, and valid plant lookups are all tested; V8 reports a synthetic alternate branch. */
    if (!plantId) return null;
    return plantRecordsById_(spreadsheet).get(plantId) || null;
}

function plantRecordsById_(spreadsheet) {
    const tracker = requireSheet_(spreadsheet, GARDEN_LOGGER.plantTrackerSheet);
    const rowCount = Math.max(0, tracker.getLastRow() - 1);
    /* v8 ignore next -- Empty and populated tracker sheets are both tested; V8 reports a synthetic alternate branch. */
    if (rowCount === 0) return new Map();
    const currentPotSizeColumn = optionalColumnForHeader_(
        tracker,
        GARDEN_LOGGER.currentPotSizeHeader
    );
    const trackerColumnCount = Math.max(
        GARDEN_LOGGER.currentLabelColumn,
        currentPotSizeColumn
    );
    const trackerRange = tracker.getRange(2, 1, rowCount, trackerColumnCount);
    const rows = trackerRange.getValues();
    const formulas = trackerRange.getFormulas();
    const baselines = requireSheet_(spreadsheet, GARDEN_LOGGER.baselinesSheet);
    const baselineRows = baselinePotSetupData_(baselines).rows;
    const potSetupByPlant = new Map(
        baselineRows.map(([candidateId, potSetup]) => [
            cleanText_(candidateId),
            potSetup || 1,
        ])
    );
    const needsPotSizeFallback = rows.some(
        (row) => !cleanText_(row[currentPotSizeColumn - 1])
    );
    /* v8 ignore next -- Tracker-provided and History-fallback pot sizes are both tested; V8 reports a synthetic alternate branch. */
    const potSizes = needsPotSizeFallback
        ? latestPotSizesByPlant_(spreadsheet)
        : new Map();
    const records = new Map();
    rows.forEach((row, index) => {
        const plantId = cleanText_(row[0]);
        if (!plantId) return;
        if (records.has(plantId)) {
            throw new Error(
                `Plant ID ${plantId} appears more than once in Plant tracker.`
            );
        }
        records.set(plantId, {
            id: plantId,
            name: cleanText_(row[1]),
            scientificName: cleanText_(row[2]),
            label: cleanText_(row[GARDEN_LOGGER.currentLabelColumn - 1]),
            currentPotSize:
                cleanText_(row[currentPotSizeColumn - 1]) ||
                potSizes.get(plantId) ||
                "Not logged",
            fieldGuideUrl: fieldGuideUrlForRow_(formulas[index]),
            potSetup: positiveInteger_(
                potSetupByPlant.get(plantId) || 1,
                "Pot setup"
            ),
        });
    });
    return records;
}

function latestPotSizesByPlant_(spreadsheet) {
    return latestPotSizesFromRows_(readHistorySnapshot_(spreadsheet));
}

function readHistorySnapshot_(spreadsheet) {
    const history = requireSheet_(spreadsheet, GARDEN_LOGGER.historySheet);
    const rowCount = Math.max(0, history.getLastRow() - 1);
    /* v8 ignore else -- Empty and populated History snapshots are both covered; V8 reports a synthetic alternate branch. */
    if (!rowCount) return [];

    const columnCount = Math.min(
        GARDEN_LOGGER.historyStoredColumns,
        history.getMaxColumns()
    );
    const rows = history.getRange(2, 1, rowCount, columnCount).getValues();
    let lastDataIndex = rows.length - 1;
    while (
        lastDataIndex >= 0 &&
        !cleanText_(rows[lastDataIndex][0]) &&
        !cleanText_(rows[lastDataIndex][1])
    ) {
        lastDataIndex -= 1;
    }
    return rows.slice(0, lastDataIndex + 1);
}

function latestPotSizesFromRows_(historyRows) {
    const result = new Map(Object.entries(INITIAL_POT_SIZE_BY_PLANT));
    historyRows
        .filter(
            (row) =>
                cleanText_(row[2]) === "Repot" &&
                cleanText_(
                    row[
                        GARDEN_LOGGER.historyProvenanceStartColumn +
                            GARDEN_LOGGER.historyProvenanceColumns -
                            2
                    ]
                ) !== "Removed"
        )
        .sort((left, right) => {
            const leftDate = new Date(left[0]).getTime() || 0;
            const rightDate = new Date(right[0]).getTime() || 0;
            return leftDate - rightDate;
        })
        .forEach((row) => {
            const plantId = cleanText_(row[1]);
            const potSize = cleanText_(
                row[GARDEN_LOGGER.historyDetailStartColumn + 3]
            );
            if (plantId && potSize) result.set(plantId, potSize);
        });
    return result;
}

function dryOrLowestWeightsFromRows_(historyRows) {
    const candidates = new Map();
    historyRows.forEach((row, rowIndex) => {
        const plantId = cleanText_(row[1]);
        const eventName = cleanText_(row[2]);
        const status = cleanText_(
            row[
                GARDEN_LOGGER.historyProvenanceStartColumn +
                    GARDEN_LOGGER.historyProvenanceColumns -
                    2
            ]
        );
        const weight = Number(row[GARDEN_LOGGER.historyWeightColumn - 1]);
        if (
            !plantId ||
            eventName !== "Weigh" ||
            status === "Removed" ||
            !Number.isFinite(weight) ||
            weight <= 0
        ) {
            return;
        }

        const observedAt = row[0];
        const timestamp = new Date(observedAt).getTime();
        const candidate = {
            weight,
            observedAt,
            timestamp: Number.isFinite(timestamp) ? timestamp : 0,
            rowIndex,
        };
        const record = candidates.get(plantId) || {
            latestDry: null,
            lowest: null,
        };
        if (
            cleanText_(row[GARDEN_LOGGER.historyWeightStateColumn - 1]) ===
            "Dry"
        ) {
            if (
                !record.latestDry ||
                candidate.timestamp > record.latestDry.timestamp ||
                (candidate.timestamp === record.latestDry.timestamp &&
                    candidate.rowIndex > record.latestDry.rowIndex)
            ) {
                record.latestDry = candidate;
            }
        }
        if (
            !record.lowest ||
            candidate.weight < record.lowest.weight ||
            (candidate.weight === record.lowest.weight &&
                (candidate.timestamp > record.lowest.timestamp ||
                    (candidate.timestamp === record.lowest.timestamp &&
                        candidate.rowIndex > record.lowest.rowIndex)))
        ) {
            record.lowest = candidate;
        }
        candidates.set(plantId, record);
    });

    return new Map(
        [...candidates.entries()].map(([plantId, record]) => {
            const selected = record.latestDry || record.lowest;
            return [
                plantId,
                {
                    weight: selected.weight,
                    observedAt: selected.observedAt,
                    basis: record.latestDry ? "Dry" : "Lowest",
                },
            ];
        })
    );
}

function updateBaselinePotSetup_(spreadsheet, plantId, potSetup) {
    const baselines = requireSheet_(spreadsheet, GARDEN_LOGGER.baselinesSheet);
    const baselineData = baselinePotSetupData_(baselines);
    const index = baselineData.rows.findIndex(
        ([candidateId]) => cleanText_(candidateId) === plantId
    );
    /* v8 ignore next -- Successful updates and missing plant IDs are both tested; V8 reports a synthetic alternate branch. */
    if (index < 0) {
        throw new Error(`Plant ID ${plantId} is missing from Baselines.`);
    }
    baselines
        .getRange(index + 2, baselineData.potSetupColumn)
        .setValue(potSetup);
}

function baselinePotSetupData_(baselines) {
    const rowCount = Math.max(0, baselines.getLastRow() - 1);
    /* v8 ignore next -- Header-only and populated Baselines sheets are both tested; V8 reports a synthetic alternate branch. */
    if (!rowCount) return { potSetupColumn: 0, rows: [] };

    const plantIdColumn = requiredColumnForHeader_(baselines, "Plant ID");
    const potSetupColumn = requiredColumnForHeader_(baselines, "Pot setup");
    const width = Math.max(plantIdColumn, potSetupColumn);
    const sourceRows = baselines.getRange(2, 1, rowCount, width).getValues();
    const rows = sourceRows.map((row) => [
        row[plantIdColumn - 1],
        row[potSetupColumn - 1],
    ]);
    assertUniqueIdsInRows_(rows, GARDEN_LOGGER.baselinesSheet);
    return { potSetupColumn, rows };
}

function optionalColumnForHeader_(sheet, expectedHeader) {
    const columnCount = sheet.getLastColumn();
    /* v8 ignore next -- Empty and populated header rows are both tested; V8 reports a synthetic alternate branch. */
    if (!columnCount) return 0;
    const headers = sheet
        .getRange(1, 1, 1, columnCount)
        .getDisplayValues()[0]
        .map(cleanText_);
    const matches = headers.reduce((indexes, header, index) => {
        /* v8 ignore next -- Matching and nonmatching headers are both tested; V8 reports a synthetic alternate branch. */
        if (header === expectedHeader) indexes.push(index + 1);
        return indexes;
    }, []);
    /* v8 ignore next -- Unique and duplicate headers are both tested; V8 reports a synthetic alternate branch. */
    if (matches.length > 1) {
        throw new Error(
            `${sheet.getName()} has more than one "${expectedHeader}" header.`
        );
    }
    return matches[0] || 0;
}

function requiredColumnForHeader_(sheet, expectedHeader) {
    const column = optionalColumnForHeader_(sheet, expectedHeader);
    /* v8 ignore next -- Present and missing required headers are both tested; V8 reports a synthetic alternate branch. */
    if (!column) {
        throw new Error(
            `${sheet.getName()} is missing the "${expectedHeader}" header.`
        );
    }
    return column;
}

function getRecentObservations_(
    spreadsheet,
    timeZone,
    limit,
    plantNames = plantNamesById_(spreadsheet)
) {
    return recentObservationsFromRows_(
        readHistorySnapshot_(spreadsheet),
        timeZone,
        limit,
        plantNames
    );
}

function recentObservationsFromRows_(historyRows, timeZone, limit, plantNames) {
    return historyRows
        .map((row, index) => ({ row, index }))
        .filter(
            ({ row }) =>
                cleanText_(row[1]) &&
                cleanText_(row[2]) &&
                cleanText_(
                    row[
                        GARDEN_LOGGER.historyProvenanceStartColumn +
                            GARDEN_LOGGER.historyProvenanceColumns -
                            2
                    ]
                ) !== "Removed"
        )
        .sort((left, right) => {
            const observedDifference =
                dateSortValue_(right.row[0]) - dateSortValue_(left.row[0]);
            /* v8 ignore else -- Different and equal observation times are both covered; V8 reports a synthetic alternate branch. */
            if (observedDifference) return observedDifference;
            const recordedDifference =
                dateSortValue_(right.row[9]) - dateSortValue_(left.row[9]);
            return recordedDifference || right.index - left.index;
        })
        .slice(0, limit)
        .map(({ row }) => {
            const plantId = cleanText_(row[1]);
            return {
                observedAt: formatClientDate_(
                    row[0],
                    timeZone,
                    "MMM d, h:mm a"
                ),
                plantId,
                event: cleanText_(row[2]),
                weightState: cleanText_(row[3]),
                weight: row[4] === "" || row[4] === null ? "" : Number(row[4]),
                name: plantNames.get(plantId) || plantId,
            };
        });
}

function plantNamesById_(spreadsheet) {
    const tracker = requireSheet_(spreadsheet, GARDEN_LOGGER.plantTrackerSheet);
    const rowCount = Math.max(0, tracker.getLastRow() - 1);
    /* v8 ignore else -- Empty and populated plant-name maps are both covered; V8 reports a synthetic alternate branch. */
    if (!rowCount) return new Map();
    return new Map(
        tracker
            .getRange(2, 1, rowCount, 2)
            .getDisplayValues()
            .map(([plantId, name]) => [cleanText_(plantId), cleanText_(name)])
            .filter(([plantId]) => plantId)
    );
}

function dateSortValue_(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.getTime();
    }
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
}

function flushAndReleaseLock_(lock) {
    try {
        SpreadsheetApp.flush();
    } finally {
        lock.releaseLock();
    }
}

function lastHistoryDataRow_(history) {
    const rowCount = Math.max(0, history.getLastRow() - 1);
    /* v8 ignore else -- Empty and populated History sheets are both covered; V8 reports a synthetic alternate branch. */
    if (rowCount === 0) return 1;
    const identityColumns = history
        .getRange(2, 1, rowCount, 2)
        .getDisplayValues();
    for (let index = identityColumns.length - 1; index >= 0; index -= 1) {
        if (identityColumns[index][0] || identityColumns[index][1])
            return index + 2;
    }
    return 1;
}

function lastHistoryReservedRow_(history) {
    const lastObservationRow = lastHistoryDataRow_(history);
    const rowCount = Math.max(0, history.getLastRow() - 1);
    /* v8 ignore else -- Empty and populated request-ID columns are both covered; V8 reports a synthetic alternate branch. */
    if (rowCount === 0) return lastObservationRow;
    const requestIds = history
        .getRange(2, GARDEN_LOGGER.requestIdColumn, rowCount, 1)
        .getDisplayValues();
    for (let index = requestIds.length - 1; index >= 0; index -= 1) {
        if (requestIds[index][0])
            return Math.max(lastObservationRow, index + 2);
    }
    return lastObservationRow;
}

function historyRowsForRequest_(history, requestId) {
    const rowCount = Math.max(0, history.getLastRow() - 1);
    /* v8 ignore else -- Missing and present History request IDs are both covered; V8 reports a synthetic alternate branch. */
    if (rowCount === 0) return [];
    return history
        .getRange(2, GARDEN_LOGGER.requestIdColumn, rowCount, 1)
        .createTextFinder(requestId)
        .matchEntireCell(true)
        .findAll()
        .map((range) => range.getRow())
        .sort((left, right) => left - right);
}

function savedRequestStatus_(history, requestId) {
    const rowNumbers = historyRowsForRequest_(history, requestId);
    /* v8 ignore else -- Missing and present saved requests are both covered; V8 reports a synthetic alternate branch. */
    if (!rowNumbers.length) return { state: "missing", requestId };

    const firstRow = rowNumbers[0];
    const contiguous = rowNumbers.every(
        (rowNumber, index) => rowNumber === firstRow + index
    );
    /* v8 ignore else -- Contiguous and noncontiguous saved requests are both covered; V8 reports a synthetic alternate branch. */
    if (!contiguous) return { state: "incomplete", requestId };

    const values = history
        .getRange(firstRow, 1, rowNumbers.length, GARDEN_LOGGER.historyColumns)
        .getValues();
    const complete = values.every(
        (row) =>
            row[0] instanceof Date && cleanText_(row[1]) && cleanText_(row[2])
    );

    return {
        state: complete ? "saved" : "incomplete",
        requestId,
    };
}

function ensureHistoryRequestIdColumn_(history) {
    const cell = history.getRange(1, GARDEN_LOGGER.requestIdColumn);
    const current = cleanText_(cell.getDisplayValue());
    if (!current) {
        cell.setValue(GARDEN_LOGGER.requestIdHeader).setNote(
            "Internal retry key used by the mobile logger to prevent duplicate History rows. Keep this column hidden."
        );
        return;
    }
    if (current !== GARDEN_LOGGER.requestIdHeader) {
        throw new Error(
            `History!${columnName_(GARDEN_LOGGER.requestIdColumn)}1 must be "${GARDEN_LOGGER.requestIdHeader}".`
        );
    }
}

function ensureHistoryDetailColumns_(history) {
    const range = history.getRange(
        1,
        GARDEN_LOGGER.historyDetailStartColumn,
        1,
        GARDEN_LOGGER.historyDetailColumns
    );
    const current = range.getDisplayValues()[0].map(cleanText_);
    const empty = current.every((value) => !value);
    if (empty) {
        range.setValues([HISTORY_DETAIL_HEADERS]);
        range.setNotes([
            HISTORY_DETAIL_HEADERS.map(
                (header) =>
                    `${header}: structured mobile logger data. Leave the header unchanged so public history pages can read it.`
            ),
        ]);
        return;
    }
    HISTORY_DETAIL_HEADERS.forEach((header, index) => {
        if (current[index] !== header) {
            throw new Error(
                `History!${columnName_(GARDEN_LOGGER.historyDetailStartColumn + index)}1 must be "${header}".`
            );
        }
    });
}

function ensureHistoryProvenanceColumns_(history) {
    ensureHistoryGrid_(history);
    const range = history.getRange(
        1,
        GARDEN_LOGGER.historyProvenanceStartColumn,
        1,
        GARDEN_LOGGER.historyProvenanceColumns
    );
    const current = range.getDisplayValues()[0].map(cleanText_);
    const empty = current.every((value) => !value);
    if (empty) {
        range.setValues([HISTORY_PROVENANCE_HEADERS]);
        range.setNotes([
            HISTORY_PROVENANCE_HEADERS.map(
                (header) =>
                    `${header}: durable provenance used for uncertainty, corrections, retry safety, and integrity checks.`
            ),
        ]);
        return;
    }
    HISTORY_PROVENANCE_HEADERS.forEach((header, index) => {
        if (current[index] !== header) {
            throw new Error(
                `History!${columnName_(GARDEN_LOGGER.historyProvenanceStartColumn + index)}1 must be "${header}".`
            );
        }
    });
}

function ensureHistoryMeasurementColumns_(history, configureColumn = false) {
    ensureHistoryGrid_(history);
    const range = history.getRange(
        1,
        GARDEN_LOGGER.historyMeasurementStartColumn,
        1,
        GARDEN_LOGGER.historyMeasurementColumns
    );
    const current = range.getDisplayValues()[0].map(cleanText_);
    const empty = current.every((value) => !value);
    if (empty) {
        range.setValues([HISTORY_MEASUREMENT_HEADERS]);
        range.setNotes([
            [
                "Original unit used for Height and Width. New mobile entries default to inches; canonical History dimensions remain normalized to centimeters.",
                "Automatic conversion of Height (cm) to inches.",
                "Automatic conversion of Width (cm) to inches.",
            ],
        ]);
    } else {
        HISTORY_MEASUREMENT_HEADERS.forEach((header, index) => {
            if (current[index] !== header) {
                throw new Error(
                    `History!${columnName_(GARDEN_LOGGER.historyMeasurementStartColumn + index)}1 must be "${header}".`
                );
            }
        });
    }

    /* v8 ignore next -- Installer configuration and lightweight append verification are both tested; V8 reports a synthetic alternate branch. */
    if (!configureColumn) return;
    const dataRows = Math.max(1, history.getMaxRows() - 1);
    const unitRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(MEASUREMENT_UNIT_OPTIONS, true)
        .setAllowInvalid(false)
        .build();
    history
        .getRange(2, GARDEN_LOGGER.historyMeasurementStartColumn, dataRows, 1)
        .setDataValidation(unitRule);
    history
        .getRange(
            2,
            GARDEN_LOGGER.historyMeasurementStartColumn + 1,
            dataRows,
            2
        )
        .clearDataValidations()
        .setNumberFormat("0.##");
}

function ensureHistoryRotationColumns_(history, configureColumn = false) {
    ensureHistoryGrid_(history);
    const range = history.getRange(
        1,
        GARDEN_LOGGER.historyRotationStartColumn,
        1,
        GARDEN_LOGGER.historyRotationColumns
    );
    const current = range.getDisplayValues()[0].map(cleanText_);
    const empty = current.every((value) => !value);
    if (empty) {
        range.setValues([HISTORY_ROTATION_HEADERS]);
        range.setNotes([
            [
                "Clockwise-equivalent rotation recorded in degrees. The mobile logger defaults a Rotation event to 90°.",
            ],
        ]);
    } else if (current[0] !== HISTORY_ROTATION_HEADERS[0]) {
        throw new Error(
            `History!${columnName_(GARDEN_LOGGER.historyRotationStartColumn)}1 must be "${HISTORY_ROTATION_HEADERS[0]}".`
        );
    }

    /* v8 ignore next -- Installer configuration and lightweight append verification are both tested. */
    if (!configureColumn) return;
    const dataRows = Math.max(1, history.getMaxRows() - 1);
    const rotationRule = SpreadsheetApp.newDataValidation()
        .requireNumberBetween(1, 360)
        .setAllowInvalid(false)
        .build();
    history
        .getRange(2, GARDEN_LOGGER.historyRotationStartColumn, dataRows, 1)
        .setDataValidation(rotationRule)
        .setNumberFormat("0.##");
}

function ensureHistoryGrid_(history) {
    const currentColumns = history.getMaxColumns();
    if (currentColumns < GARDEN_LOGGER.historyStoredColumns) {
        history.insertColumnsAfter(
            currentColumns,
            GARDEN_LOGGER.historyStoredColumns - currentColumns
        );
    }
    const currentRows = history.getMaxRows();
    /* v8 ignore next -- Undersized and already-capacious History grids are both exercised; V8 reports a synthetic alternate branch. */
    if (currentRows < GARDEN_LOGGER.historyCapacityRows) {
        history.insertRowsAfter(
            currentRows,
            GARDEN_LOGGER.historyCapacityRows - currentRows
        );
    }
}

function ensureQuickLogValidations_(quickLog) {
    const listRule = (values) =>
        SpreadsheetApp.newDataValidation()
            .requireValueInList(values, true)
            .setAllowInvalid(false)
            .build();
    const checkboxRule = SpreadsheetApp.newDataValidation()
        .requireCheckbox()
        .setAllowInvalid(false)
        .build();

    quickLog
        .getRange(GARDEN_LOGGER.bulkControlRow, GARDEN_LOGGER.bulkEventColumn)
        .setDataValidation(
            listRule([
                "Water",
                "Weigh",
                "Measure",
                "Check",
                "Rotation",
                "Clean",
                "Prune",
                "Other",
                "Clear events",
            ])
        );
    quickLog
        .getRange(GARDEN_LOGGER.bulkControlRow, GARDEN_LOGGER.saveColumn)
        .setDataValidation(checkboxRule);

    // QuickCareLog is a native Google Sheets table. Its typed columns own the
    // row-level checkbox, dropdown, number, and integer constraints. Applying
    // Range data-validation rules over those cells makes installation fail
    // because Sheets rejects a second validation layer on typed table columns.
    // Server-side validation remains authoritative for every archived value.
}

function ensureWarningOnlyProtection_(
    sheet,
    row,
    column,
    rowCount,
    columnCount,
    description
) {
    const range = sheet.getRange(row, column, rowCount, columnCount);
    const protections = sheet.getProtections(
        SpreadsheetApp.ProtectionType.RANGE
    );
    let protection = protections.find(
        (candidate) => cleanText_(candidate.getDescription()) === description
    );
    if (protection) {
        protection.setRange(range);
    } else {
        protection = range.protect().setDescription(description);
    }
    protection.setWarningOnly(true);
}

function getGardenSpreadsheet_() {
    return SpreadsheetApp.openById(GARDEN_LOGGER.spreadsheetId);
}

function formatClientDate_(value, timeZone, pattern) {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";
    return Utilities.formatDate(value, timeZone, pattern);
}

function fieldGuideUrlForRow_(formulaRow) {
    const formula = cleanText_(
        formulaRow && formulaRow[GARDEN_LOGGER.fieldGuideColumn - 1]
    );
    const match = formula.match(/HYPERLINK\(\s*"([^"]+)"/i);
    return match ? match[1] : GARDEN_LOGGER.fieldGuideUrl;
}

function assertUniquePlantIds_(plants) {
    const seen = new Set();
    plants.forEach((plant) => {
        if (seen.has(plant.id)) {
            throw new Error(
                `Plant ID ${plant.id} appears more than once in Plant tracker.`
            );
        }
        seen.add(plant.id);
    });
}

function assertUniqueIdsInRows_(rows, sheetName) {
    const seen = new Set();
    rows.forEach(([value]) => {
        const id = cleanText_(value);
        if (!id) return;
        if (seen.has(id)) {
            throw new Error(
                `Plant ID ${id} appears more than once in ${sheetName}.`
            );
        }
        seen.add(id);
    });
}

function stampEntryStartedAt_(quickLog, editedRange) {
    const firstRow = Math.max(
        editedRange.getRow(),
        GARDEN_LOGGER.firstInputRow
    );
    const lastRow = editedRange.getLastRow();
    const firstColumn = Math.max(
        editedRange.getColumn(),
        GARDEN_LOGGER.firstEntryColumn
    );
    const lastColumn = Math.min(
        editedRange.getLastColumn(),
        GARDEN_LOGGER.lastEntryColumn
    );

    if (firstRow > lastRow || firstColumn > lastColumn) return;

    const rowCount = lastRow - firstRow + 1;
    const dateRange = quickLog.getRange(
        firstRow,
        GARDEN_LOGGER.dateColumn,
        rowCount,
        1
    );
    const dates = dateRange.getValues();
    const entryValues = quickLog
        .getRange(
            firstRow,
            GARDEN_LOGGER.firstEntryColumn,
            rowCount,
            GARDEN_LOGGER.lastEntryColumn - GARDEN_LOGGER.firstEntryColumn + 1
        )
        .getValues();
    const startedAt = new Date();
    let changed = false;

    entryValues.forEach((rowValues, index) => {
        if (
            dates[index][0] === "" &&
            rowValues.some((value) => value !== "" && value !== null)
        ) {
            dates[index][0] = startedAt;
            changed = true;
        }
    });

    if (!changed) return;

    dateRange
        .setValues(dates)
        .setNumberFormat("M/d/yyyy h:mm am/pm")
        .setNote(
            "First unsaved Quick log entry time. Edit this cell if you are recording an earlier observation."
        );
}

function applyBulkEvent_(quickLog) {
    const eventCell = quickLog.getRange(
        GARDEN_LOGGER.bulkControlRow,
        GARDEN_LOGGER.bulkEventColumn
    );
    const applyCell = quickLog.getRange(
        GARDEN_LOGGER.bulkControlRow,
        GARDEN_LOGGER.saveColumn
    );
    const selected = cleanText_(eventCell.getValue());

    if (!selected) {
        applyCell.setValue(false);
        applyCell.setBackground("#f4cccc");
        applyCell.setNote("Choose a bulk event first.");
        return;
    }

    const lastRow = quickLog.getLastRow();
    const rowCount = Math.max(0, lastRow - GARDEN_LOGGER.firstInputRow + 1);
    if (rowCount === 0) {
        applyCell.setValue(false);
        return;
    }

    const plantIds = quickLog
        .getRange(GARDEN_LOGGER.firstInputRow, 1, rowCount, 1)
        .getDisplayValues();
    const clearEvents = selected === "Clear events";
    const values = plantIds.map(([plantId]) => {
        if (!plantId || clearEvents) return [""];
        return [selected];
    });

    quickLog
        .getRange(
            GARDEN_LOGGER.firstInputRow,
            GARDEN_LOGGER.eventColumn,
            rowCount,
            1
        )
        .setValues(values);

    applyCell.setValue(false);
    applyCell.setBackground("#dcebdd");
    applyCell.setNote(
        clearEvents
            ? "Cleared every Quick log Event cell."
            : `Set every Quick log Event cell to ${selected}.`
    );
    quickLog
        .getParent()
        .toast(
            clearEvents
                ? "All Quick log events cleared."
                : `All events set to ${selected}.`,
            "Bulk event updated",
            5
        );
}

function updateInferredEvent_(quickLog, rowNumber, columnNumber) {
    if (
        ![
            GARDEN_LOGGER.weightColumn,
            GARDEN_LOGGER.heightColumn,
            GARDEN_LOGGER.widthColumn,
        ].includes(columnNumber)
    ) {
        return;
    }

    const eventCell = quickLog.getRange(rowNumber, GARDEN_LOGGER.eventColumn);
    const currentEvent = cleanText_(eventCell.getValue());
    const weight = quickLog
        .getRange(rowNumber, GARDEN_LOGGER.weightColumn)
        .getValue();
    const height = quickLog
        .getRange(rowNumber, GARDEN_LOGGER.heightColumn)
        .getValue();
    const width = quickLog
        .getRange(rowNumber, GARDEN_LOGGER.widthColumn)
        .getValue();

    if (!currentEvent && weight !== "") {
        eventCell.setValue("Weigh");
        eventCell.setNote("Auto-selected Weigh because a weight was entered.");
        return;
    }
    if (!currentEvent && (height !== "" || width !== "")) {
        eventCell.setValue("Measure");
        eventCell.setNote(
            "Auto-selected Measure because a dimension was entered."
        );
        return;
    }

    if (
        ["Water", "Weigh", "Measure"].includes(currentEvent) &&
        weight === "" &&
        height === "" &&
        width === ""
    ) {
        eventCell.clearContent();
        eventCell.setNote(
            "Cleared the inferred event because its measurement fields are empty."
        );
    }
}

function currentLabelForPlant_(spreadsheet, plantId) {
    const tracker = requireSheet_(spreadsheet, GARDEN_LOGGER.plantTrackerSheet);
    const rowCount = Math.max(0, tracker.getLastRow() - 1);
    if (rowCount === 0) return "";

    const values = tracker
        .getRange(2, 1, rowCount, GARDEN_LOGGER.currentLabelColumn)
        .getDisplayValues();
    const match = values.find(([candidateId]) => candidateId === plantId);
    return match ? cleanText_(match[GARDEN_LOGGER.currentLabelColumn - 1]) : "";
}

function buildEventNames_(
    selectedEvent,
    weightState,
    weight,
    height,
    width,
    condition,
    notes
) {
    const eventNames = [];
    const addUnique = (eventName) => {
        if (eventName && !eventNames.includes(eventName))
            eventNames.push(eventName);
    };

    addUnique(selectedEvent);
    if (weight !== "") addUnique("Weigh");
    if (height !== "" || width !== "") addUnique("Measure");
    if (condition) addUnique("Check");
    if (eventNames.length === 0 && notes) addUnique("Note");

    if (eventNames.length === 0) {
        throw new Error(
            "Enter an event, measurement, condition, or note before saving."
        );
    }
    return eventNames;
}

function normalizeDate_(value) {
    if (value === "" || value === null) return new Date();
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new TypeError("Date is not valid.");
    }
    return parsed;
}

function optionalPositiveNumber_(value, label) {
    if (value === "" || value === null || value === undefined) return "";
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
        throw new Error(`${label} must be a positive number.`);
    }
    return number;
}

function optionalPositiveInteger_(value, label) {
    if (value === "" || value === null || value === undefined) return "";
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1) {
        throw new Error(`${label} must be a whole number of 1 or greater.`);
    }
    return number;
}

function normalizeRecentLimit_(value) {
    const limit = Number(value);
    return RECENT_LIMIT_OPTIONS.includes(limit) ? limit : 10;
}

function uniqueTextValues_(values) {
    const seen = new Set();
    return values.map(cleanText_).filter((value) => {
        if (!value || seen.has(value)) return false;
        seen.add(value);
        return true;
    });
}

function positiveInteger_(value, label) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1) {
        throw new Error(`${label} must be a whole number of 1 or greater.`);
    }
    return number;
}

function cleanText_(value) {
    return value === null || value === undefined ? "" : String(value).trim();
}

function safeSheetText_(value) {
    const text = cleanText_(value);
    return text.startsWith("=") ? `'${text}` : text;
}

function normalizeWebEntrySource_(value) {
    const source = cleanText_(value) || "Mobile logger";
    if (
        ![
            "Mobile logger",
            "Mobile bulk water",
            "Mobile bulk care",
            "AppSheet",
            "AppSheet bulk",
        ].includes(source)
    ) {
        throw new Error(
            "Entry source must be Mobile logger, Mobile bulk water, Mobile bulk care, AppSheet, or AppSheet bulk."
        );
    }
    return source;
}

function normalizeRequestId_(value, required = false) {
    const supplied = cleanText_(value);
    if (required && !supplied) {
        throw new Error(
            "This save is missing its retry key. Refresh the entry page and try again."
        );
    }
    const requestId = supplied || Utilities.getUuid();
    if (!/^[A-Za-z0-9_-]{12,100}$/.test(requestId)) {
        throw new Error(
            "The mobile save request ID is not valid. Refresh the entry page and try again."
        );
    }
    return requestId;
}

function requireSheet_(spreadsheet, name) {
    const sheet = spreadsheet.getSheetByName(name);
    if (!sheet) throw new Error(`Missing required sheet: ${name}.`);
    return sheet;
}

function assertHeaders_(sheet, expected, rowNumber) {
    const actual = sheet
        .getRange(rowNumber, 1, 1, expected.length)
        .getDisplayValues()[0]
        .map((value) => value.trim());
    expected.forEach((header, index) => {
        if (actual[index] !== header) {
            throw new Error(
                `${sheet.getName()}!${columnName_(index + 1)}${rowNumber} must be "${header}".`
            );
        }
    });
}

function markSaveError_(saveCell, message) {
    saveCell.setValue(false);
    saveCell.setBackground("#f4cccc");
    saveCell.setNote(`Not saved: ${message}`);
    SpreadsheetApp.getActive().toast(message, "Observation not saved", 8);
}

function activateSheet_(name, cell) {
    const spreadsheet = SpreadsheetApp.getActive();
    const sheet = requireSheet_(spreadsheet, name);
    spreadsheet.setActiveSheet(sheet);
    sheet.setActiveSelection(cell);
}

function columnName_(columnNumber) {
    let result = "";
    let value = columnNumber;
    while (value > 0) {
        const remainder = (value - 1) % 26;
        result = String.fromCodePoint(65 + remainder) + result;
        value = Math.floor((value - 1) / 26);
    }
    return result;
}
