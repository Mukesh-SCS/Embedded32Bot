import type { GitHubClient, RepoRef } from "../github/client.js";
import { getRepositoryMergeMethods, mergePullRequest } from "../github/pull-requests.js";
import { analyzePullRequest } from "../services/pr-analysis.js";

export async function runMergeCommand(
  octokit: GitHubClient,
  target: RepoRef & { pull_number: number },
): Promise<string> {
  const first = await analyzePullRequest(octokit, target);
  if (first.pull.merged) {
    return `PR #${first.pull.number} is already merged.`;
  }
  if (!first.mergeDecision.allowed) {
    return denyMerge(first.mergeDecision.reasons);
  }

  const mergeMethod = await getRepositoryMergeMethods(octokit, target);
  const latest = await analyzePullRequest(octokit, target);
  if (latest.pull.headSha !== first.pull.headSha) {
    return denyMerge(["pull request head SHA changed during merge evaluation"]);
  }
  if (latest.pull.merged) {
    return `PR #${latest.pull.number} is already merged.`;
  }
  if (!latest.mergeDecision.allowed) {
    return denyMerge(latest.mergeDecision.reasons);
  }

  await mergePullRequest(octokit, {
    owner: target.owner,
    repo: target.repo,
    pull_number: target.pull_number,
    sha: latest.pull.headSha,
    merge_method: mergeMethod,
  });
  return `Merged PR #${latest.pull.number} with ${mergeMethod} at \`${latest.pull.headSha.slice(0, 12)}\`.`;
}

function denyMerge(reasons: readonly string[]): string {
  return ["DO NOT MERGE", "", "Blockers:", ...reasons.map((reason) => `- ${reason}`)].join("\n");
}
