/** Visual categories only: all substantive text remains in maintained Markdown. */
const guideAppearances = new Map([
    ["care-notes", { icon: "care", label: "Collection Care", tone: "leaf" }],
    ["labels", { icon: "label", label: "Plant Identity", tone: "record" }],
    [
        "logger-actions",
        { icon: "edit", label: "Recording Care", tone: "record" },
    ],
    [
        "watering-quick-guide",
        { icon: "water", label: "Watering Quick Guide", tone: "water" },
    ],
    ["watering-strategy", { icon: "water", label: "Watering", tone: "water" }],
    [
        "weighing-strategy",
        { icon: "weight", label: "Weighing", tone: "weight" },
    ],
]);

/** @param {string} sourcePath */
export function documentAppearance(sourcePath) {
    if (sourcePath.startsWith("docs/old-plans/")) {
        return {
            icon: "history",
            label: "Old Plan · Archived Research",
            tone: "record",
        };
    }
    const slug = sourcePath.split("/").at(-1)?.replace(/\.md$/v, "") ?? "";
    const guide = guideAppearances.get(slug);
    if (guide) return guide;
    if (sourcePath.includes("/equipment/")) {
        return {
            icon: "inventory",
            label: "Equipment Reference",
            tone: "record",
        };
    }
    return { icon: "layout", label: "Growing Space", tone: "light" };
}

/**
 * Split only at the renderer's known level-two anchors. Every byte of the
 * sanitized body is retained in order; links, nested headings and tables stay
 * inside their original section.
 *
 * @param {{
 *     html: string;
 *     toc: { id: string; title: string; level: number }[];
 *     sourcePath: string;
 * }} document
 */
export function documentSections(document) {
    const appearance = documentAppearance(document.sourcePath);
    const headings = document.toc.filter((heading) => heading.level === 2);
    const starts = headings.map((heading) => {
        const offset = document.html.indexOf(`<h2 id="${heading.id}">`);
        if (offset === -1)
            throw new Error(`Document section is missing: ${heading.id}`);
        return { heading, offset };
    });
    const introduction = document.html.slice(
        0,
        starts[0]?.offset ?? document.html.length
    );
    const sections = starts.map(({ heading, offset }, index) => ({
        ...heading,
        ...sectionAppearance(heading.title, appearance),
        html: document.html.slice(
            offset,
            starts[index + 1]?.offset ?? document.html.length
        ),
        number: String(index + 1).padStart(2, "0"),
    }));
    return { appearance, introduction, sections };
}

/** @param {string} title @param {ReturnType<typeof documentAppearance>} fallback */
export function sectionAppearance(title, fallback) {
    if (/reference|research|source/iv.test(title))
        return {
            icon: "source",
            label: "Evidence & References",
            tone: "record",
        };
    if (/archive|earlier|histor|removed/iv.test(title))
        return { icon: "history", label: "Historical Context", tone: "record" };
    if (/caution|conflict|exception|missing|risk/iv.test(title))
        return { icon: "caution", label: "Considerations", tone: "light" };
    if (/fixture|lamp|light/iv.test(title))
        return { icon: "light", label: "Light & Placement", tone: "light" };
    if (/curve|measur|metric|weigh/iv.test(title))
        return { icon: "weight", label: "Measurements", tone: "weight" };
    if (/dry|rain|water|wet/iv.test(title))
        return { icon: "water", label: "Watering", tone: "water" };
    return fallback;
}
