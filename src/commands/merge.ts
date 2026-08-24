import type { GitHubClient, RepoRef } from "../github/client.js";
import { getRepositoryMergeMethods, mergePullRequest } from "../github/pull-requests.js";
import { analyzePullRequest } from "../services/pr-analysis.js";

export async function runMergeCommand(
  octokit: GitHubClient,
  target: RepoRef & { pull_number: number },
): Promise<string> {
  const analysis = await analyzePullRequest(octokit, target);
  if (analysis.pull.merged) {
    return `PR #${analysis.pull.number} is already merged.`;
  }

  const decision = analysis.mergeDecision;
  if (!decision.allowed) {
    return ["DO NOT MERGE", "", "Blockers:", ...decision.reasons.map((reason) => `- ${reason}`)].join(
      "\n",
    );
  }

  const mergeMethod = await getRepositoryMergeMethods(octokit, target);
  await mergePullRequest(octokit, {
    owner: target.owner,
    repo: target.repo,
    pull_number: target.pull_number,
    sha: analysis.pull.headSha,
    merge_method: mergeMethod,
  });
  return `Merged PR #${analysis.pull.number} with ${mergeMethod} at \`${analysis.pull.headSha.slice(0, 12)}\`.`;
}
