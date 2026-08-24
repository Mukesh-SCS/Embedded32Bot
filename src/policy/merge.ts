import { TARGET_BASE_BRANCH } from "../config.js";
import type { RiskLevel } from "./risk.js";

export type CheckSummary = {
  passed: number;
  pending: number;
  failed: number;
  names: string[];
};

export type MergeInputs = {
  draft: boolean;
  merged: boolean;
  mergeable: boolean | null;
  mergeableState: string;
  baseBranch: string;
  headSha: string;
  humanApprovals: number;
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

export function evaluateMerge(input: MergeInputs): MergeDecision {
  const reasons: string[] = [];

  if (input.merged) {
    return { allowed: false, reasons: ["pull request is already merged"] };
  }
  if (input.draft) {
    reasons.push("pull request is a draft");
  }
  if (input.baseBranch !== TARGET_BASE_BRANCH) {
    reasons.push(`base branch is \`${input.baseBranch}\`, not \`${TARGET_BASE_BRANCH}\``);
  }
  if (input.mergeable === false || input.mergeableState === "dirty") {
    reasons.push("merge conflict");
  }
  if (input.checks.failed > 0) {
    reasons.push("required CI failed");
  }
  if (input.checks.pending > 0 || input.checks.passed + input.checks.failed === 0) {
    reasons.push("required CI pending");
  }
  if (input.changesRequested) {
    reasons.push("changes requested");
  }
  if (input.humanApprovals < 1) {
    reasons.push("required review missing");
  }
  if (input.staleApprovals) {
    reasons.push("approval is stale; head SHA changed after review");
  }
  if (input.labels.includes("status: blocked")) {
    reasons.push("status: blocked");
  }
  if (input.labels.includes("status: needs-changes")) {
    reasons.push("status: needs-changes");
  }
  if (input.mergeableState === "blocked") {
    reasons.push("GitHub reports the pull request as blocked");
  }

  return { allowed: reasons.length === 0, reasons };
}

export function canAutomaticallyMerge(decision: MergeDecision, risk: RiskLevel): boolean {
  return decision.allowed && risk !== "high" && risk !== "critical";
}
