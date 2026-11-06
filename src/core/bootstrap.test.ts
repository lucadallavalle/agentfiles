import {
  chmodSync,
  cpSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { run } from "../cli/index.js";
import { testAdapter } from "./test-adapter.js";

const repo = fileURLToPath(new URL("../..", import.meta.url));

/** A fake root and home; `git` and the test harness are stubs on PATH. */
function machine(options: { git?: boolean; harness?: boolean } = {}) {
  const base = mkdtempSync(join(tmpdir(), "agentfiles-bootstrap-"));
  const root = join(base, "repo");
  const home = join(base, "home");
  const bin = join(base, "bin");
  cpSync(join(repo, "config"), join(root, "config"), { recursive: true });
  mkdirSync(join(root, "docs", "documentation"), { recursive: true });
  writeFileSync(join(root, "docs", "documentation", "README.md"), "# Docs\n");
  mkdirSync(bin);
  mkdirSync(home);
  const stub = (name: string, body: string) => {
    writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`);
    chmodSync(join(bin, name), 0o755);
  };
  // A git that finds no repo: the clone, plugin and repo groups stay silent.
  if (options.git ?? true) stub("git", "exit 128");
  if (options.harness ?? true) stub("test-harness", "");
  const env: Record<string, string> = { HOME: home, PATH: bin };
  const at = (path: string) => join(home, path);
  return {
    root,
    home,
    env,
    at,
    run: (args: string[], over: Record<string, string> = {}) => {
      let out = "";
      const code = run(args, {
        root,
        env: { ...env, ...over },
        cwd: base,
        adapters: [testAdapter],
        output: { out: (text) => (out += text), err: () => undefined },
      });
      return { code, out };
    },
    tree: () =>
      (
        readdirSync(home, { recursive: true, withFileTypes: true }) as {
          parentPath: string;
          name: string;
          isFile(): boolean;
        }[]
      )
        .filter((e) => e.isFile())
        .map((e) => {
          const path = join(e.parentPath, e.name);
          return [relative(home, path), statSync(path).mtimeMs];
        })
        .sort(),
  };
}

describe("bootstrap", () => {
  it("exits 2 naming the missing prerequisites, writing nothing", () => {
    const m = machine({ git: false, harness: false });
    expect(m.run(["bootstrap", "--owner", "me"])).toEqual({
      code: 2,
      out: "bootstrap error: missing prerequisites: git, a harness (test-harness)\n",
    });
    expect(readdirSync(m.home)).toEqual([]);
  });

  it("adds owners, links ~/.local/bin/agentfiles, runs doctor --fix; a second run changes nothing", () => {
    const m = machine();
    const first = m.run(["bootstrap", "--owner", "me", "--owner", "Org"]);
    expect(first.code).toBe(0);
    expect(first.out).toContain(
      'agentfiles ~/.config/agentfiles/config.json owners[] "me" missing, written\n',
    );
    expect(first.out).toContain(
      "agentfiles ~/.local/bin/agentfiles missing, written\n",
    );
    expect(first.out).toContain(
      "agentfiles ~/.config/agentfiles/instructions.md missing, written\n",
    );
    expect(
      JSON.parse(readFileSync(m.at(".config/agentfiles/config.json"), "utf8")),
    ).toEqual({
      owners: ["me", "Org"],
    });
    expect(lstatSync(m.at(".local/bin/agentfiles")).isSymbolicLink()).toBe(
      true,
    );
    expect(readlinkSync(m.at(".local/bin/agentfiles"))).toBe(
      join(m.root, "bin", "agentfiles.js"),
    );

    const before = m.tree();
    const second = m.run(["bootstrap", "--owner", "ME"]);
    expect(second.code).toBe(0);
    expect(second.out).not.toMatch(/written|updated|removed|installed/);
    expect(m.tree()).toEqual(before);
    expect(m.run(["doctor"]).code).toBe(0);
  });

  it("keeps listed owners and appends new ones", () => {
    const m = machine();
    mkdirSync(m.at(".config/agentfiles"), { recursive: true });
    writeFileSync(m.at(".config/agentfiles/config.json"), '{"owners": ["a"]}');
    m.run(["bootstrap", "--owner", "b", "--owner", "A", "--owner", "B"]);
    expect(
      JSON.parse(readFileSync(m.at(".config/agentfiles/config.json"), "utf8")),
    ).toEqual({
      owners: ["a", "b"],
    });
  });

  it("exits 2 when config.json doesn't parse", () => {
    const m = machine();
    mkdirSync(m.at(".config/agentfiles"), { recursive: true });
    writeFileSync(m.at(".config/agentfiles/config.json"), "{");
    const result = m.run(["bootstrap", "--owner", "me"]);
    expect(result.code).toBe(2);
    expect(result.out).toMatch(/^bootstrap error: .*config\.json: /);
  });

  it("reports another file at ~/.local/bin/agentfiles and leaves it", () => {
    const m = machine();
    mkdirSync(m.at(".local/bin"), { recursive: true });
    writeFileSync(m.at(".local/bin/agentfiles"), "mine");
    const result = m.run(["bootstrap"]);
    expect(result.code).toBe(0);
    expect(result.out).toContain(
      `agentfiles ~/.local/bin/agentfiles conflict: not a link to ${join(m.root, "bin", "agentfiles.js")}; left alone\n`,
    );
    expect(readFileSync(m.at(".local/bin/agentfiles"), "utf8")).toBe("mine");
  });

  it("says when ~/.local/bin isn't on PATH, and only then", () => {
    const m = machine();
    const line =
      "agentfiles ~/.local/bin is not on PATH; add it to run agentfiles\n";
    expect(m.run(["bootstrap"]).out).toContain(line);
    expect(
      m.run(["bootstrap"], {
        PATH: `${m.env.PATH ?? ""}:${m.at(".local/bin")}`,
      }).out,
    ).not.toContain(line);
  });
});
