import { Window } from "happy-dom";
import { readFileSync } from "node:fs";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { describe, expect, it, onTestFinished } from "vitest";

const client = transpileModule(
    readFileSync(
        new URL("../site/client/profile-navigation.ts", import.meta.url),
        "utf8"
    ),
    {
        compilerOptions: {
            module: ModuleKind.ESNext,
            target: ScriptTarget.ES2022,
        },
    }
).outputText.replace("export function", "function");
const pinPreference = "gardening-profile-navigation-pinned";

/** @param {{ pinned?: boolean; blockedStorage?: boolean }} [options] */
function createNavigation({ blockedStorage = false, pinned = false } = {}) {
    const window = new Window({
        url: "https://example.test/Gardening/plants/moon/",
    });
    onTestFinished(async () => window.happyDOM.close());
    const document = window.document;
    const navigation = document.createElement("nav");
    navigation.dataset["profileNavigation"] = "";
    const panel = document.createElement("div");
    panel.dataset["profilePanel"] = "";
    const link = document.createElement("a");
    link.href = "/Gardening/plants/";
    link.textContent = "All plants";
    const reveal = document.createElement("button");
    reveal.dataset["profileReveal"] = "";
    reveal.hidden = true;
    const pin = document.createElement("button");
    pin.dataset["profilePin"] = "";
    pin.hidden = true;
    const jump = document.createElement("details");
    jump.dataset["profileJump"] = "";
    const summary = document.createElement("summary");
    summary.textContent = "Jump to a plant";
    jump.append(summary);
    panel.append(link, jump, pin);
    navigation.append(reveal, panel);
    document.body.append(navigation);
    Object.defineProperty(document.documentElement, "scrollHeight", {
        value: 3000,
    });
    window.localStorage.setItem(pinPreference, String(pinned));
    if (blockedStorage)
        Object.defineProperty(window, "localStorage", {
            get() {
                throw new Error("Storage blocked");
            },
        });
    const cleanup = /** @type {unknown} */ (
        window.eval(`${client}\ninitializeProfileNavigation();`)
    );
    const dispose = () => {
        if (!isDisposer(cleanup))
            throw new Error("Navigation did not initialize");
        cleanup();
    };
    /** @param {number} y */
    const scroll = (y) => {
        window.scrollTo(0, y);
        window.dispatchEvent(new window.Event("scroll"));
    };
    return {
        dispose,
        jump,
        link,
        navigation,
        panel,
        pin,
        reveal,
        scroll,
        summary,
        window,
    };
}

/** @param {unknown} value @returns {value is () => void} */
function isDisposer(value) {
    return typeof value === "function";
}

describe("floating plant navigation", () => {
    it("hides on downward scrolling, preserves a reveal control, and reveals on upward movement", () => {
        expect.hasAssertions();

        const { navigation, panel, reveal, scroll } = createNavigation();
        scroll(400);

        expect(navigation.classList.contains("is-scroll-hidden")).toBe(true);
        expect(panel.inert).toBe(true);
        expect(reveal.hidden).toBe(false);

        scroll(380);

        expect(navigation.classList.contains("is-scroll-hidden")).toBe(false);
        expect(panel.inert).toBe(false);
    });

    it("reveals for keyboard focus and keeps focused or open controls visible", () => {
        expect.hasAssertions();

        const { link, navigation, reveal, scroll, window } = createNavigation();
        scroll(400);
        reveal.focus();

        expect(window.document.activeElement).toBe(link);

        scroll(600);

        expect(navigation.classList.contains("is-scroll-hidden")).toBe(false);
    });

    it("keeps the jump list open while scrolling and restores summary focus on Escape", () => {
        expect.hasAssertions();

        const { jump, navigation, scroll, summary, window } =
            createNavigation();
        jump.open = true;
        scroll(800);

        expect(navigation.classList.contains("is-scroll-hidden")).toBe(false);

        jump.dispatchEvent(
            new window.KeyboardEvent("keydown", {
                bubbles: true,
                key: "Escape",
            })
        );

        expect(jump.open).toBe(false);
        expect(window.document.activeElement).toBe(summary);
    });

    it("restores pinning, updates it, and remains usable without browser storage", () => {
        expect.hasAssertions();

        const fixture = createNavigation({ pinned: true });
        fixture.scroll(400);

        expect(fixture.navigation.classList.contains("is-scroll-hidden")).toBe(
            false
        );
        expect(fixture.pin.getAttribute("aria-pressed")).toBe("true");

        fixture.pin.click();

        expect(fixture.window.localStorage.getItem(pinPreference)).toBe(
            "false"
        );

        const blocked = createNavigation({ blockedStorage: true });
        blocked.pin.click();
        blocked.scroll(400);

        expect(blocked.pin.getAttribute("aria-pressed")).toBe("true");
        expect(blocked.navigation.classList.contains("is-scroll-hidden")).toBe(
            false
        );
    });

    it("reveals navigation when the pointer enters the dock", () => {
        expect.hasAssertions();

        const { navigation, scroll, window } = createNavigation();
        scroll(400);
        navigation.dispatchEvent(new window.Event("pointerenter"));

        expect(navigation.classList.contains("is-scroll-hidden")).toBe(false);
    });

    it("keeps navigation visible at the end of the document", () => {
        expect.hasAssertions();

        const { navigation, scroll } = createNavigation();
        scroll(2900);

        expect(navigation.classList.contains("is-scroll-hidden")).toBe(false);
    });

    it("disposes listeners and restores ordinary navigation", () => {
        expect.hasAssertions();

        const { dispose, navigation, pin, scroll } = createNavigation();
        dispose();
        scroll(400);

        expect(pin.hidden).toBe(true);
        expect(navigation.classList.contains("is-scroll-hidden")).toBe(false);
        expect(navigation.dataset["initialized"]).toBeUndefined();
    });
});
