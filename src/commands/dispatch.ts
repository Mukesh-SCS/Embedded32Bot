import type { Context } from "probot";
import { TARGET_OWNER, TARGET_REPOSITORY } from "../config.js";
import { createIssueComment } from "../github/comments.js";
import { denialForGitHubStatus, githubErrorFields } from "../github/errors.js";
import { getCollaboratorPermission } from "../github/permissions.js";
import { authorizeCommand, type CommandName } from "../policy/authorization.js";
import { isHelpCommand, renderHelp } from "./help.js";
import { runLabelCommand } from "./label.js";
import { runMergeCommand } from "./merge.js";
import { parseCommand } from "./parse.js";
import { runRecheckCommand } from "./recheck.js";
import { runRerunCiCommand } from "./rerun-ci.js";
import { runRevertCommand } from "./revert.js";
import { runStatusCommand } from "./status.js";

const KNOWN_COMMANDS = new Set<CommandName>([
  "help",
  "status",
  "recheck",
  "label",
  "rerun-ci",
  "merge",
  "revert",
]);

export async function handleIssueComment(context: Context<"issue_comment.created">): Promise<void> {
  if (context.isBot) {
    return;
  }

  const { issue, repository, comment } = context.payload;
  if (!issue.pull_request) {
    return;
  }
  if (repository.owner.login !== TARGET_OWNER || repository.name !== TARGET_REPOSITORY) {
    return;
  }

  const callerLogin = context.payload.comment.user?.login;
  if (!callerLogin) {
    return;
  }

  const parsed = parseCommand(comment.body);
  if (!parsed) {
    return;
  }

  const target = {
    owner: TARGET_OWNER,
    repo: TARGET_REPOSITORY,
    pull_number: issue.number,
    issue_number: issue.number,
  };

  try {
    const reply = await executeCommand(context, parsed, target, callerLogin);
    if (reply) {
      await createIssueComment(context.octokit, {
        owner: target.owner,
        repo: target.repo,
        issue_number: target.issue_number,
        body: reply,
      });
    }
  } catch (error) {
    const fields = githubErrorFields(error);
    context.log.error(
      {
        event: "issue_comment",
        delivery_id: context.id,
        repository: `${TARGET_OWNER}/${TARGET_REPOSITORY}`,
        pr_number: issue.number,
        command: parsed.name,
        github_status: fields.github_status,
        github_request_id: fields.github_request_id,
        err: fields.message,
      },
      "Command failed",
    );
    await createIssueComment(context.octokit, {
      owner: target.owner,
      repo: target.repo,
      issue_number: target.issue_number,
      body: denialForGitHubStatus(fields.github_status, `\`${parsed.name}\``),
    });
  }
}

async function executeCommand(
  context: Context<"issue_comment.created">,
  parsed: { name: string; args: string[] },
  target: { owner: string; repo: string; pull_number: number; issue_number: number },
  callerLogin: string,
): Promise<string | undefined> {
  if (!KNOWN_COMMANDS.has(parsed.name as CommandName)) {
    return `Unknown command \`${parsed.name}\`.\n\n${renderHelp()}`;
  }

  const command = parsed.name as CommandName;
  if (command !== "help" && parsed.name !== "label" && parsed.args.length > 0) {
    return `Unexpected arguments for \`${command}\`.\n\n${renderHelp()}`;
  }
  if (command === "help") {
    return isHelpCommand(parsed) ? renderHelp() : `Unexpected arguments for \`help\`.\n\n${renderHelp()}`;
  }

  const permission = await getCollaboratorPermission(context.octokit, {
    owner: target.owner,
    repo: target.repo,
    username: callerLogin,
  });
  const authorLogin = context.payload.issue.user?.login ?? "";
  const auth = authorizeCommand({
    command,
    permission,
    callerLogin,
    authorLogin,
  });
  if (!auth.allowed) {
    return auth.reason;
  }

  switch (command) {
    case "status":
      return runStatusCommand(context.octokit, target);
    case "recheck":
      return runRecheckCommand(context.octokit, target);
    case "label":
      return runLabelCommand(context.octokit, target, parsed.args);
    case "rerun-ci":
      return runRerunCiCommand(context.octokit, target);
    case "merge":
      return runMergeCommand(context.octokit, target);
    case "revert":
      return runRevertCommand(context.octokit, target);
    default:
      return renderHelp();
  }
}
