import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Adapter } from "../../core/doctor.js";
import { jsonc } from "../../core/jsonc.js";
import type { Entry } from "../../core/tracked.js";
import { opencodePlugin } from "./install.js";

const harness = "opencode";

/**
 * `opencode.json`, or `opencode.jsonc` when it's the only one: the
 * instructions copy appended to `instructions`, and a V2 shell rule per
 * prefix inserted first in `permissions`, ordered allow, ask, deny. Last
 * match wins and `opencode.json` loads first, so every user rule stays
 * above ours. `<prefix> *` also matches the bare command.
 */
export const opencode: Adapter = {
  name: harness,
  binary: "opencode",
  dir: (_, base) => join(base.config, "opencode"),
  formats: [jsonc],
  plugin: opencodePlugin,
  entries: ({ config, dir, instructions }) => {
    const json = join(dir, "opencode.json");
    const only = join(dir, "opencode.jsonc");
    const path = !existsSync(json) && existsSync(only) ? only : json;
    const rules = (["allow", "ask", "deny"] as const).flatMap((effect) =>
      config.permissions[effect].map((prefix): Entry => ({
        kind: "element",
        harness,
        path,
        format: jsonc,
        key: ["permissions"],
        value: { action: "shell", resource: `${prefix} *`, effect },
        at: "first",
      })),
    );
    return [
      {
        kind: "element",
        harness,
        path,
        format: jsonc,
        key: ["instructions"],
        value: instructions,
        at: "last",
      },
      ...Object.entries(config.keys[harness] ?? {}).map(
        ([key, value]): Entry => ({
          kind: "key",
          harness,
          path,
          format: jsonc,
          key: [key],
          value,
        }),
      ),
      ...rules,
    ];
  },
};
