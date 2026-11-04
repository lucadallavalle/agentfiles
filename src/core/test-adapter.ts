import { join } from "node:path";
import type { Adapter } from "./doctor.js";
import type { Format, KeyPath } from "./tracked.js";

type Json = Record<string, unknown>;

function parent(doc: Json, key: readonly (string | number)[]): Json {
  let node: Json = doc;
  for (const part of key) {
    const child = node[part];
    if (!child || typeof child !== "object") node[part] = {};
    node = node[part] as Json;
  }
  return node;
}

function edit(text: string, change: (doc: Json) => void): string {
  const doc = json.parse(text) as Json;
  change(doc);
  return `${JSON.stringify(doc, null, 2)}\n`;
}

/** Strict JSON, rewritten with two-space indentation: tests only, it drops nothing but layout. */
export const json: Format = {
  name: "json",
  parse: (text) => {
    if (!text.trim()) return {};
    const doc: unknown = JSON.parse(text);
    if (!doc || typeof doc !== "object" || Array.isArray(doc))
      throw new Error("not a JSON object");
    return doc;
  },
  set: (text, key, value) =>
    edit(text, (doc) => {
      parent(doc, key.slice(0, -1))[key.at(-1) ?? ""] = value;
    }),
  remove: (text, path) =>
    edit(text, (doc) => {
      const node = parent(doc, path.slice(0, -1));
      const last = path.at(-1) ?? "";
      if (Array.isArray(node)) node.splice(Number(last), 1);
      else Reflect.deleteProperty(node, last);
    }),
  insert: (text, key: KeyPath, index, value) =>
    edit(text, (doc) => {
      (parent(doc, key.slice(0, -1))[key.at(-1) ?? ""] as unknown[]).splice(
        index,
        0,
        value,
      );
    }),
};

/**
 * A harness that exists only in tests: one file, the keys in
 * `config/test-harness.json`, allow rules appended to `permissions.allow`,
 * and every rule first in `rules`, ordered allow, ask, deny.
 */
export const testAdapter: Adapter = {
  name: "test-harness",
  binary: "test-harness",
  dir: (_, base) => join(base.home, ".test-harness"),
  formats: [json],
  entries: ({ config, dir, instructions }) => {
    const settings = join(dir, "settings.json");
    const { allow, ask, deny } = config.permissions;
    return [
      {
        kind: "file",
        harness: "test-harness",
        path: join(dir, "rules", "agentfiles.md"),
        value: `@${instructions}\n`,
      },
      ...Object.entries(config.keys["test-harness"] ?? {}).map(
        ([key, value]) =>
          ({
            kind: "key",
            harness: "test-harness",
            path: settings,
            format: json,
            key: [key],
            value,
          }) as const,
      ),
      ...allow.map(
        (prefix) =>
          ({
            kind: "element",
            harness: "test-harness",
            path: settings,
            format: json,
            key: ["permissions", "allow"],
            value: `Shell(${prefix})`,
            at: "last",
          }) as const,
      ),
      ...(
        [
          ["allow", allow],
          ["ask", ask],
          ["deny", deny],
        ] as const
      ).flatMap(([effect, prefixes]) =>
        prefixes.map(
          (resource) =>
            ({
              kind: "element",
              harness: "test-harness",
              path: settings,
              format: json,
              key: ["rules"],
              value: { resource, effect },
              at: "first",
            }) as const,
        ),
      ),
    ];
  },
};
