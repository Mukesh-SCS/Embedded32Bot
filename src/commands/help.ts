import { BOT_MENTION } from "../config.js";
import type { ParsedCommand } from "./parse.js";

export const HELP_COMMAND = "help";

export function isHelpCommand(command: ParsedCommand): boolean {
  return command.name === HELP_COMMAND && command.args.length === 0;
}

export function renderHelp(): string {
  return [
    "Embedded32Bot commands",
    "",
    `${BOT_MENTION} help`,
    "    Show available commands.",
    "",
    `${BOT_MENTION} status`,
    "    Show current PR status.",
    "",
    `${BOT_MENTION} recheck`,
    "    Recompute PR classification and readiness.",
    "",
    `${BOT_MENTION} label <label>`,
    "    Add or remove an approved label. Maintainers only.",
    "",
    `${BOT_MENTION} rerun-ci`,
    "    Re-run failed CI. Maintainers only.",
    "",
    `${BOT_MENTION} merge`,
    "    Merge when all policy gates pass. Maintainers only.",
    "",
    `${BOT_MENTION} revert`,
    "    Create a revert PR for a merged change. Maintainers only.",
  ].join("\n");
}
