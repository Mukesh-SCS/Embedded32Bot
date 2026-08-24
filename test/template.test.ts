import { describe, expect, test } from "vitest";
import { validatePrTemplate } from "../src/policy/pr-template.js";

const EMBEDDED32_PR_TEMPLATE = `## Summary


## Why this change is needed


## Packages affected


## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Education / lab
- [ ] Refactoring
- [ ] Tooling / CI
- [ ] Other

## Testing performed

\`\`\`bash
npm run verify
npm run test:labs
\`\`\`

## Documentation updated
- [ ] README or package docs
- [ ] docs/ or labs/
- [ ] API docs (\`npm run docs:api\`) if public exports changed
- [ ] Not applicable

## Screenshots or demo


## Breaking changes
- [ ] None
- [ ] Yes - describe migration:

## Checklist
- [ ] Build passes (\`npm run build\`)
- [ ] Tests pass (\`npm run test\`)
`;

function section(body: string, name: string) {
  return validatePrTemplate(body).find((entry) => entry.name === name);
}

describe("PR template validation", () => {
  test("treats HTML comments as empty", () => {
    const result = validatePrTemplate("## Summary\n\n<!-- What does this PR change? -->\n");
    const summary = result.find((entry) => entry.name === "Summary");
    expect(summary?.present).toBe(true);
    expect(summary?.hasContent).toBe(false);
  });

  test("detects contributor content", () => {
    const result = validatePrTemplate("## Summary\n\nDocument the CAN filter change.\n");
    expect(result.find((entry) => entry.name === "Summary")?.hasContent).toBe(true);
  });

  test("treats an untouched Embedded32 template as empty", () => {
    const result = validatePrTemplate(EMBEDDED32_PR_TEMPLATE);
    expect(section(EMBEDDED32_PR_TEMPLATE, "Summary")?.hasContent).toBe(false);
    expect(section(EMBEDDED32_PR_TEMPLATE, "Testing performed")?.hasContent).toBe(false);
    expect(section(EMBEDDED32_PR_TEMPLATE, "Type of change")?.hasContent).toBe(false);
    expect(section(EMBEDDED32_PR_TEMPLATE, "Breaking changes")?.hasContent).toBe(false);
    expect(result.every((entry) => entry.present)).toBe(true);
  });

  test("counts a filled summary while leaving the testing boilerplate empty", () => {
    const body = EMBEDDED32_PR_TEMPLATE.replace(
      "## Summary\n\n",
      "## Summary\n\nAdd J1939 PGN decode coverage.\n",
    );
    expect(section(body, "Summary")?.hasContent).toBe(true);
    expect(section(body, "Testing performed")?.hasContent).toBe(false);
  });

  test("does not treat the default verify commands as testing evidence", () => {
    expect(section(EMBEDDED32_PR_TEMPLATE, "Testing performed")?.hasContent).toBe(false);
  });

  test("treats a filled testing section as complete", () => {
    const body = EMBEDDED32_PR_TEMPLATE.replace(
      "npm run verify\nnpm run test:labs",
      "npm run verify\nnpm run test:labs\n\nRan hardware-in-loop against the CAN fixture.",
    );
    expect(section(body, "Testing performed")?.hasContent).toBe(true);
  });

  test("treats an answered breaking-changes checkbox as content", () => {
    const body = EMBEDDED32_PR_TEMPLATE.replace("- [ ] None", "- [x] None");
    expect(section(body, "Breaking changes")?.hasContent).toBe(true);
  });

  test("treats multiple checked type boxes as content", () => {
    const body = EMBEDDED32_PR_TEMPLATE.replace("- [ ] Bug fix", "- [x] Bug fix").replace(
      "- [ ] Documentation",
      "- [x] Documentation",
    );
    expect(section(body, "Type of change")?.hasContent).toBe(true);
  });
});
