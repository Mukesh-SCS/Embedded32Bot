export type MergeDecision = {
  readonly allowed: false;
  readonly reason: "merge-is-disabled";
};

export function evaluateMerge(): MergeDecision {
  return {
    allowed: false,
    reason: "merge-is-disabled",
  };
}
