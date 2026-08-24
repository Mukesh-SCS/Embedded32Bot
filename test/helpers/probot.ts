import { Probot, ProbotOctokit } from "probot";
import app from "../../src/index.js";

export async function createTestProbot(): Promise<Probot> {
  const probot = new Probot({
    githubToken: "test",
    request: { retries: 0 },
    Octokit: ProbotOctokit.defaults({
      retry: { enabled: false, retries: 0 },
      throttle: {
        enabled: false,
        onRateLimit: () => false,
        onSecondaryRateLimit: () => false,
      },
    }),
  });
  await probot.load(app);
  return probot;
}
