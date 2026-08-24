import { describe, expect, test } from "vitest";
import { HELP_COMMAND, isHelpCommand, renderHelp } from "../src/commands/help.js";
import { parseCommand } from "../src/commands/parse.js";
import { BOT_MENTION } from "../src/config.js";

describe("parseCommand", () => {
  test("parses @embedded32bot help", () => {
    expect(parseCommand("@embedded32bot help")).toEqual({
      name: "help",
      args: [],
    });
  });

  test("allows extra whitespace between the mention and the command", () => {
    expect(parseCommand("@embedded32bot    help")).toEqual({
      name: "help",
      args: [],
    });
  });

  test("trims surrounding whitespace", () => {
    expect(parseCommand("  \n@embedded32bot help\n  ")).toEqual({
      name: "help",
      args: [],
    });
  });

  test("normalizes the bot name and command case", () => {
    expect(parseCommand("@Embedded32Bot HELP")).toEqual({
      name: "help",
      args: [],
    });
  });

  test("does not parse a mention that appears in prose", () => {
    expect(
      parseCommand("I think @embedded32bot help documentation should be improved."),
    ).toBeUndefined();
  });

  test("does not parse unrelated text", () => {
    expect(parseCommand("please merge this pull request")).toBeUndefined();
  });

  test("does not parse a mention without a command", () => {
    expect(parseCommand("@embedded32bot")).toBeUndefined();
  });

  test("does not parse a multi-line comment as a command", () => {
    expect(parseCommand("@embedded32bot help\nPlease also check CI.")).toBeUndefined();
  });

  test("parses an unimplemented command name without executing it", () => {
    expect(parseCommand("@embedded32bot merge")).toEqual({
      name: "merge",
      args: [],
    });
  });
});

describe("help command", () => {
  test("isHelpCommand accepts the help command with no arguments", () => {
    expect(isHelpCommand({ name: HELP_COMMAND, args: [] })).toBe(true);
  });

  test("isHelpCommand rejects extra arguments", () => {
    expect(isHelpCommand({ name: HELP_COMMAND, args: ["please"] })).toBe(false);
  });

  test("isHelpCommand rejects other commands", () => {
    expect(isHelpCommand({ name: "merge", args: [] })).toBe(false);
  });

  test("renderHelp lists only the supported help command", () => {
    const body = renderHelp();
    expect(body).toBe(
      ["Embedded32Bot commands", "", `${BOT_MENTION} help`, "    Show available commands."].join(
        "\n",
      ),
    );
    expect(body).not.toMatch(/\bmerge\b/i);
    expect(body).not.toMatch(/\bapprove\b/i);
    expect(body).not.toMatch(/\blabel\b/i);
    expect(body).not.toMatch(/\breview\b/i);
    expect(body).not.toMatch(/\brecheck\b/i);
  });
});
