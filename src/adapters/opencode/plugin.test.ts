import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Skill } from "@opencode/plugin";
import type { SkillEditor } from "@opencode/plugin/promise/skill";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import plugin, { addSkills } from "./plugin.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));

/** Same semantics as OpenCode 2.0.32's skill editor: `add` sets by ID. */
function fakeEditor(initial: Skill.Info[] = []) {
  const skills = new Map<string, Skill.Info>(
    initial.map((skill) => [skill.id, skill]),
  );
  const editor: SkillEditor = {
    list: () => Array.from(skills.values()),
    get: (id) => skills.get(id),
    add: (skill) => {
      skills.set(skill.id, structuredClone(skill));
    },
    update: (id, update) => {
      const skill = skills.get(id);
      if (skill) update(skill);
    },
    remove: (id) => {
      skills.delete(id);
    },
  };
  return { editor, skills };
}

/** What OpenCode advertises to the model (2.0.32 `SkillInstructions`). */
function advertised(skills: Iterable<Skill.Info>): string[] {
  return Array.from(skills)
    .filter((s) => s.description !== undefined && s.autoinvoke !== false)
    .map((s) => s.id);
}

function skillsDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "agentfiles-skills-"));
  for (const [id, text] of Object.entries(files)) {
    mkdirSync(join(dir, id));
    writeFileSync(join(dir, id, "SKILL.md"), text);
  }
  return dir;
}

describe("addSkills", () => {
  const dir = skillsDir({
    auto: "---\nname: auto\ndescription: Auto.\n---\n# Auto\n",
    manual:
      "---\nname: manual\ndescription: Manual.\ndisable-model-invocation: true\n---\n# Manual\n",
  });

  it("adds each skill with its body and absolute SKILL.md path", () => {
    const { editor, skills } = fakeEditor();
    addSkills(editor, dir);
    expect(skills.get("auto")).toEqual({
      id: "auto",
      name: "auto",
      description: "Auto.",
      path: join(dir, "auto", "SKILL.md"),
      content: "# Auto\n",
    });
  });

  it("registers manual-only skills without advertising them", () => {
    const { editor, skills } = fakeEditor();
    addSkills(editor, dir);
    expect(skills.get("manual")?.autoinvoke).toBe(false);
    expect(advertised(skills.values())).toEqual(["auto"]);
  });

  it("replaces a same-ID skill from another source", () => {
    const other = {
      id: "manual",
      name: "manual",
      description: "Other.",
      path: "/elsewhere/manual/SKILL.md",
      content: "",
    } as Skill.Info;
    const { editor, skills } = fakeEditor([other]);
    addSkills(editor, dir);
    expect(skills.get("manual")?.path).toBe(join(dir, "manual", "SKILL.md"));
  });

  it("keeps this repo's grill manual-only", () => {
    const { editor, skills } = fakeEditor();
    addSkills(editor);
    expect(skills.get("grill")).toMatchObject({ autoinvoke: false });
    expect(skills.get("grill")?.content).not.toMatch(/^---/);
    expect(advertised(skills.values())).not.toContain("grill");
  });
});

describe("plugin", () => {
  it("adds the skills through ctx.skill.transform", async () => {
    const { editor, skills } = fakeEditor();
    const ctx = {
      skill: {
        transform: (callback: (editor: SkillEditor) => void) => {
          callback(editor);
          return Promise.resolve({ dispose: () => Promise.resolve() });
        },
      },
    };
    await plugin.setup(ctx as unknown as Parameters<typeof plugin.setup>[0]);
    expect(skills.has("grill")).toBe(true);
  });
});

describe("package.json", () => {
  const manifest = z
    .object({
      name: z.string(),
      type: z.literal("module"),
      exports: z.object({ "./server": z.string().endsWith(".ts") }),
    })
    .parse(JSON.parse(readFileSync(join(root, "package.json"), "utf8")));

  it("exports the server plugin as TypeScript source", () => {
    expect(join(root, manifest.exports["./server"])).toBe(
      fileURLToPath(new URL("plugin.ts", import.meta.url)),
    );
  });
});
