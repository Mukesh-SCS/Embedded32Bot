import { BOT_MENTION, STATUS_COMMENT_MARKER } from "../config.js";
import {
  createIssueComment,
  findStatusComment,
  listIssueComments,
  updateIssueComment,
} from "../github/comments.js";
import type { GitHubClient, RepoRef } from "../github/client.js";
import { listCheckRuns, summarizeChecks } from "../github/checks.js";
import { addIssueLabels, listIssueLabels, removeIssueLabel } from "../github/labels.js";
import { getCollaboratorPermission } from "../github/permissions.js";
import { getPullRequest, listPullRequestFiles } from "../github/pull-requests.js";
import {
  isBotLogin,
  listPullReviews,
  summarizeReviews,
  type ReviewerPermission,
} from "../github/reviews.js";
import {
  classifyPullRequest,
  isDependabot,
  type Classification,
} from "../policy/classification.js";
import { diffBotLabels, statusLabelForState } from "../policy/label-sync.js";
import { isBotManagedLabel, riskLabel, type StructuredLabel } from "../policy/labels.js";
import { evaluateMerge, type CheckSummary, type MergeDecision } from "../policy/merge.js";
import { formatRequiredCheckState } from "../policy/required-checks.js";
import { validatePrTemplate, type TemplateSectionResult } from "../policy/pr-template.js";

export type PullAnalysis = {
  pull: Awaited<ReturnType<typeof getPullRequest>>;
  classification: Classification;
  template: TemplateSectionResult[];
  checks: CheckSummary;
  reviews: ReturnType<typeof summarizeReviews>;
  mergeDecision: MergeDecision;
  labels: string[];
};

export async function analyzePullRequest(
  octokit: GitHubClient,
  target: RepoRef & { pull_number: number },
): Promise<PullAnalysis> {
  const pull = await getPullRequest(octokit, target);
  const files = await listPullRequestFiles(octokit, target);
  const classification = classifyPullRequest(files, {
    title: pull.title,
    body: pull.body,
    authorLogin: pull.authorLogin,
    authorType: pull.authorType,
  });
  const template = validatePrTemplate(pull.body);
  const checkRuns = pull.merged
    ? []
    : await listCheckRuns(octokit, {
        owner: target.owner,
        repo: target.repo,
        ref: pull.headSha,
      });
  const checks = summarizeChecks(checkRuns);
  const pullReviews = await listPullReviews(octokit, target);
  const permissions = await loadReviewerPermissions(octokit, target, pullReviews);
  const reviews = summarizeReviews(pullReviews, pull.headSha, permissions);
  const mergeDecision = evaluateMerge({
    state: pull.state,
    draft: pull.draft,
    merged: pull.merged,
    mergeable: pull.mergeable,
    mergeableState: pull.mergeableState,
    baseBranch: pull.baseBranch,
    headSha: pull.headSha,
    trustedApprovals: reviews.trustedApprovals,
    changesRequested: reviews.changesRequested,
    staleApprovals: reviews.staleApprovals,
    checks,
    labels: pull.labels,
    risk: classification.risk,
  });

  return {
    pull,
    classification,
    template,
    checks,
    reviews,
    mergeDecision,
    labels: pull.labels,
  };
}

export async function syncBotLabels(
  octokit: GitHubClient,
  target: RepoRef & { issue_number: number },
  analysis: PullAnalysis,
): Promise<string[]> {
  const current = await listIssueLabels(octokit, target);
  const currentBot = current.filter((label) => isBotManagedLabel(label));
  const human = current.filter((label) => !isBotManagedLabel(label));
  const desired = desiredBotLabels(analysis, current);
  const { add, remove } = diffBotLabels(currentBot, desired);

  if (add.length > 0) {
    await addIssueLabels(octokit, {
      owner: target.owner,
      repo: target.repo,
      issue_number: target.issue_number,
      labels: add,
    });
  }
  for (const name of remove) {
    await removeIssueLabel(octokit, {
      owner: target.owner,
      repo: target.repo,
      issue_number: target.issue_number,
      name,
    });
  }

  return [...human, ...desired].sort();
}

export async function upsertStatusComment(
  octokit: GitHubClient,
  target: RepoRef & { issue_number: number },
  analysis: PullAnalysis,
): Promise<"created" | "updated"> {
  const comments = await listIssueComments(octokit, target);
  const existing = findStatusComment(comments);
  const body = renderStatusComment(analysis);
  if (existing) {
    if (existing.body === body) {
      return "updated";
    }
    await updateIssueComment(octokit, {
      owner: target.owner,
      repo: target.repo,
      comment_id: existing.id,
      body,
    });
    return "updated";
  }
  await createIssueComment(octokit, {
    owner: target.owner,
    repo: target.repo,
    issue_number: target.issue_number,
    body,
  });
  return "created";
}

export async function refreshPullRequest(
  octokit: GitHubClient,
  target: RepoRef & { pull_number: number },
): Promise<PullAnalysis> {
  const analysis = await analyzePullRequest(octokit, target);
  const labels = await syncBotLabels(
    octokit,
    { ...target, issue_number: target.pull_number },
    analysis,
  );
  const next = { ...analysis, labels };
  await upsertStatusComment(octokit, { ...target, issue_number: target.pull_number }, next);
  return next;
}

