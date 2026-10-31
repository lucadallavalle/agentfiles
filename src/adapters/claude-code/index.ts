import type { GeneratedFile } from "../../core/generated.js";
import type { PluginMetadata } from "../../core/plugin.js";

/**
 * `.claude-plugin/marketplace.json`: this repo is the marketplace and its one
 * plugin (`"source": "./"`). No `plugin.json`, so the entry is the manifest;
 * skills load from the default `skills/`. No `version`: installs track the
 * commit SHA.
 */
export function claudeCodeFiles(plugin: PluginMetadata): GeneratedFile[] {
  const marketplace = {
    name: plugin.name,
    description: plugin.description,
    owner: plugin.author,
    plugins: [
      {
        name: plugin.name,
        source: "./",
        description: plugin.description,
        author: plugin.author,
        license: plugin.license,
        repository: plugin.repository,
      },
    ],
  };
  return [{ path: ".claude-plugin/marketplace.json", content: marketplace }];
}
