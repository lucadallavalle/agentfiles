import { z } from "zod";
import {
  harness,
  type PluginContext,
  type PluginPart,
} from "../../core/plugins.js";

const Installed = z.array(
  z.looseObject({ id: z.string(), scope: z.string(), version: z.string() }),
);
const Marketplaces = z.array(
  z.looseObject({
    name: z.string(),
    source: z.string().optional(),
    url: z.string().optional(),
    repo: z.string().optional(),
    path: z.string().optional(),
  }),
);

const id = ({ plugin }: PluginContext) =>
  `${plugin.name}@${plugin.marketplace}`;

const url = ({ plugin }: PluginContext) => `${plugin.repository}.git`;

function json<T>(context: PluginContext, args: string[], schema: z.ZodType<T>) {
  try {
    return schema.parse(JSON.parse(harness(context, args)));
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof z.ZodError)
      throw new Error(`claude ${args.join(" ")}: unexpected output`, {
        cause: error,
      });
    throw error;
  }
}

/** The marketplace added under our name, and why its source is wrong. */
function marketplace(context: PluginContext) {
  const { marketplace: name } = context.plugin;
  const m = json(
    context,
    ["plugin", "marketplace", "list", "--json"],
    Marketplaces,
  ).find((m) => m.name === name);
  if (!m) return { added: false, wrong: `marketplace ${name} missing` };
  if (m.source === "git" && m.url === url(context)) return { added: true };
  const from = m.repo ?? m.url ?? m.path ?? m.source ?? "unknown source";
  return {
    added: true,
    wrong: `marketplace ${name} from ${from}, not ${url(context)}`,
  };
}

/**
 * The marketplace follows `main`, unpinned, added by its HTTPS URL (no SSH
 * key needed); one added under the same name from another source is removed,
 * which uninstalls the plugin, and re-added. `plugin list --json` shows the
 * installed commit as `version`, its first 12 characters.
 */
export const claudeCodePlugin: PluginPart = {
  pinned: false,
  installed: (context) =>
    json(context, ["plugin", "list", "--json"], Installed).find(
      (p) => p.id === id(context) && p.scope === "user",
    )?.version,
  wrongSource: (context) => marketplace(context).wrong,
  install: (context) => {
    const { added, wrong } = marketplace(context);
    const name = context.plugin.marketplace;
    if (!wrong) harness(context, ["plugin", "marketplace", "update", name]);
    else {
      if (added) harness(context, ["plugin", "marketplace", "remove", name]);
      harness(context, ["plugin", "marketplace", "add", url(context)]);
    }
    harness(context, ["plugin", "install", id(context), "-s", "user"]);
  },
  update: (context) => {
    harness(context, [
      "plugin",
      "marketplace",
      "update",
      context.plugin.marketplace,
    ]);
    harness(context, ["plugin", "update", id(context), "-s", "user"]);
  },
};
