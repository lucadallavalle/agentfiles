import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { readSkills, skillProblems, type Skill } from "./skills.js";

/** What every adapter needs to write its harness's manifests. */
export interface PluginMetadata {
  name: string;
  /** The GitHub owner of `repository`: unique per owner, unlike the plugin name. */
  marketplace: string;
  description: string;
  author: { name: string };
  license: string;
  /** Web URL of the repository, without `git+` or `.git`. */
  repository: string;
  skills: Skill[];
}

const PackageJson = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  author: z.union([z.string().min(1), z.object({ name: z.string().min(1) })]),
  license: z.string().min(1),
  repository: z.object({ type: z.literal("git"), url: z.url() }),
});

/** Reads `<root>/package.json` and `<root>/skills/`; throws on a non-portable skill. */
export function readPluginMetadata(root: string): PluginMetadata {
  const pkg = PackageJson.parse(
    JSON.parse(readFileSync(join(root, "package.json"), "utf8")),
  );
  const skills = readSkills(join(root, "skills"));
  const problems = skills.flatMap((skill) =>
    skillProblems(skill).map((problem) => `skills/${skill.id}: ${problem}`),
  );
  if (problems.length > 0) throw new Error(problems.join("\n"));

  const repository = pkg.repository.url
    .replace(/^git\+/, "")
    .replace(/\.git$/, "");
  const owner = /^https:\/\/github\.com\/([A-Za-z0-9-]+)\/[^/]+$/.exec(
    repository,
  )?.[1];
  if (!owner)
    throw new Error(`repository ${repository} is not a GitHub repository URL`);

  return {
    name: pkg.name,
    marketplace: owner.toLowerCase(),
    description: pkg.description,
    author: {
      name: typeof pkg.author === "string" ? pkg.author : pkg.author.name,
    },
    license: pkg.license,
    repository,
    skills,
  };
}
