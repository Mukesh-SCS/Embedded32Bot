import type { GitHubClient, RepoRef } from "../github/client.js";
import { listWorkflowRunsForSha, rerunFailedJobs } from "../github/actions.js";
import { getPullRequest } from "../github/pull-requests.js";

export async function runRerunCiCommand(
  octokit: GitHubClient,
  target: RepoRef & { pull_number: number },
): Promise<string> {
  const pull = await getPullRequest(octokit, target);
  const runs = await listWorkflowRunsForSha(octokit, {
    owner: target.owner,
    repo: target.repo,
    head_sha: pull.headSha,
  });
  const failed = runs.filter(
    (run) => run.conclusion === "failure" || run.conclusion === "timed_out" || run.conclusion === "cancelled",
  );

  if (failed.length === 0) {
    return `No failed workflow runs found for \`${pull.headSha.slice(0, 12)}\`.`;
  }

  const rerun: number[] = [];
  for (const run of failed) {
    await rerunFailedJobs(octokit, {
      owner: target.owner,
      repo: target.repo,
      run_id: run.id,
    });
    rerun.push(run.id);
  }

  return `Reran failed jobs for workflow run(s): ${rerun.join(", ")}.`;
}
