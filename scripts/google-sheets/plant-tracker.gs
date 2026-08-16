/**
 * Bound Google Apps Script for the Garden Plant Tracker workbook.
 *
 * The mobile web app and Quick log tab are input surfaces. Each save archives
 * one or more event-specific rows in History without overwriting older data.
 */

const GARDEN_LOGGER = Object.freeze({
    version: "5.2.0",
    spreadsheetId: "1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0",
    quickLogSheet: "Quick log",
    historySheet: "History",
    plantTrackerSheet: "Plant tracker",
    baselinesSheet: "Baselines",
    headerRow: 4,
    bulkControlRow: 3,
    firstInputRow: 5,
    saveColumn: 3,
    dateColumn: 4,
    firstEntryColumn: 5,
    lastEntryColumn: 11,
    bulkEventColumn: 2,
    eventColumn: 5,
    weightStateColumn: 6,
    weightColumn: 7,
    heightColumn: 8,
    widthColumn: 9,
    fieldGuideColumn: 14,
    currentLabelColumn: 15,
    historyColumns: 12,
    requestIdColumn: 16,
    requestIdHeader: "Request ID",
    historyDetailStartColumn: 17,
    historyDetailColumns: 10,
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

const WEB_EVENT_OPTIONS = Object.freeze([
    "Water",
    "Weigh",
    "Measure",
    "Check",
    "Repot",
    "Flower",
    "Photo",
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
    "Height (cm)",
    "Width (cm)",
    "Condition / soil",
    "Notes",
    "Pot setup",
]);

const HISTORY_HEADERS = Object.freeze([
    "Date",
    "Plant ID",
    "Event",
    "Weight state",
    "Weight (g)",
    "Height (cm)",
    "Width (cm)",
    "Condition / soil",
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

const NUTRIENT_OPTIONS = Object.freeze(["Yes", "No"]);

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
    P14: "small 4 in",
    P15: "4 in",
    P16: "4 in",
    P17: "small 3 in",
    P18: "4 in",
    P21: "6 in",
    P22: "5 in",
});

function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu("Garden logger")
        .addItem("Open mobile entry", "openMobileEntry")
        .addItem("Verify logger", "installGardenLogger")
        .addSeparator()
        .addItem("Open Quick log", "openQuickLog")
        .addItem("Open History", "openHistory")
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
    const trackerRowCount = Math.max(0, tracker.getLastRow() - 1);
    const trackerRange = trackerRowCount
        ? tracker.getRange(
              2,
              1,
              trackerRowCount,
              GARDEN_LOGGER.currentLabelColumn
          )
        : null;
    const trackerValues = trackerRange ? trackerRange.getValues() : [];
    const trackerFormulas = trackerRange ? trackerRange.getFormulas() : [];
    const baselineRowCount = Math.max(0, baselines.getLastRow() - 1);
    const baselineValues = baselineRowCount
        ? baselines.getRange(2, 1, baselineRowCount, 3).getValues()
        : [];
    assertUniqueIdsInRows_(baselineValues, "Baselines");
    const potSetupByPlant = new Map(
        baselineValues.map(([plantId, , potSetup]) => [
            cleanText_(plantId),
            potSetup || 1,
        ])
    );
    const potSizeByPlant = latestPotSizesByPlant_(spreadsheet);
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
            return {
                id: cleanText_(plantId),
                name: cleanText_(commonName),
                scientificName: cleanText_(scientificName),
                label: cleanText_(label),
                potSetup: positiveInteger_(
                    potSetupByPlant.get(cleanText_(plantId)) || 1,
                    "Pot setup"
                ),
                currentPotSize:
                    potSizeByPlant.get(cleanText_(plantId)) || "Not logged",
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
                fieldGuideUrl,
                historyUrl: `${GARDEN_LOGGER.historyUrl}?id=${encodeURIComponent(cleanText_(plantId))}`,
            };
        });
    assertUniquePlantIds_(plants);

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
        recent: getRecentObservations_(spreadsheet, timeZone, 10),
    };
}

