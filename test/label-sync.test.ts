import { describe, expect, test } from "vitest";
import { diffBotLabels, statusLabelForState } from "../src/policy/label-sync.js";
import { canonicalizeLabel, isBotManagedLabel, parseLabelArgument } from "../src/policy/labels.js";
import { desiredBotLabels } from "../src/services/pr-analysis.js";

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
    expect(
      diffBotLabels(["area: docs", "area: cli"], ["area: docs", "risk: low"]),
    ).toEqual({
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
        checks: { passed: 0, pending: 0, failed: 1, names: ["CI"] },
        mergeDecision: { allowed: false, reasons: ["required CI failed"] },
      }),
    ).toBe("status: ci-failed");
  });
});

describe("desired bot labels", () => {
  test("does not attach status labels after merge", () => {
    const labels = desiredBotLabels(
      {
        pull: {
          number: 1,
          nodeId: "PR_1",
          title: "docs",
          body: "",
          state: "closed",
          draft: false,
          merged: true,
          mergeable: true,
          mergeableState: "clean",
          baseBranch: "main",
          headSha: "abc",
          authorLogin: "author",
          authorType: "User",
          htmlUrl: "https://github.com/Mukesh-SCS/Embedded32/pull/1",
          mergeCommitSha: "def",
          labels: ["status: ready-to-merge"],
        },
        classification: {
          areas: ["area: docs"],
          type: "type: docs",
          risk: "low",
          release: "release: none",
          unclassifiedPaths: [],
        },
        template: [],
        checks: { passed: 0, pending: 0, failed: 0, names: [] },
        reviews: {
          humanApprovals: 1,
          changesRequested: false,
          staleApprovals: false,
          latestHumanState: "APPROVED",
        },
        mergeDecision: { allowed: false, reasons: ["pull request is already merged"] },
        labels: ["status: ready-to-merge"],
      },
      ["status: ready-to-merge", "area: docs"],
    );
    expect(labels).toContain("area: docs");
    expect(labels.some((name) => name.startsWith("status:"))).toBe(false);
  });
});
