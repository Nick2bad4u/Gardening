import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, onTestFinished } from "vitest";

import { previewSensorImport } from "../../scripts/preview-sensor-import.mjs";

const header =
    "Timestamp(1 min),Built-in Temperature(℉),Built-in Humidity(%),Built-in VPD(kPa),Probe Temperature(℉),Probe Humidity(%),Probe VPD(kPa)";
const first = "2026/10/10 12:00:00,68,50,1.2,77,60,0.8";
const second = "2026/10/10 12:01:00,68,50,1.2,77,60,0.8";
const third = "2026/10/10 12:02:00,69,51,1.1,78,61,0.9";
const interpretation = {
    sensorId: "synthetic-sensor-1",
    timeZone: "America/New_York",
};
const cli = fileURLToPath(
    new URL("../../scripts/preview-sensor-import.mjs", import.meta.url)
);

/** @param {Record<string, string[]>} files */
async function fixture(files) {
    const parent = path.resolve(tmpdir());
    const directory = await mkdtemp(
        path.join(parent, "garden-sensor-preview-")
    );
    onTestFinished(async () => {
        if (
            path.dirname(directory) !== parent ||
            !path.basename(directory).startsWith("garden-sensor-preview-")
        )
            throw new Error("Unexpected sensor test cleanup path.");
        await rm(directory, { force: true, recursive: true });
    });
    await Promise.all(
        Object.entries(files).map(async ([name, rows]) =>
            writeFile(
                path.join(directory, name),
                `${header}\n${rows.join("\n")}\n`
            )
        )
    );
    return directory;
}

describe("sensor import file preview", () => {
    it("reports a full reimport as duplicates without writing or changing files", async () => {
        expect.hasAssertions();

        const directory = await fixture({
            "export.csv": [
                first,
                second,
                "2026/10/10 12:02:00,-,-,-,-,-,-",
            ],
        });
        const csvPath = path.join(directory, "export.csv");
        const before = await readFile(csvPath, "utf8");
        const result = await previewSensorImport({
            ...interpretation,
            csvPath,
            existingCsvPaths: [csvPath],
        });

        expect(result).toMatchObject({
            canImport: true,
            counts: {
                conflictingKeys: 0,
                duplicateRows: 2,
                emptyRowsSkipped: 1,
                existingUniqueReadings: 2,
                invalidRows: 0,
                newReadings: 0,
                populatedRows: 2,
            },
            mode: "preview",
            range: {
                firstObservedAt: "2026-10-10T16:00:00.000Z",
                lastObservedAt: "2026-10-10T16:01:00.000Z",
            },
        });
        expect(result.source.file).toBe("export.csv");
        expect(result.source.sha256).toMatch(/^[\da-f]{64}$/v);
        await expect(readdir(directory)).resolves.toStrictEqual(["export.csv"]);
        await expect(readFile(csvPath, "utf8")).resolves.toBe(before);
    });

    it("compares overlapping unordered ranges across several earlier exports", async () => {
        expect.hasAssertions();

        const directory = await fixture({
            "earlier.csv": [first],
            "incoming.csv": [
                third,
                second,
                first,
            ],
            "overlap.csv": [second, first],
        });
        const result = await previewSensorImport({
            ...interpretation,
            csvPath: path.join(directory, "incoming.csv"),
            existingCsvPaths: ["earlier.csv", "overlap.csv"].map((name) =>
                path.join(directory, name)
            ),
        });

        expect(result.canImport).toBe(true);
        expect(result.counts).toMatchObject({
            conflictingKeys: 0,
            duplicateRows: 2,
            existingUniqueReadings: 2,
            newReadings: 1,
        });
        expect(result.range.firstObservedAt).toBe("2026-10-10T16:00:00.000Z");
        expect(result.range.lastObservedAt).toBe("2026-10-10T16:02:00.000Z");
    });

    it("blocks an import with a changed measurement and retains both values in its preview", async () => {
        expect.hasAssertions();

        const directory = await fixture({
            "earlier.csv": [first],
            "incoming.csv": [first.replace(",68,", ",70,"), second],
        });
        const result = await previewSensorImport({
            ...interpretation,
            csvPath: path.join(directory, "incoming.csv"),
            existingCsvPaths: [path.join(directory, "earlier.csv")],
        });

        expect(result.canImport).toBe(false);
        expect(result.counts).toMatchObject({
            conflictingKeys: 1,
            duplicateRows: 0,
            newReadings: 1,
        });
        expect(
            result.conflictExamples[0]?.incoming[0]?.builtIn.temperature
        ).toBe(70);
        expect(
            result.conflictExamples[0]?.existing[0]?.builtIn.temperature
        ).toBe(68);
    });

    it("includes invalid earlier-file rows in the decision instead of ignoring them", async () => {
        expect.hasAssertions();

        const directory = await fixture({
            "earlier.csv": [first.replace(",50,", ",101,")],
            "incoming.csv": [second],
        });
        const result = await previewSensorImport({
            ...interpretation,
            csvPath: path.join(directory, "incoming.csv"),
            existingCsvPaths: [path.join(directory, "earlier.csv")],
        });

        expect(result.canImport).toBe(false);
        expect(result.counts.invalidRows).toBe(1);
        expect(result.issues[0]?.file).toBe("earlier.csv");
        expect(result.issues[0]?.row).toBe(2);
    });

    it("requires interpretation arguments and prints help without reading a CSV", () => {
        expect.hasAssertions();

        const help = spawnSync(process.execPath, [cli, "--help"], {
            encoding: "utf8",
        });
        const missing = spawnSync(
            process.execPath,
            [
                cli,
                "--csv",
                "missing.csv",
            ],
            {
                encoding: "utf8",
            }
        );

        expect(help.status).toBe(0);
        expect(help.stdout).toContain("No data is written.");
        expect(missing.status).toBe(1);
        expect(missing.stderr).toContain("--sensor-id");
        expect(missing.stderr).not.toContain("ENOENT");
    });

    it("sets a failing command status for a row needing review", async () => {
        expect.hasAssertions();

        const directory = await fixture({
            "invalid.csv": [first.replace(",50,", ",101,")],
        });
        const result = spawnSync(
            process.execPath,
            [
                cli,
                "--csv",
                path.join(directory, "invalid.csv"),
                "--sensor-id",
                interpretation.sensorId,
                "--time-zone",
                interpretation.timeZone,
            ],
            { encoding: "utf8" }
        );

        expect(result.status).toBe(1);
        expect(result.stdout).toContain('"canImport": false');
        expect(result.stdout).toContain('"invalidRows": 1');
        expect(result.stderr).toBe("");
    });
});
