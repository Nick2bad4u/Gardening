import { siteUrl } from "./routes.mjs";

/**
 * @typedef {{
 *     name: string;
 *     route: string;
 *     icon: string;
 *     themeColor: string;
 *     description: string;
 *     fragment: string;
 * }} ReportApp
 */

/** @type {ReportApp} */
export const fullReportApp = {
    description:
        "The latest reviewed garden report, including evidence and every pot decision.",
    fragment: "",
    icon: "full-report",
    name: "Full Report",
    route: "report/",
    themeColor: "#24558c",
};

/** @type {ReportApp} */
export const pocketReportApp = {
    description:
        "The pocket list from the latest reviewed garden report, with the full review below.",
    fragment: "#pocket-list",
    icon: "pocket-report",
    name: "Pocket Report",
    route: "pocket-report/",
    themeColor: "#985b1e",
};

/** @param {ReportApp} app */
export function reportManifest(app) {
    return {
        background_color: "#f5f3eb",
        description: app.description,
        display: "standalone",
        icons: [
            {
                purpose: "any",
                sizes: "192x192",
                src: siteUrl(`assets/report-apps/${app.icon}-192.png`),
                type: "image/png",
            },
            {
                purpose: "any maskable",
                sizes: "512x512",
                src: siteUrl(`assets/report-apps/${app.icon}-512.png`),
                type: "image/png",
            },
        ],
        id: siteUrl(app.route),
        lang: "en",
        name: app.name,
        scope: siteUrl(app.route),
        short_name: app.name,
        start_url: `${siteUrl(app.route)}${app.fragment}`,
        theme_color: app.themeColor,
    };
}
