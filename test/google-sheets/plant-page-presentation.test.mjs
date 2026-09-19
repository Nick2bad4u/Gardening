import { describe, expect, it } from "vitest";

import palette from "../../scripts/google-sheets/plant-colors.json" with { type: "json" };
import {
    assertPlantPagePresentationPreconditions,
    buildPlantPagePresentationRequests,
} from "../../scripts/google-sheets/plant-page-presentation.mjs";

/**
 * Apply only the three supported request types with their actual field masks.
 *
 * @param {import("../../types/plant-page-presentation.js").PlantPagePresentationSnapshot} snapshot
 * @param {Record<string, unknown>[]} requests
 */
function apply(snapshot, requests) {
    for (const request of requests) {
        if (request["repeatCell"] !== undefined) {
            const update =
                /**
                 * @type {{
                 *     range: import("../../types/plant-page-presentation.js").PageRange;
                 *     cell: Record<string, unknown>;
                 *     fields: string;
                 * }}
                 */ (request["repeatCell"]);
            const page = required(
                snapshot.sheets.find(
                    ({ properties }) =>
                        properties.sheetId === update.range.sheetId
                )
            );
            applyFormat(page, update);
        } else if (request["updateCells"] !== undefined) {
            const update =
                /**
                 * @type {{
                 *     start: {
                 *         sheetId: number;
                 *         rowIndex: number;
                 *         columnIndex: number;
                 *     };
                 *     rows: {
                 *         values: {
                 *             userEnteredValue: { stringValue: string };
                 *         }[];
                 *     }[];
                 *     fields: string;
                 * }}
                 */ (request["updateCells"]);
            const page = required(
                snapshot.sheets.find(
                    ({ properties }) =>
                        properties.sheetId === update.start.sheetId
                )
            );
            const target = required(
                required(required(page.data[0]).rowData[update.start.rowIndex])
                    .values?.[update.start.columnIndex]
            );
            target.userEnteredValue = structuredClone(
                required(required(update.rows[0]).values[0]).userEnteredValue
            );
            target.formattedValue = required(
                target.userEnteredValue.stringValue
            );
        } else if (request["updateDimensionProperties"] === undefined) {
            throw new Error("Unexpected mutation kind");
        } else {
            const update =
                /**
                 * @type {{
                 *     range: {
                 *         sheetId: number;
                 *         startIndex: number;
                 *         endIndex: number;
                 *         dimension: string;
                 *     };
                 *     properties: { pixelSize: number };
                 * }}
                 */ (request["updateDimensionProperties"]);
            if (update.range.dimension !== "ROWS")
                throw new Error("Unexpected column mutation");
            const page = required(
                snapshot.sheets.find(
                    ({ properties }) =>
                        properties.sheetId === update.range.sheetId
                )
            );
            for (
                let index = update.range.startIndex;
                index < update.range.endIndex;
                index++
            )
                required(required(page.data[0]).rowMetadata[index]).pixelSize =
                    update.properties.pixelSize;
        }
    }
}

