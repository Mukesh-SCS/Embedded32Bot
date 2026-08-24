export type ApprovalDecision = {
  readonly allowed: false;
  readonly reason: "approval-is-disabled";
};

export function evaluateApproval(): ApprovalDecision {
  return {
    allowed: false,
    reason: "approval-is-disabled",
  };
}
