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
