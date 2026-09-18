import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { format, resolveConfig } from "prettier";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const outputPath = path.join(
    repositoryRoot,
    ".cache",
    "daily-report-preview",
    "index.html"
);
async function main() {
    const { getReports, renderReviewedReport } =
        await import("../site/lib/reports.mjs");
    const reports = await getReports();
    const report = reports[0];
    if (report === undefined) throw new Error("No dated daily report found.");
    await Promise.all(reports.map((entry) => renderReviewedReport(entry)));
    if (process.argv.includes("--check")) {
        console.log(
            `Validated ${reports.length} reviewed reports; latest: ${report.date}`
        );
        return;
    }
    const content = await renderReviewedReport(report);
    const outputDirectory = path.dirname(outputPath);
    const stylePath = path.join(outputDirectory, "report.css");
    const clientPath = path.join(outputDirectory, "report.js");
    const styles = await readFile(
        path.join(repositoryRoot, "site", "styles", "report.css"),
        "utf8"
    );
    const client = await readFile(
        path.join(repositoryRoot, "site", "client", "report.js"),
        "utf8"
    );
    const source = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Reviewed garden report · ${report.date}</title><link rel="stylesheet" href="./report.css"></head><body><main>${content}</main><script type="module" src="./report.js"></script></body></html>`;
    const config = await resolveConfig(outputPath);
    const html = await format(source, { ...config, filepath: outputPath });
    await mkdir(outputDirectory, { recursive: true });
    await Promise.all([
        writeFile(outputPath, html, "utf8"),
        writeFile(stylePath, styles, "utf8"),
        writeFile(clientPath, client, "utf8"),
    ]);
    console.log(`Generated ignored report preview: ${outputPath}`);
}

const isDirectRun =
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === import.meta.filename;
if (isDirectRun) await main();
