# Handover

Updated: 2026-11-12, plan 003 C04

## Where we are

ROADMAP step 4 is done: [plan 002](plans/002_cli.md) C01–C08 are merged (#29–#36), and `agentfiles bootstrap` / `doctor --fix` set up a machine (plugins at the CLI's commit, user-level config, the documentation copy) and owned repos' copies. `attach`, `scaffold` and the spiral-review slot wait on spiral-review. The owner's machine is bootstrapped (Claude Code 2.1.319, Codex 0.167.0, OpenCode 2.2.6): `agentfiles doctor` reports 31 entries in sync. Claude Code `attribution` ships as `false` since #38. Step 5's skills, order and done criterion are decided (#40); [plan 003](plans/003_skills.md) is merged (#41). Its C01 is merged (#42): the common documentation has an Open questions section for plans, disjoint files that include shared config, schema and setup, a handover written as of after its PR merges and the `agent (questionable)` marker; `AGENTS.md` has the fake-home setup that loads a worktree's skills. The machine's and owned repos' copies report `outdated` until `doctor --fix`. C02 is merged (#43): `review-chunk`, model-invoked, reviews one chunk's PR or branch against its plan and its code; in its trial runs it flagged both defects seeded into a replay of #36 and found two real bugs in #36 (Open questions). C03 is merged (#44): `execute-plan`, manual-only, orchestrates a merged plan's chunks (implementers, `review-chunk` loop, PRs, handover, merges with `merge`); C04 was its first run. C04 is merged (#45): `write-plan`, model-invoked, writes a plan from the common template (repo copy, else the machine's) on a docs PR, always with Open questions and Execution; without a remote it stops at the commit.

## Prove it

Run: `pnpm install && pnpm check && pnpm compile`
Expect: `All matched files use Prettier code style!`, `Tests  210 passed (210)`, `✔ Validation passed`, `compile` without errors.

## Active chunk

[Plan 003](plans/003_skills.md) C05 (`grill`), not started.

## Next action

`execute-plan docs/plans/003_skills.md merge` (C05). The owner runs the Claude Code web check (Open questions).

## Decisions not to reopen

- User level only, one plugin per harness, neutral core plus adapters, spiral-review owns its setup: [ADR-001](adr/ADR-001_general-design.md).
- Work runs in strategy, feature and execution loops; execution starts only from a merged plan; agent rows that replace a decision need the owner: [development process](documentation/development_process.md), [decision log](decisions.md).
- User-level config: tracked entries (files, keys, list elements) with one drift rule and six states, plugins carry hooks and MCP servers, env references only, one neutral shell-prefix permissions list, `config/`, one tracked `instructions.md` per machine: [plan 001](plans/001_user-level-config.md), [decision log](decisions.md).
- The CLI is a committed rolldown bundle written by `pnpm generate`, no runtime dependencies; `jsonc-parser` for JSON/JSONC, smol-toml plus a verified splice for TOML; five serial chunks: [decision log](decisions.md).
- This repo is the marketplace and the plugin; manifests and the bundle are generated, committed and checked by the gate; no `build`, `prepare` or other install script: [decision log](decisions.md).
- pnpm stays (this machine has no npm: use `pnpm dlx npm@11`); TypeScript 6 until typescript-eslint supports 7: [decision log](decisions.md).
- Step 5: `review-chunk`, `execute-plan`, `write-plan` and a `grill` change, in one plan in that order (after the common documentation rules); done when `execute-plan` runs chunks 4 and 5: [ROADMAP](ROADMAP.md) step 5, [decision log](decisions.md).
- Plan 003: fake-home checks load the worktree's skills (`doctor --fix` can't); the review loop runs on the pushed branch before the PR, same reviewer each round; `review-chunk` has its own code pass only until spiral-review's `pr`: [plan 003](plans/003_skills.md), [decision log](decisions.md).
- Harness checks run in a fake home under `/tmp`; a worktree's skills load from its root in a fake home `doctor` hasn't written, OpenCode through `opencode serve` without `--standalone` (it stops before plugins load): [AGENTS.md](../AGENTS.md), [decision log](decisions.md).
- A `questionable` agent row has `agent (questionable)` in **Made By**: [decision log template](documentation/decision_log_template.md).
- Core: a `Format` edits text to text; adapters return `Entry` lists and register in `src/adapters/index.ts`; a broken state file stops the whole run: [decision log](decisions.md).
- Claude Code rules are `Bash(<prefix> *)`; `attribution` is `false`; `jsonc` removal keeps neighbouring comments; the bundler prefers `module` over `main`: [decision log](decisions.md).
- Codex: `developer_instructions` spliced by recorded exact text, `prefix_rule` decisions `allow`/`prompt`/`forbidden`: [decision log](decisions.md).
- OpenCode: V2 `permissions` only, `<prefix> *` shell rules first; V1 `permission` isn't handled: [decision log](decisions.md).
- Common documentation copies are read-only in owned repos: [decision log](decisions.md). Squash merge only: [source control](documentation/source_control.md).
- The CLI runs from a clone at `~/.local/share/agentfiles` kept on `main`; its commit is the plugins' reference; `AGENTFILES_COMMIT` must be on `origin/main`: [plan 002](plans/002_cli.md), [decision log](decisions.md).
- Claude Code's marketplace follows `main` by HTTPS; Codex and OpenCode are pinned to the commit: [plan 002](plans/002_cli.md), [decision log](decisions.md).
- Owned means a remote exists and every remote's owner is in `owners`; a copy is unedited when its hash is in the append-only list: [decision log](decisions.md).

