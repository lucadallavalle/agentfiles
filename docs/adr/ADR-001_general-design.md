# ADR-001 - General design

| **Creation Date** | **Status** |
| :---------------: | :--------: |
|    2026-10-31     |  Accepted  |

## Table of Contents

1. [Context](#context)
2. [Decision](#decision)
3. [Alternatives considered](#alternatives)
4. [Consequences and Risks](#consequences)

<a id="context"></a>

## Context

I run three harnesses (Claude Code, OpenCode, Codex) on my machine and on cloud dev machines, in owned and foreign repos. My development process (docs first → grill → plan → plan review → execution → code review) lives in skills, rules and harness config that I set up by hand per machine. This repo started as one Claude Code skill linked by `install.sh`. spiral-review covers the code review step and owns its own setup (`spiral-review init`).

<a id="decision"></a>

## Decision

- **D1 - User level, never enforced on projects.** agentfiles installs into user-level config only. Foreign repos never get a committed file: `attach` writes only under the home directory or `.git/` (e.g. `.git/info/exclude`). Only `scaffold`, on owned repos, commits files.
- **D2 - One plugin per harness.** Skills, hooks and commands ship as one user-level plugin per harness. No symlinks into projects. Skills are written once in the shared `SKILL.md` format; per-harness manifests are generated or thin. Formats are verified from official docs in ROADMAP step 2; where a harness lacks a feature, the gap is documented, not emulated.
- **D3 - Harness-neutral core, one adapter per harness.** Everything harness-specific (paths, manifest and config formats, install commands) lives in that harness's adapter; skills, rules and the CLI logic stay neutral.
- **D4 - Merge, never clobber.** User-level config is merged idempotently: agentfiles changes only what it owns and leaves my local edits alone; a conflict is reported as drift, not overwritten. Mechanism decided in step 3.
- **D5 - CLI `agentfiles`:** `bootstrap`, `attach`, `scaffold`, `doctor` (`--fix`); every command idempotent and safe to rerun. Runs with plain `node` from a git clone at `~/.local/share/agentfiles` that `doctor --fix` keeps on `main`: `{ [ -d ~/.local/share/agentfiles ] || git clone https://github.com/lucadallavalle/agentfiles ~/.local/share/agentfiles; } && node ~/.local/share/agentfiles/bin/agentfiles.js bootstrap --owner lucadallavalle`.
- **D6 - spiral-review owns its setup.** agentfiles calls `spiral-review init` and never reimplements it; missing spiral-review features are ROADMAP dependencies, not workarounds.
- **D7 - Common documentation lives here.** `docs/documentation/` is the source of truth for my documentation rules and templates (imported from spiral-review); `scaffold` copies it into owned repos and `doctor --fix` updates the copies. Copies are read-only: a project records where it deviates in its own decision log; `doctor` reports an edited copy and `--fix` never overwrites it. spiral-review switches to consuming it later.
- **D8 - Toolchain matches spiral-review** (its ADR-002 and decision log): TypeScript 6 strict, Node 24 for development (`devEngines.runtime`), the CLI bundle on Node ≥ 22 (`engines.node`; hosted images ship 22), pnpm, commander, zod, smol-toml, vitest, eslint + prettier, plain `tsc`. One gate, `pnpm check && pnpm build`, also in CI. Reason: one toolchain across my two TypeScript repos; no concrete reason to differ.
- **D9 - Public repo.** So that cloning it works on a fresh machine without credentials.

<a id="alternatives"></a>

## Alternatives considered

- **Dotfiles manager (D2, D4):** good at placing files, but knows nothing of plugin manifests, structured merges of JSON/TOML settings, or per-repo `attach`/`scaffold`; it would still need the adapters.
- **Symlinks into `~/.claude/skills/` (the current `install.sh`) or into projects (D2):** per-harness paths, no hooks or commands, breaks when the repo moves (it did: the `grill` link pointed at the old checkout); links into projects show up in `git status` of foreign repos.
- **Committed per-project config (D1):** what most setups do; violates the foreign repo rule.
- **Shell scripts instead of a TypeScript CLI (D5, D8):** less to maintain, but merging structured config without clobbering is fragile in shell and untestable in practice.
- **Private repo (D9):** keeps my process private; every cloud machine then needs git credentials before bootstrap.

<a id="consequences"></a>

## Consequences and Risks

- **Harness parity is not guaranteed.** OpenCode skill support and Codex plugins and hooks (behind a feature flag) are unverified; the same skill may behave differently per harness, e.g. Claude Code's `disable-model-invocation` has no confirmed equivalent elsewhere.
- **Three moving targets.** Plugin formats change fast; adapters will churn, and a breaking harness release can break the setup on every machine at once.
- **Generated manifests must be committed** if harnesses install plugins straight from the repo; the gate must then fail when they are stale.
- **Never clobbering means drift accumulates** until `doctor` is run; `doctor` is only as good as its definition of "owned".
- **Copies of the common documentation drift** in owned repos when edited despite the rule; `doctor` reports them and the owner moves the change into the project's decision log or upstream into this repo.
- **Not every machine can bootstrap.** Hosted sessions (e.g. Claude Code on the web) may not run a user-level setup step; they get neither plugins nor spiral-review (same gap as spiral-review's "Background and cloud agents").
- **Public repo:** commit emails, my rules and prompts are world-readable; no secret, token or machine-specific path may ever be committed (settings and MCP config reference environment variables). every machine runs whatever is on `main`.
- **More code to maintain** than a shell script, for one user.
