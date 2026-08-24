import type { GitHubClient, RepoRef } from "../github/client.js";
import { createRevertPullRequest } from "../github/commits.js";
import { listOpenPullRequests } from "../github/pull-requests.js";
import { getPullRequest } from "../github/pull-requests.js";
import { evaluateRevert, revertBranchName, revertTitle } from "../policy/revert.js";

export async function runRevertCommand(
  octokit: GitHubClient,
  target: RepoRef & { pull_number: number },
): Promise<string> {
  const pull = await getPullRequest(octokit, target);
  const decision = evaluateRevert({
    merged: pull.merged,
    mergeCommitSha: pull.mergeCommitSha,
  });
  if (!decision.allowed) {
    return ["Cannot revert.", "", ...decision.reasons.map((reason) => `- ${reason}`)].join("\n");
  }

  const existing = await findExistingRevert(octokit, target, pull.number, pull.title);
  if (existing) {
    return `Revert PR already exists: #${existing.number} (${existing.title}).`;
  }

  const revert = await createRevertPullRequest(octokit, {
    pullRequestId: pull.nodeId,
    title: revertTitle(pull.title, pull.number),
    body: [
      `Reverts #${pull.number}.`,
      "",
      `Requested via Embedded32Bot.`,
      `Expected follow-up branch name: \`${revertBranchName(pull.number)}\`.`,
      "This revert PR must pass CI before merge.",
    ].join("\n"),
  });

  return `Opened revert PR #${revert.number}: ${revert.url}`;
}

async function findExistingRevert(
  octokit: GitHubClient,
  target: RepoRef,
  prNumber: number,
  originalTitle: string,
): Promise<{ number: number; title: string } | undefined> {
  const expectedTitle = revertTitle(originalTitle, prNumber);
  const expectedBranch = revertBranchName(prNumber);
  const open = await listOpenPullRequests(octokit, target);
  return open.find(
    (candidate) =>
      candidate.title === expectedTitle ||
      candidate.headRef === expectedBranch ||
      candidate.body.includes(`Reverts #${prNumber}.`),
  );
}
