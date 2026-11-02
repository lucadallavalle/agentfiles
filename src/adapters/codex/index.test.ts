import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { z } from "zod";
import { readPluginMetadata } from "../../core/plugin.js";
import { AGENT_PLUGINS_SCHEMA } from "./index.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const plugin = readPluginMetadata(root);

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

/** Agent Plugins 1.0.0 `plugin.schema.json`, as Codex reads the root manifest. */
const PluginManifest = z.strictObject({
  $schema: z.literal(AGENT_PLUGINS_SCHEMA),
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/),
  version: z.string().optional(),
  description: z.string().max(4000).optional(),
  author: z
    .strictObject({
      name: z.string().max(120).optional(),
      email: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
  homepage: z.string().optional(),
  repository: z.string().optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  extensions: z.record(z.string(), z.object({})).optional(),
});

/** developers.openai.com: local entries need a `./` path inside the root. */
const LocalSource = z.union([
  z.string().regex(/^\.\//),
  z.strictObject({
    source: z.literal("local"),
    path: z
      .string()
      .regex(/^\.\//)
      .refine((path) => !path.split("/").includes(".."), "outside the root"),
  }),
]);

const Marketplace = z.object({
  name: z.string().min(1),
  interface: z.object({ displayName: z.string().min(1) }).optional(),
  plugins: z
    .array(
      z.object({
        name: z.string().min(1),
        source: LocalSource,
        policy: z.object({
          installation: z.enum([
            "AVAILABLE",
            "INSTALLED_BY_DEFAULT",
            "NOT_AVAILABLE",
          ]),
          authentication: z.string().min(1),
        }),
        category: z.string().min(1),
      }),
    )
    .min(1),
});

const OpenAiYaml = z.object({
  interface: z.record(z.string(), z.string()).optional(),
  policy: z.object({ allow_implicit_invocation: z.boolean() }).optional(),
  dependencies: z.object({}).optional(),
});

describe("Codex files", () => {
  it("plugin.json is a portable manifest without a version", () => {
    const manifest = PluginManifest.parse(readJson("plugin.json"));
    expect(manifest.name).toBe(plugin.name);
    expect(manifest.version).toBeUndefined();
  });

  it("marketplace.json lists this repo as the plugin at its root", () => {
    const marketplace = Marketplace.parse(
      readJson(".agents/plugins/marketplace.json"),
    );
    expect(marketplace.name).toBe(plugin.marketplace);
    expect(marketplace.plugins).toEqual([
      expect.objectContaining({
        name: plugin.name,
        source: { source: "local", path: "./" },
      }),
    ]);
  });

  it("each manual-only skill, and only those, has implicit invocation off", () => {
    for (const skill of plugin.skills) {
      const path = join(root, "skills", skill.id, "agents", "openai.yaml");
      if (!skill.manualOnly) {
        expect(existsSync(path), path).toBe(false);
        continue;
      }
      const sidecar = OpenAiYaml.parse(parse(readFileSync(path, "utf8")));
      expect(sidecar.policy?.allow_implicit_invocation).toBe(false);
    }
  });
});
