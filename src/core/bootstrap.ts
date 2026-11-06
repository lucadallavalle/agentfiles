import {
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  symlinkSync,
} from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { doctor, type DoctorOptions, type DoctorResult } from "./doctor.js";
import { onPath, paths, tilde, writeAtomic, type Paths } from "./files.js";
import { ownersPath, readOwners } from "./owners.js";
import { bundlePath } from "./self.js";

export interface BootstrapOptions extends Omit<DoctorOptions, "fix"> {
  /** `--owner`, added to `owners`. */
  owners: readonly string[];
}

/** Adds the owners not yet listed, case-insensitive; written only when one is new. */
function addOwners(base: Paths, owners: readonly string[]): string[] {
  const path = ownersPath(base);
  const listed = readOwners(path);
  const added = owners.filter(
    (owner, i) =>
      !listed.some((o) => o.toLowerCase() === owner.toLowerCase()) &&
      owners.findIndex((o) => o.toLowerCase() === owner.toLowerCase()) === i,
  );
  if (!added.length) return [];
  writeAtomic(
    path,
    `${JSON.stringify({ owners: [...listed, ...added] }, null, 2)}\n`,
  );
  return added.map(
    (owner) =>
      `agentfiles ${tilde(path, base.home)} owners[] ${JSON.stringify(owner)} missing, written`,
  );
}

/** `~/.local/bin/agentfiles`, a symlink to the bundle; another file there is never replaced. */
function link(root: string, base: Paths, path: string | undefined): string[] {
  const dir = join(base.home, ".local", "bin");
  const file = join(dir, "agentfiles");
  const target = join(root, bundlePath);
  const shown = tilde(file, base.home);
  const lines: string[] = [];
  let stat;
  try {
    stat = lstatSync(file);
  } catch {
    stat = undefined;
  }
  if (!stat) {
    mkdirSync(dir, { recursive: true });
    symlinkSync(target, file);
    lines.push(`agentfiles ${shown} missing, written`);
  } else if (
    !stat.isSymbolicLink() ||
    resolve(dirname(file), readlinkSync(file)) !== resolve(target)
  ) {
    lines.push(
      `agentfiles ${shown} conflict: not a link to ${tilde(target, base.home)}; left alone`,
    );
  }
  const onPathDirs = (path ?? "").split(delimiter).map((d) => resolve(d));
  if (!onPathDirs.includes(resolve(dir)))
    lines.push(
      `agentfiles ${tilde(dir, base.home)} is not on PATH; add it to run agentfiles`,
    );
  return lines;
}

/**
 * spiral-review slot (ROADMAP step 4): its install and `spiral-review init`
 * per harness go here once spiral-review is installable without
 * credentials and R14 (scriptable `init`) exists. Nothing yet.
 */
function spiralReview(): string[] {
  return [];
}

/**
 * Sets up this machine: checks the prerequisites (Node is the bundle's own
 * check), adds `--owner` names, links `~/.local/bin/agentfiles`, then runs
 * `doctor --fix`, whose exit code it returns.
 */
export function bootstrap(options: BootstrapOptions): DoctorResult {
  const { env } = options;
  let base: Paths;
  try {
    base = paths(env);
  } catch (error) {
    return { lines: [`bootstrap error: ${(error as Error).message}`], code: 2 };
  }
  const missing: string[] = [];
  if (!onPath("git", env)) missing.push("git");
  if (
    !options.adapters.some(
      (a) => existsSync(a.dir(env, base)) || onPath(a.binary, env),
    )
  )
    missing.push(
      `a harness (${options.adapters.map((a) => a.name).join(", ")})`,
    );
  if (missing.length)
    return {
      lines: [`bootstrap error: missing prerequisites: ${missing.join(", ")}`],
      code: 2,
    };

  const lines: string[] = [];
  try {
    lines.push(...addOwners(base, options.owners));
    lines.push(...link(options.root, base, env.PATH));
  } catch (error) {
    return {
      lines: [...lines, `bootstrap error: ${(error as Error).message}`],
      code: 2,
    };
  }
  lines.push(...spiralReview());
  const result = doctor({ ...options, fix: true });
  return { ...result, lines: [...lines, ...result.lines] };
}
