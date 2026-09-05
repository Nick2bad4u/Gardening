import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(
    new URL("./google-sheets/plant-tracker.gs", import.meta.url),
    "utf8"
);
const html = fs.readFileSync(
    new URL("./google-sheets/Index.html", import.meta.url),
    "utf8"
);
const trackerDataSource = fs.readFileSync(
    new URL("../docs/layouts/plant-tracker-data.js", import.meta.url),
    "utf8"
);
const { comparePlantsByNaturalLabel, parseDate } = await import(
    `data:text/javascript;base64,${Buffer.from(trackerDataSource).toString("base64")}`
);

const context = vm.createContext({
    console,
    Map,
    Set,
    URL,
    encodeURIComponent,
    Utilities: { getUuid: () => "test-request-id" },
});
vm.runInContext(source, context, { filename: "plant-tracker.gs" });
assert.equal(vm.runInContext("GARDEN_LOGGER.version", context), "5.18.0");
const webPlantImageUrls = JSON.parse(
    JSON.stringify(vm.runInContext("WEB_PLANT_IMAGE_URLS", context))
);
assert.equal(Object.keys(webPlantImageUrls).length, 30);
assert.ok(
    Object.values(webPlantImageUrls).every(({ currentImageUrl }) =>
        /^https:\/\/thumb\.gyazo\.com\/thumb\/960\/[a-f\d]{32}\.(?:jpg|png)$/u.test(
            currentImageUrl
        )
    ),
    "Every current P01-P30 logger photo must use a cached 960 px Gyazo thumbnail."
);
assert.match(
    webPlantImageUrls.P20.currentImageUrl,
    /7954fb6f93fc71827ac45cd854eeb25a/,
    "P20 must show the shared succulent planter."
);

assert.deepEqual(
    Array.from(
        context.buildEventNamesFromList_(
            ["Water"],
            "Wet",
            420,
            7,
            "",
            "Firm",
            "Round check"
        )
    ),
    [
        "Weigh",
        "Water",
        "Measure",
        "Check",
    ]
);
assert.deepEqual(
    Array.from(context.buildEventNames_("Weigh", "Wet", 420, "", "", "", "")),
    ["Weigh"]
);
assert.equal(context.safeSheetText_('=IMPORTXML("x")'), '\'=IMPORTXML("x")');
assert.equal(context.safeSheetText_("healthy"), "healthy");
/**
 * @param {{
 *     plantId: string;
 *     observedAt: string;
 *     event?: string;
 *     weight?: number | string;
 *     batch?: string;
 *     status?: string;
 * }} record
 */
