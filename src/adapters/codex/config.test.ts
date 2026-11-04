import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";
import { describe, expect, it } from "vitest";
import { run } from "../../cli/index.js";
import { codex } from "./config.js";
import { toml } from "./toml.js";

const repo = fileURLToPath(new URL("../../..", import.meta.url));
const key = ["developer_instructions"];

describe("toml splice", () => {
  const user = `# my settings
model = "o3"

# my server
[mcp_servers.docs]
command = "docs"
`;

  it("inserts a top-level key before the first table and its comments", () => {
    const out = toml.set(user, key, "- a\n- b\n");
    expect(out).toBe(`# my settings
model = "o3"

developer_instructions = '''
- a
- b
'''
# my server
[mcp_servers.docs]
command = "docs"
`);
    expect(parse(out)).toMatchObject({ developer_instructions: "- a\n- b\n" });
  });

  it("writes into an empty file and one without tables", () => {
    expect(toml.set("", ["n"], 1)).toBe("n = 1\n");
    expect(toml.set('a = "x"', ["n"], 1)).toBe('a = "x"\nn = 1\n');
  });

  it("updates and removes only the exact text it wrote", () => {
    const first = toml.written?.(key, "old\n") ?? "";
    const text = toml.set(user, key, "old\n");
    const updated = toml.set(text, key, "new\n", first);
    expect(parse(updated)).toMatchObject({ developer_instructions: "new\n" });
    expect(toml.remove(updated, key, toml.written?.(key, "new\n"))).toBe(user);
  });

  it("refuses when the text it wrote is gone", () => {
    const reformatted = `developer_instructions = "old\\n"\n${user}`;
    const previous = toml.written?.(key, "old\n");
    expect(() => toml.set(reformatted, key, "new\n", previous)).toThrow(
      "can't update safely",
    );
    expect(() => toml.remove(reformatted, key, previous)).toThrow(
      "can't update safely",
    );
  });

  it("writes nothing when the splice would change anything else", () => {
    const tricky = 'x = """\n[not a table]\n"""\n';
    expect(() => toml.set(tricky, ["n"], 1)).toThrow("nothing written");
  });

  it("splices only bare top-level keys with non-table values", () => {
    expect(() => toml.set("", ["a", "b"], 1)).toThrow("top-level");
    expect(() => toml.set("", ["a"], { b: 1 })).toThrow("tables");
  });
});

function fakeHome() {
  const base = mkdtempSync(join(tmpdir(), "agentfiles-codex-"));
  const root = join(base, "repo");
  cpSync(join(repo, "config"), join(root, "config"), { recursive: true });
  const home = join(base, "home");
  const dir = join(home, ".codex");
  mkdirSync(dir, { recursive: true });
  const env = {
    HOME: home,
    CODEX_HOME: dir,
    XDG_CONFIG_HOME: join(home, ".config"),
    XDG_STATE_HOME: join(home, ".local", "state"),
    PATH: "",
  };
  const settings = join(dir, "config.toml");
  return {
    dir,
    root,
    doctor: (...args: string[]) => {
      let out = "";
      const code = run(["doctor", ...args], {
        root,
        env,
        adapters: [codex],
        output: { out: (text) => (out += text), err: () => undefined },
      });
      return { code, out };
    },
    text: () => readFileSync(settings, "utf8"),
    write: (text: string) => {
      writeFileSync(settings, text);
    },
  };
}

const shipped = readFileSync(join(repo, "config/instructions.md"), "utf8");
const user = `# mine
model = "o3"

[projects."/work"]
trust_level = "trusted"
`;

describe("codex adapter", () => {
  it("writes developer_instructions and rules/agentfiles.rules", () => {
    const h = fakeHome();
    h.write(user);
    expect(h.doctor("--fix").code).toBe(0);
    expect(h.text()).toContain("# mine");
    expect(parse(h.text())).toEqual({
      model: "o3",
      developer_instructions: shipped,
      projects: { "/work": { trust_level: "trusted" } },
    });
    const rules = readFileSync(
      join(h.dir, "rules", "agentfiles.rules"),
      "utf8",
    );
    expect(rules).toContain(
      'prefix_rule(pattern = ["git", "status"], decision = "allow")\n',
    );
    expect(rules).toContain(
      'prefix_rule(pattern = ["spiral-review"], decision = "allow")\n',
    );

    const before = h.text();
    expect(h.doctor("--fix").out).toBe("3 entries: 3 in sync\n");
    expect(h.text()).toBe(before);
  });

  it("maps ask and deny to prompt and forbidden", () => {
    const h = fakeHome();
    writeFileSync(
      join(h.root, "config/permissions.json"),
      '{"allow": [], "ask": ["gh pr merge"], "deny": ["rm"]}',
    );
    h.doctor("--fix");
    expect(readFileSync(join(h.dir, "rules", "agentfiles.rules"), "utf8"))
      .toBe(`# Written by agentfiles doctor --fix; edits are reported, not overwritten.
prefix_rule(pattern = ["gh", "pr", "merge"], decision = "prompt")
prefix_rule(pattern = ["rm"], decision = "forbidden")
`);
  });

  it("updates outdated instructions by their exact text", () => {
    const h = fakeHome();
    h.write(user);
    h.doctor("--fix");
    writeFileSync(join(h.root, "config/instructions.md"), "- new\n");
    expect(h.doctor().out).toContain("developer_instructions outdated");
    expect(h.doctor("--fix").code).toBe(0);
    expect(parse(h.text())).toMatchObject({
      developer_instructions: "- new\n",
    });
  });

  it("reports an edit and doesn't overwrite it", () => {
    const h = fakeHome();
    h.doctor("--fix");
    h.write(`developer_instructions = "mine"\n`);
    expect(h.doctor().out).toContain("developer_instructions edited");
    expect(h.doctor("--fix").code).toBe(0);
    expect(h.text()).toBe(`developer_instructions = "mine"\n`);
  });

  it("can't update a reformatted value: reports it, writes nothing", () => {
    const h = fakeHome();
    h.doctor("--fix");
    const reformatted = `developer_instructions = ${JSON.stringify(shipped)}\n`;
    h.write(reformatted);
    expect(h.doctor().code).toBe(0);
    writeFileSync(join(h.root, "config/instructions.md"), "- new\n");
    const fix = h.doctor("--fix");
    expect(fix.code).toBe(2);
    expect(fix.out).toContain("can't update safely");
    expect(h.text()).toBe(reformatted);
  });

  it("honors CODEX_HOME", () => {
    const h = fakeHome();
    h.doctor("--fix");
    expect(existsSync(join(h.dir, "config.toml"))).toBe(true);
  });
});
