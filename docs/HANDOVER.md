# Handover

Updated: 2026-11-04, plan 001 PR (#20), grilled

## Where we are

Steps 1 and 2 are done. Step 3 is in the feature loop: [plan 001](plans/001_user-level-config.md) is grilled, its open questions answered in the plan and the decision log, and waits in draft PR #20 for the owner to merge.

## Prove it

Run: `pnpm install && pnpm check && pnpm compile`
Expect: `All matched files use Prettier code style!`, `Tests  44 passed (44)`, `✔ Validation passed`, `compile` without errors.

## Active chunk

None: plan 001 isn't merged.

## Next action

The owner merges plan 001; then execute C01 (CLI scaffold and committed rolldown bundle).

## Decisions not to reopen

- User level only, one plugin per harness, neutral core plus adapters, spiral-review owns its setup: [ADR-001](adr/ADR-001_general-design.md).
- Work runs in strategy, feature and execution loops; execution starts only from a merged plan; agent rows that replace a decision need the owner: [development process](documentation/development_process.md), [decision log](decisions.md).
- User-level config: tracked entries (files, keys, list elements) with one drift rule and six states, plugins carry hooks and MCP servers, env references only, one neutral shell-prefix permissions list, `config/`, one tracked `instructions.md` per machine: [plan 001](plans/001_user-level-config.md), [decision log](decisions.md).
- The CLI is a committed rolldown bundle, no runtime dependencies; `jsonc-parser` for JSON/JSONC, smol-toml plus a verified splice for TOML; five serial chunks: [decision log](decisions.md).
- This repo is the marketplace and the plugin; manifests are generated, committed and checked by the gate; no `build`, `prepare` or other install script: [decision log](decisions.md).
- pnpm stays (this machine has no npm: use `pnpm dlx npm@11`); TypeScript 6 until typescript-eslint supports 7: [decision log](decisions.md).
- Common documentation copies are read-only in owned repos: [decision log](decisions.md). Squash merge only: [source control](documentation/source_control.md).

## Open questions

- How a V1 `permission.bash` object orders against V2 `permissions` rules in one OpenCode file: C05 verifies with `opencode debug agents --standalone`.
- How does an OpenCode user update the plugin? In 2.2.5, `plugin check` and `plugin update` ignore git plugins. This belongs to `doctor` (step 4).
- `pnpm install` skips `pnpm:devPreinstall` when nothing needs installing, so an existing checkout keeps its old `core.hooksPath` until a real install.
