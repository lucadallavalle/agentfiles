import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const Prefixes = z.array(z.string().trim().min(1));

/** Shell command prefixes, harness-neutral; each adapter writes them in its own rule syntax. */
const Permissions = z
  .strictObject({ allow: Prefixes, ask: Prefixes, deny: Prefixes })
  .refine(
    ({ allow, ask, deny }) =>
      new Set([...allow, ...ask, ...deny]).size ===
      allow.length + ask.length + deny.length,
    "a prefix appears twice",
  );
export type Permissions = z.infer<typeof Permissions>;

/** Tracked keys in one harness's own key shape. */
const Keys = z.record(z.string().min(1), z.json());

export interface ShippedConfig {
  /** `config/instructions.md`. */
  instructions: string;
  instructionsSource: string;
  permissions: Permissions;
  /** `config/<harness>.json` per harness; empty when it doesn't exist. */
  keys: Record<string, Record<string, unknown>>;
}

function read<T>(path: string, schema: z.ZodType<T>): T {
  try {
    return schema.parse(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    const message =
      error instanceof z.ZodError ? z.prettifyError(error) : String(error);
    throw new Error(`${path}: ${message}`, { cause: error });
  }
}

/** Reads and validates `<root>/config/`; throws on the first invalid file. */
export function readConfig(
  root: string,
  harnesses: readonly string[],
): ShippedConfig {
  const dir = join(root, "config");
  const instructionsSource = join(dir, "instructions.md");
  const instructions = readFileSync(instructionsSource, "utf8");
  if (!instructions.trim()) throw new Error(`${instructionsSource}: empty`);
  const keys: Record<string, Record<string, unknown>> = {};
  for (const harness of harnesses) {
    const path = join(dir, `${harness}.json`);
    keys[harness] = existsSync(path) ? read(path, Keys) : {};
  }
  return {
    instructions,
    instructionsSource,
    permissions: read(join(dir, "permissions.json"), Permissions),
    keys,
  };
}
