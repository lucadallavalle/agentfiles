import { execFileSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Env } from "../core/files.js";
import { testAdapter } from "../core/test-adapter.js";
import { run } from "./index.js";

const repo = fileURLToPath(new URL("../..", import.meta.url));

/**
 * A temp dir holding a copy of `config/` and one common documentation file
 * (the root) and a home with the variables from "Harnesses and paths"
 * pointing into it.
 */
function fakeHome(harness: "dir" | "binary" | "none" = "dir") {
  const base = mkdtempSync(join(tmpdir(), "agentfiles-cli-"));
  const root = join(base, "repo");
  const home = join(base, "home");
  cpSync(join(repo, "config"), join(root, "config"), { recursive: true });
  mkdirSync(join(root, "docs", "documentation"), { recursive: true });
  writeFileSync(join(root, "docs", "documentation", "README.md"), "# Docs\n");
  const bin = join(base, "bin");
  mkdirSync(bin);
  mkdirSync(home);
  if (harness === "dir") mkdirSync(join(home, ".test-harness"));
  if (harness === "binary") {
    writeFileSync(join(bin, "test-harness"), "#!/bin/sh\n");
    chmodSync(join(bin, "test-harness"), 0o755);
  }
  const env: Record<string, string> = {
    HOME: home,
    XDG_CONFIG_HOME: join(home, ".config"),
    XDG_STATE_HOME: join(home, ".local", "state"),
    PATH: bin,
  };
  const at = (path: string) => join(home, path);
  return {
    home,
    root,
    env,
    at,
    read: (path: string) =>
      existsSync(at(path)) ? readFileSync(at(path), "utf8") : undefined,
    json: (path: string): unknown => JSON.parse(readFileSync(at(path), "utf8")),
    write: (path: string, text: string) => {
      mkdirSync(dirname(at(path)), { recursive: true });
      writeFileSync(at(path), text);
    },
    ship: (file: string, value: unknown) => {
      writeFileSync(
        join(root, "config", file),
        typeof value === "string" ? value : JSON.stringify(value),
      );
    },
    run: (args: string[], over: Env = env, cwd = base) => {
      let out = "";
      let err = "";
      const code = run(args, {
        root,
        env: over,
        cwd,
        adapters: [testAdapter],
        output: {
          out: (text) => (out += text),
          err: (text) => (err += text),
        },
      });
      return { code, out, err };
    },
    /** Every file under the home with its content and mtime. */
    tree: () =>
      (
        readdirSync(home, { recursive: true, withFileTypes: true }) as {
          parentPath: string;
          name: string;
          isFile(): boolean;
        }[]
      )
        .filter((entry) => entry.isFile())
        .map((entry) => {
          const path = join(entry.parentPath, entry.name);
          return [
            relative(home, path),
            readFileSync(path, "utf8"),
            statSync(path).mtimeMs,
          ];
        })
        .sort(),
  };
}

const settings = ".test-harness/settings.json";
const instructions = ".config/agentfiles/instructions.md";
const shipped = readFileSync(join(repo, "config", "instructions.md"), "utf8");
const allow = (
  JSON.parse(
    readFileSync(join(repo, "config", "permissions.json"), "utf8"),
  ) as {
    allow: string[];
  }
).allow;

describe("agentfiles", () => {
  it("prints help and exits 0", () => {
    const { code, out } = fakeHome().run(["--help"]);
    expect(code).toBe(0);
    expect(out).toContain("doctor");
  });

  it("exits 2 on a usage error", () => {
    const h = fakeHome();
    expect(h.run([]).code).toBe(2);
    expect(h.run(["nope"]).code).toBe(2);
    expect(h.run(["doctor", "--nope"]).code).toBe(2);
  });
});

