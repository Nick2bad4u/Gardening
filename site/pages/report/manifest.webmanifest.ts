import { fullReportApp, reportManifest } from "../../lib/report-apps.mjs";

export function GET(): Response {
    return Response.json(reportManifest(fullReportApp), {
        headers: { "Content-Type": "application/manifest+json" },
    });
}
