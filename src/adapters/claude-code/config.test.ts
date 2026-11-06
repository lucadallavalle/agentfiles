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
import { claudeCode } from "./config.js";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const allow = (
  JSON.parse(readFileSync(join(root, "config/permissions.json"), "utf8")) as {
    allow: string[];
  }
).allow;

function fakeHome(configDir = ".claude") {
  const home = mkdtempSync(join(tmpdir(), "agentfiles-claude-"));
  const dir = join(home, configDir);
  mkdirSync(dir, { recursive: true });
  const env = {
    HOME: home,
    CLAUDE_CONFIG_DIR: dir,
    XDG_CONFIG_HOME: join(home, ".config"),
    XDG_STATE_HOME: join(home, ".local", "state"),
    PATH: "",
  };
  const doctor = (...args: string[]) => {
    let out = "";
    const code = run(["doctor", ...args], {
      root,
      env,
      cwd: home,
      adapters: [claudeCode],
      output: { out: (text) => (out += text), err: () => undefined },
    });
    return { code, out };
  };
  const settings = join(dir, "settings.json");
  return {
    dir,
    settings,
    doctor,
    text: () => readFileSync(settings, "utf8"),
    write: (text: string) => {
      writeFileSync(settings, text);
    },
  };
}

const user = `{
  // my model
  "model": "opus",
  "permissions": {
    "allow": ["Read(~/notes/**)"],
    "defaultMode": "plan"
  }
}
`;

describe("claude-code adapter", () => {
  it("merges the shipped config into settings.json and rules/", () => {
    const h = fakeHome();
    h.write(user);
    expect(h.doctor("--fix").code).toBe(0);

    expect(readFileSync(join(h.dir, "rules", "agentfiles.md"), "utf8")).toBe(
      "@~/.config/agentfiles/instructions.md\n",
    );
    expect(h.text()).toContain("// my model");
    expect(jsonc.parse(h.text())).toEqual({
      model: "opus",
      permissions: {
        allow: ["Read(~/notes/**)", ...allow.map((p) => `Bash(${p} *)`)],
        defaultMode: "plan",
      },
      attribution: { commit: "", pr: "", sessionUrl: false },
    });

    const before = h.text();
    expect(h.doctor("--fix").out).toMatch(/^\d+ entries: \d+ in sync\n$/);
    expect(h.text()).toBe(before);
    expect(h.doctor().code).toBe(0);
  });

  it("stays in sync when Claude Code reformats settings.json", () => {
    const h = fakeHome();
    h.doctor("--fix");
    h.write(JSON.stringify(jsonc.parse(h.text())));
    expect(h.doctor().code).toBe(0);
  });

  it("reports an edited entry without overwriting it", () => {
    const h = fakeHome();
    h.doctor("--fix");
    const edited = jsonc.set(h.text(), ["attribution", "commit"], "mine");
    h.write(edited);

    const check = h.doctor();
    expect(check.code).toBe(1);
    expect(check.out).toContain(
      `claude-code ${h.settings.replace(/^.*\/\.claude/, "~/.claude")} attribution edited: shipped {"commit":"","pr":"","sessionUrl":false}; restore it\n`,
    );
    expect(h.doctor("--fix").code).toBe(0);
    expect(h.text()).toBe(edited);
  });

  it("honors CLAUDE_CONFIG_DIR", () => {
    const h = fakeHome("elsewhere");
    h.doctor("--fix");
    expect(existsSync(join(h.dir, "rules", "agentfiles.md"))).toBe(true);
    expect(existsSync(h.settings)).toBe(true);
  });
});
