# Handover

Updated: 2026-11-04, plan 001 C03 PR

## Where we are

Step 3 is in the execution loop of [plan 001](plans/001_user-level-config.md). C01 (CLI, bundle, #21) and C02 (core, #22) are merged. C03 (Claude Code adapter, `jsonc` format) is in its PR; the owner authorized the agent to merge C02–C05 once CI is green. C04 (Codex) and C05 (OpenCode) follow serially.

## Prove it

Run: `pnpm install && pnpm check && pnpm compile`
Expect: `All matched files use Prettier code style!`, `Tests  121 passed (121)`, `✔ Validation passed`, `compile` without errors.

## Active chunk

Plan 001 C03, in review.

## Next action

After C03 merges: execute C04 (Codex adapter: smol-toml read plus the verified splice of `developer_instructions`, `rules/agentfiles.rules`) from a fresh branch off `origin/main`.

## Decisions not to reopen

- User level only, one plugin per harness, neutral core plus adapters, spiral-review owns its setup: [ADR-001](adr/ADR-001_general-design.md).
- Work runs in strategy, feature and execution loops; execution starts only from a merged plan; agent rows that replace a decision need the owner: [development process](documentation/development_process.md), [decision log](decisions.md).
- User-level config: tracked entries (files, keys, list elements) with one drift rule and six states, plugins carry hooks and MCP servers, env references only, one neutral shell-prefix permissions list, `config/`, one tracked `instructions.md` per machine: [plan 001](plans/001_user-level-config.md), [decision log](decisions.md).
- The CLI is a committed rolldown bundle written by `pnpm generate`, no runtime dependencies; `jsonc-parser` for JSON/JSONC, smol-toml plus a verified splice for TOML; five serial chunks: [decision log](decisions.md).
- This repo is the marketplace and the plugin; manifests and the bundle are generated, committed and checked by the gate; no `build`, `prepare` or other install script: [decision log](decisions.md).
- pnpm stays (this machine has no npm: use `pnpm dlx npm@11`); TypeScript 6 until typescript-eslint supports 7: [decision log](decisions.md).
- OpenCode checks run in a fake home with `--standalone`; `plugin add` has no such flag and writes only the fake home: [decision log](decisions.md).
- Core: a `Format` edits text to text; adapters return `Entry` lists and register in `src/adapters/index.ts`; a broken state file stops the whole run: [decision log](decisions.md).
- Claude Code rules are `Bash(<prefix> *)`; `attribution` is the object form; `jsonc` removal keeps neighbouring comments; the bundler prefers `module` over `main`: [decision log](decisions.md).
- Common documentation copies are read-only in owned repos: [decision log](decisions.md). Squash merge only: [source control](documentation/source_control.md).

## Open questions

- How a V1 `permission.bash` object orders against V2 `permissions` rules in one OpenCode file: C05 verifies with `opencode debug agents --standalone`.
- How does an OpenCode user update the plugin? In 2.2.5, `plugin check` and `plugin update` ignore git plugins, and `plugin list --standalone` sees no git plugin. This belongs to `doctor` (step 4).
- `pnpm install` skips `pnpm:devPreinstall` when nothing needs installing, so an existing checkout keeps its old `core.hooksPath` until a real install.