/** @returns {import("../../types/plant-page-presentation.js").PlantPagePresentationSnapshot} */
function fixture() {
    const labels = new Map([
        [14, "Watering history"],
        [15, "Latest gap (days)"],
        [16, "Median gap (days)"],
        [17, "Shortest gap (days)"],
        [18, "Longest gap (days)"],
        [19, "Completed intervals"],
        [21, "Latest recorded evidence"],
        [22, "Photo"],
        [23, "Photo observed"],
        [24, "Condition"],
        [25, "Condition observed"],
        [26, "Evidence source"],
        [27, "Observation notes"],
        [29, "Feeding history"],
        [30, "Last recorded feed"],
        [31, "Product"],
        [32, "Recorded dose"],
        [33, "Plain-water events after feed time"],
        [35, "Calculated as of"],
        [36, "Care plan"],
        [38, "Dimension evidence"],
    ]);
    return {
        sheets: Array.from({ length: palette.length }, (_, index) => {
            const id = `P${String(index + 1).padStart(2, "0")}`;
            /** @type {import("../../types/plant-page-presentation.js").PageCell[][]} */
            const cells = Array.from({ length: 38 }, () =>
                Array.from({ length: 10 }, () => ({}))
            );
            const put = (
                /** @type {number} */ row,
                /** @type {number} */ column,
                /** @type {import("../../types/plant-page-presentation.js").PageCell} */ value
            ) => {
                const target = cells[row];
                if (!target) throw new Error("Fixture row missing");
                target[column] = value;
            };
            put(0, 0, {
                userEnteredFormat: {
                    backgroundColorStyle: {
                        rgbColor: { blue: 0.1, green: 0.2, red: 0.1 },
                    },
                    textFormat: { fontSize: 18 },
                },
                userEnteredValue: { stringValue: `${id} · Synthetic plant` },
            });
            for (const [row, column] of [
                [2, 0],
                [2, 3],
                [2, 6],
                [10, 0],
                [11, 0],
                [11, 6],
            ])
                put(row ?? 0, column ?? 0, {
                    formattedValue: "Open link",
                    userEnteredValue: {
                        formulaValue:
                            '=HYPERLINK("https://example.com","Open link")',
                    },
                });
            put(8, 4, {
                formattedValue:
                    "Long factual condition remains fully readable in the narrow top panel without replacing any observation.",
                userEnteredValue: { formulaValue: '=IF(TRUE,"condition","")' },
            });
            const merges = [
                {
                    endColumnIndex: 10,
                    endRowIndex: 1,
                    startColumnIndex: 0,
                    startRowIndex: 0,
                },
                {
                    endColumnIndex: 6,
                    endRowIndex: 9,
                    startColumnIndex: 4,
                    startRowIndex: 8,
                },
            ];
            for (const [row, label] of labels) {
                put(row - 1, 0, { userEnteredValue: { stringValue: label } });
                put(row - 1, 3, {
                    dataValidation: {
                        condition: {
                            type: "NUMBER_GREATER",
                            values: [{ userEnteredValue: "0" }],
                        },
                    },
                    formattedValue:
                        row === 27
                            ? "Recorded evidence and its limitations must remain readable. ".repeat(
                                  18
                              )
                            : "Synthetic value",
                    note: "Preserve this note",
                    userEnteredFormat: {
                        numberFormat: {
                            pattern:
                                row === 23 ? "mmm d, yyyy h:mm am/pm" : "0.000",
                            type: row === 23 ? "DATE_TIME" : "NUMBER",
                        },
                        textFormat: { link: { uri: "https://example.com" } },
                    },
                    userEnteredValue: [
                        14,
                        21,
                        29,
                    ].includes(row)
                        ? { stringValue: "Recorded facts only" }
                        : { formulaValue: `=IF(TRUE,"${id}","")` },
                });
                merges.push(
                    {
                        endColumnIndex: 3,
                        endRowIndex: row,
                        startColumnIndex: 0,
                        startRowIndex: row - 1,
                    },
                    {
                        endColumnIndex: 10,
                        endRowIndex: row,
                        startColumnIndex: 3,
                        startRowIndex: row - 1,
                    }
                );
            }
            return {
                data: [
                    {
                        columnMetadata: [
                            150,
                            115,
                            120,
                            105,
                            105,
                            105,
                            105,
                            180,
                            300,
                            190,
                        ].map((pixelSize, column) => ({
                            hiddenByUser: column === 9,
                            pixelSize,
                        })),
                        rowData: cells.map((values) => ({ values })),
                        rowMetadata: Array.from({ length: 38 }, () => ({
                            pixelSize: 21,
                        })),
                    },
                ],
                merges,
                properties: {
                    gridProperties: { columnCount: 22, rowCount: 5139 },
                    sheetId: index + 1,
                    title: `${id} Synthetic plant`,
                },
            };
        }),
    };
}

/** @param {unknown} source @param {string[]} path @returns {unknown} */
function readField(source, path) {
    let value = source;
    for (const key of path) {
        if (value === null || typeof value !== "object") return undefined;
        value = /** @type {Record<string, unknown>} */ (value)[key];
    }
    return value;
}

/** @template T @param {T | undefined} value @returns {T} */
function required(value) {
    if (value === undefined) throw new Error("Incomplete fixture");
    return value;
}

/**
 * @param {Record<string, unknown>} target @param {string[]} path @param
 *   {unknown} value
 */
function writeField(target, path, value) {
    let current = target;
    const parents = path.slice(0, -1);
    for (const key of parents) {
        current[key] ??= {};
        current = /** @type {Record<string, unknown>} */ (current[key]);
    }
    current[required(path.at(-1))] = structuredClone(value);
}

