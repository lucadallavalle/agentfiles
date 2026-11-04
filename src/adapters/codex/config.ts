import { join } from "node:path";
import type { Adapter } from "../../core/doctor.js";
import { envPath } from "../../core/files.js";
import type { Entry } from "../../core/tracked.js";
import { toml } from "./toml.js";

const harness = "codex";

/** Codex execpolicy decisions for the neutral lists. */
const decisions = { allow: "allow", ask: "prompt", deny: "forbidden" } as const;

/**
 * `config.toml` gets `developer_instructions` (Codex has no include, so the
 * shipped instructions are inlined) and the keys from `config/codex.json`;
 * `rules/agentfiles.rules` holds a `prefix_rule` per shell prefix, loaded
 * next to the TUI's `default.rules` (the stricter decision wins).
 * `CODEX_HOME` moves everything.
 */
export const codex: Adapter = {
  name: harness,
  binary: "codex",
  dir: (env, base) => envPath(env, "CODEX_HOME", join(base.home, ".codex")),
  formats: [toml],
  entries: ({ config, dir }) => {
    const settings = join(dir, "config.toml");
    const keys = {
      developer_instructions: config.instructions,
      ...config.keys[harness],
    };
    const rules = (["allow", "ask", "deny"] as const).flatMap((list) =>
      config.permissions[list].map(
        (prefix) =>
          `prefix_rule(pattern = [${prefix
            .split(/\s+/)
            .map((token) => JSON.stringify(token))
            .join(", ")}], decision = "${decisions[list]}")\n`,
      ),
    );
    return [
      ...Object.entries(keys).map(([key, value]): Entry => ({
        kind: "key",
        harness,
        path: settings,
        format: toml,
        key: [key],
        value,
      })),
      {
        kind: "file",
        harness,
        path: join(dir, "rules", "agentfiles.rules"),
        value: `# Written by agentfiles doctor --fix; edits are reported, not overwritten.\n${rules.join("")}`,
      },
    ];
  },
};
