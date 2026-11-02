import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readPluginMetadata } from "./plugin.js";

function repo(pkg: object, skill: string): string {
  const root = mkdtempSync(join(tmpdir(), "agentfiles-"));
  writeFileSync(join(root, "package.json"), JSON.stringify(pkg));
  mkdirSync(join(root, "skills", "grill"), { recursive: true });
  writeFileSync(join(root, "skills", "grill", "SKILL.md"), skill);
  return root;
}

const pkg = {
  name: "agentfiles",
  description: "Setup.",
  author: "Owner",
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/owner/agentfiles.git",
  },
};
const skill = "---\nname: grill\ndescription: Interview.\n---\n";

describe("readPluginMetadata", () => {
  it("reads package.json and the skills", () => {
    const root = repo(pkg, skill);
    expect(readPluginMetadata(root)).toEqual({
      name: "agentfiles",
      marketplace: "owner",
      description: "Setup.",
      author: { name: "Owner" },
      license: "MIT",
      repository: "https://github.com/owner/agentfiles",
      skills: [
        {
          id: "grill",
          name: "grill",
          description: "Interview.",
          manualOnly: false,
          path: join(root, "skills", "grill", "SKILL.md"),
          content: "",
        },
      ],
    });
  });

  it("accepts an author object", () => {
    const root = repo({ ...pkg, author: { name: "Owner" } }, skill);
    expect(readPluginMetadata(root).author).toEqual({ name: "Owner" });
  });

  it("rejects a package.json without a repository", () => {
    const root = repo({ ...pkg, repository: undefined }, skill);
    expect(() => readPluginMetadata(root)).toThrow(/repository/);
  });

  it("rejects a repository outside GitHub", () => {
    const root = repo(
      { ...pkg, repository: { type: "git", url: "https://example.com/x.git" } },
      skill,
    );
    expect(() => readPluginMetadata(root)).toThrow(/not a GitHub/);
  });

  it("rejects a non-portable skill", () => {
    const root = repo(pkg, "---\nname: grill-me\ndescription: x\n---\n");
    expect(() => readPluginMetadata(root)).toThrow(/skills\/grill: name/);
  });
});
