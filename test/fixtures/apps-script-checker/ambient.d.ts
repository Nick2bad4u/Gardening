type CheckerCrossFileLabel = CheckerPlantLabel;
type CheckerServiceUnion = GoogleAppsScript.Spreadsheet.Sheet | undefined;
type CheckerSourceUnion = ReturnType<typeof checkerSharedLabel> | undefined;
type CheckerMisspelled = MissingCheckerLabel;
