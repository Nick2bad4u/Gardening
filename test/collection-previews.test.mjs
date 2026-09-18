import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import sharp from "sharp";
import { describe, expect, it, onTestFinished, vi } from "vitest";

import {
    publishCollectionPreviews,
    rewriteCollectionPreviews,
    rewriteUnavailableCollectionPreviews,
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

    it("shows an explicit unavailable state while preserving capture links and provenance", () => {
        expect.hasAssertions();

        const html = `<a href="https://gyazo.com/${id}"><img src="https://thumb.gyazo.com/thumb/960/${id}.jpg" alt="Synthetic plant"></a><figcaption>Original caption · © Owner</figcaption>`;
        const output = rewriteUnavailableCollectionPreviews(
            html,
            new Set([id])
        );

        expect(output).toContain('class="photo-unavailable"');
        expect(output).toContain(`href="https://gyazo.com/${id}"`);
        expect(output).toContain("Original caption · © Owner");
        expect(output).not.toContain("<img");
        expect(rewriteUnavailableCollectionPreviews(html, new Set())).toBe(
            html
        );
    });

    it("retries a transient thumbnail failure then uses only the reviewed capture original", async () => {
        expect.hasAssertions();

        const directory = await captureFixture(id);
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
            .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
            .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
            .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
            .mockResolvedValue(new Response(new Uint8Array(original)));
        onTestFinished(() => {
            download.mockRestore();
        });
        const output = await publishCollectionPreviews(
            [`<img src="https://thumb.gyazo.com/thumb/960/${id}.jpg">`],
            directory,
            path.join(directory, "published")
        );

        expect(download).toHaveBeenCalledTimes(4);
        expect(download).toHaveBeenLastCalledWith(
            `https://i.gyazo.com/${id}.jpg`,
            expect.objectContaining({ signal: expect.any(AbortSignal) })
        );
        expect(output.get(id)?.map((variant) => variant.width)).toStrictEqual([
            160,
        ]);
    });

    it("allows explicit network absence but never treats corrupt image bytes as an optional preview", async () => {
        expect.hasAssertions();

        const directory = await captureFixture(id);
        const download = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue(new Response("Unavailable", { status: 404 }));
        onTestFinished(() => {
            download.mockRestore();
        });
        const onUnavailable = vi.fn();
        const documents = [
            `<img src="https://thumb.gyazo.com/thumb/960/${id}.jpg">`,
        ];
        const output = await publishCollectionPreviews(
            documents,
            directory,
            path.join(directory, "published"),
            {
                onUnavailable: (captureId, error) => {
                    onUnavailable(captureId, error);
                },
            }
        );

        expect(output.size).toBe(0);
        expect(onUnavailable).toHaveBeenCalledExactlyOnceWith(
            id,
            expect.any(DOMException)
        );

        download.mockResolvedValue(new Response("not an image"));
        onUnavailable.mockClear();

        await expect(
            publishCollectionPreviews(
                documents,
                directory,
                path.join(directory, "corrupt"),
                {
                    onUnavailable: (captureId, error) => {
                        onUnavailable(captureId, error);
                    },
                }
            )
        ).rejects.toThrow(/unsupported image format/v);
        expect(onUnavailable).not.toHaveBeenCalled();
    });

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
        expect(download).toHaveBeenCalledWith(
            `https://thumb.gyazo.com/thumb/960/${id}.jpg`,
            expect.objectContaining({ signal: expect.any(AbortSignal) })
        );
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

/** @param {string} id */
async function captureFixture(id) {
    const temporaryRoot = path.resolve(tmpdir());
    const directory = await mkdtemp(
        path.join(temporaryRoot, "gardening-preview-fallback-")
    );
    onTestFinished(async () => {
        if (
            !directory.startsWith(
                `${temporaryRoot}${path.sep}gardening-preview-fallback-`
            )
        )
            throw new Error("Unsafe preview fixture cleanup.");
        await rm(directory, { force: true, recursive: true });
    });
    const manifestDirectory = path.join(directory, "assets/collection-photos");
    await mkdir(manifestDirectory, { recursive: true });
    await writeFile(
        path.join(manifestDirectory, "photo-manifest.json"),
        JSON.stringify({
            collection_overviews: [
                {
                    alt: "Synthetic plant",
                    caption: "Synthetic fixture",
                    image_id: id,
                    image_url: `https://i.gyazo.com/${id}.jpg`,
                    kind: "collection",
                    page_url: `https://gyazo.com/${id}`,
                    provider: "gyazo",
                    publication_name: "synthetic.jpg",
                    upload_metadata: {
                        app: "Test",
                        desc: "Synthetic",
                        title: "Test",
                        url: "https://example.com",
                    },
                    view: "overview",
                },
            ],
            copyright_notice: "Synthetic fixture",
            gyazo_collection: {
                id: "test",
                url: "https://gyazo.com/collections/test",
            },
            nursery_label_archive_evidence: [],
            plants: [],
            schema_version: 3,
        })
    );
    return directory;
}
