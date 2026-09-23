import { describe, expect, it } from "vitest";

import {
    buildContainerCatalogRequests,
    containerCatalogHeaders,
    containerCatalogSheetId,
    containerMemberHeaders,
    containerMembersSheetId,
    containerTrackerHeaders,
    normalizeContainerCatalog,
} from "../../scripts/google-sheets/container-catalog.mjs";
import { getContainers } from "../../site/lib/containers.mjs";
import { required } from "../helpers/required.mjs";

function fixture(count = 2) {
    const containers = Array.from({ length: count }, (_, index) => ({
        careNote: "Weigh the entire container.",
        id: `P${String(index + 1).padStart(2, "0")}`,
        label: `#${index + 1}`,
        memberSlugs: [`plant-${index + 1}`],
        name: `Container ${index + 1}`,
        setupNote: "Mineral medium.",
    }));
    required(containers[0]).memberSlugs.push("second-profile");
    const members = containers.flatMap((container, index) =>
        container.memberSlugs.map((slug, memberIndex) => ({
            acquiredDate: "2026-09-21",
            acquiredFrom: "Home Depot, Howell, MI",
            containerId: container.id,
            identification: "Probable; photo evidence only.",
            inventoryId: `${index + 1}-${memberIndex + 1}`,
            label: container.label,
            name: memberIndex
                ? "Probable second species"
                : `Plant ${index + 1}`,
            slug,
        }))
    );
    const properties = (title = "Plant tracker", sheetId = 100) => ({
        gridProperties: { columnCount: 36, rowCount: 5000 },
        sheetId,
        title,
    });
    const metadata = {
        sheets: [
            { properties: properties() },
            ...containers.map(({ id }, index) => ({
                properties: properties(`${id} Plant page`, index + 101),
            })),
            ...[
                "History",
                "App entries",
                "App bulk",
                "RO refills",
                "Integrity",
            ].map((title, index) => ({
                properties: properties(title, index + 500),
            })),
        ],
    };
    /** @type {(string | number | boolean)[][]} */
    const trackerValues = [
        [...containerTrackerHeaders],
        ...containers.map(({ id, label }) => {
            const row = Array.from({ length: 36 }, () => "");
            row[0] = id;
            row[14] = label;
            return row;
        }),
    ];
    return {
        catalog: { containers, members },
        snapshot: {
            integrity: {
                formula:
                    "=SUM(ARRAYFORMULA(N(ISERROR('Plant tracker'!A1:AJ3))))",
                sheetId: 504,
            },
            metadata,
            trackerValues,
        },
    };
}

/** @param {ReturnType<typeof buildContainerCatalogRequests>} plan */
function writtenRows(plan) {
    return plan.requests
        .filter(
            (request) =>
                "updateCells" in request &&
                !JSON.stringify(request).includes('"sheetId":504')
        )
        .map((request) => {
            const update =
                /**
                 * @type {{
                 *     rows: {
                 *         values: {
                 *             userEnteredValue: {
                 *                 stringValue?: string;
                 *                 formulaValue?: string;
                 *                 numberValue?: number;
                 *             };
                 *         }[];
                 *     }[];
                 * }}
                 */ (request["updateCells"]);
            return update.rows.map(({ values }) =>
                values.map(({ userEnteredValue }) => userEnteredValue)
            );
        });
}

