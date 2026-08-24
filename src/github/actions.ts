import type { GitHubClient, RepoRef } from "./client.js";

export type WorkflowRun = {
  id: number;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
};

export async function listWorkflowRunsForSha(
  octokit: GitHubClient,
  target: RepoRef & { head_sha: string },
): Promise<WorkflowRun[]> {
  const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
    owner: target.owner,
    repo: target.repo,
    head_sha: target.head_sha,
    per_page: 50,
  });
  return data.workflow_runs.map((run) => ({
    id: run.id,
    status: run.status ?? "",
    conclusion: run.conclusion,
    htmlUrl: run.html_url,
  }));
}

export async function rerunFailedJobs(
  octokit: GitHubClient,
  target: RepoRef & { run_id: number },
): Promise<void> {
  await octokit.rest.actions.reRunWorkflowFailedJobs({
    owner: target.owner,
    repo: target.repo,
    run_id: target.run_id,
  });
}
