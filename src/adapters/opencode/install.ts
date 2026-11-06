import { join } from "node:path";
import { readText } from "../../core/files.js";
import { jsonc } from "../../core/jsonc.js";
import {
  harness,
  type PluginContext,
  type PluginPart,
} from "../../core/plugins.js";

/** `github:owner/name`, from the repository's GitHub URL. */
const spec = ({ plugin }: PluginContext) =>
  `github:${new URL(plugin.repository).pathname.slice(1)}`;

/** Our `plugins` elements in `opencode.json` and `opencode.jsonc`. */
function ours(context: PluginContext): string[] {
  const found: string[] = [];
  for (const name of ["opencode.json", "opencode.jsonc"]) {
    const path = join(context.dir, name);
    const text = readText(path);
    if (text === undefined) continue;
    let doc: unknown;
    try {
      doc = jsonc.parse(text);
    } catch (error) {
      throw new Error(`${path}: ${(error as Error).message}`, { cause: error });
    }
    const plugins = (doc as { plugins?: unknown }).plugins;
    if (!Array.isArray(plugins)) continue;
    for (const item of plugins)
      if (
        typeof item === "string" &&
        (item === spec(context) || item.startsWith(`${spec(context)}#`))
      )
        found.push(item);
  }
  return found;
}

/**
 * The `plugins` list is OpenCode's whole install record and caches are
 * keyed by ref, so the plugin is pinned: `plugin add
 * github:lucadallavalle/agentfiles#<sha>`. A new ref would append a second
 * entry, so every one of ours is removed by its exact specifier first
 * (verified with OpenCode 2.2.5: one entry remains).
 */
export const opencodePlugin: PluginPart = {
  pinned: true,
  installed: (context) => {
    const entries = ours(context);
    if (!entries.length) return undefined;
    if (entries.length > 1) return `${String(entries.length)} entries`;
    // Unpinned (the former README install) follows main.
    return entries[0]?.split("#")[1] ?? "main";
  },
  install: (context, commit) => {
    harness(context, ["plugin", "add", `${spec(context)}#${commit}`]);
  },
  update: (context, commit) => {
    for (const entry of ours(context))
      harness(context, ["plugin", "remove", entry]);
    opencodePlugin.install(context, commit);
  },
};
