import nock from "nock";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { TARGET_OWNER, TARGET_REPOSITORY } from "../src/config.js";
import { nockAnalysis, pullPayload } from "./helpers/github.js";
import { createTestProbot } from "./helpers/probot.js";
import type { Probot } from "probot";

function pullRequestEvent(action: string) {
  const pull = pullPayload();
  return {
    id: `pr-${action}`,
    name: "pull_request" as const,
    payload: {
      action,
      number: pull.number,
      pull_request: pull,
      repository: {
        name: TARGET_REPOSITORY,
        owner: { login: TARGET_OWNER },
      },
      sender: { login: "contributor", type: "User" },
      installation: { id: 1 },
    },
  };
}

describe("pull_request automation", () => {
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

  test("classifies an opened pull request, adds bot labels, and creates one status comment", async () => {
    nockAnalysis();
    const labels = nock("https://api.github.com")
      .post(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/issues/42/labels`)
      .reply(200, []);
    const comments = nock("https://api.github.com")
      .post(`/repos/${TARGET_OWNER}/${TARGET_REPOSITORY}/issues/42/comments`)
      .reply(201, { id: 1, body: "status", user: { login: "embedded32bot[bot]" } });

    await probot.receive(pullRequestEvent("opened") as never);

    expect(labels.isDone()).toBe(true);
    expect(comments.isDone()).toBe(true);
  });
});
