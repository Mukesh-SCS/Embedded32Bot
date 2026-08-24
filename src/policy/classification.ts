import type { AreaLabel, ReleaseLabel, TypeLabel } from "./labels.js";
import { RISK_LEVELS, type RiskLevel } from "./risk.js";

export type ChangedFile = {
  filename: string;
  previousFilename?: string;
};

export type Classification = {
  areas: AreaLabel[];
  type: TypeLabel | undefined;
  risk: RiskLevel;
  release: ReleaseLabel | undefined;
  unclassifiedPaths: string[];
};

export type ClassificationSignals = {
  title: string;
  body: string;
  authorLogin: string;
  authorType: string;
};

type AreaRule = {
  area: AreaLabel;
  test: (path: string) => boolean;
};

const AREA_RULES: AreaRule[] = [
  { area: "area: core", test: (path) => isUnder(path, "embedded32-core") },
  { area: "area: can", test: (path) => isUnder(path, "embedded32-can") },
  { area: "area: j1939", test: (path) => isUnder(path, "embedded32-j1939") },
  { area: "area: ethernet", test: (path) => isUnder(path, "embedded32-ethernet") },
  { area: "area: bridge", test: (path) => isUnder(path, "embedded32-bridge") },
  { area: "area: simulation", test: (path) => isUnder(path, "embedded32-sim") },
  { area: "area: supervisor", test: (path) => isUnder(path, "embedded32-supervisor") },
  { area: "area: cli", test: (path) => isUnder(path, "embedded32-cli") },
  { area: "area: sdk", test: (path) => /^embedded32-sdk-/.test(path) },
  { area: "area: dashboard", test: (path) => isUnder(path, "embedded32-dashboard") },
  { area: "area: docs", test: (path) => isUnder(path, "docs") },
  { area: "area: labs", test: (path) => isUnder(path, "labs") },
  {
    area: "area: release",
    test: (path) =>
      path === "CHANGELOG.md" ||
      path === ".github/workflows/release.yml" ||
      path === "scripts/release-dry-run.mjs",
  },
  {
    area: "area: ci",
    test: (path) =>
      isUnder(path, ".github") ||
      isUnder(path, "scripts") ||
      path === "package.json" ||
      path === "package-lock.json" ||
      path === "lerna.json" ||
      path === "nx.json" ||
      path === "eslint.config.js" ||
      path === "playwright.config.ts" ||
      path.startsWith("tsconfig."),
  },
];

const TITLE_TYPE_PREFIX: Record<string, TypeLabel> = {
  fix: "type: bug",
  feat: "type: feature",
  docs: "type: docs",
  test: "type: test",
  refactor: "type: refactor",
  ci: "type: ci",
  security: "type: security",
};

const TEMPLATE_TYPE_CHECKS: { label: TypeLabel; pattern: RegExp }[] = [
  { label: "type: bug", pattern: /- \[[xX]\]\s*Bug fix/i },
  { label: "type: feature", pattern: /- \[[xX]\]\s*New feature/i },
  { label: "type: docs", pattern: /- \[[xX]\]\s*Documentation/i },
  { label: "type: refactor", pattern: /- \[[xX]\]\s*Refactoring/i },
  { label: "type: ci", pattern: /- \[[xX]\]\s*Tooling \/ CI/i },
];

export function normalizeRepoPath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

export function classifyPullRequest(
  files: readonly ChangedFile[],
  signals: ClassificationSignals,
): Classification {
  const paths = uniquePaths(files);
  const areas = classifyAreas(paths);
  const unclassifiedPaths = paths.filter((path) => classifyPathAreas(path).length === 0);
  const dependabot = isDependabot(signals);
  const type = classifyType(paths, signals, dependabot);
  const risk = classifyRisk(paths, dependabot, signals.title);
  const release = classifyRelease(paths, signals, dependabot, risk);

  return { areas, type, risk, release, unclassifiedPaths };
}

export function classifyAreas(paths: readonly string[]): AreaLabel[] {
  const areas = new Set<AreaLabel>();
  for (const path of paths) {
    for (const area of classifyPathAreas(path)) {
      areas.add(area);
    }
  }
  return [...areas].sort();
}

export function classifyPathAreas(path: string): AreaLabel[] {
  const normalized = normalizeRepoPath(path);
  return AREA_RULES.filter((rule) => rule.test(normalized)).map((rule) => rule.area);
}

export function isDependabot(signals: Pick<ClassificationSignals, "authorLogin" | "authorType">): boolean {
  return signals.authorLogin === "dependabot[bot]" && signals.authorType === "Bot";
}

function classifyType(
  paths: readonly string[],
  signals: ClassificationSignals,
  dependabot: boolean,
): TypeLabel | undefined {
  if (dependabot) {
    return "type: dependencies";
  }

  const fromTemplate = TEMPLATE_TYPE_CHECKS.filter((entry) => entry.pattern.test(signals.body)).map(
    (entry) => entry.label,
  );
  if (fromTemplate.length === 1) {
    return fromTemplate[0];
  }
  if (fromTemplate.length > 1) {
    return undefined;
  }

  const titleType = typeFromTitle(signals.title);
  if (titleType) {
    return titleType;
  }

  if (paths.length > 0 && paths.every((path) => isDocsLike(path))) {
    return "type: docs";
  }
  if (paths.length > 0 && paths.every((path) => isCiPath(path))) {
    return "type: ci";
  }
  if (paths.length > 0 && paths.every((path) => isTestPath(path))) {
    return "type: test";
  }

  return undefined;
}

