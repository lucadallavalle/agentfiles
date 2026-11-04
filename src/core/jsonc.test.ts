import { describe, expect, it } from "vitest";
import { jsonc } from "./jsonc.js";

const user = `{
    "model": "x",
    // mine
    "theme": "dark", /* keep */
    "permissions": {
        "allow": ["Read"], // trailing
    },
}
`;

describe("jsonc", () => {
  it("parses comments and trailing commas, rejects broken text", () => {
    expect(jsonc.parse(user)).toEqual({
      model: "x",
      theme: "dark",
      permissions: { allow: ["Read"] },
    });
    expect(jsonc.parse("")).toEqual({});
    expect(() => jsonc.parse('{"a": }')).toThrow("ValueExpected");
    expect(() => jsonc.parse("[]")).toThrow("not a JSON object");
  });

  it("edits one path, keeping comments, indentation and key order", () => {
    let text = jsonc.set(user, ["attribution"], { commit: "", pr: "" });
    text = jsonc.insert(text, ["permissions", "allow"], 1, "Bash(git log *)");
    text = jsonc.remove(text, ["model"]);
    expect(text).toContain("// mine");
    expect(text).toContain("/* keep */");
    expect(text).toContain("// trailing");
    expect(text).toContain('    "permissions": {');
    expect(jsonc.parse(text)).toEqual({
      theme: "dark",
      permissions: { allow: ["Read", "Bash(git log *)"] },
      attribution: { commit: "", pr: "" },
    });
    expect(jsonc.remove(text, ["permissions", "allow", 0])).toContain(
      '"Bash(git log *)"',
    );
  });

  it("removes an item with its same-line comment, keeping the next line's", () => {
    const text = '{\n  "a": 1, // about a\n  // about b\n  "b": 2\n}\n';
    expect(jsonc.remove(text, ["a"])).toBe('{\n  // about b\n  "b": 2\n}\n');
    expect(jsonc.remove(text, ["b"])).toBe('{\n  "a": 1 // about a\n}\n');
    expect(jsonc.remove('{"a": 1, "b": 2}', ["a"])).toBe('{"b": 2}');
    expect(jsonc.parse(jsonc.remove('{\n  "a": 1\n}\n', ["a"]))).toEqual({});
    const list = '{\n  "l": [\n    "x",\n    // y\n    "y"\n  ]\n}\n';
    expect(jsonc.remove(list, ["l", 0])).toBe(
      '{\n  "l": [\n    // y\n    "y"\n  ]\n}\n',
    );
  });

  it("creates a document from nothing", () => {
    const text = jsonc.set("", ["a"], [1]);
    expect(text).toBe('{\n  "a": [\n    1\n  ]\n}\n');
  });

  it("inserts first in a list", () => {
    const text = jsonc.insert('{"l": ["b"]}', ["l"], 0, "a");
    expect(jsonc.parse(text)).toEqual({ l: ["a", "b"] });
  });
});
