import type { Probot } from "probot";
import { TARGET_OWNER, TARGET_REPOSITORY } from "../../src/config.js";

type ReceivedEvent = Parameters<Probot["receive"]>[0];

export type IssueCommentFixture = {
  action: "created";
  issue: {
    number: number;
    pull_request?: {
      url: string;
    };
  };
  comment: {
    id: number;
    body: string;
    user: {
      login: string;
      type: "User" | "Bot";
    };
  };
  repository: {
    name: string;
    owner: {
      login: string;
    };
  };
  sender: {
    login: string;
    type: "User" | "Bot";
  };
  installation: {
    id: number;
  };
};

type IssueCommentOverrides = {
  body?: string;
  isPullRequest?: boolean;
  senderType?: "User" | "Bot";
  owner?: string;
  repo?: string;
  issueNumber?: number;
};

export function issueCommentCreated(overrides: IssueCommentOverrides = {}): IssueCommentFixture {
  const senderType = overrides.senderType ?? "User";
  const issueNumber = overrides.issueNumber ?? 42;
  const owner = overrides.owner ?? TARGET_OWNER;
  const repo = overrides.repo ?? TARGET_REPOSITORY;
  const issue: IssueCommentFixture["issue"] = {
    number: issueNumber,
  };

  if (overrides.isPullRequest !== false) {
    issue.pull_request = {
      url: `https://api.github.com/repos/${owner}/${repo}/pulls/${issueNumber}`,
    };
  }

  return {
    action: "created",
    issue,
    comment: {
      id: 1001,
      body: overrides.body ?? "@embedded32bot help",
      user: {
        login: "contributor",
        type: senderType,
      },
    },
    repository: {
      name: repo,
      owner: {
        login: owner,
      },
    },
    sender: {
      login: "contributor",
      type: senderType,
    },
    installation: {
      id: 1,
    },
  };
}

export function issueCommentEvent(id: string, payload: IssueCommentFixture): ReceivedEvent {
  // Official webhook types require many unused GitHub fields. Tests keep fixtures small.
  return {
    id,
    name: "issue_comment",
    payload,
  } as ReceivedEvent;
}
