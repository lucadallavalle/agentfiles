import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { run } from "../cli/index.js";
import { checkClone } from "./self.js";

const env = {
  HOME: mkdtempSync(join(tmpdir(), "agentfiles-self-home-")),
  PATH: process.env.PATH,
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@t",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@t",
};

const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, {
    cwd,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();

/** A bare `origin` with one commit on `main`, and a clone of it. */
function clone() {
  const base = mkdtempSync(join(tmpdir(), "agentfiles-self-"));
  const origin = join(base, "origin.git");
  const seed = join(base, "seed");
  const root = join(base, "af");
  git(base, "init", "-q", "--bare", "-b", "main", origin);
  git(base, "clone", "-q", origin, seed);
  git(seed, "commit", "-q", "--allow-empty", "-m", "first");
  git(seed, "push", "-q", "origin", "main");
  git(base, "clone", "-q", origin, root);
  return {
    root,
    /** Moves `main` on `origin` by one commit, optionally adding a file. */
    advance: (file?: [string, string]) => {
      if (file) {
        mkdirSync(join(seed, "bin"), { recursive: true });
        writeFileSync(join(seed, file[0]), file[1]);
        git(seed, "add", ".");
      }
      git(seed, "commit", "-q", "--allow-empty", "-m", "next");
      git(seed, "push", "-q", "origin", "main");
      return git(seed, "rev-parse", "HEAD");
    },
    head: () => git(root, "rev-parse", "HEAD"),
  };
}

const check = (root: string, fix = false, over = {}) =>
  checkClone({ root, env: { ...env, ...over }, fix });

describe("the CLI's clone", () => {
  it("is silent in sync, outside a clone and without git", () => {
    const c = clone();
    const silent = { lines: [], drift: false, error: false, rerun: false };
    expect(check(c.root)).toEqual(silent);
    expect(check(mkdtempSync(join(tmpdir(), "agentfiles-plain-")))).toEqual(
      silent,
    );
    expect(check(c.root, false, { PATH: "" })).toEqual(silent);
  });

  it("reports it behind main; --fix fast-forwards and asks for one re-run", () => {
    const c = clone();
    const before = c.head();
    const main = c.advance();
    expect(check(c.root)).toEqual({
      lines: ["agentfiles clone behind main"],
      drift: true,
      error: false,
      rerun: false,
    });
    expect(c.head()).toBe(before);
    expect(check(c.root, true)).toEqual({
      lines: ["agentfiles clone behind main, updated"],
      drift: false,
      error: false,
      rerun: true,
    });
    expect(c.head()).toBe(main);
    expect(check(c.root, true).lines).toEqual([]);
  });

  it("in the re-run, doesn't fetch and doesn't re-run again", () => {
    const c = clone();
    c.advance();
    git(c.root, "fetch", "-q", "origin");
    git(c.root, "remote", "set-url", "origin", "/nonexistent");
    expect(check(c.root, true, { AGENTFILES_RERUN: "1" })).toMatchObject({
      lines: ["agentfiles clone behind main, updated"],
      rerun: false,
    });
  });

  it("skips a clone off main, with local changes or ahead of main", () => {
    const c = clone();
    git(c.root, "checkout", "-q", "-b", "feat");
    expect(check(c.root, true).lines).toEqual([
      "agentfiles clone not on main, skipped",
    ]);
    git(c.root, "checkout", "-q", "main");
    writeFileSync(join(c.root, "x"), "x");
    expect(check(c.root, true).lines).toEqual([
      "agentfiles clone has local changes, skipped",
    ]);
    git(c.root, "add", "x");
    git(c.root, "commit", "-q", "-m", "local");
    const head = c.head();
    expect(check(c.root, true)).toMatchObject({
      lines: ["agentfiles clone ahead of main, skipped"],
      drift: false,
    });
    expect(c.head()).toBe(head);
  });

  it("says it can't check main offline, without error", () => {
    const c = clone();
    git(c.root, "remote", "set-url", "origin", "/nonexistent");
    expect(check(c.root)).toEqual({
      lines: ["agentfiles clone can't check main (offline)"],
      drift: false,
      error: false,
      rerun: false,
    });
  });

  it("re-runs the same argv from the new bundle and exits with its code", () => {
    const c = clone();
    c.advance([
      "bin/agentfiles.js",
      'console.log(`re-run ${process.env.AGENTFILES_RERUN} ${process.argv.slice(2).join(" ")}`); process.exit(1);\n',
    ]);
    let out = "";
    const code = run(["doctor", "--fix"], {
      root: c.root,
      env,
      cwd: c.root,
      adapters: [],
      output: { out: (text) => (out += text), err: () => undefined },
    });
    expect(out).toBe(
      "agentfiles clone behind main, updated\nre-run 1 doctor --fix\n",
    );
    expect(code).toBe(1);
  });
});
