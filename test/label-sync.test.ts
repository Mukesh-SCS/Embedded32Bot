import { describe, expect, test } from "vitest";
import { diffBotLabels, statusLabelForState } from "../src/policy/label-sync.js";
import { canonicalizeLabel, isBotManagedLabel, parseLabelArgument } from "../src/policy/labels.js";
import { evaluateChecks, REQUIRED_CHECK_NAMES } from "../src/policy/required-checks.js";
import { desiredBotLabels } from "../src/services/pr-analysis.js";

const passingChecks = evaluateChecks(
  REQUIRED_CHECK_NAMES.map((name, id) => ({
    id: id + 1,
    name,
    status: "completed",
    conclusion: "success",
  })),
);

const failedChecks = evaluateChecks(
  REQUIRED_CHECK_NAMES.map((name, id) => ({
    id: id + 1,
    name,
    status: "completed",
    conclusion: name === "Verify (Node 22)" ? "failure" : "success",
  })),
);

describe("label helpers", () => {
  test("identifies bot-managed namespaces", () => {
    expect(isBotManagedLabel("area: docs")).toBe(true);
    expect(isBotManagedLabel("dependencies")).toBe(true);
    expect(isBotManagedLabel("good first issue")).toBe(false);
  });

  test("canonicalizes command label arguments", () => {
    expect(canonicalizeLabel("area:j1939")).toBe("area: j1939");
    expect(parseLabelArgument("-area:j1939")).toEqual({
      action: "remove",
      label: "area: j1939",
    });
  });

  test("adds desired bot labels and removes stale ones", () => {
    expect(diffBotLabels(["area: docs", "area: cli"], ["area: docs", "risk: low"])).toEqual({
      add: ["risk: low"],
      remove: ["area: cli"],
    });
  });

  test("is idempotent when labels already match", () => {
    expect(diffBotLabels(["area: docs"], ["area: docs"])).toEqual({ add: [], remove: [] });
  });

  test("selects mutually exclusive status labels", () => {
    expect(
      statusLabelForState({
        blocked: false,
        changesRequested: false,
        checks: failedChecks,
        mergeDecision: { allowed: false, reasons: ["required check failed: Verify (Node 22)"] },
      }),
    ).toBe("status: ci-failed");
  });
});

describe("desired bot labels", () => {
  test("does not attach status labels after merge", () => {
    const labels = desiredBotLabels(closedAnalysis(true), ["status: ready-to-merge", "area: docs"]);
    expect(labels).toContain("area: docs");
    expect(labels.some((name) => name.startsWith("status:"))).toBe(false);
  });

  test("does not attach workflow status labels to a closed unmerged pull request", () => {
    const labels = desiredBotLabels(closedAnalysis(false), ["status: needs-review", "area: docs"]);
    expect(labels).toContain("area: docs");
    expect(labels.some((name) => name.startsWith("status:"))).toBe(false);
  });
});

function closedAnalysis(merged: boolean) {
  return {
    pull: {
      number: 1,
      nodeId: "PR_1",
      title: "docs",
      body: "",
      state: "closed",
      draft: false,
      merged,
      mergeable: true,
      mergeableState: "clean",
      baseBranch: "main",
      headSha: "abc",
      authorLogin: "author",
      authorType: "User",
      htmlUrl: "https://github.com/Mukesh-SCS/Embedded32/pull/1",
      mergeCommitSha: merged ? "def" : null,
      labels: ["status: ready-to-merge"],
    },
    classification: {
      areas: ["area: docs" as const],
      type: "type: docs" as const,
      risk: "low" as const,
      release: "release: none" as const,
      unclassifiedPaths: [],
    },
    template: [],
    checks: passingChecks,
    reviews: {
      humanApprovals: 1,
      trustedApprovals: 1,
      untrustedApprovals: 0,
      changesRequested: false,
      staleApprovals: false,
      latestHumanState: "APPROVED",
    },
    mergeDecision: {
      allowed: false,
      reasons: [merged ? "pull request is already merged" : "pull request is closed"],
    },
    labels: ["status: ready-to-merge"],
  };
}
