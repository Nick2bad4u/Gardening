import { expect, type Page, test } from "@playwright/test";

// eslint-disable-next-line import-x/extensions -- Shared ESM fixture also serves the isolated browser preview.
import { loggerBrowserFixture } from "../helpers/logger-browser-fixture.mjs";

const openLogger = async (page: Readonly<Page>, textScale: number) => {
    await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/Gardening/logger-fixture") {
            await route.fulfill({
                body: loggerBrowserFixture({ holdBatch: true }),
                contentType: "text/html",
            });
        } else await route.abort();
    });
    await page.goto("/Gardening/logger-fixture");
    await page.addStyleTag({
        content: `:root { font-size: ${16 * textScale}px; }`,
    });
    await expect
        .soft(
            page.getByText("Connected · Logger browser-fixture", {
                exact: true,
            })
        )
        .toBeVisible();
};

const expectContentFits = async (page: Readonly<Page>) => {
    expect
        .soft(
            await page.evaluate(() => {
                const problems: string[] = [];
                const root = document.documentElement;
                if (root.scrollWidth > root.clientWidth + 1)
                    problems.push(
                        `Document: ${root.scrollWidth}px in ${root.clientWidth}px`
                    );
                for (const element of document.querySelectorAll<HTMLElement>(
                    ".queue-header, .queue-tools, .queue-item, .mist-target"
                )) {
                    if (element.getClientRects().length === 0) continue;
                    if (element.scrollWidth > element.clientWidth + 1)
                        problems.push(
                            `${element.className}: ${element.scrollWidth}px in ${element.clientWidth}px`
                        );
                    const bounds = element.getBoundingClientRect();
                    for (const child of element.children) {
                        const childBounds = child.getBoundingClientRect();
                        if (
                            childBounds.left < bounds.left - 1 ||
                            childBounds.right > bounds.right + 1
                        )
                            problems.push(
                                `${element.className}: child extends past horizontal bounds`
                            );
                    }
                }
                if (getComputedStyle(root).fontSize === "16px") {
                    for (const grid of document.querySelectorAll<HTMLElement>(
                        ".mist-target-grid"
                    )) {
                        if (grid.getClientRects().length === 0) continue;
                        const targets = Array.from(grid.children, (child) =>
                            child.getBoundingClientRect()
                        );
                        const firstRow = targets.filter(
                            (target) => target.top === targets[0]?.top
                        );
                        if (firstRow.length !== 3)
                            problems.push(
                                "Mist: normal text must retain three columns"
                            );
                    }
                }
                return problems;
            })
        )
        .toStrictEqual([]);
};

const expectQueueControls = async (page: Readonly<Page>, textScale: number) => {
    const clear = page.getByRole("button", {
        exact: true,
        name: "Clear queue",
    });
    const count = page.getByLabel(/^\d+ queued observations?$/v);
    await expect.soft(count).toHaveText("2");
    await page
        .getByRole("button", {
            name: /^Remove .*Eastern prickly pear cactus from queue$/v,
        })
        .click();
    await expect.soft(count).toHaveText("1");
    page.once("dialog", (dialog) => dialog.accept());
    await clear.click();
    await expect.soft(count).toBeHidden();
    await page.reload();
    await page.addStyleTag({
        content: `:root { font-size: ${16 * textScale}px; }`,
    });
    const send = page.getByRole("button", {
        exact: true,
        name: "Send 2 queued",
    });
    await send.click();
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.dataset["fixtureBatch"]
            )
        )
        .toBe("1");
    await expectContentFits(page);
    await page.evaluate(() =>
        dispatchEvent(new Event("fixture-confirm-batch"))
    );
    await expect.soft(count).toBeHidden();
};

test.describe("logger text enlargement", { tag: "@logger" }, () => {
    for (const width of [
        320,
        390,
        1280,
    ]) {
        for (const theme of ["dark", "light"] as const) {
            for (const textScale of [
                1,
                1.5,
                2,
            ]) {
                test(`queue and Mist controls fit ${width}px ${theme} at ${textScale * 100}% text`, async ({
                    page,
                }) => {
                    await page.setViewportSize({ height: 900, width });
                    await page.emulateMedia({
                        colorScheme: theme,
                        reducedMotion: "reduce",
                    });
                    await openLogger(page, textScale);
                    await page
                        .getByRole("button", { exact: true, name: "Mist" })
                        .click();
                    const roots = page.getByRole("checkbox", {
                        exact: true,
                        name: "Exposed roots",
                    });
                    await roots.check();
                    await expect.soft(roots).toBeChecked();
                    await expectContentFits(page);
                    await page
                        .getByRole("tab", { exact: true, name: "Bulk care" })
                        .click();
                    await page
                        .getByRole("button", { exact: true, name: "Mist" })
                        .click();
                    await roots.check();
                    await expect.soft(roots).toBeChecked();
                    await expectContentFits(page);
                    await page
                        .getByRole("tab", { exact: true, name: "Single plant" })
                        .click();
                    await expectQueueControls(page, textScale);
                });
            }
        }
    }
});
