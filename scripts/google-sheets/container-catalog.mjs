import { stripMarkdown } from "../../site/lib/content/profile-source.mjs";
import { isRecord } from "../build-data.mjs";
import { inventorySnapshotDigest } from "./inventory-expansion.mjs";

/**
 * @typedef {{
 *     id: string;
 *     label: string;
 *     name: string;
 *     memberSlugs: string[];
 *     careNote: string;
 *     setupNote: string;
 *     acquiredFrom?: string;
 *     acquiredDate?: string;
 * }} CatalogContainer
 *
 * @typedef {{
 *     inventoryId: string;
 *     name: string;
 *     containerId: string;
 *     label: string;
 *     slug: string;
 *     identification: string;
 *     acquiredFrom?: string;
 *     acquiredDate?: string;
 * }} CatalogMember
 *
 * @typedef {{
 *     properties: {
 *         sheetId: number;
 *         title: string;
 *         gridProperties: { rowCount: number; columnCount: number };
 *     };
 *     basicFilter?: { range: Record<string, unknown>; [key: string]: unknown };
 * }} CatalogSheet
 *
 * @typedef {{
 *     metadata: { sheets: CatalogSheet[] };
 *     trackerValues: (string | number | boolean)[][];
 *     integrity: { sheetId: number; formula: string };
 * }} CatalogSnapshot
 */

export const containerCatalogSheetId = 2_026_092_301;
export const containerMembersSheetId = 2_026_092_302;
export const containerTrackerHeaders = Object.freeze([
    "Plant ID",
    "Plant / planter",
    "Scientific name / contents",
    "Last watered",
    "Days since water",
    "Next dry check",
    "Weight (g)",
    "Weight checked",
    "Height (cm)",
    "Height checked",
    "Width (cm)",
    "Width checked",
    "Plant condition",
    "Field guide",
    "Current pot label",
    "Pot setup",
    "Calibration",
    "Trend readiness",
    "Trend review",
    "Remeasure",
    "Trend anchor",
    "Medium / substrate",
    "Last condition check",
    "Waterings",
    "Measurements",
    "Active history rows",
    "Data quality",
    "Current pot size",
    "Pot details",
    "Trend review override",
    "Pot source",
    "Weight (lb)",
    "Height (in)",
    "Width (in)",
    "Measurement unit",
    "Latest dimensions",
]);
export const containerCatalogHeaders = Object.freeze([
    "Container ID",
    "Current label",
    "Container / planter",
    "Occupancy",
    "Botanical profile groups",
    "Members",
    "Current pot setup",
    "Current pot size",
    "Medium / substrate",
    "Pot details",
    "Last watered",
    "Latest weight (g)",
    "Weight checked",
    "Shared care notes",
    "Setup notes",
    "Container page",
    "Workbook page",
    "Acquired from",
    "Acquired date",
]);
export const containerMemberHeaders = Object.freeze([
    "Inventory ID",
    "Plant / probable identification",
    "Container ID",
    "Current label",
    "Plant profile",
    "Container page",
    "Workbook page",
    "Acquired from",
    "Acquired date",
    "Identification evidence",
]);
const site = "https://nick2bad4u.github.io/Gardening";
const green = { blue: 0.18, green: 0.24, red: 0.12 };
const gold = { blue: 0.44, green: 0.78, red: 0.91 };
const pale = { blue: 0.92, green: 0.97, red: 0.94 };

/**
 * Append reviewed catalog membership after the roster/page expansion. Existing
 * catalog evidence stays unchanged; only bounded tracker lookups, filter ends,
 * and the two Integrity scan ends grow. Capture the complete used rows plus the
 * empty destination row, including userEnteredValue and effectiveValue.
 *
 * @param {CatalogSnapshot & {
 *     catalogRows: Record<
 *         string,
 *         import("./inventory-expansion.mjs").Cell[][]
 *     >;
 * }} snapshot
 * @param {{ containers: CatalogContainer[]; members: CatalogMember[] }} catalog
 */
