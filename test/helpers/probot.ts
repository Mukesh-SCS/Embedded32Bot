import { Probot, ProbotOctokit } from "probot";
import app from "../../src/index.js";

export async function createTestProbot(): Promise<Probot> {
  const probot = new Probot({
    githubToken: "test",
    Octokit: ProbotOctokit.defaults({
      retry: { enabled: false },
      throttle: { enabled: false },
    }),
  });
  await probot.load(app);
  return probot;
}
