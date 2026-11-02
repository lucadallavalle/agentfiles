import { fileURLToPath } from "node:url";
import { claudeCodeFiles } from "./adapters/claude-code/index.js";
import { codexFiles } from "./adapters/codex/index.js";
import { writeGenerated, type GeneratedFile } from "./core/generated.js";
import { readPluginMetadata } from "./core/plugin.js";

/** Every harness manifest this repo commits, derived from one source. */
export function generatedFiles(root: string): GeneratedFile[] {
  const plugin = readPluginMetadata(root);
  return [...claudeCodeFiles(plugin), ...codexFiles(plugin)];
}

// `pnpm generate` runs the built copy: dist/generate.js, one level below the root.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const files = generatedFiles(root);
  writeGenerated(root, files);
  for (const file of files) console.log(`wrote ${file.path}`);
}