export function buildContainerCatalogAppendRequests(snapshot, catalog) {
    const clean = structuredClone(snapshot);
    clean.metadata.sheets = clean.metadata.sheets.filter(
        ({ properties }) =>
            !["Container members", "Containers"].includes(properties.title)
    );
    const oldContainerEnd = catalog.containers.length;
    const oldMemberEnd = catalog.members.length;
    const oldTerms = [
        [
            `SUM(ARRAYFORMULA(N(ISERROR('Containers'!A1:S${oldContainerEnd}))))`,
            `SUM(ARRAYFORMULA(N(ISERROR(Containers!A1:S${oldContainerEnd}))))`,
        ],
        [
            `SUM(ARRAYFORMULA(N(ISERROR('Container members'!A1:J${oldMemberEnd}))))`,
        ],
    ];
    for (const variants of oldTerms) {
        // Sheets removes optional quotes from this simple sheet name on read.
        // Accept either spelling while retaining the exact endpoint guard.
        const matching = variants.filter((term) =>
            clean.integrity.formula.includes(`,${term}`)
        );
        const term = matching[0];
        if (
            term === undefined ||
            matching.length !== 1 ||
            clean.integrity.formula.split(term).length !== 2
        )
            throw new Error("Existing catalog Integrity bounds changed");
        clean.integrity.formula = clean.integrity.formula.replace(
            `,${term}`,
            ""
        );
    }
    const generated = buildContainerCatalogRequests(clean, catalog);
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    for (const [
        title,
        sheetId,
        headers,
        ids,
    ] of /** @type {[string, number, readonly string[], string[]][]} */ ([
        [
            "Containers",
            containerCatalogSheetId,
            containerCatalogHeaders,
            catalog.containers.map(({ id }) => id),
        ],
        [
            "Container members",
            containerMembersSheetId,
            containerMemberHeaders,
            catalog.members.map(({ inventoryId }) => inventoryId),
        ],
    ])) {
        const { rows, sheet } = validateCatalogAppendSheet(
            snapshot,
            title,
            sheetId,
            headers,
            ids
        );
        const generatedWrite = generated.requests.find(
            (request) =>
                isRecord(request["updateCells"]) &&
                isRecord(request["updateCells"]["start"]) &&
                request["updateCells"]["start"]["sheetId"] === sheetId
        );
        const updateCells = generatedWrite?.["updateCells"];
        if (!isRecord(updateCells) || !Array.isArray(updateCells["rows"]))
            throw new Error("Missing generated catalog rows");
        const added = /** @type {unknown} */ (updateCells["rows"][ids.length]);
        if (!isRecord(added)) throw new Error("Missing new catalog member row");
        if (sheet.properties.gridProperties.rowCount < ids.length + 1)
            requests.push({
                appendDimension: {
                    dimension: "ROWS",
                    length:
                        ids.length +
                        1 -
                        sheet.properties.gridProperties.rowCount,
                    sheetId,
                },
            });
        requests.push(
            {
                copyPaste: {
                    destination: {
                        endColumnIndex: headers.length,
                        endRowIndex: ids.length + 1,
                        sheetId,
                        startColumnIndex: 0,
                        startRowIndex: ids.length,
                    },
                    pasteType: "PASTE_FORMAT",
                    source: {
                        endColumnIndex: headers.length,
                        endRowIndex: ids.length,
                        sheetId,
                        startColumnIndex: 0,
                        startRowIndex: ids.length - 1,
                    },
                },
            },
            {
                updateCells: {
                    fields: "userEnteredValue",
                    rows: [added],
                    start: { columnIndex: 0, rowIndex: ids.length, sheetId },
                },
            },
            ...extendCatalogLookups(
                rows.slice(1, ids.length),
                sheetId,
                oldContainerEnd
            )
        );
        if (sheet.basicFilter.range["endRowIndex"] !== ids.length)
            throw new Error(`Catalog filter bounds changed: ${title}`);
        requests.push({
            setBasicFilter: {
                filter: {
                    ...structuredClone(sheet.basicFilter),
                    range: {
                        ...sheet.basicFilter.range,
                        endRowIndex: ids.length + 1,
                    },
                },
            },
        });
    }
    const finalIntegrity = generated.requests.at(-1);
    if (!finalIntegrity) throw new Error("Missing catalog integrity request");
    requests.push(finalIntegrity);
    return {
        containerRange: generated.containerRange,
        destinations: {
            "Container members": catalog.members.length,
            Containers: catalog.containers.length,
        },
        memberRange: generated.memberRange,
        requests,
        sourceDigest: catalogAppendDigest(snapshot),
    };
}

