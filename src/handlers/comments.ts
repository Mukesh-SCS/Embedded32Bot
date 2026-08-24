import type { Probot } from "probot";
import { isHelpCommand, renderHelp } from "../commands/help.js";
import { parseCommand } from "../commands/parse.js";
import { TARGET_OWNER, TARGET_REPOSITORY } from "../config.js";
import { createIssueComment } from "../github/comments.js";

export function registerCommentHandlers(app: Probot): void {
  app.on("issue_comment.created", async (context) => {
    if (context.isBot) {
      return;
    }

    const { issue, repository } = context.payload;
    if (!issue.pull_request) {
      return;
    }

    if (repository.owner.login !== TARGET_OWNER || repository.name !== TARGET_REPOSITORY) {
      return;
    }

    const command = parseCommand(context.payload.comment.body);
    if (!command || !isHelpCommand(command)) {
      return;
    }

    await createIssueComment(context, renderHelp());
  });
}
