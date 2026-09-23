import { pocketReportApp, reportManifest } from "../../lib/report-apps.mjs";

export function GET(): Response {
    return Response.json(reportManifest(pocketReportApp), {
        headers: { "Content-Type": "application/manifest+json" },
    });
}