function saveWebObservation(payload) {
    const spreadsheet = getGardenSpreadsheet_();
    const plantId = cleanText_(payload && payload.plantId);
    const plant = plantRecordForId_(spreadsheet, plantId);
    if (!plant) throw new Error("Choose a valid plant.");

    const requestedEvents = Array.isArray(payload.events)
        ? WEB_EVENT_OPTIONS.filter((eventName) =>
              payload.events.includes(eventName)
          )
        : [];
    const weight = optionalPositiveNumber_(payload.weight, "Weight");
    const height = optionalPositiveNumber_(payload.height, "Height");
    const width = optionalPositiveNumber_(payload.width, "Width");
    const condition = cleanText_(payload.condition);
    const notes = cleanText_(payload.notes);
    let weightState = cleanText_(payload.weightState);

    if (weightState && !WEIGHT_STATE_OPTIONS.includes(weightState)) {
        throw new Error("Weight state must be Dry, Wet, or Routine.");
    }
    if (weight === "") weightState = "";
    if (weight !== "" && !weightState) weightState = "Routine";

    const eventNames = buildEventNamesFromList_(
        requestedEvents,
        weightState,
        weight,
        height,
        width,
        condition,
        notes
    );
    if (eventNames.includes("Weigh") && weight === "") {
        throw new Error("Enter a weight for the Weigh event.");
    }
    if (eventNames.includes("Measure") && height === "" && width === "") {
        throw new Error("Enter a height or width for the Measure event.");
    }
    const details = eventDetailsFromPayload_(payload, eventNames, plant);

    const requestId = normalizeRequestId_(payload && payload.requestId, true);
    const observationDate = normalizeDate_(payload.observedAt);
    const potSetup = eventNames.includes("Repot")
        ? plant.potSetup + 1
        : plant.potSetup;
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(GARDEN_LOGGER.lockTimeoutMs)) {
        throw new Error(
            "Another reading is finishing. Your entry is still safe on this screen; wait a few seconds and tap Save again."
        );
    }

    let result;
    try {
        result = appendObservation_(spreadsheet, {
            plantId,
            eventNames,
            observationDate,
            weightState,
            weight,
            height,
            width,
            condition,
            notes,
            potSetup,
            currentLabel: plant.label,
            requestId,
            details,
        });
        if (eventNames.includes("Repot")) {
            updateBaselinePotSetup_(spreadsheet, plantId, result.potSetup);
        }
    } finally {
        lock.releaseLock();
    }

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

