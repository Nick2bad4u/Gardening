/** Shared Node-side capacity contract; the bound logger mirrors these values. */
export const historyObservationCapacity = 50_000;
export const historyLastRow = historyObservationCapacity + 1;
/** Charts display recent evidence; full summaries retain the complete ledger. */
export const chartObservationLimit = 4999;
