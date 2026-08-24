import nock from "nock";
import { TARGET_OWNER, TARGET_REPOSITORY } from "../../src/config.js";

export const HEAD_SHA = "aaa111bbb222ccc333ddd444eee555fff666aaa1";

export type PullFixture = {
  number?: number;
  title?: string;
  body?: string;
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

export function pullPayload(overrides: PullFixture = {}) {
  return {
    number: overrides.number ?? 42,
    node_id: overrides.nodeId ?? "PR_node_42",
    title: overrides.title ?? "docs: update labs",
    body: overrides.body ?? "## Summary\n\nUpdate docs.\n",
    state: overrides.merged ? "closed" : "open",
    draft: overrides.draft ?? false,
    merged: overrides.merged ?? false,
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
    .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/collaborators/${login}/permission`)
    .reply(200, { permission, role_name: permission });
}

export function captureIssueComments(): string[] {
  const bodies: string[] = [];
  nock("https://api.github.com")
    .persist()
    .post(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/issues/42/comments`)
    .reply(201, (_uri, requestBody) => {
      const body = commentBodyFrom(requestBody);
      bodies.push(body);
      return { id: 100, body, user: { login: "embedded32bot[bot]" } };
    });
  nock("https://api.github.com")
    .persist()
    .patch(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/issues/comments/77`)
    .reply(200, (_uri, requestBody) => {
      const body = commentBodyFrom(requestBody);
      bodies.push(body);
      return { id: 77, body };
    });
  nock("https://api.github.com")
    .persist()
    .post(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/issues/42/labels`)
    .reply(200, []);
  return bodies;
}

export function nockAnalysis(
  options: {
    pull?: PullFixture;
    files?: { filename: string; previous_filename?: string }[];
    checks?: { name: string; status: string; conclusion: string | null }[];
    reviews?: { user: string; state: string; commit_id: string }[];
    labels?: string[];
    comments?: { id: number; body: string; login: string }[];
  } = {},
): nock.Scope {
  const pull = pullPayload(options.pull);
  const files = options.files ?? [{ filename: "docs/guide.md" }];
  const checks = options.checks ?? [
    { name: "Verify (Node 22)", status: "completed", conclusion: "success" },
  ];
  const reviews = options.reviews ?? [];
  const labels = options.labels ?? [];
  const comments = options.comments ?? [];
  const github = nock("https://api.github.com");

  github
    .persist()
    .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/pulls/${pull.number}`)
    .query(true)
    .reply(200, () => structuredClone(pull));
  github
    .persist()
    .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/pulls/${pull.number}/files`)
    .query(true)
    .reply(200, () => structuredClone(files));
  github
    .persist()
    .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/commits/${pull.head.sha}/check-runs`)
    .query(true)
    .reply(200, () => ({
      total_count: checks.length,
      check_runs: structuredClone(checks),
    }));
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
    );
  github
    .persist()
    .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/issues/${pull.number}/labels`)
    .query(true)
    .reply(
      200,
      () => labels.map((name) => ({ name })),
    );
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
