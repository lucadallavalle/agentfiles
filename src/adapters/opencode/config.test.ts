import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { run } from "../../cli/index.js";
import { jsonc } from "../../core/jsonc.js";
import { canonical } from "../../core/tracked.js";
import { opencode } from "./config.js";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const allow = (
  JSON.parse(readFileSync(join(root, "config/permissions.json"), "utf8")) as {
    allow: string[];
  }
).allow;
const ours = allow.map((prefix) => ({
  action: "shell",
  resource: `${prefix} *`,
  effect: "allow",
}));

function fakeHome() {
  const home = mkdtempSync(join(tmpdir(), "agentfiles-opencode-"));
  const dir = join(home, ".config", "opencode");
  mkdirSync(dir, { recursive: true });
  const env = {
    HOME: home,
    XDG_CONFIG_HOME: join(home, ".config"),
    XDG_STATE_HOME: join(home, ".local", "state"),
    PATH: "",
  };
  return {
    dir,
    doctor: (...args: string[]) => {
      let out = "";
      const code = run(["doctor", ...args], {
        root,
        env,
        cwd: home,
        adapters: [opencode],
        output: { out: (text) => (out += text), err: () => undefined },
      });
      return { code, out };
    },
    read: (file: string) => readFileSync(join(dir, file), "utf8"),
    write: (file: string, text: string) => {
      writeFileSync(join(dir, file), text);
    },
  };
}

const user = `{
  // my setup
  "plugins": ["github:someone/plugin"],
  "instructions": ["~/notes/AGENTS.md"],
  "permissions": [
    { "action": "shell", "resource": "rm *", "effect": "deny" }, // mine
  ],
}
`;

describe("opencode adapter", () => {
  it("adds our rules first, allow, ask, deny, keeping the user's entries and comments", () => {
    const h = fakeHome();
    h.write("opencode.json", user);
    expect(h.doctor("--fix").code).toBe(0);
    const text = h.read("opencode.json");
    expect(text).toContain("// my setup");
    expect(text).toContain("// mine");
    expect(jsonc.parse(text)).toEqual({
      plugins: ["github:someone/plugin"],
      instructions: [
        "~/notes/AGENTS.md",
        "~/.config/agentfiles/instructions.md",
      ],
      permissions: [
        ...ours,
        { action: "shell", resource: "rm *", effect: "deny" },
      ],
    });

    // No git on PATH: no CLI commit, so plugin drift is one skip line.
    expect(h.doctor("--fix").out).toMatch(
      /^plugins skipped: the CLI doesn't run from a git clone\n\d+ entries: \d+ in sync\n$/,
    );
    expect(h.read("opencode.json")).toBe(text);
  });

  it("orders ask and deny after allow", () => {
    const h = fakeHome();
    const base = mkdtempSync(join(tmpdir(), "agentfiles-opencode-root-"));
    mkdirSync(join(base, "config"));
    mkdirSync(join(base, "docs", "documentation"), { recursive: true });
    for (const file of [
      "instructions.md",
      "opencode.json",
      "documentation-hashes.json",
    ])
      writeFileSync(
        join(base, "config", file),
        readFileSync(join(root, "config", file)),
      );
    writeFileSync(
      join(base, "config", "permissions.json"),
      '{"allow": ["git log"], "ask": ["gh pr merge"], "deny": ["rm"]}',
    );
    run(["doctor", "--fix"], {
      root: base,
      cwd: base,
      env: {
        HOME: join(h.dir, "..", ".."),
        XDG_CONFIG_HOME: join(h.dir, ".."),
        XDG_STATE_HOME: join(h.dir, "..", "..", "state"),
        PATH: "",
      },
      adapters: [opencode],
      output: { out: () => undefined, err: () => undefined },
    });
    expect(
      (jsonc.parse(h.read("opencode.json")) as { permissions: unknown })
        .permissions,
    ).toEqual([
      { action: "shell", resource: "git log *", effect: "allow" },
      { action: "shell", resource: "gh pr merge *", effect: "ask" },
      { action: "shell", resource: "rm *", effect: "deny" },
    ]);
  });

  it("writes opencode.jsonc when it's the only file, else creates opencode.json", () => {
    const only = fakeHome();
    only.write("opencode.jsonc", "{}\n");
    only.doctor("--fix");
    expect(existsSync(join(only.dir, "opencode.json"))).toBe(false);
    expect(jsonc.parse(only.read("opencode.jsonc"))).toHaveProperty(
      "permissions",
    );

    const none = fakeHome();
    none.doctor("--fix");
    expect(jsonc.parse(none.read("opencode.json"))).toHaveProperty(
      "instructions",
    );
  });

  it("reports a removed rule as edited and doesn't re-add it", () => {
    const h = fakeHome();
    h.doctor("--fix");
    const doc = jsonc.parse(h.read("opencode.json")) as {
      permissions: unknown[];
    };
    const edited = jsonc.remove(h.read("opencode.json"), ["permissions", 0]);
    h.write("opencode.json", edited);
    expect(doc.permissions).toHaveLength(allow.length);
    const check = h.doctor();
    expect(check.code).toBe(1);
    expect(check.out).toContain(`permissions[] ${canonical(ours[0])} edited`);
    expect(h.doctor("--fix").code).toBe(0);
    expect(h.read("opencode.json")).toBe(edited);
  });
});
