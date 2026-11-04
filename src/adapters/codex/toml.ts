import { parse, stringify } from "smol-toml";
import { canonical, type Format, type KeyPath } from "../../core/tracked.js";

function top(key: readonly (string | number)[]): string {
  const [name, ...rest] = key;
  if (
    typeof name !== "string" ||
    rest.length > 0 ||
    !/^[A-Za-z0-9_-]+$/.test(name)
  )
    throw new Error(
      `only bare top-level keys are spliced, not ${key.join(".")}`,
    );
  return name;
}

/** `key = value` plus a newline; multi-line strings as a literal block. */
function written(key: KeyPath, value: unknown): string {
  const name = top(key);
  if (
    typeof value === "string" &&
    value.includes("\n") &&
    !value.includes("'''")
  )
    return `${name} = '''\n${value}'''\n`;
  if (value && typeof value === "object" && !Array.isArray(value))
    throw new Error(`${name}: tables are not spliced`);
  return `${stringify({ [name]: value }).trimEnd()}\n`;
}

/** Where a new top-level key goes: before the first table header and the comments right above it. */
function insertAt(text: string): number {
  const lines = text.split("\n");
  let offset = 0;
  let block = -1;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) block = block < 0 ? offset : block;
    else if (trimmed.startsWith("[")) return block < 0 ? offset : block;
    else block = -1;
    offset += line.length + 1;
  }
  return text.length;
}

function exactlyOnce(text: string, snippet: string, name: string): number {
  const at = text.indexOf(snippet);
  if (at < 0 || text.includes(snippet, at + 1))
    throw new Error(
      `${name}: can't update safely, the text agentfiles wrote is gone or repeated; set it by hand or remove it`,
    );
  return at;
}

/**
 * Codex `config.toml`: read with smol-toml (which drops comments when it
 * writes), so a top-level key is spliced in as text: inserted before the
 * first table (after it, Codex reads `<table>.<key>`), updated or removed
 * only by replacing the exact text agentfiles wrote. Every splice is
 * re-parsed and must change that key only, else nothing is written.
 */
export const toml: Format = {
  name: "toml",
  parse: (text) => parse(text),
  written,
  set: (text, key, value, previous) => {
    const name = top(key);
    const snippet = written(key, value);
    let out: string;
    if (previous === undefined) {
      const at = insertAt(text);
      const before = text.slice(0, at);
      out = `${before}${before && !before.endsWith("\n") ? "\n" : ""}${snippet}${text.slice(at)}`;
    } else {
      const at = exactlyOnce(text, previous, name);
      out = text.slice(0, at) + snippet + text.slice(at + previous.length);
    }
    return verified(text, out, name, value);
  },
  remove: (text, path, previous) => {
    const name = top(path);
    if (previous === undefined)
      throw new Error(
        `${name}: can't remove safely, agentfiles has no record of its text`,
      );
    const at = exactlyOnce(text, previous, name);
    return verified(
      text,
      text.slice(0, at) + text.slice(at + previous.length),
      name,
      undefined,
    );
  },
  insert: () => {
    throw new Error("TOML lists are not spliced");
  },
};

/** The splice must equal the original with only `name` changed. */
function verified(
  before: string,
  after: string,
  name: string,
  value: unknown,
): string {
  const expected: Record<string, unknown> = { ...parse(before) };
  if (value === undefined) Reflect.deleteProperty(expected, name);
  else expected[name] = value;
  let actual: unknown;
  try {
    actual = parse(after);
  } catch (error) {
    throw new Error(`${name}: the splice doesn't parse; nothing written`, {
      cause: error,
    });
  }
  if (canonical(actual) !== canonical(expected))
    throw new Error(
      `${name}: the splice changes more than ${name}; nothing written`,
    );
  return after;
}
