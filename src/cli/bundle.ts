import { join } from "node:path";
import { build } from "rolldown";

/** The committed CLI bundle, relative to the repo root. */
export const bundlePath = "bin/agentfiles.js";

/**
 * Bundles `src/cli/index.ts` and its libraries into one ES module, so
 * `npx github:…` runs it without installing dependencies.
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
    logLevel: "warn",
    write: false,
    output: {
      format: "esm",
      banner: "#!/usr/bin/env node",
      codeSplitting: false,
    },
  });
  if (output.length !== 1) throw new Error("expected one bundle chunk");
  return output[0].code;
}
