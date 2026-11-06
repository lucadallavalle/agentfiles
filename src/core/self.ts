import { realpathSync } from "node:fs";
import { join } from "node:path";
import { exec, git, type ExecResult } from "./exec.js";
import type { Env } from "./files.js";

/** The committed CLI bundle, relative to the repo root. */
export const bundlePath = "bin/agentfiles.js";

/** Set in the re-run from the new bundle, so it never re-runs again. */
export const rerunVariable = "AGENTFILES_RERUN";

export interface CloneOptions {
  /** The CLI's root: its clone. */
  root: string;
  env: Env;
  fix: boolean;
}

export interface CloneResult {
  lines: string[];
  /** `doctor`: the clone is behind `main`. */
  drift: boolean;
  error: boolean;
  /** `--fix` moved `HEAD`: run the same argv again from the new bundle. */
  rerun: boolean;
}

/** Overrides the CLI's commit for plugin drift; must be on `origin/main`. */
export const commitVariable = "AGENTFILES_COMMIT";

/** The reference for plugin drift, or why there is none. */
export type CliCommit =
  { commit: string } | { skip: string } | { error: string };

/**
 * The root's `HEAD` when the worktree is clean and `HEAD` is on the local
 * `origin/main`; `AGENTFILES_COMMIT` overrides it, and one not on
 * `origin/main` is an error.
 */
export function cliCommit(root: string, env: Env): CliCommit {
  const run = (...args: string[]) => git(args, root, env)?.trim();
  const top = run("rev-parse", "--show-toplevel");
  const clone = top !== undefined && same(top, root);
  const onMain = (commit: string) =>
    run("merge-base", "--is-ancestor", commit, "refs/remotes/origin/main") !==
    undefined;
  const override = env[commitVariable];
  if (override) {
    const commit = clone
      ? run("rev-parse", "--verify", "-q", `${override}^{commit}`)
      : undefined;
    if (!commit || !onMain(commit))
      return {
        error: `${commitVariable}=${override} is not a commit on origin/main`,
      };
    return { commit };
  }
  if (!clone) return { skip: "the CLI doesn't run from a git clone" };
  if (run("status", "--porcelain") !== "")
    return { skip: "the CLI's clone has local changes" };
  const head = run("rev-parse", "HEAD");
  if (!head || !onMain(head)) return { skip: "the CLI's commit isn't on main" };
  return { commit: head };
}

/** Runs the same argv from the root's (new) bundle, once. */
export function rerun(
  root: string,
  args: readonly string[],
  options: { env: Env; cwd: string },
): ExecResult {
  return exec(process.execPath, [join(root, bundlePath), ...args], {
    env: { ...options.env, [rerunVariable]: "1" },
    cwd: options.cwd,
  });
}

function same(a: string, b: string): boolean {
  try {
    return realpathSync(a) === realpathSync(b);
  } catch {
    return false;
  }
}

/**
 * Keeps the CLI's clone on `main`: only when the root is a git checkout on
 * branch `main` without local changes, else one skip line. `doctor`
 * fetches and reports it behind; `--fix` fast-forwards it. Silent when the
 * root isn't a clone or git is missing. The re-run doesn't fetch again.
 */
export function checkClone(options: CloneOptions): CloneResult {
  const { root, env } = options;
  const result: CloneResult = {
    lines: [],
    drift: false,
    error: false,
    rerun: false,
  };
  const run = (...args: string[]) => git(args, root, env)?.trim();
  const top = run("rev-parse", "--show-toplevel");
  if (!top || !same(top, root)) return result;
  const skip = (why: string) => {
    result.lines.push(`agentfiles clone ${why}, skipped`);
    return result;
  };
  if (run("symbolic-ref", "--short", "-q", "HEAD") !== "main")
    return skip("not on main");
  if (run("status", "--porcelain") !== "") return skip("has local changes");

  const rerun = env[rerunVariable] === "1";
  if (!rerun && run("fetch", "--quiet", "origin") === undefined) {
    result.lines.push("agentfiles clone can't check main (offline)");
    return result;
  }
  const head = run("rev-parse", "HEAD");
  const main = run("rev-parse", "--verify", "-q", "refs/remotes/origin/main");
  if (!main) {
    result.lines.push("agentfiles clone can't check main (offline)");
    return result;
  }
  if (head === main) return result;
  if (run("merge-base", "--is-ancestor", "HEAD", main) === undefined)
    return skip("ahead of main");
  if (!options.fix) {
    result.lines.push("agentfiles clone behind main");
    result.drift = true;
    return result;
  }
  if (run("merge", "--ff-only", "--quiet", main) === undefined) {
    result.lines.push("agentfiles clone error: can't fast-forward to main");
    result.error = true;
    return result;
  }
  result.lines.push("agentfiles clone behind main, updated");
  result.rerun = !rerun;
  return result;
}
