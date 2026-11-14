import { expect, type Page, test } from "@playwright/test";

const plantCsv = [
    "Plant ID,Current pot label,Plant / planter,Scientific name / contents",
    "P01,A1,Variegated moon cactus,Gymnocalycium mihanovichii",
].join("\n");
const historyCsv = [
    "Date,Plant ID,Event,Pot setup,Record status,Rotation (°),Rotation from facing,Rotation to facing,Notes",
    "2026-09-01,P01,Rotation,1,Active,,,N,Initial facing",
    '2026-09-02,P01,Rotation,1,Active,270,N,W,"Quarter turn, with ""quoted"" note"',
    "2026-09-03,P01,Rotation,1,Active,180,,,Legacy turn",
    "2026-09-04,P01,Rotation,1,Active,0,W,W,Facing confirmation",
].join("\n");
const confirmation = "W (Mylar) → W (Mylar) · 0° · facing confirmed";

async function expectContained(page: Readonly<Page>) {
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        )
        .toBe(true);
}

async function expectExport(page: Readonly<Page>) {
    const exportButton = page.getByRole("button", {
        name: "Export this plant CSV",
    });
    await exportButton.focus();
    await expect.soft(exportButton).toBeFocused();
    const downloading = page.waitForEvent("download");
    await page.keyboard.press("Enter");
    const download = await downloading;
    const stream = await download.createReadStream();
    let csv = "";
    for await (const chunk of stream) csv += String(chunk);
    expect
        .soft({
            filename: download.suggestedFilename(),
            hasClockwiseEquivalent: csv.includes(",270,"),
            hasConfirmation: csv.includes(",W,W\r\n"),
            hasEscapedNote: csv.includes(
                '"Quarter turn, with ""quoted"" note"'
            ),
            hasFacingColumns: (csv.split("\r\n", 1)[0] ?? "").endsWith(
                "Leaf VPD source,Rotation from facing,Rotation to facing"
            ),
            hasQuarterTurn: csv.includes(",N,W\r\n"),
        })
        .toStrictEqual({
            filename: "P01-A1-history.csv",
            hasClockwiseEquivalent: true,
            hasConfirmation: true,
            hasEscapedNote: true,
            hasFacingColumns: true,
            hasQuarterTurn: true,
        });
}

async function expectHistory(page: Readonly<Page>) {
    const rows = page
        .getByRole("table", {
            name: "Watering, measurement, weight, and condition events for this plant",
        })
        .getByRole("row");
    await expect
        .poll(async () => {
            const initialRows = await rows
                .filter({ hasText: "Initial facing" })
                .allTextContents();
            const quarterRows = await rows
                .filter({ hasText: "Quarter turn" })
                .allTextContents();
            const legacyRows = await rows
                .filter({ hasText: "Legacy turn" })
                .allTextContents();
            const initial = initialRows.join(" ");
            const quarter = quarterRows.join(" ");
            const legacy = legacyRows.join(" ");
            return {
                hasInitialFacing: initial.includes(
                    "Facing N (window) · previous facing not recorded"
                ),
                hasLegacyDegrees: legacy.includes(
                    "180° clockwise-equivalent turn"
                ),
                hasQuarterTurn: quarter.includes(
                    "N (window) → W (Mylar) · 90° counterclockwise"
                ),
                inventsInitialTurn: initial.includes("90°"),
                rows: await rows.count(),
            };
        })
        .toStrictEqual({
            hasInitialFacing: true,
            hasLegacyDegrees: true,
            hasQuarterTurn: true,
            inventsInitialTurn: false,
            rows: 5,
        });
}

test.describe("public cardinal rotation", { tag: "@rotation" }, () => {
    for (const theme of ["dark", "light"] as const) {
        for (const width of [390, 1280]) {
            test(`${theme} ${width}px history and tracker retain facing context`, async ({
                page,
            }) => {
                const errors: string[] = [];
                function onError(error: Readonly<Error>) {
                    errors.push(error.message);
                }
                page.on("pageerror", onError);
                try {
                    await page.setViewportSize({ height: 844, width });
                    await page.emulateMedia({
                        colorScheme: theme,
                        reducedMotion: "reduce",
                    });
                    await page.route(
                        "**://*.googletagmanager.com/**",
                        (route) => route.abort()
                    );
                    await page.route(
                        "https://docs.google.com/**",
                        async (route) => {
                            const url = new URL(route.request().url());
                            await route.fulfill({
                                body:
                                    url.searchParams.get("gid") === "0"
                                        ? plantCsv
                                        : historyCsv,
                                contentType: "text/csv",
                            });
                        }
                    );
                    await page.goto("/Gardening/pots/P01/");
                    await expectHistory(page);
                    await expect
                        .soft(
                            page
                                .getByRole("region", {
                                    name: "Care milestones",
                                })
                                .getByRole("article")
                                .filter({
                                    has: page.getByText("Rotations", {
                                        exact: true,
                                    }),
                                })
                        )
                        .toContainText(confirmation);
                    await expectContained(page);
                    await expectExport(page);
                    await page.goto("/Gardening/tracker/");
                    const tracker = page
                        .getByRole("region", { name: "Current plant status" })
                        .getByRole("table");
                    await expect.soft(tracker).toContainText(confirmation);
                    await expect.soft(tracker).toContainText("Recorded");
                    await expectContained(page);
                    expect.soft(errors).toStrictEqual([]);
                } finally {
                    page.off("pageerror", onError);
                }
            });
        }
    }
});
