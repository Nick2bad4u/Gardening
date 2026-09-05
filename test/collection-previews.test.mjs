import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import sharp from "sharp";
import { describe, expect, it, onTestFinished, vi } from "vitest";

import {
    publishCollectionPreviews,
    rewriteCollectionPreviews,
} from "../scripts/collection-previews.mjs";

describe("collection preview publication", () => {
    const id = "dc12adda1e1244a4d55c90973b15ff25";
    const previews = new Map([
        [
            id,
            [
                {
                    path: `assets/collection-previews/${id}.w320.webp`,
                    width: 320,
                },
                {
                    path: `assets/collection-previews/${id}.w960.webp`,
                    width: 960,
                },
            ],
        ],
    ]);

    it("serves responsive images locally while preserving the capture link and credit", () => {
        expect.hasAssertions();

        const html = `<a href="https://gyazo.com/${id}"><img src="https://thumb.gyazo.com/thumb/960/${id}.jpg" srcset="https://thumb.gyazo.com/thumb/480/${id}.jpg 480w" sizes="100vw" alt="Current plant" loading="lazy" data-external-image></a><span>© Nick</span>`;
        const output = rewriteCollectionPreviews(html, previews, "../");

        expect(output).toContain(`href="https://gyazo.com/${id}"`);
        expect(output).toContain(
            `src="../assets/collection-previews/${id}.w960.webp"`
        );
        expect(output).toContain(
            `../assets/collection-previews/${id}.w320.webp 320w`
        );
        expect(output).toContain(
            'sizes="100vw" alt="Current plant" loading="lazy"'
        );
        expect(output).toContain("© Nick");
        expect(output).not.toContain("thumb.gyazo.com");
    });

    it("leaves unrelated images intact and rejects a missing selected preview", () => {
        expect.hasAssertions();

        const reference =
            '<img src="./assets/plants/reference.jpg" alt="Reference">';

        expect(rewriteCollectionPreviews(reference, previews, "./")).toBe(
            reference
        );
        expect(() =>
            rewriteCollectionPreviews(
                `<img src="https://thumb.gyazo.com/thumb/960/${id}.jpg">`,
                new Map(),
                "./"
            )
        ).toThrow("Missing published collection preview");
    });

    it("reuses a cached capture across builds and avoids duplicate small-image variants", async () => {
        expect.hasAssertions();

        const temporaryRoot = path.resolve(tmpdir());
        const directory = await mkdtemp(
            path.join(temporaryRoot, "gardening-previews-")
        );
        onTestFinished(async () => {
            if (
                !path
                    .resolve(directory)
                    .startsWith(
                        `${temporaryRoot}${path.sep}gardening-previews-`
                    )
            ) {
                throw new Error(
                    "Preview test cleanup left its temporary directory."
                );
            }
            await rm(directory, { force: true, recursive: true });
        });
        const original = await sharp({
            create: {
                background: "#5b8662",
                channels: 3,
                height: 120,
                width: 160,
            },
        })
            .png()
            .toBuffer();
        const download = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue(new Response(new Uint8Array(original)));
        onTestFinished(() => {
            download.mockRestore();
        });
        const documents = [
            `<img src="https://thumb.gyazo.com/thumb/960/${id}.jpg">`,
        ];

        const firstBuild = await publishCollectionPreviews(
            documents,
            directory,
            path.join(directory, "first-build")
        );
        const secondBuild = await publishCollectionPreviews(
            documents,
            directory,
            path.join(directory, "second-build")
        );

        expect(download).toHaveBeenCalledTimes(1);
        expect(
            firstBuild.get(id)?.map((variant) => variant.width)
        ).toStrictEqual([160]);
        expect(secondBuild).toStrictEqual(firstBuild);

        const outputPath = path.join(
            directory,
            "second-build",
            `assets/collection-previews/${id}.w160.webp`
        );
        const publishedBytes = await readFile(outputPath);
        const metadata = await sharp(publishedBytes).metadata();

        expect(metadata).toMatchObject({
            format: "webp",
            height: 120,
            width: 160,
        });
    });
});
