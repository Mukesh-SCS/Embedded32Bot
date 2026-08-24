export type RevertInputs = {
  merged: boolean;
  mergeCommitSha: string | null;
};

export type RevertDecision = {
  allowed: boolean;
  reasons: string[];
};

export function evaluateRevert(input: RevertInputs): RevertDecision {
  const reasons: string[] = [];
  if (!input.merged) {
    reasons.push("pull request is not merged");
  }
  if (!input.mergeCommitSha) {
    reasons.push("merge commit SHA is unavailable");
  }
  return { allowed: reasons.length === 0, reasons };
}

export function revertBranchName(prNumber: number): string {
  return `embedded32bot/revert-pr-${prNumber}`;
}

export function revertTitle(originalTitle: string, prNumber: number): string {
  return `Revert "${originalTitle}" (#${prNumber})`;
}
