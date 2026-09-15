import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { format, resolveConfig } from "prettier";

import {
    compareLabels,
    escapeHtml,
    instant,
    localDate,
    number,
    signed,
    validateReport,
    weightChange,
} from "./daily-report-model.mjs";

/** @typedef {import("../types/daily-report.d.ts").DailyReport} DailyReport */
/** @typedef {import("../types/daily-report.d.ts").ReportPot} ReportPot */
/** @typedef {import("../types/daily-report.d.ts").ReportMix} ReportMix */
/** @typedef {Record<string, [string, string][]>} Profiles */

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const inputDirectory = path.join(repositoryRoot, "docs", "daily-reports");
const outputPath = path.join(
    repositoryRoot,
    "docs",
    "layouts",
    "daily-report.html"
);
/** @type {[string, string, string][]} */
const reasonGroups = [
    [
        "both",
        "Reference reached + plateau",
        "Two independent signals support a readiness check.",
    ],
    [
        "plateau",
        "A sustained plateau",
        "The recent curve has flattened, even above an older reference.",
    ],
    [
        "reference",
        "Dry reference reached — waiting for plateau",
        "The historical reference is reached, but a sustained plateau is not confirmed. Hold watering; these pots are separate from the Water list.",
    ],
    [
        "priority",
        "Priority weigh-ins",
        "Readings that resolve a missing reference or help with the next care decision.",
    ],
    [
        "flexible",
        "Flexible weigh-ins",
        "Useful samples with less urgency. These can fit around your session.",
    ],
    [
        "special",
        "Check only",
        "The plant's condition needs attention before a watering decision.",
    ],
    [
        "none",
        "Nothing today",
        "These reviewed pots have no recommended action today.",
    ],
    [
        "unresolved",
        "Needs a complete review",
        "Missing or conflicting evidence prevents a recommendation.",
    ],
];

/** @param {ReportPot[]} pots */
function chips(pots) {
    return pots
        .map(
            (pot) =>
                `<a class="pot-chip" href="#pot-${escapeHtml(pot.id)}" aria-label="${escapeHtml([pot.label, pot.name].join(": "))}">${escapeHtml(pot.label)}</a>`
        )
        .join("");
}

/** @param {ReportPot} pot */
function groupFor(pot) {
    if (pot.action === "water")
        return pot.reason === "both" ? "both" : "plateau";
    if (pot.action === "weigh")
        return pot.reason === "flexible" ? "flexible" : "priority";
    if (pot.action === "check") return "special";
    return pot.action;
}

async function main() {
    const entries = await readdir(inputDirectory);
    const filenames = entries
        .filter((filename) => /^\d{4}-\d{2}-\d{2}\.json$/v.test(filename))
        .toSorted((left, right) => left.localeCompare(right));
    const latest = filenames.at(-1);
    if (latest === undefined) throw new Error("No dated daily report found.");
    const [
        input,
        template,
        profileData,
    ] = await Promise.all([
        readFile(path.join(inputDirectory, latest), "utf8"),
        readFile(
            path.join(import.meta.dirname, "templates", "daily-report.html"),
            "utf8"
        ),
        readFile(
            path.join(
                repositoryRoot,
                "docs",
                "layouts",
                "plant-profile-data.json"
            ),
            "utf8"
        ),
    ]);
    const report = validateReport(JSON.parse(input));
    if (latest !== `${report.date}.json`)
        throw new Error("Report date and filename disagree.");
    const parsedProfiles = /** @type {unknown} */ (JSON.parse(profileData));
    const profiles = /** @type {Profiles} */ (parsedProfiles);
    const source = renderReport(report, template, profiles);
    const config = /** @type {import("prettier").Options | null} */ (
        await resolveConfig(outputPath)
    );
    const html = await format(source, { ...config, filepath: outputPath });
    if (process.argv.includes("--check")) {
        if ((await readFile(outputPath, "utf8")) !== html)
            throw new Error(
                "Daily report is out of date. Run npm run build:daily-report."
            );
        console.log(`Daily report is current: ${report.date}`);
        return;
    }
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html, "utf8");
    console.log(
        `Generated daily report: ${report.date} · ${report.pots.length} pots`
    );
}

