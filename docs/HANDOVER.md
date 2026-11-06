# Handover

Updated: 2026-11-06, plan 002 C08 PR

## Where we are

ROADMAP step 3 is done ([plan 001](plans/001_user-level-config.md)). Step 4 runs as [plan 002](plans/002_cli.md): C01–C07 merged (#29–#35: Node 22 floor, machine documentation copy, repo drift, the clone kept on `main`, plugin drift for all three harnesses, no fallback used); C08 (`bootstrap --owner`, README setup and hosted snippet, step 4's box) is in review.

## Prove it

Run: `pnpm install && pnpm check && pnpm compile`
Expect: `All matched files use Prettier code style!`, `Tests  207 passed (207)`, `✔ Validation passed`, `compile` without errors.

## Active chunk

Plan 002 C08: waits for the owner's manual check (the README snippet as a Claude Code web environment's setup script; `/agentfiles:grill` and `rules/agentfiles.md` in `/context`). If it fails, record the session's `whoami` and `$HOME` and add the gap to ADR-001's consequences before merging.

## Next action

After C08 merges: ask the owner what comes next (step 5, or spiral-review's dependencies of step 4's slot). Plugin chunks: `OLD` is C01's merge commit `14efdc4`.

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
- Codex: `developer_instructions` spliced by recorded exact text, `prefix_rule` decisions `allow`/`prompt`/`forbidden`: [decision log](decisions.md).
- OpenCode: V2 `permissions` only, `<prefix> *` shell rules first; V1 `permission` isn't handled: [decision log](decisions.md).
- Common documentation copies are read-only in owned repos: [decision log](decisions.md). Squash merge only: [source control](documentation/source_control.md).

## Open questions

- [Plan 002](plans/002_cli.md) verifies, each with a fallback: the Codex sequence that moves the installed plugin to a commit (C05); that `opencode plugin remove` + `add` leaves one entry (C06); Claude Code's SSH clone on a machine without keys (C07).
- `pnpm install` skips `pnpm:devPreinstall` when nothing needs installing, so an existing checkout keeps its old `core.hooksPath` until a real install.
