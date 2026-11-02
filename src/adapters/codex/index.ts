import type { GeneratedFile } from "../../core/generated.js";
import type { PluginMetadata } from "../../core/plugin.js";

export const AGENT_PLUGINS_SCHEMA =
  "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";

/**
 * Codex reads this repo as marketplace and plugin:
 * - `plugin.json`: portable Agent Plugins manifest; skills load from the
 *   default `skills/`. No `version` (optional in the portable format) and no
 *   `.codex-plugin/plugin.json` (only a fallback for OpenAI-specific settings).
 * - `.agents/plugins/marketplace.json`: one local entry at the root (`./`),
 *   installed as `<plugin>@<owner>`.
 * - `skills/<id>/agents/openai.yaml` for each manual-only skill: Codex ignores
 *   `disable-model-invocation`; `$<id>` still loads it.
 */
export function codexFiles(plugin: PluginMetadata): GeneratedFile[] {
  const manifest = {
    $schema: AGENT_PLUGINS_SCHEMA,
    name: plugin.name,
    description: plugin.description,
    author: plugin.author,
    repository: plugin.repository,
    license: plugin.license,
  };
  const marketplace = {
    name: plugin.marketplace,
    interface: { displayName: plugin.author.name },
    plugins: [
      {
        name: plugin.name,
        source: { source: "local", path: "./" },
        policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
        category: "Developer Tools",
      },
    ],
  };
  return [
    { path: "plugin.json", content: manifest },
    { path: ".agents/plugins/marketplace.json", content: marketplace },
    ...plugin.skills
      .filter((skill) => skill.manualOnly)
      .map((skill) => ({
        path: `skills/${skill.id}/agents/openai.yaml`,
        content: { policy: { allow_implicit_invocation: false } },
      })),
  ];
}