describe("plant-page presentation", () => {
    it("treats native omitted covered-cell formats as a no-op but still detects anchor and ordinary-cell drift", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        apply(snapshot, buildPlantPagePresentationRequests(snapshot).requests);
        for (const page of snapshot.sheets) {
            const grid = required(page.data[0]);
            for (const merge of page.merges) {
                for (
                    let column = merge.startColumnIndex + 1;
                    column < merge.endColumnIndex;
                    column += 1
                )
                    delete required(
                        required(grid.rowData[merge.startRowIndex]).values?.[
                            column
                        ]
                    ).userEnteredFormat;
            }
        }

        expect(
            buildPlantPagePresentationRequests(snapshot).requests
        ).toStrictEqual([]);

        const grid = required(required(snapshot.sheets[0]).data[0]);
        required(required(grid.rowData[13]).values?.[0]).userEnteredFormat = {
            textFormat: { fontFamily: "Roboto" },
        };

        const anchorRequest = buildPlantPagePresentationRequests(
            snapshot
        ).requests.find(
            (request) =>
                readField(request, [
                    "repeatCell",
                    "range",
                    "startRowIndex",
                ]) === 13
        );

        expect(anchorRequest).toMatchObject({
            repeatCell: {
                range: { sheetId: 1, startColumnIndex: 0, startRowIndex: 13 },
            },
        });

        required(required(grid.rowData[4]).values?.[0]).userEnteredFormat = {
            wrapStrategy: "CLIP",
        };

        const ordinaryRequest = buildPlantPagePresentationRequests(
            snapshot
        ).requests.find(
            (request) =>
                readField(request, [
                    "repeatCell",
                    "range",
                    "startRowIndex",
                ]) === 0
        );

        expect(ordinaryRequest).toMatchObject({
            repeatCell: {
                range: { sheetId: 1, startColumnIndex: 0, startRowIndex: 0 },
            },
        });
    });

    it.each([
        { textFormatRuns: [{ format: { bold: true }, startIndex: 0 }] },
        {
            userEnteredFormat: {
                textFormat: { link: { uri: "https://example.com" } },
            },
        },
    ])(
        "rejects icon rewrites that would clear rich text or links: %#",
        (extra) => {
            expect.hasAssertions();

            const rich = fixture();
            const grid = required(required(rich.sheets[0]).data[0]);
            const label = required(required(grid.rowData[13]).values?.[0]);
            Object.assign(label, extra);

            expect(() => buildPlantPagePresentationRequests(rich)).toThrow(
                "Review rich text or linked label"
            );
        }
    );

    it("preserves formulas, source facts, links, number formats, validations, merges and columns", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const original = structuredClone(snapshot);
        const plan = buildPlantPagePresentationRequests(snapshot);

        expect(snapshot).toStrictEqual(original);

        apply(snapshot, plan.requests);
        for (const [index, page] of snapshot.sheets.entries()) {
            const before = required(original.sheets[index]);

            expect(page.merges).toStrictEqual(before.merges);
            expect(required(page.data[0]).columnMetadata).toStrictEqual(
                required(before.data[0]).columnMetadata
            );

            for (let row = 0; row < 38; row++) {
                for (let column = 0; column < 10; column++) {
                    const prior = required(
                        required(required(before.data[0]).rowData[row])
                            .values?.[column]
                    );
                    const after = required(
                        required(required(page.data[0]).rowData[row]).values?.[
                            column
                        ]
                    );

                    expect(after.userEnteredValue?.formulaValue).toBe(
                        prior.userEnteredValue?.formulaValue
                    );
                    expect(after.note).toBe(prior.note);
                    expect(after.dataValidation).toStrictEqual(
                        prior.dataValidation
                    );
                    expect(
                        after.userEnteredFormat?.["numberFormat"]
                    ).toStrictEqual(prior.userEnteredFormat?.["numberFormat"]);
                    expect(
                        readField(after, [
                            "userEnteredFormat",
                            "textFormat",
                            "link",
                        ])
                    ).toStrictEqual(
                        readField(prior, [
                            "userEnteredFormat",
                            "textFormat",
                            "link",
                        ])
                    );
                }
            }

            expect(
                required(required(page.data[0]).rowData[0]).values?.[0]
                    ?.userEnteredFormat?.["backgroundColorStyle"]
            ).toStrictEqual(
                required(required(before.data[0]).rowData[0]).values?.[0]
                    ?.userEnteredFormat?.["backgroundColorStyle"]
            );
        }

        expect(
            buildPlantPagePresentationRequests(snapshot).requests
        ).toStrictEqual([]);
    });

    it("fits long notes using visible merged width, keeps narrow top conditions readable, and never shrinks owner rows", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        required(
            required(required(snapshot.sheets[0]).data[0]).rowMetadata[14]
        ).pixelSize = 180;
        const { rowHeights } = buildPlantPagePresentationRequests(snapshot);

        expect(
            rowHeights.find(({ row, sheetId }) => sheetId === 1 && row === 27)
                ?.pixelSize
        ).toBeGreaterThan(160);
        expect(
            rowHeights.find(({ row, sheetId }) => sheetId === 1 && row === 9)
                ?.pixelSize
        ).toBeGreaterThan(90);
        expect(
            rowHeights.find(({ row, sheetId }) => sheetId === 1 && row === 15)
                ?.pixelSize
        ).toBe(180);
    });

    it("rejects unknown labels, missing summary formulas, changed merges and hidden content", () => {
        expect.hasAssertions();

        const mutations = [
            (
                /** @type {import("../../types/plant-page-presentation.js").PresentationPage} */ page
            ) => {
                required(
                    required(required(page.data[0]).rowData[13]).values?.[0]
                ).userEnteredValue = { stringValue: "Owner custom heading" };
            },
            (
                /** @type {import("../../types/plant-page-presentation.js").PresentationPage} */ page
            ) => {
                required(
                    required(required(page.data[0]).rowData[14]).values?.[3]
                ).userEnteredValue = { numberValue: 12 };
            },
            (
                /** @type {import("../../types/plant-page-presentation.js").PresentationPage} */ page
            ) => {
                page.merges.pop();
            },
            (
                /** @type {import("../../types/plant-page-presentation.js").PresentationPage} */ page
            ) => {
                required(
                    required(page.data[0]).columnMetadata[4]
                ).hiddenByUser = true;
            },
        ];
        for (const mutate of mutations) {
            const snapshot = fixture();
            mutate(required(snapshot.sheets[0]));

            expect(() => buildPlantPagePresentationRequests(snapshot)).toThrow(
                /Missing summary formula|Review summary merge|Review visible columns|Unexpected label/v
            );
        }
    });

    it("allows changed calculated displays but rejects stale formula and dimension plans", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const { preconditions } = buildPlantPagePresentationRequests(snapshot);
        // Rehearsal plans are saved as JSON and reloaded before native writes.
        const serialized = JSON.stringify(preconditions);
        const reloaded = /** @type {typeof preconditions} */ (
            JSON.parse(serialized)
        );

        expect(() => {
            assertPlantPagePresentationPreconditions(snapshot, reloaded);
        }).not.toThrow();

        const grid = required(required(snapshot.sheets[0]).data[0]);
        required(required(grid.rowData[14]).values?.[3]).formattedValue =
            "New cached value";

        expect(() => {
            assertPlantPagePresentationPreconditions(snapshot, preconditions);
        }).not.toThrow();

        required(required(grid.rowData[14]).values?.[3]).userEnteredValue = {
            formulaValue: "=123",
        };

        expect(() => {
            assertPlantPagePresentationPreconditions(snapshot, preconditions);
        }).toThrow("changed");

        const dimensions = fixture();
        required(
            required(required(dimensions.sheets[0]).data[0]).rowMetadata[0]
        ).pixelSize = 70;

        expect(() => {
            assertPlantPagePresentationPreconditions(dimensions, preconditions);
        }).toThrow("changed");
    });
});

/**
 * @param {import("../../types/plant-page-presentation.js").PresentationPage} page
 * @param {{
 *     range: import("../../types/plant-page-presentation.js").PageRange;
 *     cell: Record<string, unknown>;
 *     fields: string;
 * }} update
 */
function applyFormat(page, update) {
    const grid = required(page.data[0]);
    for (
        let row = update.range.startRowIndex;
        row < update.range.endRowIndex;
        row += 1
    ) {
        for (
            let column = update.range.startColumnIndex;
            column < update.range.endColumnIndex;
            column += 1
        ) {
            const target = required(
                required(grid.rowData[row]).values?.[column]
            );
            for (const field of update.fields.split(","))
                writeField(
                    /** @type {Record<string, unknown>} */ (target),
                    field.split("."),
                    readField(update.cell, field.split("."))
                );
        }
    }
}