/**
 * Add two read-only catalog views and extend only Integrity B12. Supply a fresh
 * full native sheet inventory and UNFORMATTED_VALUE Plant tracker A1:AJ data,
 * including all maintained rows. Re-read and compare returned preconditions
 * immediately before applying requests. Existing destinations reject replay.
 * Rehearse calculations on a native copy before writing to production.
 *
 * @param {CatalogSnapshot} snapshot
 * @param {{ containers: CatalogContainer[]; members: CatalogMember[] }} catalog
 */
export function buildContainerCatalogRequests(snapshot, catalog) {
    validateCatalog(snapshot, catalog);
    const { containers, members } = catalog;
    const sourceEnd = containers.length + 1;
    const sourceRange = `'Plant tracker'!A1:AJ${sourceEnd}`;
    const containerRows = containers.map((container, index) => {
        const row = index + 2;
        const names = container.memberSlugs.map((slug) => {
            const member = members.find((entry) => entry.slug === slug);
            if (!member) throw new Error(`Missing member ${slug}`);
            return member.name;
        });
        return [
            textCell(container.id),
            lookup(row, "A", "O", sourceEnd),
            textCell(container.name),
            textCell(names.length > 1 ? "Shared" : "Single profile"),
            { userEnteredValue: { numberValue: names.length } },
            textCell(names.join(" · ")),
            lookup(row, "A", "P", sourceEnd),
            lookup(row, "A", "AB", sourceEnd),
            lookup(row, "A", "V", sourceEnd),
            lookup(row, "A", "AC", sourceEnd),
            lookup(row, "A", "D", sourceEnd),
            lookup(row, "A", "G", sourceEnd),
            lookup(row, "A", "H", sourceEnd),
            textCell(container.careNote),
            textCell(container.setupNote),
            link(containerUrl(container.id), "Open container"),
            link(workbookUrl(snapshot, container.id), "Open workbook page"),
            textCell(container.acquiredFrom ?? ""),
            textCell(container.acquiredDate ?? ""),
        ];
    });
    const memberRows = members.map((member, index) => [
        textCell(member.inventoryId),
        textCell(member.name),
        textCell(member.containerId),
        lookup(index + 2, "C", "O", sourceEnd),
        link(`${site}/plants/${member.slug}/`, "Open plant profile"),
        link(containerUrl(member.containerId), "Open container"),
        link(workbookUrl(snapshot, member.containerId), "Open workbook page"),
        textCell(member.acquiredFrom ?? ""),
        textCell(member.acquiredDate ?? ""),
        textCell(member.identification),
    ]);
    /** @type {Record<string, unknown>[]} */
    const requests = [
        ...newSheet(
            containerCatalogSheetId,
            "Containers",
            containerCatalogHeaders,
            containerRows,
            snapshot.metadata.sheets.length
        ),
        ...newSheet(
            containerMembersSheetId,
            "Container members",
            containerMemberHeaders,
            memberRows,
            snapshot.metadata.sheets.length + 1
        ),
        numberFormat(
            containerCatalogSheetId,
            10,
            containerRows.length + 1,
            "DATE_TIME",
            "mmm d, yyyy h:mm am/pm"
        ),
        numberFormat(
            containerCatalogSheetId,
            11,
            containerRows.length + 1,
            "NUMBER",
            "0.0"
        ),
        numberFormat(
            containerCatalogSheetId,
            12,
            containerRows.length + 1,
            "DATE_TIME",
            "mmm d, yyyy h:mm am/pm"
        ),
        integrityRequest(
            snapshot,
            containerRows.length + 1,
            memberRows.length + 1
        ),
    ];
    return {
        containerRange: `'Containers'!A1:S${containerRows.length + 1}`,
        memberRange: `'Container members'!A1:J${memberRows.length + 1}`,
        preconditions: {
            integrity: { ...snapshot.integrity },
            sheets: snapshot.metadata.sheets.map(({ properties }) => ({
                sheetId: properties.sheetId,
                title: properties.title,
            })),
            trackerHeaders: [...containerTrackerHeaders],
            trackerIds: snapshot.trackerValues.slice(1).map((row) => row[0]),
        },
        requests,
        sourceRange,
    };
}

