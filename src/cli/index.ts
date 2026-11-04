import { realpathSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Command, CommanderError } from "commander";
import { adapters } from "../adapters/index.js";
import { doctor, type Adapter } from "../core/doctor.js";
import type { Env } from "../core/files.js";

/** Where the CLI prints; tests pass their own. */
export interface Output {
  out: (text: string) => void;
  err: (text: string) => void;
}

export interface RunOptions {
  /** The repo root, holding `config/`. */
  root: string;
  env: Env;
  adapters: readonly Adapter[];
  output: Output;
}

/** Exit codes: 0 in sync, 1 drift, 2 error (usage errors included). */
export function run(args: readonly string[], options: RunOptions): number {
  const { output } = options;
  let code = 0;
  const program = new Command("agentfiles")
    .description("Sets up and checks coding agents on this machine.")
    .exitOverride()
    .configureOutput({ writeOut: output.out, writeErr: output.err });
  program
    .command("doctor")
    .description("Report drift in user-level config.")
    .option(
      "--fix",
      "write missing and outdated entries, remove unshipped ones",
    )
    .action((flags: { fix?: true }) => {
      const result = doctor({
        root: options.root,
        env: options.env,
        adapters: options.adapters,
        fix: flags.fix === true,
      });
      for (const line of result.lines) output.out(`${line}\n`);
      code = result.code;
    });

  try {
    program.parse(args, { from: "user" });
  } catch (error) {
    if (!(error instanceof CommanderError)) throw error;
    return error.exitCode === 0 ? 0 : 2;
  }
  return code;
}

// The bundle `bin/agentfiles.js` runs this; `npx` calls it through a symlink.
const self = fileURLToPath(import.meta.url);
if (process.argv[1] && realpathSync(process.argv[1]) === self) {
  process.exitCode = run(process.argv.slice(2), {
    root: dirname(dirname(self)),
    env: process.env,
    adapters,
    output: {
      out: (text) => process.stdout.write(text),
      err: (text) => process.stderr.write(text),
    },
  });
}
