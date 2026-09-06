import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import vm from "node:vm";

import {
    comparePlantsByNaturalLabel,
    parseDate,
} from "../docs/layouts/plant-tracker-data.js";
import {
    arrayOf,
    compareText,
    hasFields,
    isNonemptyString,
    isPlantSlug,
    isRecord,
    isString,
    parseJson,
    required,
} from "./build-data.mjs";

const source = await readFile(
    new URL("google-sheets/plant-tracker.gs", import.meta.url),
    "utf8"
);
const html = await readFile(
    new URL("google-sheets/Index.html", import.meta.url),
    "utf8"
);
/** @type {Record<string, unknown>} */
const context = vm.createContext({
    console,
    encodeURIComponent,
    Map,
    Set,
    URL,
    Utilities: { getUuid: () => "test-request-id" },
});
vm.runInContext(source, context, { filename: "plant-tracker.gs" });
assert.equal(evaluateLogger("GARDEN_LOGGER.version"), "5.18.4");
const webPlantImageUrls = evaluateLogger("WEB_PLANT_IMAGE_URLS");
assert.ok(
    isImageUrls(webPlantImageUrls),
    "Logger image URLs must have the expected record shape."
);
assert.equal(Object.keys(webPlantImageUrls).length, 30);
assert.ok(
    Object.values(webPlantImageUrls).every(({ currentImageUrl }) =>
        /^https:\/\/thumb\.gyazo\.com\/thumb\/960\/[\da-f]{32}\.(?:jpg|png)$/v.test(
            currentImageUrl
        )
    ),
    "Every current P01-P30 logger photo must use a cached 960 px Gyazo thumbnail."
);
assert.match(
    required(webPlantImageUrls["P20"], "P20 image URL").currentImageUrl,
    /7954fb6f93fc71827ac45cd854eeb25a/v,
    "P20 must show the shared succulent planter."
);

