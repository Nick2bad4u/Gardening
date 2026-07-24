import { describe, expect, it } from "vitest";

import { describeToolingBaseline } from "../src/tooling-baseline.js";

describe(describeToolingBaseline, () => {
    it("returns the template baseline label", () => {
        expect.assertions(2);

        expect(describeToolingBaseline()).toBe(
            "Nick2bad4u TypeScript/npm repository tooling baseline"
        );
        expect(describeToolingBaseline()).not.toHaveLength(0);
    });
});
