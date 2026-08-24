export const AREA_LABELS = [
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
] as const;

export const TYPE_LABELS = [
  "type: bug",
  "type: feature",
  "type: docs",
  "type: test",
  "type: refactor",
  "type: dependencies",
  "type: ci",
  "type: security",
] as const;

export const RISK_LABELS = ["risk: low", "risk: medium", "risk: high", "risk: critical"] as const;

export const STATUS_LABELS = [
  "status: needs-review",
  "status: needs-changes",
  "status: ci-failed",
  "status: blocked",
  "status: ready-to-merge",
] as const;

export const RELEASE_LABELS = [
  "release: patch",
  "release: minor",
  "release: major",
  "release: none",
] as const;

export const COMPATIBILITY_LABELS = ["dependencies"] as const;

export type AreaLabel = (typeof AREA_LABELS)[number];
export type TypeLabel = (typeof TYPE_LABELS)[number];
export type RiskLabel = (typeof RISK_LABELS)[number];
export type StatusLabel = (typeof STATUS_LABELS)[number];
export type ReleaseLabel = (typeof RELEASE_LABELS)[number];
export type CompatibilityLabel = (typeof COMPATIBILITY_LABELS)[number];

export type StructuredLabel =
  AreaLabel | TypeLabel | RiskLabel | StatusLabel | ReleaseLabel | CompatibilityLabel;

export const STRUCTURED_LABELS: readonly StructuredLabel[] = [
  ...AREA_LABELS,
  ...TYPE_LABELS,
  ...RISK_LABELS,
  ...STATUS_LABELS,
  ...RELEASE_LABELS,
  ...COMPATIBILITY_LABELS,
];

const BOT_MANAGED_PREFIXES = ["area:", "type:", "risk:", "status:", "release:"] as const;

export function isBotManagedLabel(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return (
    BOT_MANAGED_PREFIXES.some((prefix) => normalized.startsWith(prefix)) ||
    normalized === "dependencies"
  );
}

export function canonicalizeLabel(raw: string): StructuredLabel | undefined {
  const trimmed = raw.trim();
  if (STRUCTURED_LABELS.includes(trimmed as StructuredLabel)) {
    return trimmed as StructuredLabel;
  }

  const spaced = trimmed.replace(/^([A-Za-z]+):(\S)/, "$1: $2");
  if (STRUCTURED_LABELS.includes(spaced as StructuredLabel)) {
    return spaced as StructuredLabel;
  }

  return undefined;
}

export function parseLabelArgument(
  raw: string,
): { action: "add" | "remove"; label: StructuredLabel } | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const action = trimmed.startsWith("-") ? "remove" : "add";
  const value = trimmed.replace(/^[-+]/, "").trim();
  const label = canonicalizeLabel(value);
  if (!label) {
    return undefined;
  }

  return { action, label };
}

export function riskLabel(level: "low" | "medium" | "high" | "critical"): RiskLabel {
  return `risk: ${level}`;
}

export const HUMAN_CONTROLLED_LABELS = ["status: blocked"] as const;

export type HumanControlledLabel = (typeof HUMAN_CONTROLLED_LABELS)[number];

export function isHumanControlledLabel(name: string): boolean {
  return HUMAN_CONTROLLED_LABELS.includes(name as HumanControlledLabel);
}
