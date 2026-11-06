import { existsSync } from "node:fs";
import { join } from "node:path";
import { readConfig, type ShippedConfig } from "./config.js";
import {
  onPath,
  paths,
  readText,
  remove,
  tilde,
  writeAtomic,
  type Env,
  type Paths,
} from "./files.js";
import { ownersPath, readOwners } from "./owners.js";
import { repoDrift, type RepoOutcome } from "./repo.js";
import { checkClone } from "./self.js";
import {
  readState,
  serializeState,
  statePath,
  writeState,
  type StateRecord,
} from "./state.js";
import {
  planFile,
  type Entry,
  type Format,
  type Outcome,
  type State,
} from "./tracked.js";

/** Maps the neutral config onto one harness's files. */
export interface Adapter {
  /** Also its `config/<name>.json`. */
  name: string;
  binary: string;
  /** Its config directory; the harness is present when it exists or `binary` is on `PATH`. */
  dir(env: Env, base: Paths): string;
  formats: readonly Format[];
  entries(context: AdapterContext): Entry[];
}

export interface AdapterContext {
  config: ShippedConfig;
  dir: string;
  /** Where the instructions copy is, as the harness should name it: `~/…` or absolute. */
  instructions: string;
}

export interface DoctorOptions {
  /** The repo root, holding `config/`. */
  root: string;
  env: Env;
  /** The current directory: its repo gets the `repo` group. */
  cwd: string;
  adapters: readonly Adapter[];
  fix: boolean;
}

export interface DoctorResult {
  lines: string[];
  /** `doctor`: 0 in sync, 1 drift, 2 error. `--fix`: 0, or 2 on error. */
  code: 0 | 1 | 2;
  /** `--fix` moved the CLI's clone: the caller runs the same argv from the new bundle. */
  rerun?: true;
}

/** The pseudo-harness for agentfiles' own files. */
const self = "agentfiles";

const verbs: Partial<Record<State, string>> = {
  missing: "written",
  outdated: "updated",
  unshipped: "removed",
};

function shown(entry: Entry, home: string): string {
  if (entry.kind === "file" && entry.source) return tilde(entry.source, home);
  return JSON.stringify(entry.value);
}

function describe(outcome: Outcome, home: string): string {
  const label = `${outcome.harness} ${tilde(outcome.id, home)} ${outcome.state}`;
  if (outcome.fixed) return `${label}, ${verbs[outcome.state] ?? "fixed"}`;
  const entry = outcome.entry;
  if (outcome.state === "edited")
    return entry
      ? `${label}: shipped ${shown(entry, home)}; restore it`
      : `${label}: no longer shipped; remove it`;
  if (outcome.state === "conflict" && entry)
    return `${label}: shipped ${shown(entry, home)}; set it, or remove yours and run doctor --fix`;
  return label;
}