/**
 * Export the website's validated container model without its rendered HTML,
 * photos, or observation data. Both catalogs retain the same membership.
 *
 * @param {readonly import("../../site/lib/containers.mjs").Container[]} source
 *
 * @returns {{ containers: CatalogContainer[]; members: CatalogMember[] }}
 */
export function normalizeContainerCatalog(source) {
    const members = source.flatMap((container) =>
        container.members.map((profile) => ({
            acquiredDate: acquisitionDate(profile.acquiredOnMarkdown),
            acquiredFrom: stripMarkdown(profile.acquiredFromMarkdown),
            containerId: container.id,
            identification: stripMarkdown(profile.identificationMarkdown),
            inventoryId: profile.inventoryId,
            label: container.label,
            name: stripMarkdown(profile.scientificMarkdown) || profile.title,
            slug: profile.slug,
        }))
    );
    const containers = source.map((container) => {
        const profiles = container.overview
            ? [container.overview]
            : container.members;
        const places = profiles.map((profile) =>
            stripMarkdown(profile.acquiredFromMarkdown)
        );
        const dates = profiles.map((profile) =>
            acquisitionDate(profile.acquiredOnMarkdown)
        );
        return {
            acquiredDate: dates.every((value) => value === dates[0])
                ? (dates[0] ?? "")
                : "",
            acquiredFrom: places.every((value) => value === places[0])
                ? (places[0] ?? "")
                : "",
            careNote: container.careNote,
            id: container.id,
            label: container.label,
            memberSlugs: container.members.map(({ slug }) => slug),
            name: container.name,
            setupNote: stripMarkdown(
                container.currentPot || container.setupNote
            ),
        };
    });
    return { containers, members };
}

/**
 * @param {ReturnType<typeof buildContainerCatalogAppendRequests>} plan
 * @param {Parameters<typeof buildContainerCatalogAppendRequests>[0]} fresh
 */
export function verifyContainerCatalogAppendPreconditions(plan, fresh) {
    for (const [title, startRow] of Object.entries(plan.destinations))
        assertCatalogAppendEmpty(
            (fresh.catalogRows[title] ?? []).slice(startRow),
            title
        );
    if (catalogAppendDigest(fresh) !== plan.sourceDigest)
        throw new Error("Catalog source changed since append planning");
    return true;
}

/** @param {string | undefined} value */
function acquisitionDate(value) {
    return /^\d{4}-\d{2}-\d{2}\b/v.exec(stripMarkdown(value ?? ""))?.[0] ?? "";
}

/**
 * @param {import("./inventory-expansion.mjs").Cell[][]} rows @param {string}
 *   title
 */
function assertCatalogAppendEmpty(rows, title) {
    if (
        rows.some((row) =>
            row.some(
                (cell) =>
                    cell.userEnteredValue !== undefined ||
                    cell.effectiveValue !== undefined
            )
        )
    )
        throw new Error(`Catalog append destination occupied: ${title}`);
}

/** @param {unknown} snapshot */
function catalogAppendDigest(snapshot) {
    const stable = /** @type {unknown} */ (
        JSON.parse(
            JSON.stringify(snapshot, (key, /** @type {unknown} */ value) =>
                key === "effectiveValue" ? undefined : value
            )
        )
    );
    return inventorySnapshotDigest(stable);
}

/** @param {string} id */
function containerUrl(id) {
    return `${site}/containers/${id}/`;
}

/**
 * @param {import("./inventory-expansion.mjs").Cell[][]} rows
 * @param {number} sheetId @param {number} oldEnd
 */
function extendCatalogLookups(rows, sheetId, oldEnd) {
    return rows.flatMap((row, rowIndex) =>
        row.flatMap((cell, columnIndex) => {
            const before = cell.userEnteredValue?.formulaValue;
            if (before === undefined) return [];
            const after = before.replaceAll(
                /(?<range>'Plant tracker'!\$[A-Z]+\$2:\$[A-Z]+\$)(?<end>\d+)(?!\d)/gv,
                (match, range, end) =>
                    Number(end) === oldEnd
                        ? `${String(range)}${oldEnd + 1}`
                        : match
            );
            if (after === before) return [];
            return [
                {
                    updateCells: {
                        fields: "userEnteredValue",
                        rows: [
                            {
                                values: [
                                    {
                                        userEnteredValue: {
                                            formulaValue: after,
                                        },
                                    },
                                ],
                            },
                        ],
                        start: { columnIndex, rowIndex: rowIndex + 1, sheetId },
                    },
                },
            ];
        })
    );
}

