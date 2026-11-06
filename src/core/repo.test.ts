import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { repoDrift, type RepoOptions } from "./repo.js";
import { hash } from "./tracked.js";

const env = {
  HOME: mkdtempSync(join(tmpdir(), "agentfiles-repo-home-")),
  PATH: process.env.PATH,
};

/** A git repo with the given remotes. */
function repo(...remotes: string[]) {
  const dir = mkdtempSync(join(tmpdir(), "agentfiles-repo-"));
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: dir, env, stdio: "ignore" });
  git("init", "-q");
  remotes.forEach((url, i) => git("remote", "add", `r${String(i)}`, url));
  const at = (path: string) => join(dir, "docs", "documentation", path);
  return {
    dir,
    git,
    write: (path: string, text: string) => {
      mkdirSync(dirname(at(path)), { recursive: true });
      writeFileSync(at(path), text);
    },
    read: (path: string) =>
      existsSync(at(path)) ? readFileSync(at(path), "utf8") : undefined,
  };
}

/** The CLI's own root, with a `package.json` naming its repo. */
const root = mkdtempSync(join(tmpdir(), "agentfiles-repo-root-"));
writeFileSync(
  join(root, "package.json"),
  '{"repository": {"url": "git+https://github.com/me/agentfiles.git"}}',
);

function drift(cwd: string, over: Partial<RepoOptions> = {}) {
  return repoDrift({
    cwd,
    env,
    root,
    documentation: [
      { name: "README.md", text: "v2\n", source: "/s/README.md" },
      { name: "sub/a.md", text: "a\n", source: "/s/sub/a.md" },
    ],
    hashes: {
      "README.md": [hash("file", "v1\n"), hash("file", "v2\n")],
      "sub/a.md": [hash("file", "a\n")],
      "old.md": [hash("file", "old\n")],
    },
    owners: ["Me"],
    fix: false,
    ...over,
  });
}

const ssh = "git@github.com:me/x.git";

describe("repo drift", () => {
  it("reports missing, outdated and unshipped copies; --fix writes or removes them", () => {
    const r = repo(ssh);
    r.write("README.md", "v1\n");
    r.write("old.md", "old\n");
    r.write("mine.md", "the project's own\n");
    expect(drift(r.dir)).toEqual([
      { path: "docs/documentation/README.md", state: "outdated", fixed: false },
      { path: "docs/documentation/old.md", state: "unshipped", fixed: false },
      { path: "docs/documentation/sub/a.md", state: "missing", fixed: false },
    ]);
    expect(r.read("README.md")).toBe("v1\n");

    expect(drift(r.dir, { fix: true }).map((o) => o.fixed)).toEqual([
      true,
      true,
      true,
    ]);
    expect(r.read("README.md")).toBe("v2\n");
    expect(r.read("sub/a.md")).toBe("a\n");
    expect(r.read("old.md")).toBeUndefined();
    expect(r.read("mine.md")).toBe("the project's own\n");
    expect(drift(r.dir, { fix: true })).toEqual([
      { path: "docs/documentation/README.md", state: "in sync", fixed: false },
      { path: "docs/documentation/sub/a.md", state: "in sync", fixed: false },
    ]);
  });

  it("reports edited copies and --fix leaves them alone", () => {
    const r = repo(ssh);
    r.write("README.md", "mine\n");
    r.write("sub/a.md", "a\n");
    r.write("old.md", "changed\n");
    const edited = [
      { path: "docs/documentation/README.md", state: "edited", fixed: false },
      { path: "docs/documentation/old.md", state: "edited", fixed: false },
      { path: "docs/documentation/sub/a.md", state: "in sync", fixed: false },
    ];
    expect(drift(r.dir)).toEqual(edited);
    expect(drift(r.dir, { fix: true })).toEqual(edited);
    expect(r.read("README.md")).toBe("mine\n");
    expect(r.read("old.md")).toBe("changed\n");
  });

  it("checks the repo of a subdirectory, by an HTTPS remote", () => {
    const r = repo("https://github.com/ME/x");
    mkdirSync(join(r.dir, "src"));
    expect(drift(join(r.dir, "src"))).toHaveLength(2);
  });

  it("is silent outside a git repo, in a foreign repo, a fork of one and the CLI's own repo", () => {
    expect(drift(mkdtempSync(join(tmpdir(), "agentfiles-plain-")))).toEqual([]);
    expect(drift(repo().dir)).toEqual([]);
    expect(drift(repo("https://github.com/other/x.git").dir)).toEqual([]);
    expect(
      drift(repo(ssh, "https://github.com/other/x.git").dir, { fix: true }),
    ).toEqual([]);
    expect(drift(repo(ssh).dir, { owners: [] })).toEqual([]);
    expect(drift(repo("git@github.com:me/agentfiles").dir)).toEqual([]);
  });

  it("is silent without git on PATH", () => {
    expect(drift(repo(ssh).dir, { env: { ...env, PATH: "" } })).toEqual([]);
  });
});
