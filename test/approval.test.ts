import { describe, expect, test } from "vitest";
import { evaluateApproval } from "../src/policy/approval.js";

describe("approval policy", () => {
  test("denies approval by default", () => {
    const decision = evaluateApproval();
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("approval-is-disabled");
  });
});