describe("doctor --fix", () => {
  it("writes the shipped config, then a second run changes nothing", () => {
    const h = fakeHome();
    h.ship("test-harness.json", { theme: "dark" });
    h.write(
      settings,
      '{"foreign": {"keep": true}, "permissions": {"allow": ["mine"]}}',
    );

    const fix = h.run(["doctor", "--fix"]);
    expect(fix.code).toBe(0);
    expect(fix.out).toContain(
      `agentfiles ~/${instructions} missing, written\n`,
    );
    expect(fix.out).toContain(
      "test-harness ~/.test-harness/settings.json theme missing, written\n",
    );
    expect(h.read(instructions)).toBe(shipped);
    expect(h.read(".test-harness/rules/agentfiles.md")).toBe(
      `@~/${instructions}\n`,
    );
    expect(h.json(settings)).toEqual({
      foreign: { keep: true },
      permissions: { allow: ["mine", ...allow.map((p) => `Shell(${p})`)] },
      theme: "dark",
      rules: allow.map((resource) => ({ resource, effect: "allow" })),
    });
    expect(existsSync(h.at(".local/state/agentfiles/state.json"))).toBe(true);

    const before = h.tree();
    const again = h.run(["doctor", "--fix"]);
    expect(again.code).toBe(0);
    expect(h.tree()).toEqual(before);

    const check = h.run(["doctor"]);
    const total = 4 + 2 * allow.length;
    expect(check).toEqual({
      code: 0,
      out: `${String(total)} entries: ${String(total)} in sync\n`,
      err: "",
    });
  });

  it("orders first-placed rules allow, ask, deny, before the user's", () => {
    const h = fakeHome();
    h.ship("permissions.json", { allow: ["a"], ask: ["b"], deny: ["c"] });
    h.write(settings, '{"rules": [{"resource": "mine", "effect": "deny"}]}');
    h.run(["doctor", "--fix"]);
    expect((h.json(settings) as { rules: unknown }).rules).toEqual([
      { resource: "a", effect: "allow" },
      { resource: "b", effect: "ask" },
      { resource: "c", effect: "deny" },
      { resource: "mine", effect: "deny" },
    ]);
  });
});

