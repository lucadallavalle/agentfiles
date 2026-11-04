import { createHash } from "node:crypto";
import type { StateRecord } from "./state.js";

/** A key path inside a settings file. */
export type KeyPath = readonly string[];

/**
 * Edits one settings file format as text, keeping what it can of
 * comments and layout. `""` parses as an empty document.
 */
export interface Format {
  name: string;
  /** Throws when the text doesn't parse. */
  parse(text: string): unknown;
  /** `previous` is the text agentfiles recorded for the key, if any. */
  set(text: string, key: KeyPath, value: unknown, previous?: string): string;
  remove(
    text: string,
    path: readonly (string | number)[],
    previous?: string,
  ): string;
  /** The exact text `set` writes for a key, when the format edits by splicing it. */
  written?(key: KeyPath, value: unknown): string;
  /** Inserts into the existing array at `key`. */
  insert(text: string, key: KeyPath, index: number, value: unknown): string;
}

/** Something agentfiles ships: a whole file, a key, or an element of a shared list. */
export type Entry =
  | {
      kind: "file";
      harness: string;
      path: string;
      value: string;
      /** Where the shipped content comes from, shown to restore an edit. */
      source?: string;
    }
  | {
      kind: "key";
      harness: string;
      path: string;
      format: Format;
      key: KeyPath;
      value: unknown;
    }
  | {
      kind: "element";
      harness: string;
      path: string;
      format: Format;
      key: KeyPath;
      value: unknown;
      /** Where a missing element goes: after our earlier ones at the start, or at the end. */
      at: "first" | "last";
    };

export type Kind = Entry["kind"];

export type State =
  "in sync" | "missing" | "outdated" | "edited" | "unshipped" | "conflict";

/** JSON with sorted keys, so equal values compare and hash equal. */
export function canonical(value: unknown): string {
  return JSON.stringify(value, (_, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        )
      : v,
  );
}

export function hash(kind: Kind, value: unknown): string {
  const text = kind === "file" ? String(value) : canonical(value);
  return createHash("sha256").update(text).digest("hex");
}

interface Identity {
  kind: Kind;
  path: string;
  key?: KeyPath | undefined;
  value?: unknown;
}

/** Unique per entry, starting with its absolute path; also its label. */
export function entryId(entry: Identity): string {
  const key = entry.key?.join(".") ?? "";
  switch (entry.kind) {
    case "file":
      return entry.path;
    case "key":
      return `${entry.path} ${key}`;
    case "element":
      return `${entry.path} ${key}[] ${canonical(entry.value)}`;
  }
}

/**
 * The drift rule. `current` is undefined when the machine lacks the entry;
 * the result is undefined when there is nothing left to track.
 */
export function classify(
  kind: Kind,
  shipped: { value: unknown } | undefined,
  recorded: { hash: string } | undefined,
  current: { value: unknown } | undefined,
): State | undefined {
  const equal = (a: unknown, b: unknown) =>
    kind === "file" ? a === b : canonical(a) === canonical(b);
  if (!shipped) {
    if (!recorded || !current) return undefined;
    return hash(kind, current.value) === recorded.hash ? "unshipped" : "edited";
  }
  if (!current) return recorded ? "edited" : "missing";
  if (equal(current.value, shipped.value)) return "in sync";
  if (!recorded) return "conflict";
  return hash(kind, current.value) === recorded.hash ? "outdated" : "edited";
}

/** The state of one entry, before any fix. */
export interface Outcome {
  id: string;
  harness: string;
  kind: Kind;
  path: string;
  state: State;
  /** Set when shipped. */
  entry?: Entry;
  /** True once `--fix` wrote or removed it. */
  fixed: boolean;
}

export interface FilePlan {
  outcomes: Outcome[];
  /** The new text; undefined removes the file. */
  text: string | undefined;
  /** Records for this file after the run. */
  records: StateRecord[];
}

function lookup(doc: unknown, key: KeyPath): { value: unknown } | undefined {
  let value = doc;
  for (const part of key) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return undefined;
    if (!Object.hasOwn(value, part)) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return { value };
}

function list(doc: unknown, key: KeyPath, path: string): unknown[] | undefined {
  const found = lookup(doc, key);
  if (!found) return undefined;
  if (!Array.isArray(found.value))
    throw new Error(`${path}: ${key.join(".")} is not a list`);
  return found.value as unknown[];
}

function indexOf(items: unknown[] | undefined, value: unknown): number {
  const want = canonical(value);
  return items?.findIndex((item) => canonical(item) === want) ?? -1;
}

function record(entry: Entry): StateRecord {
  const base = {
    harness: entry.harness,
    kind: entry.kind,
    path: entry.path,
    hash: hash(entry.kind, entry.value),
  };
  if (entry.kind === "file") return base;
  const written = entry.format.written?.(entry.key, entry.value);
  return {
    ...base,
    format: entry.format.name,
    key: [...entry.key],
    ...(entry.kind === "element" ? { value: entry.value } : {}),
    ...(entry.kind === "key" && written !== undefined ? { text: written } : {}),
  };
}