function saveBulkWaterObservation(payload) {
    const spreadsheet = getGardenSpreadsheet_();
    const plantIds = uniqueTextValues_(
        Array.isArray(payload && payload.plantIds) ? payload.plantIds : []
    );
    if (!plantIds.length)
        throw new Error("Choose at least one plant to water.");

    const plants = plantIds.map((plantId) => {
        const plant = plantRecordForId_(spreadsheet, plantId);
        if (!plant) throw new Error(`Plant ID ${plantId} is not valid.`);
        return plant;
    });
    const details = eventDetailsFromPayload_(payload, ["Water"], null);
    const notes = cleanText_(payload && payload.notes);
    const observationDate = normalizeDate_(payload && payload.observedAt);
    const baseRequestId = normalizeRequestId_(
        payload && payload.requestId,
        true
    );
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(GARDEN_LOGGER.lockTimeoutMs)) {
        throw new Error(
            "Another reading is finishing. The watering round remains on this screen; wait a few seconds and save again."
        );
    }

    const results = [];
    try {
        plants.forEach((plant) => {
            const result = appendObservation_(spreadsheet, {
                plantId: plant.id,
                eventNames: ["Water"],
                observationDate,
                weightState: "",
                weight: "",
                height: "",
                width: "",
                condition: "",
                notes,
                potSetup: plant.potSetup,
                currentLabel: plant.label,
                requestId: `${baseRequestId.slice(0, 88)}-${plant.id}`,
                details,
            });
            results.push(result);
        });
    } finally {
        lock.releaseLock();
    }

    const duplicates = results.filter((result) => result.duplicate).length;
    return {
        ok: true,
        plantCount: plants.length,
        duplicateCount: duplicates,
        message:
            duplicates === plants.length
                ? `This ${plants.length}-plant watering round was already saved. No duplicates were added.`
                : `Water saved for ${plants.length} plant${plants.length === 1 ? "" : "s"}.`,
    };
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
    const state =
        savedCount === requestIds.length
            ? "saved"
            : savedCount > 0 ||
                requests.some((request) => request.state === "incomplete")
              ? "partial"
              : "missing";

    return {
        state,
        requestId,
        expectedCount: requestIds.length,
        savedCount,
        message:
            state === "saved"
                ? "The entry is already in History."
                : state === "partial"
                  ? "Part of this request reached History. Retry with the same entry to finish it safely."
                  : "This request is not in History yet. Retry with the same entry to save it safely.",
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
        lock.releaseLock();
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
    history.hideColumns(GARDEN_LOGGER.requestIdColumn);

    PropertiesService.getDocumentProperties().setProperties({
        gardenLoggerVersion: GARDEN_LOGGER.version,
        gardenLoggerInstalledAt: new Date().toISOString(),
    });

    quickLog
        .getRange("E4")
        .setNote(
            "Optional main event. Wet weight state infers Water; weight infers Weigh; height or width infers Measure."
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
        "Logger 5 is ready. Mobile event details append to History Q:Z.",
        "Garden logger verified",
        6
    );
}

function openQuickLog() {
    activateSheet_(GARDEN_LOGGER.quickLogSheet, "D5");
}

