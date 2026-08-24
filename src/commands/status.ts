import type { GitHubClient, RepoRef } from "../github/client.js";
import { refreshPullRequest, renderStatusSnapshot } from "../services/pr-analysis.js";

export async function runStatusCommand(
  octokit: GitHubClient,
  target: RepoRef & { pull_number: number },
): Promise<string> {
  const analysis = await refreshPullRequest(octokit, target);
  return renderStatusSnapshot(analysis);
}
