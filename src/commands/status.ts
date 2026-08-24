import type { GitHubClient, RepoRef } from "../github/client.js";
import { analyzePullRequest, renderStatusSnapshot } from "../services/pr-analysis.js";

export async function runStatusCommand(
  octokit: GitHubClient,
  target: RepoRef & { pull_number: number },
): Promise<string> {
  const analysis = await analyzePullRequest(octokit, target);
  return renderStatusSnapshot(analysis);
}
