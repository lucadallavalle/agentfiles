import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  parseFrontmatter,
  readSkills,
  skillProblems,
  type Skill,
} from "./skills.js";

const repoSkills = fileURLToPath(new URL("../../skills", import.meta.url));

describe("parseFrontmatter", () => {
  it("reads key: value scalars and strips matching quotes", () => {
    const text =
      '---\nname: grill\ndescription: "Ask, then decide."\n\ndisable-model-invocation: true\n---\n# Body\n';
    expect(parseFrontmatter(text)).toEqual({
      name: "grill",
      description: "Ask, then decide.",
      "disable-model-invocation": "true",
    });
  });

  it.each([
    ["no opening ---", "name: x\n---\n", /line 1/],
    ["no closing ---", "---\nname: x\n", /closing/],
    ["a list", "---\ntags:\n  - a\n---\n", /expected "key: value"/],
    [
      "a block scalar",
      "---\ndescription: >\n  text\n---\n",
      /unsupported value/,
    ],
    ["a nested colon", "---\ndescription: a: b\n---\n", /unsupported value/],
    ["a comment", "---\nname: x # note\n---\n", /unsupported value/],
    ["an empty value", "---\nmetadata: \n---\n", /unsupported value/],
    ["an unbalanced quote", '---\nname: "x\n---\n', /unsupported quoted value/],
    ["a duplicate key", "---\nname: a\nname: b\n---\n", /duplicate key name/],
  ])("rejects %s", (_case, text, error) => {
    expect(() => parseFrontmatter(text)).toThrow(error);
  });
});

describe("skillProblems", () => {
  const valid: Skill = {
    id: "grill",
    name: "grill",
    description: "Interview.",
    manualOnly: true,
  };

  it("accepts a portable skill", () => {
    expect(skillProblems(valid)).toEqual([]);
  });

  it.each([
    ["an uppercase ID", { ...valid, id: "Grill", name: "Grill" }, /kebab-case/],
    ["a double hyphen", { ...valid, id: "a--b", name: "a--b" }, /kebab-case/],
    [
      "a name other than the directory",
      { ...valid, name: "grill-me" },
      /differs/,
    ],
    ["no description", { ...valid, description: undefined }, /missing/],
    [
      "a long description",
      { ...valid, description: "x".repeat(1025) },
      /longer than 1024/,
    ],
  ])("reports %s", (_case, skill, problem) => {
    expect(skillProblems(skill)).toEqual([expect.stringMatching(problem)]);
  });
});

describe("this repo's skills", () => {
  const skills = readSkills(repoSkills);

  it("exist", () => {
    expect(skills.map((skill) => skill.id)).toContain("grill");
  });

  it.each(skills.map((skill) => [skill.id, skill] as const))(
    "%s is portable",
    (_id, skill) => {
      expect(skillProblems(skill)).toEqual([]);
    },
  );

  it("keeps grill manual-only", () => {
    expect(skills.find((skill) => skill.id === "grill")?.manualOnly).toBe(true);
  });
});
