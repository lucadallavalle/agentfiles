All agents MUST be **extremely succinct** when creating documentation — no unneeded docs unless explicitly asked.
All agents MUST be honest — find the best solution, don't try to please.
All agents MUST keep this repo publishable: name no project other than spiral-review, and commit no secrets, tokens or machine-specific paths.

Documentation guidelines: `/docs/documentation/README.md`. This repo is their source of truth: changes there reach every owned repo.

## Gate

`pnpm check && pnpm compile`; CI runs the same. `check` is typecheck, eslint, prettier, vitest (including stale generated manifests: run `pnpm generate`) and `claude plugin validate --strict .`; `compile` is `tsc` into `dist/`. No `build`, `prepare` or other install script in `package.json`: they break `opencode plugin add github:…` ([decision log](docs/decisions.md)). No CLI yet; skills ship as plugins (README, Install).

## Domain words

- harness: a coding agent program (Claude Code, OpenCode, Codex). spiral-review calls it coding agent. Avoid: agent, tool, client.
- adapter: the code for one harness; everything harness-specific lives in it. Avoid: driver, integration.
- plugin: the user-level package one harness loads during a session: skills, hooks, commands. Avoid: extension, bundle.
- CLI: `agentfiles`, run in the shell to install plugins, merge user-level config, set up repos and report drift; never runs inside a session. Avoid: installer, script.
- skill: a directory with a `SKILL.md`, written once for every harness. Avoid: prompt, command.
- machine: a computer where harnesses run, local or cloud dev machine. Avoid: host, box.
- user-level config: harness files under the home directory (`~/.claude`, `~/.codex`, `~/.config/opencode`). Avoid: global config.
- owned repo: a repo the owner controls; `scaffold` may commit to it. Avoid: my repo, project.
- foreign repo: a repo the owner only contributes to; agentfiles never adds a committed file to it. Avoid: external repo, third-party repo.
- common documentation: the rules and templates in `docs/documentation/`, copied into owned repos. Avoid: shared docs, guidelines.
- drift: a difference between what agentfiles would install and what a machine or repo has. Avoid: diff, mismatch.
