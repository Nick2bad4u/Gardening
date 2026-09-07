/**
 * Bound Google Apps Script for the Garden Plant Tracker workbook.
 *
 * The mobile web app and Quick log tab are input surfaces. Each save archives
 * one or more event-specific rows in History without overwriting older data.
 */

const GARDEN_LOGGER = Object.freeze({
    version: "5.19.0",
    spreadsheetId: "1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0",
    quickLogSheet: "Quick log",
    historySheet: "History",
    historyViewSheet: "History view",
    plantTrackerSheet: "Plant tracker",
    baselinesSheet: "Baselines",
    dryDownModelsSheet: "Dry-down models",
    appSheetEntriesSheet: "App entries",
    appSheetBulkSheet: "App bulk",
    headerRow: 4,
    bulkControlRow: 3,
    firstInputRow: 5,
    saveColumn: 3,
    dateColumn: 4,
    firstEntryColumn: 5,
    lastEntryColumn: 15,
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
    historyWaterStartColumn: 41,
    historyWaterColumns: 2,
    historyStoredColumns: 42,
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
    P29: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/fe4a88cf3a9ab04d4f1ed7635f0bf2c5.jpg",
        nurseryLabelImageUrl:
            "https://i.gyazo.com/0c5b48d210d0984454f90f5d791b980f.webp",
    }),
    P30: Object.freeze({
        currentImageUrl:
            "https://thumb.gyazo.com/thumb/960/52ca4a6bae0a377ae39bac78665e32f9.jpg",
        nurseryLabelImageUrl:
            "https://i.gyazo.com/a9b8fd1b6ab2e49c263806566ad79087.webp",
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

// Retained only to validate stale/offline payloads created before logger 5.16.
// New observations are stored as Routine. Derived views mark a same-save
// watering weight, or the first subsequent weight within five days, Wet and
// close only the final eligible pre-watering reading as Dry, without rewriting
// canonical History.
const WEIGHT_STATE_OPTIONS = Object.freeze(["Dry", "Wet", "Routine"]);
const RECENT_LIMIT_OPTIONS = Object.freeze([10, 25, 50, 100]);
const WET_WEIGHT_WINDOW_DAYS = 5;
const WET_WEIGHT_WINDOW_MS = WET_WEIGHT_WINDOW_DAYS * 24 * 60 * 60 * 1000;

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
    "Watering application",
    "Water amount (mL)",
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

const HISTORY_WATER_HEADERS = Object.freeze([
    "Watering application",
    "Water amount (mL)",
]);

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
const APP_SHEET_ENTRY_V514_HEADERS = Object.freeze([
    ...APP_SHEET_ENTRY_LEGACY_HEADERS,
    "Rotation (°)",
]);
const APP_SHEET_ENTRY_HEADERS = Object.freeze([
    ...APP_SHEET_ENTRY_V514_HEADERS,
    ...HISTORY_WATER_HEADERS,
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

const APP_SHEET_BULK_V513_PLANTS = Object.freeze([
    ...APP_SHEET_BULK_V512_PLANTS,
    "P23",
    "P24",
    "P25",
    "P26",
    "P27",
    "P28",
]);

const APP_SHEET_BULK_PLANTS = Object.freeze([
    ...APP_SHEET_BULK_V513_PLANTS,
    "P29",
    "P30",
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

const APP_SHEET_BULK_V513_HEADERS = Object.freeze([
    ...APP_SHEET_BULK_V512_HEADERS.slice(0, 6),
    ...APP_SHEET_BULK_V513_PLANTS.map((plantId) => `${plantId} weight (g)`),
    ...APP_SHEET_BULK_V512_HEADERS.slice(6 + APP_SHEET_BULK_V512_PLANTS.length),
]);

const APP_SHEET_BULK_V514_HEADERS = Object.freeze([
    ...APP_SHEET_BULK_V513_HEADERS.slice(0, 6),
    ...APP_SHEET_BULK_PLANTS.map((plantId) => `${plantId} weight (g)`),
    ...APP_SHEET_BULK_V513_HEADERS.slice(6 + APP_SHEET_BULK_V513_PLANTS.length),
]);
const APP_SHEET_BULK_HEADERS = Object.freeze([
    ...APP_SHEET_BULK_V514_HEADERS,
    ...HISTORY_WATER_HEADERS,
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
const APP_SHEET_BULK_WATERING_APPLICATION_INDEX =
    APP_SHEET_BULK_ROTATION_INDEX + 8;
const APP_SHEET_BULK_WATER_AMOUNT_INDEX = APP_SHEET_BULK_ROTATION_INDEX + 9;

const NUTRIENT_OPTIONS = Object.freeze(["Yes", "No"]);
const WATERING_APPLICATION_OPTIONS = Object.freeze([
    "Flood / soak-through",
    "Thorough",
    "Partial",
    "Spot",
]);
const NUTRIENT_PRODUCT_OPTIONS = Object.freeze([
    "MSU 13-3-15",
    "SuperThrive Foliage Pro",
]);
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
    P30: "5 in",
});

const BASELINE_VIEW_HEADERS = Object.freeze([
    "Plant ID",
    "Plant",
    "Latest weight (g)",
    "Latest weight (lb)",
    "Last weighed",
    "Current pot size",
    "Current pot label",
    "Calibration status",
    "Trend readiness",
    "Trend review",
    "Remeasure status",
    "Next dry check",
    "Recent loss / day",
    "Trend anchor",
    "Last water",
    "Plant condition",
    "Last condition check",
    "Medium / substrate",
    "Data quality summary",
    "Pot setup",
    "Current-cycle points",
    "Current-setup weights",
    "Dry weight (g)",
    "Current-setup waterings",
    "Wet weight (g)",
    "Capacity (g)",
    "Last setup change",
    "Latest measure quality",
    "Latest dimensions",
    "Measurement unit",
    "Drying rate (g/day)",
    "Predicted dry date",
    "Forecast confidence",
    "Forecast sort date",
    "Recommended water date",
    "Watering guidance",
]);

const DASHBOARD_VIEW_HEADERS = Object.freeze([
    "Page",
    "Plant ID",
    "Plant / current label",
    "Last watered",
    "Days since",
    "Latest weight (lb)",
    "Latest weight (g)",
    "Dry weight (g)",
    "Predicted dry date",
    "Forecast",
    "Height (cm)",
    "Width (cm)",
    "Waterings",
    "Measurements",
    "Avg water interval",
    "Calibration",
    "Trend",
    "Trend review",
    "Remeasure",
    "Next dry check",
    "Data quality",
    "Recommended water date",
    "Watering guidance",
    "Weight measurements",
]);

const WORKBOOK_HELPER_SHEETS = Object.freeze([
    "Integrity",
    "App entries",
    "App bulk",
    "Insights data",
    "App insight activity",
    "App insight calibration",
    "App insight followups",
    "App plant charts",
    "Dry-down models",
]);

const WORKBOOK_EVENT_COLORS = Object.freeze({
    Water: Object.freeze(["#d9eefc", "#174a68"]),
    Weigh: Object.freeze(["#e9e1f8", "#47306b"]),
    Measure: Object.freeze(["#dff2e4", "#24543a"]),
    Check: Object.freeze(["#fff0c7", "#684b00"]),
    Rotation: Object.freeze(["#e3f1f1", "#285b5b"]),
    Clean: Object.freeze(["#f2f2f2", "#424242"]),
    Prune: Object.freeze(["#e8f0d9", "#3c5724"]),
    Repot: Object.freeze(["#f7e3cf", "#6e3d18"]),
    Flower: Object.freeze(["#f9dcea", "#722a4d"]),
    Photo: Object.freeze(["#e1e8f7", "#2d4775"]),
    Pest: Object.freeze(["#f8d4d4", "#7a1d1d"]),
    Other: Object.freeze(["#ece9df", "#4c5148"]),
});

function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu("Garden logger")
        .addItem("Open mobile entry", "openMobileEntry")
        .addItem("Verify logger", "installGardenLogger")
        .addItem("Verify AppSheet intake", "installAppSheetIntake")
        .addItem("Refresh workbook views", "refreshGardenWorkbook")
        .addItem("Refresh daily care view", "installDailyCareDashboard")
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
    const refreshedAt = new Date();
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
    const timeZone = spreadsheet.getSpreadsheetTimeZone();
    const weightReads = webWeightReadModelsFromRows_(
        historyRows,
        potSetupByPlant,
        refreshedAt,
        timeZone
    );
    const forecasts = dryDownModelsFromHistory_(
        historyRows,
        trackerValues.map(([id]) => [id]),
        timeZone
    );

    const plants = trackerValues
        .filter(([plantId]) => cleanText_(plantId))
        .map((row, index) => {
            const [
                plantId,
                commonName,
                scientificName,
                lastWatered,
                daysSinceWater,
            ] = row;
            const label = row[GARDEN_LOGGER.currentLabelColumn - 1];
            const fieldGuideUrl = fieldGuideUrlForRow_(trackerFormulas[index]);
            const imageUrls = WEB_PLANT_IMAGE_URLS[cleanText_(plantId)] || {};
            const weightRead =
                weightReads.byPlant.get(cleanText_(plantId)) ||
                webPlantWeightReadModel_([], 1, refreshedAt.getTime(), null);
            const dryOrLowestWeight = weightRead.weightSeries.previousDry;
            return {
                id: cleanText_(plantId),
                name: cleanText_(commonName),
                scientificName: cleanText_(scientificName),
                label: cleanText_(label),
                currentImageUrl: imageUrls.currentImageUrl || "",
                nurseryLabelImageUrl: imageUrls.nurseryLabelImageUrl || "",
                potSetup: weightRead.weightSeries.potSetup,
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
                latestWeight: weightRead.latestWeight,
                latestWeightAt: weightRead.latestWeightAt,
                weightSeries: weightRead.weightSeries,
                dryOrLowestWeight: dryOrLowestWeight
                    ? dryOrLowestWeight.weight
                    : "",
                dryOrLowestWeightBasis: dryOrLowestWeight
                    ? "Completed cycle"
                    : "",
                dryOrLowestWeightDate: dryOrLowestWeight
                    ? formatClientDate_(
                          new Date(dryOrLowestWeight.observedAt),
                          timeZone,
                          "MMM d, yyyy"
                      )
                    : "",
                dryForecastWindow:
                    forecasts.get(cleanText_(plantId))?.window || "",
                dryForecastBasis:
                    forecasts.get(cleanText_(plantId))?.basis || "",
                recommendedWaterDate:
                    forecasts.get(cleanText_(plantId))?.waterDate || "",
                wateringGuidance:
                    forecasts.get(cleanText_(plantId))?.waterGuidance || "",
                activitySummary: plantActivitySummary_(
                    historyRows,
                    cleanText_(plantId),
                    positiveInteger_(
                        potSetupByPlant.get(cleanText_(plantId)) || 1,
                        "Pot setup"
                    )
                ),
                fieldGuideUrl,
                historyUrl: `${GARDEN_LOGGER.historyUrl}?id=${encodeURIComponent(cleanText_(plantId))}`,
            };
        });
    assertUniquePlantIds_(plants);
    const plantNames = new Map(plants.map((plant) => [plant.id, plant.name]));

    return {
        version: GARDEN_LOGGER.version,
        timeZone,
        serverTime: refreshedAt.toISOString(),
        dayKey: weightReads.dayKey,
        weighedTodayPlantIds: weightReads.weighedTodayPlantIds.filter((id) =>
            plantNames.has(id)
        ),
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
    return "Routine";
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
    const plantId = cleanText_(payload?.plantId);
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
        payload.measurementMethod,
        eventNames
    );
    const measurementQuality = normalizeMeasurementQuality_(
        payload.measurementQuality,
        eventNames,
        measurementMethod
    );
    // Old queued drafts were created by a centimeters-only form, so an absent
    // unit remains centimeters for backward-compatible retries. Logger 5.8
    // always sends an explicit unit and defaults new form entries to inches.
    const measurementUnit = normalizeMeasurementUnit_(
        payload.measurementUnit,
        eventNames,
        "cm"
    );
    const height = measurementToCentimeters_(heightInput, measurementUnit);
    const width = measurementToCentimeters_(widthInput, measurementUnit);
    const details = eventDetailsFromPayload_(payload, eventNames, plant);

    const requestId = normalizeRequestId_(payload.requestId, true);
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
            entrySource: normalizeWebEntrySource_(payload.entrySource),
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
        if (result?.ok) {
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
            result?.message ||
            "This entry needs correction before it can be saved.";
        writeAppSheetEntryReceipt_(entries, rowNumber, {
            status: result?.retryable ? "Retry" : "Needs correction",
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
                const ok = Boolean(result?.ok);
                const retryable = Boolean(result?.retryable);
                const failureStatus = retryable ? "Retry" : "Needs correction";
                receipts.push({
                    rowNumber: item.rowNumber,
                    status: ok ? "Saved" : failureStatus,
                    message:
                        result?.message ||
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
 * 30-plant round reaches the canonical writer in one saveWebObservationBatch()
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
                    ({ result }) => result?.ok
                ).length;
                const failures = results.filter(({ result }) => !result?.ok);
                const hasDeterministicFailure = failures.some(
                    ({ result }) => result && !result.retryable
                );
                const failureStatus = hasDeterministicFailure
                    ? "Needs correction"
                    : "Retry";
                const status = failures.length ? failureStatus : "Saved";
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
    // Weight state is inferred from completed watering cycles after the row is
    // archived. Ignore the legacy staging value so AppSheet and offline drafts
    // cannot stamp a classification that will become stale.
    const weightState = includesWeigh ? "Routine" : "";
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
        wateringApplication: cleanText_(
            row[APP_SHEET_BULK_WATERING_APPLICATION_INDEX]
        ),
        waterAmount: row[APP_SHEET_BULK_WATER_AMOUNT_INDEX],
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
        : cleanText_(value).split(/[,;]/).map(cleanText_).filter(Boolean);
    const selected = new Set(values.map((plantId) => cleanText_(plantId)));
    const invalid = [...selected].filter(
        (plantId) => !APP_SHEET_BULK_PLANTS.includes(plantId)
    );
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
    if (!failures.length) {
        return `${savedCount} plant update${savedCount === 1 ? "" : "s"} saved.`;
    }
    const details = failures
        .map(({ plantId, result }) => {
            const message =
                result?.message ||
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
        .requireValueInList([...APP_SHEET_BULK_ACTION_OPTIONS], true)
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
        .requireValueInList([...SOIL_MOISTURE_OPTIONS], true)
        .setAllowInvalid(false)
        .build();
    const nutrientValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList([...NUTRIENT_OPTIONS], true)
        .setAllowInvalid(false)
        .build();
    const nutrientProductValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList([...NUTRIENT_PRODUCT_OPTIONS], true)
        .setAllowInvalid(false)
        .build();
    const wateringApplicationValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList([...WATERING_APPLICATION_OPTIONS], true)
        .setAllowInvalid(false)
        .build();
    const waterAmountValidation = SpreadsheetApp.newDataValidation()
        .requireNumberGreaterThan(0)
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
        .getRange(2, APP_SHEET_BULK_NUTRIENT_PRODUCT_INDEX + 1, dataRowCount, 1)
        .setDataValidation(nutrientProductValidation);
    sheet
        .getRange(
            2,
            APP_SHEET_BULK_WATERING_APPLICATION_INDEX + 1,
            dataRowCount,
            1
        )
        .setDataValidation(wateringApplicationValidation);
    sheet
        .getRange(2, APP_SHEET_BULK_WATER_AMOUNT_INDEX + 1, dataRowCount, 1)
        .setDataValidation(waterAmountValidation)
        .setNumberFormat("0.##");

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
    sheet.setColumnWidth(APP_SHEET_BULK_WATERING_APPLICATION_INDEX + 1, 180);
    sheet.setColumnWidth(APP_SHEET_BULK_WATER_AMOUNT_INDEX + 1, 130);
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

    if (hasHeaders(APP_SHEET_BULK_V514_HEADERS)) {
        ensureSheetColumnCapacity_(sheet, APP_SHEET_BULK_HEADERS.length);
        sheet
            .getRange(1, 1, 1, APP_SHEET_BULK_HEADERS.length)
            .setValues([[...APP_SHEET_BULK_HEADERS]]);
        return true;
    }

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

    const priorPlantContract = [
        {
            headers: APP_SHEET_BULK_V513_HEADERS,
            plants: APP_SHEET_BULK_V513_PLANTS,
        },
        {
            headers: APP_SHEET_BULK_V512_HEADERS,
            plants: APP_SHEET_BULK_V512_PLANTS,
        },
    ].find(({ headers }) => hasHeaders(headers));
    if (!priorPlantContract) return migrated;

    const insertedWeightColumns =
        APP_SHEET_BULK_PLANTS.length - priorPlantContract.plants.length;
    const oldLastWeightColumn =
        APP_SHEET_BULK_WEIGHT_START_INDEX + priorPlantContract.plants.length;
    sheet.insertColumnsAfter(oldLastWeightColumn, insertedWeightColumns);
    ensureSheetColumnCapacity_(sheet, APP_SHEET_BULK_HEADERS.length);
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
    const extensionStartColumn = APP_SHEET_ENTRY_LEGACY_HEADERS.length + 1;
    const extensionHeaders = sheet
        .getRange(
            1,
            extensionStartColumn,
            1,
            APP_SHEET_ENTRY_HEADERS.length -
                APP_SHEET_ENTRY_LEGACY_HEADERS.length
        )
        .getDisplayValues()[0]
        .map((value) => value.trim());
    const expectedExtension = APP_SHEET_ENTRY_HEADERS.slice(
        APP_SHEET_ENTRY_LEGACY_HEADERS.length
    );
    extensionHeaders.forEach((header, index) => {
        if (
            header !== expectedExtension[index] &&
            !isReplaceableGeneratedHeader_(header, extensionStartColumn + index)
        ) {
            throw new Error(
                `App entries!${columnName_(extensionStartColumn + index)}1 must be "${expectedExtension[index]}".`
            );
        }
    });
    const changed = expectedExtension.some(
        (header, index) => extensionHeaders[index] !== header
    );
    if (changed) {
        sheet
            .getRange(1, extensionStartColumn, 1, expectedExtension.length)
            .setValues([[...expectedExtension]]);
    }
    if (configureColumn) {
        const dataRowCount = Math.max(1, sheet.getMaxRows() - 1);
        const plantIdColumn = APP_SHEET_ENTRY_HEADERS.indexOf("Plant ID") + 1;
        const rotationColumn =
            APP_SHEET_ENTRY_HEADERS.indexOf("Rotation (°)") + 1;
        const wateringApplicationColumn =
            APP_SHEET_ENTRY_HEADERS.indexOf("Watering application") + 1;
        const waterAmountColumn =
            APP_SHEET_ENTRY_HEADERS.indexOf("Water amount (mL)") + 1;
        const plantIdValidation = SpreadsheetApp.newDataValidation()
            .requireValueInList([...APP_SHEET_BULK_PLANTS], true)
            .setAllowInvalid(false)
            .build();
        sheet
            .getRange(2, plantIdColumn, dataRowCount, 1)
            .setDataValidation(plantIdValidation);
        const rotationValidation = SpreadsheetApp.newDataValidation()
            .requireNumberBetween(1, 360)
            .setAllowInvalid(false)
            .build();
        sheet
            .getRange(2, rotationColumn, dataRowCount, 1)
            .setDataValidation(rotationValidation)
            .setNumberFormat("0.##");
        const wateringApplicationValidation = SpreadsheetApp.newDataValidation()
            .requireValueInList([...WATERING_APPLICATION_OPTIONS], true)
            .setAllowInvalid(false)
            .build();
        const waterAmountValidation = SpreadsheetApp.newDataValidation()
            .requireNumberGreaterThan(0)
            .setAllowInvalid(false)
            .build();
        sheet
            .getRange(2, wateringApplicationColumn, dataRowCount, 1)
            .setDataValidation(wateringApplicationValidation);
        sheet
            .getRange(2, waterAmountColumn, dataRowCount, 1)
            .setDataValidation(waterAmountValidation)
            .setNumberFormat("0.##");
        sheet
            .getRange(1, extensionStartColumn, 1, expectedExtension.length)
            .setBackground("#24533f")
            .setFontColor("#ffffff")
            .setFontWeight("bold");
        sheet.setColumnWidth(rotationColumn, 110);
        sheet.setColumnWidth(wateringApplicationColumn, 180);
        sheet.setColumnWidth(waterAmountColumn, 130);
        const nutrientProductColumn =
            APP_SHEET_ENTRY_HEADERS.indexOf("Nutrient product") + 1;
        const nutrientProductValidation = SpreadsheetApp.newDataValidation()
            .requireValueInList([...NUTRIENT_PRODUCT_OPTIONS], true)
            .setAllowInvalid(false)
            .build();
        sheet
            .getRange(2, nutrientProductColumn, dataRowCount, 1)
            .setDataValidation(nutrientProductValidation);
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

function isReplaceableGeneratedHeader_(header, columnNumber) {
    const normalized = cleanText_(header);
    return !normalized || normalized === `Column ${columnNumber}`;
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
        wateringApplication: cleanText_(row[32]),
        waterAmount: row[33],
        entrySource: "AppSheet",
    };
}

function appSheetEventList_(value) {
    if (Array.isArray(value)) return uniqueTextValues_(value);
    return uniqueTextValues_(cleanText_(value).split(/[,;]/));
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
    const results = new Array(payloads.length).fill(null);
    const requestIds = payloads.map((payload, index) => {
        // Preserve malformed falsy payload values in validation errors and receipts.
        try {
            return normalizeRequestId_(
                payload ? payload.requestId : payload,
                true
            );
        } catch (error) {
            results[index] = {
                ok: false,
                requestId: cleanText_(payload ? payload.requestId : payload),
                plantId: cleanText_(payload ? payload.plantId : payload),
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
                plantId: cleanText_(payload?.plantId),
                retryable: false,
                errorCode: "VALIDATION",
                message: error instanceof Error ? error.message : String(error),
            };
        }
    });

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
                    results[item.index]?.ok &&
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
    const savedMessage = `${savedCount} queued observation${savedCount === 1 ? "" : "s"} saved`;
    return {
        ok: savedCount === results.length,
        savedCount,
        failedCount: results.length - savedCount,
        results,
        message:
            savedCount === results.length
                ? `${savedMessage}.`
                : `${savedMessage}; ${results.length - savedCount} still need attention.`,
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
            if (existing.length) {
                const existingResult = existingObservationResult_(
                    input,
                    requestId,
                    existing.map((entry) => entry.rowNumber),
                    existing.map((entry) => entry.values)
                );
                /* Complete retries and incomplete reservations are both covered; V8 reports a synthetic alternate branch. */
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
        if (!requestId) return;

        if (!rowsByRequest.has(requestId)) rowsByRequest.set(requestId, []);
        rowsByRequest.get(requestId).push({ rowNumber, values });
    });
    return { lastReservedRow, rowsByRequest };
}

function saveBulkCareObservation(payload) {
    const spreadsheet = getGardenSpreadsheet_();
    const plantIds = uniqueTextValues_(
        Array.isArray(payload?.plantIds) ? payload.plantIds : []
    );
    if (!plantIds.length) throw new Error("Choose at least one plant.");

    const eventNames = normalizeBulkWebEvents_(payload.events);
    const entrySource = normalizeWebEntrySource_(
        payload.entrySource || "Mobile bulk care"
    );

    const plantRecords = plantRecordsById_(spreadsheet);
    const plants = plantIds.map((plantId) => {
        const plant = plantRecords.get(plantId);
        if (!plant) throw new Error(`Plant ID ${plantId} is not valid.`);
        return plant;
    });
    const details = eventDetailsFromPayload_(payload, eventNames, null);
    const notes = cleanText_(payload.notes);
    const observationDate = normalizeDate_(payload.observedAt);
    const baseRequestId = normalizeRequestId_(payload.requestId, true);
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
                condition: cleanText_(payload.condition),
                soilMoisture: cleanText_(payload.soilMoisture),
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
    const failedIndex = batch.results.findIndex((result) => !result?.ok);
    if (failedIndex >= 0) {
        const failed = batch.results[failedIndex];
        throw new Error(
            failed?.message ||
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
    if (!requested.length) {
        throw new Error("Choose at least one bulk-care event.");
    }
    const invalid = requested.filter(
        (eventName) => !BULK_WEB_EVENT_OPTIONS.includes(eventName)
    );
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

function getRecentWebObservations(limit, filters = {}) {
    const spreadsheet = getGardenSpreadsheet_();
    const plantNames = plantNamesById_(spreadsheet);
    const normalizedFilters = normalizeWebHistoryFilters_(filters, plantNames);
    return recentObservationsFromRows_(
        readHistorySnapshot_(spreadsheet),
        spreadsheet.getSpreadsheetTimeZone(),
        normalizeRecentLimit_(limit),
        plantNames,
        normalizedFilters
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

    const requestId = normalizeRequestId_(
        payload ? payload.requestId : payload,
        true
    );
    const plantIds = uniqueTextValues_(
        Array.isArray(payload.plantIds) ? payload.plantIds : []
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
    if (typeof request === "string") {
        return { requestId: normalizeRequestId_(request, true) };
    }
    const requestId = normalizeRequestId_(
        request ? request.requestId : request,
        true
    );
    const plantId = cleanText_(request.plantId);
    const rawExpectedCount = request.expectedCount;
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
    if (!event?.range) {
        return;
    }

    const range = event.range;
    const sheet = range.getSheet();
    if (sheet.getName() !== GARDEN_LOGGER.quickLogSheet) {
        return;
    }

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

    ensureQuickLogWaterColumns_(quickLog);
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
    ensureHistoryWaterColumns_(history, true);
    ensureHistoryView_(spreadsheet);
    const appEntries = requireSheet_(
        spreadsheet,
        GARDEN_LOGGER.appSheetEntriesSheet
    );
    ensureAppSheetEntryColumns_(appEntries, true);
    ensureQuickLogWaterColumns_(quickLog, true);
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
    quickLog.hideColumns(GARDEN_LOGGER.weightStateColumn);
    history.hideColumns(GARDEN_LOGGER.historyWeightStateColumn);
    const historyView = requireSheet_(
        spreadsheet,
        GARDEN_LOGGER.historyViewSheet
    );
    historyView.hideColumns(GARDEN_LOGGER.historyWeightStateColumn);

    PropertiesService.getDocumentProperties().setProperties({
        gardenLoggerVersion: GARDEN_LOGGER.version,
        gardenLoggerInstalledAt: new Date().toISOString(),
    });

    quickLog
        .getRange("E4")
        .setNote(
            "Optional main event. Weight infers Weigh; height or width infers Measure. A weight saved with Water is Wet; otherwise the first positive weight within five days after Water is Wet. The last eligible non-Wet weight before a later Water is Dry; other weights remain Routine."
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
        `Logger ${GARDEN_LOGGER.version} is ready. Weight state is inferred automatically, and rotations default to 90° when selected.`,
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

/**
 * Rebuilds the human-facing Dashboard, Baselines, and P01-P30 workbook pages.
 * Canonical History and writable intake data are never rewritten here.
 */
function refreshGardenWorkbook() {
    const spreadsheet = getGardenSpreadsheet_();
    const plants = workbookPlantRecords_(spreadsheet);
    refreshBaselineView_(spreadsheet, plants);
    refreshDashboardView_(spreadsheet, plants);
    plants.forEach((plant, index) =>
        refreshPlantPage_(spreadsheet, plants, index, plant)
    );
    organizeWorkbookSheets_(spreadsheet);
    installDailyCareDashboard();
    SpreadsheetApp.flush();
    spreadsheet.toast(
        `Dashboard, Baselines, and ${plants.length} plant pages were refreshed for logger ${GARDEN_LOGGER.version}.`,
        "Garden workbook refreshed",
        8
    );
    return {
        loggerVersion: GARDEN_LOGGER.version,
        plantPages: plants.length,
        baselineColumns: BASELINE_VIEW_HEADERS.length,
        dashboardColumns: DASHBOARD_VIEW_HEADERS.length,
    };
}

/**
 * Refreshes P01-P10 without rebuilding the shared workbook views.
 * Use the page batches when a complete workbook refresh exceeds the Apps
 * Script execution or Google Sheets service limit.
 */
function refreshGardenWorkbookPages01To10() {
    return refreshGardenWorkbookPageRange_(0, 10);
}

/** Refreshes P11-P20 without rebuilding the shared workbook views. */
function refreshGardenWorkbookPages11To20() {
    return refreshGardenWorkbookPageRange_(10, 20);
}

/** Refreshes P21-P30 without rebuilding the shared workbook views. */
function refreshGardenWorkbookPages21To30() {
    return refreshGardenWorkbookPageRange_(20, 30);
}

function refreshGardenWorkbookPageRange_(startIndex, endIndex) {
    const spreadsheet = getGardenSpreadsheet_();
    const plants = workbookPlantRecords_(spreadsheet);
    const pageBatch = plants.slice(startIndex, endIndex);
    pageBatch.forEach((plant, batchIndex) =>
        refreshPlantPage_(spreadsheet, plants, startIndex + batchIndex, plant)
    );
    organizeWorkbookSheets_(spreadsheet);
    SpreadsheetApp.flush();
    const firstPlant = pageBatch[0].id;
    const lastPlant = pageBatch.at(-1).id;
    spreadsheet.toast(
        `${firstPlant}-${lastPlant} pages were refreshed for logger ${GARDEN_LOGGER.version}.`,
        "Garden plant pages refreshed",
        8
    );
    return {
        loggerVersion: GARDEN_LOGGER.version,
        firstPlant,
        lastPlant,
        plantPages: pageBatch.length,
    };
}

function workbookPlantRecords_(spreadsheet) {
    const tracker = requireSheet_(spreadsheet, GARDEN_LOGGER.plantTrackerSheet);
    const rowCount = Math.max(0, tracker.getLastRow() - 1);
    const range = tracker.getRange(
        2,
        1,
        rowCount,
        GARDEN_LOGGER.currentLabelColumn
    );
    const values = range.getDisplayValues();
    const formulas = range.getFormulas();
    const byId = new Map();
    values.forEach((row, index) => {
        const id = cleanText_(row[0]);
        if (!id) return;
        byId.set(id, {
            id,
            name: cleanText_(row[1]) || id,
            scientificName: cleanText_(row[2]),
            label: cleanText_(row[GARDEN_LOGGER.currentLabelColumn - 1]),
            fieldGuideUrl: fieldGuideUrlForRow_(formulas[index]),
            trackerRow: index + 2,
        });
    });
    const plants = APP_SHEET_BULK_PLANTS.map((id) => byId.get(id));
    const missing = APP_SHEET_BULK_PLANTS.filter((id, index) => !plants[index]);
    if (missing.length) {
        throw new Error(
            `Plant tracker is missing workbook pages for: ${missing.join(", ")}.`
        );
    }
    return plants;
}

const DRY_DOWN_MODEL_HEADERS = Object.freeze([
    "Plant ID",
    "Pot setup",
    "Completed dry (g)",
    "Current wet (g)",
    "Current-cycle points",
    "Learned cycles",
    "Modeled loss (g/day)",
    "Forecast date",
    "Window start",
    "Window end",
    "Forecast basis",
    "Trend readiness",
    "Trend review",
    "Current fit",
    "Recommended water date",
    "Watering guidance",
]);

/**
 * One range calculation for the entire collection, not one server call per cell.
 * Input columns: serial date, plant, event, recorded state, grams, setup,
 * request ID, batch ID, record status, watering application, quality, method,
 * observation ID, and corrected observation ID. Older 12-column calls remain valid.
 * Dates are numeric Sheets serials so the workbook timezone survives round trips.
 * No services, volatile inputs, stored state, or writes to History are involved.
 * @customfunction
 */
function GARDEN_DRY_DOWN(history, plantIds) {
    // Sheets supplies a scalar for a one-cell range, even when written A1:A1.
    const ids = Array.isArray(plantIds) ? plantIds : [[plantIds]];
    const grouped = new Map();
    const correctionOrder = correctionRecordContext_(
        history.map((row, index) => ({
            index,
            id: cleanText_(row[12]),
            corrects: cleanText_(row[13]),
            plant: cleanText_(row[1]),
            event: cleanText_(row[2]),
            setup: positiveIntegerOrDefault_(row[5], 1),
            active: row[8] !== "Removed",
        }))
    ).order;
    history.forEach((row, index) => {
        const id = cleanText_(row[1]);
        if (!id || row[8] === "Removed") return;
        const records = grouped.get(id) || [];
        const date = Number(row[0]);
        const setup = positiveIntegerOrDefault_(row[5], 1);
        // Retain setup markers even when the event has no usable weight/date.
        records.push({
            index: correctionOrder[index],
            date,
            setup,
            event: cleanText_(row[2]),
            weight: Number(row[4]),
            save: cleanText_(row[7] || row[6]),
            application: cleanText_(row[9]),
            estimated: /estimat/i.test(String(row[10]) + " " + String(row[11])),
        });
        grouped.set(id, records);
    });
    return ids
        .filter(([id]) => cleanText_(id))
        .map(([id]) => {
            const model = dryDownModelForPlant_(
                grouped.get(cleanText_(id)) || []
            );
            const watering = wateringRecommendation_(cleanText_(id), model);
            return [
                cleanText_(id),
                model.setup,
                model.dry,
                model.wet,
                model.count,
                model.learned,
                model.loss,
                model.date,
                model.early,
                model.late,
                model.basis,
                model.readiness,
                model.review,
                model.fit,
                watering.date,
                watering.guidance,
            ];
        });
}

/**
 * Conditional planning dates, not automatic watering instructions. A completed
 * pre-water weight is not proof of bone-dry soil. The learned dry-down curve
 * updates the date; it cannot learn an optimal drought delay from watering
 * timestamps without independent root-zone and plant-condition evidence.
 */
function wateringRecommendation_(plantId, model) {
    const manual = {
        P21: "Inspect upper 2 in of mix; water when dry there. Do not wait for the whole root ball to become bone dry.",
        P28: "Inspect inner-leaf firmness and leaf replacement. A dry pot or wrinkled old leaves alone do not mean water.",
    };
    if (manual[plantId]) {
        return { date: "", guidance: manual[plantId] };
    }
    if (!/^P(?:0[1-9]|[12]\d|30)$/.test(plantId)) {
        return {
            date: "",
            guidance: "No verified watering rule — inspect plant.",
        };
    }
    const guidance = wateringReadinessGuidance_(plantId);
    if (
        typeof model.date !== "number" ||
        !Number.isFinite(model.date) ||
        model.date <= 0
    ) {
        return { date: "", guidance: model.basis + ". " + guidance };
    }
    return {
        date: Math.ceil(model.date),
        guidance: "Estimated; confirm readiness first. " + guidance,
    };
}

function wateringReadinessGuidance_(plantId) {
    if (plantId === "P22") {
        return "During active growth, let much of the mix dry; no extra drought delay. If resting, inspect before watering.";
    }
    if (["P20", "P30"].includes(plantId)) {
        return "Confirm the shared root zone is dry and inspect every component; no fixed extra dry days.";
    }
    return "Confirm the root zone is dry and the plant is ready; reduce watering during rest. No fixed extra dry days.";
}

function dryDownRecordsShareSave_(left, right) {
    return left.save && right.save
        ? left.save === right.save
        : left.date === right.date;
}

/**
 * @typedef {object} DryDownRecord
 * @property {number} index
 * @property {number} date
 * @property {number} setup
 * @property {string} event
 * @property {number} weight
 * @property {string} save
 * @property {string} application
 * @property {boolean} estimated
 */

/** @param {DryDownRecord[]} records */
function dryDownCycles_(records) {
    const ordered = records
        .filter((r) => Number.isFinite(r.date) && r.date > 0)
        .sort((a, b) => a.date - b.date || a.index - b.index);
    const weights = ordered.filter(
        (r) =>
            r.event === "Weigh" &&
            Number.isFinite(r.weight) &&
            r.weight > 0 &&
            !r.estimated
    );
    const waterings = ordered.filter((r) => r.event === "Water");
    /** @type {{water: DryDownRecord, next: DryDownRecord | undefined,
     * wet: DryDownRecord | undefined, points: DryDownRecord[],
     * dry: DryDownRecord | null, beforeDry: DryDownRecord | undefined}[]} */
    const cycles = waterings.map((water, index) => {
        const next = waterings[index + 1];
        // Save identity wins over row ordering (Weigh can precede Water).
        const within = (r) =>
            (!next ||
                r.date < next.date ||
                (r.date === next.date && r.index < next.index)) &&
            (!next || !dryDownRecordsShareSave_(r, next));
        const sameSave = weights.findLast(
            (r) =>
                r.date >= water.date &&
                r.date <= water.date + WET_WEIGHT_WINDOW_DAYS &&
                dryDownRecordsShareSave_(r, water) &&
                within(r)
        );
        const wet =
            sameSave ||
            weights.find(
                (r) =>
                    (r.date > water.date ||
                        (r.date === water.date && r.index > water.index)) &&
                    r.date <= water.date + WET_WEIGHT_WINDOW_DAYS &&
                    within(r)
            );
        const points = wet
            ? weights.filter(
                  (r) =>
                      (r.date > wet.date ||
                          (r.date === wet.date && r.index >= wet.index)) &&
                      within(r)
              )
            : [];
        return { water, next, wet, points, dry: null, beforeDry: undefined };
    });
    const wetIndices = new Set(
        cycles.flatMap((c) => (c.wet ? [c.wet.index] : []))
    );
    /** @type {DryDownRecord | null} */
    let previous = null;
    cycles.forEach((cycle) => {
        cycle.beforeDry = weights.findLast(
            (r) =>
                (!previous ||
                    r.date > previous.date ||
                    (r.date === previous.date && r.index > previous.index)) &&
                (r.date < cycle.water.date ||
                    (r.date === cycle.water.date &&
                        r.index < cycle.water.index)) &&
                !wetIndices.has(r.index) &&
                !dryDownRecordsShareSave_(r, cycle.water)
        );
        previous = cycle.water;
    });
    cycles.forEach((cycle, index) => {
        cycle.dry = cycles[index + 1]?.beforeDry || null;
    });
    return cycles;
}

/**
 * Log-linear exponential fit with an observed endpoint and a small positive
 * noise band. The asymptote is dry - tolerance, not zero whole-pot weight.
 * This permits a measured completed endpoint in a log fit without log(0).
 */
function fitDryDownCurve_(points, dry, tolerance) {
    const unique = new Map(points.map((p) => [p.date, p]));
    const recent = [...unique.values()]
        .sort((a, b) => a.date - b.date)
        .slice(-12);
    const empty = {
        count: recent.length,
        span: 0,
        fit: 0,
        decay: 0,
        error: 0,
        gain: false,
    };
    if (recent.length < 2) return empty;
    const span = recent.at(-1).date - recent[0].date;
    const gain = recent.some(
        (p, i) =>
            i > 0 &&
            p.weight - recent[i - 1].weight > Math.max(2, tolerance * 2)
    );
    const floor = dry - tolerance;
    if (span < 1 || recent.some((p) => p.weight <= floor)) {
        return { ...empty, span, gain };
    }
    const xs = recent.map((p) => p.date - recent[0].date);
    const ys = recent.map((p) => Math.log(p.weight - floor));
    const xMean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;
    const xx = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);
    const yy = ys.reduce((sum, y) => sum + (y - yMean) ** 2, 0);
    const xy = xs.reduce((sum, x, i) => sum + (x - xMean) * (ys[i] - yMean), 0);
    const slope = xy / xx;
    const fit = yy > 0 ? Math.min(1, xy ** 2 / (xx * yy)) : 0;
    const residualError = ys.reduce(
        (sum, y, i) => sum + (y - yMean - slope * (xs[i] - xMean)) ** 2,
        0
    );
    const error =
        recent.length > 2 && slope !== 0
            ? Math.sqrt(residualError / (recent.length - 2) / xx) /
              Math.abs(slope)
            : 1;
    return { count: recent.length, span, fit, decay: -slope, error, gain };
}

function usableDryDownCurve_(curve) {
    return (
        curve.count >= 4 &&
        curve.span >= 3 &&
        curve.fit >= 0.6 &&
        curve.decay > 0 &&
        !curve.gain
    );
}

function fullWateringForForecast_(water) {
    // Blank is the legacy contract; do not invent an application in History.
    return ["", "Flood / soak-through", "Thorough"].includes(water.application);
}

function learnedDryDownCurves_(cycles, current) {
    return cycles
        .slice(0, -1)
        .flatMap((cycle) => {
            const endpoint = cycle.dry;
            if (
                !cycle.wet ||
                !endpoint ||
                !fullWateringForForecast_(cycle.water) ||
                !fullWateringForForecast_(cycle.next) ||
                current.water.date - endpoint.date > 180
            )
                return [];
            const capacity = cycle.wet.weight - endpoint.weight;
            if (capacity <= Math.max(5, cycle.wet.weight * 0.01)) return [];
            const curve = fitDryDownCurve_(
                cycle.points,
                endpoint.weight,
                Math.max(2, capacity * 0.05)
            );
            if (!usableDryDownCurve_(curve)) return [];
            return [{ ...curve, ended: endpoint.date }];
        })
        .slice(-5);
}

/** @param {DryDownRecord[]} records */
function dryDownModelForPlant_(records) {
    const setup = Math.max(1, ...records.map((r) => r.setup));
    const cycles = dryDownCycles_(records.filter((r) => r.setup === setup));
    const current = cycles.at(-1);
    /** @type {{setup: number, dry: number | "", wet: number | "", count: number,
     * learned: number, loss: number | "", date: number | "", early: number | "",
     * late: number | "", basis: string, readiness: string, review: string, fit: number | ""}} */
    const model = {
        setup,
        dry: "",
        wet: "",
        count: 0,
        learned: 0,
        loss: "",
        date: "",
        early: "",
        late: "",
        basis: "Need a watering",
        readiness: "Need 4 post-water weights",
        review: "No trend",
        fit: "",
    };
    if (!current) return model;
    const completedDry = cycles.map((c) => c.beforeDry).findLast(Boolean);
    model.dry = completedDry ? completedDry.weight : "";
    model.wet = current.wet ? current.wet.weight : "";
    model.count = new Set(current.points.map((p) => p.date)).size;
    if (!current.wet)
        return { ...model, basis: "Need a wet weight within 5 days" };
    if (!fullWateringForForecast_(current.water)) {
        return {
            ...model,
            basis: "Partial / spot watering — reweigh",
            readiness: "Full-cycle forecast not applicable",
        };
    }
    if (!completedDry) return { ...model, basis: "Need a completed dry cycle" };
    const capacity = current.wet.weight - completedDry.weight;
    if (capacity <= Math.max(5, current.wet.weight * 0.01)) {
        return { ...model, basis: "Recheck wet / dry anchors" };
    }
    const tolerance = Math.max(2, capacity * 0.05);
    const curve = fitDryDownCurve_(
        current.points,
        completedDry.weight,
        tolerance
    );
    model.fit = curve.count >= 2 ? curve.fit : "";
    const learned = learnedDryDownCurves_(cycles, current);
    model.learned = learned.length;
    const supported = usableDryDownCurve_(curve);
    model.readiness = dryDownCurrentReadiness_(curve, supported);
    if (dryDownCurveContradicts_(curve)) {
        return {
            ...model,
            basis: "Current cycle differs — reweigh",
            review: curve.gain
                ? "Unexpected gain — check setup"
                : "Recheck curve",
        };
    }
    if (!supported && learned.length === 0) {
        return { ...model, basis: model.readiness };
    }
    return applyDryDownForecast_(
        model,
        current,
        curve,
        learned,
        tolerance,
        supported
    );
}

function dryDownCurrentReadiness_(curve, supported) {
    const collecting =
        curve.count < 4
            ? "Need 4 post-water weights"
            : "Need a stable 3-day curve";
    return supported ? "Current cycle supported" : collecting;
}

function dryDownCurveContradicts_(curve) {
    return (
        curve.gain ||
        (curve.count >= 4 &&
            curve.span >= 3 &&
            (curve.decay <= 0 || curve.fit < 0.6))
    );
}

function dryDownPrior_(learned, currentDate) {
    const weights = learned.map(
        (c) => c.fit * Math.exp((-Math.LN2 * (currentDate - c.ended)) / 60)
    );
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum <= 0) return { log: 0, spread: 0 };
    const log =
        learned.reduce(
            (total, c, i) => total + weights[i] * Math.log(c.decay),
            0
        ) / sum;
    const spread = Math.sqrt(
        learned.reduce(
            (total, c, i) =>
                total + weights[i] * (Math.log(c.decay) - log) ** 2,
            0
        ) / sum
    );
    return { log, spread };
}

/** Early points can update a learned estimate, but never fully replace it. */
function dryDownCurrentInfluence_(curve, hasHistory, currentUsable, supported) {
    const early = Math.min(0.4, (curve.count - 1) * 0.2, curve.span / 10);
    const supportedInfluence = Math.min(1, 0.7 + (curve.count - 4) * 0.15);
    const currentInfluence = supported ? supportedInfluence : early;
    const learnedInfluence = currentUsable ? currentInfluence : 0;
    return hasHistory ? learnedInfluence : 1;
}

function dryDownMinimumSpread_(curve, learnedCount, supported) {
    const historical = learnedCount > 1 ? Math.log(1.4) : Math.log(1.6);
    return supported && curve.count >= 6 ? Math.log(1.25) : historical;
}

function dryDownForecastBasis_(alpha, supported) {
    const current =
        alpha < 1 ? "Current curve + history" : "Current-cycle curve";
    const updated = supported ? current : "Blended historical estimate";
    return alpha === 0 ? "Historical estimate" : updated;
}

function dryDownForecastReview_(
    curve,
    learnedCount,
    priorLog,
    lossFraction,
    supported
) {
    const historical =
        curve.decay > Math.exp(priorLog) * 1.75
            ? "Faster than learned — reweigh"
            : "OK";
    const unlearned = lossFraction > 0.03 ? "Rapid loss — reweigh" : "OK";
    const current = learnedCount > 0 ? historical : unlearned;
    return supported ? current : "No current-cycle alert";
}

function applyDryDownForecast_(
    model,
    current,
    curve,
    learned,
    tolerance,
    supported
) {
    const latest = current.points.at(-1) || current.wet;
    const prior = dryDownPrior_(learned, current.water.date);
    const currentUsable =
        curve.span >= 1 && curve.decay > 0 && curve.fit >= 0.6;
    const alpha = dryDownCurrentInfluence_(
        curve,
        learned.length > 0,
        currentUsable,
        supported
    );
    const currentLog = currentUsable ? Math.log(curve.decay) : prior.log;
    const decay = Math.exp((1 - alpha) * prior.log + alpha * currentLog);
    const residual = latest.weight - (model.dry - tolerance);
    const days = Math.max(
        0,
        Math.log(Math.max(1, residual / (tolerance * 2))) / decay
    );
    if (!Number.isFinite(days) || days > 90) {
        return { ...model, basis: "Forecast too uncertain — reweigh" };
    }
    // A planning envelope, NOT a statistical confidence interval.
    const spread = Math.min(
        Math.log(3),
        Math.max(
            dryDownMinimumSpread_(curve, learned.length, supported),
            prior.spread * 1.64,
            supported ? curve.error * 1.64 : 0,
            Math.abs(currentLog - prior.log) * Math.sqrt(alpha * (1 - alpha))
        )
    );
    model.loss = decay * Math.max(0, residual);
    model.date = latest.date + days;
    model.early = latest.date + Math.max(0, days / Math.exp(spread) - 1);
    model.late = latest.date + days * Math.exp(spread) + 1;
    model.basis = dryDownForecastBasis_(alpha, supported);
    model.readiness = supported
        ? "Current cycle supported"
        : "Historical estimate · " + curve.count + "/4 current readings";
    model.review = dryDownForecastReview_(
        curve,
        learned.length,
        prior.log,
        model.loss / latest.weight,
        supported
    );
    return model;
}

function dryDownSerialDate_(value, timeZone) {
    const date = new Date(value);
    if (!value || !Number.isFinite(date.getTime())) return 0;
    const offset = Utilities.formatDate(date, timeZone, "Z").match(
        /^([+-])(\d{2})(\d{2})$/
    );
    let minutes = 0;
    if (offset) {
        minutes = Number(offset[2]) * 60 + Number(offset[3]);
        if (offset[1] === "-") minutes = -minutes;
    }
    return date.getTime() / 86400000 + 25569 + minutes / 1440;
}

function dryDownModelsFromHistory_(historyRows, plantIds, timeZone) {
    const rows = historyRows.map((row) => [
        dryDownSerialDate_(row[0], timeZone),
        row[1],
        row[2],
        row[3],
        row[4],
        row[10],
        row[15],
        row[29],
        row[35],
        row[40],
        row[28],
        row[34],
        row[26],
        row[30],
    ]);
    const today = dryDownSerialDate_(new Date(), timeZone);
    const day = (value) =>
        Utilities.formatDate(
            new Date((value - 25569) * 86400000),
            "UTC",
            "MMM d"
        );
    return new Map(
        GARDEN_DRY_DOWN(rows, plantIds).map((model) => {
            let window = "";
            if (model[7] !== "") {
                const overdue =
                    Number(model[9]) < Math.floor(today)
                        ? "Overdue — reweigh · "
                        : "";
                window = overdue + day(model[8]) + "–" + day(model[9]);
            }
            let basis = String(model[10]);
            if (model[5]) {
                const suffix = model[5] === 1 ? "" : "s";
                basis += " · " + model[5] + " learned cycle" + suffix;
            }
            const waterDate = model[14] === "" ? "" : day(model[14]);
            return [
                model[0],
                { window, basis, waterDate, waterGuidance: model[15] },
            ];
        })
    );
}

function dryDownModelFormula_() {
    return "=GARDEN_DRY_DOWN({ARRAYFORMULA(N(History!A2:A5000)),History!B2:E5000,History!K2:K5000,History!P2:P5000,History!AD2:AD5000,History!AJ2:AJ5000,History!AO2:AO5000,History!AC2:AC5000,History!AI2:AI5000,History!AA2:AA5000,History!AE2:AE5000},'Plant tracker'!A2:A31)";
}

function dryDownLookupFormula_(row, column) {
    return `XLOOKUP($A${row},'Dry-down models'!$A$2:$A$31,'Dry-down models'!$${column}$2:$${column}$31,"")`;
}

function refreshDryDownModels_(spreadsheet) {
    const sheet =
        spreadsheet.getSheetByName(GARDEN_LOGGER.dryDownModelsSheet) ||
        spreadsheet.insertSheet(GARDEN_LOGGER.dryDownModelsSheet);
    ensureSheetColumnCapacity_(sheet, DRY_DOWN_MODEL_HEADERS.length);
    ensureSheetRowCapacity_(sheet, APP_SHEET_BULK_PLANTS.length + 1);
    sheet
        .getRange(1, 1, 1, DRY_DOWN_MODEL_HEADERS.length)
        .setValues([[...DRY_DOWN_MODEL_HEADERS]]);
    sheet
        .getRange(
            2,
            1,
            APP_SHEET_BULK_PLANTS.length,
            DRY_DOWN_MODEL_HEADERS.length
        )
        .clearContent();
    sheet.getRange("A2").setFormula(dryDownModelFormula_());
    sheet.getRange("H2:J31").setNumberFormat("mmm d, yyyy");
    sheet.getRange("O2:O31").setNumberFormat("mmm d, yyyy");
    sheet
        .getRange("A1")
        .setNote(
            "Read-only derived models. Recalculates from active History; no editable observations. Keep this helper disconnected from AppSheet."
        );
    sheet.hideSheet();
}

/** Update only forecast formulas; preserve owner layout, charts, and all History. */
function installDryDownLearning() {
    const spreadsheet = getGardenSpreadsheet_();
    const plants = workbookPlantRecords_(spreadsheet);
    refreshDryDownModels_(spreadsheet);
    const sheet = requireSheet_(spreadsheet, GARDEN_LOGGER.baselinesSheet);
    [9, 10, 12, 19, 21, 23, 25, 31, 32, 33, 34].forEach((column) => {
        sheet
            .getRange(2, column, plants.length, 1)
            .setValues(
                plants.map((plant, index) => [
                    baselineViewRow_(index + 2, plant)[column - 1],
                ])
            );
    });
    sheet.getRange("I2:J31").setWrap(true);
    sheet.getRange("L2:L31").setWrap(true);
    sheet.getRange("AG2:AG31").setWrap(true);
    sheet.autoResizeRows(2, plants.length);
    sheet
        .getRange("AE1:AG1")
        .setNotes([
            [
                "Exponential modeled loss at the latest reading, learned from up to five recent completed cycles of this plant/setup and updated by current-cycle weights.",
                "Near-dry reweigh estimate. See Next dry check for a planning window, not a watering deadline or statistical confidence interval.",
                "Historical, blended, or current-cycle basis; number of reliable completed cycles. Four readings across three days support the current curve, not every forecast.",
            ],
        ]);
    SpreadsheetApp.flush();
    return {
        loggerVersion: GARDEN_LOGGER.version,
        plants: plants.length,
        historyChanged: false,
        baselineColumns: BASELINE_VIEW_HEADERS.length,
    };
}

function completedDryWeightFormula_(row) {
    return "=" + dryDownLookupFormula_(row, "C");
}

/** Append only the requested derived columns; keep owner charts/layout intact. */
function installWateringRecommendations() {
    const spreadsheet = getGardenSpreadsheet_();
    const plants = workbookPlantRecords_(spreadsheet);
    /** @type {[string, number, number, string][]} */
    const targets = [
        [GARDEN_LOGGER.baselinesSheet, 1, 35, "A"],
        ["Dashboard", 6, 22, "B"],
    ];
    // Preflight both destinations before changing either one.
    targets.forEach(([name, headerRow, column]) => {
        const sheet = requireSheet_(spreadsheet, name);
        if (sheet.getMaxColumns() < column) {
            return;
        }
        const width = Math.min(2, sheet.getMaxColumns() - column + 1);
        const destination = sheet.getRange(
            headerRow,
            column,
            plants.length + 1,
            width
        );
        const values = destination.getValues();
        const formulas = destination.getFormulas();
        const headers = values[0];
        const expected = ["Recommended water date", "Watering guidance"];
        headers.forEach((value, index) => {
            const unlabelledContent =
                value === "" &&
                values.some(
                    (row, rowIndex) =>
                        row[index] !== "" || formulas[rowIndex][index] !== ""
                );
            if (
                (value !== "" && value !== expected[index]) ||
                unlabelledContent
            ) {
                throw new Error(
                    `Unexpected ${name} column ${column + index}; review before installing.`
                );
            }
        });
    });
    installDryDownLearning();
    targets.forEach(([name, headerRow, column, idColumn]) => {
        const sheet = requireSheet_(spreadsheet, name);
        ensureSheetColumnCapacity_(sheet, column + 1);
        ensureSheetRowCapacity_(sheet, headerRow + plants.length);
        sheet
            .getRange(headerRow, column, 1, 2)
            .setValues([["Recommended water date", "Watering guidance"]]);
        sheet
            .getRange(headerRow + 1, column, plants.length, 2)
            .setValues(
                plants.map((_, index) =>
                    ["O", "P"].map(
                        (modelColumn) =>
                            `=XLOOKUP($${idColumn}${headerRow + index + 1},'Dry-down models'!$A$2:$A$31,'Dry-down models'!$${modelColumn}$2:$${modelColumn}$31,"")`
                    )
                )
            );
        formatWateringRecommendationColumns_(
            sheet,
            headerRow,
            column,
            plants.length
        );
    });
    SpreadsheetApp.flush();
    return {
        loggerVersion: GARDEN_LOGGER.version,
        plants: plants.length,
        historyChanged: false,
    };
}

function formatWateringRecommendationColumns_(sheet, headerRow, column, count) {
    sheet
        .getRange(headerRow, column, 1, 2)
        .setBackground("#24533f")
        .setFontColor("#ffffff")
        .setFontWeight("bold")
        .setWrap(true)
        .setNotes([
            [
                "Conditional planning date from the learned same-plant, same-pot dry-down curve. Confirm actual dryness and plant readiness; not a watering deadline. No universal 4- or 6-day drought delay.",
                "Plant-specific readiness checks. Money tree and split rock intentionally have no weight-only water date. Historical watering timing does not establish an optimal drought duration.",
            ],
        ]);
    sheet
        .getRange(headerRow + 1, column, count, 1)
        .setNumberFormat("mmm d, yyyy");
    sheet
        .getRange(headerRow + 1, column, count, 2)
        .setBackground("#edf4ee")
        .setFontColor("#173c2b")
        .setWrap(true)
        .setVerticalAlignment("middle");
    sheet.setColumnWidth(column, 165);
    sheet.setColumnWidth(column + 1, 360);
    sheet.autoResizeRows(headerRow + 1, count);
}

// Match the public growth-series policy without changing canonical evidence.
function measuredDimensionCondition_() {
    return '(((LOWER(TRIM(History!$AC$2:$AC$5000))="measured")+((LOWER(TRIM(History!$AC$2:$AC$5000))="corrected")*(LOWER(TRIM(History!$AI$2:$AI$5000))="ruler")))>0)*(REGEXMATCH(LOWER(History!$AI$2:$AI$5000),"estimat")=FALSE)';
}

function remeasureStatusFormula_(row) {
    return `=LET(lastEstimate,IFNA(MAX(FILTER(History!$A$2:$A$5000,History!$B$2:$B$5000=$A${row},History!$C$2:$C$5000="Measure",REGEXMATCH(LOWER(History!$AC$2:$AC$5000&" "&History!$AI$2:$AI$5000),"estimat"),History!$AJ$2:$AJ$5000<>"Removed")),0),lastMeasured,IFNA(MAX(FILTER(History!$A$2:$A$5000,History!$B$2:$B$5000=$A${row},History!$C$2:$C$5000="Measure",${measuredDimensionCondition_()},History!$AJ$2:$AJ$5000<>"Removed")),0),IF(lastEstimate>lastMeasured,"Due now",IF(lastMeasured>0,"Current","No measurement")))`;
}

function appPlantChartsFormula_() {
    return `=IFNA(LET(eligible,ARRAYFORMULA(${measuredDimensionCondition_()}),heights,ARRAYFORMULA(IF(eligible,History!AL2:AL5000,"")),widths,ARRAYFORMULA(IF(eligible,History!AM2:AM5000,"")),FILTER({History!A2:A5000,History!B2:B5000,History!E2:E5000,ARRAYFORMULA(IF(History!E2:E5000="","",History!E2:E5000/453.59237)),heights,widths,History!O2:O5000,ARRAYFORMULA(IF(History!O2:O5000="","",History!E2:E5000))},History!AJ2:AJ5000<>"Removed",History!B2:B5000<>"",((History!E2:E5000<>"")+(heights<>"")+(widths<>""))>0)),"")`;
}

function plantChartHelperFormula_(plantId) {
    return `=IFNA(SORT(FILTER({'App plant charts'!A2:A5000,'App plant charts'!C2:C5000,ARRAYFORMULA(IF('App plant charts'!E2:E5000="","",'App plant charts'!E2:E5000*2.54)),ARRAYFORMULA(IF('App plant charts'!F2:F5000="","",'App plant charts'!F2:F5000*2.54))},'App plant charts'!B2:B5000="${formulaString_(plantId)}"),1,TRUE),"")`;
}

function latestWetWeightFormula_(row) {
    return "=" + dryDownLookupFormula_(row, "D");
}

function currentCyclePointCountFormula_(row) {
    return "=" + dryDownLookupFormula_(row, "E");
}

function currentCurveLossFormula_(row) {
    return "=" + dryDownLookupFormula_(row, "G");
}

function predictedDryDateFormula_(row) {
    return "=" + dryDownLookupFormula_(row, "H");
}

/** Reuse the measured pair so legacy summaries respect correction ordering. */
function latestMeasuredWeightFormula_(row, valueColumn) {
    const pair = dailyCareWeightFormula_(
        row,
        { history: 5000, baseline: 1000 },
        "A"
    );
    return `=INDEX(${pair.slice(1)},1,${valueColumn})`;
}

function baselineViewRow_(rowNumber, plant) {
    const row = rowNumber;
    return [
        plant.id,
        plant.name,
        latestMeasuredWeightFormula_(row, 1),
        `=IF(C${row}="","",C${row}/453.59237)`,
        latestMeasuredWeightFormula_(row, 2),
        `=XLOOKUP($A${row},'Plant tracker'!$A:$A,'Plant tracker'!$AB:$AB,"Not recorded")`,
        `=XLOOKUP($A${row},'Plant tracker'!$A:$A,'Plant tracker'!$O:$O,"")`,
        `=IFS(V${row}<1,"Collecting weights",Y${row}="","Need a wet weight",W${row}="","Need a completed dry cycle",Z${row}="","Recheck weights",TRUE,"Calibrated")`,
        `=${dryDownLookupFormula_(row, "L")}`,
        `=LET(review,XLOOKUP($A${row},'Plant tracker'!$A:$A,'Plant tracker'!$AD:$AD,""),IF(review<>"",review,${dryDownLookupFormula_(row, "M")}))`,
        remeasureStatusFormula_(row),
        `=IF(AF${row}<>"",LET(early,${dryDownLookupFormula_(row, "I")},late,${dryDownLookupFormula_(row, "J")},IF(late<TODAY(),"Inspect / reweigh now","Reweigh "&TEXT(early,"mmm d")&"–"&TEXT(late,"mmm d"))),${dryDownLookupFormula_(row, "K")})`,
        `=IF(OR(AE${row}="",C${row}<=0),"",AE${row}/C${row})`,
        `=IF(MAX(N(O${row}),N(AA${row}))=0,"No anchor",IF(N(O${row})>=N(AA${row}),"Water","Repot"))`,
        `=IFNA(MAX(FILTER(History!$A$2:$A$5000,History!$B$2:$B$5000=$A${row},History!$C$2:$C$5000="Water",History!$K$2:$K$5000=$T${row},History!$AJ$2:$AJ$5000<>"Removed")),"")`,
        `=IFNA(INDEX(SORT(FILTER({History!$A$2:$A$5000,History!$H$2:$H$5000},History!$B$2:$B$5000=$A${row},History!$C$2:$C$5000="Check",History!$H$2:$H$5000<>"",History!$AJ$2:$AJ$5000<>"Removed"),1,FALSE),1,2),"Not recorded")`,
        `=IFNA(MAX(FILTER(History!$A$2:$A$5000,History!$B$2:$B$5000=$A${row},History!$C$2:$C$5000="Check",History!$AJ$2:$AJ$5000<>"Removed")),"")`,
        `=IFNA(INDEX(SORT(FILTER({History!$A$2:$A$5000,History!$AH$2:$AH$5000},History!$B$2:$B$5000=$A${row},History!$K$2:$K$5000=$T${row},History!$AH$2:$AH$5000<>"",History!$AJ$2:$AJ$5000<>"Removed"),1,FALSE),1,2),"Not recorded")`,
        `=LET(flags,TEXTJOIN(" · ",TRUE,IF(H${row}<>"Calibrated",H${row},""),IF(AND(J${row}<>"OK",J${row}<>"No trend",J${row}<>"No current-cycle alert",J${row}<>"Owner-confirmed normal"),J${row},""),IF(K${row}="Due now","Remeasure due",""),IF(REGEXMATCH(AG${row},"Overdue"),"Dry forecast overdue","")),IF(flags="","No current flags",flags))`,
        `=IFNA(MAX(FILTER(History!$K$2:$K$5000,History!$B$2:$B$5000=$A${row},History!$AJ$2:$AJ$5000<>"Removed")),1)`,
        currentCyclePointCountFormula_(row),
        `=COUNTIFS(History!$B$2:$B$5000,$A${row},History!$E$2:$E$5000,">0",History!$K$2:$K$5000,$T${row},History!$AJ$2:$AJ$5000,"<>Removed")`,
        completedDryWeightFormula_(row),
        `=COUNTIFS(History!$B$2:$B$5000,$A${row},History!$C$2:$C$5000,"Water",History!$K$2:$K$5000,$T${row},History!$AJ$2:$AJ$5000,"<>Removed")`,
        latestWetWeightFormula_(row),
        `=IF(OR(W${row}="",Y${row}="",Y${row}<=W${row}),"",Y${row}-W${row})`,
        `=IFNA(MAX(FILTER(History!$A$2:$A$5000,History!$B$2:$B$5000=$A${row},History!$C$2:$C$5000="Repot",History!$K$2:$K$5000=$T${row},History!$AJ$2:$AJ$5000<>"Removed")),"")`,
        `=IFNA(INDEX(SORT(FILTER({History!$A$2:$A$5000,History!$AC$2:$AC$5000},History!$B$2:$B$5000=$A${row},History!$C$2:$C$5000="Measure",History!$AJ$2:$AJ$5000<>"Removed"),1,FALSE),1,2),"No measurement")`,
        `=XLOOKUP($A${row},'Plant tracker'!$A:$A,'Plant tracker'!$AJ:$AJ,"Not recorded")`,
        `=XLOOKUP($A${row},'Plant tracker'!$A:$A,'Plant tracker'!$AI:$AI,"cm")`,
        currentCurveLossFormula_(row),
        predictedDryDateFormula_(row),
        `=LET(basis,${dryDownLookupFormula_(row, "K")},learned,${dryDownLookupFormula_(row, "F")},late,${dryDownLookupFormula_(row, "J")},basis&IF(learned>0," · "&learned&" learned cycle"&IF(learned=1,"","s"),"")&IF(AND(late<>"",late<TODAY())," · Overdue — reweigh",""))`,
        `=IF(AF${row}="",DATE(9999,12,31),AF${row})`,
        `=${dryDownLookupFormula_(row, "O")}`,
        `=${dryDownLookupFormula_(row, "P")}`,
    ];
}

function refreshBaselineView_(spreadsheet, plants) {
    refreshDryDownModels_(spreadsheet);
    const sheet = requireSheet_(spreadsheet, GARDEN_LOGGER.baselinesSheet);
    ensureSheetColumnCapacity_(sheet, BASELINE_VIEW_HEADERS.length);
    ensureSheetRowCapacity_(sheet, plants.length + 1);
    sheet
        .getRange(1, 1, sheet.getMaxRows(), BASELINE_VIEW_HEADERS.length)
        .clearContent();
    sheet
        .getRange(1, 1, 1, BASELINE_VIEW_HEADERS.length)
        .setValues([[...BASELINE_VIEW_HEADERS]])
        .setBackground("#24533f")
        .setFontColor("#ffffff")
        .setFontWeight("bold")
        .setWrap(true);
    sheet
        .getRange("V1:Y1")
        .setNotes([
            [
                "Count of all active weight readings in the current pot setup.",
                "Most recent eligible dry anchor: the final non-Wet weight before a later watering in the same pot setup.",
                "Count of active watering events in the current pot setup.",
                "Most recent Wet anchor: a same-save watering weight, or the first positive weight within five days after Water in the current pot setup.",
            ],
        ]);
    sheet
        .getRange("M1")
        .setNote(
            "Current modeled loss as a fraction of the latest whole-pot weight per day. The exponential curve slows as the pot approaches its completed dry anchor."
        );
    sheet
        .getRange("AE1:AG1")
        .setNotes([
            [
                "Exponential modeled loss at the latest reading, learned from up to five recent completed cycles of this plant/setup and updated by current-cycle weights.",
                "Near-dry reweigh estimate. See Next dry check for a planning window, not a watering deadline or statistical confidence interval.",
                "Historical, blended, or current-cycle basis; number of reliable completed cycles. Four readings across three days support the current curve, not every forecast.",
            ],
        ]);
    sheet
        .getRange(2, 1, plants.length, BASELINE_VIEW_HEADERS.length)
        .setValues(
            plants.map((plant, index) => baselineViewRow_(index + 2, plant))
        )
        .setVerticalAlignment("middle");
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(2);
    sheet.setHiddenGridlines(true);
    sheet.getRange(2, 3, plants.length, 1).setNumberFormat("0.0");
    sheet.getRange(2, 4, plants.length, 1).setNumberFormat("0.000");
    [5, 15, 17, 27].forEach((column) =>
        sheet
            .getRange(2, column, plants.length, 1)
            .setNumberFormat("mmm d, yyyy h:mm am/pm")
    );
    [32, 34].forEach((column) =>
        sheet
            .getRange(2, column, plants.length, 1)
            .setNumberFormat("mmm d, yyyy")
    );
    [23, 25, 26, 31].forEach((column) =>
        sheet.getRange(2, column, plants.length, 1).setNumberFormat("0.0")
    );
    sheet.getRange(2, 13, plants.length, 1).setNumberFormat("0.0000");
    sheet.setColumnWidths(1, BASELINE_VIEW_HEADERS.length, 120);
    sheet.setColumnWidth(2, 230);
    sheet.setColumnWidth(12, 210);
    sheet.setColumnWidth(18, 220);
    sheet.setColumnWidth(19, 240);
    sheet.setColumnWidth(33, 220);
    formatWateringRecommendationColumns_(sheet, 1, 35, plants.length);
    sheet.getRange("I2:J31").setWrap(true);
    sheet.getRange("L2:L31").setWrap(true);
    sheet.getRange("AG2:AG31").setWrap(true);
    sheet.autoResizeRows(2, plants.length);
}

/** Count numeric scale readings, using the same exclusions as the summary. */
function dashboardWeightCountFormula_(row) {
    return `=IF(TRIM($B${row})="","",SUMPRODUCT(IFERROR(N(EXACT(TRIM(History!$B$2:$B$5000),TRIM($B${row})))*N(EXACT(TRIM(History!$C$2:$C$5000),"Weigh"))*N(EXACT(TRIM(History!$AJ$2:$AJ$5000),"Removed")=FALSE)*N(ISNUMBER(History!$E$2:$E$5000))*N(History!$E$2:$E$5000>0)*N(REGEXMATCH(History!$AC$2:$AC$5000&" "&History!$AI$2:$AI$5000,"(?i)estimat")=FALSE),0)))`;
}

/** Install only Dashboard X6:X36; preserve every other cell and sheet. */
function installDashboardWeightCounts() {
    const spreadsheet = getGardenSpreadsheet_();
    const sheet = requireSheet_(spreadsheet, "Dashboard");
    if (sheet.getMaxRows() < 36) {
        throw new Error("Dashboard needs existing plant rows through row 36.");
    }
    if (sheet.getMaxColumns() >= 24) {
        const destination = sheet.getRange(6, 24, 31, 1);
        if (destination.isPartOfMerge()) {
            throw new Error(
                "Dashboard X6:X36 contains merged cells; review before installing."
            );
        }
        const values = destination.getValues();
        const formulas = destination.getFormulas();
        const header = values[0][0];
        if (
            (header !== "" && header !== "Weight measurements") ||
            (header === "" &&
                values.some(
                    (row, index) => row[0] !== "" || formulas[index][0] !== ""
                ))
        ) {
            throw new Error(
                "Unexpected Dashboard column X; review before installing."
            );
        }
    }
    ensureSheetColumnCapacity_(sheet, 24);
    sheet
        .getRange(6, 24)
        .setValue("Weight measurements")
        .setBackground("#24533f")
        .setFontColor("#ffffff")
        .setFontWeight("bold")
        .setWrap(true);
    sheet
        .getRange(7, 24, 30, 1)
        .setValues(
            Array.from({ length: 30 }, (_, index) => [
                dashboardWeightCountFormula_(index + 7),
            ])
        )
        .setNumberFormat("0");
    return {
        version: GARDEN_LOGGER.version,
        range: "Dashboard!X6:X36",
        plants: 30,
    };
}

/** Preflight every source before the scoped presentation installer writes. */
function dailyCareSources_(spreadsheet) {
    const dashboard = requireSheet_(spreadsheet, "Dashboard");
    const tracker = requireSheet_(spreadsheet, "Plant tracker");
    const baselines = requireSheet_(spreadsheet, "Baselines");
    const integrity = requireSheet_(spreadsheet, "Integrity");
    const history = requireSheet_(spreadsheet, "History");
    assertHeaders_(dashboard, DASHBOARD_VIEW_HEADERS, 6);
    assertHeaders_(baselines, BASELINE_VIEW_HEADERS, 1);
    assertHeaders_(tracker, ["Plant ID", "Plant / planter"], 1);
    if (tracker.getRange(1, 15).getDisplayValue() !== "Current pot label") {
        throw new Error("Plant tracker O1 must be Current pot label.");
    }
    assertHeaders_(integrity, ["Check", "Count", "Status", "What it means"], 4);
    assertHeaders_(
        integrity,
        [
            "Plant ID",
            "Plant",
            "Quality summary",
            "Priority",
            "Evidence",
            "Recommended action",
        ],
        23
    );
    if (history.getMaxColumns() < GARDEN_LOGGER.historyStoredColumns) {
        throw new Error(
            "Daily care requires the existing 42-column History schema."
        );
    }
    const historyHeaders = history.getRange(1, 1, 1, 42).getDisplayValues()[0];
    [
        [0, "Date"],
        [1, "Plant ID"],
        [2, "Event"],
        [4, "Weight (g)"],
        [9, "Recorded"],
        [10, "Pot setup"],
        [28, "Observation quality"],
        [34, "Measurement method"],
        [35, "Record status"],
        [41, "Water amount (mL)"],
    ].forEach(([index, header]) => {
        if (historyHeaders[index] !== header)
            throw new Error(`Unexpected History header: ${header}.`);
    });
    const bounds = {
        tracker: Math.max(2, tracker.getLastRow()),
        baseline: Math.max(2, baselines.getLastRow()),
        integrity: Math.max(24, integrity.getLastRow()),
        history: Math.min(
            history.getMaxRows(),
            GARDEN_LOGGER.historyCapacityRows
        ),
    };
    if (bounds.history < 2)
        throw new Error(
            "History needs room for the maintained observation range."
        );
    const plants = tracker
        .getRange(2, 1, bounds.tracker - 1, 2)
        .getDisplayValues()
        .map(([id, name]) => ({ id, name }))
        .filter((plant) => plant.id);
    if (
        !plants.length ||
        plants.some(
            (plant) => !/^P\d{2}$/u.test(plant.id) || !plant.name.trim()
        )
    ) {
        throw new Error("Daily care needs a valid current plant inventory.");
    }
    assertUniquePlantIds_(plants);
    const baselineIds = baselines
        .getRange(2, 1, bounds.baseline - 1, 1)
        .getDisplayValues()
        .flat();
    const integrityIds = integrity
        .getRange(24, 1, bounds.integrity - 23, 1)
        .getDisplayValues()
        .flat();
    plants.forEach((plant) => {
        if (
            baselineIds.filter((id) => id === plant.id).length !== 1 ||
            integrityIds.filter((id) => id === plant.id).length !== 1
        ) {
            throw new Error(
                `Daily care needs one maintained Baselines and Integrity row for ${plant.id}.`
            );
        }
        plant.pageId = plantPageSheet_(spreadsheet, plant.id).getSheetId();
    });
    const checks = integrity.getRange(5, 1, 17, 4).getValues();
    const checkFormulas = integrity.getRange(5, 2, 17, 2).getFormulas();
    if (
        checks.some(
            ([name, count, status], index) =>
                !name ||
                typeof count !== "number" ||
                !Number.isFinite(count) ||
                count < 0 ||
                !["Pass", "Fail", "Action", "Info"].includes(status) ||
                checkFormulas[index].some((formula) => !formula)
        )
    ) {
        throw new Error(
            "Integrity needs its maintained numeric checks and Pass/Fail/Action/Info formulas in A5:D21."
        );
    }
    const errorFormula = dailyCareErrorScanFormula_(
        integrity.getRange(12, 2).getFormula()
    );
    return {
        dashboard,
        tracker,
        baselines,
        integrity,
        plants,
        bounds,
        errorFormula,
    };
}

/** Exclude only the new KPI cells from the existing scan to avoid a cycle. */
function dailyCareErrorScanFormula_(formula) {
    const scan =
        /ARRAYFORMULA\(N\(ISERROR\((?:'Dashboard'|Dashboard)!\$?A\$?1:\$?([XZ])\$?(\d+)\)\)\)/gu;
    const matches = [...formula.matchAll(scan)];
    const dashboardReferences = (formula.match(/Dashboard/gu) || []).length;
    if (
        matches.length === 1 &&
        dashboardReferences === 1 &&
        Number(matches[0][2]) >= 6
    ) {
        const end = matches[0][2];
        // The installed audit also names Y:Z, outside the 24-column grid.
        // A standalone out-of-grid range needs a zero fallback. ISERROR
        // still counts actual cell errors if those columns are later added.
        const tail =
            matches[0][1] === "Z"
                ? `,ARRAYFORMULA(IFERROR(N(ISERROR(Dashboard!Y1:Z${end})),0))`
                : "";
        return formula.replace(
            scan,
            `ARRAYFORMULA(N(ISERROR(Dashboard!A1:T${end}))),ARRAYFORMULA(N(ISERROR(Dashboard!U1:X1))),ARRAYFORMULA(N(ISERROR(Dashboard!U4:X${end})))${tail}`
        );
    }
    const installed =
        /ARRAYFORMULA\(N\(ISERROR\(Dashboard!A1:T(\d+)\)\)\),ARRAYFORMULA\(N\(ISERROR\(Dashboard!U1:X1\)\)\),ARRAYFORMULA\(N\(ISERROR\(Dashboard!U4:X\1\)\)\)(,ARRAYFORMULA\(IFERROR\(N\(ISERROR\(Dashboard!Y1:Z\1\)\),0\)\))?/u.exec(
            formula
        );
    if (
        installed &&
        Number(installed[1]) >= 6 &&
        matches.length === 0 &&
        dashboardReferences === (installed[2] ? 4 : 3)
    )
        return formula;
    throw new Error(
        "Unexpected Integrity formula-error scan; review its Dashboard dependency before installing Daily care."
    );
}

/**
 * Pair the weight and time using the original observation's position for ties.
 * Resolve only this plant/setup's Weigh correction chains. Unresolved, cyclic,
 * duplicate, or active-parent references fall back to their physical row.
 */
function dailyCareWeightFormula_(row, bounds, plantColumn = "B") {
    const h = (column) => `History!$${column}$2:$${column}$${bounds.history}`;
    const plantId = `$${plantColumn}${row}`;
    const records = `FILTER({${h("E")},${h("A")},ROW(${h("A")}),${h("AA")},${h("AE")},${h("AJ")},${h("AC")},${h("AI")}},EXACT(TRIM(${h("B")}),${plantId}),EXACT(TRIM(${h("C")}),"Weigh"),${h("K")}=setup,${h("K")}<>"")`;
    return [
        `=IFNA(LET(setup,XLOOKUP(${plantId},Baselines!$A$2:$A$${bounds.baseline},Baselines!$T$2:$T$${bounds.baseline},""),records,${records},`,
        "physical,INDEX(records,0,3),identities,INDEX(records,0,4),parents,INDEX(records,0,5),states,INDEX(records,0,6),",
        'validParents,ARRAYFORMULA((parents<>"")*(COUNTIF(identities,parents)=1)*(COUNTIF(identities,identities)=1)*(IFNA(XLOOKUP(parents,identities,states),"")="Removed")),',
        'anchors,REDUCE(ARRAYFORMULA(IF(parents="",physical,0)),SEQUENCE(MAX(1,SUM(ARRAYFORMULA(N(parents<>""))))),LAMBDA(previous,step,ARRAYFORMULA(IF(parents="",physical,IF(validParents,IFNA(XLOOKUP(parents,identities,previous),0),0))))),',
        'readings,SORT(FILTER({INDEX(records,0,1),INDEX(records,0,2),ARRAYFORMULA(IF(anchors=0,physical,anchors)),physical},EXACT(TRIM(states),"Removed")=FALSE,ISNUMBER(INDEX(records,0,1)),INDEX(records,0,1)>0,ISNUMBER(INDEX(records,0,2)),INDEX(records,0,2)>0,INDEX(records,0,2)<=NOW(),REGEXMATCH(INDEX(records,0,7)&" "&INDEX(records,0,8),"(?i)estimat")=FALSE),2,FALSE,3,FALSE,4,FALSE),',
        'HSTACK(INDEX(readings,1,1),INDEX(readings,1,2))),{"",""})',
    ].join("");
}

function dailyCareRow_(plant, row, bounds) {
    const trackerIds = `'Plant tracker'!$A$2:$A$${bounds.tracker}`;
    const labels = `'Plant tracker'!$O$2:$O$${bounds.tracker}`;
    const lookup = (column) =>
        `XLOOKUP($B${row},Baselines!$A$2:$A$${bounds.baseline},Baselines!$${column}$2:$${column}$${bounds.baseline},"")`;
    const action = (column) =>
        `XLOOKUP($B${row},Integrity!$A$24:$A$${bounds.integrity},Integrity!$${column}$24:$${column}$${bounds.integrity},"")`;
    return [
        `=IF($B${row}="","",HYPERLINK("#gid=${plant.pageId}","View"))`,
        `=XLOOKUP("${formulaString_(plant.id)}",${trackerIds},${trackerIds},"")`,
        `=IF($B${row}="","",LET(name,XLOOKUP($B${row},${trackerIds},'Plant tracker'!$B$2:$B$${bounds.tracker},""),label,XLOOKUP($B${row},${trackerIds},ARRAYFORMULA(IF(${labels}="","",${labels})),""),name&IF(label="",""," · label "&label)))`,
        dailyCareWeightFormula_(row, bounds),
        "",
        `=LET(dry,${lookup("W")},IF(AND(ISNUMBER(D${row}),D${row}>0,ISNUMBER(dry),dry>0),D${row}-dry,""))`,
        `=IF($B${row}="","",LET(window,${lookup("L")},IF(OR(window="",window=0),"No reweigh window yet",window)))`,
        `=IF($B${row}="","",LET(priority,${action("D")},action,${action("F")},IF(OR(priority="OK",priority="Info",priority="No current flags"),"No follow-up recorded",IF(OR(action="",action=0),"Review plant checks",action))))`,
    ];
}

/** Count failed/action CHECKS, not raw counts (some passing checks expect 1). */
function dailyCareIndicatorFormula_(status, sheetId, range) {
    const empty = status === "Fail" ? "0 · Healthy" : "0 · None outstanding";
    const label = status === "Fail" ? " failed check" : " follow-up check";
    const available = dailyCareChecksAvailableFormula_("Integrity!$C$5:$C$21");
    return `=HYPERLINK("#gid=${sheetId}&range=${range}",IFERROR(IF(${available},IF(COUNTIF(Integrity!$C$5:$C$21,"${status}")=0,"${empty}",COUNTIF(Integrity!$C$5:$C$21,"${status}")&"${label}"&IF(COUNTIF(Integrity!$C$5:$C$21,"${status}")=1,"","s")),"Checks unavailable"),"Checks unavailable"))`;
}

function dailyCareChecksAvailableFormula_(range) {
    const counts = ["Pass", "Fail", "Action", "Info"].map(
        (status) => `COUNTIF(${range},"${status}")`
    );
    return `SUM(${counts.join(",")})=ROWS(${range})`;
}

function dailyCareDashboardMerges_(dashboard) {
    return dashboard
        .getRange(1, 1, dashboard.getMaxRows(), 24)
        .getMergedRanges()
        .filter((range) => {
            if (range.getColumn() > 3 || range.getLastColumn() <= 3)
                return false;
            const title =
                range.getRow() === 1 &&
                range.getNumRows() === 1 &&
                range.getColumn() === 1;
            const kpi =
                [2, 3].includes(range.getRow()) &&
                range.getNumRows() === 1 &&
                range.getColumn() === 3 &&
                range.getLastColumn() === 4;
            if (!title && !kpi)
                throw new Error(
                    "Unexpected Dashboard merge crosses column C; review before freezing."
                );
            return true;
        });
}

function dailyCareDestination_(spreadsheet, dashboard) {
    const marker = "Garden logger managed Daily care v1";
    const daily = spreadsheet.getSheetByName("Daily care");
    if (
        daily &&
        (daily.getRange(1, 1).getNote() !== marker ||
            daily.getRange(1, 1).getDisplayValue() !==
                "Daily care · read-only") &&
        (daily.getLastRow() > 0 ||
            daily.getRange(1, 1).getNote() ||
            daily.getCharts().length)
    ) {
        throw new Error(
            "Daily care is occupied by unrelated content; nothing was changed."
        );
    }
    if (daily && daily.getLastColumn() > 8)
        throw new Error("Daily care has content outside its managed A:H area.");
    const protections = daily
        ? daily.getProtections(SpreadsheetApp.ProtectionType.SHEET)
        : [];
    if (
        protections.some(
            (protection) =>
                protection.getDescription() !== marker || !protection.canEdit()
        )
    )
        throw new Error(
            "Daily care has an unrelated or inaccessible sheet protection."
        );
    const slots = dashboard.getRange(2, 21, 2, 4);
    const values = slots.getDisplayValues();
    const formulas = slots.getFormulas();
    const owned = daily?.getRange(1, 1).getNote() === marker;
    const expected = [
        ["Data issues", "", "Observations still needed", ""],
        [
            owned
                ? dailyCareIndicatorFormula_(
                      "Fail",
                      daily.getSheetId(),
                      `A${dailyCareChecksRow_(daily)}`
                  )
                : "",
            "",
            owned
                ? dailyCareIndicatorFormula_(
                      "Action",
                      daily.getSheetId(),
                      `A${dailyCareChecksRow_(daily)}`
                  )
                : "",
            "",
        ],
    ];
    values.forEach((cells, row) =>
        cells.forEach((value, column) => {
            const entered = formulas[row][column] || value;
            if (entered && (!owned || entered !== expected[row][column]))
                throw new Error(
                    "Dashboard U2:X3 is occupied; nothing was changed."
                );
        })
    );
    const merges = slots.getMergedRanges();
    if (
        merges.some(
            (range) =>
                ![2, 3].includes(range.getRow()) ||
                range.getNumRows() !== 1 ||
                ![21, 23].includes(range.getColumn()) ||
                range.getNumColumns() !== 2
        )
    )
        throw new Error("Unexpected Dashboard KPI merge.");
    return { daily, marker, protection: protections[0] };
}

/** The saved detail anchor keeps a rerun safe after inventory size changes. */
function dailyCareChecksRow_(sheet) {
    const row = Number(sheet.getRange(2, 1).getNote());
    if (!Number.isInteger(row) || row < 9)
        throw new Error("Daily care is missing its managed checks anchor.");
    return row;
}

/** Install only presentation; never rebuild Dashboard or write observations. */
function installDailyCareDashboard() {
    const spreadsheet = getGardenSpreadsheet_();
    const source = dailyCareSources_(spreadsheet);
    const crossingMerges = dailyCareDashboardMerges_(source.dashboard);
    const destination = dailyCareDestination_(spreadsheet, source.dashboard);
    const sheet = destination.daily || spreadsheet.insertSheet("Daily care");
    const checksRow = source.plants.length + 9;
    const lastRow = checksRow + 17;
    ensureSheetColumnCapacity_(sheet, 8);
    ensureSheetRowCapacity_(sheet, lastRow);
    const filter = sheet.getFilter();
    const criteria = filter
        ? Array.from({ length: 8 }, (_, index) =>
              filter.getColumnFilterCriteria(index + 1)
          )
        : [];
    if (filter) filter.remove();
    sheet
        .getRange(1, 1, Math.max(lastRow, sheet.getLastRow()), 8)
        .breakApart()
        .clearContent()
        .clearFormat();
    sheet
        .getRange(1, 1)
        .setValue("Daily care · read-only")
        .setNote(destination.marker);
    sheet.getRange(1, 1, 1, 3).merge();
    sheet.getRange(2, 1).setValue("Data issues").setNote(String(checksRow));
    sheet.getRange(2, 4).setValue("Observations still needed");
    sheet
        .getRange(3, 1)
        .setFormula(
            dailyCareIndicatorFormula_(
                "Fail",
                sheet.getSheetId(),
                `A${checksRow}`
            )
        );
    sheet
        .getRange(3, 4)
        .setFormula(
            dailyCareIndicatorFormula_(
                "Action",
                sheet.getSheetId(),
                `A${checksRow}`
            )
        );
    sheet
        .getRange(4, 1)
        .setValue(
            "Live projection · log observations in Quick log / logger. Counts are check categories, not unique plants."
        );
    sheet.getRange(4, 1, 1, 3).merge();
    sheet
        .getRange(4, 4)
        .setValue(
            "Reweigh windows and whole-pot mass differences are observation prompts, not watering deadlines."
        );
    sheet.getRange(4, 4, 1, 5).merge();
    sheet
        .getRange(5, 1)
        .setFormula(
            `=HYPERLINK("#gid=${source.dashboard.getSheetId()}&range=A6:X6","Dashboard · all statistics")`
        );
    sheet
        .getRange(5, 4)
        .setFormula(
            `=HYPERLINK("#gid=${sheet.getSheetId()}&range=A6:H${source.plants.length + 6}","Filter daily plants ↓")`
        );
    [2, 3, 5].forEach((row) => {
        sheet.getRange(row, 1, 1, 3).merge();
        sheet.getRange(row, 4, 1, 5).merge();
    });
    const headers = [
        "Page",
        "Plant ID",
        "Plant / current label",
        "Latest measured weight (g)",
        "Last weighed",
        "Difference vs last completed dry (g)",
        "Reweigh window",
        "Follow-up",
    ];
    sheet.getRange(6, 1, 1, 8).setValues([headers]);
    sheet
        .getRange(7, 1, source.plants.length, 8)
        .setValues(
            source.plants.map((plant, index) =>
                dailyCareRow_(plant, index + 7, source.bounds)
            )
        );
    sheet
        .getRange(checksRow, 1, 18, 8)
        .setValues(
            Array.from({ length: 18 }, (_, index) =>
                ["A", "", "", "B", "C", "D", "", ""].map((column) =>
                    column
                        ? `=IF(Integrity!${column}${index + 4}="","",Integrity!${column}${index + 4})`
                        : ""
                )
            )
        );
    for (let row = checksRow; row <= lastRow; row++) {
        sheet.getRange(row, 1, 1, 3).merge();
        sheet.getRange(row, 6, 1, 3).merge();
    }
    sheet
        .getRange(checksRow - 1, 4)
        .setValue(
            "Existing Integrity results · Fail = data issue; Action = observations needed; Info is informational. Use each plant's View link and Follow-up above."
        );
    sheet.getRange(checksRow - 1, 4, 1, 5).merge();
    sheet
        .getRange(1, 1, lastRow, 8)
        .setVerticalAlignment("middle")
        .setWrap(true);
    [1, 6, checksRow].forEach((row) =>
        sheet
            .getRange(row, 1, 1, 8)
            .setBackground("#24533f")
            .setFontColor("#ffffff")
            .setFontWeight("bold")
    );
    sheet.getRange(7, 4, source.plants.length, 1).setNumberFormat("0.0");
    sheet
        .getRange(7, 5, source.plants.length, 1)
        .setNumberFormat("mmm d, yyyy h:mm am/pm");
    sheet
        .getRange(7, 6, source.plants.length, 1)
        .setNumberFormat("+0.0;-0.0;0.0");
    sheet.getRange(checksRow + 1, 4, 17, 1).setNumberFormat("0");
    [70, 80, 260, 160, 175, 170, 240, 340].forEach((width, index) =>
        sheet.setColumnWidth(index + 1, width)
    );
    sheet.setFrozenRows(6);
    sheet.setFrozenColumns(3);
    sheet.setHiddenGridlines(true);
    sheet.showSheet();
    sheet.autoResizeRows(1, lastRow);
    const newFilter = sheet
        .getRange(6, 1, source.plants.length + 1, 8)
        .createFilter();
    criteria.forEach((criterion, index) => {
        if (criterion) newFilter.setColumnFilterCriteria(index + 1, criterion);
    });
    const protection =
        destination.protection ||
        sheet.protect().setDescription(destination.marker);
    protection.setWarningOnly(false).setUnprotectedRanges([]);
    protection.addEditor(Session.getEffectiveUser());
    protection.removeEditors(protection.getEditors());
    if (protection.canDomainEdit()) protection.setDomainEdit(false);
    // The error scan must stop depending on the KPI cells before they depend on it.
    if (source.integrity.getRange(12, 2).getFormula() !== source.errorFormula)
        source.integrity.getRange(12, 2).setFormula(source.errorFormula);
    crossingMerges.forEach((range) => {
        const title = range.getRow() === 1;
        range.breakApart();
        if (title) {
            source.dashboard.getRange(1, 1, 1, 3).merge().setWrap(true);
        }
    });
    source.dashboard.getRange(1, 1, 1, 3).setWrap(true);
    source.dashboard.autoResizeRows(1, 1);
    source.dashboard.setFrozenColumns(3);
    source.dashboard
        .getRange(2, 21, 2, 4)
        .breakApart()
        .setBackground("#edf4ee")
        .setFontColor("#173c2b")
        .setFontWeight("bold");
    [
        [21, "Data issues", "Fail"],
        [23, "Observations still needed", "Action"],
    ].forEach(([column, label, status]) => {
        source.dashboard
            .getRange(2, column, 1, 2)
            .merge()
            .setValue(label)
            .setWrap(true);
        source.dashboard
            .getRange(3, column, 1, 2)
            .merge()
            .setFormula(
                dailyCareIndicatorFormula_(
                    status,
                    sheet.getSheetId(),
                    `A${checksRow}`
                )
            );
    });
    dailyCareIndicatorStyles_(source.dashboard, [
        ["U3:V3", "Fail"],
        ["W3:X3", "Action"],
    ]);
    dailyCareIndicatorStyles_(sheet, [
        ["A3", "Fail"],
        ["D3", "Action"],
    ]);
    SpreadsheetApp.flush();
    return {
        sheet: "Daily care",
        sheetId: sheet.getSheetId(),
        plants: source.plants.length,
        mainRange: `Daily care!A6:H${source.plants.length + 6}`,
        checksRange: `Daily care!A${checksRow}:H${lastRow}`,
        dashboardRange: "Dashboard!U2:X3",
        dashboardFrozenColumns: 3,
        integrityRange: "Integrity!B12",
        historyChanged: false,
    };
}

/** Preserve unrelated Dashboard rules; replace only rules on our own KPI cells. */
function dailyCareIndicatorStyles_(sheet, indicators) {
    const owned = new Set(indicators.map(([range]) => range));
    const rules = sheet
        .getConditionalFormatRules()
        .filter(
            (rule) =>
                !rule
                    .getRanges()
                    .every((range) => owned.has(range.getA1Notation()))
        );
    indicators.forEach(([range, status]) => {
        const issueBackground = status === "Fail" ? "#f8d4d4" : "#fff0c7";
        const issueForeground = status === "Fail" ? "#7a1d1d" : "#684b00";
        [true, false].forEach((healthy) =>
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenFormulaSatisfied(
                        `=AND(${dailyCareChecksAvailableFormula_('INDIRECT("Integrity!C5:C21")')},COUNTIF(INDIRECT("Integrity!C5:C21"),"${status}")${healthy ? "=0" : ">0"})`
                    )
                    .setBackground(healthy ? "#edf4ee" : issueBackground)
                    .setFontColor(healthy ? "#173c2b" : issueForeground)
                    .setRanges([sheet.getRange(range)])
                    .build()
            )
        );
    });
    sheet.setConditionalFormatRules(rules);
}
function dashboardViewRow_(spreadsheet, plant, index) {
    const dashboardRow = index + 7;
    const trackerRow = plant.trackerRow;
    const baselineRow = index + 2;
    const page = plantPageSheet_(spreadsheet, plant.id);
    return [
        `=HYPERLINK("#gid=${page.getSheetId()}","View")`,
        plant.id,
        `='Plant tracker'!B${trackerRow}&IF('Plant tracker'!O${trackerRow}="",""," · label "&'Plant tracker'!O${trackerRow})`,
        `='Plant tracker'!D${trackerRow}`,
        `='Plant tracker'!E${trackerRow}`,
        `=Baselines!D${baselineRow}`,
        `=Baselines!C${baselineRow}`,
        `=Baselines!W${baselineRow}`,
        `=Baselines!AF${baselineRow}`,
        `=Baselines!AG${baselineRow}`,
        `='Plant tracker'!I${trackerRow}`,
        `='Plant tracker'!K${trackerRow}`,
        `=COUNTIFS(History!$B$2:$B$5000,$B${dashboardRow},History!$C$2:$C$5000,"Water",History!$AJ$2:$AJ$5000,"<>Removed")`,
        `=COUNTIFS(History!$B$2:$B$5000,$B${dashboardRow},History!$C$2:$C$5000,"Measure",History!$AJ$2:$AJ$5000,"<>Removed")`,
        `=IF(M${dashboardRow}<2,"—",(MAX(FILTER(History!$A$2:$A$5000,History!$B$2:$B$5000=$B${dashboardRow},History!$C$2:$C$5000="Water",History!$AJ$2:$AJ$5000<>"Removed"))-MIN(FILTER(History!$A$2:$A$5000,History!$B$2:$B$5000=$B${dashboardRow},History!$C$2:$C$5000="Water",History!$AJ$2:$AJ$5000<>"Removed")))/(M${dashboardRow}-1))`,
        `=Baselines!H${baselineRow}`,
        `=Baselines!I${baselineRow}`,
        `=Baselines!J${baselineRow}`,
        `=Baselines!K${baselineRow}`,
        `=Baselines!L${baselineRow}`,
        `=Baselines!S${baselineRow}`,
        `=Baselines!AI${baselineRow}`,
        `=Baselines!AJ${baselineRow}`,
        dashboardWeightCountFormula_(dashboardRow),
    ];
}

function refreshDashboardView_(spreadsheet, plants) {
    const sheet = requireSheet_(spreadsheet, "Dashboard");
    ensureSheetColumnCapacity_(sheet, DASHBOARD_VIEW_HEADERS.length);
    ensureSheetRowCapacity_(sheet, plants.length + 6);
    const rebuildRange = sheet.getRange(
        1,
        1,
        sheet.getMaxRows(),
        DASHBOARD_VIEW_HEADERS.length
    );
    // Older Dashboard layouts ended with a merged A:R footer. P30 now lands on
    // that former footer row, so clearing values without removing every legacy
    // merge causes Sheets to retain only the row's top-left cell. Make the
    // rebuild independent of whichever historical layout preceded it.
    rebuildRange.breakApart().clearContent();
    sheet.getRange(1, 1, 1, 3).merge();
    sheet
        .getRange(1, 1)
        .setValue(
            "Garden Dashboard · live weights, care, and dry-date forecasts"
        )
        .setBackground("#173c2b")
        .setFontColor("#ffffff")
        .setFontSize(18)
        .setFontWeight("bold")
        .setHorizontalAlignment("left");
    const summary = [
        ["Plants tracked", `=COUNTA('Plant tracker'!$A$2:$A$31)`],
        [
            "Logs this month",
            `=COUNTIFS(History!$A$2:$A$5000,">="&EOMONTH(TODAY(),-1)+1,History!$AJ$2:$AJ$5000,"<>Removed")`,
        ],
        [
            "Waterings this month",
            `=COUNTIFS(History!$C$2:$C$5000,"Water",History!$A$2:$A$5000,">="&EOMONTH(TODAY(),-1)+1,History!$AJ$2:$AJ$5000,"<>Removed")`,
        ],
        ["Remeasure due", `=COUNTIF(Baselines!$K$2:$K$31,"Due now")`],
        [
            "Last observation",
            `=IFNA(TEXT(MAX(FILTER(History!$A$2:$A$5000,History!$AJ$2:$AJ$5000<>"Removed")),"mmm d, yyyy"),"—")`,
        ],
        [
            "Active source rows",
            `=COUNTIFS(History!$A$2:$A$5000,"<>",History!$AJ$2:$AJ$5000,"<>Removed")`,
        ],
        [
            "Weight readings",
            `=COUNTIFS(History!$E$2:$E$5000,">0",History!$AJ$2:$AJ$5000,"<>Removed")`,
        ],
        [
            "Forecast ready",
            `=COUNT(Baselines!$AF$2:$AF$31)&" / "&COUNTA(Baselines!$A$2:$A$31)`,
        ],
        [
            "Current curve supported",
            `=COUNTIF(Baselines!$I$2:$I$31,"Current cycle supported")&" / "&COUNTA(Baselines!$A$2:$A$31)`,
        ],
        [
            "Calibrated",
            `=COUNTIF(Baselines!$H$2:$H$31,"Calibrated")&" / "&COUNTA(Baselines!$A$2:$A$31)`,
        ],
    ];
    summary.forEach(([label, formula], index) => {
        const column = index * 2 + 1;
        const width = column === 3 ? 1 : 2;
        const labelRange = sheet.getRange(2, column, 1, width);
        const valueRange = sheet.getRange(3, column, 1, width);
        if (width > 1) {
            labelRange.merge();
            valueRange.merge();
        }
        labelRange.setValue(label);
        valueRange.setFormula(formula);
    });
    sheet
        .getRange(2, 1, 2, 20)
        .setBackground("#edf4ee")
        .setFontColor("#173c2b")
        .setVerticalAlignment("middle");
    sheet.getRange(2, 1, 1, 20).setFontWeight("bold").setFontSize(9);
    sheet.getRange(3, 1, 1, 20).setFontWeight("bold").setFontSize(14);
    sheet
        .getRange(6, 1, 1, DASHBOARD_VIEW_HEADERS.length)
        .setValues([[...DASHBOARD_VIEW_HEADERS]])
        .setBackground("#24533f")
        .setFontColor("#ffffff")
        .setFontWeight("bold")
        .setWrap(true);
    sheet
        .getRange(7, 1, plants.length, DASHBOARD_VIEW_HEADERS.length)
        .setValues(
            plants.map((plant, index) =>
                dashboardViewRow_(spreadsheet, plant, index)
            )
        )
        .setVerticalAlignment("middle");
    sheet.getRange(7, 4, plants.length, 1).setNumberFormat("mmm d, yyyy");
    sheet.getRange(7, 6, plants.length, 1).setNumberFormat("0.000");
    sheet.getRange(7, 7, plants.length, 2).setNumberFormat("0.0");
    sheet.getRange(7, 9, plants.length, 1).setNumberFormat("mmm d, yyyy");
    sheet.getRange(7, 11, plants.length, 2).setNumberFormat("0.0#");
    sheet.getRange(7, 13, plants.length, 2).setNumberFormat("0");
    sheet.getRange(7, 24, plants.length, 1).setNumberFormat("0");
    sheet.getRange(7, 15, plants.length, 1).setNumberFormat('0.0 "days"');
    sheet.setFrozenRows(6);
    sheet.setFrozenColumns(3);
    sheet.setHiddenGridlines(true);
    sheet.setColumnWidths(1, DASHBOARD_VIEW_HEADERS.length, 115);
    sheet.setColumnWidth(3, 260);
    sheet.setColumnWidth(10, 200);
    sheet.setColumnWidth(18, 180);
    sheet.setColumnWidth(20, 210);
    sheet.setColumnWidth(21, 240);
    formatWateringRecommendationColumns_(sheet, 6, 22, plants.length);
}

function plantPageHistoryFormula_(plantId) {
    const id = formulaString_(plantId);
    return `=LET(plant,"${id}",rows,SORT(FILTER({History!$A$2:$A$5000,History!$C$2:$C$5000,History!$D$2:$D$5000,History!$E$2:$E$5000,History!$F$2:$F$5000,History!$G$2:$G$5000,History!$H$2:$H$5000,History!$I$2:$I$5000,History!$AC$2:$AC$5000,History!$AI$2:$AI$5000,History!$J$2:$J$5000,History!$AJ$2:$AJ$5000},History!$B$2:$B$5000=plant,History!$A$2:$A$5000<>""),1,FALSE,11,FALSE),dates,CHOOSECOLS(rows,1),events,CHOOSECOLS(rows,2),recordedStates,CHOOSECOLS(rows,3),weights,CHOOSECOLS(rows,4),heights,CHOOSECOLS(rows,5),widths,CHOOSECOLS(rows,6),conditions,CHOOSECOLS(rows,7),notes,CHOOSECOLS(rows,8),qualities,CHOOSECOLS(rows,9),methods,CHOOSECOLS(rows,10),statuses,CHOOSECOLS(rows,12),states,MAP(events,weights,recordedStates,statuses,LAMBDA(event,w,recordedState,status,IF(status="Removed","Removed",IF(event<>"Weigh","",IF(w="","",IF(recordedState="","Routine",recordedState)))))),pounds,MAP(weights,LAMBDA(w,IF(w="","",w/453.59237))),quality,MAP(qualities,methods,LAMBDA(q,m,IF(q="",m,IF(m="",q,q&" · "&m)))),HSTACK(dates,events,states,pounds,weights,heights,widths,conditions,notes,quality,statuses))`;
}

function plantPageSheet_(spreadsheet, plantId) {
    const normalizedId = cleanText_(plantId).toUpperCase();
    if (!/^P\d{2}$/u.test(normalizedId)) {
        throw new Error(`Invalid workbook plant ID: ${plantId}.`);
    }
    const exact = spreadsheet.getSheetByName(normalizedId);
    if (exact) return exact;
    const matches = spreadsheet
        .getSheets()
        .filter((sheet) =>
            new RegExp(String.raw`^${normalizedId}(?:\s|$)`, "u").test(
                sheet.getName()
            )
        );
    if (matches.length !== 1) {
        throw new Error(
            matches.length
                ? `More than one workbook page starts with ${normalizedId}.`
                : `Workbook page for ${normalizedId} is missing.`
        );
    }
    return matches[0];
}

function refreshPlantPage_(spreadsheet, plants, index, plant) {
    const sheet = plantPageSheet_(spreadsheet, plant.id);
    ensureSheetColumnCapacity_(sheet, 18);
    ensureSheetRowCapacity_(sheet, 1000);
    const contentRows = Math.min(1000, sheet.getMaxRows());
    sheet.getRange(1, 1, 12, 13).breakApart();
    const filter = sheet.getFilter();
    if (filter) filter.remove();
    sheet.getRange(1, 1, contentRows, 13).clearContent().clearFormat();
    sheet.getRange(1, 1, 1, 10).merge();
    sheet
        .getRange(1, 1)
        .setValue(`${plant.id} · ${plant.name}`)
        .setBackground("#173c2b")
        .setFontColor("#ffffff")
        .setFontSize(18)
        .setFontWeight("bold");
    sheet.getRange(2, 1, 1, 10).merge();
    sheet
        .getRange(2, 1)
        .setValue(plant.scientificName || "Identification not recorded")
        .setBackground("#e8f1ea")
        .setFontColor("#24533f")
        .setFontStyle("italic");
    const dashboard = requireSheet_(spreadsheet, "Dashboard");
    const previous = plants[(index - 1 + plants.length) % plants.length];
    const next = plants[(index + 1) % plants.length];
    [
        [1, 3, `=HYPERLINK("#gid=${dashboard.getSheetId()}","← Dashboard")`],
        [
            4,
            3,
            `=HYPERLINK("${formulaString_(plant.fieldGuideUrl)}","Open field guide ↗")`,
        ],
        [
            7,
            4,
            `=HYPERLINK("#gid=${plantPageSheet_(spreadsheet, next.id).getSheetId()}","Next · ${formulaString_(next.id)} →")`,
        ],
    ].forEach(([column, width, formula]) => {
        sheet.getRange(3, column, 1, width).merge().setFormula(formula);
    });
    sheet
        .getRange(3, 1, 1, 10)
        .setBackground("#f6f7f3")
        .setFontColor("#24533f")
        .setFontWeight("bold");
    [
        [1, 3, "Current weight"],
        [4, 3, "Care forecast"],
        [7, 4, "Data quality"],
    ].forEach(([column, width, label]) => {
        sheet
            .getRange(4, column, 1, width)
            .merge()
            .setValue(label)
            .setBackground("#24533f")
            .setFontColor("#ffffff")
            .setFontWeight("bold");
    });
    const baselineRow = index + 2;
    const metricRows = [
        [
            "Latest weight (lb)",
            `=Baselines!D${baselineRow}`,
            "Last watered",
            `=Baselines!O${baselineRow}`,
            "Calibration",
            `=Baselines!H${baselineRow}`,
        ],
        [
            "Latest weight (g)",
            `=Baselines!C${baselineRow}`,
            "Predicted dry date",
            `=Baselines!AF${baselineRow}`,
            "Trend readiness",
            `=Baselines!I${baselineRow}`,
        ],
        [
            "Dry weight (g)",
            `=Baselines!W${baselineRow}`,
            "Forecast confidence",
            `=Baselines!AG${baselineRow}`,
            "Trend review",
            `=Baselines!J${baselineRow}`,
        ],
        [
            "Last weighed",
            `=Baselines!E${baselineRow}`,
            "Condition",
            `=Baselines!P${baselineRow}`,
            "Remeasure",
            `=Baselines!K${baselineRow}`,
        ],
        [
            "Pot / setup",
            `=Baselines!F${baselineRow}&" · setup "&Baselines!T${baselineRow}`,
            "Medium",
            `=Baselines!R${baselineRow}`,
            "Next dry check",
            `=Baselines!L${baselineRow}`,
        ],
    ];
    metricRows.forEach((values, metricIndex) => {
        const row = metricIndex + 5;
        [1, 4, 7].forEach((column, groupIndex) => {
            const label = values[groupIndex * 2];
            const formula = values[groupIndex * 2 + 1];
            sheet
                .getRange(row, column)
                .setValue(label)
                .setFontWeight("bold")
                .setFontColor("#52655a");
            const width = column === 7 ? 3 : 2;
            sheet
                .getRange(row, column + 1, 1, width)
                .merge()
                .setFormula(formula)
                .setWrap(true);
        });
    });
    sheet.getRange(5, 2, 1, 2).setNumberFormat("0.000");
    sheet.getRange(6, 2, 2, 2).setNumberFormat("0.0");
    sheet.getRange(8, 2, 1, 2).setNumberFormat("mmm d, yyyy h:mm am/pm");
    sheet.getRange(5, 5, 2, 2).setNumberFormat("mmm d, yyyy");
    sheet.getRange(11, 1, 1, 10).merge();
    sheet
        .getRange(11, 1)
        .setValue("Complete history · newest first · scroll normally")
        .setBackground("#dcebdd")
        .setFontColor("#173c2b")
        .setFontWeight("bold");
    const historyHeaders = [
        "Date",
        "Event",
        "Recorded state",
        "Weight (lb)",
        "Weight (g)",
        "Height (cm)",
        "Width (cm)",
        "Condition",
        "Notes",
        "Quality / method",
        "Record status",
    ];
    sheet
        .getRange(12, 1, 1, historyHeaders.length)
        .setValues([historyHeaders])
        .setBackground("#24533f")
        .setFontColor("#ffffff")
        .setFontWeight("bold")
        .setWrap(true);
    sheet.getRange(13, 1).setFormula(plantPageHistoryFormula_(plant.id));
    sheet
        .getRange(13, 1, contentRows - 12, 1)
        .setNumberFormat("mmm d, yyyy h:mm am/pm");
    sheet.getRange(13, 4, contentRows - 12, 1).setNumberFormat("0.000");
    sheet.getRange(13, 5, contentRows - 12, 3).setNumberFormat("0.0");
    sheet.setFrozenRows(0);
    sheet.setFrozenColumns(0);
    sheet.setHiddenGridlines(true);
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 115);
    sheet.setColumnWidth(3, 120);
    sheet.setColumnWidths(4, 4, 105);
    sheet.setColumnWidth(8, 180);
    sheet.setColumnWidth(9, 300);
    sheet.setColumnWidth(10, 190);
    sheet.setColumnWidth(11, 120);
    sheet.setRowHeights(5, 5, 38);
    sheet.setRowHeight(12, 40);
    const rules = [];
    Object.entries(WORKBOOK_EVENT_COLORS).forEach(
        ([eventName, [background, foreground]]) => {
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo(eventName)
                    .setBackground(background)
                    .setFontColor(foreground)
                    .setBold(true)
                    .setRanges([sheet.getRange(13, 2, contentRows - 12, 1)])
                    .build()
            );
        }
    );
    [
        ["Dry", "#d9eefc", "#174a68"],
        ["Wet", "#c8e6c9", "#1d5a3e"],
        ["Routine", "#eeede7", "#52635b"],
        ["Removed", "#f7d9d5", "#7b2e2e"],
    ].forEach(([state, background, foreground]) => {
        rules.push(
            SpreadsheetApp.newConditionalFormatRule()
                .whenTextEqualTo(state)
                .setBackground(background)
                .setFontColor(foreground)
                .setBold(true)
                .setRanges([sheet.getRange(13, 3, contentRows - 12, 1)])
                .build()
        );
    });
    sheet.setConditionalFormatRules(rules);
    sheet
        .getRange(3, 1)
        .setNote(`Previous page: ${previous.id} · ${previous.name}`);
}

function organizeWorkbookSheets_(spreadsheet) {
    const dashboard = requireSheet_(spreadsheet, "Dashboard");
    const quickLog = requireSheet_(spreadsheet, GARDEN_LOGGER.quickLogSheet);
    const history = requireSheet_(spreadsheet, GARDEN_LOGGER.historySheet);
    const historyView = requireSheet_(
        spreadsheet,
        GARDEN_LOGGER.historyViewSheet
    );
    quickLog.hideColumns(GARDEN_LOGGER.weightStateColumn);
    history.hideColumns(GARDEN_LOGGER.historyWeightStateColumn);
    historyView.hideColumns(GARDEN_LOGGER.historyWeightStateColumn);
    spreadsheet.setActiveSheet(dashboard);
    WORKBOOK_HELPER_SHEETS.forEach((sheetName) => {
        const sheet = spreadsheet.getSheetByName(sheetName);
        if (!sheet) return;
        if (sheet.isSheetHidden()) sheet.showSheet();
        spreadsheet.setActiveSheet(sheet);
        spreadsheet.moveActiveSheet(spreadsheet.getNumSheets());
        sheet.hideSheet();
    });
    spreadsheet.setActiveSheet(dashboard);
}

function formulaString_(value) {
    return String(value || "").replaceAll('"', '""');
}

function ensureSheetRowCapacity_(sheet, requiredRows) {
    const currentRows = sheet.getMaxRows();
    if (currentRows < requiredRows) {
        sheet.insertRowsAfter(currentRows, requiredRows - currentRows);
    }
}

function openQuickLog() {
    activateSheet_(GARDEN_LOGGER.quickLogSheet, "D5");
}

function openHistory() {
    activateSheet_(GARDEN_LOGGER.historySheet, "A2");
}

/**
 * Read a saved observation for an individual correction. RPC DTOs contain ISO
 * strings and exact canonical cm, never Date objects or client row addresses.
 * See README.md, Saved-entry corrections, for the operator and retry contract.
 */
function getWebCorrectionEntry(request) {
    correctionObject_(request, ["observationId"]);
    const observationId = correctionIdentity_(request.observationId);
    return withCorrectionLock_(() => {
        const snapshot = correctionSnapshot_(getGardenSpreadsheet_());
        const original = correctionOriginal_(snapshot, observationId);
        return correctionEntryContext_(snapshot, original, false);
    });
}

/** Preview a sparse patch without writing or reserving any History rows. */
function previewWebObservationCorrection(request) {
    const payload = correctionPayload_(request, false);
    return withCorrectionLock_(() => {
        const snapshot = correctionSnapshot_(getGardenSpreadsheet_());
        return correctionPreview_(snapshot, payload);
    });
}

/**
 * Commit one atomic replacement/retirement. Persist this entire immutable RPC
 * payload on the phone before calling; an exception may be a lost success reply.
 */
function saveWebObservationCorrection(request) {
    const payload = correctionPayload_(request, true);
    return withCorrectionLock_(() => {
        const snapshot = correctionSnapshot_(getGardenSpreadsheet_());
        const receipt = correctionReceipt_(snapshot, payload);
        if (receipt.status === "saved") return receipt;
        const operation = correctionStoredOperation_(payload);
        if (operation?.status === "rejected")
            throw new Error(`${operation.code}: ${operation.message}`);
        const { original, targetRow } = correctionCommitValidation_(
            snapshot,
            payload,
            operation
        );
        const replacement = correctionPatchedRow_(
            original.values,
            payload.changes
        );
        replacement[9] = new Date();
        replacement[15] = payload.requestId;
        replacement[26] = correctionReplacementId_(payload);
        replacement[27] = "Mobile correction";
        replacement[29] = original.values[29] || original.values[15];
        replacement[30] = payload.observationId;
        replacement[31] = payload.reason;
        replacement[35] = "Active";
        const requests = [];
        if (targetRow > snapshot.history.getMaxRows()) {
            requests.push({
                appendDimension: {
                    sheetId: snapshot.history.getSheetId(),
                    dimension: "ROWS",
                    length: targetRow - snapshot.history.getMaxRows(),
                },
            });
        }
        const cells = replacement.map((value) =>
            correctionCell_(value, snapshot.timeZone)
        );
        historyHelperFormulas_(targetRow).forEach((formula, index) => {
            cells[index + 12] = { userEnteredValue: { formulaValue: formula } };
        });
        cells[37] = {
            userEnteredValue: {
                formulaValue: `=IF(F${targetRow}="","",F${targetRow}/2.54)`,
            },
        };
        cells[38] = {
            userEnteredValue: {
                formulaValue: `=IF(G${targetRow}="","",G${targetRow}/2.54)`,
            },
        };
        requests.push(
            correctionCellsRequest_(snapshot.history, targetRow, 1, cells)
        );
        // Formats/obsolete inch validations are changed only on the new row.
        for (const column of [1, 10]) {
            requests.push(
                correctionCellsRequest_(
                    snapshot.history,
                    targetRow,
                    column,
                    [
                        {
                            userEnteredFormat: {
                                numberFormat: {
                                    type: "DATE_TIME",
                                    pattern: "M/d/yyyy h:mm:ss am/pm",
                                },
                            },
                        },
                    ],
                    "userEnteredFormat.numberFormat"
                )
            );
        }
        requests.push(
            correctionCellsRequest_(
                snapshot.history,
                targetRow,
                38,
                [{}, {}],
                "dataValidation"
            ),
            correctionCellsRequest_(snapshot.history, original.rowNumber, 36, [
                { userEnteredValue: { stringValue: "Removed" } },
            ])
        );
        // Persist before entering the batch: even a thrown batch error can be
        // a lost success reply. Such a request must never become rejected later.
        if (!operation)
            correctionStoreOperation_({ ...receipt, status: "attempted" });
        correctionBatchUpdate_(snapshot.spreadsheet, requests);
        // The digest-bearing row is the receipt. Do not add fallible derived
        // writes here: formulas already consume the new active History pair.
        return correctionSavedReceipt_(payload);
    });
}

/**
 * A locked receipt lookup, including after later corrections or exclusion.
 * Missing means retry the SAME immutable payload; it never means mint a key.
 */
function getWebCorrectionStatus(request) {
    const payload = correctionPayload_(request, true);
    return withCorrectionLock_(() => {
        const receipt = correctionReceipt_(
            correctionSnapshot_(getGardenSpreadsheet_()),
            payload
        );
        if (receipt.status === "saved") return receipt;
        const operation = correctionStoredOperation_(payload);
        return operation?.status === "rejected" ? operation : receipt;
    });
}

function correctionValidationError_(message) {
    const error = new Error(message);
    error.correctionValidationCode = message.split(":", 1)[0];
    return error;
}

function correctionCommitValidation_(snapshot, payload, operation) {
    try {
        const preview = correctionPreview_(snapshot, payload);
        if (preview.previewToken !== payload.previewToken)
            throw correctionValidationError_(
                "STALE_PREVIEW: Related History changed. Reload the entry and review again."
            );
        const original = correctionOriginal_(snapshot, payload.observationId);
        const targetRow = snapshot.lastReservedRow + 1;
        if (targetRow > GARDEN_LOGGER.historyCapacityRows)
            throw correctionValidationError_(
                "HISTORY_CAPACITY: History is full. Extend the supported capacity before correcting."
            );
        return { original, targetRow };
    } catch (error) {
        // Only our deterministic validation errors, before any possible batch
        // attempt for this request, can release a phone's immutable retry.
        if (!operation && error.correctionValidationCode)
            correctionStoreOperation_({
                status: "rejected",
                requestId: payload.requestId,
                observationId: payload.observationId,
                payloadDigest: payload.payloadDigest,
                operationDigest: payload.operationDigest,
                code: error.correctionValidationCode,
                message: error.message.slice(
                    error.correctionValidationCode.length + 2
                ),
            });
        throw error;
    }
}

function correctionOperationKey_(requestId) {
    return `gardenLoggerCorrectionOperationV1:${requestId}`;
}

function correctionStoredOperation_(payload) {
    const stored = PropertiesService.getScriptProperties().getProperty(
        correctionOperationKey_(payload.requestId)
    );
    if (stored === null) return null;
    const operation = JSON.parse(stored);
    if (
        !operation ||
        !["attempted", "rejected"].includes(operation.status) ||
        ["requestId", "observationId", "payloadDigest", "operationDigest"].some(
            (key) => operation[key] !== payload[key]
        ) ||
        (operation.status === "rejected" &&
            (!correctionTerminalCodes_().includes(operation.code) ||
                typeof operation.message !== "string" ||
                !operation.message))
    )
        throw new Error(
            "REQUEST_CONFLICT: This retry ID belongs to a different or damaged correction operation. Retain the pending payload."
        );
    return operation;
}

function correctionTerminalCodes_() {
    return [
        "STALE_PREVIEW",
        "NOT_FOUND",
        "REMOVED_ORIGINAL",
        "HISTORY_SCHEMA",
        "INVALID_CORRECTION",
        "SETUP_BOUNDARY",
        "HISTORY_CAPACITY",
    ];
}

function correctionStoreOperation_(operation) {
    const properties = PropertiesService.getScriptProperties();
    const key = correctionOperationKey_(operation.requestId);
    const serialized = JSON.stringify(operation);
    properties.setProperty(key, serialized);
    if (properties.getProperty(key) !== serialized)
        throw new Error(
            "CORRECTION_STORAGE: Could not verify the durable correction operation. Retain this exact request and check status."
        );
    // Never expire, prune, or replace this binding, even if History is restored.
}

function withCorrectionLock_(operation) {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(GARDEN_LOGGER.lockTimeoutMs)) {
        throw new Error(
            "CORRECTION_BUSY: Another save is running. Retain this request and try again."
        );
    }
    try {
        return operation();
    } finally {
        lock.releaseLock();
    }
}

function correctionObject_(value, keys) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
        Object.keys(value).some((key) => !keys.includes(key))
    ) {
        throw new Error("INVALID_CORRECTION: Unsupported payload or field.");
    }
}

function correctionIdentity_(value) {
    if (
        typeof value !== "string" ||
        !value ||
        value.length > 300 ||
        !/^[A-Za-z0-9_:-]+$/.test(value)
    ) {
        throw new Error(
            "INVALID_CORRECTION: A saved Observation ID is required."
        );
    }
    return value;
}

function correctionDigest_(value) {
    const canonical = (item) => {
        if (Array.isArray(item)) return item.map(canonical);
        if (item && typeof item === "object") {
            return Object.fromEntries(
                Object.keys(item)
                    // Canonical hashes require locale-independent UTF-16 order,
                    // matching the browser's key ordering exactly.
                    .sort(
                        (left, right) =>
                            Number(left > right) - Number(left < right)
                    )
                    .map((key) => [key, canonical(item[key])])
            );
        }
        return item;
    };
    return Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        JSON.stringify(canonical(value)),
        Utilities.Charset.UTF_8
    )
        .map((byte) => (byte & 255).toString(16).padStart(2, "0"))
        .join("");
}

function correctionPayload_(request, saving) {
    correctionObject_(request, [
        "observationId",
        "baseRevision",
        "changes",
        "reason",
        ...(saving ? ["requestId", "previewToken"] : []),
    ]);
    correctionObject_(
        request.changes,
        correctionFieldDefinitions_().map((field) => field.key)
    );
    if (
        typeof request.baseRevision !== "string" ||
        !/^[a-f0-9]{64}$/.test(request.baseRevision) ||
        typeof request.reason !== "string" ||
        !request.reason.trim() ||
        request.reason.length > 2000 ||
        Object.keys(request.changes).length === 0 ||
        Object.values(request.changes).some(
            (value) =>
                !(typeof value === "string" && value.length <= 10000) &&
                !(typeof value === "number" && Number.isFinite(value))
        )
    ) {
        throw new Error(
            "INVALID_CORRECTION: Supply a revision, a nonempty patch, and a reason (up to 2000 characters)."
        );
    }
    const payload = {
        observationId: correctionIdentity_(request.observationId),
        baseRevision: request.baseRevision,
        changes: { ...request.changes },
        reason: request.reason,
    };
    const payloadDigest = correctionDigest_(payload);
    if (!saving) return { ...payload, payloadDigest };
    if (
        typeof request.requestId !== "string" ||
        !/^[A-Za-z0-9_-]{12,100}$/.test(request.requestId) ||
        typeof request.previewToken !== "string" ||
        !/^[a-f0-9]{64}$/.test(request.previewToken)
    ) {
        throw new Error(
            "INVALID_CORRECTION: Supply the saved retry ID and preview token."
        );
    }
    const operationDigest = correctionDigest_({
        requestId: request.requestId,
        payloadDigest,
        previewToken: request.previewToken,
    });
    return {
        ...payload,
        payloadDigest,
        requestId: request.requestId,
        previewToken: request.previewToken,
        operationDigest,
    };
}

function correctionSnapshot_(spreadsheet) {
    const history = requireSheet_(spreadsheet, GARDEN_LOGGER.historySheet);
    if (
        GARDEN_LOGGER.historyStoredColumns !== 42 ||
        history.getMaxColumns() < 42
    ) {
        throw new Error(
            "HISTORY_SCHEMA: Expected the installed 42-column History schema."
        );
    }
    const expected = [
        ...HISTORY_HEADERS,
        "Plant / planter",
        "Trend anchor",
        "Days after anchor",
        GARDEN_LOGGER.requestIdHeader,
        ...HISTORY_DETAIL_HEADERS,
        ...HISTORY_PROVENANCE_HEADERS,
        ...HISTORY_MEASUREMENT_HEADERS,
        ...HISTORY_ROTATION_HEADERS,
        ...HISTORY_WATER_HEADERS,
    ];
    const headers = history.getRange(1, 1, 1, 42).getValues()[0];
    const headerFormulas = history.getRange(1, 1, 1, 42).getFormulas()[0];
    if (
        expected.some(
            (header, index) =>
                headers[index] !== header || headerFormulas[index]
        )
    ) {
        throw new Error(
            "HISTORY_SCHEMA: History headers changed. Verify the installed schema before correcting."
        );
    }
    const rowCount = Math.max(0, history.getLastRow() - 1);
    const range = rowCount ? history.getRange(2, 1, rowCount, 42) : null;
    const values = range ? range.getValues() : [];
    const formulas = range ? range.getFormulas() : [];
    const rows = values
        .map((row, index) => ({
            values: row,
            formulas: formulas[index],
            rowNumber: index + 2,
        }))
        .filter(
            (row) =>
                row.values.some(
                    (value, index) =>
                        !correctionFormulaColumn_(index) && value !== ""
                ) ||
                row.formulas.some(
                    (formula, index) =>
                        !correctionFormulaColumn_(index) && formula
                )
        );
    const ids = new Set();
    rows.forEach(({ values: row }) => {
        if (!row[26]) return;
        if (ids.has(row[26]))
            throw new Error(
                "DUPLICATE_IDENTITY: Duplicate History Observation ID. Repair the duplicate first."
            );
        ids.add(row[26]);
    });
    return {
        spreadsheet,
        history,
        rows,
        timeZone: spreadsheet.getSpreadsheetTimeZone(),
        lastReservedRow: rows.length ? rows[rows.length - 1].rowNumber : 1,
    };
}

function correctionFormulaColumn_(index) {
    return [12, 13, 14, 37, 38].includes(index);
}

function correctionRevision_(row, timeZone) {
    const canonical = row.values.map((value, index) => {
        if (correctionFormulaColumn_(index)) return null;
        if (row.formulas[index])
            throw correctionValidationError_(
                "HISTORY_SCHEMA: Canonical observation cells must contain values, not formulas."
            );
        if (value instanceof Date) {
            if (!Number.isFinite(value.getTime()))
                throw correctionValidationError_(
                    "HISTORY_SCHEMA: Invalid saved date."
                );
            return ["date", value.toISOString()];
        }
        if (
            typeof value !== "string" &&
            !(typeof value === "number" && Number.isFinite(value))
        ) {
            throw correctionValidationError_(
                "HISTORY_SCHEMA: Unsupported canonical cell type."
            );
        }
        return [typeof value, value];
    });
    return correctionDigest_({ canonical, timeZone });
}

function correctionOriginal_(snapshot, observationId) {
    const original = snapshot.rows.find(
        (row) => row.values[26] === observationId
    );
    if (!original)
        throw correctionValidationError_(
            "NOT_FOUND: This saved observation no longer exists."
        );
    correctionRevision_(original, snapshot.timeZone);
    const row = original.values;
    if (row[35] === "Removed")
        throw correctionValidationError_(
            "REMOVED_ORIGINAL: This observation was already corrected or excluded. Open its active replacement."
        );
    if (
        !(row[0] instanceof Date) ||
        !row[1] ||
        !correctionEvents_().includes(row[2]) ||
        (row[9] !== "" && !(row[9] instanceof Date)) ||
        !["", "Active"].includes(row[35]) ||
        [4, 5, 6, 10, 21, 39, 41].some(
            (index) => row[index] !== "" && typeof row[index] !== "number"
        ) ||
        (row[10] !== "" && (!Number.isInteger(row[10]) || row[10] < 1)) ||
        row.some(
            (value, index) =>
                !correctionFormulaColumn_(index) &&
                ![0, 4, 5, 6, 9, 10, 21, 39, 41].includes(index) &&
                typeof value !== "string"
        )
    ) {
        throw correctionValidationError_(
            "HISTORY_SCHEMA: The saved observation has invalid canonical types, event, setup or status."
        );
    }
    return original;
}

function correctionEvents_() {
    return [
        "Weigh",
        "Measure",
        "Check",
        "Water",
        "Repot",
        "Flower",
        "Photo",
        "Pest",
        "Rotation",
        "Note",
        "Other",
        "Prune",
        "Clean",
    ];
}

function correctionFieldDefinitions_(event) {
    return [
        ["observationDate", 0, "Saved date", "datetime", [], true],
        ["notes", 8, "Notes"],
        ["weight", 4, "Weight", "number", [], true, "g", ["Weigh"]],
        ["heightCm", 5, "Height", "number", [], false, "cm", ["Measure"]],
        ["widthCm", 6, "Width", "number", [], false, "cm", ["Measure"]],
        [
            "measurementUnit",
            36,
            "Original measurement unit",
            "select",
            MEASUREMENT_UNIT_OPTIONS,
            true,
            "",
            ["Measure"],
        ],
        [
            "measurementQuality",
            28,
            "Measurement quality",
            "select",
            MEASUREMENT_QUALITY_OPTIONS,
            true,
            "",
            ["Weigh", "Measure"],
        ],
        [
            "measurementMethod",
            34,
            "Measurement method",
            "select",
            event === "Weigh"
                ? [
                      "Scale",
                      "Estimated visually",
                      "Estimated from photo",
                      "Other",
                      "Unspecified",
                  ]
                : MEASUREMENT_METHOD_OPTIONS,
            true,
            "",
            ["Weigh", "Measure"],
        ],
        ["condition", 7, "Plant condition", "text", [], false, "", ["Check"]],
        [
            "soilMoisture",
            32,
            "Soil moisture",
            "select",
            SOIL_MOISTURE_OPTIONS,
            false,
            "",
            ["Check"],
        ],
        [
            "nutrientsUsed",
            16,
            "Nutrients used",
            "select",
            NUTRIENT_OPTIONS,
            true,
            "",
            ["Water"],
        ],
        [
            "nutrientProduct",
            17,
            "Nutrient product",
            "text",
            NUTRIENT_PRODUCT_OPTIONS,
            false,
            "",
            ["Water"],
        ],
        [
            "nutrientAmount",
            18,
            "Nutrient amount",
            "text",
            [],
            false,
            "",
            ["Water"],
        ],
        [
            "wateringApplication",
            40,
            "Watering application",
            "select",
            WATERING_APPLICATION_OPTIONS,
            true,
            "",
            ["Water"],
        ],
        [
            "waterAmount",
            41,
            "Water amount",
            "number",
            [],
            false,
            "mL",
            ["Water"],
        ],
        [
            "previousPotSize",
            19,
            "Previous pot size",
            "text",
            [],
            false,
            "",
            ["Repot"],
        ],
        ["potSize", 20, "Pot size", "text", [], true, "", ["Repot"]],
        ["medium", 33, "Medium / substrate", "text", [], false, "", ["Repot"]],
        [
            "flowerCount",
            21,
            "Flower count",
            "number",
            [],
            false,
            "",
            ["Flower"],
        ],
        [
            "flowerDetails",
            22,
            "Flower details",
            "text",
            [],
            false,
            "",
            ["Flower"],
        ],
        [
            "photoUrl",
            23,
            "Google Photos share URL",
            "url",
            [],
            true,
            "",
            ["Photo"],
        ],
        ["pestIssue", 24, "Pest / issue", "text", [], true, "", ["Pest"]],
        [
            "pestTreatment",
            25,
            "Treatment / action",
            "text",
            [],
            true,
            "",
            ["Pest"],
        ],
        [
            "rotationDegrees",
            39,
            "Rotation",
            "number",
            [],
            true,
            "°",
            ["Rotation"],
        ],
    ]
        .map(
            ([
                key,
                column,
                label,
                type = "text",
                options = [],
                required = false,
                unit = "",
                events = [],
            ]) => ({
                key,
                column,
                label,
                type,
                options: [...options],
                required,
                unit,
                events,
            })
        )
        .filter(
            (definition) =>
                !event ||
                !definition.events.length ||
                definition.events.includes(event)
        );
}

function correctionDto_(row) {
    const values = Object.fromEntries(
        correctionFieldDefinitions_(row[2]).map(({ key, column }) => [
            key,
            row[column] instanceof Date
                ? row[column].toISOString()
                : row[column],
        ])
    );
    return {
        observationId: row[26],
        plantId: row[1],
        event: row[2],
        potSetup: row[10],
        label: row[11],
        observationDate: row[0] instanceof Date ? row[0].toISOString() : "",
        recordedAt: row[9] instanceof Date ? row[9].toISOString() : "",
        requestId: row[15],
        saveGroupId: row[29] || row[15],
        correctsObservationId: row[30],
        correctionReason: row[31],
        recordStatus: row[35],
        values,
    };
}

function correctionEntryContext_(snapshot, original, dateChanged) {
    const row = original.values;
    const group = row[29] || row[15];
    const siblings = snapshot.rows.filter(
        (candidate) =>
            candidate !== original &&
            candidate.values[1] === row[1] &&
            group &&
            (candidate.values[29] || candidate.values[15]) === group
    );
    const related = snapshot.rows.filter(
        (candidate) =>
            candidate !== original &&
            candidate.values[1] === row[1] &&
            candidate.values[35] !== "Removed" &&
            (dateChanged || candidate.values[2] === "Repot")
    );
    const context = [...new Set([...siblings, ...related])]
        .map((candidate) => [
            candidate.values[26],
            correctionRevision_(candidate, snapshot.timeZone),
        ])
        .sort((left, right) =>
            JSON.stringify(left).localeCompare(JSON.stringify(right))
        );
    const notices = [
        "This corrects one saved event. Plant, event, setup and historical label stay fixed.",
    ];
    if (siblings.length)
        notices.push(
            "Same-save siblings keep their own values and dates. The replacement retains the original save group; review Water/Weigh timing together."
        );
    if (dateChanged && siblings.length)
        notices.push(
            "Changing this date does not change sibling dates. Grouped events with different times can affect watering-cycle interpretation."
        );
    if (row[2] === "Repot")
        notices.push(
            "This is a correction to an existing Repot, not a new setup. Baselines will not be reset to this historical setup."
        );
    return {
        original: correctionDto_(row),
        baseRevision: correctionRevision_(original, snapshot.timeZone),
        contextDigest: correctionDigest_({
            context,
            timeZone: snapshot.timeZone,
        }),
        timeZone: snapshot.timeZone,
        siblings: siblings
            .map((candidate) => correctionDto_(candidate.values))
            .sort((left, right) =>
                left.observationId.localeCompare(right.observationId)
            ),
        fields: correctionFieldDefinitions_(row[2]).map(
            ({ column, events, ...definition }) => definition
        ),
        notices,
    };
}

function correctionPreview_(snapshot, payload) {
    const original = correctionOriginal_(snapshot, payload.observationId);
    const context = correctionEntryContext_(
        snapshot,
        original,
        Object.hasOwn(payload.changes, "observationDate")
    );
    if (context.baseRevision !== payload.baseRevision) {
        throw correctionValidationError_(
            "STALE_PREVIEW: The original changed. Reload the entry and review again."
        );
    }
    const row = correctionPatchedRow_(original.values, payload.changes);
    correctionDateBoundary_(snapshot, original, row);
    const replacement = correctionDto_(row);
    replacement.correctsObservationId = payload.observationId;
    replacement.correctionReason = payload.reason;
    const differences = context.fields
        .filter(
            ({ key }) =>
                context.original.values[key] !== replacement.values[key]
        )
        .map(({ key, label }) => ({
            key,
            label,
            before: context.original.values[key],
            after: replacement.values[key],
        }));
    if (!differences.length)
        throw correctionValidationError_(
            "INVALID_CORRECTION: Change at least one saved value before reviewing."
        );
    return {
        ...context,
        replacement,
        differences,
        payloadDigest: payload.payloadDigest,
        previewToken: correctionDigest_({
            payloadDigest: payload.payloadDigest,
            contextDigest: context.contextDigest,
        }),
    };
}

function correctionPatchedRow_(original, changes) {
    const row = [...original];
    const definitions = correctionFieldDefinitions_(row[2]);
    for (const [key, input] of Object.entries(changes)) {
        const definition = definitions.find((field) => field.key === key);
        if (!definition)
            throw correctionValidationError_(
                `INVALID_CORRECTION: ${key} cannot be changed for ${row[2]}.`
            );
        correctionAssignField_(row, definition, input);
    }
    correctionValidateDependencies_(row, changes);
    return row;
}

function correctionAssignField_(row, definition, input) {
    const value =
        definition.type === "number"
            ? correctionNumericValue_(definition, input)
            : correctionTextValue_(definition, input);
    if (
        definition.required &&
        (value === "" || (typeof value === "string" && !value.trim()))
    ) {
        throw correctionValidationError_(
            `INVALID_CORRECTION: ${definition.label} cannot be cleared.`
        );
    }
    row[definition.column] = value;
}

function correctionNumericValue_(definition, input) {
    let value = input;
    const { key } = definition;
    if (
        typeof value === "string" &&
        value !== "" &&
        !/^\d+(?:\.\d+)?$/.test(value)
    ) {
        throw correctionValidationError_(
            `INVALID_CORRECTION: ${definition.label} must be a positive number or blank.`
        );
    }
    if (value !== "") value = Number(value);
    if (
        (value !== "" && (!Number.isFinite(value) || value <= 0)) ||
        (key === "flowerCount" && value !== "" && !Number.isInteger(value)) ||
        (key === "rotationDegrees" && value > 360)
    ) {
        throw correctionValidationError_(
            `INVALID_CORRECTION: ${definition.label} is outside its supported range.`
        );
    }

    return value;
}

function correctionTextValue_(definition, input) {
    let value = input;
    if (typeof value !== "string")
        throw correctionValidationError_(
            `INVALID_CORRECTION: ${definition.label} must be text.`
        );
    if (
        definition.type === "select" &&
        value !== "" &&
        !definition.options.includes(value)
    ) {
        throw correctionValidationError_(
            `INVALID_CORRECTION: Choose a listed ${definition.label.toLowerCase()}.`
        );
    }
    if (definition.type === "datetime") value = correctionDate_(value);
    if (
        definition.type === "url" &&
        !/^https:\/\/(?:photos\.google\.com|photos\.app\.goo\.gl)\/[^\s]+$/i.test(
            value
        )
    ) {
        throw correctionValidationError_(
            "INVALID_CORRECTION: Photo needs a valid HTTPS Google Photos share URL."
        );
    }

    return value;
}

function correctionValidateDependencies_(row, changes) {
    const changed = (...keys) =>
        keys.some((key) => Object.hasOwn(changes, key));
    if (
        row[2] === "Measure" &&
        changed("heightCm", "widthCm") &&
        row[5] === "" &&
        row[6] === ""
    ) {
        throw correctionValidationError_(
            "INVALID_CORRECTION: Keep at least one dimension for Measure."
        );
    }
    if (changed("measurementQuality", "measurementMethod")) {
        correctionValidateMeasurementEvidence_(row);
    }
    if (
        row[2] === "Water" &&
        changed("nutrientsUsed", "nutrientProduct", "nutrientAmount")
    ) {
        correctionValidateNutrients_(row);
    }
    if (
        row[2] === "Flower" &&
        changed("flowerCount", "flowerDetails") &&
        row[21] === "" &&
        !row[22].trim()
    ) {
        throw correctionValidationError_(
            "INVALID_CORRECTION: Keep a flower count or details."
        );
    }
}

function correctionValidateMeasurementEvidence_(row) {
    const quality = row[28];
    const method = row[34];
    if (
        (/Estimated/i.test(method) && quality !== "Estimated") ||
        (["Scale", "Ruler"].includes(method) &&
            !["Measured", "Corrected"].includes(quality)) ||
        (quality === "Measured" && !["Scale", "Ruler"].includes(method))
    ) {
        throw correctionValidationError_(
            "INVALID_CORRECTION: Measurement quality and method must describe the same evidence."
        );
    }
}

function correctionValidateNutrients_(row) {
    if (
        (row[16] === "Yes" && (!row[17].trim() || !row[18].trim())) ||
        (row[16] === "No" && (row[17] || row[18])) ||
        !NUTRIENT_OPTIONS.includes(row[16])
    ) {
        throw correctionValidationError_(
            "INVALID_CORRECTION: Nutrients Yes needs product and amount; No needs both explicitly cleared."
        );
    }
}

function correctionDate_(value) {
    const match =
        /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(
            value
        );
    const date = new Date(value);
    if (!match || !Number.isFinite(date.getTime()))
        throw correctionValidationError_(
            "INVALID_CORRECTION: Date needs a complete ISO timestamp with timezone."
        );
    const local = new Date(`${match[1]}T${match[2]}${match[3] || ""}Z`);
    if (local.toISOString().slice(0, 19) !== `${match[1]}T${match[2]}`) {
        throw correctionValidationError_(
            "INVALID_CORRECTION: Date contains an invalid calendar day or time."
        );
    }
    return date;
}

function correctionDateBoundary_(snapshot, original, replacement) {
    const oldDate = original.values[0].getTime();
    const newDate = replacement[0].getTime();
    if (oldDate === newDate) return;
    const setup = replacement[10] || 1;
    const crossed = snapshot.rows.some((candidate) => {
        const row = candidate.values;
        if (
            candidate === original ||
            row[1] !== replacement[1] ||
            row[35] === "Removed"
        )
            return false;
        if (!(row[0] instanceof Date) || !Number.isFinite(row[0].getTime())) {
            throw correctionValidationError_(
                "HISTORY_SCHEMA: A related observation has an invalid date. Repair it before moving dates."
            );
        }
        const date = row[0].getTime();
        const candidateSetup = row[10] || 1;
        if (candidateSetup < setup && newDate <= date) return true;
        if (candidateSetup > setup && newDate >= date) return true;
        if (candidateSetup === setup && row[2] === "Repot" && newDate < date)
            return true;
        // A Repot is the start of its setup; moving it cannot move across a
        // reading (including a same-time sibling) or another Repot boundary.
        return (
            replacement[2] === "Repot" &&
            candidateSetup === setup &&
            ((oldDate <= date && newDate > date) ||
                (oldDate >= date && newDate < date))
        );
    });
    if (crossed)
        throw correctionValidationError_(
            "SETUP_BOUNDARY: This date move crosses a setup boundary or a Repot-dependent reading. Keep the date within this setup, or coordinate corrections to the dependent observations."
        );
}

function correctionReplacementId_(payload) {
    return `correction:${payload.requestId}:${payload.operationDigest}`;
}

function correctionSavedReceipt_(payload) {
    return {
        status: "saved",
        requestId: payload.requestId,
        observationId: payload.observationId,
        originalObservationId: payload.observationId,
        replacementObservationId: correctionReplacementId_(payload),
        payloadDigest: payload.payloadDigest,
        operationDigest: payload.operationDigest,
    };
}

function correctionReceipt_(snapshot, payload) {
    const matches = snapshot.rows.filter(
        (row) => row.values[15] === payload.requestId
    );
    const replacementId = correctionReplacementId_(payload);
    if (!matches.length) {
        if (snapshot.rows.some((row) => row.values[26] === replacementId)) {
            throw new Error(
                "CORRECTION_RECEIPT_INVALID: The stored receipt has a changed retry identity."
            );
        }
        return {
            status: "missing",
            requestId: payload.requestId,
            observationId: payload.observationId,
            payloadDigest: payload.payloadDigest,
            operationDigest: payload.operationDigest,
        };
    }
    if (
        matches.length !== 1 ||
        matches[0].values[26] !== replacementId ||
        matches[0].values[30] !== payload.observationId
    ) {
        throw new Error(
            "REQUEST_CONFLICT: This retry ID already belongs to a different payload or namespace. Retain the pending payload and inspect its receipt."
        );
    }
    const original = snapshot.rows.find(
        (row) => row.values[26] === payload.observationId
    );
    if (original?.values[35] !== "Removed") {
        throw new Error(
            "CORRECTION_RECEIPT_INVALID: The original retirement is missing. Inspect History before retrying."
        );
    }
    // AF may gain a menu exclusion timestamp later, and AJ may be Removed.
    // Neither changes this already completed operation's durable identity.
    correctionRevision_(matches[0], snapshot.timeZone);
    return correctionSavedReceipt_(payload);
}

function correctionCell_(value, timeZone) {
    // Omit the value to clear a native cell. A stored empty string still
    // counts as populated in Sheets COUNTIFS and is not a genuine blank.
    if (value === "") return {};
    if (value instanceof Date) {
        // Sheets serials are local wall-clock days, not UTC days. Formatting in
        // the workbook zone handles both sides of DST and non-whole-hour zones.
        const wallClock = Utilities.formatDate(
            value,
            timeZone,
            "yyyy-MM-dd'T'HH:mm:ss.SSS"
        );
        return {
            userEnteredValue: {
                numberValue: Date.parse(`${wallClock}Z`) / 86400000 + 25569,
            },
        };
    }
    return {
        userEnteredValue:
            typeof value === "number"
                ? { numberValue: value }
                : { stringValue: value },
    };
}

function correctionCellsRequest_(
    history,
    row,
    column,
    values,
    fields = "userEnteredValue"
) {
    return {
        updateCells: {
            start: {
                sheetId: history.getSheetId(),
                rowIndex: row - 1,
                columnIndex: column - 1,
            },
            rows: [{ values }],
            fields,
        },
    };
}

function correctionBatchUpdate_(spreadsheet, requests) {
    if (
        typeof Sheets === "undefined" ||
        typeof Sheets.Spreadsheets?.batchUpdate !== "function"
    ) {
        throw new TypeError(
            "CORRECTION_API_UNAVAILABLE: Enable the Advanced Sheets v4 service and verify its API grant before correcting."
        );
    }
    Sheets.Spreadsheets.batchUpdate({ requests }, spreadsheet.getId());
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

    const initialSnapshot = correctionSnapshot_(spreadsheet);
    const observations = initialSnapshot.rows
        .filter(
            (row) =>
                row.rowNumber >= firstRow &&
                row.rowNumber <= lastRow &&
                row.values[35] !== "Removed" &&
                row.values.slice(0, 12).some(cleanText_)
        )
        .map((row) => ({
            ...row,
            observationId: correctionIdentity_(row.values[26]),
            revision: correctionRevision_(row, initialSnapshot.timeZone),
        }));
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

    // Apps Script releases locks during UI alerts. Capture identity/revision
    // first and acquire the shared writer lock only after confirmation.
    withCorrectionLock_(() => {
        const snapshot = correctionSnapshot_(spreadsheet);
        const current = observations.map((observation) => {
            const row = snapshot.rows.find(
                (candidate) =>
                    candidate.values[26] === observation.observationId
            );
            if (
                !row ||
                correctionRevision_(row, snapshot.timeZone) !==
                    observation.revision
            ) {
                throw new Error(
                    "STALE_PREVIEW: A selected observation changed while confirmation was open. Select it again and review."
                );
            }
            return row;
        });
        const removedAt = Utilities.formatDate(
            new Date(),
            snapshot.timeZone,
            "yyyy-MM-dd HH:mm:ss z"
        );
        const requests = current.flatMap((row) => {
            const addedReason = `Excluded from active analysis through the Garden logger menu on ${removedAt}.`;
            const reason = row.values[31]
                ? `${row.values[31]}\n${addedReason}`
                : addedReason;
            return [
                correctionCellsRequest_(history, row.rowNumber, 32, [
                    { userEnteredValue: { stringValue: reason } },
                ]),
                correctionCellsRequest_(history, row.rowNumber, 36, [
                    { userEnteredValue: { stringValue: "Removed" } },
                ]),
            ];
        });
        correctionBatchUpdate_(spreadsheet, requests);
    });
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
        wateringApplicationInput,
        waterAmountInput,
    ] = values;

    const id = cleanText_(labelId);
    if (!id) throw new Error("This row has no Plant ID.");

    const weight = optionalPositiveNumber_(weightInput, "Weight");
    const heightEntered = optionalPositiveNumber_(heightInput, "Height");
    const widthEntered = optionalPositiveNumber_(widthInput, "Width");
    const condition = cleanText_(conditionInput);
    const notes = cleanText_(notesInput);
    const selectedEvent = cleanText_(eventInput);
    const weightState = normalizeWeightState_(weightStateInput, weight);

    if (selectedEvent && !WEB_EVENT_OPTIONS.includes(selectedEvent)) {
        throw new Error(
            `Event must be one of: ${WEB_EVENT_OPTIONS.join(", ")}.`
        );
    }
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
    const includesWater = eventNames.includes("Water");
    if (
        !includesWater &&
        (cleanText_(wateringApplicationInput) || cleanText_(waterAmountInput))
    ) {
        throw new Error(
            "Watering application and amount can be entered only for a Water event."
        );
    }
    const details = {
        wateringApplication: includesWater
            ? normalizeWateringApplication_(wateringApplicationInput)
            : "",
        waterAmount: includesWater
            ? optionalPositiveNumber_(waterAmountInput, "Water amount")
            : "",
    };
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
        details,
    });

    quickLog.getRange(rowNumber, 4, 1, 8).clearContent();
    quickLog.getRange(rowNumber, 14, 1, 2).clearContent();
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
    ensureHistoryWaterColumns_(history);
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
    if (existingRequestRows.length !== expectedRows || !contiguous) {
        throw new Error(
            "This saved request has an unexpected History shape. Open History and check the newest rows before retrying."
        );
    }

    const complete = existingValues.every(
        (row) =>
            row[0] instanceof Date && cleanText_(row[1]) && cleanText_(row[2])
    );
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
        0, 1, 2, 4, 5, 6, 7, 8, 15, 16, 17, 18, 20, 21, 22, 23, 24, 25, 26, 27,
        28, 29, 30, 31, 32, 33, 34, 36, 39, 40, 41,
    ];
    return comparableColumns.every(
        (index) =>
            comparableHistoryValue_(actual[index]) ===
            comparableHistoryValue_(expected[index])
    );
}

/**
 * Normalize cell values for retry comparison while keeping dates distinct from
 * text that happens to contain the same timestamp.
 * @param {unknown} value - Canonical cell value.
 * @returns {number | string} A date timestamp or trimmed scalar text.
 */
function comparableHistoryValue_(value) {
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
        return [
            ...core,
            ...historyHelperFormulas_(rowNumber),
            requestId,
            ...historyDetailRow_(details, eventName),
            ...historyProvenanceRow_(input, requestId, eventName, index),
            ...historyMeasurementRow_(input, eventName, rowNumber),
            ...historyRotationRow_(input, eventName),
            eventName === "Water"
                ? safeSheetText_(details.wateringApplication)
                : "",
            eventName === "Water" ? details.waterAmount : "",
        ];
    });
}

function historyDetailRow_(details, eventName) {
    return [
        eventName === "Water" ? safeSheetText_(details.nutrientsUsed) : "",
        eventName === "Water" ? safeSheetText_(details.nutrientProduct) : "",
        eventName === "Water" ? safeSheetText_(details.nutrientAmount) : "",
        eventName === "Repot" ? safeSheetText_(details.previousPotSize) : "",
        eventName === "Repot" ? safeSheetText_(details.potSize) : "",
        eventName === "Flower" ? details.flowerCount : "",
        eventName === "Flower" ? safeSheetText_(details.flowerDetails) : "",
        eventName === "Photo" ? safeSheetText_(details.photoUrl) : "",
        eventName === "Pest" ? safeSheetText_(details.pestIssue) : "",
        eventName === "Pest" ? safeSheetText_(details.pestTreatment) : "",
    ];
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
    history
        .getRange(
            targetRow,
            GARDEN_LOGGER.historyWaterStartColumn + 1,
            storedRows.length,
            1
        )
        .setNumberFormat("0.##");
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
    const unexpected = validations.some((row) => row.some(Boolean));
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
            ? Number(input.details?.rotationDegrees) || 90
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
    if (weight !== "") addUnique("Weigh");
    if (height !== "" || width !== "") addUnique("Measure");
    /* Both outcomes have tests; V8 reports a synthetic alternate branch for this one-sided guard. */
    if (condition) addUnique("Check");
    /* Both outcomes have tests; V8 reports a synthetic alternate branch for this one-sided guard. */
    if (eventNames.length === 0 && notes) addUnique("Note");

    const waterIndex = eventNames.indexOf("Water");
    const weighIndex = eventNames.indexOf("Weigh");
    if (waterIndex >= 0 && weighIndex >= 0 && waterIndex < weighIndex) {
        eventNames.splice(waterIndex, 1);
        eventNames.splice(eventNames.indexOf("Weigh") + 1, 0, "Water");
    }

    /* Both outcomes have tests; V8 reports a synthetic alternate branch for this one-sided guard. */
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
        wateringApplication: "",
        waterAmount: "",
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
    if (!eventNames.includes("Rotation")) {
        return;
    }
    const raw = cleanText_(payload?.rotationDegrees) || "90";
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
    if (!eventNames.includes("Water")) {
        return;
    }

    details.wateringApplication = normalizeWateringApplication_(
        payload?.wateringApplication
    );
    details.waterAmount = optionalPositiveNumber_(
        payload?.waterAmount,
        "Water amount"
    );
    const nutrientsUsed = cleanText_(payload?.nutrientsUsed);
    const nutrientProduct = cleanText_(payload?.nutrientProduct);
    const nutrientAmount = cleanText_(payload?.nutrientAmount);
    if (!NUTRIENT_OPTIONS.includes(nutrientsUsed)) {
        throw new Error("For Water, choose whether nutrients were used.");
    }
    if (nutrientsUsed === "Yes" && (!nutrientProduct || !nutrientAmount)) {
        throw new Error(
            "Enter both the nutrient product and amount used with this watering."
        );
    }

    details.nutrientsUsed = nutrientsUsed;
    if (nutrientsUsed === "Yes") {
        details.nutrientProduct = nutrientProduct;
        details.nutrientAmount = nutrientAmount;
    }
}

function normalizeWateringApplication_(value) {
    const application = cleanText_(value) || WATERING_APPLICATION_OPTIONS[0];
    if (!WATERING_APPLICATION_OPTIONS.includes(application)) {
        throw new Error(
            `Watering application must be one of: ${WATERING_APPLICATION_OPTIONS.join(", ")}.`
        );
    }
    return application;
}

function addRepotDetails_(details, payload, eventNames, plant) {
    if (!eventNames.includes("Repot")) {
        return;
    }

    const potSize = cleanText_(payload?.potSize);
    if (!potSize) {
        throw new Error("Enter the new pot size for the Repot event.");
    }

    details.previousPotSize = cleanText_(plant?.currentPotSize);
    details.potSize = potSize;
}

function addFlowerDetails_(details, payload, eventNames) {
    if (!eventNames.includes("Flower")) return;

    const flowerCount = optionalPositiveInteger_(
        payload?.flowerCount,
        "Flower count"
    );
    const flowerDetails = cleanText_(payload?.flowerDetails);
    if (flowerCount === "" && !flowerDetails) {
        throw new Error(
            "Enter a flower count, a description, or both for the Flower event."
        );
    }

    details.flowerCount = flowerCount;
    details.flowerDetails = flowerDetails;
}

function addPhotoDetails_(details, payload, eventNames) {
    if (!eventNames.includes("Photo")) return;

    const photoUrl = cleanText_(payload?.photoUrl);
    if (!isGooglePhotosShareUrl_(photoUrl)) {
        throw new Error(
            "Photo needs a Google Photos share link from photos.google.com or photos.app.goo.gl."
        );
    }

    details.photoUrl = photoUrl;
}

function addPestDetails_(details, payload, eventNames) {
    if (!eventNames.includes("Pest")) return;

    const pestIssue = cleanText_(payload?.pestIssue);
    const pestTreatment = cleanText_(payload?.pestTreatment);
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
    if (!plantId) return null;
    return plantRecordsById_(spreadsheet).get(plantId) || null;
}

function plantRecordsById_(spreadsheet) {
    const tracker = requireSheet_(spreadsheet, GARDEN_LOGGER.plantTrackerSheet);
    const rowCount = Math.max(0, tracker.getLastRow() - 1);
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
    /** @type {Map<string, string>} */
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
    const inferredStates = inferredWeightStatesByRow_(historyRows);
    const result = new Map();
    currentSetupWeightRecordsByPlant_(historyRows).forEach(
        (records, plantId) => {
            const selected = records
                .filter(
                    (record) => inferredStates.get(record.rowIndex) === "Dry"
                )
                .sort(compareHistoryRecords_)
                .at(-1);
            if (!selected) return;
            result.set(plantId, {
                weight: selected.weight,
                observedAt: selected.observedAt,
                basis: "Completed cycle",
            });
        }
    );
    return result;
}

/**
 * A measured weight must be a numeric Sheets cell. Numeric-looking text,
 * booleans, estimates, and non-Weigh companion rows are not scale readings.
 * Legacy blank quality/method remains eligible, as in the dry-down model.
 */
function measuredHistoryWeight_(row) {
    return (
        cleanText_(row[2]) === "Weigh" &&
        typeof row[4] === "number" &&
        Number.isFinite(row[4]) &&
        row[4] > 0 &&
        !/estimat/i.test(cleanText_(row[28]) + " " + cleanText_(row[34]))
    );
}

/**
 * All-history activity totals and descriptive current-cycle loss, independent
 * of forecast training. Elapsed days use actual timestamps (including DST).
 */
function plantActivitySummary_(historyRows, plantId, potSetup) {
    const correctionOrder = historyCorrectionContext_(historyRows).order;
    const orderByRow = new Map(
        historyRows.map((row, index) => [row, correctionOrder[index]])
    );
    const rows = historyRows.filter(
        (row) => activeHistoryRow_(row) && cleanText_(row[1]) === plantId
    );
    /** @type {{totalWaterings: number, totalMeasurements: number, totalWeights: number,
     * averageWaterIntervalDays: number | "", waterIntervalCount: number,
     * averageDryDownGramsPerDay: number | "", dryDownDays: number | "",
     * dryDownReadingCount: number, recentDryDownGramsPerDay: number | "",
     * recentDryDownDays: number | ""}} */
    const summary = {
        totalWaterings: rows.filter((row) => cleanText_(row[2]) === "Water")
            .length,
        totalMeasurements: rows.filter(
            (row) => cleanText_(row[2]) === "Measure"
        ).length,
        totalWeights: rows.filter(measuredHistoryWeight_).length,
        averageWaterIntervalDays: "",
        waterIntervalCount: 0,
        averageDryDownGramsPerDay: "",
        dryDownDays: "",
        dryDownReadingCount: 0,
        recentDryDownGramsPerDay: "",
        recentDryDownDays: "",
    };
    const records = rows.map((row, index) => {
        const timestamp =
            row[0] instanceof Date || typeof row[0] === "string"
                ? dateSortValue_(row[0])
                : 0;
        return {
            index: orderByRow.get(row) ?? index,
            date: timestamp > 0 ? timestamp / 86400000 + 25569 : 0,
            setup: positiveIntegerOrDefault_(row[10], 1),
            event: cleanText_(row[2]),
            weight: measuredHistoryWeight_(row) ? row[4] : 0,
            save: cleanText_(row[29] || row[15]),
            application: cleanText_(row[40]),
            estimated: !measuredHistoryWeight_(row),
        };
    });
    const dates = records
        .filter((r) => r.event === "Water" && r.date > 0)
        .map((r) => r.date)
        .sort((a, b) => a - b);
    summary.waterIntervalCount = Math.max(0, dates.length - 1);
    if (summary.waterIntervalCount) {
        summary.averageWaterIntervalDays =
            (dates.at(-1) - dates[0]) / summary.waterIntervalCount;
    }
    const setup = Math.max(potSetup, ...records.map((r) => r.setup));
    const currentRecords = records.filter((r) => r.setup === setup);
    // An undated boundary cannot be safely placed before or after these weights.
    if (
        currentRecords.some(
            (r) => ["Water", "Repot"].includes(r.event) && !r.date
        )
    )
        return summary;
    const current = dryDownCycles_(currentRecords).at(-1);
    if (
        !current ||
        !fullWateringForForecast_(current.water) ||
        currentRecords.some(
            (r) =>
                r.event === "Repot" &&
                r.date >= current.water.date &&
                !dryDownRecordsShareSave_(r, current.water)
        )
    )
        return summary;
    // Descriptive loss needs an observed span, not the forecast's prompt Wet
    // anchor. Same-save identity includes a Weigh row ordered before Water.
    const water = current.water;
    const points = currentRecords
        .filter(
            (r) =>
                r.event === "Weigh" &&
                !r.estimated &&
                (r.date > water.date ||
                    (r.date === water.date &&
                        (r.index > water.index ||
                            dryDownRecordsShareSave_(r, water))))
        )
        .sort((a, b) => a.date - b.date || a.index - b.index);
    return { ...summary, ...observedDryDownSummary_(points) };
}

/**
 * Endpoint loss / actual elapsed days, never a fixed future drying rate.
 * Require a day of observation, collapse equal timestamps to the last reading,
 * and withhold rates after a gain exceeding 2 g above any prior cycle low.
 * The small noise allowance does not change forecast/model tolerance rules.
 * @param {DryDownRecord[]} points
 */
function observedDryDownSummary_(points) {
    const unique = [
        ...new Map(points.map((point) => [point.date, point])).values(),
    ];
    const first = unique[0];
    const last = unique.at(-1);
    /** @type {{averageDryDownGramsPerDay: number | "", dryDownDays: number | "",
     * dryDownReadingCount: number, recentDryDownGramsPerDay: number | "", recentDryDownDays: number | ""}} */
    const summary = {
        averageDryDownGramsPerDay: "",
        dryDownDays: "",
        dryDownReadingCount: unique.length,
        recentDryDownGramsPerDay: "",
        recentDryDownDays: "",
    };
    if (!first || !last || last.date - first.date < 1) return summary;
    summary.dryDownDays = last.date - first.date;
    let lowest = points[0].weight;
    const gain = points.some((point) => {
        lowest = Math.min(lowest, point.weight);
        return point.weight - lowest > 2;
    });
    if (gain || first.weight <= last.weight) return summary;
    summary.averageDryDownGramsPerDay =
        (first.weight - last.weight) / summary.dryDownDays;
    const previous = unique.at(-2);
    const recentDays = last.date - previous.date;
    if (recentDays >= 1 && previous.weight >= last.weight) {
        summary.recentDryDownDays = recentDays;
        summary.recentDryDownGramsPerDay =
            (previous.weight - last.weight) / recentDays;
    }
    return summary;
}

function currentPotSetupsFromRows_(historyRows) {
    const currentSetupByPlant = new Map();
    historyRows.forEach((row) => {
        if (!activeHistoryRow_(row)) return;
        const plantId = cleanText_(row[1]);
        if (!plantId) return;
        const potSetup = positiveIntegerOrDefault_(row[10], 1);
        currentSetupByPlant.set(
            plantId,
            Math.max(currentSetupByPlant.get(plantId) || 1, potSetup)
        );
    });
    return currentSetupByPlant;
}

function currentSetupWeightRecordsByPlant_(historyRows) {
    const currentSetupByPlant = currentPotSetupsFromRows_(historyRows);
    const correctionOrder = historyCorrectionContext_(historyRows).order;

    const recordsByPlant = new Map();
    historyRows.forEach((row, rowIndex) => {
        if (!activeHistoryRow_(row) || cleanText_(row[2]) !== "Weigh") return;
        const plantId = cleanText_(row[1]);
        const potSetup = positiveIntegerOrDefault_(row[10], 1);
        const weight = Number(row[GARDEN_LOGGER.historyWeightColumn - 1]);
        if (
            !plantId ||
            potSetup !== currentSetupByPlant.get(plantId) ||
            !Number.isFinite(weight) ||
            weight <= 0
        ) {
            return;
        }
        const timestamp = dateSortValue_(row[0]);
        const records = recordsByPlant.get(plantId) || [];
        records.push({
            plantId,
            potSetup,
            weight,
            observedAt: row[0],
            timestamp,
            rowIndex,
            orderIndex: correctionOrder[rowIndex],
            saveGroup: cleanText_(row[29]),
        });
        recordsByPlant.set(plantId, records);
    });
    return recordsByPlant;
}

function currentSetupWaterRecordsByPlant_(historyRows) {
    const currentSetupByPlant = currentPotSetupsFromRows_(historyRows);
    const correctionOrder = historyCorrectionContext_(historyRows).order;
    const recordsByPlant = new Map();
    historyRows.forEach((row, rowIndex) => {
        if (!activeHistoryRow_(row) || cleanText_(row[2]) !== "Water") return;
        const plantId = cleanText_(row[1]);
        const potSetup = positiveIntegerOrDefault_(row[10], 1);
        if (!plantId || potSetup !== currentSetupByPlant.get(plantId)) return;
        const records = recordsByPlant.get(plantId) || [];
        records.push({
            plantId,
            potSetup,
            observedAt: row[0],
            timestamp: dateSortValue_(row[0]),
            rowIndex,
            orderIndex: correctionOrder[rowIndex],
            saveGroup: cleanText_(row[29]),
        });
        recordsByPlant.set(plantId, records);
    });
    return recordsByPlant;
}

function inferredWeightStatesByRow_(historyRows) {
    const inferred = new Map();
    const waterRecordsByPlant = currentSetupWaterRecordsByPlant_(historyRows);
    currentSetupWeightRecordsByPlant_(historyRows).forEach(
        (unsortedRecords, plantId) => {
            const records = [...unsortedRecords].sort(compareHistoryRecords_);
            const waterRecords = [
                ...(waterRecordsByPlant.get(plantId) || []),
            ].sort(compareHistoryRecords_);
            records.forEach((record) => {
                inferred.set(record.rowIndex, "Routine");
            });

            waterRecords.forEach((waterRecord, waterIndex) => {
                const nextWaterRecord = waterRecords[waterIndex + 1];
                const sameSaveRecord = records.findLast((record) =>
                    historyRecordsShareSave_(record, waterRecord)
                );
                const firstPromptRecord = sameSaveRecord
                    ? null
                    : records.find((record) => {
                          const elapsed =
                              record.timestamp - waterRecord.timestamp;
                          return (
                              compareHistoryRecords_(record, waterRecord) > 0 &&
                              (!nextWaterRecord ||
                                  compareHistoryRecords_(
                                      record,
                                      nextWaterRecord
                                  ) < 0) &&
                              elapsed >= 0 &&
                              elapsed <= WET_WEIGHT_WINDOW_MS
                          );
                      });
                const wetRecord = sameSaveRecord || firstPromptRecord;
                if (wetRecord) {
                    inferred.set(wetRecord.rowIndex, "Wet");
                }
            });

            let previousWaterRecord = null;
            waterRecords.forEach((waterRecord) => {
                const selected = records.findLast(
                    (record) =>
                        (!previousWaterRecord ||
                            compareHistoryRecords_(
                                record,
                                previousWaterRecord
                            ) > 0) &&
                        compareHistoryRecords_(record, waterRecord) < 0 &&
                        inferred.get(record.rowIndex) !== "Wet" &&
                        !historyRecordsShareSave_(record, waterRecord)
                );
                if (selected) {
                    inferred.set(selected.rowIndex, "Dry");
                }
                previousWaterRecord = waterRecord;
            });
        }
    );
    return inferred;
}

function compareHistoryRecords_(left, right) {
    return (
        left.timestamp - right.timestamp ||
        (left.orderIndex ?? left.rowIndex) -
            (right.orderIndex ?? right.rowIndex) ||
        left.rowIndex - right.rowIndex
    );
}

/**
 * Corrections keep the original observation's equal-time order. An active
 * replacement also explains its removed ancestors, which are audit evidence
 * rather than missing chart measurements. Invalid lineage keeps physical order.
 */
function historyCorrectionContext_(historyRows) {
    return correctionRecordContext_(
        historyRows.map((row, index) => ({
            index,
            id: cleanText_(row[26]),
            corrects: cleanText_(row[30]),
            plant: cleanText_(row[1]),
            event: cleanText_(row[2]),
            setup: positiveIntegerOrDefault_(row[10], 1),
            active: activeHistoryRow_(row),
        }))
    );
}

function correctionRecordContext_(records) {
    const byId = new Map();
    records.forEach((record) => {
        if (record.id) byId.set(record.id, byId.has(record.id) ? null : record);
    });
    const superseded = new Set();
    const order = records.map((record) => {
        const ancestors = [];
        const visited = new Set([record]);
        let original = record;
        while (original.corrects) {
            const previous = byId.get(original.corrects);
            if (
                !previous ||
                visited.has(previous) ||
                previous.active ||
                previous.plant !== record.plant ||
                previous.event !== record.event ||
                previous.setup !== record.setup
            )
                return record.index;
            ancestors.push(previous.index);
            visited.add(previous);
            original = previous;
        }
        if (record.active) ancestors.forEach((index) => superseded.add(index));
        return original.index;
    });
    return { order, superseded };
}

function historyRecordsShareSave_(left, right) {
    if (left.saveGroup && right.saveGroup) {
        return left.saveGroup === right.saveGroup;
    }
    if (left.timestamp && left.timestamp === right.timestamp) return true;
    const leftObservedAt = cleanText_(left.observedAt);
    return (
        Boolean(leftObservedAt) &&
        leftObservedAt === cleanText_(right.observedAt)
    );
}

function activeHistoryRow_(row) {
    return (
        cleanText_(
            row[
                GARDEN_LOGGER.historyProvenanceStartColumn +
                    GARDEN_LOGGER.historyProvenanceColumns -
                    2
            ]
        ) !== "Removed"
    );
}

function positiveIntegerOrDefault_(value, fallback) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : fallback;
}

function updateBaselinePotSetup_(spreadsheet, plantId, potSetup) {
    const baselines = requireSheet_(spreadsheet, GARDEN_LOGGER.baselinesSheet);
    const baselineData = baselinePotSetupData_(baselines);
    const index = baselineData.rows.findIndex(
        ([candidateId]) => cleanText_(candidateId) === plantId
    );
    if (index < 0) {
        throw new Error(`Plant ID ${plantId} is missing from Baselines.`);
    }
    baselines
        .getRange(index + 2, baselineData.potSetupColumn)
        .setValue(potSetup);
}

function baselinePotSetupData_(baselines) {
    const rowCount = Math.max(0, baselines.getLastRow() - 1);
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
    if (!columnCount) return 0;
    const headers = sheet
        .getRange(1, 1, 1, columnCount)
        .getDisplayValues()[0]
        .map(cleanText_);
    const matches = headers.reduce((indexes, header, index) => {
        if (header === expectedHeader) indexes.push(index + 1);
        return indexes;
    }, []);
    if (matches.length > 1) {
        throw new Error(
            `${sheet.getName()} has more than one "${expectedHeader}" header.`
        );
    }
    return matches[0] || 0;
}

function requiredColumnForHeader_(sheet, expectedHeader) {
    const column = optionalColumnForHeader_(sheet, expectedHeader);
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

/** Only dated observations can support a current read model. */
function webHistoryTimestamp_(value) {
    if (
        !(value instanceof Date) &&
        (typeof value !== "string" ||
            !value.trim() ||
            Number.isFinite(Number(value)))
    )
        return 0;
    const timestamp = dateSortValue_(value);
    return Math.max(timestamp, 0);
}

/** Derive all plant reads from the bootstrap's one History snapshot. */
function webWeightReadModelsFromRows_(
    historyRows,
    baselineSetups,
    now,
    timeZone
) {
    const nowMs = now.getTime();
    const dayKey = Utilities.formatDate(now, timeZone, "yyyy-MM-dd");
    const weighedToday = new Set();
    const recordsByPlant = new Map();
    const correctionContext = historyCorrectionContext_(historyRows);
    // Preserve row indexes for inferred Dry ordering while withholding invalid
    // and future evidence. Request ID supplies same-save identity on old rows.
    const eligibleRows = historyRows.map((row, rowIndex) => {
        const plantId = cleanText_(row[1]);
        const timestamp = webHistoryTimestamp_(row[0]);
        const measured = measuredHistoryWeight_(row);
        const active = activeHistoryRow_(row);
        const saveGroup = cleanText_(row[29]) || cleanText_(row[15]);
        if (plantId) {
            const records = recordsByPlant.get(plantId) || [];
            records.push({
                row,
                rowIndex,
                orderIndex: correctionContext.order[rowIndex],
                superseded: correctionContext.superseded.has(rowIndex),
                timestamp,
                measured,
                active,
                saveGroup,
                observedAt: row[0],
                potSetup: positiveIntegerOrDefault_(row[10], 1),
                event: cleanText_(row[2]),
            });
            recordsByPlant.set(plantId, records);
        }
        if (!active || !timestamp || timestamp > nowMs) {
            const excluded = [...row];
            excluded[35] = "Removed";
            return excluded;
        }
        if (
            measured &&
            plantId &&
            Utilities.formatDate(
                new Date(timestamp),
                timeZone,
                "yyyy-MM-dd"
            ) === dayKey
        ) {
            weighedToday.add(plantId);
        }
        const eligible = [...row];
        if (cleanText_(row[2]) === "Weigh" && !measured) eligible[4] = "";
        eligible[29] = saveGroup;
        return eligible;
    });
    const setups = currentPotSetupsFromRows_(eligibleRows);
    const historySetups = new Map(setups);
    baselineSetups.forEach((setup, plantId) => {
        setups.set(
            plantId,
            Math.max(
                setups.get(plantId) || 1,
                positiveInteger_(setup || 1, "Pot setup")
            )
        );
    });
    const dryByPlant = dryOrLowestWeightsFromRows_(eligibleRows);
    const byPlant = new Map();
    setups.forEach((potSetup, plantId) => {
        const records = (recordsByPlant.get(plantId) || []).filter(
            (record) => record.potSetup === potSetup
        );
        // The dry helper chooses History's newest setup; Baselines can already
        // be ahead of it, in which case that old reference must stay absent.
        byPlant.set(
            plantId,
            webPlantWeightReadModel_(
                records,
                potSetup,
                nowMs,
                historySetups.get(plantId) === potSetup
                    ? dryByPlant.get(plantId) || null
                    : null
            )
        );
    });
    return {
        dayKey,
        weighedTodayPlantIds: [...weighedToday].sort((left, right) =>
            left.localeCompare(right)
        ),
        byPlant,
    };
}

/** A chart is measured history, independent of the watering forecast model. */
function webPlantWeightReadModel_(records, potSetup, nowMs, previousDry) {
    const dated = records
        .filter((record) => record.timestamp && record.timestamp <= nowMs)
        .sort(compareHistoryRecords_);
    const repot = dated.findLast(
        (record) => record.active && record.event === "Repot"
    );
    const afterBoundary = (record, boundary) =>
        !boundary ||
        compareHistoryRecords_(record, boundary) >= 0 ||
        (record.timestamp === boundary.timestamp &&
            historyRecordsShareSave_(record, boundary));
    const inSetup = dated.filter((record) => afterBoundary(record, repot));
    const measured = inSetup.filter(
        (record) => record.active && record.measured
    );
    const latest = measured.at(-1);
    const water = inSetup.findLast(
        (record) => record.active && record.event === "Water"
    );
    const start = water || repot || measured[0];
    let startKind = start ? "First reading" : "";
    if (repot) startKind = "Repot";
    if (water) startKind = "Water";
    const iso = (record) =>
        record ? new Date(record.timestamp).toISOString() : "";
    const span = inSetup.filter((record) => afterBoundary(record, start));
    const undated = records.filter(
        (record) =>
            record.event === "Weigh" && !record.timestamp && !record.superseded
    );
    const future = records.filter(
        (record) =>
            record.event === "Weigh" &&
            record.timestamp > nowMs &&
            !record.superseded
    );
    let excludedCount = undated.length + future.length;
    let interrupted = undated.length > 0;
    const points = [];
    span.forEach((record) => {
        if (record.event !== "Weigh" || record.superseded) return;
        if (!record.active || !record.measured) {
            excludedCount += 1;
            interrupted = true;
            return;
        }
        const previous = points.at(-1);
        points.push({
            observedAt: iso(record),
            weight: record.row[4],
            observationId: cleanText_(record.row[26]),
            breakBefore: Boolean(
                previous &&
                (interrupted ||
                    record.timestamp -
                        webHistoryTimestamp_(previous.observedAt) >
                        48 * 60 * 60 * 1000)
            ),
        });
        // An undated exclusion cannot be located on either side of a point.
        interrupted = undated.length > 0;
    });
    const dryAt = previousDry
        ? webHistoryTimestamp_(previousDry.observedAt)
        : 0;
    return {
        latestWeight: latest ? latest.row[4] : "",
        latestWeightAt: iso(latest),
        weightSeries: {
            potSetup,
            setupStartedAt: iso(repot),
            startedAt: iso(start),
            startKind,
            points,
            waterings: span
                .filter((record) => record.active && record.event === "Water")
                .map((record) => ({
                    observedAt: iso(record),
                    application: cleanText_(record.row[40]),
                })),
            previousDry:
                dryAt && (!repot || dryAt >= repot.timestamp)
                    ? {
                          observedAt: new Date(dryAt).toISOString(),
                          weight: previousDry.weight,
                      }
                    : null,
            excludedCount,
        },
    };
}

function normalizeWebHistoryFilters_(filters, plantNames) {
    if (
        !filters ||
        typeof filters !== "object" ||
        Array.isArray(filters) ||
        Object.prototype.toString.call(filters) !== "[object Object]" ||
        Object.keys(filters).some((key) => !["plantId", "event"].includes(key))
    ) {
        throw new Error("History filters must contain only plantId and event.");
    }
    for (const key of ["plantId", "event"]) {
        if (filters[key] !== undefined && typeof filters[key] !== "string") {
            throw new Error(`History ${key} filter must be text.`);
        }
    }
    const plantId = cleanText_(filters.plantId);
    const event = cleanText_(filters.event);
    if (plantId && !plantNames.has(plantId))
        throw new Error("Unknown History plant ID.");
    if (event && !WEB_EVENT_OPTIONS.includes(event))
        throw new Error("Unknown History event.");
    return { plantId, event };
}

/**
 * Whitelist JSON scalar cell values; retain numbers and booleans for the DTO.
 * @returns {string | number | boolean} A valid scalar, or an empty string.
 */
function webHistoryDetailValue_(value) {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? "" : value.toISOString();
    }
    if (typeof value === "number") return Number.isFinite(value) ? value : "";
    if (typeof value === "string" || typeof value === "boolean") return value;
    return "";
}

function webHistoryDetails_(row) {
    const event = cleanText_(row[2]);
    const fields = {
        notes: 8,
        potSetup: 10,
        potLabel: 11,
        recordedAtIso: 9,
        entrySource: 27,
        observationQuality: 28,
        saveGroup: 29,
        correctsObservationId: 30,
        correctionReason: 31,
        recordStatus: 35,
    };
    const eventFields = {
        Water: {
            nutrientsUsed: 16,
            nutrientProduct: 17,
            nutrientAmount: 18,
            wateringApplication: 40,
            waterAmount: 41,
        },
        Weigh: { measurementMethod: 34 },
        Measure: {
            heightCm: 5,
            widthCm: 6,
            measurementMethod: 34,
            measurementUnit: 36,
        },
        Check: { condition: 7, soilMoisture: 32 },
        Repot: { previousPotSize: 19, potSize: 20, medium: 33 },
        Flower: { flowerCount: 21, flowerDetails: 22 },
        Photo: { photoUrl: 23 },
        Pest: { pestIssue: 24, pestTreatment: 25 },
        Rotation: { rotationDegrees: 39 },
    };
    const details = {};
    Object.entries({ ...fields, ...eventFields[event] }).forEach(
        ([key, index]) => {
            let value;
            if (key === "recordedAtIso") {
                const timestamp = webHistoryTimestamp_(row[index]);
                value = timestamp ? new Date(timestamp).toISOString() : "";
            } else value = webHistoryDetailValue_(row[index]);
            if (value !== "") details[key] = value;
        }
    );
    if (event === "Measure") {
        const unit = cleanText_(row[36]) || "cm";
        details.measurementUnit = unit;
        for (const [key, index] of [
            ["height", 5],
            ["width", 6],
        ]) {
            const value = row[index];
            if (
                typeof value !== "number" ||
                !Number.isFinite(value) ||
                value <= 0
            )
                continue;
            details[`${key}In`] = value / 2.54;
            if (unit === "in" || unit === "cm")
                details[key] = unit === "in" ? value / 2.54 : value;
        }
    }
    return details;
}

function recentObservationsFromRows_(
    historyRows,
    timeZone,
    limit,
    plantNames,
    filters = {}
) {
    const { plantId: selectedPlant, event: selectedEvent } =
        normalizeWebHistoryFilters_(filters, plantNames);
    const inferredWeightStates = inferredWeightStatesByRow_(historyRows);
    return historyRows
        .map((row, index) => ({ row, index }))
        .filter(
            ({ row }) =>
                cleanText_(row[1]) &&
                cleanText_(row[2]) &&
                (!selectedPlant || cleanText_(row[1]) === selectedPlant) &&
                (!selectedEvent || cleanText_(row[2]) === selectedEvent) &&
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
            if (observedDifference) return observedDifference;
            const recordedDifference =
                dateSortValue_(right.row[9]) - dateSortValue_(left.row[9]);
            return recordedDifference || right.index - left.index;
        })
        .slice(0, limit)
        .map(({ row, index }) => {
            const plantId = cleanText_(row[1]);
            return {
                observationId: cleanText_(row[26]),
                observedAtIso: webHistoryTimestamp_(row[0])
                    ? new Date(webHistoryTimestamp_(row[0])).toISOString()
                    : "",
                details: webHistoryDetails_(row),
                observedAt: formatClientDate_(
                    row[0],
                    timeZone,
                    "MMM d, h:mm a"
                ),
                plantId,
                event: cleanText_(row[2]),
                weightState:
                    cleanText_(row[2]) === "Weigh"
                        ? inferredWeightStates.get(index) || "Routine"
                        : "",
                weight:
                    row[4] === "" ||
                    row[4] === null ||
                    row[4] === undefined ||
                    !Number.isFinite(Number(row[4]))
                        ? ""
                        : Number(row[4]),
                name: plantNames.get(plantId) || plantId,
            };
        });
}

function plantNamesById_(spreadsheet) {
    const tracker = requireSheet_(spreadsheet, GARDEN_LOGGER.plantTrackerSheet);
    const rowCount = Math.max(0, tracker.getLastRow() - 1);
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
    if (!rowNumbers.length) return { state: "missing", requestId };

    const firstRow = rowNumbers[0];
    const contiguous = rowNumbers.every(
        (rowNumber, index) => rowNumber === firstRow + index
    );
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

    if (!configureColumn) return;
    const dataRows = Math.max(1, history.getMaxRows() - 1);
    const unitRule = SpreadsheetApp.newDataValidation()
        .requireValueInList([...MEASUREMENT_UNIT_OPTIONS], true)
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

function ensureHistoryWaterColumns_(history, configureColumn = false) {
    ensureHistoryGrid_(history);
    const range = history.getRange(
        1,
        GARDEN_LOGGER.historyWaterStartColumn,
        1,
        GARDEN_LOGGER.historyWaterColumns
    );
    const current = range.getDisplayValues()[0].map(cleanText_);
    current.forEach((header, index) => {
        if (
            header !== HISTORY_WATER_HEADERS[index] &&
            !isReplaceableGeneratedHeader_(
                header,
                GARDEN_LOGGER.historyWaterStartColumn + index
            )
        ) {
            throw new Error(
                `History!${columnName_(GARDEN_LOGGER.historyWaterStartColumn + index)}1 must be "${HISTORY_WATER_HEADERS[index]}".`
            );
        }
    });
    const changed = current.some(
        (header, index) => header !== HISTORY_WATER_HEADERS[index]
    );
    if (changed) {
        range.setValues([HISTORY_WATER_HEADERS]);
        range.setNotes([
            [
                "How water was applied. Flood / soak-through means evenly saturating the root zone until water drains freely.",
                "Optional measured water volume in milliliters. Leave blank when volume was not measured.",
            ],
        ]);
    }

    if (!configureColumn) return;
    const dataRows = Math.max(1, history.getMaxRows() - 1);
    const applicationRule = SpreadsheetApp.newDataValidation()
        .requireValueInList([...WATERING_APPLICATION_OPTIONS], true)
        .setAllowInvalid(false)
        .build();
    const amountRule = SpreadsheetApp.newDataValidation()
        .requireNumberGreaterThan(0)
        .setAllowInvalid(false)
        .build();
    history
        .getRange(2, GARDEN_LOGGER.historyWaterStartColumn, dataRows, 1)
        .setDataValidation(applicationRule);
    history
        .getRange(2, GARDEN_LOGGER.historyWaterStartColumn + 1, dataRows, 1)
        .setDataValidation(amountRule)
        .setNumberFormat("0.##");
}

function ensureHistoryView_(spreadsheet) {
    const historyView = requireSheet_(
        spreadsheet,
        GARDEN_LOGGER.historyViewSheet
    );
    ensureSheetColumnCapacity_(historyView, GARDEN_LOGGER.historyStoredColumns);
    const lastColumn = columnName_(GARDEN_LOGGER.historyStoredColumns);
    const remainingColumns = GARDEN_LOGGER.historyStoredColumns - 1;
    const lastRow = GARDEN_LOGGER.historyCapacityRows;
    const expectedFormula = `=LET(rows,SORT(FILTER(${GARDEN_LOGGER.historySheet}!A2:${lastColumn}${lastRow},${GARDEN_LOGGER.historySheet}!A2:A${lastRow}<>""),1,FALSE,10,FALSE),fmt,LAMBDA(d,IF(d="","",IF(MOD(d,1)=0,TEXT(d,"M/d/yyyy"),TEXT(d,"M/d/yyyy h:mm AM/PM")))),VSTACK(${GARDEN_LOGGER.historySheet}!A1:${lastColumn}1,HSTACK(MAP(CHOOSECOLS(rows,1),fmt),CHOOSECOLS(rows,SEQUENCE(1,${remainingColumns},2,1)))))`;
    const formulaCell = historyView.getRange(1, 1);
    const changed = formulaCell.getFormula() !== expectedFormula;
    if (changed) {
        formulaCell
            .setFormula(expectedFormula)
            .setNote(
                "Read-only newest-first view of canonical History. Add or correct observations through the normal entry surfaces or canonical History; do not type into this formula-driven view."
            );
    }
    return changed;
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
    if (currentRows < GARDEN_LOGGER.historyCapacityRows) {
        history.insertRowsAfter(
            currentRows,
            GARDEN_LOGGER.historyCapacityRows - currentRows
        );
    }
}

function ensureQuickLogWaterColumns_(quickLog, configureColumns = false) {
    ensureSheetColumnCapacity_(quickLog, QUICK_LOG_HEADERS.length);
    const startColumn = 14;
    const expected = QUICK_LOG_HEADERS.slice(startColumn - 1);
    const range = quickLog.getRange(
        GARDEN_LOGGER.headerRow,
        startColumn,
        1,
        expected.length
    );
    const current = range.getDisplayValues()[0].map(cleanText_);
    current.forEach((header, index) => {
        if (
            header !== expected[index] &&
            !isReplaceableGeneratedHeader_(header, startColumn + index)
        ) {
            throw new Error(
                `Quick log!${columnName_(startColumn + index)}${GARDEN_LOGGER.headerRow} must be "${expected[index]}".`
            );
        }
    });
    const changed = expected.some((header, index) => current[index] !== header);
    if (changed) range.setValues([[...expected]]);

    if (!configureColumns) return changed;
    const dataRows = Math.max(
        1,
        quickLog.getMaxRows() - GARDEN_LOGGER.firstInputRow + 1
    );
    const applicationRule = SpreadsheetApp.newDataValidation()
        .requireValueInList([...WATERING_APPLICATION_OPTIONS], true)
        .setAllowInvalid(false)
        .build();
    const amountRule = SpreadsheetApp.newDataValidation()
        .requireNumberGreaterThan(0)
        .setAllowInvalid(false)
        .build();
    quickLog
        .getRange(GARDEN_LOGGER.firstInputRow, startColumn, dataRows, 1)
        .setDataValidation(applicationRule);
    quickLog
        .getRange(GARDEN_LOGGER.firstInputRow, startColumn + 1, dataRows, 1)
        .setDataValidation(amountRule)
        .setNumberFormat("0.##");
    range
        .setBackground("#24533f")
        .setFontColor("#ffffff")
        .setFontWeight("bold");
    quickLog.setColumnWidth(startColumn, 180);
    quickLog.setColumnWidth(startColumn + 1, 130);
    quickLog
        .getRange(GARDEN_LOGGER.headerRow, startColumn)
        .setNote(
            "Optional for Water. Blank defaults to Flood / soak-through when saved."
        );
    quickLog
        .getRange(GARDEN_LOGGER.headerRow, startColumn + 1)
        .setNote("Optional measured water volume in milliliters.");
    return changed;
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
        formulaRow?.[GARDEN_LOGGER.fieldGuideColumn - 1]
    );
    const match = /HYPERLINK\(\s*"([^"]+)"/i.exec(formula);
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

/**
 * Preserve empty measurements as blank Sheets cells and valid measurements as
 * numbers, so missing observations are never stored as zero or numeric text.
 * @param {unknown} value - Submitted measurement or blank cell.
 * @param {string} label - Measurement name in validation errors.
 * @returns {number | ""} A positive measurement or a blank cell.
 */
function optionalPositiveNumber_(value, label) {
    if (value === "" || value === null || value === undefined) return "";
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
        throw new Error(`${label} must be a positive number.`);
    }
    return number;
}

/**
 * Preserve an omitted count as a blank cell while validating entered counts.
 * @param {unknown} value - Submitted count or blank cell.
 * @param {string} label - Count name in validation errors.
 * @returns {number | ""} A positive whole-number count or a blank cell.
 */
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
