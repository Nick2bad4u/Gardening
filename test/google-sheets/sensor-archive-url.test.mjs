import { describe, expect, it } from "vitest";

import { sensorArchiveUrl } from "../../scripts/google-sheets/sensor-archive-url.mjs";

const archive = "https://drive.google.com/file/d/synthetic-only-test-file/view";

describe("sensor archive reference privacy", () => {
    it.each([
        archive,
        `${archive}?usp=sharing`,
        `${archive}?usp=drive_link`,
        `${archive}?usp=drivesdk`,
    ])("canonicalizes permitted archive links: %s", (input) => {
        expect.hasAssertions();
        expect(sensorArchiveUrl(input)).toBe(archive);
    });

    it.each([
        String.raw`C:\private\source.csv`,
        "file:///C:/private/source.csv",
        "https://example.com/source.csv",
        "https://user:password@drive.google.com/file/d/synthetic-only-test-file/view",
        `${archive}?access_token=secret`,
        `${archive}?usp=sharing&access_token=secret`,
        `${archive}#secret`,
        "https://drive.google.com.evil.test/file/d/synthetic-only-test-file/view",
        archive.replace("https:", "http:"),
        `${archive}?resourcekey=secret`,
        "https://drive.google.com/file/d/a/view",
        "",
        null,
    ])(
        "rejects private paths, credentials and unsafe archive references: %s",
        (input) => {
            expect.hasAssertions();
            expect(() => sensorArchiveUrl(input)).toThrow(
                "canonical HTTPS Drive archive"
            );
        }
    );
});
