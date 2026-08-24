import type { GitHubClient, RepoRef } from "../github/client.js";
import { refreshPullRequest } from "../services/pr-analysis.js";

export async function runRecheckCommand(
  octokit: GitHubClient,
  target: RepoRef & { pull_number: number },
): Promise<string> {
  const analysis = await refreshPullRequest(octokit, target);
  return `Recomputed classification, CI, reviews, labels, and status comment for PR #${analysis.pull.number}.`;
}
