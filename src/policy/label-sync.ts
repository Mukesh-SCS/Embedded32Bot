import type { StatusLabel } from "./labels.js";
import type { CheckSummary, MergeDecision } from "./merge.js";

export function statusLabelForState(input: {
  blocked: boolean;
  changesRequested: boolean;
  checks: CheckSummary;
  mergeDecision: MergeDecision;
}): StatusLabel {
  if (input.blocked) {
    return "status: blocked";
  }
  if (input.checks.failed > 0) {
    return "status: ci-failed";
  }
  if (input.changesRequested) {
    return "status: needs-changes";
  }
  if (input.mergeDecision.allowed) {
    return "status: ready-to-merge";
  }
  return "status: needs-review";
}

export function diffBotLabels(current: readonly string[], desired: readonly string[]): {
  add: string[];
  remove: string[];
} {
  const currentSet = new Set(current);
  const desiredSet = new Set(desired);
  return {
    add: desired.filter((label) => !currentSet.has(label)),
    remove: current.filter((label) => !desiredSet.has(label)),
  };
}
