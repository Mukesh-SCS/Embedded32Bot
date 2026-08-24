import type { Probot } from "probot";
import { TARGET_OWNER, TARGET_REPOSITORY } from "../config.js";
import { githubErrorFields } from "../github/errors.js";
import { refreshPullRequest } from "../services/pr-analysis.js";

const PR_EVENTS = [
  "pull_request.opened",
  "pull_request.reopened",
  "pull_request.synchronize",
  "pull_request.ready_for_review",
  "pull_request.converted_to_draft",
  "pull_request.closed",
] as const;

export function registerPullRequestHandlers(app: Probot): void {
  app.on([...PR_EVENTS], async (context) => {
    const { repository, pull_request: pull } = context.payload;
    if (repository.owner.login !== TARGET_OWNER || repository.name !== TARGET_REPOSITORY) {
      return;
    }

    try {
      await refreshPullRequest(context.octokit, {
        owner: TARGET_OWNER,
        repo: TARGET_REPOSITORY,
        pull_number: pull.number,
      });
    } catch (error) {
      const fields = githubErrorFields(error);
      context.log.error(
        {
          event: context.name,
          delivery_id: context.id,
          repository: `${TARGET_OWNER}/${TARGET_REPOSITORY}`,
          pr_number: pull.number,
          github_status: fields.github_status,
          github_request_id: fields.github_request_id,
          err: fields.message,
        },
        "Failed to refresh pull request",
      );
    }
  });
}
