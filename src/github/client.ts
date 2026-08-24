import type { Context } from "probot";

export type GitHubClient = Context["octokit"];

export type RepoRef = {
  owner: string;
  repo: string;
};
