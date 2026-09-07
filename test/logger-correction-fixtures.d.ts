export interface CorrectionCell {
    format: string;
    formula: string;
    validation: string;
    value:
        | Date
        | number
        | string;
}

export interface CorrectionCellData {
    userEnteredFormat?: {
        numberFormat: { pattern: string; type: string };
    };
    userEnteredValue?: {
        formulaValue?: string;
        numberValue?: number;
        stringValue?: string;
    };
}

export interface CorrectionContext {
    baseRevision: string;
    contextDigest: string;
    fields: CorrectionField[];
    notices: string[];
    original: CorrectionEntry;
    siblings: CorrectionEntry[];
    timeZone: string;
}

export interface CorrectionEntry {
    correctionReason: string;
    correctsObservationId: string;
    event: string;
    label: string;
    observationDate: string;
    observationId: string;
    plantId: string;
    potSetup: CorrectionScalar;
    recordedAt: string;
    recordStatus: string;
    requestId: string;
    saveGroupId: string;
    values: Record<string, CorrectionScalar>;
}

export interface CorrectionField {
    key: string;
    label: string;
    options: string[];
    required: boolean;
    type:
        | "datetime"
        | "number"
        | "select"
        | "text"
        | "url";
    unit: string;
}

export interface CorrectionMissing {
    observationId: string;
    operationDigest: string;
    payloadDigest: string;
    requestId: string;
    status: "missing";
}

export interface CorrectionPreview extends CorrectionContext {
    differences: {
        after: CorrectionScalar;
        before: CorrectionScalar;
        key: string;
        label: string;
    }[];
    payloadDigest: string;
    previewToken: string;
    replacement: CorrectionEntry;
}

export interface CorrectionPreviewPayload {
    baseRevision: string;
    changes: Record<string, CorrectionScalar>;
    observationId: string;
    reason: string;
}

export interface CorrectionReceipt {
    observationId: string;
    operationDigest: string;
    originalObservationId: string;
    payloadDigest: string;
    replacementObservationId: string;
    requestId: string;
    status: "saved";
}

export interface CorrectionRejected {
    code: CorrectionRejectionCode;
    message: string;
    observationId: string;
    operationDigest: string;
    payloadDigest: string;
    requestId: string;
    status: "rejected";
}

export type CorrectionRejectionCode =
    | "HISTORY_CAPACITY"
    | "HISTORY_SCHEMA"
    | "INVALID_CORRECTION"
    | "NOT_FOUND"
    | "REMOVED_ORIGINAL"
    | "SETUP_BOUNDARY"
    | "STALE_PREVIEW";

export type CorrectionRpcName = keyof LoggerCorrectionApi;

export interface CorrectionSavePayload extends CorrectionPreviewPayload {
    previewToken: string;
    requestId: string;
}

export type CorrectionScalar = number | string;

export type CorrectionSheetsRequest =
    | {
          appendDimension: {
              dimension: "ROWS";
              length: number;
              sheetId: number;
          };
      }
    | {
          updateCells: {
              fields: string;
              rows: { values: CorrectionCellData[] }[];
              start: { columnIndex: number; rowIndex: number; sheetId: number };
          };
      };

export interface LoggerCorrectionApi {
    getWebCorrectionEntry: (request: {
        observationId: string;
    }) => CorrectionContext;
    getWebCorrectionStatus: (request: CorrectionSavePayload) =>
        | CorrectionMissing
        | CorrectionReceipt
        | CorrectionRejected;
    previewWebObservationCorrection: (
        request: CorrectionPreviewPayload
    ) => CorrectionPreview;
    removeSelectedHistoryObservations: () => void;
    saveWebObservationCorrection: (
        request: CorrectionSavePayload
    ) => CorrectionReceipt;
}