function classifyRisk(paths: readonly string[], dependabot: boolean, title: string): RiskLevel {
  if (dependabot) {
    if (paths.some((path) => isUnder(path, ".github/workflows"))) {
      return "high";
    }
    const bump = dependabotSemver(title);
    if (bump === "major") {
      return "high";
    }
    if (bump === "minor") {
      return "medium";
    }
    if (bump === "patch") {
      return "low";
    }
  }

  const levels = paths.map((path) => riskForPath(path));
  if (packageRoots(paths).length >= 3) {
    levels.push("high");
  }
  return highestRisk(levels);
}

function classifyRelease(
  paths: readonly string[],
  signals: ClassificationSignals,
  dependabot: boolean,
  risk: RiskLevel,
): ReleaseLabel | undefined {
  if (/- \[[xX]\]\s*Yes/.test(breakingSection(signals.body))) {
    return "release: major";
  }

  if (dependabot) {
    const bump = dependabotSemver(signals.title);
    if (bump === "major") {
      return "release: major";
    }
    if (bump === "minor") {
      return "release: minor";
    }
    if (bump === "patch") {
      return "release: patch";
    }
  }

  if (paths.length > 0 && paths.every((path) => isDocsLike(path)) && risk === "low") {
    return "release: none";
  }

  return undefined;
}

function riskForPath(path: string): RiskLevel {
  const normalized = normalizeRepoPath(path);
  if (
    normalized === ".github/workflows/release.yml" ||
    /secret|credential|private-key|\.pem$/i.test(normalized)
  ) {
    return "critical";
  }
  if (
    isUnder(normalized, ".github/workflows") ||
    normalized === "package.json" ||
    normalized === "package-lock.json" ||
    normalized === "lerna.json" ||
    normalized.includes("package.json") ||
    normalized === "scripts/release-dry-run.mjs" ||
    normalized === "SECURITY.md" ||
    isUnder(normalized, ".github")
  ) {
    return "high";
  }
  if (
    isUnder(normalized, "labs") ||
    isUnder(normalized, "examples") ||
    isUnder(normalized, "e2e")
  ) {
    return "medium";
  }
  if (isDocsLike(normalized)) {
    return "low";
  }
  return "medium";
}

function highestRisk(levels: readonly RiskLevel[]): RiskLevel {
  let highest: RiskLevel = "low";
  for (const level of levels) {
    if (RISK_LEVELS.indexOf(level) > RISK_LEVELS.indexOf(highest)) {
      highest = level;
    }
  }
  return highest;
}

function uniquePaths(files: readonly ChangedFile[]): string[] {
  const paths = new Set<string>();
  for (const file of files) {
    paths.add(normalizeRepoPath(file.filename));
    if (file.previousFilename) {
      paths.add(normalizeRepoPath(file.previousFilename));
    }
  }
  return [...paths];
}

function isUnder(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}/`);
}

function isDocsLike(path: string): boolean {
  return (
    isUnder(path, "docs") ||
    isUnder(path, "slides") ||
    isUnder(path, "evidence") ||
    path.endsWith(".md")
  );
}

function isCiPath(path: string): boolean {
  return isUnder(path, ".github") || isUnder(path, "scripts");
}

function isTestPath(path: string): boolean {
  return (
    /(^|\/)tests?\//.test(path) ||
    path.endsWith(".test.ts") ||
    path.endsWith(".spec.ts") ||
    isUnder(path, "e2e")
  );
}

function packageRoots(paths: readonly string[]): string[] {
  const roots = new Set<string>();
  for (const path of paths) {
    const match = /^(embedded32-[^/]+)/.exec(path);
    const root = match?.[1];
    if (root) {
      roots.add(root);
    }
  }
  return [...roots];
}

function typeFromTitle(title: string): TypeLabel | undefined {
  const match = /^(fix|feat|docs|test|refactor|ci|security)(?:\(.+\))?!?:/i.exec(title.trim());
  const key = match?.[1]?.toLowerCase();
  if (!key) {
    return undefined;
  }
  return TITLE_TYPE_PREFIX[key];
}

export function dependabotSemver(title: string): "major" | "minor" | "patch" | undefined {
  const match = /from\s+v?(\d+)\.(\d+)\.(\d+)\s+to\s+v?(\d+)\.(\d+)\.(\d+)/i.exec(title);
  if (!match) {
    return undefined;
  }
  const from = [Number(match[1]), Number(match[2]), Number(match[3])];
  const to = [Number(match[4]), Number(match[5]), Number(match[6])];
  if (from.some((part) => Number.isNaN(part)) || to.some((part) => Number.isNaN(part))) {
    return undefined;
  }
  if ((to[0] ?? 0) > (from[0] ?? 0)) {
    return "major";
  }
  if ((to[1] ?? 0) > (from[1] ?? 0)) {
    return "minor";
  }
  if ((to[2] ?? 0) > (from[2] ?? 0)) {
    return "patch";
  }
  return undefined;
}

function breakingSection(body: string): string {
  const match = /## Breaking changes([\s\S]*?)(?:\n## |\n*$)/i.exec(body);
  return match?.[1] ?? "";
}