const checkWeightRow = ({
    plantId,
    observedAt,
    event = "Weigh",
    weight = "",
    batch = "",
    status = "",
}) => {
    const row = Array(42).fill("");
    row[0] = observedAt;
    row[1] = plantId;
    row[2] = event;
    row[3] = "Routine";
    row[4] = weight;
    row[10] = 1;
    row[29] = batch;
    row[35] = status;
    return row;
};
const dryOrLowestWeights = context.dryOrLowestWeightsFromRows_([
    checkWeightRow({
        plantId: "P01",
        observedAt: "2026-08-01T12:00:00Z",
        weight: 320,
        batch: "wet-1",
    }),
    checkWeightRow({
        plantId: "P01",
        observedAt: "2026-08-01T12:00:00Z",
        event: "Water",
        batch: "wet-1",
    }),
    checkWeightRow({
        plantId: "P01",
        observedAt: "2026-08-02T12:00:00Z",
        weight: 280,
    }),
    checkWeightRow({
        plantId: "P01",
        observedAt: "2026-08-03T12:00:00Z",
        weight: 330,
        batch: "wet-2",
    }),
    checkWeightRow({
        plantId: "P01",
        observedAt: "2026-08-03T12:00:00Z",
        event: "Water",
        batch: "wet-2",
    }),
    checkWeightRow({
        plantId: "P02",
        observedAt: "2026-08-03T12:00:00Z",
        weight: 410,
    }),
    checkWeightRow({
        plantId: "P02",
        observedAt: "2026-08-04T12:00:00Z",
        weight: 390,
    }),
]);
assert.deepEqual(
    { ...dryOrLowestWeights.get("P01") },
    {
        weight: 280,
        basis: "Completed cycle",
        observedAt: "2026-08-02T12:00:00Z",
    }
);
assert.equal(dryOrLowestWeights.has("P02"), false);
const appSheetEntryHeaders = Array.from(
    vm.runInContext("APP_SHEET_ENTRY_HEADERS", context)
);
assert.deepEqual(appSheetEntryHeaders, [
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
    "Rotation (°)",
    "Watering application",
    "Water amount (mL)",
]);
const appSheetBulkHeaders = Array.from(
    vm.runInContext("APP_SHEET_BULK_HEADERS", context)
);
assert.equal(appSheetBulkHeaders.length, 54);
assert.deepEqual(appSheetBulkHeaders.slice(0, 6), [
    "Round ID",
    "Started at",
    "Observed at",
    "Round action",
    "Selected plants",
    "Weight state",
]);
assert.deepEqual(
    appSheetBulkHeaders.slice(6, 36),
    Array.from(
        { length: 30 },
        (_, index) => `P${String(index + 1).padStart(2, "0")} weight (g)`
    )
);
assert.equal(appSheetBulkHeaders[36], "Notes");
assert.equal(appSheetBulkHeaders[39], "Status");
assert.equal(appSheetBulkHeaders[44], "Rotation (°)");
assert.equal(appSheetBulkHeaders[51], "Nutrient amount");
assert.equal(appSheetBulkHeaders[52], "Watering application");
assert.equal(appSheetBulkHeaders[53], "Water amount (mL)");
assert.deepEqual(
    Array.from(vm.runInContext("NUTRIENT_PRODUCT_OPTIONS", context)),
    ["MSU 13-3-15", "SuperThrive Foliage Pro"]
);
const appSheetBulkV512Headers = Array.from(
    vm.runInContext("APP_SHEET_BULK_V512_HEADERS", context)
);
assert.equal(appSheetBulkV512Headers.length, 44);
assert.deepEqual(
    appSheetBulkV512Headers.slice(6, 28),
    Array.from(
        { length: 22 },
        (_, index) => `P${String(index + 1).padStart(2, "0")} weight (g)`
    )
);
const appSheetBulkV513Headers = Array.from(
    vm.runInContext("APP_SHEET_BULK_V513_HEADERS", context)
);
assert.equal(appSheetBulkV513Headers.length, 50);
assert.deepEqual(
    appSheetBulkV513Headers.slice(6, 34),
    Array.from(
        { length: 28 },
        (_, index) => `P${String(index + 1).padStart(2, "0")} weight (g)`
    )
);
assert.deepEqual(appSheetBulkHeaders.slice(-18), [
    "Notes",
    "Created by",
    "Created at",
    "Status",
    "Status message",
    "Request count",
    "Saved count",
    "Saved at",
    "Rotation (°)",
    "Plant condition",
    "Soil moisture",
    "Pest / issue",
    "Treatment / action",
    "Nutrients used",
    "Nutrient product",
    "Nutrient amount",
    "Watering application",
    "Water amount (mL)",
]);
assert.deepEqual(
    Array.from(vm.runInContext("WATERING_APPLICATION_OPTIONS", context)),
    [
        "Flood / soak-through",
        "Thorough",
        "Partial",
        "Spot",
    ]
);
assert.deepEqual(
    Array.from(context.appSheetEventList_("Water; Weigh, Water")),
    ["Water", "Weigh"]
);
assert.equal(context.normalizeWebEntrySource_("AppSheet"), "AppSheet");
assert.equal(
    context.normalizeWebEntrySource_("Mobile bulk water"),
    "Mobile bulk water"
);
assert.equal(
    context.normalizeWebEntrySource_("Mobile bulk care"),
    "Mobile bulk care"
);
assert.throws(
    () => context.normalizeWebEntrySource_("untrusted client"),
    /Entry source/
);
assert.equal(
    context.fieldGuideUrlForRow_([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        '=HYPERLINK("https://example.test/#p01","Open")',
    ]),
    "https://example.test/#p01"
);
assert.throws(
    () => context.normalizeRequestId_("", true),
    /missing its retry key/
);
assert.equal(
    context.normalizeRequestId_("garden-1234567890", true),
    "garden-1234567890"
);
assert.equal(
    context.isGooglePhotosShareUrl_("https://" + "photos.app.goo.gl/abc123"),
    true
);
assert.equal(
    context.isGooglePhotosShareUrl_("https://example.test/photo"),
    false
);
assert.deepEqual(
    Array.from(
        context.uniqueTextValues_([
            "P01",
            "P01",
            " P02 ",
            "",
        ])
    ),
    ["P01", "P02"]
);

