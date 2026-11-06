import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundleCli, bundlePath } from "./cli/bundle.js";
import { claudeCodeFiles } from "./adapters/claude-code/index.js";
import { codexFiles } from "./adapters/codex/index.js";
import {
  DocumentationHashes,
  documentationHashesPath,
  readDocumentation,
} from "./core/config.js";
import { writeGenerated, type GeneratedFile } from "./core/generated.js";
import { readPluginMetadata } from "./core/plugin.js";
import { documentationDir } from "./core/repo.js";

function git(root: string, args: readonly string[], input?: string): Buffer {
  const result = spawnSync("git", args, {
    cwd: root,
    input,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(`git ${args.join(" ")}: ${result.stderr.toString()}`);
  return result.stdout;
}

const sha256 = (data: string | Buffer) =>
  createHash("sha256").update(data).digest("hex");

/**
 * Every version of the common documentation as `[name, sha256]`: each one
 * in git history, oldest first, then the working tree's.
 */
export function documentationVersions(root: string): [string, string][] {
  const prefix = `${documentationDir}/`;
  const blobs: [string, string][] = [];
  const raw = git(root, [
    "-c",
    "core.quotePath=false",
    "log",
    "--reverse",
    "--diff-merges=separate",
    "--format=",
    "--raw",
    "--no-abbrev",
    "--no-renames",
    "--",
    documentationDir,
  ]).toString();
  for (const line of raw.split("\n")) {
    const match = /^:\S+ \S+ \S+ ([0-9a-f]+) \S+\t(.+)$/.exec(line);
    if (!match?.[1] || !match[2] || /^0+$/.test(match[1])) continue;
    blobs.push([match[2].slice(prefix.length), match[1]]);
  }
  const versions: [string, string][] = [];
  if (blobs.length) {
    const out = git(
      root,
      ["cat-file", "--batch"],
      blobs.map(([, blob]) => blob).join("\n") + "\n",
    );
    let offset = 0;
    for (const [name] of blobs) {
      const end = out.indexOf(10, offset);
      const size = Number(out.subarray(offset, end).toString().split(" ")[2]);
      versions.push([name, sha256(out.subarray(end + 1, end + 1 + size))]);
      offset = end + 1 + size + 1;
    }
  }
  for (const file of readDocumentation(root))
    versions.push([file.name, sha256(file.text)]);
  return versions;
}

/** The hash list with every version appended once; nothing is ever removed. */
export function appendHashes(
  list: DocumentationHashes,
  versions: readonly (readonly [string, string])[],
): DocumentationHashes {
  const merged: Record<string, string[]> = {};
  for (const [name, hashes] of Object.entries(list)) merged[name] = [...hashes];
  for (const [name, hash] of versions) {
    const hashes = (merged[name] ??= []);
    if (!hashes.includes(hash)) hashes.push(hash);
  }
  return Object.fromEntries(
    Object.entries(merged).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}

function hashList(root: string): GeneratedFile {
  const path = join(root, documentationHashesPath);
  const list = existsSync(path)
    ? DocumentationHashes.parse(JSON.parse(readFileSync(path, "utf8")))
    : {};
  return {
    path: documentationHashesPath,
    content: appendHashes(list, documentationVersions(root)),
  };
}

/** Every harness manifest and the documentation hash list this repo commits. */
export function generatedFiles(root: string): GeneratedFile[] {
  const plugin = readPluginMetadata(root);
  return [...claudeCodeFiles(plugin), ...codexFiles(plugin), hashList(root)];
}

// `pnpm generate` runs the built copy: dist/generate.js, one level below the root.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const files = generatedFiles(root);
  writeGenerated(root, files);
  for (const file of files) console.log(`wrote ${file.path}`);
  const bin = join(root, bundlePath);
  mkdirSync(dirname(bin), { recursive: true });
  writeFileSync(bin, await bundleCli(root));
  chmodSync(bin, 0o755);
  console.log(`wrote ${bundlePath}`);
}
