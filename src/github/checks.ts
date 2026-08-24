import type { CheckSummary } from "../policy/merge.js";
import { evaluateChecks } from "../policy/required-checks.js";
import type { GitHubClient, RepoRef } from "./client.js";
import { stopWhenShortCheckRuns } from "./paginate.js";

export type CheckRun = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
};

export async function listCheckRuns(
  octokit: GitHubClient,
  target: RepoRef & { ref: string },
): Promise<CheckRun[]> {
  const runs = await octokit.paginate(
    octokit.rest.checks.listForRef,
    {
      owner: target.owner,
      repo: target.repo,
      ref: target.ref,
      per_page: 100,
    },
    stopWhenShortCheckRuns(),
  );
  return runs.map((run) => ({
    id: run.id,
    name: run.name,
    status: run.status,
    conclusion: run.conclusion,
  }));
}

export function summarizeChecks(runs: readonly CheckRun[]): CheckSummary {
  return evaluateChecks(runs);
}
