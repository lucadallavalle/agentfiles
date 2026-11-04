import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { paths } from "./files.js";
import { readState, statePath, writeState, type StateRecord } from "./state.js";
import { hash } from "./tracked.js";

const dir = () => mkdtempSync(join(tmpdir(), "agentfiles-state-"));

const records: StateRecord[] = [
  {
    harness: "h",
    kind: "key",
    path: "/b",
    format: "json",
    key: ["k"],
    hash: hash("key", 1),
  },
  { harness: "h", kind: "file", path: "/a", hash: hash("file", "x") },
];

describe("state file", () => {
  it("lives under XDG_STATE_HOME, else ~/.local/state", () => {
    expect(statePath(paths({ HOME: "/h", XDG_STATE_HOME: "/s" }))).toBe(
      "/s/agentfiles/state.json",
    );
    expect(statePath(paths({ HOME: "/h", XDG_STATE_HOME: "" }))).toBe(
      "/h/.local/state/agentfiles/state.json",
    );
  });

  it("is empty when absent", () => {
    expect(readState(join(dir(), "state.json"))).toEqual([]);
  });

  it("round-trips, sorted by entry", () => {
    const path = join(dir(), "agentfiles", "state.json");
    writeState(path, records);
    expect(readState(path)).toEqual([records[1], records[0]]);
    expect(readFileSync(path, "utf8")).toMatch(/^\{\n {2}"version": 1,/);
  });

  it.each([
    ["not JSON", "{"],
    ["another version", '{"version": 2, "entries": []}'],
    ["a bad record", '{"version": 1, "entries": [{"kind": "file"}]}'],
  ])("throws, naming the file, on %s", (_, text) => {
    const path = join(dir(), "state.json");
    writeFileSync(path, text);
    expect(() => readState(path)).toThrow(path);
  });
});
