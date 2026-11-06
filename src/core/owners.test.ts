import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isOwned, readOwners, repoName, urlPath } from "./owners.js";

describe("urlPath", () => {
  it.each([
    ["https://github.com/me/x.git", ["me", "x.git"]],
    ["https://user@gitlab.example.com:8443/Me/x", ["Me", "x"]],
    ["git+https://github.com/me/x.git", ["me", "x.git"]],
    ["ssh://git@github.com/me/x.git", ["me", "x.git"]],
    ["git@github.com:me/x.git", ["me", "x.git"]],
    ["github.com:me/x", ["me", "x"]],
  ])("reads %s", (url, segments) => {
    expect(urlPath(url)).toEqual(segments);
  });

  it.each(["/srv/git/x.git", "../x", "file:///srv/git/x.git", "https://h/"])(
    "has no owner for %s",
    (url) => {
      expect(urlPath(url)).toBeUndefined();
    },
  );
});

describe("repoName", () => {
  it("is owner/name in lower case without .git", () => {
    expect(repoName("git+https://github.com/Me/X.git")).toBe("me/x");
    expect(repoName("git@github.com:me/x")).toBe("me/x");
    expect(repoName("https://github.com/me")).toBeUndefined();
  });
});

describe("isOwned", () => {
  it("needs a remote, and every remote's owner in owners, case-insensitive", () => {
    expect(isOwned(["git@github.com:ME/x.git"], ["me"])).toBe(true);
    expect(
      isOwned(
        ["git@github.com:me/x.git", "https://gitlab.com/Org/y"],
        ["me", "org"],
      ),
    ).toBe(true);
    expect(isOwned([], ["me"])).toBe(false);
    expect(
      isOwned(
        ["git@github.com:me/x.git", "https://github.com/other/x.git"],
        ["me"],
      ),
    ).toBe(false);
    expect(isOwned(["/srv/git/x.git"], ["me"])).toBe(false);
    expect(isOwned(["git@github.com:me/x.git"], [])).toBe(false);
  });
});

describe("readOwners", () => {
  const file = (text?: string) => {
    const path = join(
      mkdtempSync(join(tmpdir(), "agentfiles-owners-")),
      "config.json",
    );
    if (text !== undefined) writeFileSync(path, text);
    return path;
  };

  it("reads owners, none without the file", () => {
    expect(readOwners(file('{"owners": ["me", "org"]}'))).toEqual([
      "me",
      "org",
    ]);
    expect(readOwners(file())).toEqual([]);
  });

  it.each(["{", '{"owners": [""]}', '{"owners": "me"}', '{"owner": ["me"]}'])(
    "rejects %s",
    (text) => {
      expect(() => readOwners(file(text))).toThrow(/config\.json/);
    },
  );
});
