import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { bundleCli, bundlePath } from "./bundle.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const bin = fileURLToPath(new URL(`../../${bundlePath}`, import.meta.url));

describe(bundlePath, () => {
  it("is committed and up to date (run `pnpm generate`)", async () => {
    expect(readFileSync(bin, "utf8")).toBe(await bundleCli(root));
  });

  it("runs doctor", () => {
    expect(execFileSync("node", [bin, "doctor"], { encoding: "utf8" })).toBe(
      "nothing to check yet\n",
    );
  });
});
