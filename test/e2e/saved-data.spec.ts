import { expect, type Locator, type Page, test } from "@playwright/test";

const trackerPath = "/Gardening/tracker/";
const featherPath = "/Gardening/pots/P02/";
const refreshName = "Refresh data";
const sourceStateAttribute = "data-state";
const plantCsv = [
    "Plant ID,Current pot label,Plant / planter,Scientific name / contents",
    "P02,A2,Feather cactus,Mammillaria plumosa",
].join("\n");
const historyHeader =
    "Date,Plant ID,Event,Weight state,Weight (g),Height (cm),Width (cm),Plant condition,Notes,Pot setup,Record status,Request ID";

interface SheetResponse {
    blocked: boolean;
    empty: boolean;
    failed: boolean;
    weight: number;
}

function createNetworkGate() {
    const events = new EventTarget();
    const controller = new AbortController();
    let isReleased = false;
    return {
        release() {
            isReleased = true;
            events.dispatchEvent(new Event("release"));
            controller.abort();
        },
        async wait() {
            if (isReleased) return true;
            return new Promise<boolean>((resolve) => {
                events.addEventListener(
                    "release",
                    () => {
                        resolve(true);
                    },
                    { once: true, signal: controller.signal }
                );
            });
        },
    };
}

async function expectFreshData(page: Readonly<Page>) {
    await expectSourceState(page, "live", "Source read");
    await expect.soft(freshness(page)).not.toContainText("Saved preview");
}

async function expectSavedFailure(page: Readonly<Page>) {
    await expectSourceState(page, "error", "Still showing saved data");
    await expectWeight(page, 450);
}

async function expectSavedPreview(page: Readonly<Page>) {
    await expectSourceState(
        page,
        "saved",
        /Saved preview · Source read .[^\d\n\r\u{2028}\u{2029}]*\d.+ · Refreshing Google Sheets/v
    );
    await expectWeight(page, 450);
    await expect
        .soft(page.getByRole("button", { name: refreshName }))
        .toBeDisabled();
}

async function expectSourceState(
    page: Readonly<Page>,
    state: string,
    notice: Readonly<RegExp> | string
) {
    await expect
        .soft(freshness(page))
        .toHaveAttribute(sourceStateAttribute, state);
    await expect.soft(freshness(page)).toContainText(notice);
}

async function expectWeight(page: Readonly<Page>, weight: 425 | 450) {
    await expect
        .soft(latestWeight(page))
        .toContainText(
            weight === 450 ? /450(?:\.0)?\s*g/v : /425(?:\.0)?\s*g/v
        );
}
function freshness(page: Readonly<Page>): Locator {
    return page.getByRole("status", { name: "Data freshness" });
}

function latestWeight(page: Readonly<Page>): Locator {
    return page
        .getByRole("region", { name: "Latest observations" })
        .getByRole("article")
        .filter({ has: page.getByText("Latest weight", { exact: true }) });
}

async function mockSheet(
    page: Readonly<Page>,
    response: Readonly<SheetResponse>,
    gate: Readonly<ReturnType<typeof createNetworkGate>> = createNetworkGate()
) {
    await page.route("**://*.googletagmanager.com/**", (route) =>
        route.abort()
    );
    await page.route("https://docs.google.com/**", async (route) => {
        if (response.blocked) await gate.wait();
        const requestUrl = new URL(route.request().url());
        const isTracker = requestUrl.searchParams.get("gid") === "0";
        const history = response.empty
            ? historyHeader
            : `${historyHeader}\n2026-09-01,P02,Weight,Routine,${response.weight},,,Healthy,Synthetic reading,1,Active,fixture-only`;
        await route.fulfill({
            body: response.failed
                ? "Temporarily unavailable"
                : isTracker
                  ? plantCsv
                  : history,
            contentType: "text/csv",
            status: response.failed ? 503 : 200,
        });
    });
}

test.describe("saved public observations", { tag: "@cache" }, () => {
    test("shares an immediate dated preview between tools, retains it on failure, and replaces it on retry", async ({
        page,
    }) => {
        const gate: Readonly<ReturnType<typeof createNetworkGate>> =
            createNetworkGate();
        const response: SheetResponse = {
            blocked: false,
            empty: false,
            failed: false,
            weight: 450,
        };
        await mockSheet(page, response, gate);
        await page.goto(trackerPath);
        await expectFreshData(page);
        response.blocked = true;
        try {
            await page.goto(featherPath);
            await expectSavedPreview(page);
            response.failed = true;
            gate.release();
            await expectSavedFailure(page);
            response.failed = false;
            response.blocked = false;
            response.weight = 425;
            await page.getByRole("button", { name: refreshName }).click();
            await expectFreshData(page);
            await expectWeight(page, 425);
            await page.goto(trackerPath);
            await expect
                .soft(
                    page.getByRole("table", {
                        name: "Current collection values derived from the Google Sheets observation history",
                    })
                )
                .toContainText("425");
        } finally {
            gate.release();
        }
    });

    test("a successful empty history clears a previous cached reading", async ({
        page,
    }) => {
        const response: SheetResponse = {
            blocked: false,
            empty: false,
            failed: false,
            weight: 450,
        };
        await mockSheet(page, response);
        await page.goto(featherPath);
        await expectFreshData(page);
        await expectWeight(page, 450);
        response.empty = true;
        await page.getByRole("button", { name: refreshName }).click();
        await expectFreshData(page);
        await expect.soft(latestWeight(page)).not.toContainText("450");
        await page.reload();
        await expectFreshData(page);
        await expect.soft(latestWeight(page)).not.toContainText("450");
    });

    test("a pot's maintained identity and shared-profile links are present without a Sheet request or JavaScript", async ({
        browser,
    }) => {
        await using context = await browser.newContext({
            javaScriptEnabled: false,
        });
        const page = await context.newPage();
        await page.goto(featherPath);
        await expect
            .soft(
                page.getByRole("heading", {
                    level: 1,
                    name: "Feather cactus",
                })
            )
            .toBeVisible();
        await expect
            .soft(page.getByText("Mammillaria plumosa", { exact: true }))
            .toBeVisible();
        const profiles = page
            .getByRole("group", { name: "Field guide profiles" })
            .getByRole("link");
        await expect
            .soft(profiles)
            .toHaveAttribute("href", "/Gardening/plants/mammillaria-plumosa/");
        await page.goto("/Gardening/pots/P19/");
        await expect.soft(profiles).toHaveCount(3);
        await expect.soft(latestWeight(page)).not.toContainText("450");
    });
});