/** @param {ReportMix} mix @param {ReportPot[]} pots */
function mixCard(mix, pots) {
    const dose =
        mix.gramsPerGallon === null
            ? "No nutrients"
            : `${number(mix.gramsPerGallon, 2)} g / US gallon`;
    const recipe =
        mix.gramsPerGallon === null
            ? "Keep these pots on plain RO for this session."
            : `For 1 US gallon: ${number(mix.gramsPerGallon, 2)} g powder. For 2 US gallons: ${number(mix.gramsPerGallon * 2, 2)} g. Use the 0.01 g pocket scale and mix only what you need.`;
    const condition = mix.condition
        ? `<p class="mix-condition">${escapeHtml(mix.condition)}</p>`
        : "";
    return `<article class="mix-card ${mix.gramsPerGallon === null ? "plain-mix" : "feed-mix"}"><span class="mix-symbol" aria-hidden="true">${mix.gramsPerGallon === null ? "💧" : "🧪"}</span><p class="eyebrow">${pots.length} pots · ${escapeHtml(mix.name)}</p><h3>${escapeHtml(dose)}</h3><p class="mix-product">${escapeHtml(mix.product)}</p>${condition}<p>${escapeHtml(mix.rationale)}</p><p class="recipe">${escapeHtml(recipe)}</p><div class="pot-chips">${chips(pots)}</div></article>`;
}

/** @param {ReportPot} pot */
function plateauTail(pot) {
    const firstPoint = pot.plateauPoints[0];
    const lastPoint = pot.plateauPoints.at(-1);
    if (firstPoint === undefined || lastPoint === undefined) return "";
    const values = pot.plateauPoints
        .map((point) => number(point.grams))
        .join(" → ");
    const days = (instant(lastPoint.at) - instant(firstPoint.at)) / 86_400_000;
    return `${values} g over ${days.toFixed(2)} days`;
}

/** @param {string} id @param {string} slug */
function portraitFor(id, slug) {
    if (id === "P19") return "shared-rehab-cactus-planter";
    if (id === "P20") return "shared-succulent-planter";
    return slug;
}

/** @param {ReportPot} pot @param {DailyReport} report @param {Profiles} profiles */
function potCard(pot, report, profiles) {
    const profile = profiles[pot.id]?.[0];
    if (profile === undefined || !/^[\-0-9a-z]+$/v.test(profile[0]))
        throw new TypeError(`Missing field-guide profile for ${pot.id}`);
    const portrait = portraitFor(pot.id, profile[0]);
    const mix = report.mixes.find((entry) => entry.id === pot.mixId);
    const change = weightChange(pot);
    const status =
        pot.plateau === "confirmed"
            ? "Confirmed"
            : pot.plateau === "not-supported"
              ? "Not yet supported"
              : "Unavailable";
    const reason =
        reasonGroups.find(([key]) => key === groupFor(pot))?.[1] ??
        "Unresolved";
    const comparison =
        pot.latest === null || pot.dryReferenceGrams === null
            ? "Unavailable"
            : `${number(pot.dryReferenceGrams)} g · ${signed(pot.latest.grams - pot.dryReferenceGrams)} g from reference`;
    const changeText =
        change === null || pot.previous === null || pot.latest === null
            ? "Unavailable"
            : `${number(pot.previous.grams)} → ${number(pot.latest.grams)} g; ${signed(change.delta)} g over ${change.days.toFixed(2)} days (${signed(change.perDay, 2)} g/day)`;
    const latest =
        pot.latest === null
            ? "No eligible reading"
            : `${number(pot.latest.grams)} g · ${localDate(pot.latest.at, true)} ET`;
    const tail = plateauTail(pot);
    const searchText = escapeHtml(
        [
            pot.label,
            pot.id,
            pot.name,
        ].join(" ")
    );
    const mixBadge =
        mix === undefined
            ? ""
            : `<span class="mix-badge">🧪 ${escapeHtml(mix.name)}</span>`;
    const mixText =
        mix === undefined ? "" : [mix.name, mix.condition].join(". ");
    const mixDetail =
        mix === undefined
            ? ""
            : `<div><dt>🧪 Watering mix</dt><dd>${escapeHtml(mixText)}</dd></div>`;
    const plateauDetail =
        pot.plateau === "confirmed"
            ? `${sparkline(pot)}<span class="tail-values">${escapeHtml(tail)}</span>`
            : "";
    const note = pot.metricsNote
        ? `<p class="metric-note">${escapeHtml(pot.metricsNote)}</p>`
        : "";
    return `<details class="pot-card" id="pot-${escapeHtml(pot.id)}" data-action="${escapeHtml(pot.action)}" data-search="${searchText}"><summary><img class="plant-portrait" src="../../assets/plant-icons/${portrait}.svg" alt="" width="64" height="64" loading="lazy" /><span class="pot-identity"><span class="pot-title"><strong>${escapeHtml(pot.label)}</strong><span class="pot-id">${escapeHtml(pot.id)}</span></span><span class="pot-name">${escapeHtml(pot.name)}</span><span class="card-badges"><span class="reason-badge">${escapeHtml(reason)}</span>${mixBadge}</span></span><span class="card-rate">${change === null ? "—" : signed(change.perDay, 2)}<small>g/day</small></span><span class="expand-icon" aria-hidden="true">⌄</span></summary><div class="pot-detail"><p class="pot-recommendation"><span aria-hidden="true">📌</span> ${escapeHtml(pot.recommendation)}</p><dl>${mixDetail}<div><dt>🕒 Last reading</dt><dd>${escapeHtml(latest)}</dd></div><div><dt>⚖️ Weight change</dt><dd>${escapeHtml(changeText)}</dd></div><div><dt>🎯 Dry reference</dt><dd>${escapeHtml(comparison)}</dd></div><div><dt>📊 Plateau</dt><dd><strong>${status}</strong>${plateauDetail}</dd></div></dl>${note}<div class="pot-links"><a href="./plant-history.html?id=${escapeHtml(pot.id)}">Weight history ↗</a><a href="../plant-booklet/#${profile[0]}">Field guide ↗</a></div></div></details>`;
}

