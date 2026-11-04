import {
  applyEdits,
  findNodeAtLocation,
  modify,
  parseTree,
  parse,
  printParseErrorCode,
  type FormattingOptions,
  type ParseError,
} from "jsonc-parser";
import type { Format } from "./tracked.js";

/** The file's own indentation and line ending, else two spaces and `\n`. */
function formatting(text: string): FormattingOptions {
  const indent = /^([ \t]+)\S/m.exec(text)?.[1] ?? "  ";
  return {
    insertSpaces: !indent.startsWith("\t"),
    tabSize: indent.startsWith("\t") ? 1 : indent.length,
    eol: text.includes("\r\n") ? "\r\n" : "\n",
  };
}

function edit(
  text: string,
  path: readonly (string | number)[],
  value: unknown,
  isArrayInsertion = false,
): string {
  const base = text.trim() ? text : "{}\n";
  const edits = modify(base, [...path], value, {
    formattingOptions: formatting(text),
    isArrayInsertion,
  });
  return applyEdits(base, edits);
}

/**
 * Removes a property or element, its comma and its same-line comment.
 * `jsonc-parser` alone also removes the comments above the next item, or
 * the previous item's same-line comment when removing the last one, and
 * with formatting options it reformats the whole range; those are kept.
 */
function remove(text: string, path: readonly (string | number)[]): string {
  const tree = parseTree(text);
  const node = tree && findNodeAtLocation(tree, [...path]);
  const [change] = modify(text, [...path], undefined, {});
  if (!node || !change) return text;
  const item = node.parent?.type === "property" ? node.parent : node;
  const before = text.slice(change.offset, item.offset);
  const after = text.slice(
    item.offset + item.length,
    change.offset + change.length,
  );
  // Removing the last item starts at the previous item's comma.
  const content = before.startsWith(",")
    ? (before.slice(1).split("\n")[0] ?? "").trimEnd()
    : before + after.replace(/^[^\n]*(\n[ \t]*|$)/, "");
  return applyEdits(text, [{ ...change, content }]);
}

/**
 * JSON and JSONC (Claude Code `settings.json`, OpenCode `opencode.json(c)`),
 * edited one path at a time by `jsonc-parser`: comments, formatting and key
 * order survive.
 */
export const jsonc: Format = {
  name: "jsonc",
  parse: (text) => {
    if (!text.trim()) return {};
    const errors: ParseError[] = [];
    const doc: unknown = parse(text, errors, { allowTrailingComma: true });
    const first = errors[0];
    if (first)
      throw new Error(
        `${printParseErrorCode(first.error)} at offset ${String(first.offset)}`,
      );
    if (!doc || typeof doc !== "object" || Array.isArray(doc))
      throw new Error("not a JSON object");
    return doc;
  },
  set: (text, key, value) => edit(text, key, value),
  remove,
  insert: (text, key, index, value) => edit(text, [...key, index], value, true),
};
