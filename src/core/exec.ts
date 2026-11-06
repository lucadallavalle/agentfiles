import { spawnSync } from "node:child_process";
import type { Env } from "./files.js";

export interface ExecResult {
  /** Null when the program couldn't start or was killed. */
  status: number | null;
  stdout: string;
  stderr: string;
}

/** Runs a program without a shell, in the run's environment (its `PATH` finds the program). */
export function exec(
  command: string,
  args: readonly string[],
  options: { env: Env; cwd?: string },
): ExecResult {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  // A program that couldn't start has no output, whatever the types say.
  if (result.error)
    return { status: null, stdout: "", stderr: result.error.message };
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

/** Git's output, or undefined when it fails or git is missing. */
export function git(args: readonly string[], cwd: string, env: Env) {
  const result = exec("git", args, { env, cwd });
  return result.status === 0 ? result.stdout : undefined;
}
