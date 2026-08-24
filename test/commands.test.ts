import { describe, expect, test } from "vitest";
import { HELP_COMMAND, isHelpCommand, renderHelp } from "../src/commands/help.js";
import { parseCommand } from "../src/commands/parse.js";

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

  test("parses label arguments", () => {
    expect(parseCommand("@embedded32bot label area:j1939")).toEqual({
      name: "label",
      args: ["area:j1939"],
    });
    expect(parseCommand("@embedded32bot label -area:j1939")).toEqual({
      name: "label",
      args: ["-area:j1939"],
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

  test("renderHelp lists implemented commands", () => {
    const body = renderHelp();
    expect(body).toContain("@embedded32bot help");
    expect(body).toContain("@embedded32bot status");
    expect(body).toContain("@embedded32bot recheck");
    expect(body).toContain("@embedded32bot label");
    expect(body).toContain("@embedded32bot rerun-ci");
    expect(body).toContain("@embedded32bot merge");
    expect(body).toContain("@embedded32bot revert");
    expect(body).not.toMatch(/@embedded32bot approve/i);
  });
});
