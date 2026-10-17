import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";

import { prepareSensorHistory } from "../../scripts/prepare-sensor-history.mjs";

const header =
    "Timestamp(1 min),Built-in Temperature(℃),Built-in Humidity(%),Built-in VPD(kPa),Probe Temperature(℃),Probe Humidity(%),Probe VPD(kPa)";
const first = "2026/10/16 12:10:00,10,20,1,30,40,2";
const second = "2026/10/16 12:20:00,20,40,3,50,60,4";
const third = "2026/10/16 12:30:00,30,60,5,70,80,6";
const cli = path.resolve(
    import.meta.dirname,
    "../../scripts/prepare-sensor-history.mjs"
);

/** @param {Record<string, string[]>} files */
async function fixture(files) {
    const parent = path.resolve(tmpdir());
    const directory = await mkdtemp(
        path.join(parent, "garden-sensor-history-")
    );
    onTestFinished(async () => {
        if (
            path.dirname(directory) !== parent ||
            !path.basename(directory).startsWith("garden-sensor-history-")
        )
            throw new Error("Unexpected sensor test cleanup path.");
        await rm(directory, { force: true, recursive: true });
    });
    const sources = await Promise.all(
        Object.entries(files).map(async ([csvPath, rows]) => {
            const csv = `${header}\n${rows.join("\n")}\n`;
            await writeFile(path.join(directory, csvPath), csv);
            return {
                csvPath,
                sensorId: "vivosun-th1gs-main",
                sha256: createHash("sha256").update(csv).digest("hex"),
                timeZone: "America/New_York",
            };
        })
    );
    const manifestPath = path.join(directory, "manifest.json");
    /** @param {unknown} manifest */
    const manifest = async (manifest) =>
        writeFile(manifestPath, JSON.stringify(manifest));
    await manifest({ schemaVersion: 1, sources });
    return { directory, manifest, manifestPath, sources };
}

