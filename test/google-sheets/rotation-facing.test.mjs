import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

import {
    appsScriptApi,
    overrideAppsScript,
} from "../helpers/apps-script-api.mjs";
import { required } from "../helpers/required.mjs";

const sourceUrl = new URL(
    "../../scripts/google-sheets/plant-tracker.gs",
    import.meta.url
);
const source = readFileSync(sourceUrl, "utf8");
const now = new Date("2026-11-14T02:00:00Z");
const observedAt = new Date("2026-11-12T16:00:00Z");
const facings = [
    "N",
    "E",
    "S",
    "W",
];

function facingColumnsFixture() {
    const headers = ["", ""];
    const values = ["", ""];
    const formulas = ["", ""];
    /** @type {number[]} */
    const validated = [];
    /** @type {number[]} */
    const cleared = [];
    /** @type {[number, string][]} */
    const formats = [];
    const validation = {
        build: () => "cardinal validation",
        requireValueInList: vi.fn(() => validation),
        setAllowInvalid: vi.fn(() => validation),
    };
    const sheet = {
        getLastRow: () => 2,
        getMaxColumns: () => 69,
        getMaxRows: () => 50_001,
        getRange: (/** @type {number} */ row, /** @type {number} */ column) => {
            const range = {
                clearDataValidations() {
                    cleared.push(column);
                    return range;
                },
                getDisplayValues: () => [headers],
                getFormulas: () => [[formulas[column - 68]]],
                getValues: () => [[values[column - 68]]],
                setDataValidation() {
                    validated.push(column);
                    return range;
                },
                setNumberFormat(/** @type {string} */ format) {
                    formats.push([column, format]);
                    return range;
                },
                setValues(/** @type {string[][]} */ rows) {
                    if (row !== 1) throw new Error("Unexpected data mutation");
                    headers.splice(0, headers.length, ...required(rows[0]));
                    return range;
                },
            };
            return range;
        },
    };
    const api = runtime({
        SpreadsheetApp: { newDataValidation: () => validation },
    });
    return {
        api,
        cleared,
        formats,
        formulas,
        headers,
        sheet,
        validated,
        validation,
        values,
    };
}

/**
 * @param {ReturnType<typeof runtime>} api
 * @param {Record<string, unknown>} payload
 * @param {string} [requestId]
 * @param {Record<string, unknown>} [overrides]
 */
function rotationInput(
    api,
    payload,
    requestId = "rotation-request-001",
    overrides = {}
) {
    return {
        condition: "",
        currentLabel: "A1",
        details: api.eventDetailsFromPayload_(payload, ["Rotation"], null),
        entrySource: "Mobile logger",
        eventNames: ["Rotation"],
        height: "",
        notes: "Synthetic rotation",
        observationDate: observedAt,
        plantId: "P01",
        potSetup: 1,
        requestId,
        weight: "",
        weightState: "Routine",
        width: "",
        ...overrides,
    };
}

/**
 * @param {ReturnType<typeof runtime>} api
 * @param {Record<string, unknown>} payload
 * @param {string} requestId
 * @param {number} targetRow
 * @param {Record<string, unknown>} [overrides]
 */
function rotationRow(api, payload, requestId, targetRow, overrides = {}) {
    return required(
        api.storedObservationRows_(
            rotationInput(api, payload, requestId, overrides),
            requestId,
            targetRow,
            now
        )[0]
    );
}

/** @param {Record<string, unknown>} [globals] */
function runtime(globals = {}) {
    const context = vm.createContext({ Date, Map, Object, Set, ...globals });
    vm.runInContext(source, context, { filename: fileURLToPath(sourceUrl) });
    return appsScriptApi(context);
}

