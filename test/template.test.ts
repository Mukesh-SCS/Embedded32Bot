import { describe, expect, test } from "vitest";
import { validatePrTemplate } from "../src/policy/pr-template.js";

describe("PR template validation", () => {
  test("treats HTML comments as empty", () => {
    const result = validatePrTemplate("## Summary\n\n<!-- What does this PR change? -->\n");
    const summary = result.find((section) => section.name === "Summary");
    expect(summary?.present).toBe(true);
    expect(summary?.hasContent).toBe(false);
  });

  test("detects contributor content", () => {
    const result = validatePrTemplate("## Summary\n\nDocument the CAN filter change.\n");
    expect(result.find((section) => section.name === "Summary")?.hasContent).toBe(true);
  });
});
