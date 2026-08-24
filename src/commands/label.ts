import type { GitHubClient, RepoRef } from "../github/client.js";
import { addIssueLabels, listIssueLabels, removeIssueLabel } from "../github/labels.js";
import { parseLabelArgument } from "../policy/labels.js";
import { STRUCTURED_LABELS } from "../policy/labels.js";

export async function runLabelCommand(
  octokit: GitHubClient,
  target: RepoRef & { issue_number: number },
  args: string[],
): Promise<string> {
  const parsed = parseLabelArgument(args.join(" "));
  if (!parsed) {
    return [
      "Unknown or missing label.",
      "Use an approved taxonomy label such as `area: j1939` or `-area: j1939`.",
      `Allowed labels: ${STRUCTURED_LABELS.join(", ")}`,
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