## Open questions

- The owner reads `write-plan`'s four `agent (questionable)` rows of 2026-11-12 (#45), first: Open questions and Execution in a small plan too, beyond the template's sizing guide; it never interviews, it writes the plan on its recommended answers. Its `agent` row also holds two judgement calls: a worktree only when the checkout has uncommitted work, and the gate before the commit.
- `write-plan` writes to `docs/plans/` in any repo, with no owned or foreign check: a plan in a foreign repo would be a committed file there. Wanted?
- `write-plan`, from its trial (#45): six open questions for a one-line request, no threshold for choices too small to ask; a recommended gate can name a file the plan itself creates; "approves by merging" has no meaning without a remote; in a clean checkout it switches the current branch.
- Deferred from #45's review: no skill says what to do when neither the repo nor the machine has the common documentation (before `doctor --fix`).
- The owner reads `execute-plan`'s six `agent (questionable)` rows of 2026-11-12 (#44), first: it resumes from `origin` (boxes, branches, PRs) rather than from Active chunk alone, and a red gate on `main` is fixed through a `fix/` branch instead of stopping.
- With `merge`, `execute-plan` merges a PR whose amendment doesn't change behaviour without the owner's review, as plan 003 decides; the development process asks for the owner's review of a PR with an amendment. Which holds?
- `execute-plan`, deferred from #44's review: step 6's "nothing but the handover may have changed" against the parallel rule's merge of `origin/main`; without `merge`, open PRs of independent chunks carry handovers that go stale.
- `bootstrap --owner ""` writes an empty owner that `config.json`'s reader rejects, so `doctor` and `bootstrap` exit 2 until the file is edited by hand; `--owner " me "` is appended again on every run. Found by `review-chunk` on #36, reproduced (#43); outside plan 003.
- The owner confirms `review-chunk`'s four `agent (questionable)` rows of 2026-11-12, first the one where a later round reviews the whole diff: plan 003's "the diff since its last round in full" can also mean only the new commits.
- `review-chunk`, deferred from #43's review: on a branch it diffs the local `HEAD`, so its caller must give it a checkout at the pushed head; it doesn't say what to do with `Accept:` clauses no diff can show; a later round without its earlier report asks the caller instead of reading its own PR comment.
- The owner confirms the 2026-11-12 decision row on `opencode serve` without `--standalone`: the agent wrote it under the owner's name, from plan 003 and the owner's prompt for C01 (#42's review comment).
- The fake-home block in `AGENTS.md` uses the fixed port 4797 and prints nothing when OpenCode's skills don't load within 30 s; fine while chunks run serially.
- Claude Code web check not recorded: the README snippet as an environment's setup script should list `/agentfiles:grill` and `rules/agentfiles.md` in `/context`. If not, record the session's `whoami` and `$HOME` and add the gap to ADR-001's consequences.
- Codex cloud is unverified until run.
- Claude Code before 2.1.281 rejects `attribution: false` and skips the whole `settings.json` ([decision log](decisions.md)).
- Without `git` on `PATH`, plugin drift says "the CLI doesn't run from a git clone", which misnames the cause.
- `pnpm install` skips `pnpm:devPreinstall` when nothing needs installing, so an existing checkout keeps its old `core.hooksPath` until a real install.
