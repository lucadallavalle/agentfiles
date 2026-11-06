import { realpathSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Command, CommanderError } from "commander";
import { adapters } from "../adapters/index.js";
import { bootstrap } from "../core/bootstrap.js";
import { doctor, type Adapter, type DoctorResult } from "../core/doctor.js";
import type { Env } from "../core/files.js";
import { rerun } from "../core/self.js";

/** Where the CLI prints; tests pass their own. */
export interface Output {
  out: (text: string) => void;
  err: (text: string) => void;
}

export interface RunOptions {
  /** The repo root, holding `config/`. */
  root: string;
  env: Env;
  /** The current directory, for the `repo` group. */
  cwd: string;
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
    .description("Report drift in user-level config and the current repo.")
    .option(
      "--fix",
      "write missing and outdated entries, remove unshipped ones",
    )
    .action((flags: { fix?: true }) => {
      report(
        doctor({
          root: options.root,
          env: options.env,
          cwd: options.cwd,
          adapters: options.adapters,
          fix: flags.fix === true,
        }),
      );
    });
  program
    .command("bootstrap")
    .description(
      "Set up this machine: check prerequisites, link ~/.local/bin/agentfiles, run doctor --fix.",
    )
    .option(
      "--owner <name>",
      "add an owner of owned repos (repeatable)",
      (name: string, names: string[]) => [...names, name],
      [],
    )
    .action((flags: { owner: string[] }) => {
      report(
        bootstrap({
          root: options.root,
          env: options.env,
          cwd: options.cwd,
          adapters: options.adapters,
          owners: flags.owner,
        }),
      );
    });

  /** Prints a result; after a fast-forward, the same argv runs again from the new bundle. */
  function report(result: DoctorResult): void {
    for (const line of result.lines) output.out(`${line}\n`);
    code = result.code;
    if (result.rerun) {
      const again = rerun(options.root, args, options);
      output.out(again.stdout);
      output.err(again.stderr);
      code = again.status ?? 2;
    }
  }

  try {
    program.parse(args, { from: "user" });
  } catch (error) {
    if (!(error instanceof CommanderError)) throw error;
    return error.exitCode === 0 ? 0 : 2;
  }
  return code;
}

// The bundle `bin/agentfiles.js` runs this, also through `~/.local/bin/agentfiles`.
const self = fileURLToPath(import.meta.url);
if (process.argv[1] && realpathSync(process.argv[1]) === self) {
  process.exitCode = run(process.argv.slice(2), {
    root: dirname(dirname(self)),
    env: process.env,
    cwd: process.cwd(),
    adapters,
    output: {
      out: (text) => process.stdout.write(text),
      err: (text) => process.stderr.write(text),
    },
  });
}