function summary(
  outcomes: readonly Pick<Outcome, "state" | "fixed">[],
): string {
  const counts = new Map<string, number>();
  for (const outcome of outcomes) {
    const key = outcome.fixed ? "fixed" : outcome.state;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const order = [
    "in sync",
    "fixed",
    "missing",
    "outdated",
    "unshipped",
    "edited",
    "conflict",
  ];
  const parts = order
    .filter((key) => counts.has(key))
    .map((key) => `${String(counts.get(key))} ${key}`);
  const noun = outcomes.length === 1 ? "entry" : "entries";
  return `${String(outcomes.length)} ${noun}${parts.length ? `: ${parts.join(", ")}` : ""}`;
}

interface Group {
  harness: string;
  entries: Entry[];
}

/**
 * Checks the CLI's clone, every present harness, then the current repo, and, with `fix`,
 * writes missing and outdated entries and removes unshipped ones. A harness
 * with a file that doesn't parse is skipped; the state file is written last.
 */
export function doctor(options: DoctorOptions): DoctorResult {
  // The clone goes first: the rest then runs from the new commit.
  const clone = checkClone(options);
  const lines = [...clone.lines];
  if (clone.rerun) return { lines, code: 0, rerun: true };
  let base: Paths;
  let config: ShippedConfig;
  let records: StateRecord[];
  let stateFile: string;
  try {
    base = paths(options.env);
    config = readConfig(
      options.root,
      options.adapters.map((a) => a.name),
    );
    stateFile = statePath(base);
    records = readState(stateFile);
  } catch (error) {
    lines.push(`${self} error: ${(error as Error).message}`);
    return { lines, code: 2 };
  }

  const instructionsPath = join(base.config, self, "instructions.md");
  const groups: Group[] = [
    {
      harness: self,
      entries: [
        {
          kind: "file",
          harness: self,
          path: instructionsPath,
          value: config.instructions,
          source: config.instructionsSource,
        },
        ...config.documentation.map((file): Entry => ({
          kind: "file",
          harness: self,
          path: join(base.config, self, "documentation", file.name),
          value: file.text,
          source: file.source,
        })),
      ],
    },
  ];
  const formats = new Map<string, Format>();
  for (const adapter of options.adapters) {
    for (const format of adapter.formats) formats.set(format.name, format);
    const dir = adapter.dir(options.env, base);
    if (!existsSync(dir) && !onPath(adapter.binary, options.env)) {
      lines.push(`${adapter.name} not installed, skipped`);
      continue;
    }
    groups.push({
      harness: adapter.name,
      entries: adapter.entries({
        config,
        dir,
        instructions: tilde(instructionsPath, base.home),
      }),
    });
  }

  let code: 0 | 1 | 2 = clone.error ? 2 : 0;
  const outcomes: Outcome[] = [];
  const checked = new Set(groups.map((g) => g.harness));
  // Records of skipped or failing harnesses stay as they are.
  const next = records.filter((r) => !checked.has(r.harness));

  for (const group of groups) {
    const mine = records.filter((r) => r.harness === group.harness);
    const files = [
      ...new Set([
        ...group.entries.map((e) => e.path),
        ...mine.map((r) => r.path),
      ]),
    ];
    try {
      const plans = files.map((path) => {
        const text = readText(path);
        const plan = planFile(
          path,
          text,
          group.entries.filter((e) => e.path === path),
          mine.filter((r) => r.path === path),
          formats,
          options.fix,
        );
        return { path, text, plan };
      });
      for (const { path, text, plan } of plans) {
        if (!options.fix || plan.text === text) continue;
        if (plan.text === undefined) remove(path);
        else writeAtomic(path, plan.text);
      }
      for (const { plan } of plans) {
        outcomes.push(...plan.outcomes);
        next.push(...plan.records);
      }
    } catch (error) {
      lines.push(`${group.harness} error: ${(error as Error).message}`);
      next.push(...mine);
      code = 2;
    }
  }

  for (const outcome of outcomes)
    if (outcome.state !== "in sync") lines.push(describe(outcome, base.home));

  let repo: RepoOutcome[] = [];
  try {
    repo = repoDrift({
      cwd: options.cwd,
      env: options.env,
      root: options.root,
      documentation: config.documentation,
      hashes: config.documentationHashes,
      owners: readOwners(ownersPath(base)),
      fix: options.fix,
    });
  } catch (error) {
    lines.push(`repo error: ${(error as Error).message}`);
    code = 2;
  }
  for (const outcome of repo)
    if (outcome.state !== "in sync")
      lines.push(
        `repo ${outcome.path} ${outcome.state}${outcome.fixed ? `, ${verbs[outcome.state] ?? "fixed"}` : ""}`,
      );
  lines.push(summary([...outcomes, ...repo]));

  if (options.fix && serializeState(next) !== serializeState(records)) {
    try {
      writeState(stateFile, next);
    } catch (error) {
      lines.push(`${self} error: ${(error as Error).message}`);
      code = 2;
    }
  }
  if (
    code === 0 &&
    !options.fix &&
    (clone.drift || [...outcomes, ...repo].some((o) => o.state !== "in sync"))
  )
    code = 1;
  return { lines, code };
}
