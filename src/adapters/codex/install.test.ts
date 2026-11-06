import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readPluginMetadata } from "../../core/plugin.js";
import { pluginDrift } from "../../core/plugins.js";
import { codexPlugin } from "./install.js";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const commit = "abcdef0123456789abcdef0123456789abcdef01";
const other = "1234567890abcdef1234567890abcdef12345678";

/**
 * A stub `codex` that records its arguments and behaves as 0.163.0 did:
 * `config.toml` holds the marketplace's `ref` and the plugin's table; a
 * plugin is installed at the marketplace's commit when added and stays
 * there when the marketplace moves.
 */
const stub = `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const dir = process.env.CODEX_HOME;
const file = path.join(dir, "state.json");
const s = JSON.parse(fs.readFileSync(file, "utf8"));
const args = process.argv.slice(2).join(" ");
fs.appendFileSync(path.join(dir, "log"), args + "\\n");
const fail = (m) => { process.stderr.write(m + "\\n"); process.exit(1); };
let m;
if ((m = /^plugin marketplace add lucadallavalle\\/agentfiles@(\\w+)$/.exec(args))) {
  if (s.marketplace) fail("already added");
  s.marketplace = { ref: m[1] };
} else if (args === "plugin marketplace remove lucadallavalle") {
  if (!s.marketplace) fail("not configured");
  s.marketplace = null;
} else if (args === "plugin add agentfiles@lucadallavalle") {
  if (fs.existsSync(path.join(dir, "fail"))) fail("boom");
  if (!s.marketplace) fail("not found");
  s.plugin = s.marketplace.ref ?? "main";
} else if (args === "plugin remove agentfiles@lucadallavalle") {
  s.plugin = null;
} else fail("unexpected: " + args);
fs.writeFileSync(file, JSON.stringify(s));
let toml = "";
if (s.marketplace) {
  toml += '[marketplaces.lucadallavalle]\\nsource_type = "git"\\nsource = "https://github.com/lucadallavalle/agentfiles.git"\\n';
  if (s.marketplace.ref) toml += 'ref = "' + s.marketplace.ref + '"\\n';
}
if (s.plugin) toml += '[plugins."agentfiles@lucadallavalle"]\\nenabled = true\\n';
fs.writeFileSync(path.join(dir, "config.toml"), toml);
`;

interface State {
  marketplace: { ref?: string } | null;
  /** The installed commit. */
  plugin: string | null;
}

function codex(state: State = { marketplace: null, plugin: null }) {
  const dir = mkdtempSync(join(tmpdir(), "agentfiles-codex-"));
  writeFileSync(join(dir, "codex"), stub);
  chmodSync(join(dir, "codex"), 0o755);
  writeFileSync(join(dir, "state.json"), JSON.stringify(state));
  let toml = "";
  if (state.marketplace)
    toml += `[marketplaces.lucadallavalle]\nsource_type = "git"\n${state.marketplace.ref ? `ref = "${state.marketplace.ref}"\n` : ""}`;
  if (state.plugin) toml += '[plugins."agentfiles@lucadallavalle"]\n';
  writeFileSync(join(dir, "config.toml"), toml);
  writeFileSync(join(dir, "log"), "");
  const env = { PATH: `${dir}:${process.env.PATH ?? ""}`, CODEX_HOME: dir };
  return {
    dir,
    drift: (fix = false) =>
      pluginDrift(
        [{ name: "codex", dir, binary: "codex", part: codexPlugin }],
        {
          commit: { commit },
          env,
          fix,
          plugin: () => readPluginMetadata(root),
        },
      ),
    log: () => readFileSync(join(dir, "log"), "utf8").trim().split("\n"),
    installed: () =>
      (JSON.parse(readFileSync(join(dir, "state.json"), "utf8")) as State)
        .plugin,
  };
}

describe("codex plugin", () => {
  it("adds the marketplace pinned to the CLI's commit, then the plugin", () => {
    const c = codex();
    expect(c.drift().lines).toEqual(["codex plugin missing"]);
    expect(c.drift(true).lines).toEqual(["codex plugin missing, installed"]);
    expect(c.log()).toEqual([
      `plugin marketplace add lucadallavalle/agentfiles@${commit}`,
      "plugin add agentfiles@lucadallavalle",
    ]);
    expect(c.installed()).toBe(commit);
    expect(c.drift(true).lines).toEqual([]);
    expect(c.log()).toHaveLength(2);
  });

  it("moves an outdated plugin: plugin remove, marketplace remove and add, plugin add", () => {
    const c = codex({ marketplace: { ref: other }, plugin: other });
    expect(c.drift().lines).toEqual([
      "codex plugin outdated: at 1234567890ab, CLI at abcdef012345",
    ]);
    expect(c.drift(true).lines).toEqual(["codex plugin outdated, updated"]);
    expect(c.log()).toEqual([
      "plugin remove agentfiles@lucadallavalle",
      "plugin marketplace remove lucadallavalle",
      `plugin marketplace add lucadallavalle/agentfiles@${commit}`,
      "plugin add agentfiles@lucadallavalle",
    ]);
    expect(c.installed()).toBe(commit);
  });

  it("pins an unpinned marketplace (the former README install)", () => {
    const c = codex({ marketplace: {}, plugin: "main" });
    expect(c.drift().lines).toEqual([
      "codex plugin outdated: at main, CLI at abcdef012345",
    ]);
    expect(c.drift(true).lines).toEqual(["codex plugin outdated, updated"]);
    expect(c.installed()).toBe(commit);
  });

  it("only adds the plugin when the marketplace is already at the commit", () => {
    const c = codex({ marketplace: { ref: commit }, plugin: null });
    expect(c.drift(true).lines).toEqual(["codex plugin missing, installed"]);
    expect(c.log()).toEqual(["plugin add agentfiles@lucadallavalle"]);
  });

  it("reports a failing codex command; a failed move leaves the plugin missing", () => {
    const c = codex({ marketplace: { ref: other }, plugin: other });
    writeFileSync(join(c.dir, "fail"), "");
    expect(c.drift(true)).toMatchObject({
      lines: [
        "codex plugin error: codex plugin add agentfiles@lucadallavalle: boom",
      ],
      error: true,
    });
    expect(c.drift().lines).toEqual(["codex plugin missing"]);
  });
});
