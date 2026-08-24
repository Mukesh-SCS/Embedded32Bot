export const PERMISSION_LEVELS = ["read", "triage", "write", "maintain", "admin"] as const;

export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

export type CommandName = "help" | "status" | "recheck" | "label" | "rerun-ci" | "merge" | "revert";

export type AuthorizationDecision =
  | { allowed: true; permission: PermissionLevel | "none" }
  | { allowed: false; permission: PermissionLevel | "none"; reason: string };

const PRIVILEGED_WRITE: CommandName[] = ["label", "rerun-ci"];
const PRIVILEGED_MAINTAIN: CommandName[] = ["merge", "revert"];

export function normalizePermission(value: string | undefined): PermissionLevel | "none" {
  if (value && (PERMISSION_LEVELS as readonly string[]).includes(value)) {
    return value as PermissionLevel;
  }
  return "none";
}

export function permissionAtLeast(
  actual: PermissionLevel | "none",
  required: PermissionLevel,
): boolean {
  if (actual === "none") {
    return false;
  }
  return PERMISSION_LEVELS.indexOf(actual) >= PERMISSION_LEVELS.indexOf(required);
}

export function authorizeCommand(input: {
  command: CommandName;
  permission: PermissionLevel | "none";
  callerLogin: string;
  authorLogin: string;
}): AuthorizationDecision {
  const { command, permission, callerLogin, authorLogin } = input;

  if (command === "help" || command === "status") {
    return { allowed: true, permission };
  }

  if (command === "recheck") {
    if (callerLogin === authorLogin || permissionAtLeast(permission, "write")) {
      return { allowed: true, permission };
    }
    return {
      allowed: false,
      permission,
      reason: "Only the pull request author or a maintainer can run recheck.",
    };
  }

  if (PRIVILEGED_WRITE.includes(command) && !permissionAtLeast(permission, "write")) {
    return {
      allowed: false,
      permission,
      reason: `The \`${command}\` command requires write, maintain, or admin permission on Mukesh-SCS/Embedded32.`,
    };
  }

  if (PRIVILEGED_MAINTAIN.includes(command) && !permissionAtLeast(permission, "maintain")) {
    return {
      allowed: false,
      permission,
      reason: `The \`${command}\` command requires maintain or admin permission on Mukesh-SCS/Embedded32.`,
    };
  }

  return { allowed: true, permission };
}
