import { join } from "node:path";
import { build } from "rolldown";

/** The committed CLI bundle, relative to the repo root. */
export const bundlePath = "bin/agentfiles.js";

/** The lowest Node major the bundle runs on, as `engines.node`. */
const nodeFloor = 22;

/**
 * The bundle's first statement. Dependencies' code runs before the
 * entry's, so the check must be the banner and run on older Node.
 */
const floorCheck = `if (Number(process.versions.node.split(".")[0]) < ${String(nodeFloor)}) {
  process.stderr.write("agentfiles needs Node ${String(nodeFloor)} or later; this is Node " + process.versions.node + "\\n");
  process.exit(2);
}`;

/**
 * Bundles `src/cli/index.ts` and its libraries into one ES module, so
 * `node bin/agentfiles.js` runs without installing dependencies.
 */
export async function bundleCli(root: string): Promise<string> {
  const { output } = await build({
    cwd: root,
    input: join(root, "src/cli/index.ts"),
    platform: "node",
    resolve: {
      extensionAlias: { ".js": [".ts", ".js"] },
      // jsonc-parser's `main` is UMD with requires rolldown can't follow.
      mainFields: ["module", "main"],
    },
    transform: { target: `node${String(nodeFloor)}` },
    logLevel: "warn",
    write: false,
    output: {
      format: "esm",
      banner: `#!/usr/bin/env node\n${floorCheck}`,
      codeSplitting: false,
    },
  });
  if (output.length !== 1) throw new Error("expected one bundle chunk");
  return output[0].code;
}
