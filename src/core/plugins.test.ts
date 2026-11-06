import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { PluginMetadata } from "./plugin.js";
import { pluginDrift, type PluginPart } from "./plugins.js";
import type { CliCommit } from "./self.js";

const bin = mkdtempSync(join(tmpdir(), "agentfiles-plugins-bin-"));
writeFileSync(join(bin, "h"), "#!/bin/sh\n");
chmodSync(join(bin, "h"), 0o755);
const env = { PATH: bin };

const commit = "abcdef0123456789abcdef0123456789abcdef01";
const other = "1234567890abcdef1234567890abcdef12345678";

/** A harness whose install lands at `lands`. */
function part(installed: string | undefined, lands = commit, pinned = true) {
  const calls: string[] = [];
  const p: PluginPart = {
    pinned,
    installed: () => installed,
    install: (_, at) => {
      calls.push(`install ${at}`);
      installed = lands;
    },
    update: (_, at) => {
      calls.push(`update ${at}`);
      installed = lands;
    },
  };
  return { part: p, calls };
}

function drift(
  p: PluginPart,
  fix = false,
  cli: CliCommit = { commit },
  binary = "h",
) {
  return pluginDrift([{ name: "h", dir: "/d", binary, part: p }], {
    commit: cli,
    env,
    fix,
    plugin: () => ({}) as PluginMetadata,
  });
}

describe("plugin drift", () => {
  it("is in sync at the CLI's commit or a prefix of it", () => {
    expect(drift(part(commit).part)).toEqual({
      lines: [],
      outcomes: [{ state: "in sync", fixed: false }],
      error: false,
    });
    expect(drift(part(commit.slice(0, 12)).part).outcomes[0]?.state).toBe(
      "in sync",
    );
    expect(drift(part(commit.slice(0, 6)).part).outcomes[0]?.state).toBe(
      "outdated",
    );
  });

  it("reports missing and outdated with both commits", () => {
    expect(drift(part(undefined).part).lines).toEqual(["h plugin missing"]);
    expect(drift(part(other).part).lines).toEqual([
      "h plugin outdated: at 1234567890ab, CLI at abcdef012345",
    ]);
  });

  it("--fix installs or updates at the CLI's commit", () => {
    const missing = part(undefined);
    expect(drift(missing.part, true)).toEqual({
      lines: ["h plugin missing, installed"],
      outcomes: [{ state: "missing", fixed: true }],
      error: false,
    });
    expect(missing.calls).toEqual([`install ${commit}`]);
    const outdated = part(other);
    expect(drift(outdated.part, true).lines).toEqual([
      "h plugin outdated, updated",
    ]);
    expect(outdated.calls).toEqual([`update ${commit}`]);
    // A second run changes nothing.
    expect(drift(outdated.part, true).lines).toEqual([]);
    expect(outdated.calls).toHaveLength(1);
  });

  it("--fix never claims a fix it didn't make", () => {
    expect(drift(part(other, other, false).part, true)).toEqual({
      lines: ["h plugin outdated: main is at 1234567890ab"],
      outcomes: [{ state: "outdated", fixed: false }],
      error: false,
    });
    expect(drift(part(other, other, true).part, true)).toMatchObject({
      lines: ["h plugin error: installed 1234567890ab, expected abcdef012345"],
      error: true,
    });
  });

  it("reports a failing harness CLI as that harness's error", () => {
    const p = part(undefined).part;
    p.install = () => {
      throw new Error("h plugin install: boom");
    };
    expect(drift(p, true)).toEqual({
      lines: ["h plugin error: h plugin install: boom"],
      outcomes: [],
      error: true,
    });
  });

  it("skips without a commit, errs on a bad override, skips without the binary", () => {
    expect(drift(part(undefined).part, true, { skip: "why" })).toEqual({
      lines: ["plugins skipped: why"],
      outcomes: [],
      error: false,
    });
    expect(drift(part(undefined).part, true, { error: "bad" })).toEqual({
      lines: ["agentfiles error: bad"],
      outcomes: [],
      error: true,
    });
    expect(
      drift(part(undefined).part, true, { commit }, "missing-binary").lines,
    ).toEqual(["h plugin skipped: missing-binary not on PATH"]);
  });

  it("prints nothing without a harness that has a plugin part", () => {
    expect(
      pluginDrift([], {
        commit: { skip: "why" },
        env,
        fix: false,
        plugin: () => ({}) as PluginMetadata,
      }),
    ).toEqual({ lines: [], outcomes: [], error: false });
  });
});
