import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { getContainers } from "../site/lib/containers.mjs";
import { getProfiles } from "../site/lib/content.mjs";

describe("licensed plant reference galleries", () => {
    it("gives botanical profiles and researched planter overviews at least ten distinct credited references", async () => {
        expect.hasAssertions();

        const profiles = await getProfiles();
        const containers = await getContainers();
        const aggregateSlugs = new Set(
            containers
                .filter((container) => container.aggregate)
                .map((container) => container.overview?.slug)
        );

        expect([...aggregateSlugs]).toStrictEqual(["terrarium"]);

        const aggregateProfiles = profiles.filter((profile) =>
            aggregateSlugs.has(profile.slug)
        );

        expect(aggregateProfiles).toHaveLength(1);
        expect(aggregateProfiles[0]?.trackerId).toBe("P38");
        expect(aggregateProfiles[0]?.identificationMarkdown).toMatch(
            /photo-based/iv
        );
        expect(aggregateProfiles[0]?.allPhotos).toHaveLength(0);

        const referenceProfiles = profiles.filter(
            (entry) => !aggregateSlugs.has(entry.slug)
        );
        for (const profile of referenceProfiles) {
            const hashes = new Set(
                profile.allPhotos.map((photo) => photo.sha256)
            );

            expect(
                profile.allPhotos.length,
                profile.slug
            ).toBeGreaterThanOrEqual(10);
            expect(hashes.size, profile.slug).toBe(profile.allPhotos.length);

            for (const photo of profile.allPhotos) {
                expect(photo.source_url, photo.file).toMatch(/^https:\/\//v);
                expect(photo.author.trim(), photo.file).not.toBe("");
                expect(photo.scope_note.trim(), photo.file).not.toBe("");
                expect(
                    photo.license.replace(/ \d.*$/v, ""),
                    photo.file
                ).toMatch(/^(?:CC BY|CC BY-SA|CC0|Public domain)$/v);
            }
        }
        const shareAlikePhotos = profiles
            .flatMap((profile) => profile.allPhotos)
            .filter((photo) => photo.license.includes("BY-SA"));
        for (const photo of shareAlikePhotos) {
            expect(photo.license_url, photo.file).toContain("/by-sa/");
        }
    });

    it("keeps every referenced local image readable and matched to its recorded hash", async () => {
        expect.hasAssertions();

        const profiles = await getProfiles();
        const photos = new Map(
            profiles.flatMap((profile) =>
                profile.allPhotos.map((photo) => [photo.file, photo])
            )
        );
        for (const [file, photo] of photos) {
            expect(file).toMatch(
                /^assets\/plants\/[\w\-]+\/[\w\-]+\.(?:jpeg|jpg|png|webp)$/v
            );

            const bytes = await readFile(path.resolve(file));

            expect(createHash("sha256").update(bytes).digest("hex"), file).toBe(
                photo.sha256
            );

            const metadata = await sharp(bytes).metadata();

            expect(metadata.width, file).toBeGreaterThan(0);
            expect(metadata.height, file).toBeGreaterThan(0);
        }
    });
});
