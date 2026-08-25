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
const { parseDate } = await import(
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
    ["Weigh", "Water"]
);
assert.equal(context.safeSheetText_('=IMPORTXML("x")'), '\'=IMPORTXML("x")');
assert.equal(context.safeSheetText_("healthy"), "healthy");
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
]);
const appSheetBulkHeaders = Array.from(
    vm.runInContext("APP_SHEET_BULK_HEADERS", context)
);
assert.equal(appSheetBulkHeaders.length, 34);
assert.deepEqual(appSheetBulkHeaders.slice(0, 4), [
    "Round ID",
    "Started at",
    "Observed at",
    "Weight state",
]);
assert.deepEqual(
    appSheetBulkHeaders.slice(4, 26),
    Array.from(
        { length: 22 },
        (_, index) => `P${String(index + 1).padStart(2, "0")} weight (g)`
    )
);
assert.deepEqual(appSheetBulkHeaders.slice(-8), [
    "Notes",
    "Created by",
    "Created at",
    "Status",
    "Status message",
    "Request count",
    "Saved count",
    "Saved at",
]);
assert.deepEqual(
    Array.from(context.appSheetEventList_("Water; Weigh, Water")),
    ["Water", "Weigh"]
);
assert.equal(context.normalizeWebEntrySource_("AppSheet"), "AppSheet");
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
assert.match(html, /const ROUND_STATE_KEY = "gardenLoggerRoundStateV1"/);
assert.match(html, /function reconcileSingleSave\(requestId, options = \{\}\)/);
assert.match(html, /function reconcileBulkSave\(requestId, options = \{\}\)/);
assert.match(html, /function beginSaveAttempt\(timeoutMs = SAVE_WATCHDOG_MS\)/);
assert.match(html, /state\.saveTimer = setTimeout\(\(\) => \{/);
assert.match(html, /state\.saveStartedAt = Date\.now\(\);/);
assert.match(html, /function browserIsOnline\(\)/);
assert.match(html, /pending\.replaceable = true;/);
assert.match(html, /function renderWeightState\(\)/);
assert.match(html, /renderWeightState\(\);\s*updateConditionalFields\(\);/);
assert.doesNotMatch(
    html,
    /if \(!keepEvents\) state\.weightState = "";/,
    "Dry/Wet/Routine must survive confirmed round saves"
);
assert.match(html, /weightState:\s*"Routine"/);
assert.match(html, /id="bulkWaterForm"/);
assert.match(html, /saveBulkWaterObservation/);
assert.match(html, /id="nutrientsUsed"/);
assert.match(html, /id="potSetup"\s+type="hidden"/);
assert.match(html, /createLink\("▤ Spreadsheet", links\.spreadsheet\)/);
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
assert.match(html, /id="queueButton"[\s\S]*?>\s*Add to queue\s*</);
assert.match(html, /id="advanceAfterQueue"/);
assert.match(html, /queue-complete/);
assert.match(html, /@media \(hover: none\) and \(pointer: coarse\)/);
assert.match(html, /function guardMobileButtonHit\(event\)/);
assert.match(
    html,
    /document\.addEventListener\("click", guardMobileButtonHit, true\)/
);
assert.match(html, /id="openGooglePhotos"/);
assert.match(html, /createLink\("History & charts", plant\.historyUrl\)/);
assert.match(source, /const HISTORY_DETAIL_HEADERS/);
assert.match(source, /ensureHistoryDetailColumns_\(history\)/);
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
assert.match(source, /`appsheet-bulk-\$\{roundId\}-\$\{plantId\}`/);
assert.match(source, /function installAppSheetQueueTrigger\(\)/);
assert.match(source, /\.timeBased\(\)\.everyMinutes\(1\)\.create\(\)/);
assert.match(source, /function appSheetPayloadFromRow_\(row, requestId\)/);
assert.match(source, /entrySource:\s*"AppSheet"/);
assert.match(source, /storedStatus === "Saved"/);
assert.match(source, /`appsheet-\$\{normalizedEntryId\}`/);
assert.match(source, /function removeSelectedHistoryObservations\(\)/);

const publishedHistoryDate = parseDate("8/12/2026 2:47 AM");
assert.equal(publishedHistoryDate?.getFullYear(), 2026);
assert.equal(publishedHistoryDate?.getMonth(), 7);
assert.equal(publishedHistoryDate?.getDate(), 12);
assert.equal(publishedHistoryDate?.getHours(), 2);
assert.equal(parseDate("8/12/2026 12:05 PM")?.getHours(), 12);
assert.equal(parseDate("8/12/2026 12:05 AM")?.getHours(), 0);

console.log("Google Sheets logger pure-function checks passed.");
