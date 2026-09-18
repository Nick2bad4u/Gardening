/**
 * @typedef {{
 *     title: string;
 *     category: string;
 *     href: string;
 *     description: string;
 *     text: string;
 * }} SearchEntry
 */

/** Initialize a lazily loaded search index and discard superseded results. */
export function initializeSearch() {
    const form = document.querySelector("#site-search-form");
    const field = document.querySelector("#site-search");
    const output = document.querySelector("#search-results");
    const message = document.querySelector("#search-status");
    if (
        !message ||
        !(field instanceof HTMLInputElement) ||
        !(output instanceof HTMLElement)
    )
        return;
    /**
     * @type {{
     *     promise: Promise<SearchEntry[]> | null;
     *     generation: number;
     * }}
     */
    const state = { generation: 0, promise: null };
    /** @param {number} revision @param {Promise<SearchEntry[]>} pending */
    const showFailure = (revision, pending) => {
        if (state.promise === pending) state.promise = null;
        if (revision !== state.generation) {
            return;
        }

        message.textContent =
            "Search could not load. Submit again to retry, or browse the navigation links.";
    };
    const performSearch = async () => {
        const query = field.value.trim();
        state.generation += 1;
        const revision = state.generation;
        const url = new URL(location.href);
        if (query) url.searchParams.set("q", query);
        else url.searchParams.delete("q");
        history.replaceState(null, "", url);
        output.replaceChildren();
        if (!query) {
            message.textContent = "Enter a name or topic to search.";
            return;
        }
        message.textContent = "Searching…";
        state.promise ??= fetchSearchIndex(
            output.dataset["indexUrl"] ?? "search-index.json"
        );
        const pending = state.promise;
        try {
            const entries = await pending;
            if (revision === state.generation)
                displayResults(output, message, entries, query);
        } catch {
            showFailure(revision, pending);
        }
    };
    const parameters = new URLSearchParams(location.search);
    field.value = parameters.get("q") ?? "";
    field.addEventListener("input", () => {
        void performSearch();
    });
    form?.addEventListener("submit", (event) => {
        event.preventDefault();
        void performSearch();
    });
    void performSearch();
}

/** @param {unknown} value @returns {SearchEntry[]} */
export function parseSearchIndex(value) {
    if (!Array.isArray(value)) throw new Error("Invalid search index");
    const entries = /** @type {unknown[]} */ (value);
    if (entries.every((entry) => isSearchEntry(entry))) return entries;
    throw new Error("Invalid search index");
}

/**
 * @param {HTMLElement} output @param {Element} message @param {SearchEntry[]}
 *   entries @param {string} query
 */
function displayResults(output, message, entries, query) {
    const matches = matchingEntries(entries, query);
    output.replaceChildren();
    for (const entry of matches) {
        const item = document.createElement("li");
        item.className = "card search-result";
        const link = document.createElement("a");
        link.href = entry.href;
        const kind = document.createElement("span");
        kind.className = "eyebrow";
        kind.textContent = entry.category;
        const title = document.createElement("h2");
        title.textContent = entry.title;
        const description = document.createElement("p");
        description.textContent = entry.description;
        link.append(kind, title, description);
        item.append(link);
        output.append(item);
    }
    message.textContent =
        matches.length > 0
            ? `${matches.length} ${matches.length === 1 ? "result" : "results"} for “${query}”.`
            : `No results for “${query}”. Try a shorter name or another topic.`;
}

/** @param {string} url */
async function fetchSearchIndex(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Search index unavailable");
    const value = /** @type {unknown} */ (await response.json());
    return parseSearchIndex(value);
}

/** @param {unknown} value @returns {value is SearchEntry} */
function isSearchEntry(value) {
    if (typeof value !== "object" || value === null) return false;
    return (
        "title" in value &&
        typeof value.title === "string" &&
        "category" in value &&
        typeof value.category === "string" &&
        "href" in value &&
        typeof value.href === "string" &&
        value.href.startsWith("/") &&
        !value.href.startsWith("//") &&
        "description" in value &&
        typeof value.description === "string" &&
        "text" in value &&
        typeof value.text === "string"
    );
}

/** @param {SearchEntry[]} entries @param {string} query */
function matchingEntries(entries, query) {
    const normalized = query.toLowerCase();
    const terms = normalized.split(/\s+/v);
    return entries
        .filter((entry) =>
            terms.every((term) =>
                `${entry.title} ${entry.description} ${entry.text}`
                    .toLowerCase()
                    .includes(term)
            )
        )
        .toSorted(
            (first, second) =>
                Number(second.title.toLowerCase().includes(normalized)) -
                Number(first.title.toLowerCase().includes(normalized))
        );
}

initializeSearch();
