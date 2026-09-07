import { expect, test } from "@playwright/test";

test.describe("published Storybook", { tag: "@storybook" }, () => {
    test("opens the introduction as the landing page", async ({ page }) => {
        await page.goto("/storybook/");
        const preview = page.frameLocator("#storybook-preview-iframe");
        await expect
            .soft(
                preview.getByRole("heading", {
                    name: "Gardening website workbench",
                })
            )
            .toBeVisible();
        await expect
            .soft(preview.getByRole("heading", { name: "Run the checks" }))
            .toBeVisible();
    });

    test("renders autodocs and the preview controls", async ({ page }) => {
        await page.setViewportSize({ height: 844, width: 390 });
        await page.goto("/storybook/?path=/docs/website-field-guide--docs");
        const preview = page.frameLocator("#storybook-preview-iframe");
        await expect
            .soft(
                preview.getByRole("heading", {
                    exact: true,
                    name: "Field guide",
                })
            )
            .toBeVisible();
        const dimensions = await preview
            .getByRole("heading", { exact: true, name: "Field guide" })
            .evaluate((heading) => {
                const root = heading.ownerDocument.documentElement;
                return { scroll: root.scrollWidth, viewport: root.clientWidth };
            });
        expect.soft(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
        await expect
            .soft(
                preview.getByText(
                    "Initial page theme. Each preview has its own temporary preferences.",
                    { exact: true }
                )
            )
            .toBeVisible();
    });

    test("loads the actual website under the Storybook subpath", async ({
        page,
    }) => {
        await page.goto(
            "/storybook/iframe.html?id=website-field-guide--contents&viewMode=story"
        );
        const frame = page
            .frameLocator('iframe[title="Gardening website preview"]')
            .owner();
        await expect
            .soft(frame)
            .toHaveAttribute(
                "src",
                /\/storybook\/docs\/plant-booklet\/index\.html/v
            );
        await expect
            .soft(
                frame.contentFrame().getByRole("heading", {
                    name: "A field guide to the collection.",
                })
            )
            .toBeVisible();
        // Accessibility checks must also work after production minification.
        const accessibilityVersion = await frame
            .contentFrame()
            .getByRole("main")
            .evaluate((root) => {
                const frameWindow = root.ownerDocument.defaultView;
                if (!frameWindow)
                    throw new Error("The website frame has no window.");
                const axe: unknown = Reflect.get(frameWindow, "axe");
                return typeof axe === "object" &&
                    axe !== null &&
                    "version" in axe
                    ? axe.version
                    : undefined;
            });
        expect.soft(accessibilityVersion).toMatch(/^4\./v);
        expect.soft(await page.pageErrors()).toStrictEqual([]);
    });

    test("loads SVG assets beneath the static workbench", async ({ page }) => {
        await page.goto(
            "/storybook/iframe.html?id=ui-icons--light&viewMode=story"
        );
        const icon = page.getByRole("img", { name: "cactus icon" });
        await expect
            .soft(icon)
            .toHaveAttribute("src", "./assets/ui-icons/cactus.svg");
        await expect
            .poll(() =>
                icon.evaluate(
                    (element: Readonly<HTMLImageElement>) =>
                        element.naturalWidth
                )
            )
            .toBeGreaterThan(0);
    });
});
