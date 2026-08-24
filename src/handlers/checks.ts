import type { Probot } from "probot";
import { TARGET_OWNER, TARGET_REPOSITORY } from "../config.js";
import { githubErrorFields } from "../github/errors.js";
import { listPullsForCommit } from "../github/pull-requests.js";
import { refreshPullRequest } from "../services/pr-analysis.js";

export function registerCheckHandlers(app: Probot): void {
  app.on(["check_run.completed", "check_run.rerequested", "check_run.created"], async (context) => {
    await refreshFromSha(
      context,
      context.payload.check_run.head_sha,
      context.payload.check_run.pull_requests,
    );
  });

  app.on(
    ["check_suite.completed", "check_suite.requested", "check_suite.rerequested"],
    async (context) => {
      await refreshFromSha(
        context,
        context.payload.check_suite.head_sha,
        context.payload.check_suite.pull_requests,
      );
    },
  );
}

async function refreshFromSha(
  context: {
    octokit: Parameters<typeof refreshPullRequest>[0];
    log: { error: (fields: object, message: string) => void };
    id: string;
    name: string;
    payload: { repository: { owner: { login: string }; name: string } };
  },
  sha: string,
  payloadPulls: readonly { number: number }[],
): Promise<void> {
  const { repository } = context.payload;
  if (repository.owner.login !== TARGET_OWNER || repository.name !== TARGET_REPOSITORY) {
    return;
  }

  const numbers =
    payloadPulls.length > 0
      ? payloadPulls.map((pull) => pull.number)
      : await listPullsForCommit(context.octokit, {
          owner: TARGET_OWNER,
          repo: TARGET_REPOSITORY,
          commit_sha: sha,
        });

  for (const pull_number of numbers) {
    try {
      await refreshPullRequest(context.octokit, {
        owner: TARGET_OWNER,
        repo: TARGET_REPOSITORY,
        pull_number,
      });
    } catch (error) {
      const fields = githubErrorFields(error);
      context.log.error(
        {
          event: context.name,
          delivery_id: context.id,
          repository: `${TARGET_OWNER}/${TARGET_REPOSITORY}`,
          pr_number: pull_number,
          github_status: fields.github_status,
          github_request_id: fields.github_request_id,
          err: fields.message,
        },
        "Failed to refresh pull request after check update",
      );
    }
  }
}