describe("rotation facing schema guards", () => {
    it("installs replaceable generated headers, validates cardinal cells and leaves current headers unchanged", () => {
        expect.hasAssertions();

        const model = facingColumnsFixture();
        model.headers[0] = "Column 68";
        model.api.ensureHistoryRotationFacingColumns_(model.sheet);

        expect(model.headers).toStrictEqual([
            "Rotation from facing",
            "Rotation to facing",
        ]);
        expect(model.validated).toStrictEqual([68, 69]);
        expect(model.validation.requireValueInList).toHaveBeenCalledWith(
            [
                "N",
                "E",
                "S",
                "W",
            ],
            true
        );
        expect(model.validation.setAllowInvalid).toHaveBeenCalledWith(false);
        expect(model.formats).toStrictEqual([
            [68, "@"],
            [69, "@"],
        ]);

        model.validated.length = 0;
        model.api.ensureHistoryRotationFacingColumns_(model.sheet);

        expect(model.validated).toStrictEqual([]);

        model.api.ensureHistoryRotationFacingColumns_(model.sheet, true);

        expect(model.validated).toHaveLength(2);
    });

    it.each([0, 1])(
        "rejects an occupied header, cell or blank-displaying formula in facing column %s",
        (index) => {
            expect.hasAssertions();

            const model = facingColumnsFixture();
            model.headers[index] = "Owner field";

            expect(() => {
                model.api.ensureHistoryRotationFacingColumns_(model.sheet);
            }).toThrow(/must be/iv);

            model.headers[index] = "";
            model.values[index] = "N";

            expect(() => {
                model.api.ensureHistoryRotationFacingColumns_(model.sheet);
            }).toThrow(/existing data/iv);

            model.values[index] = "";
            model.formulas[index] = '=IF(TRUE,"","N")';

            expect(() => {
                model.api.ensureHistoryRotationFacingColumns_(model.sheet);
            }).toThrow(/existing data/iv);
            expect(model.headers).toStrictEqual(["", ""]);
            expect(model.validated).toStrictEqual([]);
        }
    );

    it("configures only present facing columns and clears snapshot validation for text storage", () => {
        expect.hasAssertions();

        const model = facingColumnsFixture();
        model.api.configureRotationFacingColumns_(model.sheet, [
            "Other",
            "Rotation to facing",
            "Rotation facing snapshot",
        ]);

        expect(model.validated).toStrictEqual([2]);
        expect(model.validated).not.toContain(1);
        expect(model.cleared).toStrictEqual([3]);
        expect(model.formats).toStrictEqual([
            [2, "@"],
            [3, "@"],
        ]);
    });
});

