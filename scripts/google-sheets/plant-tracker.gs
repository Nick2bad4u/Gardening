/**
 * Bound Google Apps Script for the Garden Plant Tracker workbook.
 *
 * Quick log keeps one input row per permanent plant ID. Ticking Save appends
 * event-specific rows to History, so new readings never overwrite old ones.
 */

const GARDEN_LOGGER = Object.freeze({
    version: "2.0.0",
    quickLogSheet: "Quick log",
    trackerSheet: "Plant tracker",
    historySheet: "History",
    dashboardSheet: "Dashboard",
    quickLogHeaderRow: 4,
    firstInputRow: 5,
    saveColumn: 3,
    startedAtColumn: 4,
    firstEntryColumn: 5,
    lastEntryColumn: 11,
    bulkRow: 3,
    bulkEventColumn: 2,
    bulkApplyColumn: 3,
    historyColumns: 13,
});

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
    "Plant / planter",
]);

const TRACKER_HEADERS = Object.freeze([
    "Plant ID",
    "Plant / planter",
    "Scientific name / contents",
    "Last watered",
    "Days since water",
    "Weight (g)",
    "Weight checked",
    "Height (cm)",
    "Height checked",
    "Width (cm)",
    "Width checked",
    "Condition / soil",
    "Field guide",
    "Current pot label",
]);

function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu("Garden logger")
        .addItem("Verify logger", "installGardenLogger")
        .addSeparator()
        .addItem("Open Quick log", "openQuickLog")
        .addItem("Open Dashboard", "openDashboard")
        .addItem("Open History", "openHistory")
        .addSeparator()
        .addItem("Clear selected Quick log row", "clearSelectedQuickLogRow")
        .addToUi();
}

