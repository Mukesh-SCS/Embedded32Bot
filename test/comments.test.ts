import nock from "nock";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { renderHelp } from "../src/commands/help.js";
import { STATUS_COMMENT_MARKER, TARGET_OWNER, TARGET_REPOSITORY } from "../src/config.js";
import { issueCommentCreated, issueCommentEvent } from "./fixtures/issue-comment.js";
import { captureMutations, nockAnalysis, nockPermission } from "./helpers/github.js";
import { createTestProbot } from "./helpers/probot.js";
import type { Probot } from "probot";

describe("issue_comment commands", () => {
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

  test("replies once to @embedded32bot help on a pull request", async () => {
    const payload = issueCommentCreated({ body: "@embedded32bot help" });
    const github = nock("https://api.github.com")
      .post(
        `/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/issues/${payload.issue.number}/comments`,
        (body: { body?: string }) => {
          expect(body.body).toBe(renderHelp());
          return true;
        },
      )
      .reply(201, { id: 1 });

    await probot.receive(issueCommentEvent("test-help", payload));
    expect(github.isDone()).toBe(true);
  });

  test("does not comment when the mention appears in prose", async () => {
    await probot.receive(
      issueCommentEvent(
        "test-prose",
        issueCommentCreated({
          body: "I think @embedded32bot help documentation should be improved.",
        }),
      ),
    );
  });

  test("replies to unknown commands", async () => {
    const github = nock("https://api.github.com")
      .post(
        `/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/issues/42/comments`,
        (body: { body?: string }) => {
          expect(body.body).toContain("Unknown command `frobnicate`");
          return true;
        },
      )
      .reply(201, { id: 2 });

    await probot.receive(
      issueCommentEvent("test-unknown", issueCommentCreated({ body: "@embedded32bot frobnicate" })),
    );
    expect(github.isDone()).toBe(true);
  });

  test("rejects unauthorized merge without calling the merge API", async () => {
    nockPermission("contributor", "read");
    const github = nock("https://api.github.com")
      .post(
        `/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/issues/42/comments`,
        (body: { body?: string }) => {
          expect(body.body).toContain("requires maintain or admin");
          return true;
        },
      )
      .reply(201, { id: 3 });

    await probot.receive(
      issueCommentEvent("test-merge-denied", issueCommentCreated({ body: "@embedded32bot merge" })),
    );
    expect(github.isDone()).toBe(true);
  });

  test("does not comment on a non-pull-request issue", async () => {
    await probot.receive(
      issueCommentEvent("test-issue", issueCommentCreated({ isPullRequest: false })),
    );
  });

  test("does not comment when the sender is a bot", async () => {
    await probot.receive(issueCommentEvent("test-bot", issueCommentCreated({ senderType: "Bot" })));
  });

  test("status replies with a snapshot without mutating labels or the status comment", async () => {
    nockPermission("contributor", "write");
    nockAnalysis();
    const mutations = captureMutations();

    await probot.receive(
      issueCommentEvent("test-status", issueCommentCreated({ body: "@embedded32bot status" })),
    );
    expect(mutations.comments.some((body) => body.includes("Embedded32Bot status"))).toBe(true);
    expect(mutations.comments.some((body) => body.includes(STATUS_COMMENT_MARKER))).toBe(false);
    expect(mutations.labelAdds).toBe(0);
    expect(mutations.labelRemoves).toBe(0);
    expect(mutations.commentUpdates).toBe(0);
    expect(mutations.commentCreates).toBe(1);
  });

  test("recheck synchronizes labels and the persistent status comment", async () => {
    nockPermission("contributor", "write");
    nockAnalysis();
    const mutations = captureMutations();

    await probot.receive(
      issueCommentEvent("test-recheck", issueCommentCreated({ body: "@embedded32bot recheck" })),
    );
    expect(mutations.labelAdds).toBeGreaterThan(0);
    expect(mutations.comments.some((body) => body.includes(STATUS_COMMENT_MARKER))).toBe(true);
  });
});
