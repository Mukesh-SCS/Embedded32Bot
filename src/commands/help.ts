import { BOT_MENTION } from "../config.js";
import type { ParsedCommand } from "./parse.js";

export const HELP_COMMAND = "help";

export function isHelpCommand(command: ParsedCommand): boolean {
  return command.name === HELP_COMMAND && command.args.length === 0;
}

export function renderHelp(): string {
  return ["Embedded32Bot commands", "", `${BOT_MENTION} help`, "    Show available commands."].join(
    "\n",
  );
}
