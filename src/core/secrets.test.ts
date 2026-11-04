import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const config = fileURLToPath(new URL("../../config", import.meta.url));

/** Claude Code `${VAR}` (with an optional `:-default`), OpenCode `{env:VAR}`. */
const reference = /\$\{[A-Za-z_]\w*(:-[^}]*)?\}|\{env:[A-Za-z_]\w*\}/;
/** Codex names the variable itself: `env_vars`, `*_env_var`, `env_http_headers`. */
const variableName = /^[A-Za-z_]\w*$/;
const maps = new Set(["env", "headers", "http_headers"]);
const secretKey =
  /token|secret|password|passwd|api[-_]?key|authorization|credential/i;

/** Paths of string values in `env`, headers and token fields that aren't environment references. */
function literalSecrets(value: unknown, path = "", inMap = false): string[] {
  if (typeof value === "string")
    return inMap || secretKey.test(path.split(".").at(-1) ?? "")
      ? reference.test(value)
        ? []
        : [path]
      : [];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => {
      const at = path ? `${path}.${key}` : key;
      if (
        key === "env_vars" ||
        key === "env_http_headers" ||
        key.endsWith("_env_var")
      ) {
        const names =
          typeof child === "object" && child ? Object.values(child) : [child];
        return names.every(
          (name) => typeof name === "string" && variableName.test(name),
        )
          ? []
          : [at];
      }
      return literalSecrets(child, at, maps.has(key));
    },
  );
}

describe("config/", () => {
  const files = readdirSync(config).filter((file) => file.endsWith(".json"));

  it.each(files)("%s holds no literal secret", (file) => {
    expect(
      literalSecrets(JSON.parse(readFileSync(join(config, file), "utf8"))),
    ).toEqual([]);
  });
});

describe("literalSecrets", () => {
  it("finds literal values", () => {
    expect(
      literalSecrets({
        mcp: {
          s: {
            env: { API_KEY: "sk-live-0000" },
            headers: { Authorization: "Bearer abc" },
            bearer_token: "abc",
            env_http_headers: { "X-Key": "not a name" },
          },
        },
        apiKey: "abc",
      }),
    ).toEqual([
      "mcp.s.env.API_KEY",
      "mcp.s.headers.Authorization",
      "mcp.s.bearer_token",
      "mcp.s.env_http_headers",
      "apiKey",
    ]);
  });

  it("accepts environment references", () => {
    expect(
      literalSecrets({
        env: { A: "${A}", B: "${B:-x}" },
        headers: { Authorization: "Bearer {env:TOKEN}" },
        bearer_token_env_var: "TOKEN",
        env_vars: ["A", "B"],
        env_http_headers: { "X-Key": "KEY" },
        model: "plain",
      }),
    ).toEqual([]);
  });
});
