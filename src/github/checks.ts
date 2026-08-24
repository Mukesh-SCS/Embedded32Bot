import type { CheckSummary } from "../policy/merge.js";
import type { GitHubClient, RepoRef } from "./client.js";

const FAILED_CONCLUSIONS = new Set(["failure", "cancelled", "timed_out", "action_required", "stale"]);
const IGNORED_CONCLUSIONS = new Set(["skipped", "neutral"]);

export type CheckRun = {
  name: string;
  status: string;
  conclusion: string | null;
};

export async function listCheckRuns(
  octokit: GitHubClient,
  target: RepoRef & { ref: string },
): Promise<CheckRun[]> {
  const { data } = await octokit.rest.checks.listForRef({
    owner: target.owner,
    repo: target.repo,
    ref: target.ref,
    per_page: 100,
  });
  return data.check_runs.map((run) => ({
    name: run.name,
    status: run.status,
    conclusion: run.conclusion,
  }));
}

export function summarizeChecks(runs: readonly CheckRun[]): CheckSummary {
  const names: string[] = [];
  let passed = 0;
  let pending = 0;
  let failed = 0;

  for (const run of runs) {
    if (run.conclusion && IGNORED_CONCLUSIONS.has(run.conclusion)) {
      continue;
    }
    names.push(run.name);
    if (run.status !== "completed") {
      pending += 1;
      continue;
    }
    if (run.conclusion && FAILED_CONCLUSIONS.has(run.conclusion)) {
      failed += 1;
      continue;
    }
    passed += 1;
  }

  return { passed, pending, failed, names };
}
