import { describe, expect, test } from "vitest";
import {
  classifyAreas,
  classifyPullRequest,
  dependabotSemver,
} from "../src/policy/classification.js";

describe("area classification", () => {
  test("maps a single package path", () => {
    expect(classifyAreas(["embedded32-j1939/src/index.ts"])).toEqual(["area: j1939"]);
  });

  test("maps multiple packages", () => {
    expect(classifyAreas(["embedded32-can/src/a.ts", "embedded32-j1939/src/b.ts"])).toEqual([
      "area: can",
      "area: j1939",
    ]);
  });

  test("maps docs and CI paths", () => {
    expect(classifyAreas(["docs/intro.md", ".github/workflows/ci.yml"])).toEqual([
      "area: ci",
      "area: docs",
    ]);
  });

  test("maps SDK packages", () => {
    expect(classifyAreas(["embedded32-sdk-js/src/index.ts"])).toEqual(["area: sdk"]);
  });

  test("leaves unknown paths unclassified", () => {
    const result = classifyPullRequest([{ filename: "apps/site/index.html" }], {
      title: "Update site",
      body: "",
      authorLogin: "contributor",
      authorType: "User",
    });
    expect(result.areas).toEqual([]);
    expect(result.unclassifiedPaths).toEqual(["apps/site/index.html"]);
  });
});

describe("risk classification", () => {
  test("docs-only changes are low risk", () => {
    const result = classifyPullRequest([{ filename: "docs/guide.md" }], {
      title: "docs: clarify lab",
      body: "",
      authorLogin: "contributor",
      authorType: "User",
    });
    expect(result.risk).toBe("low");
    expect(result.type).toBe("type: docs");
    expect(result.release).toBe("release: none");
  });

  test("package source is medium risk", () => {
    const result = classifyPullRequest([{ filename: "embedded32-core/src/index.ts" }], {
      title: "Update core",
      body: "",
      authorLogin: "contributor",
      authorType: "User",
    });
    expect(result.risk).toBe("medium");
    expect(result.areas).toEqual(["area: core"]);
  });

  test("labs changes are medium risk", () => {
    const result = classifyPullRequest([{ filename: "labs/can-filter/README.md" }], {
      title: "Update lab",
      body: "",
      authorLogin: "contributor",
      authorType: "User",
    });
    expect(result.risk).toBe("medium");
    expect(result.areas).toEqual(["area: labs"]);
  });

  test("workflow changes are high risk", () => {
    const result = classifyPullRequest([{ filename: ".github/workflows/ci.yml" }], {
      title: "ci: retry npm",
      body: "",
      authorLogin: "contributor",
      authorType: "User",
    });
    expect(result.risk).toBe("high");
    expect(result.type).toBe("type: ci");
  });

  test("release workflow is critical", () => {
    const result = classifyPullRequest([{ filename: ".github/workflows/release.yml" }], {
      title: "Adjust release",
      body: "",
      authorLogin: "contributor",
      authorType: "User",
    });
    expect(result.risk).toBe("critical");
  });

  test("highest risk wins", () => {
    const result = classifyPullRequest(
      [{ filename: "docs/guide.md" }, { filename: ".github/workflows/ci.yml" }],
      {
        title: "Mixed",
        body: "",
        authorLogin: "contributor",
        authorType: "User",
      },
    );
    expect(result.risk).toBe("high");
  });
});

describe("type and release signals", () => {
  test("uses a single PR template type checkbox", () => {
    const result = classifyPullRequest([{ filename: "embedded32-cli/src/cli.ts" }], {
      title: "Change CLI",
      body: "- [x] Bug fix\n- [ ] New feature",
      authorLogin: "contributor",
      authorType: "User",
    });
    expect(result.type).toBe("type: bug");
  });

  test("omits type when multiple checkboxes are selected", () => {
    const result = classifyPullRequest([{ filename: "embedded32-cli/src/cli.ts" }], {
      title: "Change CLI",
      body: "- [x] Bug fix\n- [x] New feature",
      authorLogin: "contributor",
      authorType: "User",
    });
    expect(result.type).toBeUndefined();
  });

  test("labels Dependabot patch updates conservatively", () => {
    const result = classifyPullRequest([{ filename: "package-lock.json" }], {
      title: "Bump left-pad from 1.2.3 to 1.2.4",
      body: "",
      authorLogin: "dependabot[bot]",
      authorType: "Bot",
    });
    expect(result.type).toBe("type: dependencies");
    expect(result.release).toBe("release: patch");
    expect(result.risk).toBe("low");
  });

  test("does not treat a major Dependabot bump as low risk", () => {
    expect(dependabotSemver("Bump foo from 1.2.3 to 2.0.0")).toBe("major");
    const result = classifyPullRequest([{ filename: "package-lock.json" }], {
      title: "Bump foo from 1.2.3 to 2.0.0",
      body: "",
      authorLogin: "dependabot[bot]",
      authorType: "Bot",
    });
    expect(result.release).toBe("release: major");
    expect(result.risk).toBe("high");
  });

  test("requires a checked breaking-change box for major release labels", () => {
    const result = classifyPullRequest([{ filename: "embedded32-core/src/index.ts" }], {
      title: "Change core",
      body: "## Breaking changes\n\n- [x] Yes - describe migration:\n",
      authorLogin: "contributor",
      authorType: "User",
    });
    expect(result.release).toBe("release: major");
  });
});
