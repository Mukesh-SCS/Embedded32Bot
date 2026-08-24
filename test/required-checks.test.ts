import { describe, expect, test } from "vitest";
import {
  evaluateChecks,
  REQUIRED_CHECK_NAMES,
  selectLatestCheckRuns,
} from "../src/policy/required-checks.js";

describe("required checks", () => {
  test("requires the current Embedded32 workflow jobs", () => {
    expect(REQUIRED_CHECK_NAMES).toEqual([
      "Verify (Node 20)",
      "Verify (Node 22)",
      "Verify (Windows, Node 20)",
      "Analyze JavaScript/TypeScript",
      "Review dependencies",
    ]);
  });

  test("keeps the newest run when names are duplicated", () => {
    const latest = selectLatestCheckRuns([
      { id: 1, name: "Verify (Node 20)", status: "completed", conclusion: "failure" },
      { id: 9, name: "Verify (Node 20)", status: "completed", conclusion: "success" },
    ]);
    expect(latest).toEqual([
      { id: 9, name: "Verify (Node 20)", status: "completed", conclusion: "success" },
    ]);
  });

  test("reports passed, missing, failed, and pending required checks", () => {
    const summary = evaluateChecks([
      { id: 1, name: "Verify (Node 20)", status: "completed", conclusion: "success" },
      { id: 2, name: "Verify (Node 22)", status: "completed", conclusion: "failure" },
      { id: 3, name: "Verify (Windows, Node 20)", status: "in_progress", conclusion: null },
    ]);
    expect(summary.required).toEqual([
      { name: "Verify (Node 20)", state: "passed" },
      { name: "Verify (Node 22)", state: "failed" },
      { name: "Verify (Windows, Node 20)", state: "pending" },
      { name: "Analyze JavaScript/TypeScript", state: "missing" },
      { name: "Review dependencies", state: "missing" },
    ]);
  });
});