assert.deepEqual(
    strings(
        loggerFunction("buildEventNamesFromList_")(
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
    strings(
        loggerFunction("buildEventNames_")("Weigh", "Wet", 420, "", "", "", "")
    ),
    ["Weigh"]
);
assert.equal(
    loggerFunction("safeSheetText_")('=IMPORTXML("x")'),
    '\'=IMPORTXML("x")'
);
assert.equal(loggerFunction("safeSheetText_")("healthy"), "healthy");
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
    batch = "",
    event = "Weigh",
    observedAt,
    plantId,
    status = "",
    weight = "",
}) => {
    /** @type {(string | number)[]} */
    const row = Array.from({ length: 42 }, () => "");
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
const dryOrLowestWeights = loggerFunction("dryOrLowestWeightsFromRows_")([
    checkWeightRow({
        batch: "wet-1",
        observedAt: "2026-08-01T12:00:00Z",
        plantId: "P01",
        weight: 320,
    }),
    checkWeightRow({
        batch: "wet-1",
        event: "Water",
        observedAt: "2026-08-01T12:00:00Z",
        plantId: "P01",
    }),
    checkWeightRow({
        observedAt: "2026-08-02T12:00:00Z",
        plantId: "P01",
        weight: 280,
    }),
    checkWeightRow({
        batch: "wet-2",
        observedAt: "2026-08-03T12:00:00Z",
        plantId: "P01",
        weight: 330,
    }),
    checkWeightRow({
        batch: "wet-2",
        event: "Water",
        observedAt: "2026-08-03T12:00:00Z",
        plantId: "P01",
    }),
    checkWeightRow({
        observedAt: "2026-08-03T12:00:00Z",
        plantId: "P02",
        weight: 410,
    }),
    checkWeightRow({
        observedAt: "2026-08-04T12:00:00Z",
        plantId: "P02",
        weight: 390,
    }),
]);
assert.ok(isUnknownMap(dryOrLowestWeights));
assert.deepEqual(structuredClone(dryOrLowestWeights.get("P01")), {
    basis: "Completed cycle",
    observedAt: "2026-08-02T12:00:00Z",
    weight: 280,
});
assert.equal(dryOrLowestWeights.has("P02"), false);
const appSheetEntryHeaders = strings(evaluateLogger("APP_SHEET_ENTRY_HEADERS"));
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
const appSheetBulkHeaders = strings(evaluateLogger("APP_SHEET_BULK_HEADERS"));
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
assert.deepEqual(strings(evaluateLogger("NUTRIENT_PRODUCT_OPTIONS")), [
    "MSU 13-3-15",
    "SuperThrive Foliage Pro",
]);
const appSheetBulkV512Headers = strings(
    evaluateLogger("APP_SHEET_BULK_V512_HEADERS")
);
assert.equal(appSheetBulkV512Headers.length, 44);
assert.deepEqual(
    appSheetBulkV512Headers.slice(6, 28),
    Array.from(
        { length: 22 },
        (_, index) => `P${String(index + 1).padStart(2, "0")} weight (g)`
    )
);
const appSheetBulkV513Headers = strings(
    evaluateLogger("APP_SHEET_BULK_V513_HEADERS")
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
assert.deepEqual(strings(evaluateLogger("WATERING_APPLICATION_OPTIONS")), [
    "Flood / soak-through",
    "Thorough",
    "Partial",
    "Spot",
]);
assert.deepEqual(
    strings(loggerFunction("appSheetEventList_")("Water; Weigh, Water")),
    ["Water", "Weigh"]
);
assert.equal(
    loggerFunction("normalizeWebEntrySource_")("AppSheet"),
    "AppSheet"
);
assert.equal(
    loggerFunction("normalizeWebEntrySource_")("Mobile bulk water"),
    "Mobile bulk water"
);
assert.equal(
    loggerFunction("normalizeWebEntrySource_")("Mobile bulk care"),
    "Mobile bulk care"
);
assert.throws(
    () => loggerFunction("normalizeWebEntrySource_")("untrusted client"),
    /Entry source/v
);
assert.equal(
    loggerFunction("fieldGuideUrlForRow_")([
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
    () => loggerFunction("normalizeRequestId_")("", true),
    /missing its retry key/v
);
assert.equal(
    loggerFunction("normalizeRequestId_")("garden-1234567890", true),
    "garden-1234567890"
);
assert.equal(
    loggerFunction("isGooglePhotosShareUrl_")(
        "https://photos.app.goo.gl/abc123"
    ),
    true
);
assert.equal(
    loggerFunction("isGooglePhotosShareUrl_")("https://example.test/photo"),
    false
);
assert.deepEqual(
    strings(
        loggerFunction("uniqueTextValues_")([
            "P01",
            "P01",
            " P02 ",
            "",
        ])
    ),
    ["P01", "P02"]
);

assert.match(source, /LockService\.getScriptLock\(\)/v);
assert.doesNotMatch(source, /LockService\.getDocumentLock\(\)/v);
assert.match(source, /function getWebSaveStatus\(payload\)/v);
assert.match(source, /function savedRequestStatus_\(history, requestId\)/v);
assert.match(source, /setFaviconUrl\(GARDEN_LOGGER\.faviconUrl\)/v);
assert.match(source, /0fdb0739ffe391ade24deb6df2973a21\.png/v);
assert.match(html, /id="themeToggle"/v);
assert.match(html, /function safeStorageGet\(storage, key, fallback = null\)/v);
assert.match(html, /function safeStorageSet\(storage, key, value\)/v);
assert.match(html, /function safeStorageRemove\(storage, key\)/v);
assert.match(html, /const ROUND_STATE_KEY = "gardenLoggerRoundStateV1"/v);
assert.match(html, /const NUTRIENT_STATE_KEY = "gardenLoggerNutrientStateV1"/v);
assert.match(
    html,
    /function reconcileSingleSave\(requestId, options = \{\}\)/v
);
assert.match(html, /function reconcileBulkSave\(requestId, options = \{\}\)/v);
assert.match(
    html,
    /function beginSaveAttempt\(timeoutMs = SAVE_WATCHDOG_MS\)/v
);
assert.match(html, /state\.saveTimer = setTimeout\(\(\) => \{/v);
assert.match(html, /state\.saveStartedAt = Date\.now\(\);/v);
assert.match(html, /function browserIsOnline\(\)/v);
assert.match(html, /const BOOTSTRAP_TIMEOUT_MS = 20000;/v);
assert.match(html, /const BOOTSTRAP_AUTO_RETRIES = 1;/v);
assert.match(html, /const BOOTSTRAP_CACHE_KEY = "gardenLoggerBootstrapV2";/v);
assert.match(
    html,
    /const BOOTSTRAP_CACHE_MAX_AGE_MS = 6 \* 60 \* 60 \* 1000;/v
);
assert.match(
    html,
    /function requestBootstrap\(\{ resetRetries = false \} = \{\}\)/v
);
assert.match(html, /id="retryBootstrapButton"/v);
assert.match(html, /function readCachedBootstrap\(\)/v);
assert.match(
    html,
    /function refreshCachedBootstrap\(\{ updateHistory = true \} = \{\}\)/v
);
assert.match(html, /target="_top"/v);
assert.match(html, /pending\.replaceable = true;/v);
assert.doesNotMatch(html, /id="weightStates"/v);
assert.doesNotMatch(html, /function renderWeightState\(\)/v);
assert.doesNotMatch(html, /weightState:\s*state\.weightState/v);
assert.match(html, /"Last completed dry"/v);
assert.match(html, /plant\.dryOrLowestWeightBasis/v);
assert.match(html, /plant\.dryOrLowestWeightDate/v);
assert.match(html, /plant\.recommendedWaterDate/v);
assert.match(html, /plant\.wateringGuidance/v);
assert.match(source, /function installWateringRecommendations\(\)/v);
assert.equal(vm.runInContext("BASELINE_VIEW_HEADERS.length", context), 36);
assert.equal(vm.runInContext("DASHBOARD_VIEW_HEADERS.length", context), 24);
assert.equal(
    evaluateLogger("DASHBOARD_VIEW_HEADERS.at(-1)"),
    "Weight measurements"
);
assert.match(source, /function installDashboardWeightCounts\(\)/v);
assert.equal(vm.runInContext("DRY_DOWN_MODEL_HEADERS.length", context), 16);
assert.deepEqual(strings(evaluateLogger("BASELINE_VIEW_HEADERS.slice(-2)")), [
    "Recommended water date",
    "Watering guidance",
]);
assert.match(
    html,
    /const PHOTO_VISIBILITY_KEY = "gardenLoggerPhotosVisibleV1"/v
);
assert.match(html, /id="photoVisibilityToggle"/v);
assert.match(html, /state\.photosVisible && photoData\.length/v);
assert.match(html, /id="plantChoiceList"/v);
assert.match(html, /function plantIconName\(plant\)/v);
assert.match(html, /function createPlantPortrait\(plant, className\)/v);
assert.match(html, /const PLANT_ICON_REVISION = "[0-9a-f]{16}";/v);
const appSheetPortraits = parseJson(
    await readFile(
        new URL("google-sheets/appsheet-plant-portraits.json", import.meta.url),
        "utf8"
    ),
    isAppSheetPortraits,
    "AppSheet portrait manifest"
);
const appSheetImageExpression = await readFile(
    new URL("google-sheets/appsheet-plant-portrait.txt", import.meta.url),
    "utf8"
);
const appSheetBulkValidation = await readFile(
    new URL("google-sheets/appsheet-bulk-validation.txt", import.meta.url),
    "utf8"
);
assert.equal(
    appSheetPortraits.revision,
    /const PLANT_ICON_REVISION = "(?<revision>[0-9a-f]{16})";/v.exec(html)
        ?.groups?.["revision"],
    "Publish the current portrait revision to AppSheet as well as the logger."
);
assert.equal(
    appSheetPortraits.folder,
    `GardenPlantPortraits-${appSheetPortraits.revision}`
);
assert.ok(appSheetImageExpression.includes(`"${appSheetPortraits.folder}/"`));
assert.deepEqual(
    appSheetPortraits.portraits.map(({ id }) => id),
    Object.keys(webPlantImageUrls).toSorted(compareText),
    "Every current plant must have an AppSheet portrait."
);
assert.deepEqual(
    Array.from(
        appSheetImageExpression.matchAll(/"(?<trackerId>P\d{2})"/gv),
        ([, id]) => id
    ),
    appSheetPortraits.portraits.map(({ id }) => id)
);
assert.deepEqual(
    Array.from(
        appSheetBulkValidation.matchAll(
            /\[(?<label>P\d{2} weight \(g\))\] > 0/gv
        ),
        ([, header]) => header
    ),
    appSheetBulkHeaders.filter((header) =>
        /^P\d{2} weight \(g\)$/v.test(header)
    ),
    "AppSheet bulk validation must include every supported plant weight."
);
await Promise.all(
    appSheetPortraits.portraits.map(async ({ slug }) => {
        assert.ok(isPlantSlug(slug), `Unsafe plant portrait slug: ${slug}`);
        const fileStats1 = await stat(
            new URL(`../assets/plant-icons/${slug}.svg`, import.meta.url)
        );
        assert.ok(
            fileStats1.isFile(),
            `Missing AppSheet portrait source: ${slug}`
        );
    })
);
assert.match(html, /"nick2bad4u\.github\.io"/v);
assert.match(html, /\.join\("\/"\)/v);
assert.match(
    html,
    /const PLANT_ICON_PATH = "\/Gardening\/assets\/plant-icons\/"/v
);
assert.equal(
    (html.match(/id="app-icon-plant-[\-0-9a-z]+"/gv) ?? []).length,
    0,
    "The logger must load the small standalone plant portraits instead of inlining the complete sprite."
);
for (const [
    eventName,
    background,
    foreground,
    accent,
] of /** @type {const} */ ([
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
])) {
    const styles = required(
        /<style>(?<css>[\s\S]*?)<\/style>/v.exec(html)?.groups?.["css"],
        "logger CSS"
    );
    const recentItemStyles = required(
        cssBlock(styles, ".recent-item"),
        "recent item CSS"
    );
    const eventStyles = required(
        cssBlock(recentItemStyles, `&[data-event="${eventName}"]`) ??
            cssBlock(styles, `.recent-item[data-event="${eventName}"]`),
        `recent ${eventName} CSS`
    );
    for (const [property, value] of /** @type {const} */ ([
        ["--event-bg", background],
        ["--event-ink", foreground],
        ["--event-accent", accent],
    ])) {
        assert.ok(
            eventStyles.includes(`${property}: ${value};`),
            `${eventName} must retain ${property}: ${value}.`
        );
    }
}
assert.match(html, /var\(--event-accent\) 10%/v);
assert.doesNotMatch(html, /var\(--event-bg\) 74%/v);
assert.match(html, /id="bulkWaterForm"/v);
assert.match(html, /saveBulkCareObservation/v);
assert.match(html, /id="bulkEventChips"/v);
assert.match(html, /id="rotationDegrees"/v);
assert.match(html, /id="bulkRotationDegrees"/v);
assert.match(html, /id="nutrientsUsed"/v);
assert.match(html, /id="wateringApplication"/v);
assert.match(html, /id="waterAmount"/v);
assert.match(html, /id="bulkWateringApplication"/v);
assert.match(html, /id="bulkWaterAmount"/v);
for (const selectId of ["nutrientProduct", "bulkNutrientProduct"]) {
    const pattern2 = new RegExp(
        String.raw`<select\s+id="${selectId}"[\s\S]*?<\/select\s*>`,
        "u"
    );
    const selectMarkup = pattern2.exec(html)?.[0];
    assert.ok(
        isNonemptyString(selectMarkup),
        `${selectId} must be a select element.`
    );
    assert.deepEqual(
        Array.from(
            selectMarkup.matchAll(/<option\s+value="(?<value>[^"]*)"/gv),
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
assert.match(html, /id="potSetup"\s+type="hidden"/v);
assert.match(
    html,
    /createLink\("Spreadsheet", links\.spreadsheet, "sheets"\)/v
);
assert.match(html, /id="app-icon-cactus"/v);
assert.match(html, /id="app-icon-water"/v);
assert.match(html, /id="app-icon-queue"/v);
assert.match(
    html,
    /function createIcon\(iconName, className\s*=\s*"app-icon"\)/v
);
assert.match(html, /const EVENT_ICON_NAMES = Object\.freeze\(\{/v);
assert.doesNotMatch(html, /[↔↻⋯▦☀☾⚖⚠✂✎✓✿💧📷🪴]/v);
assert.doesNotMatch(html, /Add this logger to your phone/v);
assert.doesNotMatch(html, /Permanent ID stays the same/v);
assert.doesNotMatch(html, /Pot setup is not pot size/v);
assert.doesNotMatch(html, /Current pot setup/v);
assert.doesNotMatch(html, /potSetupDisplay/v);
assert.match(
    html,
    /const productFieldId = prefix\s*\? `\$\{prefix\}NutrientProductField`\s*:\s*"nutrientProductField";/v,
    "single-plant nutrient fields must use their lowercase DOM IDs"
);
assert.match(html, /id="repotSection"/v);
assert.match(html, /id="photoUrl"/v);
assert.match(html, /id="labelPickerMode"/v);
assert.match(html, /gardenLoggerPlantPickerModeV1/v);
assert.match(html, /id="recentLimit"/v);
assert.match(html, /gardenLoggerRecentLimitV1/v);
assert.match(html, /gardenLoggerObservationQueueV1/v);
assert.match(html, /saveWebObservationBatch/v);
assert.match(html, /function sendObservationQueueBatch\(retryIds = null\)/v);
assert.match(html, /function applySuccessfulObservationBatch/v);
assert.doesNotMatch(html, /QUEUE_CHUNK_SIZE/v);
assert.match(html, /const QUEUE_EXECUTION_LIMIT_MS = 390000;/v);
assert.match(html, /const QUEUE_RETRY_DELAYS_MS = \[2000, 5000, 10000\];/v);
assert.match(html, /function queueStatusDescriptor\(entry\)/v);
assert.match(html, /id="queueSendButton"/v);
assert.match(html, /id="queueButton"[\s\S]*?Add to queue/v);
assert.match(html, /id="advanceAfterQueue"/v);
assert.match(html, /queue-complete/v);
assert.match(html, /@media \(hover: none\) and \(pointer: coarse\)/v);
assert.match(html, /function guardMobileButtonHit\(event\)/v);
assert.match(
    html,
    /document\.addEventListener\("click", guardMobileButtonHit, true\)/v
);
assert.match(html, /id="openGooglePhotos"/v);
assert.match(
    html,
    /createLink\(\s*"History & charts",\s*plant\.historyUrl,\s*"history"\s*\)/v
);
assert.match(source, /const HISTORY_DETAIL_HEADERS/v);
assert.match(source, /const HISTORY_ROTATION_HEADERS/v);
assert.match(source, /const HISTORY_WATER_HEADERS/v);
assert.match(source, /ensureHistoryDetailColumns_\(history\)/v);
assert.match(source, /ensureHistoryWaterColumns_\(history\)/v);
assert.match(source, /function ensureHistoryView_\(spreadsheet\)/v);
assert.match(source, /SEQUENCE\(1,\$\{remainingColumns\},2,1\)/v);
assert.match(
    source,
    /updateBaselinePotSetup_\(\s*spreadsheet,\s*prepared\.observation\.plantId,\s*result\.potSetup\s*\)/v,
    "Repot retries must reuse the pot setup stored in the archived row"
);
assert.match(source, /function saveWebObservationBatch\(payloads\)/v);
assert.match(source, /function appendPreparedWebObservationBatch_/v);
assert.match(source, /function clearUnexpectedMeasurementValidations_/v);
assert.match(
    source,
    /\.clearDataValidations\(\)\s*\.setNumberFormat\("0\.##"\)/v
);
assert.match(source, /function getWebBatchSaveStatus\(requests\)/v);
assert.match(source, /function processAppSheetEntry\(entryId\)/v);
assert.match(source, /function processQueuedAppSheetEntries\(\)/v);
assert.match(
    source,
    /function processQueuedAppSheetBulkEntries_\(spreadsheet\)/v
);
assert.match(source, /function installAppSheetBulkSheet\(\)/v);
assert.match(source, /function migrateLegacyAppSheetBulkSheet_\(sheet\)/v);
assert.match(source, /function normalizeAppSheetBulkAction_\(value\)/v);
assert.match(source, /function appSheetBulkWateredPlants_\(value\)/v);
assert.match(source, /function appSheetBulkSelectedPlants_\(value\)/v);
assert.match(source, /`appsheet-bulk-\$\{roundId\}-\$\{plantId\}`/v);
assert.match(source, /function installAppSheetQueueTrigger\(\)/v);
assert.match(source, /\.timeBased\(\)\.everyMinutes\(5\)\.create\(\)/v);
assert.doesNotMatch(source, /Logger 5\.8 is ready/v);
assert.match(
    source,
    /function saveBulkCareObservation\(payload\)[\s\S]*?saveWebObservationBatch\(/v
);
assert.match(source, /function saveBulkWaterObservation\(payload\)/v);
assert.match(source, /function appSheetPayloadFromRow_\(row, requestId\)/v);
assert.match(source, /entrySource:\s*"AppSheet"/v);
assert.match(source, /storedStatus === "Saved"/v);
assert.match(source, /`appsheet-\$\{normalizedEntryId\}`/v);
assert.match(source, /function removeSelectedHistoryObservations\(\)/v);
assert.match(source, /function refreshGardenWorkbook\(\)/v);
assert.match(source, /function refreshGardenWorkbookPages01To10\(\)/v);
assert.match(source, /function refreshGardenWorkbookPages11To20\(\)/v);
assert.match(source, /function refreshGardenWorkbookPages21To30\(\)/v);
assert.match(source, /function inferredWeightStatesByRow_\(historyRows\)/v);
assert.match(
    source,
    /function currentSetupWeightRecordsByPlant_\(historyRows\)/v
);
assert.match(source, /function plantPageSheet_\(spreadsheet, plantId\)/v);
assert.match(source, /"Dry weight \(g\)"/v);
assert.match(source, /"Latest weight \(lb\)"/v);
assert.match(source, /"Predicted dry date"/v);
assert.match(source, /WET_WEIGHT_WINDOW_DAYS = 5/v);
assert.match(source, /function GARDEN_DRY_DOWN\(history, plantIds\)/v);
assert.match(source, /function installDryDownLearning\(\)/v);
assert.match(source, /curve\.count >= 4 &&\s+curve\.span >= 3/v);
const forecastFormulaRow = strings(
    loggerFunction("baselineViewRow_")(2, { id: "P01", name: "Test plant" })
);
assert.match(
    required(forecastFormulaRow[20], "forecast formula"),
    /'Dry-down models'!\$E\$2:\$E\$31/v
);
assert.match(
    required(forecastFormulaRow[30], "forecast formula"),
    /'Dry-down models'!\$G\$2:\$G\$31/v
);
assert.doesNotMatch(
    required(forecastFormulaRow[30], "forecast formula"),
    /History!\$N\$2:\$N\$5000/v
);
assert.match(source, /sheet\.setFrozenRows\(0\)/v);
assert.match(source, /sheet\.setFrozenColumns\(0\)/v);

const publishedHistoryDate = parseDate("8/12/2026 2:47 AM");
assert.ok(publishedHistoryDate instanceof Date);
assert.equal(publishedHistoryDate.getFullYear(), 2026);
assert.equal(publishedHistoryDate.getMonth(), 7);
assert.equal(publishedHistoryDate.getDate(), 12);
assert.equal(publishedHistoryDate.getHours(), 2);
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
        .toSorted(comparePlantsByNaturalLabel)
        .map((plant) => plant["Current pot label"]),
    naturallyOrderedPlantLabels
);

process.stdout.write("Google Sheets logger pure-function checks passed.\n");

/**
 * Read one checked-in CSS rule, keeping native nested blocks inside its body.
 *
 * @param {string} css
 * @param {string} selector
 */
function cssBlock(css, selector) {
    const start = css.indexOf(selector);
    if (start === -1) return undefined;
    const opening = css.indexOf("{", start + selector.length);
    if (opening === -1 || css.slice(start, opening).trim() !== selector)
        return undefined;
    let depth = 1;
    let quote = "";
    for (let index = opening + 1; index < css.length; index += 1) {
        const character = css[index];
        if (quote) {
            if (character === "\\") index += 1;
            quote = character === quote ? "" : quote;
            continue;
        }
        if (character === '"' || character === "'") quote = character;
        depth += character === "{" ? 1 : 0;
        depth -= character === "}" ? 1 : 0;
        if (depth === 0) return css.slice(opening + 1, index);
    }
    throw new Error(`Unclosed CSS rule for ${selector}.`);
}

/** @param {string} expression @returns {unknown} */
function evaluateLogger(expression) {
    return vm.runInContext(expression, context);
}

/**
 * @param {unknown} value @returns {value is {revision: string, folder: string,
 *   portraits: {id: string, slug: string}[]}}
 */
function isAppSheetPortraits(value) {
    return hasFields(value, {
        folder: isString,
        portraits: arrayOf(isPortrait),
        revision: isString,
    });
}

/** @param {unknown} value @returns {value is (...args: unknown[]) => unknown} */
function isCallable(value) {
    return typeof value === "function";
}

/**
 * @param {unknown} value @returns {value is Record<string, {currentImageUrl:
 *   string}>}
 */
function isImageUrls(value) {
    return (
        isRecord(value) &&
        Object.values(value).every((entry) =>
            hasFields(entry, { currentImageUrl: isString })
        )
    );
}

/** @param {unknown} value @returns {value is {id: string, slug: string}} */
function isPortrait(value) {
    return hasFields(value, { id: isString, slug: isString });
}

/** @param {unknown} value @returns {value is Map<unknown, unknown>} */
function isUnknownMap(value) {
    return value instanceof Map;
}

/** @param {string} name */
function loggerFunction(name) {
    const callable = context[name];
    assert.ok(isCallable(callable), `Missing logger function ${name}.`);
    return callable;
}

/** @param {unknown} value */
function strings(value) {
    assert.ok(arrayOf(isString)(value), "Expected logger string array.");
    return [...value];
}