/**
 * @param {CatalogSnapshot} snapshot @param {number} containerEnd @param
 *   {number} memberEnd
 */
function integrityRequest({ integrity, metadata }, containerEnd, memberEnd) {
    const sheets = metadata.sheets.filter(
        ({ properties }) => properties.title === "Integrity"
    );
    if (
        sheets.length !== 1 ||
        sheets[0]?.properties.sheetId !== integrity.sheetId ||
        !integrity.formula.startsWith("=SUM(") ||
        !integrity.formula.endsWith(")") ||
        /container members|containers/iv.test(integrity.formula)
    )
        throw new Error(
            "Integrity B12 changed or already scans the container catalog"
        );
    const formula = `${integrity.formula.slice(0, -1)},SUM(ARRAYFORMULA(N(ISERROR('Containers'!A1:S${containerEnd})))),SUM(ARRAYFORMULA(N(ISERROR('Container members'!A1:J${memberEnd})))))`;
    return {
        updateCells: {
            fields: "userEnteredValue",
            rows: [
                { values: [{ userEnteredValue: { formulaValue: formula } }] },
            ],
            start: { columnIndex: 1, rowIndex: 11, sheetId: integrity.sheetId },
        },
    };
}

/** @param {string} url @param {string} label */
function link(url, label) {
    return {
        userEnteredValue: {
            formulaValue: `=HYPERLINK(${quote(url)},${quote(label)})`,
        },
    };
}

/**
 * @param {number} row @param {string} keyColumn @param {string} sourceColumn
 * @param {number} end
 */
function lookup(row, keyColumn, sourceColumn, end) {
    const source = `'Plant tracker'!$${sourceColumn}$2:$${sourceColumn}$${end}`;
    return {
        userEnteredValue: {
            formulaValue: `=XLOOKUP($${keyColumn}${row},'Plant tracker'!$A$2:$A$${end},ARRAYFORMULA(IF(${source}="","",${source})),"")`,
        },
    };
}

/**
 * @param {number} sheetId @param {string} title @param {readonly string[]}
 *   headers
 * @param {{
 *     userEnteredValue: {
 *         stringValue?: string;
 *         formulaValue?: string;
 *         numberValue?: number;
 *     };
 * }[][]} rows
 * @param {number} index
 *
 * @returns {Record<string, unknown>[]}
 */
