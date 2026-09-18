import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";

import {
    escapeHtml,
    instant,
    validateReport,
} from "../../scripts/daily-report-model.mjs";
import { renderReport } from "../../scripts/daily-report-render.mjs";
import { potUrl, profileUrl, siteUrl } from "./routes.mjs";

const { env } = process;
const root = process.cwd();
const directory = path.join(root, "docs/daily-reports");

/** @typedef {import("../../types/daily-report.d.ts").DailyReport} DailyReport */
/**
 * @typedef {{
 *     date: string;
 *     summary: string;
 *     sourceReadAt: string | null;
 *     generatedAt: string;
 *     coverage: string;
 *     totalPots: number | null;
 *     version: number;
 *     report: DailyReport | null;
 *     archive: Record<string, unknown> | null;
 * }} ReviewedReport
 */

export async function getLatestReport() {
    const reports = await getReports();
    const latest = reports[0];
    if (!latest) throw new Error("No reviewed daily report is available.");
    return latest;
}

/** Load reviewed public inputs only. This module never fetches the workbook. */
export async function getReports() {
    const fixture = env["GARDENING_REPORT_INPUT"] ?? "";
    if (fixture !== "" && env["GARDENING_SITE_FIXTURES"] !== "1")
        throw new Error(
            "Report fixtures are allowed only in an explicit fixture build."
        );
    const entries = await readdir(directory);
    const files =
        fixture === ""
            ? entries
                  .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/v.test(name))
                  .map((name) => path.join(directory, name))
            : [path.resolve(root, fixture)];
    const reports = await Promise.all(
        files.map(async (filename) => {
            const value = /** @type {unknown} */ (
                JSON.parse(await readFile(filename, "utf8"))
            );
            const entry = parseReviewedReport(value);
            if (
                fixture === "" &&
                path.basename(filename) !== `${entry.date}.json`
            )
                throw new Error(
                    `Report date and filename disagree: ${filename}`
                );
            return entry;
        })
    );
    return reports.toSorted((left, right) =>
        right.date.localeCompare(left.date)
    );
}

/** @param {unknown} value @returns {ReviewedReport} */
export function parseReviewedReport(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value))
        throw new TypeError("Reviewed report must be an object.");
    const input = /** @type {Record<string, unknown>} */ (value);
    if (input["version"] === 2) {
        const report = validateReport(value);
        return { ...report, archive: null, report };
    }
    if (input["version"] !== 1 || input["timeZone"] !== "America/New_York")
        throw new TypeError(
            "Unsupported historical report version or time zone."
        );
    const date = input["date"];
    const summary = input["summary"];
    const generatedAt = input["generatedAt"];
    const sourceReadAt = input["sourceReadAt"];
    const coverage = input["coverage"];
    const totalPots = input["totalPots"];
    if (
        typeof date !== "string" ||
        typeof summary !== "string" ||
        typeof coverage !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/v.test(date) ||
        !validInstant(generatedAt) ||
        (sourceReadAt !== null && !validInstant(sourceReadAt)) ||
        ![
            "complete",
            "partial",
            "unavailable",
        ].includes(coverage) ||
        !isValidTotal(totalPots) ||
        !Array.isArray(input["pots"]) ||
        !Array.isArray(input["mixes"]) ||
        !Array.isArray(input["notes"])
    )
        throw new TypeError("Malformed historical report metadata.");
    return {
        archive: input,
        coverage,
        date,
        generatedAt,
        report: null,
        sourceReadAt,
        summary,
        totalPots,
        version: 1,
    };
}

