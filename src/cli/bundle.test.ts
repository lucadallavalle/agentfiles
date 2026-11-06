import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { bundleCli, bundlePath } from "./bundle.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const bin = fileURLToPath(new URL(`../../${bundlePath}`, import.meta.url));

describe(bundlePath, () => {
  it("is committed and up to date (run `pnpm generate`)", async () => {
    expect(readFileSync(bin, "utf8")).toBe(await bundleCli(root));
  });

  it("checks the Node floor before any bundled code", () => {
    const text = readFileSync(bin, "utf8");
    // Between the shebang and the first import: the banner.
    const banner = text.slice(
      text.indexOf("\n") + 1,
      text.indexOf("\nimport "),
    );
    const check = (node: string) => {
      const calls: unknown[] = [];
      runInNewContext(banner, {
        process: {
          versions: { node },
          stderr: { write: (line: string) => calls.push(line) },
          exit: (code: number) => calls.push(code),
        },
      });
      return calls;
    };
    expect(check("20.19.0")).toEqual([
      "agentfiles needs Node 22 or later; this is Node 20.19.0\n",
      2,
    ]);
    expect(check("22.0.0")).toEqual([]);
  });

  it("runs doctor and doctor --fix in a fake home", () => {
    const home = mkdtempSync(join(tmpdir(), "agentfiles-bundle-"));
    const env = { HOME: home, PATH: "" };
    const doctor = (...args: string[]) =>
      spawnSync(process.execPath, [bin, "doctor", ...args], {
        env,
        encoding: "utf8",
      });
    const skipped =
      "claude-code not installed, skipped\ncodex not installed, skipped\nopencode not installed, skipped\n";
    const docs = readdirSync(join(root, "docs/documentation")).sort();
    const total = String(1 + docs.length);
    expect(doctor()).toMatchObject({
      status: 1,
      stdout: [
        skipped,
        "agentfiles ~/.config/agentfiles/instructions.md missing\n",
        ...docs.map(
          (doc) =>
            `agentfiles ~/.config/agentfiles/documentation/${doc} missing\n`,
        ),
        `${total} entries: ${total} missing\n`,
      ].join(""),
    });
    expect(doctor("--fix").status).toBe(0);
    expect(
      readFileSync(join(home, ".config/agentfiles/instructions.md"), "utf8"),
    ).toBe(readFileSync(join(root, "config/instructions.md"), "utf8"));
    expect(doctor()).toMatchObject({
      status: 0,
      stdout: `${skipped}${total} entries: ${total} in sync\n`,
    });
  });
});
