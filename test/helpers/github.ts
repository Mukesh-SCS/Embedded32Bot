import nock from "nock";
import { TARGET_OWNER, TARGET_REPOSITORY } from "../../src/config.js";
import { REQUIRED_CHECK_NAMES } from "../../src/policy/required-checks.js";

export const HEAD_SHA = "aaa111bbb222ccc333ddd444eee555fff666aaa1";

export type PullFixture = {
  number?: number;
  title?: string;
  body?: string;
  state?: string;
  draft?: boolean;
  merged?: boolean;
  mergeable?: boolean | null;
  mergeableState?: string;
  baseBranch?: string;
  headSha?: string;
  authorLogin?: string;
  authorType?: string;
  labels?: string[];
  mergeCommitSha?: string | null;
  nodeId?: string;
};

export type CheckFixture = {
  id?: number;
  name: string;
  status: string;
  conclusion: string | null;
};

export type ReviewFixture = {
  user: string;
  state: string;
  commit_id: string;
  permission?: string;
};

export function passingRequiredChecks(): CheckFixture[] {
  return REQUIRED_CHECK_NAMES.map((name, index) => ({
    id: index + 1,
    name,
    status: "completed",
    conclusion: "success",
  }));
}

export function pullPayload(overrides: PullFixture = {}) {
  const merged = overrides.merged ?? false;
  return {
    number: overrides.number ?? 42,
    node_id: overrides.nodeId ?? "PR_node_42",
    title: overrides.title ?? "docs: update labs",
    body: overrides.body ?? "## Summary\n\nUpdate docs.\n",
    state: overrides.state ?? (merged ? "closed" : "open"),
    draft: overrides.draft ?? false,
    merged,
    mergeable: overrides.mergeable ?? true,
    mergeable_state: overrides.mergeableState ?? "clean",
    base: { ref: overrides.baseBranch ?? "main" },
    head: { sha: overrides.headSha ?? HEAD_SHA, ref: "contributor/docs" },
    user: {
      login: overrides.authorLogin ?? "contributor",
      type: overrides.authorType ?? "User",
    },
    html_url: `https://github.com/${TARGET_OWNER}/${TARGET_REPOSITORY}/pull/${overrides.number ?? 42}`,
    merge_commit_sha: overrides.mergeCommitSha ?? null,
    labels: (overrides.labels ?? []).map((name) => ({ name })),
  };
}

export function nockPermission(login: string, permission: string): nock.Scope {
  return nock("https://api.github.com")
    .persist()
    .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/collaborators/${login}/permission`)
    .query(true)
    .reply(200, { permission, role_name: permission });
}

export type MutationCapture = {
  comments: string[];
  commentCreates: number;
  commentUpdates: number;
  labelAdds: number;
  labelRemoves: number;
};

export function captureMutations(): MutationCapture {
  const capture: MutationCapture = {
    comments: [],
    commentCreates: 0,
    commentUpdates: 0,
    labelAdds: 0,
    labelRemoves: 0,
  };
  nock("https://api.github.com")
    .persist()
    .post(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/issues/42/comments`)
    .reply(201, (_uri, requestBody) => {
      const body = commentBodyFrom(requestBody);
      capture.comments.push(body);
      capture.commentCreates += 1;
      return { id: 100, body, user: { login: "embedded32bot[bot]" } };
    });
  nock("https://api.github.com")
    .persist()
    .patch(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/issues/comments/77`)
    .reply(200, (_uri, requestBody) => {
      const body = commentBodyFrom(requestBody);
      capture.comments.push(body);
      capture.commentUpdates += 1;
      return { id: 77, body };
    });
  nock("https://api.github.com")
    .persist()
    .post(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/issues/42/labels`)
    .reply(200, () => {
      capture.labelAdds += 1;
      return [];
    });
  nock("https://api.github.com")
    .persist()
    .delete(new RegExp(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/issues/42/labels/.+`))
    .reply(200, () => {
      capture.labelRemoves += 1;
      return {};
    });
  return capture;
}

export function captureIssueComments(): string[] {
  return captureMutations().comments;
}

export function nockAnalysis(
  options: {
    pull?: PullFixture;
    files?: { filename: string; previous_filename?: string }[];
    checks?: CheckFixture[];
    reviews?: ReviewFixture[];
    labels?: string[];
    comments?: { id: number; body: string; login: string }[];
  } = {},
): nock.Scope {
  const pull = pullPayload(options.pull);
  const files = options.files ?? [{ filename: "docs/guide.md" }];
  const checks = options.checks ?? passingRequiredChecks();
  const reviews = options.reviews ?? [];
  const labels = options.labels ?? [];
  const comments = options.comments ?? [];
  const github = nock("https://api.github.com");
  const pageHeaders = {
    Link: "",
    "x-ratelimit-limit": "5000",
    "x-ratelimit-remaining": "4999",
    "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600),
  };

  github
    .persist()
    .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/pulls/${pull.number}`)
    .query(true)
    .reply(200, () => structuredClone(pull), pageHeaders);
  github
    .persist()
    .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/pulls/${pull.number}/files`)
    .query(true)
    .reply(200, () => structuredClone(files), pageHeaders);
  github
    .persist()
    .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/commits/${pull.head.sha}/check-runs`)
    .query(true)
    .reply(
      200,
      () => ({
        total_count: checks.length,
        check_runs: structuredClone(
          checks.map((check, index) => ({
            id: check.id ?? index + 1,
            name: check.name,
            status: check.status,
            conclusion: check.conclusion,
          })),
        ),
      }),
      pageHeaders,
    );
  github
    .persist()
    .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/pulls/${pull.number}/reviews`)
    .query(true)
    .reply(
      200,
      () =>
        reviews.map((review) => ({
          user: { login: review.user },
          state: review.state,
          commit_id: review.commit_id,
        })),
      pageHeaders,
    );
  github
    .persist()
    .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/issues/${pull.number}/labels`)
    .query(true)
    .reply(200, () => labels.map((name) => ({ name })), pageHeaders);
  github
    .persist()
    .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/issues/${pull.number}/comments`)
    .query(true)
    .reply(
      200,
      () =>
        comments.map((comment) => ({
          id: comment.id,
          body: comment.body,
          user: { login: comment.login },
        })),
      pageHeaders,
    );

  const uniqueReviewers = [...new Set(reviews.map((review) => review.user))];
  for (const user of uniqueReviewers) {
    const review = reviews.find((entry) => entry.user === user);
    const permission = review?.permission ?? "admin";
    if (permission === "none") {
      github
        .persist()
        .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/collaborators/${user}/permission`)
        .query(true)
        .reply(404, { message: "Not Found" });
    } else {
      github
        .persist()
        .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/collaborators/${user}/permission`)
        .query(true)
        .reply(200, { permission, role_name: permission });
    }
  }

  github
    .persist()
    .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}`)
    .query(true)
    .reply(
      200,
      () => ({
        allow_squash_merge: true,
        allow_merge_commit: true,
        allow_rebase_merge: true,
      }),
      pageHeaders,
    );

  return github;
}

function commentBodyFrom(requestBody: unknown): string {
  if (typeof requestBody === "string") {
    try {
      return String((JSON.parse(requestBody) as { body?: string }).body ?? "");
    } catch {
      return requestBody;
    }
  }
  if (requestBody && typeof requestBody === "object" && "body" in requestBody) {
    return String((requestBody as { body?: string }).body ?? "");
  }
  return "";
}
