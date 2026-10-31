All agents MUST be **extremely succinct** when creating documentation — no unneeded docs unless explicitly asked.
All agents MUST be honest — find the best solution, don't try to please.

Documentation guidelines: `/docs/documentation/README.md`. This repo is their source of truth: changes there reach every owned repo.

## Gate

`pnpm check && pnpm build`; CI runs the same. Until the first TypeScript lands (ROADMAP step 2), `check` is the format check only and `build` is a no-op. No runnable app yet; `./install.sh` links the skills for Claude Code in the meantime.

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
