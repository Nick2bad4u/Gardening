import {
    buildInventoryExpansion,
    finalizeInventoryPageCharts,
    inventorySnapshotDigest,
    verifyInventoryExpansionPreconditions,
} from "./inventory-expansion.mjs";

/** @typedef {import("./inventory-expansion.mjs").NativeSnapshot} Snapshot */
/** @typedef {import("./inventory-expansion.mjs").Addition} Addition */

/** @type {Addition[]} */
export const purchasedHouseplants = [
    {
        contents: "Peperomia obtusifolia 'Obtipan Bicolor'",
        details:
            "Purchased September 20, 2026; nursery container size and medium unrecorded; no repot inferred",
        guideUrl:
            "https://nick2bad4u.github.io/Gardening/plants/peperomia-obtipan-bicolor/",
        id: "P33",
        label: "#9",
        medium: "Not recorded",
        name: "Peperomia Bicolor",
        pot: "Not recorded",
        sheetId: 202_609_330,
        source: "Retailer unrecorded; grown by Carlson’s Greenhouses",
        title: "P33 Peperomia Bicolor",
    },
    {
        contents: "Tradescantia spathacea 'Tricolor'",
        details:
            "Purchased September 20, 2026; nursery container size and medium unrecorded; no repot inferred",
        guideUrl:
            "https://nick2bad4u.github.io/Gardening/plants/tradescantia-spathacea-tricolor/",
        id: "P34",
        label: "#10",
        medium: "Not recorded",
        name: "Tricolor oyster plant",
        pot: "Not recorded",
        sheetId: 202_609_340,
        source: "Retailer unrecorded; grown by Carlson’s Greenhouses",
        title: "P34 Tricolor oyster plant",
    },
];

/**
 * Guard the reserved IDs and append after all existing compatibility fields.
 *
 * @param {Snapshot} metadata @param {Snapshot[]} snapshots
 */
export function buildPurchasedHouseplantsExpansion(metadata, snapshots) {
    assertReservedSlots(metadata, snapshots);
    const plan = buildInventoryExpansion(metadata, snapshots, {
        additions: purchasedHouseplants,
        bulkStartColumn: 56,
        reuseCapacity: true,
    });
    return {
        ...plan,
        prepareRequests: [
            ...plan.prepareRequests,
            insightsSelectorNote(snapshots),
        ],
        sourceDigest: sourceDigest(snapshots),
    };
}

/** @param {Snapshot} metadata */
export function finalizePurchasedHouseplantCharts(metadata) {
    return finalizeInventoryPageCharts(metadata, purchasedHouseplants);
}

/**
 * @param {ReturnType<typeof buildPurchasedHouseplantsExpansion>} plan @param
 *   {Snapshot} metadata @param {Snapshot[]} snapshots
 */
export function verifyPurchasedHouseplantsPreconditions(
    plan,
    metadata,
    snapshots
) {
    assertReservedSlots(metadata, snapshots);
    verifyInventoryExpansionPreconditions(plan, metadata, snapshots);
    if (sourceDigest(snapshots) !== plan.sourceDigest)
        throw new Error(
            "Observation, queue, or source cells changed after purchase planning"
        );
}

/** @param {import("./inventory-expansion.mjs").Sheet} sheet */
function assertArchivedHeaders(sheet) {
    const header = sheet.data?.[0]?.rowData?.[0]?.values;
    if (
        header?.[54]?.userEnteredValue?.stringValue !== "P31 weight (g)" ||
        header[55]?.userEnteredValue?.stringValue !== "P32 weight (g)"
    )
        throw new Error("Archived App bulk headers changed");
}

/**
 * @param {string} title @param
 *   {NonNullable<import("./inventory-expansion.mjs").Sheet["data"]>[number]}
 *   block
 */
function assertReservedBlock(title, block) {
    const rows = (block.rowData ?? []).entries();
    for (const [rowOffset, row] of rows) {
        if ((block.startRow ?? 0) + rowOffset === 0) continue;
        const cells = (row.values ?? []).entries();
        for (const [columnOffset, cell] of cells) {
            if (/\bP3[1-4]\b/v.test(cell.userEnteredValue?.stringValue ?? ""))
                throw new Error(
                    `Reserved or new ID already present in ${title}`
                );
            if (
                title === "App bulk" &&
                (block.startColumn ?? 0) + columnOffset >= 54 &&
                cell.userEnteredValue !== undefined
            )
                throw new Error(
                    "Archived bulk compatibility fields must remain blank"
                );
        }
    }
}

/** @param {Snapshot} metadata @param {Snapshot[]} snapshots */
function assertReservedSlots(metadata, snapshots) {
    if (
        metadata.sheets.some((sheet) =>
            /^P3[12] /v.test(sheet.properties.title)
        )
    )
        throw new Error("Archived P31/P32 pages must remain withdrawn");
    for (const title of [
        "History",
        "App entries",
        "App bulk",
        "RO refills",
    ]) {
        const sheet = snapshots
            .flatMap((snapshot) => snapshot.sheets)
            .find((current) => current.properties.title === title);
        if (
            !sheet ||
            sheet.data?.some(
                (block) =>
                    (block.startRow ?? 0) === 0 &&
                    block.rowData?.length ===
                        sheet.properties.gridProperties.rowCount
            ) !== true
        )
            throw new Error(`Missing complete ledger: ${title}`);
        for (const block of sheet.data) assertReservedBlock(title, block);
        if (title === "App bulk") assertArchivedHeaders(sheet);
    }
}

/** @param {Snapshot[]} snapshots */
function insightsSelectorNote(snapshots) {
    const sheet = snapshots
        .flatMap((snapshot) => snapshot.sheets)
        .find((current) => current.properties.title === "Insights");
    if (!sheet) throw new Error("Missing Insights selector snapshot");
    const cell = sheet.data
        ?.map(
            (block) =>
                block.rowData?.[227 - (block.startRow ?? 0)]?.values?.[
                    1 - (block.startColumn ?? 0)
                ]
        )
        .find((candidate) => candidate !== undefined);
    if (
        !cell ||
        Reflect.get(cell, "note") !==
            "Select P01–P30. Only this cell is an input; chart data is derived."
    )
        throw new Error("Insights B228 selector note changed");
    return {
        updateCells: {
            fields: "note",
            rows: [
                {
                    values: [
                        {
                            note: "Select an active pot: P01–P30, P33, or P34. Only this cell is an input; chart data is derived.",
                        },
                    ],
                },
            ],
            start: {
                columnIndex: 1,
                rowIndex: 227,
                sheetId: sheet.properties.sheetId,
            },
        },
    };
}

/** @param {import("./inventory-expansion.mjs").Cell} cell */
function sourceCell(cell) {
    const note = /** @type {unknown} */ (Reflect.get(cell, "note"));
    return {
        note,
        validation: cell.dataValidation,
        value: cell.userEnteredValue,
    };
}

/**
 * Snapshot entered evidence, notes and validations, avoiding volatile
 * calculations. @param {Snapshot[]} snapshots
 */
function sourceDigest(snapshots) {
    return inventorySnapshotDigest(
        snapshots.map((snapshot) =>
            snapshot.sheets.map((sheet) => sourceSheet(sheet))
        )
    );
}

/** @param {import("./inventory-expansion.mjs").Sheet} sheet */
function sourceSheet(sheet) {
    return {
        data: sheet.data?.map((block) => ({
            rows: block.rowData?.map((row) =>
                row.values?.map((cell) => sourceCell(cell))
            ),
            startColumn: block.startColumn,
            startRow: block.startRow,
        })),
        title: sheet.properties.title,
    };
}