function openHistory() {
    activateSheet_(GARDEN_LOGGER.historySheet, "A2");
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
    ] = values;

    const id = cleanText_(labelId);
    if (!id) throw new Error("This row has no Plant ID.");

    const weight = optionalPositiveNumber_(weightInput, "Weight");
    const height = optionalPositiveNumber_(heightInput, "Height");
    const width = optionalPositiveNumber_(widthInput, "Width");
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
    if (selectedEvent === "Measure" && height === "" && width === "") {
        throw new Error(
            "Measure was selected, but no height or width was entered."
        );
    }

    const eventNames = buildEventNames_(
        selectedEvent,
        weightState,
        weight,
        height,
        width,
        condition,
        notes
    );
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
        notes,
        potSetup,
        currentLabel,
        requestId: Utilities.getUuid(),
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
    assertHeaders_(history, HISTORY_HEADERS, 1);
    ensureHistoryRequestIdColumn_(history);
    ensureHistoryDetailColumns_(history);

    const requestId = normalizeRequestId_(input.requestId);
    const existingRequestRows = historyRowsForRequest_(history, requestId);
    if (existingRequestRows.length) {
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

        const existingValues = history
            .getRange(firstRow, 1, expectedRows, GARDEN_LOGGER.historyColumns)
            .getValues();
        const complete = existingValues.every(
            (row) =>
                row[0] instanceof Date &&
                cleanText_(row[1]) &&
                cleanText_(row[2])
        );
        if (complete) {
            const sameRequest = existingValues.every(
                (row, index) =>
                    cleanText_(row[1]) === input.plantId &&
                    cleanText_(row[2]) === input.eventNames[index]
            );
            if (!sameRequest) {
                throw new Error(
                    "This retry no longer matches the entry that was already saved. Refresh to restore the pending entry."
                );
            }
            return {
                duplicate: true,
                requestId,
                eventNames: [...input.eventNames],
                historyRows: expectedRows,
                observationDate: existingValues[0][0],
                recordedAt:
                    existingValues[0][9] instanceof Date
                        ? existingValues[0][9]
                        : new Date(),
                potSetup: positiveInteger_(
                    existingValues[0][10] || input.potSetup || 1,
                    "Pot setup"
                ),
                targetRow: firstRow,
            };
        }
    }

    const recordedAt = new Date();
    const safeCondition = safeSheetText_(input.condition);
    const safeNotes = safeSheetText_(input.notes);
    const safeCurrentLabel = safeSheetText_(input.currentLabel);
    const details = input.details || {};
    const historyRows = input.eventNames.map((eventName, index) => {
        const primaryEvent = index === 0;
        return [
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
    });
    const detailRows = input.eventNames.map((eventName) => [
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
    ]);

    const targetRow = existingRequestRows.length
        ? existingRequestRows[0]
        : Math.max(lastHistoryReservedRow_(history) + 1, 2);
    const requiredLastRow = targetRow + historyRows.length - 1;
    if (requiredLastRow > history.getMaxRows()) {
        history.insertRowsAfter(
            history.getMaxRows(),
            requiredLastRow - history.getMaxRows()
        );
    }
    const targetRange = history.getRange(
        targetRow,
        1,
        historyRows.length,
        GARDEN_LOGGER.historyColumns
    );

    if (!existingRequestRows.length) {
        history
            .getRange(
                targetRow,
                GARDEN_LOGGER.requestIdColumn,
                historyRows.length,
                1
            )
            .setValues(historyRows.map(() => [requestId]));
    }

    targetRange.setValues(historyRows);
    history
        .getRange(
            targetRow,
            GARDEN_LOGGER.historyDetailStartColumn,
            detailRows.length,
            GARDEN_LOGGER.historyDetailColumns
        )
        .setValues(detailRows);
    history
        .getRange(targetRow, 1, historyRows.length, 1)
        .setNumberFormat("M/d/yyyy h:mm am/pm");
    history
        .getRange(targetRow, 10, historyRows.length, 1)
        .setNumberFormat("M/d/yyyy h:mm:ss am/pm");

    return {
        duplicate: false,
        requestId,
        eventNames: [...input.eventNames],
        historyRows: historyRows.length,
        observationDate: input.observationDate,
        potSetup: input.potSetup,
        recordedAt,
        targetRow,
    };
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
    if (weightState === "Wet") addUnique("Water");
    if (weight !== "") addUnique("Weigh");
    if (height !== "" || width !== "") addUnique("Measure");
    if (condition) addUnique("Check");
    if (eventNames.length === 0 && notes) addUnique("Note");

    if (eventNames.length === 0) {
        throw new Error(
            "Choose an event or enter a measurement, condition, or note."
        );
    }
    return eventNames;
}

