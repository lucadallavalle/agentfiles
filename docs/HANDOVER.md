# Handover

Updated: 2026-11-10, after the first real-machine run and the step 5 grill (#40)

## Where we are

ROADMAP step 4 is done: [plan 002](plans/002_cli.md) C01–C08 are merged (#29–#36), and `agentfiles bootstrap` / `doctor --fix` set up a machine (plugins at the CLI's commit, user-level config, the documentation copy) and owned repos' copies. `attach`, `scaffold` and the spiral-review slot wait on spiral-review. The owner's machine is bootstrapped (Claude Code 2.1.319, Codex 0.167.0, OpenCode 2.2.6): `agentfiles doctor` reports 31 entries in sync. Claude Code `attribution` ships as `false` since #38. Step 5's skills, order and done criterion are decided (#40).

## Prove it

Run: `pnpm install && pnpm check && pnpm compile`
Expect: `All matched files use Prettier code style!`, `Tests  207 passed (207)`, `✔ Validation passed`, `compile` without errors.

## Active chunk

None.

## Next action

The owner runs the Claude Code web check (Open questions). Write plan 003 for ROADMAP step 5 from its entry and the 2026-11-10 decision rows; grill and merge it; run chunks 1–3 by prompt and 4–5 with `/agentfiles:execute-plan … merge`.

## Decisions not to reopen

- User level only, one plugin per harness, neutral core plus adapters, spiral-review owns its setup: [ADR-001](adr/ADR-001_general-design.md).
- Work runs in strategy, feature and execution loops; execution starts only from a merged plan; agent rows that replace a decision need the owner: [development process](documentation/development_process.md), [decision log](decisions.md).
- User-level config: tracked entries (files, keys, list elements) with one drift rule and six states, plugins carry hooks and MCP servers, env references only, one neutral shell-prefix permissions list, `config/`, one tracked `instructions.md` per machine: [plan 001](plans/001_user-level-config.md), [decision log](decisions.md).
- The CLI is a committed rolldown bundle written by `pnpm generate`, no runtime dependencies; `jsonc-parser` for JSON/JSONC, smol-toml plus a verified splice for TOML; five serial chunks: [decision log](decisions.md).
- This repo is the marketplace and the plugin; manifests and the bundle are generated, committed and checked by the gate; no `build`, `prepare` or other install script: [decision log](decisions.md).
- pnpm stays (this machine has no npm: use `pnpm dlx npm@11`); TypeScript 6 until typescript-eslint supports 7: [decision log](decisions.md).
- Step 5: `review-chunk`, `execute-plan`, `write-plan` and a `grill` change, in one plan in that order (after the common documentation rules); done when `execute-plan` runs chunks 4 and 5: [ROADMAP](ROADMAP.md) step 5, [decision log](decisions.md).
- OpenCode checks run in a fake home with `--standalone`; `plugin add` has no such flag and writes only the fake home: [decision log](decisions.md).
- Core: a `Format` edits text to text; adapters return `Entry` lists and register in `src/adapters/index.ts`; a broken state file stops the whole run: [decision log](decisions.md).
- Claude Code rules are `Bash(<prefix> *)`; `attribution` is `false`; `jsonc` removal keeps neighbouring comments; the bundler prefers `module` over `main`: [decision log](decisions.md).
- Codex: `developer_instructions` spliced by recorded exact text, `prefix_rule` decisions `allow`/`prompt`/`forbidden`: [decision log](decisions.md).
- OpenCode: V2 `permissions` only, `<prefix> *` shell rules first; V1 `permission` isn't handled: [decision log](decisions.md).
- Common documentation copies are read-only in owned repos: [decision log](decisions.md). Squash merge only: [source control](documentation/source_control.md).
- The CLI runs from a clone at `~/.local/share/agentfiles` kept on `main`; its commit is the plugins' reference; `AGENTFILES_COMMIT` must be on `origin/main`: [plan 002](plans/002_cli.md), [decision log](decisions.md).
- Claude Code's marketplace follows `main` by HTTPS; Codex and OpenCode are pinned to the commit: [plan 002](plans/002_cli.md), [decision log](decisions.md).
- Owned means a remote exists and every remote's owner is in `owners`; a copy is unedited when its hash is in the append-only list: [decision log](decisions.md).

## Open questions

- Claude Code web check not recorded: the README snippet as an environment's setup script should list `/agentfiles:grill` and `rules/agentfiles.md` in `/context`. If not, record the session's `whoami` and `$HOME` and add the gap to ADR-001's consequences.
- Codex cloud is unverified until run.
- Claude Code before 2.1.281 rejects `attribution: false` and skips the whole `settings.json` ([decision log](decisions.md)).
- Without `git` on `PATH`, plugin drift says "the CLI doesn't run from a git clone", which misnames the cause.
- `pnpm install` skips `pnpm:devPreinstall` when nothing needs installing, so an existing checkout keeps its old `core.hooksPath` until a real install.
