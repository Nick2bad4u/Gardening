const checkerLabel = checkerSharedLabel("P01");
const checkerSpreadsheet = SpreadsheetApp.openById(checkerLabel);
const checkerSortedLabels = [checkerLabel, "P02"].toSorted();
Logger.log(checkerSpreadsheet.getName(), checkerSortedLabels);
