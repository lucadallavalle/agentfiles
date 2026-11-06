import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ShippedFile } from "./config.js";
import { git } from "./exec.js";
import { readText, remove, writeAtomic, type Env } from "./files.js";
import { isOwned, repoName } from "./owners.js";
import { hash, type State } from "./tracked.js";

/** Where owned repos keep their copy of the common documentation. */
export const documentationDir = "docs/documentation";

export interface RepoOptions {
  cwd: string;
  env: Env;
  /** The CLI's repo root: its own repo is skipped. */
  root: string;
  documentation: readonly ShippedFile[];
  /** Every hash ever shipped, per file name. */
  hashes: Readonly<Record<string, readonly string[]>>;
  owners: readonly string[];
  fix: boolean;
}

export interface RepoOutcome {
  /** Relative to the repo root. */
  path: string;
  state: State;
  /** True once `--fix` wrote or removed it. */
  fixed: boolean;
}

/** `package.json` `repository`, as `owner/name`. */
function ownName(root: string): string | undefined {
  try {
    const manifest = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ) as { repository?: { url?: unknown } };
    const url = manifest.repository?.url;
    return typeof url === "string" ? repoName(url) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A copy equal to the shipped file is in sync, one with any shipped hash
 * outdated (or unshipped when no longer shipped), any other edited.
 */
function classify(
  shipped: string | undefined,
  known: ReadonlySet<string>,
  current: string | undefined,
): State | undefined {
  if (current === undefined)
    return shipped === undefined ? undefined : "missing";
  if (current === shipped) return "in sync";
  const old = known.has(hash("file", current));
  if (shipped === undefined) return old ? "unshipped" : "edited";
  return old ? "outdated" : "edited";
}

/**
 * Drift of the common documentation copies in the repo at `cwd`; none
 * outside a git repo, in a foreign repo or in the CLI's own repo. With
 * `fix`, writes missing and outdated copies and removes unshipped ones;
 * never commits.
 */
export function repoDrift(options: RepoOptions): RepoOutcome[] {
  const { env } = options;
  const top = git(["rev-parse", "--show-toplevel"], options.cwd, env)?.trim();
  if (!top) return [];
  const remotes = (
    git(["config", "--get-regexp", "^remote\\..*\\.url$"], top, env) ?? ""
  )
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(line.indexOf(" ") + 1));
  if (!isOwned(remotes, options.owners)) return [];
  const own = ownName(options.root);
  if (own && remotes.some((url) => repoName(url) === own)) return [];

  const shipped = new Map(options.documentation.map((f) => [f.name, f.text]));
  const names = [
    ...new Set([...shipped.keys(), ...Object.keys(options.hashes)]),
  ].sort();
  const outcomes: RepoOutcome[] = [];
  for (const name of names) {
    const path = `${documentationDir}/${name}`;
    const file = join(top, ...path.split("/"));
    const text = shipped.get(name);
    const state = classify(text, new Set(options.hashes[name]), readText(file));
    if (!state) continue;
    let fixed = false;
    if (
      options.fix &&
      text !== undefined &&
      (state === "missing" || state === "outdated")
    ) {
      writeAtomic(file, text);
      fixed = true;
    } else if (options.fix && state === "unshipped") {
      remove(file);
      fixed = true;
    }
    outcomes.push({ path, state, fixed });
  }
  return outcomes;
}
