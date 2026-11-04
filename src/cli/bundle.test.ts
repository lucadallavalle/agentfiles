import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { bundleCli, bundlePath } from "./bundle.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const bin = fileURLToPath(new URL(`../../${bundlePath}`, import.meta.url));

describe(bundlePath, () => {
  it("is committed and up to date (run `pnpm generate`)", async () => {
    expect(readFileSync(bin, "utf8")).toBe(await bundleCli(root));
  });

  it("runs doctor and doctor --fix in a fake home", () => {
    const home = mkdtempSync(join(tmpdir(), "agentfiles-bundle-"));
    const env = { HOME: home, PATH: "" };
    const doctor = (...args: string[]) =>
      spawnSync(process.execPath, [bin, "doctor", ...args], {
        env,
        encoding: "utf8",
      });
    expect(doctor()).toMatchObject({
      status: 1,
      stdout:
        "claude-code not installed, skipped\ncodex not installed, skipped\nopencode not installed, skipped\nagentfiles ~/.config/agentfiles/instructions.md missing\n1 entry: 1 missing\n",
    });
    expect(doctor("--fix").status).toBe(0);
    expect(
      readFileSync(join(home, ".config/agentfiles/instructions.md"), "utf8"),
    ).toBe(readFileSync(join(root, "config/instructions.md"), "utf8"));
    expect(doctor()).toMatchObject({
      status: 0,
      stdout:
        "claude-code not installed, skipped\ncodex not installed, skipped\nopencode not installed, skipped\n1 entry: 1 in sync\n",
    });
  });
});
