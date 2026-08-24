import type { GitHubClient, RepoRef } from "./client.js";
import { stopWhenShortPage } from "./paginate.js";

export async function listIssueLabels(
  octokit: GitHubClient,
  target: RepoRef & { issue_number: number },
): Promise<string[]> {
  const labels = await octokit.paginate(
    octokit.rest.issues.listLabelsOnIssue,
    {
      owner: target.owner,
      repo: target.repo,
      issue_number: target.issue_number,
      per_page: 100,
    },
    stopWhenShortPage(),
  );
  return labels.map((label) => label.name);
}

export async function addIssueLabels(
  octokit: GitHubClient,
  target: RepoRef & { issue_number: number; labels: string[] },
): Promise<void> {
  if (target.labels.length === 0) {
    return;
  }
  await octokit.rest.issues.addLabels({
    owner: target.owner,
    repo: target.repo,
    issue_number: target.issue_number,
    labels: target.labels,
  });
}

export async function removeIssueLabel(
  octokit: GitHubClient,
  target: RepoRef & { issue_number: number; name: string },
): Promise<void> {
  await octokit.rest.issues.removeLabel({
    owner: target.owner,
    repo: target.repo,
    issue_number: target.issue_number,
    name: target.name,
  });
}