describe("doctor", () => {
  it("reports missing entries and writes nothing", () => {
    const h = fakeHome();
    const result = h.run(["doctor"]);
    expect(result.code).toBe(1);
    expect(result.out).toContain(`agentfiles ~/${instructions} missing\n`);
    expect(result.out).toMatch(/\d+ entries: \d+ missing\n$/);
    expect(h.tree()).toEqual([]);
  });

  it("updates outdated entries", () => {
    const h = fakeHome();
    h.ship("test-harness.json", { theme: "dark" });
    h.run(["doctor", "--fix"]);
    h.ship("test-harness.json", { theme: "light" });
    h.ship("instructions.md", "- new\n");

    const check = h.run(["doctor"]);
    expect(check.code).toBe(1);
    expect(check.out).toContain(`agentfiles ~/${instructions} outdated\n`);
    expect(check.out).toContain(
      "test-harness ~/.test-harness/settings.json theme outdated\n",
    );
    expect(h.run(["doctor", "--fix"]).out).toContain("theme outdated, updated");
    expect(h.read(instructions)).toBe("- new\n");
    expect((h.json(settings) as { theme: string }).theme).toBe("light");
    expect(h.run(["doctor"]).code).toBe(0);
  });

  it("reports an edited entry and --fix leaves it alone", () => {
    const h = fakeHome();
    h.ship("test-harness.json", { theme: "dark" });
    h.run(["doctor", "--fix"]);
    h.write(instructions, "mine\n");
    const doc = h.json(settings) as Record<string, unknown>;
    h.write(
      settings,
      JSON.stringify({ ...doc, theme: "mine", permissions: { allow: [] } }),
    );

    const check = h.run(["doctor"]);
    expect(check.code).toBe(1);
    expect(check.out).toContain(
      `agentfiles ~/${instructions} edited: shipped ${join(h.root, "config", "instructions.md")}; restore it\n`,
    );
    expect(check.out).toContain(
      'test-harness ~/.test-harness/settings.json theme edited: shipped "dark"; restore it\n',
    );
    expect(check.out).toContain(
      `test-harness ~/.test-harness/settings.json permissions.allow[] "Shell(git status)" edited`,
    );

    const fix = h.run(["doctor", "--fix"]);
    expect(fix.code).toBe(0);
    expect(fix.out).toContain("theme edited");
    expect(h.read(instructions)).toBe("mine\n");
    expect(h.json(settings)).toMatchObject({
      theme: "mine",
      permissions: { allow: [] },
    });

    // Restoring the value brings it back in sync.
    h.write(instructions, shipped);
    expect(h.run(["doctor"]).out).not.toContain(instructions);
  });

  it("removes unshipped entries only while unchanged", () => {
    const h = fakeHome();
    h.ship("test-harness.json", { theme: "dark", font: "mono" });
    h.run(["doctor", "--fix"]);
    h.ship("test-harness.json", {});
    h.ship("permissions.json", { allow: ["git status"], ask: [], deny: [] });
    const doc = h.json(settings) as Record<string, unknown>;
    h.write(settings, JSON.stringify({ ...doc, font: "serif" }));

    const check = h.run(["doctor"]);
    expect(check.out).toContain(
      "test-harness ~/.test-harness/settings.json theme unshipped\n",
    );
    expect(check.out).toContain(
      "test-harness ~/.test-harness/settings.json font edited: no longer shipped; remove it\n",
    );
    expect(h.run(["doctor", "--fix"]).code).toBe(0);
    expect(h.json(settings)).toEqual({
      font: "serif",
      permissions: { allow: ["Shell(git status)"] },
      rules: [{ resource: "git status", effect: "allow" }],
    });

    // Once the user removes it, it's forgotten.
    h.write(
      settings,
      JSON.stringify({ ...(h.json(settings) as object), font: undefined }),
    );
    expect(h.run(["doctor"]).code).toBe(0);
  });

  it("removes entries whose location is no longer a target", () => {
    const h = fakeHome();
    h.run(["doctor", "--fix"]);
    const env = { ...h.env, XDG_CONFIG_HOME: join(h.home, "elsewhere") };
    const fix = h.run(["doctor", "--fix"], env);
    expect(fix.out).toContain(
      `agentfiles ~/${instructions} unshipped, removed`,
    );
    expect(h.read(instructions)).toBeUndefined();
    expect(h.read("elsewhere/agentfiles/instructions.md")).toBe(shipped);
    expect(h.read(".test-harness/rules/agentfiles.md")).toBe(
      "@~/elsewhere/agentfiles/instructions.md\n",
    );
  });

  it("keeps the machine copy of the common documentation", () => {
    const h = fakeHome();
    const docs = join(h.root, "docs", "documentation");
    expect(h.run(["doctor", "--fix"]).out).toContain(
      "agentfiles ~/.config/agentfiles/documentation/README.md missing, written\n",
    );
    expect(h.read(".config/agentfiles/documentation/README.md")).toBe(
      "# Docs\n",
    );

    mkdirSync(join(docs, "sub"));
    writeFileSync(join(docs, "sub", "new.md"), "new\n");
    writeFileSync(join(docs, "README.md"), "# Docs v2\n");
    h.write(".config/agentfiles/documentation/README.md", "# Docs\n");
    const fix = h.run(["doctor", "--fix"]);
    expect(fix.out).toContain(
      "agentfiles ~/.config/agentfiles/documentation/README.md outdated, updated\n",
    );
    expect(fix.out).toContain(
      "agentfiles ~/.config/agentfiles/documentation/sub/new.md missing, written\n",
    );

    rmSync(join(docs, "sub"), { recursive: true });
    h.write(".config/agentfiles/documentation/README.md", "mine\n");
    const check = h.run(["doctor", "--fix"]);
    expect(check.out).toContain(
      "agentfiles ~/.config/agentfiles/documentation/sub/new.md unshipped, removed\n",
    );
    expect(check.out).toContain(
      `agentfiles ~/.config/agentfiles/documentation/README.md edited: shipped ${join(docs, "README.md")}; restore it\n`,
    );
    expect(h.read(".config/agentfiles/documentation/README.md")).toBe("mine\n");
  });

  it("names the instructions copy by absolute path outside HOME", () => {
    const h = fakeHome();
    const outside = mkdtempSync(join(tmpdir(), "agentfiles-xdg-"));
    h.run(["doctor", "--fix"], { ...h.env, XDG_CONFIG_HOME: outside });
    expect(h.read(".test-harness/rules/agentfiles.md")).toBe(
      `@${join(outside, "agentfiles", "instructions.md")}\n`,
    );
  });
});

describe("repo", () => {
  it("reports the common documentation copies of an owned repo; --fix writes them", () => {
    const h = fakeHome();
    const env = {
      ...h.env,
      PATH: `${h.at("../bin")}:${process.env.PATH ?? ""}`,
    };
    const repo = h.at("x");
    mkdirSync(repo);
    // Only this env: a git hook's GIT_DIR would point git at this checkout.
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: repo, env, stdio: "ignore" });
    git("init", "-q");
    git("remote", "add", "origin", "git@github.com:me/x.git");
    h.run(["doctor", "--fix"]);

    // Not an owner yet: foreign, silent.
    expect(h.run(["doctor"], env, repo)).toMatchObject({ code: 0 });
    h.write(".config/agentfiles/config.json", '{"owners": ["me"]}');
    const check = h.run(["doctor"], env, repo);
    expect(check.code).toBe(1);
    expect(check.out).toContain("repo docs/documentation/README.md missing\n");
    expect(h.run(["doctor", "--fix"], env, repo).out).toContain(
      "repo docs/documentation/README.md missing, written\n",
    );
    expect(h.read("x/docs/documentation/README.md")).toBe("# Docs\n");

    h.write("x/docs/documentation/README.md", "mine\n");
    expect(h.run(["doctor"], env, repo)).toMatchObject({ code: 1 });
    const fix = h.run(["doctor", "--fix"], env, repo);
    expect(fix.code).toBe(0);
    expect(fix.out).toContain("repo docs/documentation/README.md edited\n");
    expect(h.read("x/docs/documentation/README.md")).toBe("mine\n");
  });

  it("exits 2 when config.json doesn't parse, after the other groups", () => {
    const h = fakeHome();
    h.write(".config/agentfiles/config.json", "{");
    const fix = h.run(["doctor", "--fix"]);
    expect(fix.code).toBe(2);
    expect(fix.out).toMatch(/^repo error: .*config\.json: /m);
    expect(h.read(instructions)).toBe(shipped);
  });
});

