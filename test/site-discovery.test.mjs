import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { getProfiles } from "../site/lib/content.mjs";
import {
    getPhotoComparison,
    getPlantDiscovery,
    isPlantDiscovery,
} from "../site/lib/plant-discovery.mjs";
import {
    getReferenceGallery,
    isGalleryTopics,
} from "../site/lib/reference-gallery.mjs";
import { contentUrl } from "../site/lib/routes.mjs";

const profiles = await getProfiles();
const knownSlugs = new Set(profiles.map((profile) => profile.slug));
const sourcePhoto = profiles
    .flatMap((profile) => profile.collectionRecord.photos)
    .find((photo) => photo.kind === "collection");
if (!sourcePhoto) throw new Error("Missing collection photo test baseline.");

describe("plant discovery publication", () => {
    it("gives every profile its own reviewed image and connected research", async () => {
        expect.hasAssertions();

        const records = await Promise.all(
            profiles.map((profile) =>
                getPlantDiscovery(profile.slug, knownSlugs)
            )
        );
        const illustrations = await Promise.all(
            records.map(async (record) => {
                const bytes = await readFile(record.image.file);
                const image = await sharp(bytes).metadata();

                expect(image).toMatchObject({
                    format: "webp",
                    height: 1024,
                    width: 1024,
                });
                expect(image.exif).toBeUndefined();
                expect(bytes.byteLength).toBeLessThan(600_000);
                expect(contentUrl(record.image.file)).toBe(
                    `/Gardening/${record.image.file}`
                );

                return createHash("sha256").update(bytes).digest("hex");
            })
        );

        const uniqueIllustrations = new Set(illustrations);

        expect(uniqueIllustrations.size).toBe(profiles.length);
        expect(records.map((record) => record.slug)).toStrictEqual(
            profiles.map((profile) => profile.slug)
        );
    });

    it("rejects unknown profiles before reading a file", async () => {
        expect.hasAssertions();

        await expect(
            getPlantDiscovery("../outside", knownSlugs)
        ).rejects.toThrow("Unknown discovery profile");
        await expect(
            getPlantDiscovery("missing-plant", knownSlugs)
        ).rejects.toThrow("Unknown discovery profile");
    });

    it("refuses unsafe artwork paths, impossible dates and incomplete illustration keys", async () => {
        expect.hasAssertions();

        const record = await getPlantDiscovery(
            "astrophytum-ornatum",
            knownSlugs
        );

        expect(isPlantDiscovery(record)).toBe(true);
        expect(
            isPlantDiscovery({
                ...record,
                image: {
                    ...record.image,
                    file: "assets/plant-explainers/../private.webp",
                },
            })
        ).toBe(false);
        expect(
            isPlantDiscovery({
                ...record,
                image: { ...record.image, reviewed: false },
            })
        ).toBe(false);
        expect(
            isPlantDiscovery({
                ...record,
                image: { ...record.image, generatedOn: "2026-02-30" },
            })
        ).toBe(false);
        expect(
            isPlantDiscovery({
                ...record,
                anatomy: {
                    ...record.anatomy,
                    parts: record.anatomy.parts.slice(0, 3),
                },
            })
        ).toBe(false);
        expect(
            isPlantDiscovery({
                ...record,
                sources: [
                    {
                        accessed: "2026-09-24",
                        id: "bad",
                        title: "Unsafe source",
                        // eslint-disable-next-line sdl/no-insecure-url -- This invalid source must be rejected by the content guard.
                        url: "ftp://example.com/source",
                    },
                ],
            })
        ).toBe(false);
    });

    it("curates every reference without losing source attribution or scope", async () => {
        expect.hasAssertions();

        for (const profile of profiles) {
            const groups = await getReferenceGallery(profile.allPhotos);
            const curated = groups.flatMap((group) => group.photos);

            expect(
                curated
                    .map((entry) => entry.photo.file)
                    .toSorted((left, right) => left.localeCompare(right))
            ).toStrictEqual(
                profile.allPhotos
                    .map((photo) => photo.file)
                    .toSorted((left, right) => left.localeCompare(right))
            );

            for (const entry of curated) {
                expect(entry.photo).toBe(
                    profile.allPhotos.find(
                        (photo) => photo.file === entry.photo.file
                    )
                );
                expect(entry.annotation.caption.length).toBeGreaterThan(12);
            }
        }
    });

    it("rejects annotations outside the reference archive or unknown gallery topics", () => {
        expect.hasAssertions();

        const annotation = {
            caption: "Raised ridges and the spine clusters along their edges.",
            file: "assets/plants/example/reference.jpg",
            topic: "detail",
        };

        expect(isGalleryTopics({ photos: [annotation], version: 1 })).toBe(
            true
        );
        expect(
            isGalleryTopics({
                photos: [{ ...annotation, topic: "diagnosis" }],
                version: 1,
            })
        ).toBe(false);
        expect(
            isGalleryTopics({
                photos: [{ ...annotation, file: "../private.jpg" }],
                version: 1,
            })
        ).toBe(false);
    });
});

describe("collection photo comparisons", () => {
    it("uses the earliest and latest distinct collection dates while retaining supplied-on labels", () => {
        expect.hasAssertions();

        const early = {
            ...sourcePhoto,
            image_id: "early",
            provided_on: "2026-07-23",
        };
        delete early.captured_on;
        const late = {
            ...sourcePhoto,
            captured_on: "2026-09-16",
            image_id: "late",
        };
        /** @type {import("../scripts/build-data.mjs").CollectionPhoto} */
        const nursery = {
            ...late,
            captured_on: "2026-09-23",
            image_id: "label",
            kind: "nursery-label",
        };
        const comparison = getPhotoComparison([
            late,
            nursery,
            early,
            early,
        ]);

        expect(comparison?.earliest).toMatchObject({
            basis: "Provided",
            date: "2026-07-23",
            photo: { image_id: "early" },
        });
        expect(comparison?.latest).toMatchObject({
            basis: "Photographed",
            date: "2026-09-16",
            photo: { image_id: "late" },
        });
    });

    it("does not turn same-day photos or unknown dates into a growth timeline", () => {
        expect.hasAssertions();

        const sameDay = {
            ...sourcePhoto,
            captured_on: "2026-09-23",
            image_id: "same-day",
        };
        const undated = { ...sourcePhoto, image_id: "undated" };
        delete undated.captured_on;
        delete undated.provided_on;

        expect(
            getPhotoComparison([
                sameDay,
                { ...sameDay, image_id: "other-view" },
                undated,
            ])
        ).toBeNull();
        expect(getPhotoComparison([undated])).toBeNull();
        expect(getPhotoComparison([])).toBeNull();
    });
});
