/**
 * Verify the evaluated source exports the testing API before assigning types.
 * Runtime return values remain covered by the original behavioral assertions.
 *
 * @param {unknown} context
 *
 * @returns {import("../apps-script-fixtures.d.ts").AppsScriptTestApi}
 */
export function appsScriptApi(context) {
    if (typeof context !== "object" || context === null)
        throw new TypeError("Missing Apps Script context");
    const exportedValues = /** @type {Record<string, unknown>} */ (context);
    // Keep this inventory exhaustive when the test-facing API changes.
    /**
     * @type {Record<
     *     import("../apps-script-fixtures.d.ts").AppsScriptFunctionName,
     *     null
     * >}
     */
    const functions = {
        appendObservation_: null,
        appendPreparedWebObservationBatch_: null,
        applyBulkEvent_: null,
        appPlantChartsFormula_: null,
        appSheetBulkPayloadsFromRow_: null,
        appSheetBulkWateredPlants_: null,
        appSheetEventList_: null,
        archiveQuickLogRow_: null,
        assertHeaders_: null,
        assertUniqueIdsInRows_: null,
        assertUniquePlantIds_: null,
        baselinePotSetupData_: null,
        baselineViewRow_: null,
        buildEventNames_: null,
        buildEventNamesFromList_: null,
        cleanText_: null,
        columnName_: null,
        comparableHistoryValue_: null,
        currentLabelForPlant_: null,
        dashboardViewRow_: null,
        dashboardWeightCountFormula_: null,
        dateSortValue_: null,
        doGet: null,
        dryDownModelFormula_: null,
        dryDownModelsFromHistory_: null,
        dryDownPrior_: null,
        dryDownSerialDate_: null,
        dryOrLowestWeightsFromRows_: null,
        ensureAppSheetEntryColumns_: null,
        ensureHistoryDetailColumns_: null,
        ensureHistoryGrid_: null,
        ensureHistoryMeasurementColumns_: null,
        ensureHistoryProvenanceColumns_: null,
        ensureHistoryRequestIdColumn_: null,
        ensureHistoryRotationColumns_: null,
        ensureHistoryView_: null,
        ensureHistoryWaterColumns_: null,
        ensureQuickLogWaterColumns_: null,
        ensureSheetRowCapacity_: null,
        eventDetailsFromPayload_: null,
        existingObservationResult_: null,
        fieldGuideUrlForRow_: null,
        fitDryDownCurve_: null,
        formatClientDate_: null,
        formulaString_: null,
        GARDEN_DRY_DOWN: null,
        getGardenSpreadsheet_: null,
        getRecentObservations_: null,
        getRecentWebObservations: null,
        getWebAppBootstrap: null,
        getWebBatchSaveStatus: null,
        getWebSaveStatus: null,
        historyObservationSnapshot_: null,
        historyProvenanceRow_: null,
        historyRecordsShareSave_: null,
        historyRowsForRequest_: null,
        inferredWeightStatesByRow_: null,
        installAppSheetBulkSheet: null,
        installAppSheetIntake: null,
        installAppSheetQueueTrigger: null,
        installDashboardWeightCounts: null,
        installDryDownLearning: null,
        installGardenLogger: null,
        installWateringRecommendations: null,
        isGooglePhotosShareUrl_: null,
        lastHistoryDataRow_: null,
        lastHistoryReservedRow_: null,
        latestPotSizesByPlant_: null,
        markSaveError_: null,
        measuredDimensionCondition_: null,
        measurementToCentimeters_: null,
        migrateLegacyAppSheetBulkSheet_: null,
        normalizeAppSheetBulkAction_: null,
        normalizeDate_: null,
        normalizeMeasurementMethod_: null,
        normalizeMeasurementQuality_: null,
        normalizeMeasurementUnit_: null,
        normalizeRecentLimit_: null,
        normalizeRequestId_: null,
        normalizeWebEntrySource_: null,
        normalizeWeightState_: null,
        onEdit: null,
        onOpen: null,
        openHistory: null,
        openMobileEntry: null,
        openQuickLog: null,
        optionalColumnForHeader_: null,
        optionalPositiveInteger_: null,
        optionalPositiveNumber_: null,
        organizeWorkbookSheets_: null,
        plantActivitySummary_: null,
        plantChartHelperFormula_: null,
        plantNamesById_: null,
        plantPageHistoryFormula_: null,
        plantPageSheet_: null,
        plantRecordForId_: null,
        plantRecordsById_: null,
        positiveInteger_: null,
        prepareWebObservation_: null,
        processAppSheetEntry: null,
        processQueuedAppSheetEntries: null,
        readHistorySnapshot_: null,
        recentObservationsFromRows_: null,
        refreshBaselineView_: null,
        refreshDashboardView_: null,
        refreshDryDownModels_: null,
        refreshGardenWorkbook: null,
        refreshGardenWorkbookPages01To10: null,
        refreshGardenWorkbookPages11To20: null,
        refreshGardenWorkbookPages21To30: null,
        refreshPlantPage_: null,
        remeasureStatusFormula_: null,
        removeSelectedHistoryObservations: null,
        requiredColumnForHeader_: null,
        requireSheet_: null,
        safeSheetText_: null,
        saveBulkCareObservation: null,
        saveBulkWaterObservation: null,
        savedRequestStatus_: null,
        saveWebObservation: null,
        saveWebObservationBatch: null,
        stampEntryStartedAt_: null,
        storedObservationRows_: null,
        uniqueTextValues_: null,
        updateBaselinePotSetup_: null,
        updateInferredEvent_: null,
        validateMeasurementEvents_: null,
        wateringReadinessGuidance_: null,
        wateringRecommendation_: null,
        workbookPlantRecords_: null,
        writeStoredObservationRows_: null,
    };
    for (const name of Object.keys(functions)) {
        if (typeof exportedValues[name] !== "function") {
            throw new TypeError(`Missing Apps Script function: ${name}`);
        }
    }
    return /** @type {import("../apps-script-fixtures.d.ts").AppsScriptTestApi} */ (
        context
    );
}

/**
 * Substitute a server boundary, including deliberately malformed responses.
 * Keep the incoming arguments checked against the actual testing API.
 *
 * @template {import("../apps-script-fixtures.d.ts").AppsScriptFunctionName} K
 *
 * @param {import("../apps-script-fixtures.d.ts").AppsScriptTestApi} context
 * @param {K} name
 * @param {(
 *     ...args: import("../apps-script-fixtures.d.ts").AppsScriptArguments<K>
 * ) => unknown} implementation
 */
export function overrideAppsScript(context, name, implementation) {
    Reflect.set(context, name, implementation);
}
