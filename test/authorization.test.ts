import { describe, expect, test } from "vitest";
import { authorizeCommand } from "../src/policy/authorization.js";

describe("authorization", () => {
  test("allows help and status for any caller", () => {
    expect(
      authorizeCommand({
        command: "help",
        permission: "read",
        callerLogin: "reader",
        authorLogin: "author",
      }).allowed,
    ).toBe(true);
    expect(
      authorizeCommand({
        command: "status",
        permission: "none",
        callerLogin: "reader",
        authorLogin: "author",
      }).allowed,
    ).toBe(true);
  });

  test("allows recheck for the pull request author", () => {
    expect(
      authorizeCommand({
        command: "recheck",
        permission: "read",
        callerLogin: "author",
        authorLogin: "author",
      }).allowed,
    ).toBe(true);
  });

  test("denies merge for triage", () => {
    const decision = authorizeCommand({
      command: "merge",
      permission: "triage",
      callerLogin: "triager",
      authorLogin: "author",
    });
    expect(decision.allowed).toBe(false);
  });

  test("denies merge for write but allows label", () => {
    expect(
      authorizeCommand({
        command: "merge",
        permission: "write",
        callerLogin: "writer",
        authorLogin: "author",
      }).allowed,
    ).toBe(false);
    expect(
      authorizeCommand({
        command: "label",
        permission: "write",
        callerLogin: "writer",
        authorLogin: "author",
      }).allowed,
    ).toBe(true);
  });

  test("allows merge and revert for maintain and admin", () => {
    expect(
      authorizeCommand({
        command: "merge",
        permission: "maintain",
        callerLogin: "maintainer",
        authorLogin: "author",
      }).allowed,
    ).toBe(true);
    expect(
      authorizeCommand({
        command: "revert",
        permission: "admin",
        callerLogin: "owner",
        authorLogin: "author",
      }).allowed,
    ).toBe(true);
  });

  test("denies privileged commands for read", () => {
    expect(
      authorizeCommand({
        command: "rerun-ci",
        permission: "read",
        callerLogin: "reader",
        authorLogin: "author",
      }).allowed,
    ).toBe(false);
  });
});