describe("harnesses", () => {
  it("skips a harness that isn't installed", () => {
    const h = fakeHome("none");
    const fix = h.run(["doctor", "--fix"]);
    expect(fix.out).toContain("test-harness not installed, skipped\n");
    expect(fix.out).toContain("2 entries: 2 fixed\n");
    expect(existsSync(h.at(".test-harness"))).toBe(false);
    expect(h.run(["doctor"]).code).toBe(0);
  });

  it("creates the directory of a harness found only on PATH", () => {
    const h = fakeHome("binary");
    expect(h.run(["doctor", "--fix"]).code).toBe(0);
    expect(h.read(".test-harness/rules/agentfiles.md")).toBeDefined();
  });
});

describe("error paths", () => {
  it("skips a harness whose file doesn't parse, runs the others, exits 2", () => {
    const h = fakeHome();
    h.write(settings, "{ not json");
    const fix = h.run(["doctor", "--fix"]);
    expect(fix.code).toBe(2);
    expect(fix.out).toContain(`test-harness error: ${h.at(settings)}: `);
    expect(h.read(settings)).toBe("{ not json");
    expect(h.read(".test-harness/rules/agentfiles.md")).toBeUndefined();
    expect(h.read(instructions)).toBe(shipped);
    expect(h.run(["doctor"]).code).toBe(2);
  });

  it("writes nothing when the state file doesn't parse", () => {
    const h = fakeHome();
    h.write(".local/state/agentfiles/state.json", "{");
    const fix = h.run(["doctor", "--fix"]);
    expect(fix.code).toBe(2);
    expect(fix.out).toMatch(/^agentfiles error: .*state\.json: /);
    expect(h.tree()).toHaveLength(1);
  });

  it("without a state file, adopts equal values and reports different ones", () => {
    const h = fakeHome();
    h.ship("test-harness.json", { theme: "dark", font: "mono" });
    h.write(instructions, shipped);
    h.write(settings, '{"theme": "dark", "font": "serif"}');
    const check = h.run(["doctor"]);
    expect(check.out).not.toContain(instructions);
    expect(check.out).not.toContain(" theme ");
    expect(check.out).toContain(
      'font conflict: shipped "mono"; set it, or remove yours and run doctor --fix\n',
    );
    h.run(["doctor", "--fix"]);
    expect((h.json(settings) as { font: string }).font).toBe("serif");

    // An interrupted run (files written, no state) is adopted the same way.
    rmSync(h.at(".local/state/agentfiles/state.json"));
    expect(h.run(["doctor"]).out).not.toContain(" theme ");
  });

  it("writes through a symlink, so the link survives", () => {
    const h = fakeHome();
    h.write("dotfiles/settings.json", "{}");
    symlinkSync(h.at("dotfiles/settings.json"), h.at(settings));
    h.run(["doctor", "--fix"]);
    expect(lstatSync(h.at(settings)).isSymbolicLink()).toBe(true);
    expect(h.json("dotfiles/settings.json")).toHaveProperty("rules");
  });

  it("keeps the file mode and leaves no temp file", () => {
    const h = fakeHome();
    h.write(settings, "{}");
    chmodSync(h.at(settings), 0o600);
    h.run(["doctor", "--fix"]);
    expect(statSync(h.at(settings)).mode & 0o777).toBe(0o600);
    expect(readdirSync(h.at(".test-harness"))).toEqual([
      "rules",
      "settings.json",
    ]);
  });

  it("exits 2 without HOME", () => {
    const h = fakeHome();
    expect(h.run(["doctor"], { PATH: "" })).toMatchObject({
      code: 2,
      out: "agentfiles error: HOME is not set\n",
    });
  });
});
