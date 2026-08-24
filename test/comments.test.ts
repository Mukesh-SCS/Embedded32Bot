import nock from "nock";
import { Probot, ProbotOctokit } from "probot";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { renderHelp } from "../src/commands/help.js";
import { TARGET_OWNER, TARGET_REPOSITORY } from "../src/config.js";
import app from "../src/index.js";
import { issueCommentCreated, issueCommentEvent } from "./fixtures/issue-comment.js";

describe("issue_comment help command", () => {
  let probot: Probot;

  beforeEach(async () => {
    nock.disableNetConnect();
    probot = new Probot({
      githubToken: "test",
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
    });
    await probot.load(app);
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

    expect(github.pendingMocks()).toEqual([]);
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

  test("does not comment for an unimplemented command", async () => {
    await probot.receive(
      issueCommentEvent(
        "test-merge-command",
        issueCommentCreated({ body: "@embedded32bot merge" }),
      ),
    );
  });

  test("does not comment on a non-pull-request issue", async () => {
    await probot.receive(
      issueCommentEvent("test-issue", issueCommentCreated({ isPullRequest: false })),
    );
  });

  test("does not comment when the sender is a bot", async () => {
    await probot.receive(issueCommentEvent("test-bot", issueCommentCreated({ senderType: "Bot" })));
  });
});
