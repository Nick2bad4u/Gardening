/** Native Sheets cells can be blank; absence also covers a short input row. */
type GardenCell =
    | boolean
    | Date
    | null
    | number
    | string
    | undefined;
type GardenHistoryRow = GardenCell[];
interface GardenNutrientPreferences {
    doses: Record<string, string>;
    product: string;
}
type GardenOptionalNumber = "" | number;
type GardenRange = GoogleAppsScript.Spreadsheet.Range;
type GardenSheet = GoogleAppsScript.Spreadsheet.Sheet;
type GardenSpreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
