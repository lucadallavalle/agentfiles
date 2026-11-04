import { describe, expect, it } from "vitest";
import type { StateRecord } from "./state.js";
import { json } from "./test-adapter.js";
import {
  canonical,
  classify,
  hash,
  planFile,
  type Entry,
  type Kind,
  type State,
} from "./tracked.js";

const formats = new Map([[json.name, json]]);
const path = "/home/u/.h/settings.json";

describe("canonical", () => {
  it("ignores key order", () => {
    expect(canonical({ b: 1, a: { d: 2, c: 3 } })).toBe(
      canonical({ a: { c: 3, d: 2 }, b: 1 }),
    );
  });
});

describe("classify", () => {
  const S = { value: "s" };
  const tracked = (value: string) => ({ hash: hash("key", value) });
  const cases: [string, Parameters<typeof classify>, State | undefined][] = [
    ["shipped, absent, untracked", ["key", S, undefined, undefined], "missing"],
    ["shipped, equal, untracked", ["key", S, undefined, S], "in sync"],
    [
      "shipped, different, untracked",
      ["key", S, undefined, { value: "x" }],
      "conflict",
    ],
    ["shipped, equal, tracked", ["key", S, tracked("s"), S], "in sync"],
    [
      "shipped newer, unchanged",
      ["key", S, tracked("old"), { value: "old" }],
      "outdated",
    ],
    [
      "shipped, changed by the user",
      ["key", S, tracked("old"), { value: "x" }],
      "edited",
    ],
    [
      "shipped, removed by the user",
      ["key", S, tracked("s"), undefined],
      "edited",
    ],
    [
      "shipped, the user set the shipped value",
      ["key", S, tracked("old"), S],
      "in sync",
    ],
    [
      "unshipped, unchanged",
      ["key", undefined, tracked("old"), { value: "old" }],
      "unshipped",
    ],
    [
      "unshipped, changed",
      ["key", undefined, tracked("old"), { value: "x" }],
      "edited",
    ],
    [
      "unshipped, gone",
      ["key", undefined, tracked("old"), undefined],
      undefined,
    ],
    ["neither", ["key", undefined, undefined, { value: "x" }], undefined],
  ];
  it.each(cases)("%s", (_, args, state) => {
    expect(classify(...args)).toBe(state);
  });

  it("compares files as text, keys and elements as values", () => {
    const kinds: Kind[] = ["key", "element"];
    for (const kind of kinds)
      expect(
        classify(kind, { value: { a: 1, b: 2 } }, undefined, {
          value: { b: 2, a: 1 },
        }),
      ).toBe("in sync");
    expect(classify("file", { value: "a" }, undefined, { value: "a\n" })).toBe(
      "conflict",
    );
  });
});

const key = (value: unknown, name = "theme"): Entry => ({
  kind: "key",
  harness: "h",
  path,
  format: json,
  key: [name],
  value,
});
const element = (value: unknown, at: "first" | "last" = "last"): Entry => ({
  kind: "element",
  harness: "h",
  path,
  format: json,
  key: ["list"],
  value,
  at,
});
const file = (value: string): Entry => ({
  kind: "file",
  harness: "h",
  path: "/home/u/.h/rules.md",
  value,
});

/** Runs `--fix` on a file and returns the plan; then checks a second run is a no-op. */
function fix(
  entries: Entry[],
  text: string | undefined,
  records: StateRecord[] = [],
) {
  const target = entries[0]?.path ?? records[0]?.path ?? path;
  const plan = planFile(target, text, entries, records, formats, true);
  const again = planFile(
    target,
    plan.text,
    entries,
    plan.records,
    formats,
    true,
  );
  expect(again.text).toBe(plan.text);
  expect(again.records).toEqual(plan.records);
  return plan;
}

const doc = (text: string | undefined): unknown =>
  text === undefined ? undefined : JSON.parse(text);
const states = (plan: ReturnType<typeof fix>) =>
  plan.outcomes.map((o) => [o.state, o.fixed]);

describe("planFile, file entries", () => {
  it("writes a missing file and records it", () => {
    const plan = fix([file("a\n")], undefined);
    expect(plan.text).toBe("a\n");
    expect(states(plan)).toEqual([["missing", true]]);
    expect(plan.records).toEqual([
      {
        harness: "h",
        kind: "file",
        path: "/home/u/.h/rules.md",
        hash: hash("file", "a\n"),
      },
    ]);
  });

  it("updates an outdated file, leaves an edited one", () => {
    const written = fix([file("old\n")], undefined).records;
    const outdated = fix([file("new\n")], "old\n", written);
    expect([outdated.text, states(outdated)]).toEqual([
      "new\n",
      [["outdated", true]],
    ]);
    const edited = fix([file("new\n")], "mine\n", written);
    expect([edited.text, states(edited)]).toEqual([
      "mine\n",
      [["edited", false]],
    ]);
    expect(edited.records).toEqual(written);
  });

  it("removes an unshipped file only while unchanged", () => {
    const written = fix([file("a\n")], undefined).records;
    const removed = fix([], "a\n", written);
    expect([removed.text, states(removed), removed.records]).toEqual([
      undefined,
      [["unshipped", true]],
      [],
    ]);
    const kept = planFile(
      "/home/u/.h/rules.md",
      "mine\n",
      [],
      written,
      formats,
      true,
    );
    expect([kept.text, states(kept), kept.records]).toEqual([
      "mine\n",
      [["edited", false]],
      written,
    ]);
  });

  it("doesn't write a conflict, records nothing for it", () => {
    const plan = fix([file("a\n")], "mine\n");
    expect([plan.text, states(plan), plan.records]).toEqual([
      "mine\n",
      [["conflict", false]],
      [],
    ]);
  });
});

