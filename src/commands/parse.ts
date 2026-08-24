import { BOT_NAME } from "../config.js";

export type ParsedCommand = {
  name: string;
  args: string[];
};

const COMMAND_PATTERN = new RegExp(`^@${BOT_NAME}(?:\\[bot\\])?\\s+(\\S+)(?:\\s+(.+))?$`, "i");

export function parseCommand(commentBody: string): ParsedCommand | undefined {
  const normalized = commentBody.replace(/\r\n/g, "\n").trim();
  if (normalized.length === 0 || normalized.includes("\n")) {
    return undefined;
  }

  const match = COMMAND_PATTERN.exec(normalized);
  if (!match) {
    return undefined;
  }

  const name = match[1]?.toLowerCase();
  if (!name) {
    return undefined;
  }

  const args = match[2]?.trim().split(/\s+/).filter(Boolean) ?? [];
  return { name, args };
}
