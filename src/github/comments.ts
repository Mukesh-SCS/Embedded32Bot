import type { Context } from "probot";

export async function createIssueComment(
  context: Pick<Context, "octokit" | "issue">,
  body: string,
): Promise<void> {
  await context.octokit.rest.issues.createComment(context.issue({ body }));
}