function eventDetailsFromPayload_(payload, eventNames, plant) {
    const hasEvent = (eventName) => eventNames.includes(eventName);
    const nutrientsUsed = cleanText_(payload && payload.nutrientsUsed);
    const nutrientProduct = cleanText_(payload && payload.nutrientProduct);
    const nutrientAmount = cleanText_(payload && payload.nutrientAmount);
    const potSize = cleanText_(payload && payload.potSize);
    const flowerCount = optionalPositiveInteger_(
        payload && payload.flowerCount,
        "Flower count"
    );
    const flowerDetails = cleanText_(payload && payload.flowerDetails);
    const photoUrl = cleanText_(payload && payload.photoUrl);
    const pestIssue = cleanText_(payload && payload.pestIssue);
    const pestTreatment = cleanText_(payload && payload.pestTreatment);

    if (hasEvent("Water")) {
        if (!NUTRIENT_OPTIONS.includes(nutrientsUsed)) {
            throw new Error("For Water, choose whether nutrients were used.");
        }
        if (nutrientsUsed === "Yes" && (!nutrientProduct || !nutrientAmount)) {
            throw new Error(
                "Enter both the nutrient product and amount used with this watering."
            );
        }
    }
    if (hasEvent("Repot") && !potSize) {
        throw new Error("Enter the new pot size for the Repot event.");
    }
    if (hasEvent("Flower") && flowerCount === "" && !flowerDetails) {
        throw new Error(
            "Enter a flower count, a description, or both for the Flower event."
        );
    }
    if (hasEvent("Photo") && !isGooglePhotosShareUrl_(photoUrl)) {
        throw new Error(
            "Photo needs a Google Photos share link from photos.google.com or photos.app.goo.gl."
        );
    }
    if (hasEvent("Pest") && (!pestIssue || !pestTreatment)) {
        throw new Error(
            "Describe both the pest or issue and the treatment or action taken."
        );
    }

    return {
        nutrientsUsed: hasEvent("Water") ? nutrientsUsed : "",
        nutrientProduct:
            hasEvent("Water") && nutrientsUsed === "Yes" ? nutrientProduct : "",
        nutrientAmount:
            hasEvent("Water") && nutrientsUsed === "Yes" ? nutrientAmount : "",
        previousPotSize: hasEvent("Repot")
            ? cleanText_(plant && plant.currentPotSize)
            : "",
        potSize: hasEvent("Repot") ? potSize : "",
        flowerCount: hasEvent("Flower") ? flowerCount : "",
        flowerDetails: hasEvent("Flower") ? flowerDetails : "",
        photoUrl: hasEvent("Photo") ? photoUrl : "",
        pestIssue: hasEvent("Pest") ? pestIssue : "",
        pestTreatment: hasEvent("Pest") ? pestTreatment : "",
    };
}

