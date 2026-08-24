import { describe, expect, test } from "vitest";
import {
  AREA_LABELS,
  COMPATIBILITY_LABELS,
  RELEASE_LABELS,
  RISK_LABELS,
  STATUS_LABELS,
  STRUCTURED_LABELS,
  TYPE_LABELS,
} from "../src/policy/labels.js";

describe("label taxonomy", () => {
  test("does not contain duplicate structured label names", () => {
    expect(new Set(STRUCTURED_LABELS).size).toBe(STRUCTURED_LABELS.length);
  });

  test("includes the expected area labels", () => {
    expect(AREA_LABELS).toEqual([
      "area: core",
      "area: can",
      "area: j1939",
      "area: ethernet",
      "area: bridge",
      "area: simulation",
      "area: supervisor",
      "area: cli",
      "area: sdk",
      "area: dashboard",
      "area: docs",
      "area: labs",
      "area: ci",
      "area: release",
    ]);
  });

  test("includes the expected type labels", () => {
    expect(TYPE_LABELS).toEqual([
      "type: bug",
      "type: feature",
      "type: docs",
      "type: test",
      "type: refactor",
      "type: dependencies",
      "type: ci",
      "type: security",
    ]);
  });

  test("includes the expected risk labels", () => {
    expect(RISK_LABELS).toEqual(["risk: low", "risk: medium", "risk: high", "risk: critical"]);
  });

  test("includes the expected status labels", () => {
    expect(STATUS_LABELS).toEqual([
      "status: needs-review",
      "status: needs-changes",
      "status: ci-failed",
      "status: blocked",
      "status: ready-to-merge",
    ]);
  });

  test("includes the expected release labels", () => {
    expect(RELEASE_LABELS).toEqual([
      "release: patch",
      "release: minor",
      "release: major",
      "release: none",
    ]);
  });

  test("includes the Dependabot compatibility label", () => {
    expect(COMPATIBILITY_LABELS).toEqual(["dependencies"]);
  });
});
