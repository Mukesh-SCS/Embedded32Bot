import { BOT_LOGIN } from "../config.js";
import { permissionAtLeast, type PermissionLevel } from "../policy/authorization.js";
import type { GitHubClient, RepoRef } from "./client.js";
import { stopWhenShortPage } from "./paginate.js";

export type PullReview = {
  userLogin: string;
  state: string;
  commitId: string;
};

export type ReviewerPermission = PermissionLevel | "none";

export type ReviewSummary = {
  humanApprovals: number;
  trustedApprovals: number;
  untrustedApprovals: number;
  changesRequested: boolean;
  staleApprovals: boolean;
  latestHumanState: string | undefined;
};

export async function listPullReviews(
  octokit: GitHubClient,
  target: RepoRef & { pull_number: number },
): Promise<PullReview[]> {
  const reviews = await octokit.paginate(
    octokit.rest.pulls.listReviews,
    {
      owner: target.owner,
      repo: target.repo,
      pull_number: target.pull_number,
      per_page: 100,
    },
    stopWhenShortPage(),
  );
  return reviews.map((review) => ({
    userLogin: review.user?.login ?? "",
    state: review.state,
    commitId: review.commit_id ?? "",
  }));
}

export function isTrustedReviewPermission(permission: ReviewerPermission): boolean {
  return permissionAtLeast(permission, "write");
}

export function summarizeReviews(
  reviews: readonly PullReview[],
  headSha: string,
  permissions: ReadonlyMap<string, ReviewerPermission> = new Map(),
): ReviewSummary {
  const latest = new Map<string, PullReview>();
  for (const review of reviews) {
    if (!review.userLogin || isBotLogin(review.userLogin) || review.state === "COMMENTED") {
      continue;
    }
    latest.set(review.userLogin, review);
  }

  let humanApprovals = 0;
  let trustedApprovals = 0;
  let untrustedApprovals = 0;
  let changesRequested = false;
  let staleApprovals = false;
  let latestHumanState: string | undefined;

  for (const review of latest.values()) {
    latestHumanState = review.state;
    const permission = permissions.get(review.userLogin) ?? "none";
    const trusted = isTrustedReviewPermission(permission);

    if (review.state === "CHANGES_REQUESTED" && trusted) {
      changesRequested = true;
    }
    if (review.state !== "APPROVED") {
      continue;
    }
    if (review.commitId !== headSha) {
      if (trusted) {
        staleApprovals = true;
      }
      continue;
    }
    humanApprovals += 1;
    if (trusted) {
      trustedApprovals += 1;
    } else {
      untrustedApprovals += 1;
    }
  }

  return {
    humanApprovals,
    trustedApprovals,
    untrustedApprovals,
    changesRequested,
    staleApprovals,
    latestHumanState,
  };
}

export function isBotLogin(login: string): boolean {
  return login.endsWith("[bot]") || login.toLowerCase() === BOT_LOGIN;
}