function isGooglePhotosShareUrl_(value) {
    return /^https:\/\/(?:photos\.google\.com|photos\.app\.goo\.gl)(?:[/:?#]|$)/i.test(
        cleanText_(value)
    );
}

function plantRecordForId_(spreadsheet, plantId) {
    if (!plantId) return null;
    const tracker = requireSheet_(spreadsheet, GARDEN_LOGGER.plantTrackerSheet);
    const rowCount = Math.max(0, tracker.getLastRow() - 1);
    if (rowCount === 0) return null;
    const trackerRange = tracker.getRange(
        2,
        1,
        rowCount,
        GARDEN_LOGGER.currentLabelColumn
    );
    const rows = trackerRange.getValues();
    const formulas = trackerRange.getFormulas();
    const matches = rows
        .map((row, index) => ({ row, formula: formulas[index] }))
        .filter(({ row }) => cleanText_(row[0]) === plantId);
    if (matches.length > 1) {
        throw new Error(
            `Plant ID ${plantId} appears more than once in Plant tracker.`
        );
    }
    const match = matches[0];
    if (!match) return null;
    const row = match.row;

    const baselines = requireSheet_(spreadsheet, GARDEN_LOGGER.baselinesSheet);
    const baselineRowCount = Math.max(0, baselines.getLastRow() - 1);
    const baselineRows = baselineRowCount
        ? baselines.getRange(2, 1, baselineRowCount, 3).getValues()
        : [];
    const baseline = baselineRows.find(
        ([candidateId]) => cleanText_(candidateId) === plantId
    );

    return {
        id: plantId,
        name: cleanText_(row[1]),
        scientificName: cleanText_(row[2]),
        label: cleanText_(row[GARDEN_LOGGER.currentLabelColumn - 1]),
        currentPotSize:
            latestPotSizesByPlant_(spreadsheet).get(plantId) || "Not logged",
        fieldGuideUrl: fieldGuideUrlForRow_(match.formula),
        potSetup: baseline
            ? positiveInteger_(baseline[2] || 1, "Pot setup")
            : 1,
    };
}

function latestPotSizesByPlant_(spreadsheet) {
    const result = new Map(Object.entries(INITIAL_POT_SIZE_BY_PLANT));
    const history = requireSheet_(spreadsheet, GARDEN_LOGGER.historySheet);
    const lastRow = lastHistoryDataRow_(history);
    if (lastRow < 2) return result;

    const values = history
        .getRange(2, 1, lastRow - 1, GARDEN_LOGGER.historyDetailStartColumn + 4)
        .getDisplayValues();
    values
        .filter((row) => cleanText_(row[2]) === "Repot")
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

function updateBaselinePotSetup_(spreadsheet, plantId, potSetup) {
    const baselines = requireSheet_(spreadsheet, GARDEN_LOGGER.baselinesSheet);
    const rowCount = Math.max(0, baselines.getLastRow() - 1);
    const values = rowCount
        ? baselines.getRange(2, 1, rowCount, 1).getDisplayValues()
        : [];
    const index = values.findIndex(
        ([candidateId]) => cleanText_(candidateId) === plantId
    );
    if (index < 0) {
        throw new Error(`Plant ID ${plantId} is missing from Baselines.`);
    }
    baselines.getRange(index + 2, 3).setValue(potSetup);
}

function getRecentObservations_(spreadsheet, timeZone, limit) {
    const history = requireSheet_(spreadsheet, GARDEN_LOGGER.historySheet);
    const lastRow = lastHistoryDataRow_(history);
    if (lastRow < 2) return [];
    const startRow = Math.max(2, lastRow - Math.max(limit * 3, limit) + 1);
    const rows = history
        .getRange(startRow, 1, lastRow - startRow + 1, 13)
        .getValues();
    return rows
        .map((row) => ({
            observedAt: formatClientDate_(row[0], timeZone, "MMM d, h:mm a"),
            plantId: cleanText_(row[1]),
            event: cleanText_(row[2]),
            weightState: cleanText_(row[3]),
            weight: row[4] === "" || row[4] === null ? "" : Number(row[4]),
            name: cleanText_(row[12]),
        }))
        .filter((entry) => entry.plantId && entry.event)
        .reverse()
        .slice(0, limit);
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
            `History!${columnName_(GARDEN_LOGGER.requestIdColumn)}1 must be \"${GARDEN_LOGGER.requestIdHeader}\".`
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
    const values = plantIds.map(([plantId]) => [
        plantId ? (clearEvents ? "" : selected) : "",
    ]);

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
            GARDEN_LOGGER.weightStateColumn,
            GARDEN_LOGGER.weightColumn,
            GARDEN_LOGGER.heightColumn,
            GARDEN_LOGGER.widthColumn,
        ].includes(columnNumber)
    ) {
        return;
    }

    const eventCell = quickLog.getRange(rowNumber, GARDEN_LOGGER.eventColumn);
    const currentEvent = cleanText_(eventCell.getValue());
    const weightState = cleanText_(
        quickLog.getRange(rowNumber, GARDEN_LOGGER.weightStateColumn).getValue()
    );
    const weight = quickLog
        .getRange(rowNumber, GARDEN_LOGGER.weightColumn)
        .getValue();
    const height = quickLog
        .getRange(rowNumber, GARDEN_LOGGER.heightColumn)
        .getValue();
    const width = quickLog
        .getRange(rowNumber, GARDEN_LOGGER.widthColumn)
        .getValue();

    if (weightState === "Wet" && (!currentEvent || currentEvent === "Weigh")) {
        eventCell.setValue("Water");
        eventCell.setNote("Auto-selected Water because Weight state is Wet.");
        return;
    }
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
        weightState !== "Wet" &&
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
    if (weightState === "Wet") addUnique("Water");
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
        throw new Error("Date is not valid.");
    }
    return parsed;
}

function optionalPositiveNumber_(value, label) {
    if (value === "" || value === null) return "";
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
                `${sheet.getName()}!${columnName_(index + 1)}${rowNumber} must be \"${header}\".`
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
        result = String.fromCharCode(65 + remainder) + result;
        value = Math.floor((value - 1) / 26);
    }
    return result;
}
