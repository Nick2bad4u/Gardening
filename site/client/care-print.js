const printMedia = matchMedia("print");
/** @type {Map<HTMLDetailsElement, boolean>} */
const previousStates = new Map();
const printState = { isEventActive: false };

/**
 * Expand care references for printing and restore the reader's disclosure
 * choices.
 */
function synchronizePrintState() {
    if (printState.isEventActive || printMedia.matches) {
        for (const details of document.querySelectorAll(
            "details[data-print-care]"
        )) {
            if (!(details instanceof HTMLDetailsElement)) continue;
            if (!previousStates.has(details))
                previousStates.set(details, details.open);
            details.open = true;
        }
        return;
    }
    for (const [details, wasOpen] of previousStates) details.open = wasOpen;
    previousStates.clear();
}

addEventListener("beforeprint", () => {
    printState.isEventActive = true;
    synchronizePrintState();
});
addEventListener("afterprint", () => {
    printState.isEventActive = false;
    synchronizePrintState();
});
printMedia.addEventListener("change", synchronizePrintState);
synchronizePrintState();
