import type { CheckSummary } from "./merge.js";

/**
 * Job names from the current Mukesh-SCS/Embedded32 workflows:
 * - .github/workflows/ci.yml
 * - .github/workflows/codeql.yml
 * - .github/workflows/dependency-review.yml
 *
 * The repository ruleset `mainmerge` does not currently list required
 * status checks, so the bot enforces these workflow jobs itself.
 */
export const REQUIRED_CHECK_NAMES = [
  "Verify (Node 20)",
  "Verify (Node 22)",
  "Verify (Windows, Node 20)",
  "Analyze JavaScript/TypeScript",
  "Review dependencies",
] as const;

export type RequiredCheckName = (typeof REQUIRED_CHECK_NAMES)[number];

export type RequiredCheckState = "passed" | "pending" | "failed" | "missing";

export type RequiredCheckResult = {
  name: RequiredCheckName;
  state: RequiredCheckState;
};

export type CheckRunInput = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
};

const FAILED_CONCLUSIONS = new Set([
  "failure",
  "cancelled",
  "timed_out",
  "action_required",
  "stale",
]);
const IGNORED_CONCLUSIONS = new Set(["skipped", "neutral"]);

export function selectLatestCheckRuns(runs: readonly CheckRunInput[]): CheckRunInput[] {
  const latest = new Map<string, CheckRunInput>();
  for (const run of runs) {
    const previous = latest.get(run.name);
    if (!previous || run.id > previous.id) {
      latest.set(run.name, run);
    }
  }
  return [...latest.values()];
}

export function classifyCheckRun(run: CheckRunInput): "passed" | "pending" | "failed" | "ignored" {
  if (run.conclusion && IGNORED_CONCLUSIONS.has(run.conclusion)) {
    return "ignored";
  }
  if (run.status !== "completed") {
    return "pending";
  }
  if (run.conclusion && FAILED_CONCLUSIONS.has(run.conclusion)) {
    return "failed";
  }
  return "passed";
}

export function evaluateChecks(runs: readonly CheckRunInput[]): CheckSummary {
  const latest = selectLatestCheckRuns(runs);
  const byName = new Map(latest.map((run) => [run.name, run]));
  const names: string[] = [];
  let passed = 0;
  let pending = 0;
  let failed = 0;
  const optionalFailed: string[] = [];

  for (const run of latest) {
    const outcome = classifyCheckRun(run);
    if (outcome === "ignored") {
      continue;
    }
    names.push(run.name);
    if (outcome === "pending") {
      pending += 1;
    } else if (outcome === "failed") {
      failed += 1;
      if (!isRequiredCheckName(run.name)) {
        optionalFailed.push(run.name);
      }
    } else {
      passed += 1;
    }
  }

  const required: RequiredCheckResult[] = REQUIRED_CHECK_NAMES.map((name) => {
    const run = byName.get(name);
    if (!run) {
      return { name, state: "missing" };
    }
    const outcome = classifyCheckRun(run);
    if (outcome === "ignored" || outcome === "pending") {
      return { name, state: "pending" };
    }
    if (outcome === "failed") {
      return { name, state: "failed" };
    }
    return { name, state: "passed" };
  });

  return { passed, pending, failed, names, required, optionalFailed };
}

export function isRequiredCheckName(name: string): name is RequiredCheckName {
  return (REQUIRED_CHECK_NAMES as readonly string[]).includes(name);
}

export function formatRequiredCheckState(state: RequiredCheckState): string {
  if (state === "passed") {
    return "PASS";
  }
  if (state === "pending") {
    return "PENDING";
  }
  if (state === "failed") {
    return "FAIL";
  }
  return "MISSING";
}
