export type GitHubErrorFields = {
  github_status?: number;
  github_request_id?: string;
  message: string;
};

function headerValue(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object") {
    return undefined;
  }
  const record = headers as Record<string, unknown>;
  const value = record[name] ?? record[name.toLowerCase()];
  return typeof value === "string" ? value : undefined;
}

export function githubErrorFields(error: unknown): GitHubErrorFields {
  if (typeof error !== "object" || error === null) {
    return { message: String(error) };
  }

  const candidate = error as {
    status?: unknown;
    message?: unknown;
    response?: { headers?: unknown };
  };

  return {
    github_status: typeof candidate.status === "number" ? candidate.status : undefined,
    github_request_id: headerValue(candidate.response?.headers, "x-github-request-id"),
    message: typeof candidate.message === "string" ? candidate.message : "GitHub request failed",
  };
}

export function denialForGitHubStatus(status: number | undefined, action: string): string {
  if (status === 403) {
    return `GitHub returned 403 while trying to ${action}. The GitHub App may be missing a required permission.`;
  }
  if (status === 409) {
    return `GitHub returned 409 while trying to ${action}. This usually means a merge or revert conflict.`;
  }
  if (status === 422) {
    return `GitHub returned 422 while trying to ${action}. The pull request state may have changed.`;
  }
  return `GitHub request failed while trying to ${action}.`;
}
