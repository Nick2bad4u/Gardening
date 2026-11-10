import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

import { appsScriptApi } from "../helpers/apps-script-api.mjs";

const sourceUrl = new URL(
    "../../scripts/google-sheets/plant-tracker.gs",
    import.meta.url
);
const source = readFileSync(sourceUrl, "utf8");
const propertyKey = "gardenLoggerNutrientPreferencesV1";

/**
 * @param {{
 *     properties?: Map<string, string>;
 *     busy?: boolean;
 *     failWrite?: boolean;
 *     loseWrite?: boolean;
 *     failRead?: boolean;
 *     beforeLock?: () => void;
 * }} [options]
 */
function fixture(options = {}) {
    const properties =
        options.properties ?? new Map([["unrelated", "preserve"]]);
    const releaseLock = vi.fn();
    const tryLock = vi.fn(() => {
        options.beforeLock?.();
        return options.busy !== true;
    });
    const getScriptLock = vi.fn(() => ({ releaseLock, tryLock }));
    const getProperty = vi.fn((/** @type {string} */ key) => {
        if (options.failRead === true) throw new Error("Read unavailable");
        return properties.get(key) ?? null;
    });
    const setProperty = vi.fn(
        (/** @type {string} */ key, /** @type {string} */ value) => {
            if (options.failWrite === true)
                throw new Error("Write unavailable");
            if (options.loseWrite !== true) properties.set(key, value);
        }
    );
    const openById = vi.fn(() => {
        throw new Error("Preferences must not access the workbook");
    });
    const context = vm.createContext({
        LockService: { getScriptLock },
        PropertiesService: {
            getScriptProperties: () => ({ getProperty, setProperty }),
        },
        SpreadsheetApp: { openById },
    });
    vm.runInContext(source, context, { filename: fileURLToPath(sourceUrl) });
    const server = appsScriptApi(context);
    return {
        // The real RPC boundary delivers plain cloned data, without VM prototypes.
        api: {
            /** @param {unknown} payload */
            saveWebNutrientDose: (payload) =>
                structuredClone(server.saveWebNutrientDose(payload)),
            /** @param {unknown} [legacy] */
            syncWebNutrientPreferences: (legacy) =>
                structuredClone(server.syncWebNutrientPreferences(legacy)),
        },
        getProperty,
        getScriptLock,
        openById,
        properties,
        releaseLock,
        setProperty,
        tryLock,
    };
}

const msu = "MSU 13-3-15";
const foliage = "SuperThrive Foliage Pro";

