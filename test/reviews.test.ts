import { describe, expect, test } from "vitest";
import { isBotLogin, summarizeReviews } from "../src/github/reviews.js";
import { summarizeChecks } from "../src/github/checks.js";

describe("review summary", () => {
  test("does not count bot approvals as human approval", () => {
    const summary = summarizeReviews(
      [
        { userLogin: "embedded32bot[bot]", state: "APPROVED", commitId: "sha" },
        { userLogin: "Mukesh-SCS", state: "APPROVED", commitId: "sha" },
      ],
      "sha",
    );
    expect(isBotLogin("embedded32bot[bot]")).toBe(true);
    expect(summary.humanApprovals).toBe(1);
  });

  test("treats changes requested as blocking", () => {
    const summary = summarizeReviews(
      [{ userLogin: "Mukesh-SCS", state: "CHANGES_REQUESTED", commitId: "sha" }],
      "sha",
    );
    expect(summary.changesRequested).toBe(true);
    expect(summary.humanApprovals).toBe(0);
  });

  test("marks approvals against an old SHA as stale", () => {
    const summary = summarizeReviews(
      [{ userLogin: "Mukesh-SCS", state: "APPROVED", commitId: "old" }],
      "new",
    );
    expect(summary.staleApprovals).toBe(true);
    expect(summary.humanApprovals).toBe(0);
  });
});

describe("check summary", () => {
  test("counts green, pending, and failed checks", () => {
    expect(
      summarizeChecks([
        { name: "Verify (Node 20)", status: "completed", conclusion: "success" },
        { name: "Verify (Node 22)", status: "in_progress", conclusion: null },
        { name: "CodeQL", status: "completed", conclusion: "failure" },
        { name: "skipped", status: "completed", conclusion: "skipped" },
      ]),
    ).toEqual({
      passed: 1,
      pending: 1,
      failed: 1,
      names: ["Verify (Node 20)", "Verify (Node 22)", "CodeQL"],
    });
  });
});
