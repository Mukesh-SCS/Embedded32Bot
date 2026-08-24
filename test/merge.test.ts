import { describe, expect, test } from "vitest";
import { evaluateMerge } from "../src/policy/merge.js";

describe("merge policy", () => {
  test("denies merge by default", () => {
    const decision = evaluateMerge();
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("merge-is-disabled");
  });
});