/**
 * Classifies every shipped entry and record of one file and, with `fix`,
 * computes its new text: unshipped entries are removed first, then missing
 * and outdated ones are written in shipped order.
 */
export function planFile(
  path: string,
  text: string | undefined,
  entries: readonly Entry[],
  records: readonly StateRecord[],
  formats: ReadonlyMap<string, Format>,
  fix: boolean,
): FilePlan {
  const structured = entries.find((entry) => entry.kind !== "file");
  const formatName =
    structured?.format.name ??
    records.find((r) => r.format !== undefined)?.format;
  const format = formatName === undefined ? undefined : formats.get(formatName);
  if (formatName !== undefined && !format)
    throw new Error(`${path}: unknown format ${formatName}`);
  const parse = (current: string | undefined) => {
    try {
      return format?.parse(current ?? "");
    } catch (error) {
      throw new Error(`${path}: ${(error as Error).message}`, {
        cause: error,
      });
    }
  };
  let doc = parse(text);

  const current = (r: Identity): { value: unknown } | undefined => {
    if (r.kind === "file")
      return text === undefined ? undefined : { value: text };
    if (r.kind === "key") return lookup(doc, r.key ?? []);
    return indexOf(list(doc, r.key ?? [], path), r.value) >= 0
      ? { value: r.value }
      : undefined;
  };

  const byId = new Map(records.map((r) => [entryId(r), r]));
  const outcomes: Outcome[] = [];
  const next: StateRecord[] = [];
  const shippedIds = new Set<string>();

  for (const entry of entries) {
    const id = entryId(entry);
    shippedIds.add(id);
    const recorded = byId.get(id);
    const found = current(entry);
    const state = classify(entry.kind, entry, recorded, found);
    if (!state) continue;
    outcomes.push({
      id,
      harness: entry.harness,
      kind: entry.kind,
      path,
      state,
      entry,
      fixed: false,
    });
  }
  for (const [id, recorded] of byId) {
    if (shippedIds.has(id)) continue;
    const state = classify(
      recorded.kind,
      undefined,
      recorded,
      current(recorded),
    );
    if (!state) continue;
    outcomes.push({
      id,
      harness: recorded.harness,
      kind: recorded.kind,
      path,
      state,
      fixed: false,
    });
  }

  let out = text;
  if (fix) {
    for (const outcome of outcomes) {
      if (outcome.state !== "unshipped") continue;
      const r = byId.get(outcome.id);
      if (!r) continue;
      if (r.kind === "file") out = undefined;
      else if (r.kind === "key")
        out = format?.remove(out ?? "", r.key ?? [], r.text);
      else {
        const index = indexOf(list(doc, r.key ?? [], path), r.value);
        out = format?.remove(out ?? "", [...(r.key ?? []), index]);
      }
      doc = parse(out);
      outcome.fixed = true;
    }
  }

  // Missing elements at "first" go right after our previous element.
  const cursors = new Map<string, number>();
  for (const outcome of outcomes) {
    const entry = outcome.entry;
    if (!entry) continue;
    const write =
      fix && (outcome.state === "missing" || outcome.state === "outdated");
    if (entry.kind === "element" && entry.at === "first") {
      const items = list(doc, entry.key, path);
      const cursorKey = entry.key.join(".");
      const cursor = cursors.get(cursorKey) ?? 0;
      const index = indexOf(items, entry.value);
      if (index >= 0) {
        cursors.set(cursorKey, Math.max(cursor, index + 1));
      } else if (write) {
        out = items
          ? entry.format.insert(out ?? "", entry.key, cursor, entry.value)
          : entry.format.set(out ?? "", entry.key, [entry.value]);
        cursors.set(cursorKey, cursor + 1);
      }
    } else if (write) {
      if (entry.kind === "file") out = entry.value;
      else if (entry.kind === "key")
        out = entry.format.set(
          out ?? "",
          entry.key,
          entry.value,
          byId.get(outcome.id)?.text,
        );
      else {
        const items = list(doc, entry.key, path);
        out = items
          ? entry.format.insert(out ?? "", entry.key, items.length, entry.value)
          : entry.format.set(out ?? "", entry.key, [entry.value]);
      }
    }
    if (write) {
      doc = parse(out);
      outcome.fixed = true;
    }
  }

  for (const outcome of outcomes) {
    const entry = outcome.entry;
    const old = byId.get(outcome.id);
    if (entry) {
      // In sync, the machine's value equals the shipped one.
      if (outcome.state === "in sync" || outcome.fixed)
        next.push(record(entry));
      else if (old) next.push(old);
    } else if (old && !outcome.fixed) {
      next.push(old);
    }
  }
  return { outcomes, text: out, records: next };
}
