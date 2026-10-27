#!/usr/bin/env bash
# Links every skill in this repo into ~/.claude/skills/ and enables the hooks in hooks/.
# Safe to run any number of times; runs after each pull through hooks/post-merge.
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
mkdir -p "$target"
git -C "$repo" config core.hooksPath hooks

for skill in "$repo"/*/; do
  skill="${skill%/}"
  name="$(basename "$skill")"
  [ -f "$skill/SKILL.md" ] || continue
  link="$target/$name"
  if [ -L "$link" ]; then
    [ "$(readlink "$link")" = "$skill" ] && continue
    echo "skip $name: $link already points to $(readlink "$link")" >&2
  elif [ -e "$link" ]; then
    echo "skip $name: $link exists and is not a link" >&2
  else
    ln -s "$skill" "$link"
    echo "linked $name"
  fi
done

# Drop links to skills that were removed from this repo.
for link in "$target"/*; do
  [ -L "$link" ] || continue
  case "$(readlink "$link")" in
    "$repo"/*) [ -e "$link" ] || { rm "$link"; echo "removed $(basename "$link")"; } ;;
  esac
done