describe("cardinal rotation evidence", () => {
    it.each(
        facings.flatMap((from, fromIndex) =>
            facings.map((to, toIndex) => ({
                degrees: ((toIndex - fromIndex + 4) % 4) * 90,
                from,
                to,
            }))
        )
    )(
        "records $from to $to as $degrees clockwise-equivalent degrees",
        ({ degrees, from, to }) => {
            expect.hasAssertions();

            const api = runtime();
            const payload = { rotationFromFacing: from, rotationToFacing: to };
            const details = api.eventDetailsFromPayload_(
                payload,
                ["Rotation"],
                null
            );
            const saved = rotationRow(api, payload, "cardinal-pair-001", 2);

            expect(details).toMatchObject({
                rotationDegrees: degrees,
                rotationFromFacing: from,
                rotationToFacing: to,
            });
            expect(saved).toHaveLength(69);
            expect(saved[39]).toBe(degrees);
            expect(structuredClone(saved.slice(67))).toStrictEqual([from, to]);
        }
    );

    it("records an unknown starting facing without inventing a 90-degree turn", () => {
        expect.hasAssertions();

        const api = runtime();
        const saved = rotationRow(
            api,
            { rotationToFacing: "E" },
            "unknown-facing-001",
            2
        );

        expect(saved[39]).toBe("");
        expect(structuredClone(saved.slice(67))).toStrictEqual(["", "E"]);
        expect(api.webHistoryDetails_(saved)).toMatchObject({
            rotationToFacing: "E",
        });
        expect(api.webHistoryDetails_(saved)).not.toHaveProperty(
            "rotationDegrees"
        );
    });

    it("normalizes cardinal input while checking the supplied clockwise-equivalent degrees", () => {
        expect.hasAssertions();

        const details = runtime().eventDetailsFromPayload_(
            {
                rotationDegrees: 270,
                rotationFromFacing: " n ",
                rotationToFacing: " w ",
            },
            ["Rotation"],
            null
        );

        expect(details).toMatchObject({
            rotationDegrees: 270,
            rotationFromFacing: "N",
            rotationToFacing: "W",
        });
    });

    it.each([
        { rotationFromFacing: "N" },
        { rotationFromFacing: "N", rotationToFacing: "" },
        { rotationFromFacing: "NE", rotationToFacing: "E" },
        { rotationFromFacing: "N", rotationToFacing: "North" },
        { rotationDegrees: 90, rotationFromFacing: "", rotationToFacing: "E" },
        { rotationDegrees: 90, rotationFromFacing: "N", rotationToFacing: "W" },
        {
            rotationDegrees: 360,
            rotationFromFacing: "N",
            rotationToFacing: "N",
        },
    ])("rejects incomplete or inconsistent facing evidence: %j", (payload) => {
        expect.hasAssertions();

        expect(() =>
            runtime().eventDetailsFromPayload_(payload, ["Rotation"], null)
        ).toThrow(/facing|rotation/iv);
    });

    it.each([
        [{}, 90],
        [{ rotationDegrees: "" }, 90],
        [{ rotationDegrees: 45.5 }, 45.5],
        [{ rotationDegrees: 360 }, 360],
    ])("preserves legacy degree-only payload %j", (payload, degrees) => {
        expect.hasAssertions();

        const api = runtime();
        const saved = rotationRow(api, payload, "legacy-rotation-001", 2);

        expect(saved[39]).toBe(degrees);
        expect(structuredClone(saved.slice(67))).toStrictEqual(["", ""]);
    });

    it.each([
        0,
        -90,
        361,
        Infinity,
        "invalid",
    ])("rejects invalid legacy degrees %j", (rotationDegrees) => {
        expect.hasAssertions();

        expect(() =>
            runtime().eventDetailsFromPayload_(
                { rotationDegrees },
                ["Rotation"],
                null
            )
        ).toThrow(/rotation/iv);
    });

    it("ignores hidden rotation fields when Rotation is not selected", () => {
        expect.hasAssertions();

        const details = runtime().eventDetailsFromPayload_(
            {
                rotationDegrees: -90,
                rotationFromFacing: "bad",
                rotationToFacing: "bad",
            },
            ["Clean"],
            null
        );

        expect(details.rotationDegrees).toBe("");
        expect(details.rotationFromFacing ?? "").toBe("");
        expect(details.rotationToFacing ?? "").toBe("");
    });

    it("keeps original endpoints on retries and rejects different facing with the same numeric turn", () => {
        expect.hasAssertions();

        const api = runtime();
        const requestId = "rotation-retry-001";
        const input = rotationInput(
            api,
            { rotationFromFacing: "N", rotationToFacing: "E" },
            requestId
        );
        const saved = api.storedObservationRows_(input, requestId, 2, now);
        const changed = rotationInput(
            api,
            { rotationFromFacing: "S", rotationToFacing: "W" },
            requestId
        );

        expect(
            api.existingObservationResult_(input, requestId, [2], saved)
        ).toMatchObject({ duplicate: true });
        expect(() =>
            api.existingObservationResult_(changed, requestId, [2], saved)
        ).toThrow(/retry no longer matches/iv);
        expect(saved[0]?.[26]).toBe("rotation-retry-001:1:rotation");
        expect(structuredClone(saved[0]?.slice(67))).toStrictEqual(["N", "E"]);
    });
});

function appSheetRound() {
    /** @type {import("../logger-fixtures.d.ts").CellValue[]} */
    const row = Array.from({ length: 79 }, () => "");
    row[0] = "facing-round-001";
    row[1] = observedAt;
    row[2] = observedAt;
    row[3] = "Rotation";
    row[4] = "P01, P02, P03";
    row[77] = "W";
    return row;
}