export function desiredBotLabels(analysis: PullAnalysis, current: readonly string[]): string[] {
  const labels = new Set<string>(analysis.classification.areas);
  if (analysis.classification.type) {
    labels.add(analysis.classification.type);
  }
  labels.add(riskLabel(analysis.classification.risk));
  if (analysis.classification.release) {
    labels.add(analysis.classification.release);
  }
  if (isDependabot(analysis.pull)) {
    labels.add("dependencies");
  }
  if (!analysis.pull.merged && analysis.pull.state === "open") {
    if (current.includes("status: blocked")) {
      labels.add("status: blocked");
    } else {
      labels.add(
        statusLabelForState({
          blocked: false,
          changesRequested: analysis.reviews.changesRequested,
          checks: analysis.checks,
          mergeDecision: analysis.mergeDecision,
        }),
      );
    }
  }
  return [...labels] as StructuredLabel[];
}

export function renderStatusComment(analysis: PullAnalysis): string {
  const { classification, checks, mergeDecision, template } = analysis;
  const missing = template.filter((section) => !section.hasContent).map((section) => section.name);
  const checkLines = renderRequiredCheckLines(checks, "- ");

  return [
    STATUS_COMMENT_MARKER,
    "## Embedded32Bot",
    "",
    "### Classification",
    `Area: ${classification.areas.map((area) => `\`${area}\``).join(", ") || "_none_"}`,
    `Type: ${classification.type ? `\`${classification.type}\`` : "_unclassified_"}`,
    `Risk: \`risk: ${classification.risk}\``,
    `Release: ${classification.release ? `\`${classification.release}\`` : "_unclassified_"}`,
    "",
    "### CI",
    ...checkLines,
    "",
    "### Review",
    ...renderReviewLines(analysis, "- "),
    "",
    "### Merge readiness",
    mergeDecision.allowed ? "Ready" : "Not ready",
    ...(mergeDecision.allowed ? [] : ["", ...mergeDecision.reasons.map((reason) => `- ${reason}`)]),
    "",
    ...(missing.length > 0
      ? ["### PR template", "Missing or incomplete:", ...missing.map((name) => `- ${name}`), ""]
      : []),
    `_Updated from ${BOT_MENTION} using current GitHub state._`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function renderStatusSnapshot(analysis: PullAnalysis): string {
  const { pull, classification, checks, mergeDecision } = analysis;
  return [
    "Embedded32Bot status",
    "",
    `PR: #${pull.number}`,
    `State: ${pull.merged ? "Merged" : pull.draft ? "Draft" : pull.state === "open" ? "Open" : pull.state}`,
    `Draft: ${pull.draft ? "Yes" : "No"}`,
    `Author: ${pull.authorLogin}`,
    "",
    "Areas:",
    ...(classification.areas.length > 0
      ? classification.areas.map((area) => `- ${area}`)
      : ["- none"]),
    "",
    "Risk:",
    `- risk: ${classification.risk}`,
    "",
    "Checks:",
    ...renderRequiredCheckLines(checks, "- "),
    "",
    "Reviews:",
    ...renderReviewLines(analysis, "- "),
    "",
    "Merge readiness:",
    mergeDecision.allowed ? "READY" : "NOT READY",
    ...(mergeDecision.allowed
      ? []
      : ["", "Reasons:", ...mergeDecision.reasons.map((reason) => `- ${reason}`)]),
  ].join("\n");
}

async function loadReviewerPermissions(
  octokit: GitHubClient,
  target: RepoRef,
  reviews: readonly { userLogin: string }[],
): Promise<Map<string, ReviewerPermission>> {
  const permissions = new Map<string, ReviewerPermission>();
  const logins = [
    ...new Set(
      reviews.map((review) => review.userLogin).filter((login) => login && !isBotLogin(login)),
    ),
  ];
  for (const username of logins) {
    permissions.set(
      username,
      await getCollaboratorPermission(octokit, {
        owner: target.owner,
        repo: target.repo,
        username,
      }),
    );
  }
  return permissions;
}

function renderRequiredCheckLines(checks: CheckSummary, prefix: string): string[] {
  if (checks.required.length === 0) {
    return [`${prefix}CI has not reported yet`];
  }
  return checks.required.map(
    (check) => `${prefix}${check.name}: ${formatRequiredCheckState(check.state)}`,
  );
}

function renderReviewLines(analysis: PullAnalysis, prefix: string): string[] {
  const lines: string[] = [];
  if (analysis.reviews.changesRequested) {
    lines.push(`${prefix}changes requested`);
  } else if (analysis.reviews.trustedApprovals > 0) {
    lines.push(`${prefix}${analysis.reviews.trustedApprovals} trusted approval(s)`);
  } else if (analysis.reviews.untrustedApprovals > 0) {
    lines.push(`${prefix}external approval does not satisfy merge policy`);
  } else {
    lines.push(`${prefix}trusted maintainer approval required`);
  }
  if (analysis.reviews.staleApprovals) {
    lines.push(`${prefix}approval is stale relative to the current head SHA`);
  }
  return lines;
}
