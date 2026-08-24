import type { GitHubClient } from "./client.js";

type RevertPayload = {
  revertPullRequest: {
    revertPullRequest: {
      number: number;
      url: string;
      title: string;
    } | null;
  } | null;
};

export async function createRevertPullRequest(
  octokit: GitHubClient,
  input: { pullRequestId: string; title: string; body: string },
): Promise<{ number: number; url: string; title: string }> {
  const result = await octokit.graphql<RevertPayload>(
    `mutation RevertPullRequest($pullRequestId: ID!, $title: String!, $body: String!) {
      revertPullRequest(input: { pullRequestId: $pullRequestId, title: $title, body: $body, draft: false }) {
        revertPullRequest {
          number
          url
          title
        }
      }
    }`,
    input,
  );

  const revert = result.revertPullRequest?.revertPullRequest;
  if (!revert) {
    throw new Error("GitHub did not return a revert pull request.");
  }
  return revert;
}
