import { exec } from "./exec.js";
import { onPath, type Env } from "./files.js";
import type { PluginMetadata } from "./plugin.js";
import type { CliCommit } from "./self.js";

export interface PluginContext {
  env: Env;
  /** The harness's config directory. */
  dir: string;
  binary: string;
  plugin: PluginMetadata;
}

/** One harness's plugin, installed and updated through the harness's own CLI. */
export interface PluginPart {
  /** True when installs land at the given commit; else they follow `main`. */
  pinned: boolean;
  /** The installed commit, or a prefix of it; undefined when not installed. */
  installed(context: PluginContext): string | undefined;
  install(context: PluginContext, commit: string): void;
  update(context: PluginContext, commit: string): void;
}

/** Runs the harness's CLI and returns its output; throws on failure. */
export function harness(context: PluginContext, args: readonly string[]) {
  const result = exec(context.binary, args, { env: context.env });
  if (result.status !== 0) {
    const why =
      (result.stderr.trim() || result.stdout.trim()).split("\n").at(-1) ??
      `exit ${String(result.status)}`;
    throw new Error(`${context.binary} ${args.join(" ")}: ${why}`);
  }
  return result.stdout;
}

export interface PluginHarness {
  name: string;
  dir: string;
  binary: string;
  part: PluginPart;
}

export interface PluginOutcome {
  state: "in sync" | "missing" | "outdated";
  fixed: boolean;
}

export interface PluginResult {
  lines: string[];
  outcomes: PluginOutcome[];
  error: boolean;
}

const short = (commit: string) => commit.slice(0, 12);

/** A prefix of at least 7 characters of `commit`. */
function matches(installed: string, commit: string): boolean {
  return installed.length >= 7 && commit.startsWith(installed.toLowerCase());
}

/**
 * One entry per present harness with a plugin part: missing, or outdated
 * when installed at another commit than the CLI's own. `--fix` installs or
 * updates it and reads the installed commit again, never claiming a fix it
 * didn't make.
 */
export function pluginDrift(
  harnesses: readonly PluginHarness[],
  options: {
    commit: CliCommit;
    env: Env;
    fix: boolean;
    plugin: () => PluginMetadata;
  },
): PluginResult {
  const result: PluginResult = { lines: [], outcomes: [], error: false };
  if (!harnesses.length) return result;
  const { commit: cli } = options;
  if ("error" in cli) {
    result.lines.push(`agentfiles error: ${cli.error}`);
    result.error = true;
    return result;
  }
  if ("skip" in cli) {
    result.lines.push(`plugins skipped: ${cli.skip}`);
    return result;
  }
  const commit = cli.commit;
  let plugin: PluginMetadata;
  try {
    plugin = options.plugin();
  } catch (error) {
    result.lines.push(`agentfiles error: ${(error as Error).message}`);
    result.error = true;
    return result;
  }

  for (const h of harnesses) {
    if (!onPath(h.binary, options.env)) {
      result.lines.push(`${h.name} plugin skipped: ${h.binary} not on PATH`);
      continue;
    }
    const context = { env: options.env, dir: h.dir, binary: h.binary, plugin };
    try {
      const installed = h.part.installed(context);
      const state = !installed
        ? "missing"
        : matches(installed, commit)
          ? "in sync"
          : "outdated";
      if (state === "in sync" || !options.fix) {
        if (state === "missing") result.lines.push(`${h.name} plugin missing`);
        if (state === "outdated" && installed)
          result.lines.push(
            `${h.name} plugin outdated: at ${short(installed)}, CLI at ${short(commit)}`,
          );
        result.outcomes.push({ state, fixed: false });
        continue;
      }
      if (state === "missing") h.part.install(context, commit);
      else h.part.update(context, commit);
      const now = h.part.installed(context);
      if (now && matches(now, commit)) {
        result.lines.push(
          `${h.name} plugin ${state}, ${state === "missing" ? "installed" : "updated"}`,
        );
        result.outcomes.push({ state, fixed: true });
      } else if (now && !h.part.pinned) {
        // `main` moved after the clone's fast-forward; the next --fix converges.
        result.lines.push(
          `${h.name} plugin outdated: main is at ${short(now)}`,
        );
        result.outcomes.push({ state: "outdated", fixed: false });
      } else {
        throw new Error(
          `installed ${now ? short(now) : "nothing"}, expected ${short(commit)}`,
        );
      }
    } catch (error) {
      result.lines.push(`${h.name} plugin error: ${(error as Error).message}`);
      result.error = true;
    }
  }
  return result;
}
