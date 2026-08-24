import type { GitHubClient, RepoRef } from "../github/client.js";
import { addIssueLabels, listIssueLabels, removeIssueLabel } from "../github/labels.js";
import { isHumanControlledLabel, parseLabelArgument, STRUCTURED_LABELS } from "../policy/labels.js";

export async function runLabelCommand(
  octokit: GitHubClient,
  target: RepoRef & { issue_number: number },
  args: string[],
): Promise<string> {
  const parsed = parseLabelArgument(args.join(" "));
  if (!parsed) {
    return [
      "Unknown or missing label.",
      "Manual labels are limited to human-controlled labels such as `status: blocked`.",
      `Known taxonomy labels: ${STRUCTURED_LABELS.join(", ")}`,
    ].join("\n");
  }

  if (!isHumanControlledLabel(parsed.label)) {
    return [
      `\`${parsed.label}\` is owned by automatic classification.`,
      "The `label` command can only add or remove human-controlled labels such as `status: blocked`.",
      "Use `@embedded32bot recheck` to refresh classification and workflow status labels.",
    ].join("\n");
  }

  const current = await listIssueLabels(octokit, target);
  if (parsed.action === "add") {
    if (current.includes(parsed.label)) {
      return `\`${parsed.label}\` is already present.`;
    }
    await addIssueLabels(octokit, {
      owner: target.owner,
      repo: target.repo,
      issue_number: target.issue_number,
      labels: [parsed.label],
    });
    return `Added \`${parsed.label}\`.`;
  }

  if (!current.includes(parsed.label)) {
    return `\`${parsed.label}\` is not present.`;
  }
  await removeIssueLabel(octokit, {
    owner: target.owner,
    repo: target.repo,
    issue_number: target.issue_number,
    name: parsed.label,
  });
  return `Removed \`${parsed.label}\`.`;
}
