import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { stringify } from "yaml";

/** A committed file an adapter derives from the plugin metadata. */
export interface GeneratedFile {
  /** Relative to the repo root, `/`-separated. */
  path: string;
  /** Serialized as YAML for a `.yaml` path, otherwise as JSON. */
  content: unknown;
}

export function serialize(file: GeneratedFile): string {
  if (file.path.endsWith(".yaml")) return stringify(file.content);
  return `${JSON.stringify(file.content, null, 2)}\n`;
}

export function writeGenerated(root: string, files: GeneratedFile[]): void {
  for (const file of files) {
    const path = join(root, file.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, serialize(file));
  }
}

/** Paths whose committed content differs from what the generator writes. */
export function staleGenerated(root: string, files: GeneratedFile[]): string[] {
  return files
    .filter((file) => {
      try {
        return readFileSync(join(root, file.path), "utf8") !== serialize(file);
      } catch {
        return true;
      }
    })
    .map((file) => file.path);
}
