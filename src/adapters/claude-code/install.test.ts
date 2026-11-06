import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readPluginMetadata } from "../../core/plugin.js";
import { pluginDrift } from "../../core/plugins.js";
import { claudeCodePlugin } from "./install.js";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const commit = "abcdef0123456789abcdef0123456789abcdef01";

/**
 * A stub `claude` that records its arguments and keeps what `plugin
 * list` and `marketplace list` print in files; installs land at `main`.
 */
const stub = `#!/bin/sh
d="$STUB"
echo "$*" >> "$d/log"
case "$*" in
  "plugin list --json") cat "$d/list.json" ;;
  "plugin marketplace list --json") cat "$d/marketplaces.json" ;;
  "plugin marketplace add "*) echo '[{"name":"lucadallavalle"}]' > "$d/marketplaces.json" ;;
  "plugin marketplace update "*) ;;
  "plugin install "*|"plugin update "*)
    [ -f "$d/fail" ] && { echo "boom" >&2; exit 1; }
    printf '[{"id":"agentfiles@lucadallavalle","scope":"user","version":"%s"}]' "$(cat "$d/main")" > "$d/list.json" ;;
  *) echo "unexpected: $*" >&2; exit 1 ;;
esac
`;

function claude(state: { list?: unknown; marketplaces?: unknown } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "agentfiles-claude-"));
  writeFileSync(join(dir, "claude"), stub);
  chmodSync(join(dir, "claude"), 0o755);
  writeFileSync(join(dir, "list.json"), JSON.stringify(state.list ?? []));
  writeFileSync(
    join(dir, "marketplaces.json"),
    JSON.stringify(state.marketplaces ?? []),
  );
  writeFileSync(join(dir, "main"), commit.slice(0, 12));
  const env = { PATH: `${dir}:${process.env.PATH ?? ""}`, STUB: dir };
  return {
    dir,
    drift: (fix = false) =>
      pluginDrift(
        [
          {
            name: "claude-code",
            dir,
            binary: "claude",
            part: claudeCodePlugin,
          },
        ],
        {
          commit: { commit },
          env,
          fix,
          plugin: () => readPluginMetadata(root),
        },
      ),
    log: () => readFileSync(join(dir, "log"), "utf8").trim().split("\n"),
  };
}

const installed = (version: string, scope = "user") => [
  { id: "agentfiles@lucadallavalle", scope, version, enabled: true },
];

describe("claude-code plugin", () => {
  it("installs a missing plugin from the marketplace's HTTPS URL, user scope", () => {
    const c = claude({ list: installed("abcdef012345", "project") });
    expect(c.drift().lines).toEqual(["claude-code plugin missing"]);
    expect(c.drift(true).lines).toEqual([
      "claude-code plugin missing, installed",
    ]);
    expect(c.log()).toEqual([
      "plugin list --json",
      "plugin list --json",
      "plugin marketplace list --json",
      "plugin marketplace add https://github.com/lucadallavalle/agentfiles.git",
      "plugin install agentfiles@lucadallavalle -s user",
      "plugin list --json",
    ]);
    expect(c.drift(true).lines).toEqual([]);
  });

  it("keeps a marketplace already added under the same name", () => {
    const c = claude({ marketplaces: [{ name: "lucadallavalle" }] });
    c.drift(true);
    expect(c.log()).toContain("plugin marketplace update lucadallavalle");
    expect(c.log().some((line) => line.includes("marketplace add"))).toBe(
      false,
    );
  });

  it("updates an outdated plugin through the marketplace", () => {
    const c = claude({ list: installed("123456789012") });
    expect(c.drift().lines).toEqual([
      "claude-code plugin outdated: at 123456789012, CLI at abcdef012345",
    ]);
    expect(c.drift(true).lines).toEqual([
      "claude-code plugin outdated, updated",
    ]);
    expect(c.log().slice(-3)).toEqual([
      "plugin marketplace update lucadallavalle",
      "plugin update agentfiles@lucadallavalle -s user",
      "plugin list --json",
    ]);
  });

  it("reports main's commit when main moved past the CLI's", () => {
    const c = claude({ list: installed("123456789012") });
    writeFileSync(join(c.dir, "main"), "fedcba987654");
    expect(c.drift(true)).toMatchObject({
      lines: ["claude-code plugin outdated: main is at fedcba987654"],
      error: false,
    });
  });

  it("reports a failing claude command and unexpected output", () => {
    const c = claude();
    writeFileSync(join(c.dir, "fail"), "");
    expect(c.drift(true)).toMatchObject({
      lines: [
        "claude-code plugin error: claude plugin install agentfiles@lucadallavalle -s user: boom",
      ],
      error: true,
    });
    writeFileSync(join(c.dir, "list.json"), "not json");
    expect(c.drift().lines).toEqual([
      "claude-code plugin error: claude plugin list --json: unexpected output",
    ]);
  });
});