describe("container catalog migration", () => {
    it("exports probable Lithops members and acquisition evidence without counting the overview", async () => {
        expect.hasAssertions();

        const model = await getContainers();
        const catalog = normalizeContainerCatalog(model);
        const lithops = catalog.members.filter(
            ({ containerId }) => containerId === "P35"
        );

        expect(lithops.map(({ slug }) => slug)).toStrictEqual([
            "lithops-lesliei",
            "lithops-salicola",
        ]);
        expect(
            lithops.every(({ name }) => name.startsWith("Probable Lithops"))
        ).toBe(true);
        expect(
            lithops.every(({ acquiredDate }) => acquiredDate === "2026-09-21")
        ).toBe(true);
        expect(
            lithops.every(
                ({ acquiredFrom }) =>
                    acquiredFrom?.includes("Home Depot, Howell, Michigan") ===
                    true
            )
        ).toBe(true);
        expect(
            catalog.members.some(
                ({ slug }) =>
                    slug === "lithops-shared-planter" ||
                    slug === "tiny-mixed-succulent-planter"
            )
        ).toBe(false);
        expect(
            catalog.containers.find(({ id }) => id === "P35")?.memberSlugs
        ).toHaveLength(2);
    });

    it("creates one container row for several botanical profiles without changing inputs", () => {
        expect.hasAssertions();

        const { catalog, snapshot } = fixture();
        const before = structuredClone({ catalog, snapshot });
        const plan = buildContainerCatalogRequests(snapshot, catalog);
        const [containers, members] = writtenRows(plan);

        expect(containers).toHaveLength(3);
        expect(members).toHaveLength(4);
        expect(
            required(containers)[0]?.map((cell) => cell.stringValue)
        ).toStrictEqual(containerCatalogHeaders);
        expect(
            required(members)[0]?.map((cell) => cell.stringValue)
        ).toStrictEqual(containerMemberHeaders);
        expect(required(containers)[1]?.[4]).toStrictEqual({ numberValue: 2 });
        expect(required(containers)[1]?.[5]?.stringValue).toContain(
            "Probable second species"
        );
        expect(required(members)[1]?.[7]).toStrictEqual({
            stringValue: "Home Depot, Howell, MI",
        });
        expect(required(members)[1]?.[8]).toStrictEqual({
            stringValue: "2026-09-21",
        });
        expect({ catalog, snapshot }).toStrictEqual(before);
    });

    it("writes only new sheets and Integrity B12 while preserving canonical data and charts", () => {
        expect.hasAssertions();

        const { catalog, snapshot } = fixture();
        const plan = buildContainerCatalogRequests(snapshot, catalog);
        const ids = new Set([
            504,
            containerCatalogSheetId,
            containerMembersSheetId,
        ]);
        for (const request of plan.requests) {
            expect(Object.keys(request)).toHaveLength(1);

            const json = JSON.stringify(request);
            for (const match of json.matchAll(/"sheetId":(?<id>\d+)/gv))
                expect(ids.has(Number(match.groups?.["id"]))).toBe(true);

            expect(json).not.toMatch(
                /App bulk|App entries|History|RO refills|delete|findReplace|updateChart/v
            );
        }
        const adds = plan.requests.filter((request) => "addSheet" in request);

        expect(adds).toHaveLength(2);

        for (const [index, request] of adds.entries()) {
            const add =
                /**
                 * @type {{
                 *     properties: {
                 *         index: number;
                 *         hidden: boolean;
                 *         gridProperties: {
                 *             frozenRowCount: number;
                 *             frozenColumnCount: number;
                 *             hideGridlines: boolean;
                 *         };
                 *     };
                 * }}
                 */ (request["addSheet"]);

            expect(add.properties.index).toBe(
                snapshot.metadata.sheets.length + index
            );
            expect(add.properties.hidden).toBe(false);
            expect(add.properties.gridProperties.frozenRowCount).toBe(1);
            expect(add.properties.gridProperties.frozenColumnCount).toBe(2);
            expect(add.properties.gridProperties.hideGridlines).toBe(true);
        }
        const existingWrites = plan.requests.filter((request) =>
            JSON.stringify(request).includes('"sheetId":504')
        );

        expect(existingWrites).toStrictEqual([
            {
                updateCells: {
                    fields: "userEnteredValue",
                    rows: [
                        {
                            values: [
                                {
                                    userEnteredValue: {
                                        formulaValue: `${snapshot.integrity.formula.slice(0, -1)},SUM(ARRAYFORMULA(N(ISERROR('Containers'!A1:S3)))),SUM(ARRAYFORMULA(N(ISERROR('Container members'!A1:J4)))))`,
                                    },
                                },
                            ],
                        },
                    ],
                    start: { columnIndex: 1, rowIndex: 11, sheetId: 504 },
                },
            },
        ]);
        expect(
            plan.requests.filter((request) => "addProtectedRange" in request)
        ).toHaveLength(2);
        expect(JSON.stringify(plan.requests)).toContain('"warningOnly":true');
        expect(JSON.stringify(plan.requests)).toContain("JetBrains Mono");

        const resize = plan.requests.filter(
            (request) => "autoResizeDimensions" in request
        );

        expect(resize).toStrictEqual([
            {
                autoResizeDimensions: {
                    dimensions: {
                        dimension: "ROWS",
                        endIndex: 3,
                        sheetId: containerCatalogSheetId,
                        startIndex: 1,
                    },
                },
            },
            {
                autoResizeDimensions: {
                    dimensions: {
                        dimension: "ROWS",
                        endIndex: 4,
                        sheetId: containerMembersSheetId,
                        startIndex: 1,
                    },
                },
            },
        ]);
    });

    it("uses bounded blank-preserving lookups and validated native/page links", () => {
        expect.hasAssertions();

        const { catalog, snapshot } = fixture();
        const plan = buildContainerCatalogRequests(snapshot, catalog);
        const rows = writtenRows(plan);
        const first = required(required(rows[0])[1]);

        expect(plan.sourceRange).toBe("'Plant tracker'!A1:AJ3");
        expect(plan.containerRange).toBe("'Containers'!A1:S3");
        expect(plan.memberRange).toBe("'Container members'!A1:J4");

        for (const [index, column] of /** @type {[number, string][]} */ ([
            [1, "O"],
            [6, "P"],
            [7, "AB"],
            [8, "V"],
            [9, "AC"],
            [10, "D"],
            [11, "G"],
            [12, "H"],
        ])) {
            const range = `'Plant tracker'!$${column}$2:$${column}$3`;

            expect(first[index]?.formulaValue).toBe(
                `=XLOOKUP($A2,'Plant tracker'!$A$2:$A$3,ARRAYFORMULA(IF(${range}="","",${range})),"")`
            );
        }

        expect(first[15]?.formulaValue).toContain("/containers/P01/");
        expect(first[16]?.formulaValue).toContain("#gid=101&range=A1");
        expect(required(required(rows[1])[1])[3]?.formulaValue).toContain(
            "XLOOKUP($C2,"
        );
        expect(plan.preconditions.trackerIds).toStrictEqual(["P01", "P02"]);
    });

    it.each([
        "Containers",
        "containers",
        "Container members",
    ])("rejects existing %s destinations and replay", (title) => {
        expect.hasAssertions();

        const { catalog, snapshot } = fixture();
        snapshot.metadata.sheets.push({
            properties: {
                gridProperties: { columnCount: 26, rowCount: 100 },
                sheetId: 200,
                title,
            },
        });

        expect(() => buildContainerCatalogRequests(snapshot, catalog)).toThrow(
            "destination occupied"
        );
    });

    it.each([containerCatalogSheetId, containerMembersSheetId])(
        "rejects occupied sheet ID %s",
        (sheetId) => {
            expect.hasAssertions();

            const { catalog, snapshot } = fixture();
            required(snapshot.metadata.sheets[0]).properties.sheetId = sheetId;

            expect(() =>
                buildContainerCatalogRequests(snapshot, catalog)
            ).toThrow("destination occupied");
        }
    );

    it("rejects source header drift and missing inventory records", () => {
        expect.hasAssertions();

        const { catalog, snapshot } = fixture();
        required(snapshot.trackerValues[0])[3] = "Last water";

        expect(() => buildContainerCatalogRequests(snapshot, catalog)).toThrow(
            "headers changed"
        );

        snapshot.trackerValues[0] = [...containerTrackerHeaders];
        snapshot.trackerValues.pop();

        expect(() => buildContainerCatalogRequests(snapshot, catalog)).toThrow(
            "Container IDs"
        );
    });

    it("rejects duplicated tracker IDs and labels changed since export", () => {
        expect.hasAssertions();

        const { catalog, snapshot } = fixture();
        required(snapshot.trackerValues[2])[0] = "P01";

        expect(() => buildContainerCatalogRequests(snapshot, catalog)).toThrow(
            "Container IDs"
        );

        required(snapshot.trackerValues[2])[0] = "P02";
        required(snapshot.trackerValues[2])[14] = "New label";

        expect(() => buildContainerCatalogRequests(snapshot, catalog)).toThrow(
            "Current label changed"
        );
    });

    it("rejects missing, duplicate, or moved botanical members", () => {
        expect.hasAssertions();

        const { catalog, snapshot } = fixture();
        const member = required(catalog.members.pop());

        expect(() => buildContainerCatalogRequests(snapshot, catalog)).toThrow(
            "Member mismatch"
        );

        catalog.members.push(member, structuredClone(member));

        expect(() => buildContainerCatalogRequests(snapshot, catalog)).toThrow(
            "duplicate botanical"
        );

        catalog.members.pop();
        member.containerId = "P01";

        expect(() => buildContainerCatalogRequests(snapshot, catalog)).toThrow(
            `Member mismatch: ${member.slug}`
        );
    });

    it("rejects stale or ambiguous workbook page bindings", () => {
        expect.hasAssertions();

        const { catalog, snapshot } = fixture();
        const page = required(snapshot.metadata.sheets[1]);
        snapshot.metadata.sheets.push(structuredClone(page));

        expect(() => buildContainerCatalogRequests(snapshot, catalog)).toThrow(
            "exactly one workbook page"
        );

        snapshot.metadata.sheets.pop();
        page.properties.title = "Old page";

        expect(() => buildContainerCatalogRequests(snapshot, catalog)).toThrow(
            "Expected exactly one workbook page for P01"
        );
    });

    it("preserves formula-like imported descriptions as literal text", () => {
        expect.hasAssertions();

        const { catalog, snapshot } = fixture();
        required(catalog.containers[0]).careNote =
            '=IMPORTXML("https://example.invalid", "//data")';
        const rows = writtenRows(
            buildContainerCatalogRequests(snapshot, catalog)
        );

        expect(required(required(rows[0])[1])[13]).toStrictEqual({
            stringValue: required(catalog.containers[0]).careNote,
        });
    });

    it("rejects malformed acquisition dates and route slugs", () => {
        expect.hasAssertions();

        const { catalog, snapshot } = fixture();
        const member = required(catalog.members[0]);
        member.acquiredDate = "2026-02-30";

        expect(() => buildContainerCatalogRequests(snapshot, catalog)).toThrow(
            "Invalid acquisition date"
        );

        member.acquiredDate = "2026-09-21";
        member.slug = '../bad"path';

        expect(() => buildContainerCatalogRequests(snapshot, catalog)).toThrow(
            "Member mismatch"
        );
    });

    it.each([
        "=1+1",
        "=SUM(ISERROR('Containers'!A1:S3))",
        "=SUM(ISERROR('Container members'!A1:J4))",
    ])("rejects Integrity schema drift or replay: %s", (formula) => {
        expect.hasAssertions();

        const { catalog, snapshot } = fixture();
        snapshot.integrity.formula = formula;

        expect(() => buildContainerCatalogRequests(snapshot, catalog)).toThrow(
            "Integrity B12 changed"
        );
    });

    it.each([
        96,
        97,
        99,
    ])(
        "scales exact bounds for %s maintained containers without a spill",
        (count) => {
            expect.hasAssertions();

            const { catalog, snapshot } = fixture(count);
            const plan = buildContainerCatalogRequests(snapshot, catalog);

            expect(plan.sourceRange).toBe(`'Plant tracker'!A1:AJ${count + 1}`);
            expect(required(writtenRows(plan)[0])).toHaveLength(count + 1);

            const first = required(required(writtenRows(plan)[0])[1]);

            expect(first[1]?.formulaValue).toContain(`$A$2:$A$${count + 1},`);
        }
    );
});