function newSheet(sheetId, title, headers, rows, index) {
    const endRowIndex = rows.length + 1;
    const endColumnIndex = headers.length;
    const widths =
        sheetId === containerCatalogSheetId
            ? [
                  82,
                  86,
                  250,
                  120,
                  110,
                  350,
                  90,
                  140,
                  320,
                  360,
                  180,
                  125,
                  180,
                  400,
                  400,
                  160,
                  180,
                  300,
                  145,
              ]
            : [
                  135,
                  330,
                  100,
                  95,
                  165,
                  165,
                  180,
                  325,
                  150,
                  430,
              ];
    const range = {
        endColumnIndex,
        endRowIndex,
        sheetId,
        startColumnIndex: 0,
        startRowIndex: 0,
    };
    return [
        {
            addSheet: {
                properties: {
                    gridProperties: {
                        columnCount: Math.max(26, endColumnIndex),
                        frozenColumnCount: 2,
                        frozenRowCount: 1,
                        hideGridlines: true,
                        rowCount: Math.max(100, endRowIndex),
                    },
                    hidden: false,
                    index,
                    sheetId,
                    tabColorStyle: { rgbColor: green },
                    title,
                },
            },
        },
        {
            updateCells: {
                fields: "userEnteredValue",
                rows: [headers.map((header) => textCell(header)), ...rows].map(
                    (values) => ({
                        values,
                    })
                ),
                start: { columnIndex: 0, rowIndex: 0, sheetId },
            },
        },
        {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        backgroundColor: pale,
                        textFormat: {
                            fontFamily: "JetBrains Mono",
                            fontSize: 10,
                            foregroundColor: green,
                        },
                        verticalAlignment: "TOP",
                        wrapStrategy: "WRAP",
                    },
                },
                fields: "userEnteredFormat",
                range,
            },
        },
        {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        backgroundColor: green,
                        textFormat: {
                            bold: true,
                            fontFamily: "JetBrains Mono",
                            foregroundColor: gold,
                        },
                    },
                },
                fields: "userEnteredFormat.backgroundColor,userEnteredFormat.textFormat",
                range: { ...range, endRowIndex: 1 },
            },
        },
        {
            repeatCell: {
                cell: {
                    note: "Read-only catalog. One P-ID is one weighed and watered container; botanical profile groups are not a count of individual plants or heads. Edit maintained collection sources and log care through the existing logger. Blank observations remain unknown. Acquisition dates are YYYY-MM-DD.",
                },
                fields: "note",
                range: {
                    endColumnIndex: 1,
                    endRowIndex: 1,
                    sheetId,
                    startColumnIndex: 0,
                    startRowIndex: 0,
                },
            },
        },
        ...widths.map((pixelSize, column) => ({
            updateDimensionProperties: {
                fields: "pixelSize",
                properties: { pixelSize },
                range: {
                    dimension: "COLUMNS",
                    endIndex: column + 1,
                    sheetId,
                    startIndex: column,
                },
            },
        })),
        {
            updateDimensionProperties: {
                fields: "pixelSize",
                properties: { pixelSize: 60 },
                range: {
                    dimension: "ROWS",
                    endIndex: 1,
                    sheetId,
                    startIndex: 0,
                },
            },
        },
        {
            autoResizeDimensions: {
                dimensions: {
                    dimension: "ROWS",
                    endIndex: endRowIndex,
                    sheetId,
                    startIndex: 1,
                },
            },
        },
        { setBasicFilter: { filter: { range } } },
        {
            addProtectedRange: {
                protectedRange: {
                    description:
                        "Derived container catalog; record care through the logger and maintain membership in repository sources.",
                    range: { sheetId },
                    warningOnly: true,
                },
            },
        },
    ];
}

/**
 * @param {number} sheetId @param {number} column @param {number} endRowIndex
 * @param {string} type @param {string} pattern
 */
function numberFormat(sheetId, column, endRowIndex, type, pattern) {
    return {
        repeatCell: {
            cell: { userEnteredFormat: { numberFormat: { pattern, type } } },
            fields: "userEnteredFormat.numberFormat",
            range: {
                endColumnIndex: column + 1,
                endRowIndex,
                sheetId,
                startColumnIndex: column,
                startRowIndex: 1,
            },
        },
    };
}

/** @param {string} value */
function quote(value) {
    return `"${value.replaceAll('"', '""')}"`;
}

/** @param {string} value */
function textCell(value) {
    return { userEnteredValue: { stringValue: value } };
}

/** @param {unknown[]} values */
function unique(values) {
    const entries = new Set(values);
    return entries.size === values.length;
}

/**
 * @param {CatalogSnapshot} snapshot @param {{ containers: CatalogContainer[],
 *   members: CatalogMember[] }} catalog
 */
function validateCatalog(snapshot, { containers, members }) {
    const { metadata, trackerValues } = snapshot;
    for (const [title, id] of [
        ["Containers", containerCatalogSheetId],
        ["Container members", containerMembersSheetId],
    ]) {
        if (
            metadata.sheets.some(
                ({ properties }) =>
                    properties.title.toLowerCase() ===
                        String(title).toLowerCase() || properties.sheetId === id
            )
        )
            throw new Error(
                `${String(title)} destination occupied; do not replay migration`
            );
    }
    const tracker = metadata.sheets.filter(
        ({ properties }) => properties.title === "Plant tracker"
    );
    if (
        tracker.length !== 1 ||
        !tracker[0] ||
        tracker[0].properties.gridProperties.columnCount < 36 ||
        tracker[0].properties.gridProperties.rowCount < containers.length + 1
    )
        throw new Error("Missing or undersized Plant tracker source");
    const headers = trackerValues[0];
    if (
        headers?.length !== containerTrackerHeaders.length ||
        containerTrackerHeaders.some(
            (header, index) => headers[index] !== header
        )
    )
        throw new Error("Plant tracker headers changed; review source schema");
    const ids = trackerValues.slice(1).map((row) => row[0]);
    if (
        containers.length === 0 ||
        ids.length !== containers.length ||
        !unique(ids) ||
        containers.some(
            ({ id }) => !/^P\d{2}$/v.test(id) || !ids.includes(id)
        ) ||
        !unique(containers.map(({ id }) => id))
    )
        throw new Error(
            "Container IDs must match every unique Plant tracker ID"
        );
    validateMembers(containers, members);
    validateContainerMembers(snapshot, containers, members);
}

