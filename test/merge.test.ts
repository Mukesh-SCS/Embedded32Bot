import { describe, expect, test } from "vitest";
import { evaluateMerge, type MergeInputs } from "../src/policy/merge.js";

function inputs(overrides: Partial<MergeInputs> = {}): MergeInputs {
  return {
    draft: false,
    merged: false,
    mergeable: true,
    mergeableState: "clean",
    baseBranch: "main",
    headSha: "abc123",
    humanApprovals: 1,
    changesRequested: false,
    staleApprovals: false,
    checks: { passed: 5, pending: 0, failed: 0, names: ["Verify (Node 22)"] },
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

  test("rejects failed CI", () => {
    expect(
      evaluateMerge(inputs({ checks: { passed: 4, pending: 0, failed: 1, names: ["CI"] } })).reasons,
    ).toContain("required CI failed");
  });

  test("rejects empty CI results as pending", () => {
    expect(
      evaluateMerge(inputs({ checks: { passed: 0, pending: 0, failed: 0, names: [] } })).reasons,
    ).toContain("required CI pending");
  });

  test("rejects missing reviews", () => {
    expect(evaluateMerge(inputs({ humanApprovals: 0 })).reasons).toContain("required review missing");
  });

  test("rejects merge conflicts", () => {
    expect(evaluateMerge(inputs({ mergeable: false, mergeableState: "dirty" })).reasons).toContain(
      "merge conflict",
    );
  });

  test("rejects blocked labels", () => {
    expect(evaluateMerge(inputs({ labels: ["status: blocked"] })).reasons).toContain("status: blocked");
  });

  test("rejects stale approvals", () => {
    expect(evaluateMerge(inputs({ staleApprovals: true })).reasons).toContain(
      "approval is stale; head SHA changed after review",
    );
  });

  test("rejects already merged pull requests", () => {
    const decision = evaluateMerge(inputs({ merged: true }));
    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toEqual(["pull request is already merged"]);
  });
});
