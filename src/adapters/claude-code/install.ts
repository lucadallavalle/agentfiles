import { z } from "zod";
import {
  harness,
  type PluginContext,
  type PluginPart,
} from "../../core/plugins.js";

const Installed = z.array(
  z.looseObject({ id: z.string(), scope: z.string(), version: z.string() }),
);
const Marketplaces = z.array(z.looseObject({ name: z.string() }));

const id = ({ plugin }: PluginContext) =>
  `${plugin.name}@${plugin.marketplace}`;

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

/**
 * The marketplace follows `main`, unpinned, added by its HTTPS URL (no SSH
 * key needed); one already added under the same name is kept. `plugin list
 * --json` shows the installed commit as `version`, its first 12 characters.
 */
export const claudeCodePlugin: PluginPart = {
  pinned: false,
  installed: (context) =>
    json(context, ["plugin", "list", "--json"], Installed).find(
      (p) => p.id === id(context) && p.scope === "user",
    )?.version,
  install: (context) => {
    const { marketplace, repository } = context.plugin;
    const added = json(
      context,
      ["plugin", "marketplace", "list", "--json"],
      Marketplaces,
    ).some((m) => m.name === marketplace);
    harness(
      context,
      added
        ? ["plugin", "marketplace", "update", marketplace]
        : ["plugin", "marketplace", "add", `${repository}.git`],
    );
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