/**
 * @param {Parameters<typeof buildContainerCatalogAppendRequests>[0]} snapshot
 * @param {string} title @param {number} sheetId @param {readonly string[]}
 *   headers @param {string[]} ids
 */
function validateCatalogAppendSheet(snapshot, title, sheetId, headers, ids) {
    const sheet = snapshot.metadata.sheets.find(
        ({ properties }) => properties.title === title
    );
    const rows = snapshot.catalogRows[title];
    if (
        rows === undefined ||
        sheet?.properties.sheetId !== sheetId ||
        !sheet.basicFilter ||
        rows.length < ids.length + 1
    )
        throw new Error(`Missing complete existing catalog snapshot: ${title}`);
    if (
        headers.some(
            (header, column) =>
                rows[0]?.[column]?.userEnteredValue?.stringValue !== header
        )
    )
        throw new Error(`Catalog headers changed: ${title}`);
    const previousIds = ids.slice(0, -1);
    for (const [index, id] of previousIds.entries())
        if (rows[index + 1]?.[0]?.userEnteredValue?.stringValue !== id)
            throw new Error(`Catalog membership changed: ${title}`);
    assertCatalogAppendEmpty(rows.slice(ids.length), title);
    return { rows, sheet: { ...sheet, basicFilter: sheet.basicFilter } };
}

/**
 * @param {CatalogSnapshot} snapshot @param {CatalogContainer[]} containers
 * @param {CatalogMember[]} members
 */
function validateContainerMembers(snapshot, containers, members) {
    const { trackerValues } = snapshot;
    for (const container of containers) {
        const expected = members
            .filter(({ containerId }) => containerId === container.id)
            .map(({ slug }) => slug);
        if (
            !container.name.trim() ||
            expected.length === 0 ||
            !unique(container.memberSlugs) ||
            expected.length !== container.memberSlugs.length ||
            container.memberSlugs.some((slug) => !expected.includes(slug))
        )
            throw new Error(`Member mismatch: ${container.id}`);
        const trackerRow = trackerValues.find(
            (row, index) => index > 0 && row[0] === container.id
        );
        if (!trackerRow || String(trackerRow[14] ?? "") !== container.label)
            throw new Error(`Current label changed: ${container.id}`);
        workbookUrl(snapshot, container.id);
        validateDate(container.acquiredDate);
    }
}

/** @param {string | undefined} value */
function validateDate(value) {
    if (value === undefined || value === "") return;
    if (!/^\d{4}-\d{2}-\d{2}$/v.test(value))
        throw new Error(`Invalid acquisition date: ${value}`);
    try {
        Temporal.PlainDate.from(value);
    } catch (error) {
        throw new Error(`Invalid acquisition date: ${value}`, { cause: error });
    }
}

/** @param {CatalogContainer[]} containers @param {CatalogMember[]} members */
function validateMembers(containers, members) {
    if (
        members.length === 0 ||
        !unique(members.map(({ slug }) => slug)) ||
        !unique(members.map(({ inventoryId }) => inventoryId))
    )
        throw new Error("Missing or duplicate botanical profile IDs");
    for (const member of members) {
        const container = containers.find(
            ({ id }) => id === member.containerId
        );
        if (
            !container ||
            !member.inventoryId.trim() ||
            !member.name.trim() ||
            member.slug.split("-").some((part) => !/^[\da-z]+$/v.test(part)) ||
            !container.memberSlugs.includes(member.slug) ||
            member.label !== container.label
        )
            throw new Error(`Member mismatch: ${member.slug}`);
        validateDate(member.acquiredDate);
    }
}

/** @param {CatalogSnapshot} snapshot @param {string} id */
function workbookUrl({ metadata }, id) {
    const pages = metadata.sheets.filter(({ properties }) =>
        properties.title.startsWith(`${id} `)
    );
    if (pages.length !== 1 || !pages[0])
        throw new Error(`Expected exactly one workbook page for ${id}`);
    return `#gid=${pages[0].properties.sheetId}&range=A1`;
}