describe("planFile, key entries", () => {
  it("sets a missing key, keeps foreign keys", () => {
    const plan = fix([key("dark")], '{"other": [1]}');
    expect(doc(plan.text)).toEqual({ other: [1], theme: "dark" });
    expect(states(plan)).toEqual([["missing", true]]);
    expect(plan.records[0]).toMatchObject({
      kind: "key",
      format: "json",
      key: ["theme"],
    });
  });

  it("adopts an equal value, reports a different one as conflict", () => {
    expect(states(fix([key({ a: 1 })], '{"theme": {"a": 1}}'))).toEqual([
      ["in sync", false],
    ]);
    const conflict = fix([key("dark")], '{"theme": "light"}');
    expect([doc(conflict.text), states(conflict)]).toEqual([
      { theme: "light" },
      [["conflict", false]],
    ]);
  });

  it("updates outdated, reports edited and removed-by-user keys", () => {
    const written = fix([key("old")], "{}").records;
    expect(doc(fix([key("new")], '{"theme": "old"}', written).text)).toEqual({
      theme: "new",
    });
    const edited = fix([key("new")], '{"theme": "mine"}', written);
    expect([doc(edited.text), states(edited)]).toEqual([
      { theme: "mine" },
      [["edited", false]],
    ]);
    const gone = fix([key("new")], "{}", written);
    expect([doc(gone.text), states(gone)]).toEqual([{}, [["edited", false]]]);
  });

  it("removes an unshipped key while unchanged, forgets it once gone", () => {
    const written = fix([key("dark")], "{}").records;
    const removed = fix([], '{"theme": "dark", "x": 1}', written);
    expect([doc(removed.text), states(removed), removed.records]).toEqual([
      { x: 1 },
      [["unshipped", true]],
      [],
    ]);
    const edited = planFile(
      path,
      '{"theme": "mine"}',
      [],
      written,
      formats,
      true,
    );
    expect([states(edited), edited.records]).toEqual([
      [["edited", false]],
      written,
    ]);
    expect(planFile(path, "{}", [], written, formats, true)).toEqual({
      outcomes: [],
      text: "{}",
      records: [],
    });
  });

  it("throws when the file doesn't parse", () => {
    expect(() => planFile(path, "{", [key("dark")], [], formats, true)).toThrow(
      path,
    );
  });
});

describe("planFile, element entries", () => {
  it("appends missing elements, keeping the user's", () => {
    const plan = fix([element("a"), element("b")], '{"list": ["mine"]}');
    expect(doc(plan.text)).toEqual({ list: ["mine", "a", "b"] });
  });

  it("creates the list", () => {
    expect(doc(fix([element("a")], undefined).text)).toEqual({ list: ["a"] });
  });

  it("inserts first, in shipped order, after our earlier elements", () => {
    const entries = [
      element("a", "first"),
      element("b", "first"),
      element("c", "first"),
    ];
    expect(doc(fix(entries, '{"list": ["mine"]}').text)).toEqual({
      list: ["a", "b", "c", "mine"],
    });
    expect(doc(fix(entries, '{"list": ["mine", "b"]}').text)).toEqual({
      list: ["a", "mine", "b", "c"],
    });
  });

  it("matches object elements by value", () => {
    const plan = fix([element({ x: 1, y: 2 })], '{"list": [{"y": 2, "x": 1}]}');
    expect(states(plan)).toEqual([["in sync", false]]);
  });

  it("doesn't re-add an element the user removed", () => {
    const written = fix([element("a")], "{}").records;
    const plan = fix([element("a")], '{"list": []}', written);
    expect([doc(plan.text), states(plan)]).toEqual([
      { list: [] },
      [["edited", false]],
    ]);
  });

  it("removes an unshipped element, forgets it once gone", () => {
    const written = fix([element("a"), element("b")], "{}").records;
    const plan = fix([element("b")], '{"list": ["mine", "a", "b"]}', written);
    expect([doc(plan.text), states(plan)]).toEqual([
      { list: ["mine", "b"] },
      [
        ["in sync", false],
        ["unshipped", true],
      ],
    ]);
    expect(plan.records).toHaveLength(1);
  });

  it("throws when the key isn't a list", () => {
    expect(() =>
      planFile(path, '{"list": 1}', [element("a")], [], formats, true),
    ).toThrow("list is not a list");
  });
});

describe("planFile without fix", () => {
  it("never changes the text", () => {
    const plan = planFile(
      path,
      '{"list": []}',
      [key("dark"), element("a")],
      [],
      formats,
      false,
    );
    expect(plan.text).toBe('{"list": []}');
    expect(plan.outcomes.every((o) => !o.fixed)).toBe(true);
  });
});