describe("shared nutrient preferences", () => {
    it("reads an empty store without a lock, property writes, or workbook access", () => {
        expect.hasAssertions();

        const f = fixture();

        expect(f.api.syncWebNutrientPreferences()).toStrictEqual({
            doses: {},
            product: "",
        });
        expect(f.setProperty).not.toHaveBeenCalled();
        expect(f.getScriptLock).not.toHaveBeenCalled();
        expect(f.openById).not.toHaveBeenCalled();
        expect(f.properties.get("unrelated")).toBe("preserve");
    });

    it("makes a saved dose available to another device and preserves unrelated properties", () => {
        expect.hasAssertions();

        const phone = fixture();
        const computer = fixture({ properties: phone.properties });

        expect(
            phone.api.saveWebNutrientDose({
                amount: "1 g/L",
                expectedAmount: "",
                product: msu,
            })
        ).toStrictEqual({
            preferences: { doses: { [msu]: "1 g/L" }, product: msu },
            saved: true,
        });
        expect(computer.api.syncWebNutrientPreferences()).toStrictEqual({
            doses: { [msu]: "1 g/L" },
            product: msu,
        });
        expect(phone.tryLock).toHaveBeenCalledWith(5000);
        expect(phone.releaseLock).toHaveBeenCalledExactlyOnceWith();
        expect(phone.openById).not.toHaveBeenCalled();
        expect(phone.properties.get("unrelated")).toBe("preserve");
    });

    it("merges different products from stale devices without replacing either dose", () => {
        expect.hasAssertions();

        const phone = fixture();
        const computer = fixture({ properties: phone.properties });
        phone.api.saveWebNutrientDose({
            amount: "1 g/L",
            expectedAmount: "",
            product: msu,
        });

        expect(
            computer.api.saveWebNutrientDose({
                amount: "2 mL/L",
                expectedAmount: "",
                product: foliage,
            })
        ).toStrictEqual({
            preferences: {
                doses: { [foliage]: "2 mL/L", [msu]: "1 g/L" },
                product: foliage,
            },
            saved: true,
        });
    });

    it("rejects a stale replacement but permits an idempotent replay and a reviewed replacement", () => {
        expect.hasAssertions();

        const f = fixture();
        const initial = { amount: "1 g/L", expectedAmount: "", product: msu };
        f.api.saveWebNutrientDose(initial);

        expect(f.api.saveWebNutrientDose(initial).saved).toBe(true);
        expect(
            f.api.saveWebNutrientDose({ ...initial, amount: "2 g/L" })
        ).toStrictEqual({
            preferences: { doses: { [msu]: "1 g/L" }, product: msu },
            saved: false,
        });
        expect(f.setProperty).toHaveBeenCalledTimes(1);
        expect(
            f.api.saveWebNutrientDose({
                amount: "2 g/L",
                expectedAmount: "1 g/L",
                product: msu,
            }).saved
        ).toBe(true);
        expect(f.releaseLock).toHaveBeenCalledTimes(4);
    });

    it("imports only missing browser doses and never overwrites the selected shared product", () => {
        expect.hasAssertions();

        const f = fixture();
        f.api.saveWebNutrientDose({
            amount: "1 g/L",
            expectedAmount: "",
            product: msu,
        });
        const legacy = {
            doses: { [foliage]: "2 mL/L", [msu]: "9 g/L" },
            product: foliage,
        };
        const merged = {
            doses: { [foliage]: "2 mL/L", [msu]: "1 g/L" },
            product: msu,
        };

        expect(f.api.syncWebNutrientPreferences(legacy)).toStrictEqual(merged);

        f.api.syncWebNutrientPreferences(legacy);

        expect(f.setProperty).toHaveBeenCalledTimes(2);
    });

    it("imports the original selected product into an empty shared store", () => {
        expect.hasAssertions();

        const f = fixture();
        const legacy = { doses: { [foliage]: "2 mL/L" }, product: foliage };

        expect(f.api.syncWebNutrientPreferences(legacy)).toStrictEqual(legacy);
        expect(f.api.syncWebNutrientPreferences()).toStrictEqual(legacy);
    });

    it("reads again inside the lock so a competing import wins before mutation", () => {
        expect.hasAssertions();

        const properties = new Map();
        const newer = { doses: { [msu]: "3 g/L" }, product: msu };

        expect.hasAssertions();

        const f = fixture({
            beforeLock: () => {
                properties.set(propertyKey, JSON.stringify(newer));
            },
            properties,
        });

        expect(
            f.api.syncWebNutrientPreferences({
                doses: { [msu]: "1 g/L" },
                product: msu,
            })
        ).toStrictEqual(newer);
        expect(f.setProperty).not.toHaveBeenCalled();
    });

    it.each([
        null,
        [],
        "dose",
        {},
        { amount: "1 g/L", product: msu },
        { amount: 1, expectedAmount: "", product: msu },
        { amount: " ", expectedAmount: "", product: msu },
        { amount: "1 g/L", expectedAmount: "", product: "x".repeat(121) },
        { amount: "x".repeat(121), expectedAmount: "", product: msu },
        { amount: "1 g/L", expectedAmount: false, product: msu },
        {
            amount: "1 g/L",
            expectedAmount: "",
            nutrientsUsed: "Yes",
            product: msu,
        },
    ])("rejects malformed save input %# before acquiring a lock", (payload) => {
        expect.hasAssertions();

        const f = fixture();

        expect(() => f.api.saveWebNutrientDose(payload)).toThrow(
            /NUTRIENT_PREFERENCES_INVALID/v
        );
        expect(f.getScriptLock).not.toHaveBeenCalled();
        expect(f.setProperty).not.toHaveBeenCalled();
    });

    it.each([
        "__proto__",
        "constructor",
        "prototype",
        "toString",
    ])("rejects reserved product %s", (product) => {
        expect.hasAssertions();

        const f = fixture();

        expect(() =>
            f.api.saveWebNutrientDose({
                amount: "1 g/L",
                expectedAmount: "",
                product,
            })
        ).toThrow(/Unsupported product/v);
        expect(() =>
            f.api.syncWebNutrientPreferences({
                doses: { [product]: "1 g/L" },
                product,
            })
        ).toThrow(/Unsupported product/v);
        expect(f.setProperty).not.toHaveBeenCalled();
    });

    it.each([
        [],
        { doses: null, product: "" },
        { doses: [], product: "" },
        { doses: {}, product: msu },
        { doses: { " MSU ": "1 g/L" }, product: "" },
    ])("rejects malformed migration %#", (legacy) => {
        expect.hasAssertions();

        const f = fixture();

        expect(() => f.api.syncWebNutrientPreferences(legacy)).toThrow(
            /NUTRIENT_PREFERENCES_INVALID/v
        );
        expect(f.setProperty).not.toHaveBeenCalled();
    });

    it.each([
        "{",
        "null",
        "",
        JSON.stringify({ doses: {}, product: msu }),
    ])(
        "preserves corrupt stored data %# rather than replacing it",
        (stored) => {
            expect.hasAssertions();

            const f = fixture({ properties: new Map([[propertyKey, stored]]) });

            expect(() => f.api.syncWebNutrientPreferences()).toThrow(
                /NUTRIENT_PREFERENCES_STORAGE/v
            );
            expect(() =>
                f.api.saveWebNutrientDose({
                    amount: "1 g/L",
                    expectedAmount: "",
                    product: msu,
                })
            ).toThrow(/NUTRIENT_PREFERENCES_STORAGE/v);
            expect(f.properties.get(propertyKey)).toBe(stored);
            expect(f.setProperty).not.toHaveBeenCalled();
            expect(f.releaseLock).toHaveBeenCalledExactlyOnceWith();
        }
    );

    it("rejects combined product and UTF-8 limits without partial migration", () => {
        expect.hasAssertions();

        const f = fixture();
        const doses = Object.fromEntries(
            Array.from({ length: 20 }, (_, index) => [
                `Product ${index}`,
                "1 g/L",
            ])
        );
        f.api.syncWebNutrientPreferences({ doses, product: "Product 0" });
        const before = f.properties.get(propertyKey);

        expect(() =>
            f.api.syncWebNutrientPreferences({
                doses: { [msu]: "1 g/L" },
                product: msu,
            })
        ).toThrow(/NUTRIENT_PREFERENCES_LIMIT/v);
        expect(() =>
            f.api.saveWebNutrientDose({
                amount: "1 g/L",
                expectedAmount: "",
                product: msu,
            })
        ).toThrow(/NUTRIENT_PREFERENCES_LIMIT/v);

        const oversized = Object.fromEntries(
            Array.from({ length: 20 }, (_, index) => [
                `${index}${"界".repeat(100)}`,
                "界".repeat(120),
            ])
        );

        expect(() =>
            f.api.syncWebNutrientPreferences({ doses: oversized, product: "" })
        ).toThrow(/storage limit/v);
        expect(f.properties.get(propertyKey)).toBe(before);
        expect(f.setProperty).toHaveBeenCalledExactlyOnceWith(
            propertyKey,
            before
        );
    });

    it("does not write or release an unacquired busy lock", () => {
        expect.hasAssertions();

        const f = fixture({ busy: true });

        expect(() =>
            f.api.saveWebNutrientDose({
                amount: "1 g/L",
                expectedAmount: "",
                product: msu,
            })
        ).toThrow(/NUTRIENT_PREFERENCES_BUSY/v);
        expect(f.releaseLock).not.toHaveBeenCalled();
        expect(f.setProperty).not.toHaveBeenCalled();
    });

    it.each([
        { failRead: true },
        { failWrite: true },
        { loseWrite: true },
    ])("releases its lock when storage fails %#", (options) => {
        expect.hasAssertions();

        const f = fixture(options);

        expect(() =>
            f.api.saveWebNutrientDose({
                amount: "1 g/L",
                expectedAmount: "",
                product: msu,
            })
        ).toThrow(/Could not confirm|unavailable/v);
        expect(f.releaseLock).toHaveBeenCalledExactlyOnceWith();
        expect(f.openById).not.toHaveBeenCalled();
    });
});
