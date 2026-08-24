import { describe, expect, test } from "vitest";
import { evaluateRevert, revertBranchName, revertTitle } from "../src/policy/revert.js";

describe("revert policy", () => {
  test("rejects unmerged pull requests", () => {
    expect(evaluateRevert({ merged: false, mergeCommitSha: null }).allowed).toBe(false);
  });

  test("allows a merged pull request with a merge commit", () => {
    expect(evaluateRevert({ merged: true, mergeCommitSha: "abc" }).allowed).toBe(true);
  });

  test("uses deterministic revert names", () => {
    expect(revertBranchName(123)).toBe("embedded32bot/revert-pr-123");
    expect(revertTitle("Fix CAN filter", 123)).toBe('Revert "Fix CAN filter" (#123)');
  });
});
