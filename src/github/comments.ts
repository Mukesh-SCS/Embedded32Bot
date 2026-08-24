import { BOT_LOGIN, STATUS_COMMENT_MARKER } from "../config.js";
import type { GitHubClient, RepoRef } from "./client.js";

export type IssueComment = {
  id: number;
  body: string;
  userLogin: string;
};

export async function createIssueComment(
  octokit: GitHubClient,
  target: RepoRef & { issue_number: number; body: string },
): Promise<IssueComment> {
  const { data } = await octokit.rest.issues.createComment({
    owner: target.owner,
    repo: target.repo,
    issue_number: target.issue_number,
    body: target.body,
  });
  return {
    id: data.id,
    body: data.body ?? "",
    userLogin: data.user?.login ?? "",
  };
}

export async function updateIssueComment(
  octokit: GitHubClient,
  target: RepoRef & { comment_id: number; body: string },
): Promise<void> {
  await octokit.rest.issues.updateComment({
    owner: target.owner,
    repo: target.repo,
    comment_id: target.comment_id,
    body: target.body,
  });
}

export async function listIssueComments(
  octokit: GitHubClient,
  target: RepoRef & { issue_number: number },
): Promise<IssueComment[]> {
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner: target.owner,
    repo: target.repo,
    issue_number: target.issue_number,
    per_page: 100,
  });
  return comments.map((comment) => ({
    id: comment.id,
    body: comment.body ?? "",
    userLogin: comment.user?.login ?? "",
  }));
}

export function findStatusComment(comments: readonly IssueComment[]): IssueComment | undefined {
  return comments.find(
    (comment) =>
      comment.body.includes(STATUS_COMMENT_MARKER) && comment.userLogin.toLowerCase() === BOT_LOGIN,
  );
}