describe("verified sensor history preparation", () => {
    it("deduplicates partial overlaps before hourly aggregation and stays invariant under reordered files", async () => {
        expect.hasAssertions();

        const data = await fixture({
            "a.csv": [first, second],
            "b.csv": [second, third],
        });
        const result = await prepareSensorHistory(data);

        expect(result.counts).toStrictEqual({
            duplicateRows: 1,
            hourlyRows: 1,
            populatedRows: 4,
            sourceFiles: 2,
            uniqueReadings: 3,
        });
        expect(result.hours[0]?.builtIn.temperatureC).toStrictEqual({
            count: 3,
            max: 30,
            mean: 20,
            min: 10,
        });
        expect(result.hours[0]?.hourStartUtc).toBe("2026-10-16T16:00:00.000Z");
        expect(result.sources[0]).toMatchObject({
            fileName: "a.csv",
            populatedRows: 2,
            skippedEmptyRows: 0,
            sourceUrl: null,
        });

        await data.manifest({
            schemaVersion: 1,
            sources: data.sources.toReversed(),
        });
        const reordered = await prepareSensorHistory(data);

        expect(reordered.hours).toStrictEqual(result.hours);
        expect(reordered.sensors).toStrictEqual(result.sensors);
    });

    it("keeps sensors separate and chooses equivalent Celsius evidence consistently across source order", async () => {
        expect.hasAssertions();

        const data = await fixture({
            "celsius.csv": [first],
            "fahrenheit.csv": [first],
        });
        const fahrenheit = `${header.replaceAll("℃", "℉")}\n2026/10/16 12:10:00,50,20,1,86,40,2\n`;
        await writeFile(
            path.join(data.directory, "fahrenheit.csv"),
            fahrenheit
        );
        const sources = data.sources.map((source) => ({
            ...source,
            sha256:
                source.csvPath === "fahrenheit.csv"
                    ? createHash("sha256").update(fahrenheit).digest("hex")
                    : source.sha256,
            sourceUrl:
                "https://drive.google.com/file/d/synthetic-only-archive/view",
        }));
        const extraSensor = { ...sources[0], sensorId: "sensor-other" };
        await data.manifest({
            schemaVersion: 1,
            sources: [...sources, extraSensor],
        });
        const result = await prepareSensorHistory(data);

        expect(result.counts).toMatchObject({
            duplicateRows: 1,
            hourlyRows: 2,
            uniqueReadings: 2,
        });
        expect(result.sensors).toStrictEqual([
            { sensorId: "sensor-other", timeZone: "America/New_York" },
            { sensorId: "vivosun-th1gs-main", timeZone: "America/New_York" },
        ]);
        expect(
            result.sources.every(
                (source) =>
                    source.sourceUrl ===
                    "https://drive.google.com/file/d/synthetic-only-archive/view"
            )
        ).toBe(true);
        expect(
            result.hours.map((hour) => hour.builtIn.temperatureC.mean)
        ).toStrictEqual([10, 10]);

        await data.manifest({
            schemaVersion: 1,
            sources: [extraSensor, ...sources.toReversed()],
        });
        const reordered = await prepareSensorHistory(data);

        expect(reordered.hours).toStrictEqual(result.hours);
    });

    it("makes repeated raw imports idempotent without modifying any source or manifest", async () => {
        expect.hasAssertions();

        const data = await fixture({ "a.csv": [first, second] });
        const original = await prepareSensorHistory(data);
        await data.manifest({
            schemaVersion: 1,
            sources: [...data.sources, ...data.sources],
        });
        const names = await readdir(data.directory);
        const before = await Promise.all(
            names.map(async (name) =>
                readFile(path.join(data.directory, name), "utf8")
            )
        );
        const repeated = await prepareSensorHistory(data);

        expect(repeated.hours).toStrictEqual(original.hours);
        expect(repeated.counts).toMatchObject({
            duplicateRows: 2,
            sourceFiles: 2,
            uniqueReadings: 2,
        });
        await expect(readdir(data.directory)).resolves.toStrictEqual(names);
        await expect(
            Promise.all(
                names.map(async (name) =>
                    readFile(path.join(data.directory, name), "utf8")
                )
            )
        ).resolves.toStrictEqual(before);
    });

    it("retains missing channels and measured zero while skipping entirely empty observations", async () => {
        expect.hasAssertions();

        const data = await fixture({
            "a.csv": [
                "2026/10/16 12:10:00,0,0,0,-,-,-",
                "2026/10/16 12:20:00,-,-,-,-,-,-",
            ],
        });
        const result = await prepareSensorHistory(data);

        expect(result.sources[0]?.skippedEmptyRows).toBe(1);
        expect(result.hours[0]?.probe.temperatureC).toStrictEqual({
            count: 0,
            max: null,
            mean: null,
            min: null,
        });
        expect(result.hours[0]?.builtIn.temperatureC).toStrictEqual({
            count: 1,
            max: 0,
            mean: 0,
            min: 0,
        });
    });

    it("rejects conflicting overlapping readings, parser issues and hash mismatches", async () => {
        expect.hasAssertions();

        const data = await fixture({
            "a.csv": [first],
            "b.csv": [first.replace(",10,", ",11,")],
        });

        await expect(prepareSensorHistory(data)).rejects.toThrow("conflicting");

        const invalid = await fixture({
            "bad.csv": ["2026/10/16 12:10:00,10,101,1,-,-,-"],
        });

        await expect(prepareSensorHistory(invalid)).rejects.toThrow(
            "CSV issues"
        );

        await writeFile(
            path.join(invalid.directory, "bad.csv"),
            `${header}\n${first}\n`
        );

        await expect(prepareSensorHistory(invalid)).rejects.toThrow(
            "SHA-256 mismatch"
        );
    });

    it("validates the strict manifest, required fields, checksums and sensor timezone consistency", async () => {
        expect.hasAssertions();

        const data = await fixture({ "a.csv": [first] });
        const source = data.sources[0];
        for (const manifest of [
            null,
            [],
            {},
            { schemaVersion: 2, sources: data.sources },
            { schemaVersion: 1, sources: [] },
            { extra: true, schemaVersion: 1, sources: data.sources },
            { schemaVersion: 1, sources: [{ ...source, extra: true }] },
            { schemaVersion: 1, sources: [{ ...source, csvPath: " " }] },
            { schemaVersion: 1, sources: [{ ...source, sensorId: null }] },
            {
                schemaVersion: 1,
                sources: [{ ...source, sha256: "A".repeat(64) }],
            },
            { schemaVersion: 1, sources: [{ ...source, sourceUrl: "" }] },
            {
                schemaVersion: 1,
                sources: [{ ...source, timeZone: "Not/AZone" }],
            },
            {
                schemaVersion: 1,
                sources: [source, { ...source, timeZone: "UTC" }],
            },
        ]) {
            await data.manifest(manifest);

            await expect(prepareSensorHistory(data)).rejects.toThrow(
                /manifest|sensor|source|time zone|timezone/iv
            );
        }
    });

    it("exposes JSON and help through a read-only CLI and bounds failed diagnostics", async () => {
        expect.hasAssertions();

        const data = await fixture({ "a.csv": [first] });
        const success = spawnSync(
            process.execPath,
            [
                cli,
                "--manifest",
                data.manifestPath,
            ],
            { encoding: "utf8" }
        );

        expect(success.status).toBe(0);
        expect(JSON.parse(success.stdout)).toMatchObject({
            counts: { hourlyRows: 1, uniqueReadings: 1 },
            schemaVersion: 1,
        });
        expect(success.stderr).toBe("");

        const help = spawnSync(process.execPath, [cli, "--help"], {
            encoding: "utf8",
        });

        expect(help.status).toBe(0);
        expect(help.stdout).toContain(
            "No files, spreadsheets or services are modified"
        );

        const failure = spawnSync(process.execPath, [cli, "--unknown"], {
            encoding: "utf8",
        });

        expect(failure.status).toBe(1);
        expect(failure.stdout).toBe("");
        expect(failure.stderr.length).toBeLessThanOrEqual(417);
        expect(failure.stderr).not.toContain("\n    at ");

        const missing = spawnSync(process.execPath, [cli], {
            encoding: "utf8",
        });

        expect(missing.status).toBe(1);
    });
});
