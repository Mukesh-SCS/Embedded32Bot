import nock from "nock";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { STATUS_COMMENT_MARKER, TARGET_OWNER, TARGET_REPOSITORY } from "../src/config.js";
import { issueCommentCreated, issueCommentEvent } from "./fixtures/issue-comment.js";
import { captureIssueComments, HEAD_SHA, nockAnalysis, nockPermission } from "./helpers/github.js";
import { createTestProbot } from "./helpers/probot.js";
import type { Probot } from "probot";

describe("privileged commands", () => {
  let probot: Probot;

  beforeEach(async () => {
    nock.cleanAll();
    nock.disableNetConnect();
    probot = await createTestProbot();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test("rejects merge when CI is failed", async () => {
    nockPermission("contributor", "admin");
    nockAnalysis({
      checks: [{ name: "Verify (Node 22)", status: "completed", conclusion: "failure" }],
      reviews: [{ user: "Mukesh-SCS", state: "APPROVED", commit_id: HEAD_SHA }],
    });
    const comments = captureIssueComments();

    await probot.receive(
      issueCommentEvent("merge-failed-ci", issueCommentCreated({ body: "@embedded32bot merge" })),
    );
    expect(comments.some((body) => body.includes("DO NOT MERGE"))).toBe(true);
    expect(comments.some((body) => body.includes("required CI failed"))).toBe(true);
  });

  test("merges when gates pass", async () => {
    nockPermission("contributor", "admin");
    nockAnalysis({
      reviews: [{ user: "Mukesh-SCS", state: "APPROVED", commit_id: HEAD_SHA }],
    });
    nock("https://api.github.com")
      .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}`)
      .query(true)
      .reply(200, { allow_squash_merge: true, allow_merge_commit: true });
    const merge = nock("https://api.github.com")
      .put(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/pulls/42/merge`)
      .query(true)
      .reply(200, (_uri, requestBody) => {
        const body = typeof requestBody === "string" ? JSON.parse(requestBody) : requestBody;
        expect(body.sha).toBe(HEAD_SHA);
        return { merged: true };
      });
    const comments = captureIssueComments();

    await probot.receive(
      issueCommentEvent("merge-ok", issueCommentCreated({ body: "@embedded32bot merge" })),
    );
    expect(merge.isDone()).toBe(true);
    expect(comments.some((body) => body.includes("Merged PR #42"))).toBe(true);
  });

  test("does not merge twice", async () => {
    nockPermission("contributor", "admin");
    nockAnalysis({ pull: { merged: true, mergeCommitSha: "deadbeef" } });
    const comments = captureIssueComments();

    await probot.receive(
      issueCommentEvent("merge-again", issueCommentCreated({ body: "@embedded32bot merge" })),
    );
    expect(comments.some((body) => body.includes("already merged"))).toBe(true);
  });

  test("creates a revert PR", async () => {
    nockPermission("contributor", "admin");
    nockAnalysis({
      pull: { merged: true, mergeCommitSha: "cafebabe", title: "Fix filter" },
    });
    nock("https://api.github.com")
      .persist()
      .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/pulls`)
      .query(true)
      .reply(200, []);
    nock("https://api.github.com")
      .post("/graphql")
      .reply(200, {
        data: {
          revertPullRequest: {
            revertPullRequest: {
              number: 99,
              url: "https://github.com/Mukesh-SCS/Embedded32/pull/99",
              title: 'Revert "Fix filter" (#42)',
            },
          },
        },
      });
    const comments = captureIssueComments();

    await probot.receive(
      issueCommentEvent("revert-ok", issueCommentCreated({ body: "@embedded32bot revert" })),
    );
    expect(comments.some((body) => body.includes("Opened revert PR #99"))).toBe(true);
  });

  test("returns an existing revert PR", async () => {
    nockPermission("contributor", "admin");
    nockAnalysis({
      pull: { merged: true, mergeCommitSha: "cafebabe", title: "Fix filter" },
    });
    nock("https://api.github.com")
      .persist()
      .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/pulls`)
      .query(true)
      .reply(200, [
        {
          number: 99,
          title: 'Revert "Fix filter" (#42)',
          body: "Reverts #42.",
          head: { ref: "embedded32bot/revert-pr-42" },
        },
      ]);
    const comments = captureIssueComments();

    await probot.receive(
      issueCommentEvent("revert-dup", issueCommentCreated({ body: "@embedded32bot revert" })),
    );
    expect(comments.some((body) => body.includes("Revert PR already exists: #99"))).toBe(true);
  });

  test("updates an existing status comment instead of creating a duplicate", async () => {
    nockPermission("contributor", "write");
    nockAnalysis({
      comments: [
        {
          id: 77,
          body: `${STATUS_COMMENT_MARKER}\nold`,
          login: "embedded32bot[bot]",
        },
      ],
    });
    const comments = captureIssueComments();

    await probot.receive(
      issueCommentEvent("status-update", issueCommentCreated({ body: "@embedded32bot recheck" })),
    );
    expect(comments.filter((body) => body.includes(STATUS_COMMENT_MARKER)).length).toBe(1);
  });

  test("adds an approved label", async () => {
    nockPermission("contributor", "write");
    nockAnalysis();
    const comments = captureIssueComments();

    await probot.receive(
      issueCommentEvent(
        "label-add",
        issueCommentCreated({ body: "@embedded32bot label area:j1939" }),
      ),
    );
    expect(comments.some((body) => body.includes("Added `area: j1939`"))).toBe(true);
  });

  test("rejects an unknown label", async () => {
    nockPermission("contributor", "write");
    const comments = captureIssueComments();

    await probot.receive(
      issueCommentEvent("label-bad", issueCommentCreated({ body: "@embedded32bot label pwned" })),
    );
    expect(comments.some((body) => body.includes("Unknown or missing label"))).toBe(true);
  });

  test("reruns failed workflow jobs", async () => {
    nockPermission("contributor", "admin");
    nockAnalysis();
    nock("https://api.github.com")
      .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/actions/runs`)
      .query(true)
      .reply(200, {
        workflow_runs: [
          { id: 55, status: "completed", conclusion: "failure", html_url: "https://example.test/55" },
        ],
      });
    const rerun = nock("https://api.github.com")
      .post(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/actions/runs/55/rerun-failed-jobs`)
      .reply(201, {});
    const comments = captureIssueComments();

    await probot.receive(
      issueCommentEvent("rerun-ok", issueCommentCreated({ body: "@embedded32bot rerun-ci" })),
    );
    expect(rerun.isDone()).toBe(true);
    expect(comments.some((body) => body.includes("55"))).toBe(true);
  });

  test("reports when there is no failed CI to rerun", async () => {
    nockPermission("contributor", "admin");
    nockAnalysis();
    nock("https://api.github.com")
      .get(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/actions/runs`)
      .query(true)
      .reply(200, { workflow_runs: [] });
    const comments = captureIssueComments();

    await probot.receive(
      issueCommentEvent("rerun-none", issueCommentCreated({ body: "@embedded32bot rerun-ci" })),
    );
    expect(comments.some((body) => body.includes("No failed workflow runs"))).toBe(true);
  });
});