assert.match(source, /LockService\.getScriptLock\(\)/);
assert.doesNotMatch(source, /LockService\.getDocumentLock\(\)/);
assert.match(source, /function getWebSaveStatus\(payload\)/);
assert.match(source, /function savedRequestStatus_\(history, requestId\)/);
assert.match(source, /setFaviconUrl\(GARDEN_LOGGER\.faviconUrl\)/);
assert.match(source, /0fdb0739ffe391ade24deb6df2973a21\.png/);
assert.match(html, /id="themeToggle"/);
assert.match(html, /function safeStorageGet\(storage, key, fallback = null\)/);
assert.match(html, /function safeStorageSet\(storage, key, value\)/);
assert.match(html, /function safeStorageRemove\(storage, key\)/);
assert.match(html, /const ROUND_STATE_KEY = "gardenLoggerRoundStateV1"/);
assert.match(html, /const NUTRIENT_STATE_KEY = "gardenLoggerNutrientStateV1"/);
assert.match(html, /function reconcileSingleSave\(requestId, options = \{\}\)/);
assert.match(html, /function reconcileBulkSave\(requestId, options = \{\}\)/);
assert.match(html, /function beginSaveAttempt\(timeoutMs = SAVE_WATCHDOG_MS\)/);
assert.match(html, /state\.saveTimer = setTimeout\(\(\) => \{/);
assert.match(html, /state\.saveStartedAt = Date\.now\(\);/);
assert.match(html, /function browserIsOnline\(\)/);
assert.match(html, /const BOOTSTRAP_TIMEOUT_MS = 20000;/);
assert.match(html, /const BOOTSTRAP_AUTO_RETRIES = 1;/);
assert.match(html, /const BOOTSTRAP_CACHE_KEY = "gardenLoggerBootstrapV2";/);
assert.match(html, /const BOOTSTRAP_CACHE_MAX_AGE_MS = 6 \* 60 \* 60 \* 1000;/);
assert.match(
    html,
    /function requestBootstrap\(\{ resetRetries = false \} = \{\}\)/
);
assert.match(html, /id="retryBootstrapButton"/);
assert.match(html, /function readCachedBootstrap\(\)/);
assert.match(html, /function refreshCachedBootstrap\(\)/);
assert.match(html, /target="_top"/);
assert.match(html, /pending\.replaceable = true;/);
assert.doesNotMatch(html, /id="weightStates"/);
assert.doesNotMatch(html, /function renderWeightState\(\)/);
assert.doesNotMatch(html, /weightState:\s*state\.weightState/);
assert.match(html, /"Last completed dry"/);
assert.match(html, /plant\.dryOrLowestWeightBasis/);
assert.match(html, /plant\.dryOrLowestWeightDate/);
assert.match(html, /plant\.recommendedWaterDate/);
assert.match(html, /plant\.wateringGuidance/);
assert.match(source, /function installWateringRecommendations\(\)/);
assert.equal(vm.runInContext("BASELINE_VIEW_HEADERS.length", context), 36);
assert.equal(vm.runInContext("DASHBOARD_VIEW_HEADERS.length", context), 23);
assert.equal(vm.runInContext("DRY_DOWN_MODEL_HEADERS.length", context), 16);
assert.deepEqual(
    Array.from(vm.runInContext("BASELINE_VIEW_HEADERS.slice(-2)", context)),
    ["Recommended water date", "Watering guidance"]
);
assert.match(
    html,
    /const PHOTO_VISIBILITY_KEY = "gardenLoggerPhotosVisibleV1"/
);
assert.match(html, /id="photoVisibilityToggle"/);
assert.match(html, /state\.photosVisible && photoData\.length/);
assert.match(html, /id="plantChoiceList"/);
assert.match(html, /function plantIconName\(plant\)/);
assert.match(html, /function createPlantPortrait\(plant, className\)/);
assert.match(html, /const PLANT_ICON_REVISION = "[a-f0-9]{16}";/);
assert.match(html, /"nick2bad4u\.github\.io"/);
assert.match(html, /\.join\("\/"\)/);
assert.match(
    html,
    /const PLANT_ICON_PATH = "\/Gardening\/assets\/plant-icons\/"/
);
assert.equal(
    (html.match(/id="app-icon-plant-[a-z0-9-]+"/gu) || []).length,
    0,
    "The logger must load the small standalone plant portraits instead of inlining the complete sprite."
);
for (const [
    eventName,
    background,
    foreground,
    accent,
] of [
    [
        "Water",
        "#d9eefc",
        "#174a68",
        "#2f8fca",
    ],
    [
        "Weigh",
        "#e9e1f8",
        "#47306b",
        "#8059bd",
    ],
    [
        "Measure",
        "#dff2e4",
        "#24543a",
        "#3d9a60",
    ],
    [
        "Check",
        "#fff0c7",
        "#684b00",
        "#c58a00",
    ],
    [
        "Rotation",
        "#e3f1f1",
        "#285b5b",
        "#398d8d",
    ],
    [
        "Clean",
        "#f2f2f2",
        "#424242",
        "#6e7770",
    ],
    [
        "Prune",
        "#e8f0d9",
        "#3c5724",
        "#6d9636",
    ],
    [
        "Repot",
        "#f7e3cf",
        "#6e3d18",
        "#c97836",
    ],
    [
        "Flower",
        "#f9dcea",
        "#722a4d",
        "#c84f89",
    ],
    [
        "Photo",
        "#e1e8f7",
        "#2d4775",
        "#5879bd",
    ],
    [
        "Pest",
        "#f8d4d4",
        "#7a1d1d",
        "#c54b4b",
    ],
]) {
    assert.match(
        html,
        new RegExp(
            `\\.recent-item\\[data-event="${eventName}"\\]\\s*\\{[\\s\\S]*?--event-bg: ${background};[\\s\\S]*?--event-ink: ${foreground};[\\s\\S]*?--event-accent: ${accent};`,
            "u"
        )
    );
}
assert.match(html, /var\(--event-accent\) 10%/u);
assert.doesNotMatch(html, /var\(--event-bg\) 74%/u);
assert.match(html, /id="bulkWaterForm"/);
assert.match(html, /saveBulkCareObservation/);
assert.match(html, /id="bulkEventChips"/);
assert.match(html, /id="rotationDegrees"/);
assert.match(html, /id="bulkRotationDegrees"/);
assert.match(html, /id="nutrientsUsed"/);
assert.match(html, /id="wateringApplication"/);
assert.match(html, /id="waterAmount"/);
assert.match(html, /id="bulkWateringApplication"/);
assert.match(html, /id="bulkWaterAmount"/);
for (const selectId of ["nutrientProduct", "bulkNutrientProduct"]) {
    const selectMarkup = new RegExp(
        `<select\\s+id="${selectId}"[\\s\\S]*?<\\/select\\s*>`,
        "u"
    ).exec(html)?.[0];
    assert.ok(selectMarkup, `${selectId} must be a select element.`);
    assert.deepEqual(
        Array.from(
            selectMarkup.matchAll(/<option\s+value="([^"]*)"/gu),
            ([, value]) => value
        ),
        [
            "",
            "MSU 13-3-15",
            "SuperThrive Foliage Pro",
        ],
        `${selectId} must expose only the two current nutrient products.`
    );
}
assert.match(html, /id="potSetup"\s+type="hidden"/);
assert.match(html, /createLink\("Spreadsheet", links\.spreadsheet, "sheets"\)/);
assert.match(html, /id="app-icon-cactus"/);
assert.match(html, /id="app-icon-water"/);
assert.match(html, /id="app-icon-queue"/);
assert.match(
    html,
    /function createIcon\(iconName, className\s*=\s*"app-icon"\)/
);
assert.match(html, /const EVENT_ICON_NAMES = Object\.freeze\(\{/);
assert.doesNotMatch(html, /[☀☾✎▦💧⚖↔✓↻✂🪴✿📷⚠⋯]/u);
assert.doesNotMatch(html, /Add this logger to your phone/);
assert.doesNotMatch(html, /Permanent ID stays the same/);
assert.doesNotMatch(html, /Pot setup is not pot size/);
assert.doesNotMatch(html, /Current pot setup/);
assert.doesNotMatch(html, /potSetupDisplay/);
assert.match(
    html,
    /const productFieldId = prefix\s*\? `\$\{prefix\}NutrientProductField`\s*:\s*"nutrientProductField";/,
    "single-plant nutrient fields must use their lowercase DOM IDs"
);
assert.match(html, /id="repotSection"/);
assert.match(html, /id="photoUrl"/);
assert.match(html, /id="labelPickerMode"/);
assert.match(html, /gardenLoggerPlantPickerModeV1/);
assert.match(html, /id="recentLimit"/);
assert.match(html, /gardenLoggerRecentLimitV1/);
assert.match(html, /gardenLoggerObservationQueueV1/);
assert.match(html, /saveWebObservationBatch/);
assert.match(html, /function sendObservationQueueBatch\(retryIds = null\)/);
assert.match(html, /function applySuccessfulObservationBatch/);
assert.doesNotMatch(html, /QUEUE_CHUNK_SIZE/);
assert.match(html, /const QUEUE_EXECUTION_LIMIT_MS = 390000;/);
assert.match(html, /const QUEUE_RETRY_DELAYS_MS = \[2000, 5000, 10000\];/);
assert.match(html, /function queueStatusDescriptor\(entry\)/);
assert.match(html, /id="queueSendButton"/);
assert.match(html, /id="queueButton"[\s\S]*?Add to queue/);
assert.match(html, /id="advanceAfterQueue"/);
assert.match(html, /queue-complete/);
assert.match(html, /@media \(hover: none\) and \(pointer: coarse\)/);
assert.match(html, /function guardMobileButtonHit\(event\)/);
assert.match(
    html,
    /document\.addEventListener\("click", guardMobileButtonHit, true\)/
);
assert.match(html, /id="openGooglePhotos"/);
assert.match(
    html,
    /createLink\(\s*"History & charts",\s*plant\.historyUrl,\s*"history"\s*\)/
);
assert.match(source, /const HISTORY_DETAIL_HEADERS/);
assert.match(source, /const HISTORY_ROTATION_HEADERS/);
assert.match(source, /const HISTORY_WATER_HEADERS/);
assert.match(source, /ensureHistoryDetailColumns_\(history\)/);
assert.match(source, /ensureHistoryWaterColumns_\(history\)/);
assert.match(source, /function ensureHistoryView_\(spreadsheet\)/);
assert.match(source, /SEQUENCE\(1,\$\{remainingColumns\},2,1\)/);
assert.match(
    source,
    /updateBaselinePotSetup_\(\s*spreadsheet,\s*prepared\.observation\.plantId,\s*result\.potSetup\s*\)/,
    "Repot retries must reuse the pot setup stored in the archived row"
);
assert.match(source, /function saveWebObservationBatch\(payloads\)/);
assert.match(source, /function appendPreparedWebObservationBatch_/);
assert.match(source, /function clearUnexpectedMeasurementValidations_/);
assert.match(
    source,
    /\.clearDataValidations\(\)\s*\.setNumberFormat\("0\.##"\)/
);
assert.match(source, /function getWebBatchSaveStatus\(requests\)/);
assert.match(source, /function processAppSheetEntry\(entryId\)/);
assert.match(source, /function processQueuedAppSheetEntries\(\)/);
assert.match(
    source,
    /function processQueuedAppSheetBulkEntries_\(spreadsheet\)/
);
assert.match(source, /function installAppSheetBulkSheet\(\)/);
assert.match(source, /function migrateLegacyAppSheetBulkSheet_\(sheet\)/);
assert.match(source, /function normalizeAppSheetBulkAction_\(value\)/);
assert.match(source, /function appSheetBulkWateredPlants_\(value\)/);
assert.match(source, /function appSheetBulkSelectedPlants_\(value\)/);
assert.match(source, /`appsheet-bulk-\$\{roundId\}-\$\{plantId\}`/);
assert.match(source, /function installAppSheetQueueTrigger\(\)/);
assert.match(source, /\.timeBased\(\)\.everyMinutes\(5\)\.create\(\)/);
assert.doesNotMatch(source, /Logger 5\.8 is ready/);
assert.match(
    source,
    /function saveBulkCareObservation\(payload\)[\s\S]*?saveWebObservationBatch\(/
);
assert.match(source, /function saveBulkWaterObservation\(payload\)/);
assert.match(source, /function appSheetPayloadFromRow_\(row, requestId\)/);
assert.match(source, /entrySource:\s*"AppSheet"/);
assert.match(source, /storedStatus === "Saved"/);
assert.match(source, /`appsheet-\$\{normalizedEntryId\}`/);
assert.match(source, /function removeSelectedHistoryObservations\(\)/);
assert.match(source, /function refreshGardenWorkbook\(\)/);
assert.match(source, /function refreshGardenWorkbookPages01To10\(\)/);
assert.match(source, /function refreshGardenWorkbookPages11To20\(\)/);
assert.match(source, /function refreshGardenWorkbookPages21To30\(\)/);
assert.match(source, /function inferredWeightStatesByRow_\(historyRows\)/);
assert.match(
    source,
    /function currentSetupWeightRecordsByPlant_\(historyRows\)/
);
assert.match(source, /function plantPageSheet_\(spreadsheet, plantId\)/);
assert.match(source, /"Dry weight \(g\)"/);
assert.match(source, /"Latest weight \(lb\)"/);
assert.match(source, /"Predicted dry date"/);
assert.match(source, /WET_WEIGHT_WINDOW_DAYS = 5/u);
assert.match(source, /function GARDEN_DRY_DOWN\(history, plantIds\)/u);
assert.match(source, /function installDryDownLearning\(\)/u);
assert.match(source, /curve\.count >= 4 &&\s+curve\.span >= 3/u);
const forecastFormulaRow = Array.from(
    context.baselineViewRow_(2, { id: "P01", name: "Test plant" })
);
assert.match(forecastFormulaRow[20], /'Dry-down models'!\$E\$2:\$E\$31/u);
assert.match(forecastFormulaRow[30], /'Dry-down models'!\$G\$2:\$G\$31/u);
assert.doesNotMatch(forecastFormulaRow[30], /History!\$N\$2:\$N\$5000/u);
assert.match(source, /sheet\.setFrozenRows\(0\)/);
assert.match(source, /sheet\.setFrozenColumns\(0\)/);

const publishedHistoryDate = parseDate("8/12/2026 2:47 AM");
assert.equal(publishedHistoryDate?.getFullYear(), 2026);
assert.equal(publishedHistoryDate?.getMonth(), 7);
assert.equal(publishedHistoryDate?.getDate(), 12);
assert.equal(publishedHistoryDate?.getHours(), 2);
assert.equal(parseDate("8/12/2026 12:05 PM")?.getHours(), 12);
assert.equal(parseDate("8/12/2026 12:05 AM")?.getHours(), 0);

const canonicalPlantLabels = [
    "A1",
    "A2",
    "A3",
    "B1",
    "B2",
    "B3",
    "C1",
    "C2",
    "C3",
    "D1",
    "D2",
    "D3",
    "E1",
    "E2",
    "E3",
    "F1",
    "F2",
    "F3",
    "#1",
    "#2",
    "#3",
    "#4",
    "G2",
    "H1",
    "H2",
    "H3",
    "G1",
    "G3",
    "#5",
    "#6",
];
const naturallyOrderedPlantLabels = [
    ...canonicalPlantLabels.slice(0, 18),
    "G1",
    "G2",
    "G3",
    "H1",
    "H2",
    "H3",
    "#1",
    "#2",
    "#3",
    "#4",
    "#5",
    "#6",
];
assert.deepEqual(
    canonicalPlantLabels
        .map((label, index) => ({
            "Current pot label": label,
            "Plant ID": `P${String(index + 1).padStart(2, "0")}`,
        }))
        .sort(comparePlantsByNaturalLabel)
        .map((plant) => plant["Current pot label"]),
    naturallyOrderedPlantLabels
);

console.log("Google Sheets logger pure-function checks passed.");
