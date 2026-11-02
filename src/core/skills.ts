import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** A skill as every harness sees it: `skills/<id>/SKILL.md`. */
export interface Skill {
  id: string;
  name: string | undefined;
  description: string | undefined;
  /** `disable-model-invocation: true`: only the user loads it. */
  manualOnly: boolean;
  /** Absolute path of the `SKILL.md`. */
  path: string;
  /** The `SKILL.md` text after the frontmatter. */
  content: string;
}

/** Portable skill ID, shared by the skill format and OpenCode. */
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_ID_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;

/**
 * Parses SKILL.md frontmatter limited to one `key: value` scalar per line.
 * Anything richer (lists, maps, block scalars) throws, so a skill never
 * silently means something different to a full YAML parser.
 */
export function parseFrontmatter(text: string): Record<string, string> {
  return splitFrontmatter(text).fields;
}

function splitFrontmatter(text: string): {
  fields: Record<string, string>;
  body: string;
} {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "---")
    throw new Error("frontmatter must start on line 1 with ---");
  const end = lines.indexOf("---", 1);
  if (end === -1) throw new Error("frontmatter has no closing ---");

  const fields: Record<string, string> = {};
  for (const [index, line] of lines.slice(1, end).entries()) {
    const lineNumber = index + 2;
    if (line.trim() === "") continue;
    const match = /^([a-z][a-z0-9-]*): (.*)$/.exec(line);
    if (!match)
      throw new Error(`line ${String(lineNumber)}: expected "key: value"`);
    const [, key = "", raw = ""] = match;
    if (key in fields)
      throw new Error(`line ${String(lineNumber)}: duplicate key ${key}`);
    fields[key] = scalar(raw.trim(), lineNumber);
  }
  return { fields, body: lines.slice(end + 1).join("\n") };
}

function scalar(raw: string, lineNumber: number): string {
  const quote = raw[0];
  if (quote === '"' || quote === "'") {
    if (
      raw.length < 2 ||
      !raw.endsWith(quote) ||
      raw.slice(1, -1).includes(quote)
    ) {
      throw new Error(`line ${String(lineNumber)}: unsupported quoted value`);
    }
    return raw.slice(1, -1);
  }
  if (
    raw === "" ||
    /^[[{|>&*!#%@`]/.test(raw) ||
    raw.includes(": ") ||
    raw.includes(" #")
  ) {
    throw new Error(`line ${String(lineNumber)}: unsupported value`);
  }
  return raw;
}

/** Reads every `<dir>/<id>/SKILL.md`, sorted by ID. */
export function readSkills(dir: string): Skill[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((id) => {
      const path = join(dir, id, "SKILL.md");
      let fields: Record<string, string>;
      let body: string;
      try {
        ({ fields, body } = splitFrontmatter(readFileSync(path, "utf8")));
      } catch (error) {
        throw new Error(`${path}: ${(error as Error).message}`, {
          cause: error,
        });
      }
      return {
        id,
        name: fields.name,
        description: fields.description,
        manualOnly: fields["disable-model-invocation"] === "true",
        path,
        content: body,
      };
    });
}

/** What would make a harness reject or mis-load the skill; empty when portable. */
export function skillProblems(skill: Skill): string[] {
  const problems: string[] = [];
  if (!ID_PATTERN.test(skill.id) || skill.id.length > MAX_ID_LENGTH) {
    problems.push(
      `ID "${skill.id}" is not lowercase kebab-case of 1-${String(MAX_ID_LENGTH)} characters`,
    );
  }
  if (skill.name !== skill.id)
    problems.push(
      `name "${skill.name ?? ""}" differs from the directory "${skill.id}"`,
    );
  if (!skill.description) problems.push("description is missing");
  else if (skill.description.length > MAX_DESCRIPTION_LENGTH) {
    problems.push(
      `description is longer than ${String(MAX_DESCRIPTION_LENGTH)} characters`,
    );
  }
  return problems;
}
