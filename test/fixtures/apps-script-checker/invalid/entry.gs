// Deliberate failures: service method, service argument, domain, strictness, globals.
SpreadsheetApp.notARealServiceMethod();
SpreadsheetApp.openById(42);
/** @type {CheckerPlantLabel} */
const checkerInvalidLabel = "P99";
function checkerUntypedParameter(value) {
    return value;
}
Logger.log(document.title);
Logger.log(process.version);
