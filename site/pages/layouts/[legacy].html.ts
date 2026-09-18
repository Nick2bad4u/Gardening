import type { APIRoute, GetStaticPaths } from "astro";

import { getProfiles } from "../../lib/content.mjs";
import { legacyData, legacyLayouts, redirectHtml } from "../../lib/legacy.mjs";
import { siteUrl } from "../../lib/routes.mjs";

export const getStaticPaths: GetStaticPaths = () =>
    Object.entries(legacyLayouts).map(([legacy, destination]) => ({
        params: { legacy },
        props: { destination },
    }));
export const GET: APIRoute = async ({ props }) => {
    const profiles = await getProfiles();
    const data = legacyData(profiles);
    const destination = siteUrl(String(props["destination"]));
    const html = redirectHtml(data, destination);
    return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
};
