import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

const script = z
  .object({ scripts: z.object({ "pnpm:devPreinstall": z.string() }) })
  .parse(
    JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ),
  ).scripts["pnpm:devPreinstall"];

// The pre-commit hook runs this test with GIT_DIR and friends set; drop
// them so git targets the temp dirs, not this checkout.
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
);
const run = (cwd: string) => execFileSync("sh", ["-c", script], { cwd, env });
const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, { cwd, env, encoding: "utf8" });
const hooksPath = (cwd: string) => {
  try {
    return git(cwd, "config", "--local", "--get", "core.hooksPath").trim();
  } catch {
    return undefined;
  }
};

describe("pnpm:devPreinstall", () => {
  const dir = () => mkdtempSync(join(tmpdir(), "agentfiles-hooks-"));

  it("enables .githooks at the root of a checkout", () => {
    const repo = dir();
    git(repo, "init", "-q");
    run(repo);
    expect(hooksPath(repo)).toBe(".githooks");
  });

  it("leaves an enclosing repo alone", () => {
    const repo = dir();
    git(repo, "init", "-q");
    const sub = join(repo, "node_modules", "agentfiles");
    mkdirSync(sub, { recursive: true });
    run(sub);
    expect(hooksPath(repo)).toBeUndefined();
  });

  it("does nothing outside git", () => {
    expect(() => run(dir())).not.toThrow();
  });
});
