import { BOT_LOGIN } from "../config.js";
import type { GitHubClient, RepoRef } from "./client.js";

export type PullReview = {
  userLogin: string;
  state: string;
  commitId: string;
};

export type ReviewSummary = {
  humanApprovals: number;
  changesRequested: boolean;
  staleApprovals: boolean;
  latestHumanState: string | undefined;
};

export async function listPullReviews(
  octokit: GitHubClient,
  target: RepoRef & { pull_number: number },
): Promise<PullReview[]> {
  const reviews = await octokit.paginate(octokit.rest.pulls.listReviews, {
    owner: target.owner,
    repo: target.repo,
    pull_number: target.pull_number,
    per_page: 100,
  });
  return reviews.map((review) => ({
    userLogin: review.user?.login ?? "",
    state: review.state,
    commitId: review.commit_id ?? "",
  }));
}

export function summarizeReviews(reviews: readonly PullReview[], headSha: string): ReviewSummary {
  const latest = new Map<string, PullReview>();
  for (const review of reviews) {
    if (!review.userLogin || isBotLogin(review.userLogin) || review.state === "COMMENTED") {
      continue;
    }
    latest.set(review.userLogin, review);
  }

  let humanApprovals = 0;
  let changesRequested = false;
  let staleApprovals = false;
  let latestHumanState: string | undefined;

  for (const review of latest.values()) {
    latestHumanState = review.state;
    if (review.state === "CHANGES_REQUESTED") {
      changesRequested = true;
    }
    if (review.state === "APPROVED") {
      if (review.commitId === headSha) {
        humanApprovals += 1;
      } else {
        staleApprovals = true;
      }
    }
  }

  return { humanApprovals, changesRequested, staleApprovals, latestHumanState };
}

export function isBotLogin(login: string): boolean {
  return login.endsWith("[bot]") || login.toLowerCase() === BOT_LOGIN;
}