function freezeFixture() {
    const row = appSheetRound();
    const state = {
        locked: false,
        missingRow: false,
        readbackFailure: false,
        releases: 0,
        unavailable: false,
    };
    /** @type {string[]} */
    const actions = [];
    const lock = {
        releaseLock() {
            state.locked = false;
            state.releases += 1;
            actions.push("release");
        },
        tryLock() {
            actions.push("lock");
            state.locked = !state.unavailable;
            return state.locked;
        },
    };
    const api = runtime({
        LockService: { getScriptLock: () => lock },
        SpreadsheetApp: {
            flush: () => {
                actions.push("flush");
            },
        },
    });
    const history = [
        rotationRow(api, { rotationToFacing: "N" }, "appsheet-origin-001", 2),
        rotationRow(api, { rotationToFacing: "S" }, "appsheet-origin-002", 3, {
            plantId: "P02",
        }),
    ];
    const readHistory = vi.fn(() => {
        actions.push("history");
        return history;
    });
    overrideAppsScript(api, "readHistorySnapshot_", readHistory);
    overrideAppsScript(
        api,
        "plantRecordsById_",
        () =>
            new Map([
                ["P01", { potSetup: 1 }],
                ["P02", { potSetup: 1 }],
                ["P03", { potSetup: 1 }],
            ])
    );
    overrideAppsScript(api, "saveWebObservationBatch", () => {
        throw new Error("Freezing origins must not write History");
    });
    const sheet = {
        getRange: (
            /** @type {number} */ rowNumber,
            /** @type {number} */ column,
            /** @type {number} */ count,
            /** @type {number} */ width
        ) => {
            if (
                rowNumber !== 2 ||
                count !== 1 ||
                ((column !== 1 || width !== 79) &&
                    (column !== 79 || width !== 1))
            )
                throw new Error("Unexpected snapshot range");
            return {
                getValue: () => {
                    actions.push("readback");
                    return state.readbackFailure ? "" : row[78];
                },
                getValues: () => {
                    actions.push("staging");
                    return state.missingRow ? [] : [[...row]];
                },
                setValue: (/** @type {string} */ value) => {
                    if (!state.locked)
                        throw new Error("Snapshot write lacks lock");
                    actions.push("write");
                    row[78] = value;
                },
            };
        },
    };
    return { actions, api, history, readHistory, row, sheet, state };
}

