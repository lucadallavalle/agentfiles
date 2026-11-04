import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Command, CommanderError } from "commander";

/** Where the CLI prints; tests pass their own. */
export interface Output {
  out: (text: string) => void;
  err: (text: string) => void;
}

const stdio: Output = {
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text),
};

/** Exit codes: 0 in sync, 1 drift, 2 error (usage errors included). */
export function run(args: readonly string[], output = stdio): number {
  const program = new Command("agentfiles")
    .description("Sets up and checks coding agents on this machine.")
    .exitOverride()
    .configureOutput({ writeOut: output.out, writeErr: output.err });
  program
    .command("doctor")
    .description("Report drift in user-level config.")
    .option("--fix", "write missing and outdated entries")
    .action(() => {
      output.out("nothing to check yet\n");
    });

  try {
    program.parse(args, { from: "user" });
  } catch (error) {
    if (!(error instanceof CommanderError)) throw error;
    return error.exitCode === 0 ? 0 : 2;
  }
  return 0;
}

// The bundle `bin/agentfiles.js` runs this; `npx` calls it through a symlink.
const self = fileURLToPath(import.meta.url);
if (process.argv[1] && realpathSync(process.argv[1]) === self) {
  process.exitCode = run(process.argv.slice(2));
}
