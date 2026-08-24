import nock from "nock";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { TARGET_OWNER, TARGET_REPOSITORY } from "../src/config.js";
import { HEAD_SHA, captureIssueComments, nockAnalysis } from "./helpers/github.js";
import { createTestProbot } from "./helpers/probot.js";
import type { Probot } from "probot";

function checkRunEvent() {
  return {
    id: "check-completed",
    name: "check_run" as const,
    payload: {
      action: "completed",
      check_run: {
        head_sha: HEAD_SHA,
        pull_requests: [{ number: 42 }],
      },
      repository: {
        name: TARGET_REPOSITORY,
        owner: { login: TARGET_OWNER },
      },
      sender: { login: "github-actions[bot]", type: "Bot" },
      installation: { id: 1 },
    },
  };
}

describe("check_run automation", () => {
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

  test("refreshes the associated pull request when a check completes", async () => {
    nockAnalysis();
    const comments = captureIssueComments();

    await probot.receive(checkRunEvent() as never);

    expect(comments.some((body) => body.includes("<!-- embedded32bot:status -->"))).toBe(true);
  });
});
