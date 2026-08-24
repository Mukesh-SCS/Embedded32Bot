import { describe, expect, test } from "vitest";
import { evaluateMerge, type CheckSummary, type MergeInputs } from "../src/policy/merge.js";
import { evaluateChecks, REQUIRED_CHECK_NAMES } from "../src/policy/required-checks.js";

function passingChecks(): CheckSummary {
  return evaluateChecks(
    REQUIRED_CHECK_NAMES.map((name, id) => ({
      id: id + 1,
      name,
      status: "completed",
      conclusion: "success",
    })),
  );
}

function inputs(overrides: Partial<MergeInputs> = {}): MergeInputs {
  return {
    state: "open",
    draft: false,
    merged: false,
    mergeable: true,
    mergeableState: "clean",
    baseBranch: "main",
    headSha: "abc123",
    trustedApprovals: 1,
    changesRequested: false,
    staleApprovals: false,
    checks: passingChecks(),
    labels: [],
    risk: "low",
    ...overrides,
  };
}

describe("merge policy", () => {
  test("allows merge when all gates pass", () => {
    const decision = evaluateMerge(inputs());
    expect(decision.allowed).toBe(true);
    expect(decision.reasons).toEqual([]);
  });

  test("rejects drafts", () => {
    expect(evaluateMerge(inputs({ draft: true })).reasons).toContain("pull request is a draft");
  });

  test("rejects a closed unmerged pull request", () => {
    const decision = evaluateMerge(inputs({ state: "closed", merged: false }));
    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toEqual(["pull request is closed"]);
  });

  test("rejects an already merged pull request", () => {
    const decision = evaluateMerge(inputs({ state: "closed", merged: true }));
    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toEqual(["pull request is already merged"]);
  });

  test("rejects unknown mergeability", () => {
    expect(evaluateMerge(inputs({ mergeable: null, mergeableState: "unknown" })).reasons).toContain(
      "mergeability is still being calculated",
    );
  });

  test("rejects a behind head branch", () => {
    expect(evaluateMerge(inputs({ mergeableState: "behind" })).reasons).toContain(
      "head branch is behind the base branch",
    );
  });

  test("rejects an unrecognized mergeable state", () => {
    expect(evaluateMerge(inputs({ mergeableState: "mystery" })).reasons).toContain(
      "unrecognized mergeable state `mystery`",
    );
  });

  test("does not treat unstable as a merge blocker", () => {
    expect(evaluateMerge(inputs({ mergeableState: "unstable" })).allowed).toBe(true);
  });

  test("rejects a missing required check", () => {
    const checks = evaluateChecks(
      REQUIRED_CHECK_NAMES.filter((name) => name !== "Review dependencies").map((name, id) => ({
        id: id + 1,
        name,
        status: "completed",
        conclusion: "success",
      })),
    );
    expect(evaluateMerge(inputs({ checks })).reasons).toContain(
      "required check missing: Review dependencies",
    );
  });

  test("rejects a failed required check", () => {
    const checks = evaluateChecks(
      REQUIRED_CHECK_NAMES.map((name, id) => ({
        id: id + 1,
        name,
        status: "completed",
        conclusion: name === "Verify (Node 22)" ? "failure" : "success",
      })),
    );
    expect(evaluateMerge(inputs({ checks })).reasons).toContain(
      "required check failed: Verify (Node 22)",
    );
  });

  test("rejects a pending required check", () => {
    const checks = evaluateChecks(
      REQUIRED_CHECK_NAMES.map((name, id) => ({
        id: id + 1,
        name,
        status: name === "Verify (Node 20)" ? "in_progress" : "completed",
        conclusion: name === "Verify (Node 20)" ? null : "success",
      })),
    );
    expect(evaluateMerge(inputs({ checks })).reasons).toContain(
      "required check pending: Verify (Node 20)",
    );
  });

  test("does not block on an optional failed check", () => {
    const checks = evaluateChecks([
      ...REQUIRED_CHECK_NAMES.map((name, id) => ({
        id: id + 1,
        name,
        status: "completed",
        conclusion: "success",
      })),
      {
        id: 99,
        name: "optional lint",
        status: "completed",
        conclusion: "failure",
      },
    ]);
    expect(evaluateMerge(inputs({ checks })).allowed).toBe(true);
    expect(checks.optionalFailed).toContain("optional lint");
  });

  test("rejects missing trusted review", () => {
    expect(evaluateMerge(inputs({ trustedApprovals: 0 })).reasons).toContain(
      "required trusted review missing",
    );
  });

  test("rejects merge conflicts", () => {
    expect(evaluateMerge(inputs({ mergeable: false, mergeableState: "dirty" })).reasons).toContain(
      "merge conflict",
    );
  });

  test("rejects blocked labels", () => {
    expect(evaluateMerge(inputs({ labels: ["status: blocked"] })).reasons).toContain(
      "status: blocked",
    );
  });

  test("rejects stale trusted approvals when no current trusted approval exists", () => {
    expect(evaluateMerge(inputs({ trustedApprovals: 0, staleApprovals: true })).reasons).toContain(
      "approval is stale; head SHA changed after review",
    );
  });
});
