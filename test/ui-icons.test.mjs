import * as fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { parseUiIcons } from "../scripts/sync-ui-icons.mjs";
import { required } from "./helpers/required.mjs";

const sprite = fs.readFileSync(
    new URL("../docs/plant-booklet/plant-icons.svg", import.meta.url),
    "utf8"
);
const logger = fs.readFileSync(
    new URL("../scripts/google-sheets/Index.html", import.meta.url),
    "utf8"
);
const icons = parseUiIcons(sprite);

/** @param {Uint8Array} data @param {import("sharp").OutputInfo} info */
function countPixels(data, info) {
    let paintedPixels = 0;
    let clippedPixels = 0;
    for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
            const alpha = required(
                data[(y * info.width + x) * info.channels + 3]
            );
            if (alpha > 16) {
                paintedPixels += 1;
                clippedPixels += Number(x < 2 || y < 2 || x >= 62 || y >= 62);
            }
        }
    }
    return { clippedPixels, paintedPixels };
}

describe("shared multicolor interface artwork", () => {
    it("exports every interface/category symbol as a self-contained accessible SVG", () => {
        expect.hasAssertions();
        expect(icons).toHaveLength(83);

        const files = fs
            .readdirSync(new URL("../assets/ui-icons/", import.meta.url))
            .filter((name) => name.endsWith(".svg"));

        expect(
            files.toSorted((left, right) => left.localeCompare(right))
        ).toStrictEqual(
            icons
                .map((icon) => `${icon.name}.svg`)
                .toSorted((left, right) => left.localeCompare(right))
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

            const descriptions = Array.from(
                asset.matchAll(
                    /<desc id="(?<id>[^"]+)">(?<text>[^<]*)<\/desc>/gv
                )
            );
            const description = descriptions.find(
                (match) =>
                    match.groups?.["id"] === `ui-${icon.name}-description`
            );

            expect(description?.groups?.["text"], icon.name).toMatch(/\S/v);
            expect(asset, icon.name).not.toMatch(
                /<script|<foreignobject|currentcolor|href="https?:|onload=/iv
            );

            const ids = Array.from(
                asset.matchAll(/\bid="(?<id>[^"]+)"/gv),
                (match) => required(match.groups?.["id"])
            );

            const uniqueIds = new Set(ids);

            expect(uniqueIds.size, icon.name).toBe(ids.length);

            for (const ref of asset.matchAll(
                /(?:url\(#|href="#)(?<id>[\w\-]+)/gv
            )) {
                const referenceId = required(ref.groups?.["id"]);

                expect(ids, `${icon.name}: ${referenceId}`).toContain(
                    referenceId
                );
            }

            const colors = new Set(
                Array.from(
                    asset.matchAll(/#[\da-f]{6}/giv),
                    (match) => match[0]
                )
            );

            expect(colors.size).toBeGreaterThanOrEqual(2);
        }
    });

    it("renders every icon at 64 pixels without empty artwork or clipped edges", async () => {
        expect.hasAssertions();

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

            expect([info.width, info.height], icon.name).toStrictEqual([
                64,
                64,
            ]);

            const { clippedPixels, paintedPixels } = countPixels(data, info);

            expect(paintedPixels, icon.name).toBeGreaterThan(120);
            expect(clippedPixels, icon.name).toBe(0);
        }
    });

    it("keeps logger definitions namespaced and avoids unresolved gradient references", () => {
        expect.hasAssertions();

        const ids = Array.from(
            logger.matchAll(/\bid="(?<id>[^"]+)"/gv),
            (match) => required(match.groups?.["id"])
        );

        const uniqueIds = new Set(ids);

        expect(uniqueIds.size).toBe(ids.length);

        for (const match of logger.matchAll(
            /url\(#(?<id>app-ui-[\w\-]+)\)/gv
        )) {
            expect(ids).toContain(required(match.groups?.["id"]));
        }

        expect(logger).toContain('viewBox="0 0 64 64"');
        expect(logger).not.toContain("assets/ui-icons/");
    });
});
