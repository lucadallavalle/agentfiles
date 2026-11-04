import {
  accessSync,
  chmodSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, delimiter, dirname, join, sep } from "node:path";

/** The environment the CLI runs in; tests pass a fake home. */
export type Env = Readonly<Record<string, string | undefined>>;

/** Base directories, honoring the XDG variables as the harnesses do. */
export interface Paths {
  home: string;
  config: string;
  state: string;
}

export function paths(env: Env): Paths {
  const home = env.HOME;
  if (!home) throw new Error("HOME is not set");
  return {
    home,
    config: envPath(env, "XDG_CONFIG_HOME", join(home, ".config")),
    state: envPath(env, "XDG_STATE_HOME", join(home, ".local", "state")),
  };
}

/** A directory variable; unset or empty means the default, as in the XDG spec. */
export function envPath(env: Env, name: string, fallback: string): string {
  const value = env[name];
  return value !== undefined && value !== "" ? value : fallback;
}

/** `~/…` under the home directory, else the path unchanged. */
export function tilde(path: string, home: string): string {
  return path.startsWith(home + sep) ? `~${path.slice(home.length)}` : path;
}

export function onPath(binary: string, env: Env): boolean {
  return (env.PATH ?? "")
    .split(delimiter)
    .filter(Boolean)
    .some((dir) => {
      try {
        accessSync(join(dir, binary), constants.X_OK);
        return true;
      } catch {
        return false;
      }
    });
}

/** The file a write must replace: a symlink's target, so the link survives. */
function real(path: string): string {
  try {
    return lstatSync(path).isSymbolicLink() ? realpathSync(path) : path;
  } catch {
    return path;
  }
}

/** The file's text, or undefined when it doesn't exist. */
export function readText(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  return readFileSync(path, "utf8");
}

/** Writes through a temp file in the same directory and a rename, keeping the mode. */
export function writeAtomic(path: string, text: string): void {
  const target = real(path);
  mkdirSync(dirname(target), { recursive: true });
  const mode = existsSync(target) ? statSync(target).mode & 0o7777 : 0o644;
  const temp = join(
    dirname(target),
    `.${basename(target)}.agentfiles-${String(process.pid)}.tmp`,
  );
  try {
    writeFileSync(temp, text);
    chmodSync(temp, mode);
    renameSync(temp, target);
  } finally {
    rmSync(temp, { force: true });
  }
}

/** Removes the file, or only the link when it is a symlink. */
export function remove(path: string): void {
  rmSync(path, { force: true });
}
