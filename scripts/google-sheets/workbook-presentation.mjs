export const workbookFont = "JetBrains Mono";

/**
 * One-time, native presentation migration. First back up the workbook and scan
 * every sheet for Daily care name/gid references; only Dashboard U3/W3 and
 * Integrity B12 may refer to it externally. Supply fresh native metadata and
 * cells including Daily care A1, Dashboard U3/W3, Integrity B12 and RO A19:M19.
 * This does not change observations, validation, chart positions or tab order.
 *
 * @param {import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot} snapshot
 * @param {number[]} [nativeUiChartIds] Charts whose formatting must be edited
 *   in the native editor because the Sheets API drops their axis-title colors.
 *
 * @returns {Record<string, unknown>[]}
 */
export function buildWorkbookPresentationRequests(
    { cells, metadata },
    nativeUiChartIds = []
) {
    /** @param {string} name */
    const sheet = (name) => {
        const found = metadata.sheets.find(
            (item) => item.properties.title === name
        );
        if (!found)
            throw new Error(`Missing ${name}; do not replay retirement`);
        return found;
    };
    /** @param {string} name @param {number} row @param {number} column */
    const cell = (name, row, column) =>
        cells.find(
            (item) =>
                item.sheet === name &&
                item.row === row &&
                item.column === column
        )?.value;
    if (cell("Daily care", 0, 0)?.stringValue !== "Daily care · read-only")
        throw new Error("Unexpected Daily care destination");
    const daily = sheet("Daily care");
    const dashboard = sheet("Dashboard");
    const integrity = sheet("Integrity");
    const ro = sheet("RO refills");
    const quick = sheet("Quick log");
    const roHeaders = [
        "Refill date",
        "5 gal carboy (gal)",
        "5 gal carboy used up on",
        "5.3 gal carboy (gal)",
        "5.3 gal carboy used up on",
        "3 gal jug (gal)",
        "3 gal jug used up on",
        "5 gal jug (gal)",
        "5 gal jug used up on",
        "Total refilled (gal)",
        "Water type",
        "Supplier / location",
        "Notes",
    ];
    if (
        roHeaders.some(
            (header, index) =>
                cell("RO refills", 18, index)?.stringValue !== header
        )
    )
        throw new Error("Unexpected RO refill headers; review editable ranges");
    const oldLink = `#gid=${daily.properties.sheetId}&range=A73`;
    const newLink = `#gid=${integrity.properties.sheetId}&range=A4:D21`;
    const oldScan = ",ARRAYFORMULA(N(ISERROR('Daily care'!I40:N70)))";
    const scan = cell("Integrity", 11, 1)?.formulaValue;
    if (
        scan?.includes(oldScan) !== true ||
        scan.split("'Daily care'!").length !== 2
    )
        throw new Error("Unexpected Integrity scan; review before retirement");
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    for (const column of [20, 22]) {
        const formula = cell("Dashboard", 2, column)?.formulaValue;
        if (formula?.startsWith(`=HYPERLINK("${oldLink}",`) !== true)
            throw new Error("Unexpected Dashboard check link");
        requests.push({
            updateCells: {
                fields: "userEnteredValue",
                rows: [
                    {
                        values: [
                            {
                                userEnteredValue: {
                                    formulaValue: formula.replace(
                                        oldLink,
                                        () => newLink
                                    ),
                                },
                            },
                        ],
                    },
                ],
                start: {
                    columnIndex: column,
                    rowIndex: 2,
                    sheetId: dashboard.properties.sheetId,
                },
            },
        });
    }
    requests.push({
        updateCells: {
            fields: "userEnteredValue",
            rows: [
                {
                    values: [
                        {
                            userEnteredValue: {
                                formulaValue: scan.replace(oldScan, ""),
                            },
                        },
                    ],
                },
            ],
            start: {
                columnIndex: 1,
                rowIndex: 11,
                sheetId: integrity.properties.sheetId,
            },
        },
    });
    for (const item of metadata.sheets) {
        const { sheetId } = item.properties;
        if (sheetId === daily.properties.sheetId) continue;
        requests.push(
            {
                repeatCell: {
                    cell: {
                        userEnteredFormat: {
                            textFormat: { fontFamily: workbookFont },
                        },
                    },
                    fields: "userEnteredFormat.textFormat.fontFamily",
                    range: { sheetId },
                },
            },
            ...chartFontRequests(item.charts, nativeUiChartIds),
            ...sheetProtectionRequests(item, ro.properties.sheetId)
        );
    }
    requests.push(
        {
            updateSheetProperties: {
                fields: "hidden",
                properties: { hidden: true, sheetId: quick.properties.sheetId },
            },
        },
        { deleteSheet: { sheetId: daily.properties.sheetId } }
    );
    return requests;
}

/**
 * Preserve the complete native chart specification, including chart-specific
 * settings and colors. Explicit text formats override ChartSpec.fontName.
 *
 * @template {object} T
 *
 * @param {T} specification
 *
 * @returns {T & { fontName: string }}
 */
export function withWorkbookChartFont(specification) {
    const result = {
        ...structuredClone(specification),
        fontName: workbookFont,
    };
    /** @param {unknown} value */
    function visit(value) {
        if (value === null || typeof value !== "object") return;
        if (Array.isArray(value)) {
            for (const child of value) visit(child);
            return;
        }
        const record = /** @type {Record<string, unknown>} */ (value);
        for (const [key, child] of Object.entries(record)) {
            if (key === "fontFamily") record[key] = workbookFont;
            else visit(child);
        }
    }
    visit(result);
    return result;
}

/**
 * @param {import("../../test/workbook-fixtures.d.ts").SheetMetadata["charts"]} charts
 * @param {number[]} nativeUiChartIds
 */
function chartFontRequests(charts, nativeUiChartIds) {
    return (charts ?? [])
        .filter((chart) => !nativeUiChartIds.includes(chart.chartId))
        .map((chart) => ({
            updateChartSpec: {
                chartId: chart.chartId,
                spec: withWorkbookChartFont(chart.spec),
            },
        }));
}

/**
 * @param {import("../../test/workbook-fixtures.d.ts").SheetMetadata} item
 * @param {number} roSheetId
 *
 * @returns {Record<string, unknown>[]}
 */
function sheetProtectionRequests(item, roSheetId) {
    const { sheetId, title } = item.properties;
    const whole = item.protectedRanges?.find((protection) =>
        Object.keys(protection.range).every((key) => key === "sheetId")
    );
    const unprotectedRanges =
        sheetId === roSheetId
            ? [
                  {
                      endColumnIndex: 9,
                      sheetId,
                      startColumnIndex: 0,
                      startRowIndex: 19,
                  },
                  {
                      endColumnIndex: 13,
                      sheetId,
                      startColumnIndex: 10,
                      startRowIndex: 19,
                  },
              ]
            : [];
    if (!whole)
        return [
            {
                addProtectedRange: {
                    protectedRange: {
                        description: `Garden workbook · ${title} · confirm manual edits`,
                        range: { sheetId },
                        unprotectedRanges,
                        warningOnly: true,
                    },
                },
            },
        ];
    if (sheetId === roSheetId)
        return [
            {
                updateProtectedRange: {
                    fields: "unprotectedRanges",
                    protectedRange: {
                        protectedRangeId: whole.protectedRangeId,
                        unprotectedRanges,
                    },
                },
            },
        ];
    return [];
}