/** @param {ReviewedReport} entry */
export async function renderReviewedReport(entry) {
    if (entry.report === null) {
        const archive = entry.archive ?? {};
        const pots = /** @type {unknown[]} */ (
            Array.isArray(archive["pots"]) ? archive["pots"] : []
        );
        const cards = pots
            .map((value) => {
                if (
                    value === null ||
                    typeof value !== "object" ||
                    Array.isArray(value)
                )
                    throw new TypeError("Historical pot must be an object.");
                const pot = /** @type {Record<string, unknown>} */ (value);
                if (
                    typeof pot["action"] !== "string" ||
                    typeof pot["id"] !== "string" ||
                    typeof pot["name"] !== "string" ||
                    typeof pot["label"] !== "string" ||
                    typeof pot["recommendation"] !== "string"
                )
                    throw new TypeError(
                        "Historical pot identity and recommendation are required."
                    );
                return `<article class="archive-pot" id="pot-${escapeHtml(pot["id"])}"><header><span class="reason-badge">${escapeHtml(pot["action"])}</span><h3>${escapeHtml(pot["label"])} · ${escapeHtml(pot["name"])}</h3><p>${escapeHtml(pot["id"])}</p></header><p>${escapeHtml(pot["recommendation"])}</p><details><summary>Original recorded evidence</summary>${archiveFields(pot)}</details></article>`;
            })
            .join("");
        const metadata = Object.fromEntries(
            Object.entries(archive).filter(([key]) => key !== "pots")
        );
        return `<article class="daily-report report-archive" data-report-date="${entry.date}"><header class="report-hero"><div><p class="eyebrow">Historical reviewed report</p><h1>${entry.date}</h1><p>${escapeHtml(entry.summary)}</p><p class="read-time">Workbook read: ${escapeHtml(entry.sourceReadAt ?? "Unavailable")} · ${escapeHtml(entry.coverage)} coverage</p></div></header><p class="notice">Archived version 1 policy. These are the original dated decisions, not current care instructions. They have not been converted to today's plateau-gated policy.</p><section><h2>Original pot decisions</h2><div class="archive-grid">${cards}</div></section><details class="archive-metadata"><summary>Original review metadata, notes, and mixes</summary>${archiveFields(metadata)}</details></article>`;
    }
    const [template, profileText] = await Promise.all([
        readFile(
            path.join(root, "scripts/templates/daily-report.html"),
            "utf8"
        ),
        readFile(
            path.join(root, "docs/layouts/plant-profile-data.json"),
            "utf8"
        ),
    ]);
    const parsedProfiles = /** @type {unknown} */ (JSON.parse(profileText));
    const profiles = /** @type {Record<string, [string, string][]>} */ (
        parsedProfiles
    );
    return renderReport(entry.report, template, profiles)
        .replaceAll("../../assets/", () => siteUrl("assets/"))
        .replaceAll(
            /\.\/plant-history\.html\?id=(?<id>P\d+)/gv,
            (_match, /** @type {string} */ id) => potUrl(id)
        )
        .replaceAll(
            /\.\.\/plant-booklet\/#(?<slug>[\w\-]+)/gv,
            (_match, /** @type {string} */ slug) => profileUrl(slug)
        )
        .replaceAll("./plant-tracker.html", () => siteUrl("tracker/"))
        .replaceAll("../equipment/msu-fertilizer-schedule.md", () =>
            siteUrl("setup/equipment/msu-fertilizer-schedule/")
        );
}

/**
 * Safely display original archive fields without coercing old care decisions.
 *
 * @param {unknown} value @returns {string}
 */
function archiveFields(value) {
    if (Array.isArray(value)) {
        const items = value
            .map((item) => `<li>${archiveFields(item)}</li>`)
            .join("");
        return `<ul>${items}</ul>`;
    }
    if (value !== null && typeof value === "object") {
        const fields = Object.entries(value)
            .map(([key, field]) => {
                const label = escapeHtml(
                    key.replaceAll(/(?<=[a-z])(?=[A-Z])/gv, " ")
                );
                return `<div><dt>${label}</dt><dd>${archiveFields(field)}</dd></div>`;
            })
            .join("");
        return `<dl>${fields}</dl>`;
    }
    if (value === null) return "Unavailable";
    if (typeof value === "string") return escapeHtml(value);
    if (typeof value === "number" || typeof value === "boolean")
        return escapeHtml(String(value));
    throw new TypeError("Historical fields must contain JSON values.");
}

/** @param {unknown} value @returns {value is number | null} */
function isValidTotal(value) {
    return (
        value === null ||
        (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
    );
}

/** @param {unknown} value @returns {value is string} */
function validInstant(value) {
    if (typeof value !== "string") return false;
    try {
        return Number.isFinite(instant(value));
    } catch {
        return false;
    }
}