function onEdit(event) {
    if (!event || !event.range) return;

    const range = event.range;
    const sheet = range.getSheet();
    if (sheet.getName() !== GARDEN_LOGGER.quickLogSheet) return;

    if (
        range.getRow() === GARDEN_LOGGER.bulkRow &&
        range.getColumn() === GARDEN_LOGGER.bulkApplyColumn &&
        event.value === "TRUE"
    ) {
        applyBulkEvent_(sheet, range);
        return;
    }

    if (
        range.getRow() >= GARDEN_LOGGER.firstInputRow &&
        range.getColumn() >= GARDEN_LOGGER.firstEntryColumn &&
        range.getColumn() <= GARDEN_LOGGER.lastEntryColumn &&
        cleanText_(event.value)
    ) {
        stampStartedAt_(sheet, range.getRow());
    }

    if (
        range.getRow() < GARDEN_LOGGER.firstInputRow ||
        range.getColumn() !== GARDEN_LOGGER.saveColumn ||
        event.value !== "TRUE"
    ) {
        return;
    }

    const lock = LockService.getDocumentLock();
    if (!lock.tryLock(30_000)) {
        markSaveError_(
            range,
            "Another reading is being saved. Untick and try again."
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
    const tracker = requireSheet_(spreadsheet, GARDEN_LOGGER.trackerSheet);
    const history = requireSheet_(spreadsheet, GARDEN_LOGGER.historySheet);

    assertHeaders_(
        quickLog,
        QUICK_LOG_HEADERS,
        GARDEN_LOGGER.quickLogHeaderRow
    );
    assertHeaders_(tracker, TRACKER_HEADERS, 1);
    assertHeaders_(history, HISTORY_HEADERS, 1);

    PropertiesService.getDocumentProperties().setProperties({
        gardenLoggerVersion: GARDEN_LOGGER.version,
        gardenLoggerInstalledAt: new Date().toISOString(),
    });

    quickLog
        .getRange("C4")
        .setNote(
            `Garden logger ${GARDEN_LOGGER.version} verified. Tick Save to append event-specific rows to History.`
        );
    spreadsheet.toast(
        "Quick log is ready. Tick Save on any completed plant row.",
        "Garden logger verified",
        6
    );
}

function openQuickLog() {
    activateSheet_(GARDEN_LOGGER.quickLogSheet, "E5");
}

function openDashboard() {
    activateSheet_(GARDEN_LOGGER.dashboardSheet, "A1");
}

function openHistory() {
    activateSheet_(GARDEN_LOGGER.historySheet, "A2");
}

function clearSelectedQuickLogRow() {
    const spreadsheet = SpreadsheetApp.getActive();
    const quickLog = requireSheet_(spreadsheet, GARDEN_LOGGER.quickLogSheet);
    const selection = spreadsheet.getActiveRange();
    const rowNumber = selection ? selection.getRow() : 0;

    if (
        spreadsheet.getActiveSheet().getName() !==
            GARDEN_LOGGER.quickLogSheet ||
        rowNumber < GARDEN_LOGGER.firstInputRow ||
        !cleanText_(quickLog.getRange(rowNumber, 1).getDisplayValue())
    ) {
        spreadsheet.toast(
            "Select a plant row on Quick log first.",
            "Nothing cleared",
            5
        );
        return;
    }

    clearQuickLogInputs_(quickLog, rowNumber);
    spreadsheet.toast(
        `Cleared Quick log row ${rowNumber}.`,
        "Inputs cleared",
        4
    );
}

function applyBulkEvent_(quickLog, applyCell) {
    try {
        const selected = cleanText_(
            quickLog
                .getRange(GARDEN_LOGGER.bulkRow, GARDEN_LOGGER.bulkEventColumn)
                .getDisplayValue()
        );
        if (!selected) throw new Error("Choose a bulk Event first.");

        const lastRow = lastPlantRow_(quickLog);
        const eventRange = quickLog.getRange(
            GARDEN_LOGGER.firstInputRow,
            GARDEN_LOGGER.firstEntryColumn,
            lastRow - GARDEN_LOGGER.firstInputRow + 1,
            1
        );

        if (selected === "Clear events") {
            eventRange.clearContent();
        } else {
            eventRange.setValue(selected);
            const startedRange = quickLog.getRange(
                GARDEN_LOGGER.firstInputRow,
                GARDEN_LOGGER.startedAtColumn,
                lastRow - GARDEN_LOGGER.firstInputRow + 1,
                1
            );
            const startedAt = new Date();
            startedRange.setValues(
                startedRange
                    .getValues()
                    .map(([value]) => [value === "" ? startedAt : value])
            );
        }

        applyCell.setValue(false);
        applyCell.setNote(
            selected === "Clear events"
                ? "Cleared every Quick log Event cell."
                : `Applied “${selected}” to every Quick log Event cell.`
        );
    } catch (error) {
        applyCell.setValue(false);
        applyCell.setNote(
            `Not applied: ${error instanceof Error ? error.message : String(error)}`
        );
        SpreadsheetApp.getActive().toast(
            error instanceof Error ? error.message : String(error),
            "Bulk event not applied",
            6
        );
    }
}

function archiveQuickLogRow_(quickLog, rowNumber) {
    const spreadsheet = quickLog.getParent();
    const history = requireSheet_(spreadsheet, GARDEN_LOGGER.historySheet);
    assertHeaders_(history, HISTORY_HEADERS, 1);

    const values = quickLog
        .getRange(rowNumber, 1, 1, QUICK_LOG_HEADERS.length)
        .getValues()[0];
    const [
        plantIdInput,
        ,
        ,
        startedAtInput,
        eventInput,
        weightStateInput,
        weightInput,
        heightInput,
        widthInput,
        conditionInput,
        notesInput,
        potSetupInput,
    ] = values;

    const plantId = cleanText_(plantIdInput);
    if (!plantId) throw new Error("This row has no permanent Plant ID.");

    const weight = optionalPositiveNumber_(weightInput, "Weight");
    const height = optionalPositiveNumber_(heightInput, "Height");
    const width = optionalPositiveNumber_(widthInput, "Width");
    const condition = cleanText_(conditionInput);
    const notes = cleanText_(notesInput);
    const explicitEvent = cleanText_(eventInput);
    const weightState = cleanText_(weightStateInput);

    if (
        !explicitEvent &&
        weight === "" &&
        height === "" &&
        width === "" &&
        !condition &&
        !notes
    ) {
        throw new Error(
            "Enter an event, measurement, condition, or note before saving."
        );
    }
    if (weight === "" && weightState) {
        throw new Error(
            "Weight state was selected, but no weight was entered."
        );
    }

    const eventNames = uniqueEventNames_([
        explicitEvent,
        weightState === "Wet" ? "Water" : "",
        weight !== "" ? "Weigh" : "",
        height !== "" || width !== "" ? "Measure" : "",
        !explicitEvent &&
        weight === "" &&
        height === "" &&
        width === "" &&
        condition
            ? "Check"
            : "",
        !explicitEvent &&
        weight === "" &&
        height === "" &&
        width === "" &&
        !condition &&
        notes
            ? "Note"
            : "",
    ]);
    if (eventNames.length === 0) throw new Error("No event could be inferred.");

    const potSetup = positiveInteger_(potSetupInput || 1, "Pot setup");
    const observationDate = normalizeDate_(startedAtInput);
    const recordedAt = new Date();
    const plant = getPlantSnapshot_(spreadsheet, plantId);
    const rows = eventNames.map((eventName, index) => {
        const isWeigh = eventName.toLowerCase() === "weigh";
        const isMeasure = eventName.toLowerCase() === "measure";
        return [
            observationDate,
            plantId,
            eventName,
            isWeigh ? weightState || "Routine" : "",
            isWeigh ? weight : "",
            isMeasure ? height : "",
            isMeasure ? width : "",
            index === 0 ? condition : "",
            index === 0 ? notes : "",
            recordedAt,
            potSetup,
            plant.potLabel,
            plant.name,
        ];
    });

    const targetRow = Math.max(history.getLastRow() + 1, 2);
    const targetRange = history.getRange(
        targetRow,
        1,
        rows.length,
        GARDEN_LOGGER.historyColumns
    );
    const formatSourceRow = Math.max(
        2,
        Math.min(targetRow - 1, history.getLastRow())
    );
    if (formatSourceRow >= 2 && formatSourceRow !== targetRow) {
        const source = history.getRange(
            formatSourceRow,
            1,
            1,
            GARDEN_LOGGER.historyColumns
        );
        source.copyTo(
            targetRange,
            SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
            false
        );
        source.copyTo(
            targetRange,
            SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION,
            false
        );
    }

    targetRange.setValues(rows);
    history.getRange(targetRow, 1, rows.length, 1).setNumberFormat("M/d/yyyy");
    history
        .getRange(targetRow, 10, rows.length, 1)
        .setNumberFormat("M/d/yyyy h:mm:ss am/pm");

    clearQuickLogInputs_(quickLog, rowNumber);
    const saveCell = quickLog.getRange(rowNumber, GARDEN_LOGGER.saveColumn);
    saveCell.setBackground("#dcebdd");
    saveCell.setNote(
        `Saved ${eventNames.join(", ")} for ${plantId} at ${Utilities.formatDate(recordedAt, spreadsheet.getSpreadsheetTimeZone(), "M/d/yyyy h:mm:ss a")}.`
    );

    spreadsheet.toast(
        `${eventNames.join(", ")} saved for ${plantId}. Previous readings remain in History.`,
        rows.length === 1 ? "Observation archived" : "Observations archived",
        5
    );
}

function getPlantSnapshot_(spreadsheet, plantId) {
    const tracker = requireSheet_(spreadsheet, GARDEN_LOGGER.trackerSheet);
    assertHeaders_(tracker, TRACKER_HEADERS, 1);
    const rowCount = Math.max(0, tracker.getLastRow() - 1);
    const values = rowCount
        ? tracker
              .getRange(2, 1, rowCount, TRACKER_HEADERS.length)
              .getDisplayValues()
        : [];
    const row = values.find(
        (candidate) => cleanText_(candidate[0]) === plantId
    );
    if (!row)
        throw new Error(`Plant ID ${plantId} is missing from Plant tracker.`);
    return {
        name: cleanText_(row[1]),
        potLabel: cleanText_(row[13]),
    };
}

function stampStartedAt_(sheet, rowNumber) {
    const cell = sheet.getRange(rowNumber, GARDEN_LOGGER.startedAtColumn);
    if (cell.isBlank()) cell.setValue(new Date());
}

function clearQuickLogInputs_(quickLog, rowNumber) {
    quickLog
        .getRange(
            rowNumber,
            GARDEN_LOGGER.startedAtColumn,
            1,
            GARDEN_LOGGER.lastEntryColumn - GARDEN_LOGGER.startedAtColumn + 1
        )
        .clearContent();
    quickLog.getRange(rowNumber, GARDEN_LOGGER.saveColumn).setValue(false);
}

function lastPlantRow_(quickLog) {
    const values = quickLog
        .getRange(
            GARDEN_LOGGER.firstInputRow,
            1,
            quickLog.getMaxRows() - GARDEN_LOGGER.firstInputRow + 1,
            1
        )
        .getDisplayValues();
    let lastRow = GARDEN_LOGGER.firstInputRow - 1;
    values.forEach((row, index) => {
        if (cleanText_(row[0])) lastRow = GARDEN_LOGGER.firstInputRow + index;
    });
    if (lastRow < GARDEN_LOGGER.firstInputRow) {
        throw new Error("Quick log has no plant rows.");
    }
    return lastRow;
}

function uniqueEventNames_(values) {
    const seen = new Set();
    return values.map(cleanText_).filter((value) => {
        if (!value) return false;
        const key = value.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function normalizeDate_(value) {
    if (value === "" || value === null) return new Date();
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) throw new Error("Date is not valid.");
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
                `${sheet.getName()}!${columnName_(index + 1)}${rowNumber} must be “${header}”.`
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
