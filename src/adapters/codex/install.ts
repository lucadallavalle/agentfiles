import { join } from "node:path";
import { parse } from "smol-toml";
import { readText } from "../../core/files.js";
import {
  harness,
  type PluginContext,
  type PluginPart,
} from "../../core/plugins.js";

interface Installed {
  /** The marketplace's pinned commit; undefined when unpinned. */
  ref: string | undefined;
  marketplace: boolean;
  plugin: boolean;
}

function read(context: PluginContext): Installed {
  const path = join(context.dir, "config.toml");
  let doc: Record<string, unknown>;
  try {
    doc = parse(readText(path) ?? "");
  } catch (error) {
    throw new Error(`${path}: ${(error as Error).message}`, { cause: error });
  }
  const table = (value: unknown) =>
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : undefined;
  const { plugin } = context;
  const marketplace = table(table(doc.marketplaces)?.[plugin.marketplace]);
  const ref = marketplace?.ref;
  return {
    ref: typeof ref === "string" ? ref : undefined,
    marketplace: marketplace !== undefined,
    plugin: table(doc.plugins)?.[id(context)] !== undefined,
  };
}

const id = ({ plugin }: PluginContext) =>
  `${plugin.name}@${plugin.marketplace}`;

/** `owner/name@<commit>`, from the repository's GitHub URL. */
const source = ({ plugin }: PluginContext, commit: string) =>
  `${new URL(plugin.repository).pathname.slice(1)}@${commit}`;

/**
 * The marketplace is pinned to the CLI's commit; its `ref` in
 * `config.toml` is the installed commit while the plugin is installed. A
 * pinned marketplace moves only by `marketplace remove` + `add …@<sha>`,
 * which leaves the plugin as it was, so the plugin is removed first and
 * added again: a failure midway leaves it missing, never a `ref` newer
 * than the plugin.
 */
export const codexPlugin: PluginPart = {
  pinned: true,
  installed: (context) => {
    const installed = read(context);
    if (!installed.plugin) return undefined;
    // Unpinned (the former README install) follows main.
    return installed.ref ?? "main";
  },
  install: (context, commit) => {
    const { marketplace, ref } = read(context);
    if (marketplace && ref !== commit)
      harness(context, [
        "plugin",
        "marketplace",
        "remove",
        context.plugin.marketplace,
      ]);
    if (!marketplace || ref !== commit)
      harness(context, [
        "plugin",
        "marketplace",
        "add",
        source(context, commit),
      ]);
    harness(context, ["plugin", "add", id(context)]);
  },
  update: (context, commit) => {
    harness(context, ["plugin", "remove", id(context)]);
    codexPlugin.install(context, commit);
  },
};
