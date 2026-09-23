import type { GetStaticPaths } from "astro";

import { type SiteApp, siteApps, siteManifest } from "../../lib/site-apps.mjs";

export const getStaticPaths = (() =>
    siteApps.map((app) => ({
        params: { app: app.route.slice(0, -1) || undefined },
        props: { app },
    }))) satisfies GetStaticPaths;

export function GET({
    props,
}: {
    readonly props: { readonly app: Readonly<SiteApp> };
}): Response {
    return Response.json(siteManifest(props.app), {
        headers: { "Content-Type": "application/manifest+json" },
    });
}
