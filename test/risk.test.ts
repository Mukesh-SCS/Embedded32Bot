import { describe, expect, test } from "vitest";
import { isRiskLevel, RISK_LEVELS } from "../src/policy/risk.js";

describe("risk policy", () => {
  test("represents every valid risk level", () => {
    expect([...RISK_LEVELS]).toEqual(["low", "medium", "high", "critical"]);
  });

  test("accepts only the defined risk levels", () => {
    for (const level of RISK_LEVELS) {
      expect(isRiskLevel(level)).toBe(true);
    }

    expect(isRiskLevel("unknown")).toBe(false);
    expect(isRiskLevel("Risk: low")).toBe(false);
  });
});
