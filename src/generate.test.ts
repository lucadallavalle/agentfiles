import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { staleGenerated } from "./core/generated.js";
import { generatedFiles } from "./generate.js";

const root = fileURLToPath(new URL("..", import.meta.url));

describe("generated manifests", () => {
  it("are committed and up to date (run `pnpm generate`)", () => {
    expect(staleGenerated(root, generatedFiles(root))).toEqual([]);
  });
});
