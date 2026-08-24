import type { Probot } from "probot";
import { handleIssueComment } from "../commands/dispatch.js";

export function registerCommentHandlers(app: Probot): void {
  app.on("issue_comment.created", async (context) => {
    await handleIssueComment(context);
  });
}