describe("appSheet frozen rotation origins", () => {
    it.each(["Water", "legacy rotation"])(
        "leaves %s rounds outside cardinal freezing",
        (kind) => {
            expect.hasAssertions();

            const model = freezeFixture();
            const row = [...model.row];
            row[3] = kind === "Water" ? "Water" : "Rotation";
            row[77] = "";

            expect(
                model.api.freezeAppSheetBulkRotation_(
                    {},
                    model.sheet,
                    2,
                    row,
                    "facing-round-001"
                )
            ).toBe(row);
            expect(model.actions).toStrictEqual([]);
        }
    );

    it("uses Started at when Observed at is blank and rejects missing or invalid dates", () => {
        expect.hasAssertions();

        const model = freezeFixture();
        model.row[2] = "";
        const frozen = model.api.freezeAppSheetBulkRotation_(
            {},
            model.sheet,
            2,
            [...model.row],
            "facing-round-001"
        );

        expect(
            model.api.appSheetBulkRotationSnapshot_(frozen, "facing-round-001")
                .observedAt
        ).toBe(observedAt.toISOString());

        model.row[78] = "";
        model.row[1] = "invalid date";

        expect(() =>
            model.api.freezeAppSheetBulkRotation_(
                {},
                model.sheet,
                2,
                [...model.row],
                "facing-round-001"
            )
        ).toThrow(/date and time/iv);
        expect(model.state.locked).toBe(false);
    });

    it("rejects a missing staging row and a selected plant absent from the current inventory", () => {
        expect.hasAssertions();

        const model = freezeFixture();
        model.state.missingRow = true;

        expect(() =>
            model.api.freezeAppSheetBulkRotation_(
                {},
                model.sheet,
                2,
                [...model.row],
                "facing-round-001"
            )
        ).toThrow(/changed while/iv);

        model.state.missingRow = false;
        overrideAppsScript(model.api, "plantRecordsById_", () => new Map());

        expect(() =>
            model.api.freezeAppSheetBulkRotation_(
                {},
                model.sheet,
                2,
                [...model.row],
                "facing-round-001"
            )
        ).toThrow(/plant id p01 is not valid/iv);
        expect(model.actions).not.toContain("write");
        expect(model.state).toMatchObject({ locked: false, releases: 2 });
    });

    it("reuses a concurrent snapshot found after acquiring the writer lock", () => {
        expect.hasAssertions();

        const model = freezeFixture();
        const stale = [...model.row];
        const frozen = model.api.freezeAppSheetBulkRotation_(
            {},
            model.sheet,
            2,
            [...model.row],
            "facing-round-001"
        );
        model.actions.length = 0;

        expect(
            model.api.freezeAppSheetBulkRotation_(
                {},
                model.sheet,
                2,
                stale,
                "facing-round-001"
            )[78]
        ).toBe(frozen[78]);
        expect(model.actions).toStrictEqual([
            "lock",
            "staging",
            "release",
        ]);
        expect(model.readHistory).toHaveBeenCalledTimes(1);
    });

    it.each([
        { version: 2 },
        { observedAt: "invalid" },
        { plantIds: ["P01", "P02"] },
        { rotationByPlant: null },
        { roundId: "another-round" },
        { toFacing: "E" },
    ])("rejects altered snapshot metadata %j", (overrides) => {
        expect.hasAssertions();

        const model = freezeFixture();
        const row = model.api.freezeAppSheetBulkRotation_(
            {},
            model.sheet,
            2,
            [...model.row],
            "facing-round-001"
        );
        const valid = model.api.appSheetBulkRotationSnapshot_(
            row,
            "facing-round-001"
        );
        row[78] = JSON.stringify({ ...valid, ...overrides });

        expect(() =>
            model.api.appSheetBulkRotationSnapshot_(row, "facing-round-001")
        ).toThrow(/separate rotation|snapshot/iv);
    });

    it.each([
        "",
        "{",
        "null",
        "[]",
        "{}",
        "x".repeat(20_001),
    ])("rejects malformed snapshot text %s", (snapshot) => {
        expect.hasAssertions();

        const api = runtime();
        const row = appSheetRound();
        row[78] = snapshot;

        expect(() =>
            api.appSheetBulkRotationSnapshot_(row, "facing-round-001")
        ).toThrow(/snapshot/iv);
    });

    it("rejects a per-plant target that differs from its bound round target", () => {
        expect.hasAssertions();

        const row = appSheetRound();
        row[78] = JSON.stringify({
            observedAt: observedAt.toISOString(),
            plantIds: [
                "P01",
                "P02",
                "P03",
            ],
            rotationByPlant: {
                P01: { rotationToFacing: "E" },
                P02: { rotationToFacing: "W" },
                P03: { rotationToFacing: "W" },
            },
            roundId: "facing-round-001",
            toFacing: "W",
            version: 1,
        });

        expect(() =>
            runtime().appSheetBulkRotationSnapshot_(row, "facing-round-001")
        ).toThrow(/target facing/iv);
    });

    it("freezes separate origins under lock and verifies persistence before expansion", () => {
        expect.hasAssertions();

        const model = freezeFixture();

        expect(() =>
            model.api.appSheetBulkRotationSnapshot_(
                model.row,
                "facing-round-001"
            )
        ).toThrow(/snapshot/iv);

        const frozen = model.api.freezeAppSheetBulkRotation_(
            {},
            model.sheet,
            2,
            [...model.row],
            "facing-round-001"
        );
        const snapshot = model.api.appSheetBulkRotationSnapshot_(
            frozen,
            "facing-round-001"
        );

        expect(model.actions).toStrictEqual([
            "lock",
            "staging",
            "history",
            "write",
            "flush",
            "readback",
            "release",
        ]);
        expect(model.state.locked).toBe(false);
        expect(snapshot.rotationByPlant["P01"]).toMatchObject({
            rotationDegrees: 270,
            rotationFromFacing: "N",
            rotationToFacing: "W",
        });
        expect(snapshot.rotationByPlant["P02"]).toMatchObject({
            rotationDegrees: 90,
            rotationFromFacing: "S",
            rotationToFacing: "W",
        });
        expect(snapshot.rotationByPlant["P03"]).toMatchObject({
            rotationDegrees: "",
            rotationFromFacing: "",
            rotationToFacing: "W",
        });
        expect(model.readHistory).toHaveBeenCalledTimes(1);
    });

    it("reuses persisted origins after later History changes without re-reading or locking", () => {
        expect.hasAssertions();

        const model = freezeFixture();
        const frozen = model.api.freezeAppSheetBulkRotation_(
            {},
            model.sheet,
            2,
            [...model.row],
            "facing-round-001"
        );
        const first = String(frozen[78]);
        model.history.push(
            rotationRow(
                model.api,
                { rotationToFacing: "W" },
                "later-origin-003",
                4
            )
        );
        model.actions.length = 0;

        const retried = model.api.freezeAppSheetBulkRotation_(
            {},
            model.sheet,
            2,
            [...model.row],
            "facing-round-001"
        );

        expect(retried[78]).toBe(first);
        expect(model.actions).toStrictEqual([]);
        expect(model.readHistory).toHaveBeenCalledTimes(1);
        expect(
            model.api.appSheetBulkRotationSnapshot_(retried, "facing-round-001")
                .rotationByPlant["P01"]?.rotationDegrees
        ).toBe(270);
    });

    it.each([
        {
            index: 0,
            kind: "round",
            roundId: "another-round-002",
            value: "facing-round-001",
        },
        { index: 77, kind: "target", roundId: "facing-round-001", value: "E" },
        {
            index: 4,
            kind: "selection",
            roundId: "facing-round-001",
            value: "P01, P02",
        },
        {
            index: 2,
            kind: "date",
            roundId: "facing-round-001",
            value: new Date("2026-11-13T16:00:00Z"),
        },
    ])(
        "rejects $kind drift against a frozen snapshot",
        ({ index, roundId, value }) => {
            expect.hasAssertions();

            const model = freezeFixture();
            const frozen = model.api.freezeAppSheetBulkRotation_(
                {},
                model.sheet,
                2,
                [...model.row],
                "facing-round-001"
            );
            const changed = [...frozen];
            changed[index] = value;

            expect(() =>
                model.api.appSheetBulkRotationSnapshot_(changed, roundId)
            ).toThrow(/no longer matches/iv);
        }
    );

    it("releases the lock after failed readback and keeps the uncertain snapshot for a safe retry", () => {
        expect.hasAssertions();

        const model = freezeFixture();
        model.state.readbackFailure = true;

        expect(() =>
            model.api.freezeAppSheetBulkRotation_(
                {},
                model.sheet,
                2,
                [...model.row],
                "facing-round-001"
            )
        ).toThrow(/could not be confirmed/iv);
        expect(model.state).toMatchObject({ locked: false, releases: 1 });
        expect(model.row[78]).toBeTypeOf("string");
        expect(String(model.row[78])).toContain("rotationByPlant");
        expect(model.actions.at(-1)).toBe("release");
    });

    it("fails before any snapshot write when the lock is busy or the staging row changed", () => {
        expect.hasAssertions();

        const model = freezeFixture();
        model.state.unavailable = true;

        expect(() =>
            model.api.freezeAppSheetBulkRotation_(
                {},
                model.sheet,
                2,
                [...model.row],
                "facing-round-001"
            )
        ).toThrow(/another reading/iv);
        expect(model.actions).toStrictEqual(["lock"]);

        model.state.unavailable = false;
        const stale = [...model.row];
        model.row[77] = "E";

        expect(() =>
            model.api.freezeAppSheetBulkRotation_(
                {},
                model.sheet,
                2,
                stale,
                "facing-round-001"
            )
        ).toThrow(/changed while/iv);
        expect(model.row[78]).toBe("");
        expect(model.state).toMatchObject({ locked: false, releases: 1 });
        expect(model.readHistory).not.toHaveBeenCalled();
    });
});

