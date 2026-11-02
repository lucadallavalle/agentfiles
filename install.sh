#!/usr/bin/env bash
# Interim setup until the `prepare` script lands (docs/ROADMAP.md, step 2): enables the git hooks in .githooks/.
# Skills come from the plugin now; links made by earlier versions of this script are left in place.
# Safe to run any number of times; runs after each pull through .githooks/post-merge.
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
git -C "$repo" config core.hooksPath .githooks
