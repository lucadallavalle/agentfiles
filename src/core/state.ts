import { join } from "node:path";
import { z } from "zod";
import { readText, writeAtomic, type Paths } from "./files.js";
import { entryId } from "./tracked.js";

/** What agentfiles wrote for one tracked entry. */
export const StateRecord = z.strictObject({
  harness: z.string().min(1),
  kind: z.enum(["file", "key", "element"]),
  /** Absolute. */
  path: z.string().min(1),
  /** The settings format, for keys and elements. */
  format: z.string().min(1).optional(),
  key: z.array(z.string()).optional(),
  /** The element itself, so it can be found and removed. */
  value: z.unknown().optional(),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
  /** The exact text written, for a format that splices it (TOML). */
  text: z.string().optional(),
});
export type StateRecord = z.infer<typeof StateRecord>;

const StateFile = z.strictObject({
  version: z.literal(1),
  entries: z.array(StateRecord),
});

export function statePath(base: Paths): string {
  return join(base.state, "agentfiles", "state.json");
}

/** The records in the state file; none when it doesn't exist. Throws when it doesn't parse. */
export function readState(path: string): StateRecord[] {
  const text = readText(path);
  if (text === undefined) return [];
  try {
    return StateFile.parse(JSON.parse(text)).entries;
  } catch (error) {
    const message =
      error instanceof z.ZodError ? z.prettifyError(error) : String(error);
    throw new Error(`${path}: ${message}`, { cause: error });
  }
}

export function serializeState(records: readonly StateRecord[]): string {
  const entries = records
    .map((r) => [entryId(r), r] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    // The schema's key order, so equal records serialize equal.
    .map(([, r]) => StateRecord.parse(r));
  return `${JSON.stringify({ version: 1, entries }, null, 2)}\n`;
}

export function writeState(
  path: string,
  records: readonly StateRecord[],
): void {
  writeAtomic(path, serializeState(records));
}