/**
 * @param {DailyReport} report @param {ReportPot[]} pots @param {boolean}
 *   [isCompact]
 */
function quickList(report, pots, isCompact = false) {
    const empty =
        report.coverage === "complete"
            ? "None"
            : "Not determined — incomplete review";
    /**
     * @param {string} title @param {string} icon @param {ReportPot[]} members
     * @param {string} [description]
     */
    const row = (title, icon, members, description = "") =>
        quickRow(title, icon, members, description, empty, isCompact);
    const rows = report.mixes.map((mix) => {
        const candidates = pots.filter(
            (pot) => pot.action === "water" && pot.mixId === mix.id
        );
        return candidates.length === 0
            ? ""
            : row(mix.name, "💧", candidates, mix.condition);
    });
    if (pots.every((pot) => pot.action !== "water"))
        rows.push(
            row(
                "Water",
                "💧",
                [],
                report.coverage === "complete"
                    ? "No watering candidates with a confirmed plateau today."
                    : "No watering decision established for the unresolved pots."
            )
        );
    const reference = pots.filter((pot) => pot.action === "reference");
    if (reference.length > 0)
        rows.push(
            row(
                "Dry reference only",
                "⏳",
                reference,
                "Reference reached; plateau unconfirmed. Hold watering."
            )
        );
    rows.push(
        row(
            "Weigh · priority",
            "⚖️",
            pots.filter(
                (pot) => pot.action === "weigh" && pot.reason !== "flexible"
            )
        )
    );
    const flexible = pots.filter(
        (pot) => pot.action === "weigh" && pot.reason === "flexible"
    );
    if (flexible.length > 0)
        rows.push(
            row(
                "Weigh · flexible",
                "⚖️",
                flexible,
                "Lower priority; fit these around your session."
            )
        );
    const check = pots.filter((pot) => pot.action === "check");
    if (check.length > 0) rows.push(row("Check only", "👀", check));
    const noAction = pots.filter((pot) => pot.action === "none");
    const actionCount = pots.filter((pot) =>
        [
            "check",
            "reference",
            "water",
            "weigh",
        ].includes(pot.action)
    ).length;
    if (actionCount > 10 || noAction.length > 0)
        rows.push(row("Nothing today", "⏸️", noAction));
    const unresolved = pots.filter((pot) => pot.action === "unresolved");
    if (unresolved.length > 0) rows.push(row("Unresolved", "❔", unresolved));
    return rows.join("");
}

/**
 * @param {string} title @param {string} icon @param {ReportPot[]} pots @param
 *   {string} [description]
 */
function quickRow(
    title,
    icon,
    pots,
    description = "",
    empty = "None",
    isCompact = false
) {
    if (isCompact) {
        const labels = pots.map((pot) => pot.label).join(", ") || empty;
        return `<p class="pocket-row"><strong>${icon} ${escapeHtml(title)}:</strong> ${escapeHtml(labels)}</p>`;
    }
    const descriptionHtml = description
        ? `<p class="quick-description">${escapeHtml(description)}</p>`
        : "";
    const content =
        pots.length > 0
            ? chips(pots)
            : `<span class="empty-category">${escapeHtml(empty)}</span>`;
    return `<div class="quick-row"><div class="quick-label"><span aria-hidden="true">${icon}</span><strong>${escapeHtml(title)}</strong><span class="count">${pots.length}</span></div>${descriptionHtml}<div class="pot-chips">${content}</div></div>`;
}

