#!/usr/bin/env bash
# Interim installer until the plugins land (docs/ROADMAP.md, step 2).
# Links every skill in skills/ into ~/.claude/skills/ and enables the git hooks in .githooks/.
# Safe to run any number of times; runs after each pull through .githooks/post-merge.
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
mkdir -p "$target"
git -C "$repo" config core.hooksPath .githooks

# Drop links to skills that were removed from this repo.
for link in "$target"/*; do
  [ -L "$link" ] || continue
  case "$(readlink "$link")" in
    "$repo"/*) [ -e "$link" ] || { rm "$link"; echo "removed $(basename "$link")"; } ;;
  esac
done

for skill in "$repo"/skills/*/; do
  skill="${skill%/}"
  name="$(basename "$skill")"
  [ -f "$skill/SKILL.md" ] || continue
  link="$target/$name"
  if [ -L "$link" ]; then
    [ "$(readlink "$link")" = "$skill" ] && continue
    if [ -e "$link" ]; then
      echo "skip $name: $link already points to $(readlink "$link")" >&2
      continue
    fi
    # A dangling link holds nothing (e.g. the repo was moved): replace it.
    rm "$link"
  elif [ -e "$link" ]; then
    echo "skip $name: $link exists and is not a link" >&2
    continue
  fi
  ln -s "$skill" "$link"
  echo "linked $name"
done
