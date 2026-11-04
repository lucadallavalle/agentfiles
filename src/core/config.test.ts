import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readConfig } from "./config.js";

const repo = fileURLToPath(new URL("../..", import.meta.url));

function copy(): string {
  const root = mkdtempSync(join(tmpdir(), "agentfiles-config-"));
  cpSync(join(repo, "config"), join(root, "config"), { recursive: true });
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