/**
 * @param {DailyReport} report @param {string} template @param {Profiles}
 *   profiles
 */
function renderReport(report, template, profiles) {
    const pots = report.pots.toSorted(compareLabels);
    const reviewed = pots.filter((pot) => pot.action !== "unresolved").length;
    const coverage =
        report.coverage === "complete"
            ? `<p class="coverage-complete"><span aria-hidden="true">●</span> Complete review · ${reviewed} pots</p>`
            : `<p class="notice" role="status">${report.coverage === "partial" ? "Partial review" : "Review unavailable"} · ${reviewed} of ${report.totalPots ?? "an unknown number of"} pots reviewed. Unresolved pots must not be treated as needing no action.</p>`;
    const groups = reasonGroups
        .map(
            ([
                key,
                title,
                description,
            ]) => {
                const members = pots.filter((pot) => groupFor(pot) === key);
                return members.length === 0
                    ? ""
                    : `<section class="pot-group" aria-labelledby="group-${key}"><div class="group-heading"><h3 id="group-${key}">${title} <span>${members.length}</span></h3><p>${description}</p></div><div class="pot-grid">${members.map((pot) => potCard(pot, report, profiles)).join("")}</div></section>`;
            }
        )
        .join("");
    const replacements = new Map([
        ["COVERAGE", coverage],
        [
            "DATE_LABEL",
            escapeHtml(`${localDate(report.date)}, ${report.date.slice(0, 4)}`),
        ],
        [
            "MIXES",
            report.mixes
                .map((mix) => {
                    const candidates = pots.filter(
                        (pot) => pot.action === "water" && pot.mixId === mix.id
                    );
                    return candidates.length === 0
                        ? ""
                        : mixCard(mix, candidates);
                })
                .join("") ||
                '<p class="empty-category">No watering mix to prepare from this review.</p>',
        ],
        [
            "NOTES",
            report.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join(""),
        ],
        ["POCKET_LIST", quickList(report, pots, true)],
        [
            "POCKET_MIXES",
            report.mixes
                .filter((mix) => pots.some((pot) => pot.mixId === mix.id))
                .map(
                    (mix) =>
                        `<p><strong>${escapeHtml(mix.name)}.</strong> ${escapeHtml(mix.condition)}</p>`
                )
                .join(""),
        ],
        ["POT_GROUPS", groups],
        ["QUICK_LIST", quickList(report, pots)],
        [
            "READ_TIME",
            report.sourceReadAt === null
                ? "Live source access was unavailable for this report."
                : `Workbook read ${escapeHtml(
                      localDate(report.sourceReadAt, true)
                  )} Eastern · a recorded snapshot`,
        ],
        ["REPORT_DATE", escapeHtml(report.date)],
        ["SUMMARY", escapeHtml(report.summary)],
    ]);
    return template.replaceAll(
        /\{\{(?<key>[A-Z_]+)\}\}/gv,
        (/** @type {string} */ _match, /** @type {string} */ key) => {
            const replacement = replacements.get(key);
            if (replacement === undefined)
                throw new TypeError(`Unknown template slot: ${key}`);
            return replacement;
        }
    );
}

/** @param {ReportPot} pot */
function sparkline(pot) {
    if (pot.plateauPoints.length < 2) return "";
    const first = pot.plateauPoints[0];
    const last = pot.plateauPoints.at(-1);
    if (first === undefined || last === undefined) return "";
    const minimum = Math.min(...pot.plateauPoints.map((point) => point.grams));
    const maximum = Math.max(...pot.plateauPoints.map((point) => point.grams));
    const span = instant(last.at) - instant(first.at);
    /** @type {[number, number][]} */
    const points = pot.plateauPoints.map((point) => [
        8 + ((instant(point.at) - instant(first.at)) / span) * 224,
        48 - ((point.grams - minimum) / Math.max(1, maximum - minimum)) * 36,
    ]);
    const circles = points
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"></circle>`)
        .join("");
    return `<svg class="sparkline" viewBox="0 0 240 60" role="img" aria-label="Recent measured weight trend; exact readings follow"><path class="spark-base" d="M8 50 H232"></path><polyline points="${points.map((point) => point.join(",")).join(" ")}"></polyline>${circles}</svg>`;
}

const isDirectRun =
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === import.meta.filename;
if (isDirectRun) await main();

export { groupFor, renderReport };
