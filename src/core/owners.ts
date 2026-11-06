import { join } from "node:path";
import { z } from "zod";
import { readText, type Paths } from "./files.js";

/** `~/.config/agentfiles/config.json`, written by `bootstrap --owner`. */
const AgentfilesConfig = z.strictObject({
  owners: z.array(z.string().trim().min(1)),
});

export function ownersPath(base: Paths): string {
  return join(base.config, "agentfiles", "config.json");
}

/** The owners of owned repos; none when the file doesn't exist. Throws when it doesn't parse. */
export function readOwners(path: string): string[] {
  const text = readText(path);
  if (text === undefined) return [];
  try {
    return AgentfilesConfig.parse(JSON.parse(text)).owners;
  } catch (error) {
    const message =
      error instanceof z.ZodError ? z.prettifyError(error) : String(error);
    throw new Error(`${path}: ${message}`, { cause: error });
  }
}

/**
 * The path segments of a remote URL, HTTPS or SSH, any host; undefined
 * for a local path, which has no owner.
 */
export function urlPath(url: string): string[] | undefined {
  let path: string;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return undefined;
    }
    if (!parsed.host) return undefined;
    path = parsed.pathname;
  } else {
    // scp-like: [user@]host:path
    const scp = /^(?:[^@/]+@)?[^:/]+:(.+)$/.exec(url);
    if (!scp?.[1]) return undefined;
    path = scp[1];
  }
  const segments = path.split("/").filter(Boolean);
  return segments.length ? segments : undefined;
}

/** `owner/name` in lower case, without `.git`. */
export function repoName(url: string): string | undefined {
  const [owner, name] = urlPath(url) ?? [];
  if (!owner || !name) return undefined;
  return `${owner}/${name.replace(/\.git$/, "")}`.toLowerCase();
}

/** Owned when there is a remote and every remote's owner is in `owners`, case-insensitive. */
export function isOwned(
  remotes: readonly string[],
  owners: readonly string[],
): boolean {
  const known = new Set(owners.map((owner) => owner.toLowerCase()));
  return (
    remotes.length > 0 &&
    remotes.every((url) => {
      const owner = urlPath(url)?.[0];
      return owner !== undefined && known.has(owner.toLowerCase());
    })
  );
}