describe("recorded facing read model", () => {
    it("selects dated active current-setup facing evidence without mutating its source", () => {
        expect.hasAssertions();

        const api = runtime();
        const rows = [
            rotationRow(
                api,
                { rotationFromFacing: "E", rotationToFacing: "S" },
                "current-facing-001",
                2,
                { potSetup: 2 }
            ),
            rotationRow(
                api,
                { rotationToFacing: "W" },
                "old-setup-facing-002",
                3
            ),
            rotationRow(
                api,
                { rotationToFacing: "N" },
                "future-facing-003",
                4,
                {
                    observationDate: new Date("2026-11-15T12:00:00Z"),
                    potSetup: 2,
                }
            ),
            rotationRow(
                api,
                { rotationToFacing: "E" },
                "removed-facing-004",
                5,
                {
                    observationDate: new Date("2026-11-13T12:00:00Z"),
                    potSetup: 2,
                }
            ),
            rotationRow(
                api,
                { rotationToFacing: "W" },
                "invalid-facing-005",
                6,
                { observationDate: new Date(NaN), potSetup: 2 }
            ),
        ];
        required(rows[3])[35] = "Removed";
        const before = structuredClone(rows);
        const model = api.webRotationReadModelsFromRows_(
            rows,
            new Map([
                ["P01", 2],
                ["P02", 1],
            ]),
            now
        );

        expect(structuredClone(model.get("P01"))).toStrictEqual({
            facing: "S",
            observationId: "current-facing-001:1:rotation",
            observedAt: observedAt.toISOString(),
            potSetup: 2,
        });
        expect(model.get("P02")?.facing ?? "").toBe("");
        expect(structuredClone(rows)).toStrictEqual(before);
    });

    it("withholds a prior absolute facing after a newer degree-only rotation", () => {
        expect.hasAssertions();

        const api = runtime();
        const rows = [
            rotationRow(api, { rotationToFacing: "N" }, "facing-anchor-001", 2),
            rotationRow(api, { rotationDegrees: 90 }, "legacy-later-002", 3, {
                observationDate: new Date("2026-11-13T12:00:00Z"),
            }),
        ];
        const model = api.webRotationReadModelsFromRows_(
            rows,
            new Map([["P01", 1]]),
            now
        );

        expect(model.get("P01")).toMatchObject({
            facing: "",
            observationId: "legacy-later-002:1:rotation",
            observedAt: "2026-11-13T12:00:00.000Z",
        });
    });

    it("uses observation time for backdated entries and correction-root order for ties", () => {
        expect.hasAssertions();

        const api = runtime();
        const original = rotationRow(
            api,
            { rotationToFacing: "N" },
            "facing-original-001",
            2
        );
        const later = rotationRow(
            api,
            { rotationFromFacing: "N", rotationToFacing: "E" },
            "facing-later-002",
            3
        );
        const corrected = rotationRow(
            api,
            { rotationToFacing: "S" },
            "facing-correction-003",
            4,
            { correctedObservationId: String(original[26]) }
        );
        original[35] = "Removed";
        const backdated = rotationRow(
            api,
            { rotationToFacing: "W" },
            "facing-backdated-004",
            5,
            { observationDate: new Date("2026-11-11T12:00:00Z") }
        );
        const rows = [
            original,
            later,
            corrected,
            backdated,
        ];
        const baseline = new Map([["P01", 1]]);

        expect(
            api.webRotationReadModelsFromRows_(rows, baseline, now).get("P01")
                ?.facing
        ).toBe("E");
        expect(
            api
                .webRotationReadModelsFromRows_(
                    rows,
                    baseline,
                    new Date("2026-11-11T13:00:00Z")
                )
                .get("P01")?.facing
        ).toBe("W");

        later[35] = "Removed";

        expect(
            api.webRotationReadModelsFromRows_(rows, baseline, now).get("P01")
                ?.facing
        ).toBe("S");
        expect(
            api
                .webRotationReadModelsFromRows_(
                    rows,
                    new Map([["P01", 2]]),
                    now
                )
                .get("P01")?.facing ?? ""
        ).toBe("");
    });
});

