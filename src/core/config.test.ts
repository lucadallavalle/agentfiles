import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readConfig } from "./config.js";

const repo = fileURLToPath(new URL("../..", import.meta.url));

function copy(): string {
  const root = mkdtempSync(join(tmpdir(), "agentfiles-config-"));
  cpSync(join(repo, "config"), join(root, "config"), { recursive: true });
  mkdirSync(join(root, "docs", "documentation", "sub"), { recursive: true });
  writeFileSync(join(root, "docs", "documentation", "b.md"), "b\n");
  writeFileSync(join(root, "docs", "documentation", "sub", "a.md"), "a\n");
  return root;
}

describe("config/", () => {
  it("is valid", () => {
    const config = readConfig(repo, ["claude-code", "codex", "opencode"]);
    expect(config.instructions).toContain("succinct");
    expect(config.permissions.allow).toContain("git status");
  });

  it("reads a harness's keys, none without its file", () => {
    const root = copy();
    writeFileSync(join(root, "config", "h.json"), '{"theme": "dark"}');
    expect(readConfig(root, ["h", "other"]).keys).toEqual({
      h: { theme: "dark" },
      other: {},
    });
  });

  it("reads the common documentation, nested files by /-separated name", () => {
    const root = copy();
    expect(readConfig(root, []).documentation).toEqual([
      {
        name: "b.md",
        text: "b\n",
        source: join(root, "docs", "documentation", "b.md"),
      },
      {
        name: "sub/a.md",
        text: "a\n",
        source: join(root, "docs", "documentation", "sub", "a.md"),
      },
    ]);
  });

  it("requires the common documentation", () => {
    const root = copy();
    rmSync(join(root, "docs"), { recursive: true });
    expect(() => readConfig(root, [])).toThrow(/documentation/);
  });

  it.each([
    ["permissions.json", '{"allow": ["git"], "ask": [], "deny": ["git"]}'],
    ["permissions.json", '{"allow": [""], "ask": [], "deny": []}'],
    ["permissions.json", '{"allow": []}'],
    ["h.json", "[1]"],
    ["instructions.md", "\n"],
  ])("rejects an invalid %s: %s", (file, text) => {
    const root = copy();
    writeFileSync(join(root, "config", file), text);
    expect(() => readConfig(root, ["h"])).toThrow();
  });
});
