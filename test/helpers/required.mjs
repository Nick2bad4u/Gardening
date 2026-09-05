/** @param {unknown} value @returns {number} */
export function finiteNumber(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new TypeError("Expected a finite numeric fixture result");
    }
    return value;
}

/**
 * Preserve the union of distinct sheet mock shapes in a heterogeneous map.
 *
 * @template {readonly (readonly [string, unknown])[]} T
 *
 * @param {T} entries
 *
 * @returns {Map<string, T[number][1]>}
 */
export function fixtureMap(entries) {
    /** @type {Map<string, T[number][1]>} */
    const result = new Map();
    for (const [key, value] of entries) result.set(key, value);
    return result;
}

/**
 * Query real fixture markup and verify the requested element class.
 *
 * @template {import("happy-dom").Element} T
 *
 * @param {import("happy-dom").Document | import("happy-dom").Element} root
 * @param {string} selector
 * @param {abstract new (...args: never[]) => T} constructor
 *
 * @returns {T}
 */
export function queryElement(root, selector, constructor) {
    const element = root.querySelector(selector);
    if (!(element instanceof constructor)) {
        throw new TypeError(`Expected ${selector} to be a ${constructor.name}`);
    }
    return element;
}

/**
 * @template {import("happy-dom").Element} T
 *
 * @param {import("happy-dom").Document | import("happy-dom").Element} root
 * @param {string} selector
 * @param {abstract new (...args: never[]) => T} constructor
 *
 * @returns {T[]}
 */
export function queryElements(root, selector, constructor) {
    return Array.from(root.querySelectorAll(selector), (element) => {
        if (!(element instanceof constructor)) {
            throw new TypeError(
                `Expected ${selector} to contain ${constructor.name}`
            );
        }
        return element;
    });
}

/**
 * Fail at the fixture boundary when a required value is absent.
 *
 * @template T
 *
 * @param {T | null | undefined} value
 * @param {string} [description]
 *
 * @returns {T}
 */
export function required(value, description = "fixture value") {
    if (value === null || value === undefined) {
        throw new Error(`Missing ${description}`);
    }
    return value;
}

/** @param {unknown} value @returns {string[]} */
export function stringArray(value) {
    if (!Array.isArray(value)) {
        throw new TypeError("Expected an array of fixture strings");
    }
    /** @type {unknown[]} */
    const entries = value;
    return entries.map((entry) => {
        if (typeof entry !== "string") {
            throw new TypeError("Expected a fixture string");
        }
        return entry;
    });
}
