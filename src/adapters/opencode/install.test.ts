import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readPluginMetadata } from "../../core/plugin.js";
import { pluginDrift } from "../../core/plugins.js";
import { opencodePlugin } from "./install.js";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const commit = "abcdef0123456789abcdef0123456789abcdef01";
const other = "1234567890abcdef1234567890abcdef12345678";
const spec = "github:lucadallavalle/agentfiles";

/**
 * A stub `opencode` that records its arguments and behaves as 2.2.5 did:
 * `plugin add` appends the specifier to `plugins` in `opencode.json`,
 * `plugin remove` drops that exact specifier, or says it isn't configured.
 */
const stub = `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const dir = path.join(process.env.XDG_CONFIG_HOME, "opencode");
const file = path.join(dir, "opencode.json");
const [cmd, sub, spec] = process.argv.slice(2);
fs.appendFileSync(path.join(dir, "log"), process.argv.slice(2).join(" ") + "\\n");
const doc = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8").replace(/^\\s*\\/\\/.*$/gm, "")) : {};
doc.plugins ??= [];
if (cmd === "plugin" && sub === "add") {
  if (fs.existsSync(path.join(dir, "fail"))) { process.stderr.write("boom\\n"); process.exit(1); }
  doc.plugins.push(spec);
} else if (cmd === "plugin" && sub === "remove") {
  if (!doc.plugins.includes(spec)) { console.log("not configured"); process.exit(0); }
  doc.plugins = doc.plugins.filter((p) => p !== spec);
} else { process.stderr.write("unexpected\\n"); process.exit(1); }
fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\\n");
`;

function opencode(plugins?: string[], file = "opencode.json") {
  const home = mkdtempSync(join(tmpdir(), "agentfiles-opencode-"));
  const dir = join(home, "opencode");
  mkdirSync(dir);
  const bin = join(home, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "opencode"), stub);
  chmodSync(join(bin, "opencode"), 0o755);
  if (plugins)
    writeFileSync(
      join(dir, file),
      `{\n  // mine\n  "plugins": ${JSON.stringify(plugins)}\n}\n`,
    );
  writeFileSync(join(dir, "log"), "");
  const env = {
    PATH: `${bin}:${process.env.PATH ?? ""}`,
    XDG_CONFIG_HOME: home,
  };
  return {
    dir,
    drift: (fix = false) =>
      pluginDrift(
        [{ name: "opencode", dir, binary: "opencode", part: opencodePlugin }],
        {
          commit: { commit },
          env,
          fix,
          plugin: () => readPluginMetadata(root),
        },
      ),
    log: () => readFileSync(join(dir, "log"), "utf8").trim().split("\n"),
    plugins: () =>
      (
        JSON.parse(readFileSync(join(dir, "opencode.json"), "utf8")) as {
          plugins: string[];
        }
      ).plugins,
  };
}

describe("opencode plugin", () => {
  it("adds the plugin pinned to the CLI's commit", () => {
    const o = opencode();
    expect(o.drift().lines).toEqual(["opencode plugin missing"]);
    expect(o.drift(true).lines).toEqual(["opencode plugin missing, installed"]);
    expect(o.log()).toEqual([`plugin add ${spec}#${commit}`]);
    expect(o.plugins()).toEqual([`${spec}#${commit}`]);
    expect(o.drift(true).lines).toEqual([]);
  });

  it("replaces the unpinned entry of the former README install", () => {
    const o = opencode(["other-plugin", spec]);
    expect(o.drift().lines).toEqual([
      "opencode plugin outdated: at main, CLI at abcdef012345",
    ]);
    expect(o.drift(true).lines).toEqual(["opencode plugin outdated, updated"]);
    expect(o.log()).toEqual([
      `plugin remove ${spec}`,
      `plugin add ${spec}#${commit}`,
    ]);
    expect(o.plugins()).toEqual(["other-plugin", `${spec}#${commit}`]);
  });

  it("moves a pinned entry and leaves one when there were two", () => {
    const o = opencode([`${spec}#${other}`, `${spec}#${commit}`]);
    expect(o.drift().lines).toEqual([
      "opencode plugin outdated: at 2 entries, CLI at abcdef012345",
    ]);
    expect(o.drift(true).lines).toEqual(["opencode plugin outdated, updated"]);
    expect(o.plugins()).toEqual([`${spec}#${commit}`]);
  });

  it("finds our entry in opencode.jsonc too, and ignores lookalikes", () => {
    expect(opencode([`${spec}#${commit}`], "opencode.jsonc").drift()).toEqual({
      lines: [],
      outcomes: [{ state: "in sync", fixed: false }],
      error: false,
    });
    expect(opencode([`${spec}-fork#${commit}`]).drift().lines).toEqual([
      "opencode plugin missing",
    ]);
  });

  it("reports a failing opencode command", () => {
    const o = opencode();
    writeFileSync(join(o.dir, "fail"), "");
    expect(o.drift(true)).toMatchObject({
      lines: [
        `opencode plugin error: opencode plugin add ${spec}#${commit}: boom`,
      ],
      error: true,
    });
  });
});
