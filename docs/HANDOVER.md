# Handover

Updated: 2026-11-27, the development process has one PR cycle and a fast path

## Where we are

ROADMAP step 4 is done: [plan 002](plans/002_cli.md) C01–C08 are merged (#29–#36), and `agentfiles bootstrap` / `doctor --fix` set up a machine (plugins at the CLI's commit, user-level config, the documentation copy) and owned repos' copies. `attach`, `scaffold` and the spiral-review slot wait on spiral-review. The owner's machine is bootstrapped (Claude Code 2.1.319, Codex 0.167.0, OpenCode 2.2.6): `agentfiles doctor` reports 31 entries in sync. Claude Code `attribution` ships as `false` since #38. Step 5's skills, order and done criterion are decided (#40); [plan 003](plans/003_skills.md) is merged (#41). Its C01 is merged (#42): the common documentation has an Open questions section for plans, disjoint files that include shared config, schema and setup, a handover written as of after its PR merges and the `agent (questionable)` marker; `AGENTS.md` has the fake-home setup that loads a worktree's skills. The machine's and owned repos' copies report `outdated` until `doctor --fix`. C02 is merged (#43): `review-chunk`, model-invoked, reviews one chunk's PR or branch against its plan and its code; in its trial runs it flagged both defects seeded into a replay of #36 and found two real bugs in #36 (Open questions). C03 is merged (#44): `execute-plan`, manual-only, orchestrates a merged plan's chunks (implementers, `review-chunk` loop, PRs, handover, merges with `merge`); C04 was its first run. C04 is merged (#45): `write-plan`, model-invoked, writes a plan from the common template (repo copy, else the machine's) on a docs PR, always with Open questions and Execution; without a remote it stops at the commit. C05 is merged (#46): `grill` edits an unmerged plan in place, pushes its outcomes to the open PR's branch after the gate and names the next skill. ROADMAP step 5 is done: plan 003's five chunks are merged, C04 and C05 through `/agentfiles:execute-plan docs/plans/003_skills.md merge`, its final report a comment on #46. `write-plan`'s second pass is merged (#47): it asks before writing a plan in a repo that isn't owned and keeps small choices out of Open questions. ROADMAP step 6 is added (#48) and its Needs are settled ([decision log](decisions.md), 2026-11-21). The plan template's Execution Chunks say that an `Accept:` fails before its chunk and passes after it, and define the `Owner check:` line; `write-plan` runs each `Accept:` before it commits (#51). The machine's and owned repos' copies of the template report `outdated` until `doctor --fix`. `execute-plan`'s second pass is done: a PR with an amendment or an `Owner check:` is left to the owner and stops the run, a branch contains `origin/main` before it merges, worktrees live outside the checkout. The `grill` patch is done: without an open PR it commits, without a push, on the document's own branch (`write-plan`'s closing line follows); it writes on the open PR's branch, found with `gh`, commits without a push when the gate fails on something it didn't write, and goes on without the common documentation (#54). `review-chunk`'s second pass is done (#55), and with it ROADMAP step 6: it reviews the pushed head whatever the checkout's `HEAD`, runs each `Accept:` at the base and the head, leaves what it can't run to the caller and an `Owner check:` to the owner, reads its earlier report from the PR, and takes an amendment for what the plan only leaves out as a fix. The [development process](documentation/development_process.md) has a PR cycle every PR of every loop runs (write, local review, CI, watch by the same session, merge) and a new merge rule: the owner approves every strategy PR and every PRD, a plan or execution PR only when `needs-human`. A small change takes the fast path: one execution PR without a PRD or a plan, when it touches only execution paths, changes no behaviour beyond a fix, takes no architecture-level decision and fits one PR and one session. The [model](models/development_process.png) draws it, dashed where a part isn't built. `write-plan`'s closing line and the templates' "immutable after merge" follow. The machine's and owned repos' copies of the changed documents report `outdated` until `doctor --fix`.

## Prove it

Run: `pnpm install && pnpm check && pnpm compile`
Expect: `All matched files use Prettier code style!`, `Tests  212 passed (212)`, `✔ Validation passed`, `compile` without errors.

## Active chunk

None.

## Next action

ROADMAP step 7, PR cycle in the skills: watch a few PRs by hand, settle its Needs (e.g. in a `grill` session), then `write-plan`. `node bin/agentfiles.js doctor --fix` and a new session load the merged skills. The Claude Code web check is still owed (Open questions).

## Decisions not to reopen

- User level only, one plugin per harness, neutral core plus adapters, spiral-review owns its setup: [ADR-001](adr/ADR-001_general-design.md).
- Work runs in strategy, feature and execution loops, every PR through one PR cycle; the owner approves every strategy PR and PRD, a plan or execution PR only when `needs-human`; execution starts only from a merged plan or on the fast path; agent rows that replace a decision need the owner: [development process](documentation/development_process.md), [decision log](decisions.md).
- User-level config: tracked entries (files, keys, list elements) with one drift rule and six states, plugins carry hooks and MCP servers, env references only, one neutral shell-prefix permissions list, `config/`, one tracked `instructions.md` per machine: [plan 001](plans/001_user-level-config.md), [decision log](decisions.md).
- The CLI is a committed rolldown bundle written by `pnpm generate`, no runtime dependencies; `jsonc-parser` for JSON/JSONC, smol-toml plus a verified splice for TOML; five serial chunks: [decision log](decisions.md).
- This repo is the marketplace and the plugin; manifests and the bundle are generated, committed and checked by the gate; no `build`, `prepare` or other install script: [decision log](decisions.md).
- pnpm stays (this machine has no npm: use `pnpm dlx npm@11`); TypeScript 6 until typescript-eslint supports 7: [decision log](decisions.md).
- Step 5: `review-chunk`, `execute-plan`, `write-plan` and a `grill` change, in one plan in that order (after the common documentation rules); done when `execute-plan` runs chunks 4 and 5: [ROADMAP](ROADMAP.md) step 5, [decision log](decisions.md).
- Plan 003: fake-home checks load the worktree's skills (`doctor --fix` can't); the review loop runs on the pushed branch before the PR, same reviewer each round; `review-chunk` has its own code pass only until spiral-review's `pr`: [plan 003](plans/003_skills.md), [decision log](decisions.md).
- Harness checks run in a fake home under `/tmp`; a worktree's skills load from its root in a fake home `doctor` hasn't written, OpenCode through `opencode serve` without `--standalone` (it stops before plugins load): [AGENTS.md](../AGENTS.md), [decision log](decisions.md).
- A `questionable` agent row has `agent (questionable)` in **Made By**: [decision log template](documentation/decision_log_template.md).
- Step 6: `review-chunk` and `execute-plan` are redone as `write-plan` was (#47), `grill` is only patched and commits without a push on the document's own branch; with `merge`, a PR with an amendment waits for the owner; the `questionable` rows of 2026-11-12 are read, and those of 2026-11-22 and 2026-11-24: the two on amendments by the owner (what the plan merely leaves out is a deviation, no stop), the other ten by the agent on the owner's instruction: [ROADMAP](ROADMAP.md) step 6, [decision log](decisions.md).
- Core: a `Format` edits text to text; adapters return `Entry` lists and register in `src/adapters/index.ts`; a broken state file stops the whole run: [decision log](decisions.md).
- Claude Code rules are `Bash(<prefix> *)`; `attribution` is `false`; `jsonc` removal keeps neighbouring comments; the bundler prefers `module` over `main`: [decision log](decisions.md).
- Codex: `developer_instructions` spliced by recorded exact text, `prefix_rule` decisions `allow`/`prompt`/`forbidden`: [decision log](decisions.md).
- OpenCode: V2 `permissions` only, `<prefix> *` shell rules first; V1 `permission` isn't handled: [decision log](decisions.md).
- Common documentation copies are read-only in owned repos: [decision log](decisions.md). Squash merge only: [source control](documentation/source_control.md).
- The CLI runs from a clone at `~/.local/share/agentfiles` kept on `main`; its commit is the plugins' reference; `AGENTFILES_COMMIT` must be on `origin/main`: [plan 002](plans/002_cli.md), [decision log](decisions.md).
- Claude Code's marketplace follows `main` by HTTPS; Codex and OpenCode are pinned to the commit: [plan 002](plans/002_cli.md), [decision log](decisions.md).
- Owned means a remote exists and every remote's owner is in `owners`; a copy is unedited when its hash is in the append-only list: [decision log](decisions.md).

## Open questions

- The PR cycle is ahead of the skills: no skill watches a PR after opening it or merges a plan's PR without the owner, local and CI review of documents wait for spiral-review, and what else reviews a PR in CI is undecided. Until spiral-review classifies PRs, each is the owner's to merge or to delegate.
- `execute-plan`: an `Accept:` that passes before the work is a wrong plan (2026-11-22 and 2026-11-24 rows), but the skill names an amendment only for a chunk that can't be done as the plan says; whether it gets one, and stops the run, is unsaid.
- `execute-plan`: a run that starts again on a pushed branch without a PR has no earlier report, so its 3 review rounds count from one.
- `execute-plan`, untested paths: parallel chunks, a red gate on `main` after a merge, three review rounds without a `pass`, a harness without subagents. Its trial ran against a local stand-in for GitHub, not the real one.
- `bootstrap --owner ""` writes an empty owner that `config.json`'s reader rejects, so `doctor` and `bootstrap` exit 2 until the file is edited by hand; `--owner " me "` is appended again on every run. Found by `review-chunk` on #36, reproduced (#43); outside plan 003.
- `review-chunk`'s trial ran once per case against a local stand-in for GitHub; the old skill also reviewed the pushed head when its checkout was behind, so that fix rests on the rule, not on an observed failure.
- The fake-home block in `AGENTS.md` uses the fixed port 4797 and prints nothing when OpenCode's skills don't load within 30 s; fine while chunks run serially.
- Claude Code web check not recorded: the README snippet as an environment's setup script should list `/agentfiles:grill` and `rules/agentfiles.md` in `/context`. If not, record the session's `whoami` and `$HOME` and add the gap to ADR-001's consequences.
- Codex cloud is unverified until run.
- Claude Code before 2.1.281 rejects `attribution: false` and skips the whole `settings.json` ([decision log](decisions.md)).
- Without `git` on `PATH`, plugin drift says "the CLI doesn't run from a git clone", which misnames the cause.
- `pnpm install` skips `pnpm:devPreinstall` when nothing needs installing, so an existing checkout keeps its old `core.hooksPath` until a real install.
- `write-plan` (#47): its trial didn't reproduce a recommended gate that names a file the plan creates, so that rule is untested.
