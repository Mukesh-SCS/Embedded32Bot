import type { ChangedFile } from "../policy/classification.js";
import type { GitHubClient, RepoRef } from "./client.js";

export type PullRequestData = {
  number: number;
  nodeId: string;
  title: string;
  body: string;
  state: string;
  draft: boolean;
  merged: boolean;
  mergeable: boolean | null;
  mergeableState: string;
  baseBranch: string;
  headSha: string;
  authorLogin: string;
  authorType: string;
  htmlUrl: string;
  mergeCommitSha: string | null;
  labels: string[];
};

export async function getPullRequest(
  octokit: GitHubClient,
  target: RepoRef & { pull_number: number },
): Promise<PullRequestData> {
  const { data } = await octokit.rest.pulls.get({
    owner: target.owner,
    repo: target.repo,
    pull_number: target.pull_number,
  });
  return {
    number: data.number,
    nodeId: data.node_id,
    title: data.title,
    body: data.body ?? "",
    state: data.state,
    draft: Boolean(data.draft),
    merged: Boolean(data.merged),
    mergeable: data.mergeable,
    mergeableState: data.mergeable_state,
    baseBranch: data.base.ref,
    headSha: data.head.sha,
    authorLogin: data.user?.login ?? "",
    authorType: data.user?.type ?? "User",
    htmlUrl: data.html_url,
    mergeCommitSha: data.merge_commit_sha,
    labels: data.labels
      .map((label) => (typeof label === "string" ? label : label.name))
      .filter((name): name is string => Boolean(name)),
  };
}

export async function listPullRequestFiles(
  octokit: GitHubClient,
  target: RepoRef & { pull_number: number },
): Promise<ChangedFile[]> {
  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner: target.owner,
    repo: target.repo,
    pull_number: target.pull_number,
    per_page: 100,
  });
  return files.map((file) => ({
    filename: file.filename,
    previousFilename: file.previous_filename ?? undefined,
  }));
}

export async function listPullsForCommit(
  octokit: GitHubClient,
  target: RepoRef & { commit_sha: string },
): Promise<number[]> {
  const { data } = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
    owner: target.owner,
    repo: target.repo,
    commit_sha: target.commit_sha,
  });
  return data.map((pull) => pull.number);
}

export async function mergePullRequest(
  octokit: GitHubClient,
  target: RepoRef & {
    pull_number: number;
    sha: string;
    merge_method: "merge" | "squash" | "rebase";
  },
): Promise<void> {
  await octokit.rest.pulls.merge({
    owner: target.owner,
    repo: target.repo,
    pull_number: target.pull_number,
    sha: target.sha,
    merge_method: target.merge_method,
  });
}

export async function listOpenPullRequests(
  octokit: GitHubClient,
  target: RepoRef,
): Promise<{ number: number; title: string; body: string; headRef: string }[]> {
  const pulls = await octokit.paginate(octokit.rest.pulls.list, {
    owner: target.owner,
    repo: target.repo,
    state: "open",
    per_page: 100,
  });
  return pulls.map((pull) => ({
    number: pull.number,
    title: pull.title,
    body: pull.body ?? "",
    headRef: pull.head.ref,
  }));
}

export async function getRepositoryMergeMethods(
  octokit: GitHubClient,
  target: RepoRef,
): Promise<"merge" | "squash" | "rebase"> {
  const { data } = await octokit.rest.repos.get({
    owner: target.owner,
    repo: target.repo,
  });
  if (data.allow_squash_merge !== false) {
    return "squash";
  }
  if (data.allow_merge_commit !== false) {
    return "merge";
  }
  return "rebase";
}
