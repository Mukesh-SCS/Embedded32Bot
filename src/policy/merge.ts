import { TARGET_BASE_BRANCH } from "../config.js";
import type { RequiredCheckResult } from "./required-checks.js";
import type { RiskLevel } from "./risk.js";

export type CheckSummary = {
  passed: number;
  pending: number;
  failed: number;
  names: string[];
  required: RequiredCheckResult[];
  optionalFailed: string[];
};

export type MergeInputs = {
  state: string;
  draft: boolean;
  merged: boolean;
  mergeable: boolean | null;
  mergeableState: string;
  baseBranch: string;
  headSha: string;
  trustedApprovals: number;
  changesRequested: boolean;
  staleApprovals: boolean;
  checks: CheckSummary;
  labels: readonly string[];
  risk: RiskLevel;
};

export type MergeDecision = {
  allowed: boolean;
  reasons: string[];
};

const MERGEABLE_STATES_OK = new Set(["clean", "unstable", "has_hooks"]);

export function evaluateMerge(input: MergeInputs): MergeDecision {
  const reasons: string[] = [];

  if (input.merged) {
    return { allowed: false, reasons: ["pull request is already merged"] };
  }
  if (input.state === "closed") {
    return { allowed: false, reasons: ["pull request is closed"] };
  }
  if (input.draft) {
    reasons.push("pull request is a draft");
  }
  if (input.baseBranch !== TARGET_BASE_BRANCH) {
    reasons.push(`base branch is \`${input.baseBranch}\`, not \`${TARGET_BASE_BRANCH}\``);
  }

  reasons.push(...mergeabilityReasons(input.mergeable, input.mergeableState));

  for (const check of input.checks.required) {
    if (check.state === "failed") {
      reasons.push(`required check failed: ${check.name}`);
    } else if (check.state === "pending") {
      reasons.push(`required check pending: ${check.name}`);
    } else if (check.state === "missing") {
      reasons.push(`required check missing: ${check.name}`);
    }
  }

  if (input.changesRequested) {
    reasons.push("changes requested");
  }
  if (input.trustedApprovals < 1) {
    reasons.push("required trusted review missing");
  }
  if (input.staleApprovals && input.trustedApprovals < 1) {
    reasons.push("approval is stale; head SHA changed after review");
  }
  if (input.labels.includes("status: blocked")) {
    reasons.push("status: blocked");
  }
  if (input.labels.includes("status: needs-changes")) {
    reasons.push("status: needs-changes");
  }

  return { allowed: reasons.length === 0, reasons };
}

export function canAutomaticallyMerge(decision: MergeDecision, risk: RiskLevel): boolean {
  return decision.allowed && risk !== "high" && risk !== "critical";
}

function mergeabilityReasons(mergeable: boolean | null, mergeableState: string): string[] {
  const state = mergeableState.trim().toLowerCase();
  if (mergeable === null || state === "unknown" || state === "") {
    return ["mergeability is still being calculated"];
  }
  if (mergeable === false || state === "dirty") {
    return ["merge conflict"];
  }
  if (state === "behind") {
    return ["head branch is behind the base branch"];
  }
  if (state === "blocked") {
    return ["GitHub reports the pull request as blocked"];
  }
  if (state === "draft") {
    return [];
  }
  if (MERGEABLE_STATES_OK.has(state)) {
    return [];
  }
  return [`unrecognized mergeable state \`${mergeableState}\``];
}
