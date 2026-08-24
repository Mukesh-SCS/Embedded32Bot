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
    "    Show current PR status without changing labels or the status comment.",
    "",
    `${BOT_MENTION} recheck`,
    "    Recompute classification, CI, reviews, labels, and the status comment.",
    "",
    `${BOT_MENTION} label status:blocked`,
    "    Add or remove the human-controlled `status: blocked` label. Maintainers only.",
    "    Classification labels are owned by automatic refresh and cannot be overridden here.",
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
