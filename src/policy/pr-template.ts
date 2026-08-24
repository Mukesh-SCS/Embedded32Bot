const EXPECTED_SECTIONS = [
  "Summary",
  "Why this change is needed",
  "Packages affected",
  "Type of change",
  "Testing performed",
  "Breaking changes",
] as const;

export type TemplateSectionResult = {
  name: (typeof EXPECTED_SECTIONS)[number];
  present: boolean;
  hasContent: boolean;
};

export function validatePrTemplate(body: string): TemplateSectionResult[] {
  return EXPECTED_SECTIONS.map((name) => {
    const section = extractSection(body, name);
    return {
      name,
      present: section !== undefined,
      hasContent: section !== undefined && hasMeaningfulContent(section),
    };
  });
}

function extractSection(body: string, heading: string): string | undefined {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) {
    return undefined;
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^##\s+/.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

function hasMeaningfulContent(section: string): boolean {
  const withoutComments = section.replace(/<!--[\s\S]*?-->/g, "");
  const lines = withoutComments
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^- \[ \]/.test(line));

  return lines.some((line) => line !== "```" && line !== "```bash");
}
