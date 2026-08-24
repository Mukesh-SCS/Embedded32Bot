import { describe, expect, test } from "vitest";
import { isBotLogin, summarizeReviews } from "../src/github/reviews.js";
import { summarizeChecks } from "../src/github/checks.js";
import { REQUIRED_CHECK_NAMES } from "../src/policy/required-checks.js";

const admin = new Map([["Mukesh-SCS", "admin" as const]]);
const write = new Map([["collaborator", "write" as const]]);
const maintain = new Map([["maintainer", "maintain" as const]]);
const external = new Map([["outsider", "none" as const]]);

describe("review summary", () => {
  test("does not count bot approvals as human or trusted approval", () => {
    const summary = summarizeReviews(
      [
        { userLogin: "embedded32bot[bot]", state: "APPROVED", commitId: "sha" },
        { userLogin: "dependabot[bot]", state: "APPROVED", commitId: "sha" },
        { userLogin: "github-actions[bot]", state: "APPROVED", commitId: "sha" },
        { userLogin: "Mukesh-SCS", state: "APPROVED", commitId: "sha" },
      ],
      "sha",
      admin,
    );
    expect(isBotLogin("embedded32bot[bot]")).toBe(true);
    expect(summary.humanApprovals).toBe(1);
    expect(summary.trustedApprovals).toBe(1);
  });

  test("does not treat an external approval as trusted", () => {
    const summary = summarizeReviews(
      [{ userLogin: "outsider", state: "APPROVED", commitId: "sha" }],
      "sha",
      external,
    );
    expect(summary.humanApprovals).toBe(1);
    expect(summary.trustedApprovals).toBe(0);
    expect(summary.untrustedApprovals).toBe(1);
  });

  test("counts write collaborator approval as trusted", () => {
    const summary = summarizeReviews(
      [{ userLogin: "collaborator", state: "APPROVED", commitId: "sha" }],
      "sha",
      write,
    );
    expect(summary.trustedApprovals).toBe(1);
  });

  test("counts maintain and admin approvals as trusted", () => {
    expect(
      summarizeReviews(
        [{ userLogin: "maintainer", state: "APPROVED", commitId: "sha" }],
        "sha",
        maintain,
      ).trustedApprovals,
    ).toBe(1);
    expect(
      summarizeReviews(
        [{ userLogin: "Mukesh-SCS", state: "APPROVED", commitId: "sha" }],
        "sha",
        admin,
      ).trustedApprovals,
    ).toBe(1);
  });

  test("treats trusted changes requested as blocking", () => {
    const summary = summarizeReviews(
      [{ userLogin: "Mukesh-SCS", state: "CHANGES_REQUESTED", commitId: "sha" }],
      "sha",
      admin,
    );
    expect(summary.changesRequested).toBe(true);
    expect(summary.trustedApprovals).toBe(0);
  });

  test("does not let an external changes-requested review block merge", () => {
    const summary = summarizeReviews(
      [{ userLogin: "outsider", state: "CHANGES_REQUESTED", commitId: "sha" }],
      "sha",
      external,
    );
    expect(summary.changesRequested).toBe(false);
  });

  test("marks trusted approvals against an old SHA as stale", () => {
    const summary = summarizeReviews(
      [{ userLogin: "Mukesh-SCS", state: "APPROVED", commitId: "old" }],
      "new",
      admin,
    );
    expect(summary.staleApprovals).toBe(true);
    expect(summary.trustedApprovals).toBe(0);
  });
});

describe("check summary", () => {
  test("counts green, pending, and failed checks", () => {
    const summary = summarizeChecks([
      { id: 1, name: "Verify (Node 20)", status: "completed", conclusion: "success" },
      { id: 2, name: "Verify (Node 22)", status: "in_progress", conclusion: null },
      { id: 3, name: "CodeQL extra", status: "completed", conclusion: "failure" },
      { id: 4, name: "skipped", status: "completed", conclusion: "skipped" },
    ]);
    expect(summary.passed).toBe(1);
    expect(summary.pending).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.names).toEqual(["Verify (Node 20)", "Verify (Node 22)", "CodeQL extra"]);
    expect(summary.optionalFailed).toContain("CodeQL extra");
  });

  test("keeps the latest run when check names are duplicated", () => {
    const summary = summarizeChecks([
      { id: 1, name: "Verify (Node 20)", status: "completed", conclusion: "failure" },
      { id: 8, name: "Verify (Node 20)", status: "completed", conclusion: "success" },
    ]);
    expect(summary.required.find((check) => check.name === "Verify (Node 20)")?.state).toBe(
      "passed",
    );
    expect(summary.failed).toBe(0);
  });

  test("marks required checks that never reported as missing", () => {
    const summary = summarizeChecks([]);
    expect(summary.required).toHaveLength(REQUIRED_CHECK_NAMES.length);
    expect(summary.required.every((check) => check.state === "missing")).toBe(true);
  });
});
