import { fileURLToPath } from "node:url";
import type { Plugin, Skill } from "@opencode/plugin";
import type { SkillEditor } from "@opencode/plugin/promise/skill";
import { readSkills } from "../../core/skills.js";

const repoSkills = fileURLToPath(new URL("../../../skills", import.meta.url));

/**
 * Adds every `<dir>/<id>/SKILL.md`. A manual-only skill gets
 * `autoinvoke: false`: OpenCode maps `disable-model-invocation` only for
 * skills it reads from disk itself. A same-ID skill already registered
 * wins: IDs are flat, and `add` would replace it.
 */
export function addSkills(editor: SkillEditor, dir = repoSkills): void {
  for (const skill of readSkills(dir)) {
    if (editor.get(skill.id)) continue;
    // The brands are type-level only; OpenCode stores plain strings.
    editor.add({
      id: skill.id as Skill.Info["id"],
      name: (skill.name ?? skill.id) as Skill.Info["name"],
      ...(skill.description === undefined
        ? {}
        : { description: skill.description }),
      ...(skill.manualOnly ? { autoinvoke: false } : {}),
      path: skill.path as Skill.Info["path"],
      content: skill.content,
    });
  }
}

// Type-only SDK import: `Plugin.define` is the identity, so nothing is
// needed at runtime and no dependency must be installed with the plugin.
const plugin: Plugin.Plugin = {
  id: "agentfiles",
  setup: async (ctx) => {
    await ctx.skill.transform((editor) => {
      addSkills(editor);
    });
  },
};

export default plugin;
