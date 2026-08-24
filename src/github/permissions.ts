import { githubErrorFields } from "./errors.js";
import type { GitHubClient, RepoRef } from "./client.js";
import { normalizePermission, type PermissionLevel } from "../policy/authorization.js";

export async function getCollaboratorPermission(
  octokit: GitHubClient,
  target: RepoRef & { username: string },
): Promise<PermissionLevel | "none"> {
  try {
    const { data } = await octokit.rest.repos.getCollaboratorPermissionLevel({
      owner: target.owner,
      repo: target.repo,
      username: target.username,
    });
    return normalizePermission(data.permission);
  } catch (error) {
    const fields = githubErrorFields(error);
    if (fields.github_status === 404) {
      return "none";
    }
    throw error;
  }
}
