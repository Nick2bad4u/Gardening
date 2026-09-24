import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { getProfiles } from "../site/lib/content.mjs";

describe("licensed plant reference galleries", () => {
    it("gives every current and historical profile at least ten distinct credited references", async () => {
        expect.hasAssertions();

        const profiles = await getProfiles();
        for (const profile of profiles) {
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
