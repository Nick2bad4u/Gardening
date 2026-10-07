/** @typedef {import("../../test/workbook-fixtures.d.ts").GridRange} GridRange */
/** @typedef {{ range: GridRange; [key: string]: unknown }} Filter */
/** @typedef {{ ranges: GridRange[]; [key: string]: unknown }} Rule */
/**
 * @typedef {{
 *     bandedRangeId: number;
 *     range: GridRange;
 *     [key: string]: unknown;
 * }} Banding
 */
/**
 * @typedef {{
 *     properties: { sheetId: number; title: string };
 *     basicFilter?: Filter;
 *     conditionalFormats?: Rule[];
 *     bandedRanges?: Banding[];
 * }} MetadataSheet
 */

const rosterBounds = new Map([
    ["Baselines", { firstStart: 0, lastStart: 1, newEnd: 33, oldEnds: [31] }],
    ["Dashboard", { firstStart: 5, lastStart: 6, newEnd: 38, oldEnds: [36] }],
    // The native roster already reaches row 53, but its old filter/rules stop
    // at 51. Include P29/P30 as well as the two newly inserted roster rows.
    [
        "Integrity",
        { firstStart: 22, lastStart: 23, newEnd: 55, oldEnds: [51, 53] },
    ],
    [
        "Plant colors",
        { firstStart: 3, lastStart: 4, newEnd: 36, oldEnds: [34] },
    ],
    [
        "Plant tracker",
        { firstStart: 0, lastStart: 1, newEnd: 33, oldEnds: [31] },
    ],
    ["Quick log", { firstStart: 4, lastStart: 4, newEnd: 36, oldEnds: [34] }],
    [
        "Watering calendar",
        { firstStart: 4, lastStart: 4, newEnd: 36, oldEnds: [34] },
    ],
]);

/**
 * Grow only known roster presentation ranges for supported enrollments. Apply
 * after the planner inserts the new Integrity rows. Rules retain their original
 * indices, formulas, colors, filter criteria, and sort specifications. No
 * chart, observation, protection, or unrelated range is returned.
 *
 * @param {{ sheets: MetadataSheet[] }} metadata @param {number} [baseCount]
 * @param {number} [additionCount]
 *
 * @returns {Record<string, unknown>[]}
 */
export function buildInventoryMetadataRequests(
    metadata,
    baseCount = 30,
    additionCount = 2
) {
    if (
        ![
            30,
            32,
            34,
        ].includes(baseCount)
    )
        throw new Error("Unsupported inventory base count");
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    for (const sheet of metadata.sheets) {
        if (sheet.basicFilter !== undefined) {
            const filter = structuredClone(sheet.basicFilter);
            if (
                extendRosterRange(filter.range, sheet, baseCount, additionCount)
            )
                requests.push({ setBasicFilter: { filter } });
        }
        const conditionalFormats = sheet.conditionalFormats ?? [];
        for (const [index, source] of conditionalFormats.entries()) {
            const rule = structuredClone(source);
            const isChanged = rule.ranges
                .map((range) =>
                    extendRosterRange(range, sheet, baseCount, additionCount)
                )
                .some(Boolean);
            if (isChanged)
                requests.push({
                    updateConditionalFormatRule: {
                        index,
                        rule,
                        sheetId: sheet.properties.sheetId,
                    },
                });
        }
        const bandedRanges = sheet.bandedRanges ?? [];
        for (const source of bandedRanges) {
            const bandedRange = structuredClone(source);
            if (
                extendRosterRange(
                    bandedRange.range,
                    sheet,
                    baseCount,
                    additionCount
                )
            )
                requests.push({
                    updateBanding: { bandedRange, fields: "range" },
                });
        }
    }
    return requests;
}

/**
 * @param {GridRange} range @param {MetadataSheet} sheet @param {number}
 *   baseCount @param {number} additionCount
 */
function extendRosterRange(range, sheet, baseCount, additionCount) {
    const original = rosterBounds.get(sheet.properties.title);
    const bounds =
        original === undefined
            ? undefined
            : {
                  ...original,
                  firstStart:
                      baseCount >= 32 && sheet.properties.title === "Quick log"
                          ? 3
                          : original.firstStart,
                  newEnd: original.newEnd + baseCount - 32 + additionCount,
                  oldEnds:
                      baseCount === 30
                          ? original.oldEnds
                          : [original.newEnd + baseCount - 32],
              };
    if (bounds === undefined || range.endRowIndex === undefined) return false;
    if (
        range.sheetId !== undefined &&
        range.sheetId !== sheet.properties.sheetId
    )
        return false;
    const start = range.startRowIndex ?? 0;
    if (
        start < bounds.firstStart ||
        start > bounds.lastStart ||
        !bounds.oldEnds.includes(range.endRowIndex)
    )
        return false;
    range.endRowIndex = bounds.newEnd;
    range.sheetId = sheet.properties.sheetId;
    return true;
}
