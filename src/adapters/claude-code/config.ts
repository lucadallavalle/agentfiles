import { join } from "node:path";
import type { Adapter } from "../../core/doctor.js";
import { envPath } from "../../core/files.js";
import { jsonc } from "../../core/jsonc.js";
import type { Entry } from "../../core/tracked.js";
import { claudeCodePlugin } from "./install.js";

const harness = "claude-code";

/**
 * `rules/agentfiles.md` imports the instructions copy (`@~/…` loads at
 * user level without a prompt); `settings.json` gets the keys from
 * `config/claude-code.json` and a `Bash(<prefix> *)` rule per shell prefix,
 * appended to `permissions.allow`, `ask` and `deny` (deny > ask > allow, so
 * order is irrelevant). `CLAUDE_CONFIG_DIR` moves everything.
 */
export const claudeCode: Adapter = {
  name: harness,
  binary: "claude",
  dir: (env, base) =>
    envPath(env, "CLAUDE_CONFIG_DIR", join(base.home, ".claude")),
  formats: [jsonc],
  plugin: claudeCodePlugin,
  entries: ({ config, dir, instructions }) => {
    const settings = join(dir, "settings.json");
    const rules = (["allow", "ask", "deny"] as const).flatMap((list) =>
      config.permissions[list].map((prefix): Entry => ({
        kind: "element",
        harness,
        path: settings,
        format: jsonc,
        key: ["permissions", list],
        value: `Bash(${prefix} *)`,
        at: "last",
      })),
    );
    return [
      {
        kind: "file",
        harness,
        path: join(dir, "rules", "agentfiles.md"),
        value: `@${instructions}\n`,
      },
      ...Object.entries(config.keys[harness] ?? {}).map(
        ([key, value]): Entry => ({
          kind: "key",
          harness,
          path: settings,
          format: jsonc,
          key: [key],
          value,
        }),
      ),
      ...rules,
    ];
  },
};