describe("frozen per-plant bulk rotations", () => {
    it("passes each frozen origin to the canonical batch and preserves them across retries", () => {
        expect.hasAssertions();

        const api = runtime();
        const batch = vi.fn(() => ({
            results: [
                { ok: true },
                { ok: true },
                { ok: true },
            ],
        }));
        overrideAppsScript(api, "getGardenSpreadsheet_", () => ({}));
        overrideAppsScript(
            api,
            "plantRecordsById_",
            () =>
                new Map([
                    ["P01", { id: "P01", potSetup: 1 }],
                    ["P02", { id: "P02", potSetup: 1 }],
                    ["P03", { id: "P03", potSetup: 1 }],
                ])
        );
        overrideAppsScript(api, "saveWebObservationBatch", batch);
        const payload = {
            events: ["Rotation"],
            observedAt,
            plantIds: [
                "P01",
                "P02",
                "P03",
            ],
            requestId: "frozen-bulk-round-001",
            rotationByPlant: {
                P01: { rotationFromFacing: "N", rotationToFacing: "W" },
                P02: { rotationFromFacing: "S", rotationToFacing: "W" },
                P03: { rotationFromFacing: "", rotationToFacing: "W" },
            },
        };

        expect(api.saveBulkCareObservation(payload)).toMatchObject({
            ok: true,
            plantCount: 3,
        });
        expect(batch).toHaveBeenCalledWith([
            expect.objectContaining({
                plantId: "P01",
                requestId: "frozen-bulk-round-001-P01",
                rotationDegrees: 270,
                rotationFromFacing: "N",
                rotationToFacing: "W",
            }),
            expect.objectContaining({
                plantId: "P02",
                requestId: "frozen-bulk-round-001-P02",
                rotationDegrees: 90,
                rotationFromFacing: "S",
                rotationToFacing: "W",
            }),
            expect.objectContaining({
                plantId: "P03",
                requestId: "frozen-bulk-round-001-P03",
                rotationDegrees: "",
                rotationFromFacing: "",
                rotationToFacing: "W",
            }),
        ]);

        api.saveBulkCareObservation(payload);

        expect(batch).toHaveBeenCalledTimes(2);
        expect(batch.mock.calls[1]).toStrictEqual(batch.mock.calls[0]);

        const legacyPayload = {
            events: payload.events,
            observedAt: payload.observedAt,
            plantIds: payload.plantIds,
            requestId: payload.requestId,
        };
        batch.mockClear();

        expect(() =>
            api.saveBulkCareObservation({
                ...legacyPayload,
                rotationFromFacing: "N",
                rotationToFacing: "W",
            })
        ).toThrow(/separate from\/to/iv);
        expect(batch).not.toHaveBeenCalled();
    });

    it("calculates each selected plant independently and preserves unknown origins", () => {
        expect.hasAssertions();

        const entries = {
            P01: { rotationFromFacing: "N", rotationToFacing: "W" },
            P02: { rotationFromFacing: "S", rotationToFacing: "W" },
            P03: { rotationFromFacing: "", rotationToFacing: "W" },
        };
        const before = structuredClone(entries);
        const validated = runtime().rotationByPlantDetails_(entries, [
            "P01",
            "P02",
            "P03",
        ]);

        expect(validated.get("P01")).toMatchObject({
            rotationDegrees: 270,
            rotationFromFacing: "N",
            rotationToFacing: "W",
        });
        expect(validated.get("P02")).toMatchObject({
            rotationDegrees: 90,
            rotationFromFacing: "S",
            rotationToFacing: "W",
        });
        expect(validated.get("P03")).toMatchObject({
            rotationDegrees: "",
            rotationFromFacing: "",
            rotationToFacing: "W",
        });
        expect(entries).toStrictEqual(before);
    });

    it.each([
        null,
        "not an object",
        [],
        { P01: { rotationToFacing: "E" } },
        {
            P01: { rotationToFacing: "E" },
            P02: { rotationToFacing: "E" },
            P03: { rotationToFacing: "E" },
        },
        { P01: { rotationToFacing: "E" }, P02: null },
        { P01: { rotationToFacing: "E" }, P02: "E" },
        { P01: { rotationToFacing: "E" }, P02: [] },
        { P01: { rotationToFacing: "E" }, P02: { rotationFromFacing: "N" } },
        {
            P01: { rotationToFacing: "E" },
            P02: { extra: true, rotationToFacing: "E" },
        },
        { P01: { rotationToFacing: "E" }, P03: { rotationToFacing: "E" } },
        {
            P01: { rotationToFacing: "E" },
            P02: {
                rotationDegrees: 90,
                rotationFromFacing: "N",
                rotationToFacing: "W",
            },
        },
    ])(
        "rejects missing, extra or malformed per-plant snapshots: %j",
        (value) => {
            expect.hasAssertions();

            expect(() =>
                runtime().rotationByPlantDetails_(value, ["P01", "P02"])
            ).toThrow(/facing|plant|rotation/iv);
        }
    );
});
