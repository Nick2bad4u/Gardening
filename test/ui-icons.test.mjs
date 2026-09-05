import fs from "node:fs";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { parseUiIcons } from "../scripts/sync-ui-icons.mjs";

const sprite = fs.readFileSync(
    new URL("../docs/plant-booklet/plant-icons.svg", import.meta.url),
    "utf8"
);
const logger = fs.readFileSync(
    new URL("../scripts/google-sheets/Index.html", import.meta.url),
    "utf8"
);
const icons = parseUiIcons(sprite);

describe("shared multicolor interface artwork", () => {
    it("exports every interface/category symbol as a self-contained accessible SVG", () => {
        expect(icons).toHaveLength(83);
        const files = fs
            .readdirSync(new URL("../assets/ui-icons/", import.meta.url))
            .filter((name) => name.endsWith(".svg"));
        expect(files.sort()).toEqual(
            icons.map((icon) => `${icon.name}.svg`).sort()
        );
        for (const icon of icons) {
            const asset = fs.readFileSync(
                new URL(`../assets/ui-icons/${icon.name}.svg`, import.meta.url),
                "utf8"
            );
            expect(icon.viewBox, icon.name).toBe("0 0 64 64");
            expect(asset, icon.name).toContain(
                `aria-labelledby="ui-${icon.name}-title"`
            );
            expect(asset, icon.name).toContain('width="64" height="64"');
            expect(asset, icon.name).toContain(
                `aria-describedby="ui-${icon.name}-description"`
            );
            expect(asset, icon.name).toMatch(
                new RegExp(`<desc id="ui-${icon.name}-description">\\s*\\S`)
            );
            expect(asset, icon.name).not.toMatch(
                /<script|<foreignObject|currentcolor|href="https?:|onload=/i
            );
            const ids = [...asset.matchAll(/\bid="([^"]+)"/g)].map(
                (match) => match[1]
            );
            expect(new Set(ids).size, icon.name).toBe(ids.length);
            for (const ref of asset.matchAll(/(?:url\(#|href="#)([\w-]+)/g)) {
                expect(ids, `${icon.name}: ${ref[1]}`).toContain(ref[1]);
            }
            expect(
                new Set(
                    [...asset.matchAll(/#[a-f\d]{6}/gi)].map(
                        (match) => match[0]
                    )
                ).size
            ).toBeGreaterThanOrEqual(2);
        }
    });

    it("renders every icon at 64 pixels without empty artwork or clipped edges", async () => {
        for (const icon of icons) {
            const { data, info } = await sharp(
                fs.readFileSync(
                    new URL(
                        `../assets/ui-icons/${icon.name}.svg`,
                        import.meta.url
                    )
                )
            )
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });
            expect([info.width, info.height], icon.name).toEqual([64, 64]);
            let paintedPixels = 0;
            let clippedPixels = 0;
            for (let y = 0; y < info.height; y++) {
                for (let x = 0; x < info.width; x++) {
                    const alpha =
                        data[(y * info.width + x) * info.channels + 3];
                    if (alpha <= 16) continue;
                    paintedPixels++;
                    if (x < 2 || y < 2 || x >= 62 || y >= 62) clippedPixels++;
                }
            }
            expect(paintedPixels, icon.name).toBeGreaterThan(120);
            expect(clippedPixels, icon.name).toBe(0);
        }
    });

    it("keeps logger definitions namespaced and avoids unresolved gradient references", () => {
        const ids = [...logger.matchAll(/\bid="([^"]+)"/g)].map(
            (match) => match[1]
        );
        expect(new Set(ids).size).toBe(ids.length);
        for (const match of logger.matchAll(/url\(#(app-ui-[\w-]+)\)/g)) {
            expect(ids).toContain(match[1]);
        }
        expect(logger).toContain('viewBox="0 0 64 64"');
        expect(logger).not.toContain("assets/ui-icons/");
    });
});
