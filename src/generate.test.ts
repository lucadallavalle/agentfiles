import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DocumentationHashes, documentationHashesPath } from "./core/config.js";
import { staleGenerated } from "./core/generated.js";
import {
  appendHashes,
  documentationVersions,
  generatedFiles,
} from "./generate.js";

const root = fileURLToPath(new URL("..", import.meta.url));

describe("generated manifests", () => {
  it("are committed and up to date (run `pnpm generate`)", () => {
    expect(staleGenerated(root, generatedFiles(root))).toEqual([]);
  });
});

describe(documentationHashesPath, () => {
  it("holds every version of the common documentation in git history (run `pnpm generate`)", () => {
    const list = DocumentationHashes.parse(
      JSON.parse(readFileSync(join(root, documentationHashesPath), "utf8")),
    );
    const versions = documentationVersions(root);
    expect(versions.length).toBeGreaterThan(0);
    expect(
      versions.filter(([name, hash]) => !list[name]?.includes(hash)),
    ).toEqual([]);
  });

  it("appends new hashes once, in order, and removes none", () => {
    expect(
      appendHashes({ "b.md": ["2", "1"], "gone.md": ["3"] }, [
        ["b.md", "1"],
        ["b.md", "4"],
        ["a.md", "5"],
        ["b.md", "4"],
      ]),
    ).toEqual({ "a.md": ["5"], "b.md": ["2", "1", "4"], "gone.md": ["3"] });
  });
});
