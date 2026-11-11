All agents MUST be **extremely succinct** when creating documentation — no unneeded docs unless explicitly asked.
All agents MUST be honest — find the best solution, don't try to please.
All agents MUST keep this repo publishable: name no project other than spiral-review, and commit no secrets, tokens or machine-specific paths.

Documentation guidelines: `/docs/documentation/README.md`. This repo is their source of truth: changes there reach every owned repo.

## Gate

`pnpm check && pnpm compile`; CI runs the same. `check` is typecheck, eslint, prettier, vitest (including stale generated manifests and CLI bundle `bin/agentfiles.js`: run `pnpm generate`) and `claude plugin validate --strict .`; `compile` is `tsc` into `dist/`. No `build`, `prepare` or other install script in `package.json`: they break `opencode plugin add github:…` ([decision log](docs/decisions.md)); `pnpm:devPreinstall` enables `.githooks/` on `pnpm install`. Skills ship as plugins (README, Plugins); the CLI ships as the committed bundle, run with `node bin/agentfiles.js`.

## Fake home

Accept lines never touch the real user-level config: they run in a fake home under `/tmp` (OpenCode also reads `.claude/skills` from parent directories); remove `$F` afterwards. `doctor --fix` installs only commits on `origin/main`, so a worktree's skills are loaded from its root, in a fake home `doctor` hasn't written. Needs `jq`.

```sh
F=$(mktemp -d) && mkdir -p $F/.codex $F/.config/opencode
export HOME=$F XDG_CONFIG_HOME=$F/.config XDG_STATE_HOME=$F/.local/state XDG_DATA_HOME=$F/.local/share XDG_CACHE_HOME=$F/.cache CLAUDE_CONFIG_DIR=$F/.claude CODEX_HOME=$F/.codex OPENCODE_PASSWORD=x
# The CLI: AGENTFILES_COMMIT=$(git rev-parse origin/main) node bin/agentfiles.js doctor --fix
# The worktree's skills:
claude plugin marketplace add "$PWD" && claude plugin install agentfiles@lucadallavalle
claude plugin details agentfiles@lucadallavalle # every skill
codex plugin marketplace add "$PWD" && codex plugin add agentfiles@lucadallavalle
codex debug prompt-input | grep -o -- '- agentfiles:[a-z-]\+:' # model-invoked skills only
jq -n --arg p "$PWD" '{plugins: [$p]}' >$XDG_CONFIG_HOME/opencode/opencode.json
opencode serve --hostname 127.0.0.1 --port 4797 & # --standalone stops before plugins load
for i in $(seq 30); do
  sleep 1
  opencode api --server http://127.0.0.1:4797 GET /api/skill |
    jq -ce --arg p "$PWD" '.data[] | select(.path | startswith($p)) | {id} + with_entries(select(.key == "autoinvoke"))' && break
done # manual-only skills have "autoinvoke":false
kill $!
```

## Domain words

- harness: a coding agent program (Claude Code, OpenCode, Codex). spiral-review calls it coding agent. Avoid: agent, tool, client.
- adapter: the code for one harness; everything harness-specific lives in it. Avoid: driver, integration.
- plugin: the user-level package one harness loads during a session: skills, hooks, commands. Avoid: extension, bundle.
- CLI: `agentfiles`, run in the shell to install plugins, merge user-level config, set up repos and report drift; never runs inside a session. Avoid: installer, script.
- skill: a directory with a `SKILL.md`, written once for every harness. Avoid: prompt, command.
- machine: a computer where harnesses run, local or cloud dev machine. Avoid: host, box.
- user-level config: harness files under the home directory (`~/.claude`, `~/.codex`, `~/.config/opencode`) and agentfiles' own `~/.config/agentfiles`. Avoid: global config.
- owned repo: a repo the owner controls; `scaffold` may commit to it. Avoid: my repo, project.
- foreign repo: a repo the owner only contributes to; agentfiles never adds a committed file to it. Avoid: external repo, third-party repo.
- common documentation: the rules and templates in `docs/documentation/`, copied into owned repos. Avoid: shared docs, guidelines.
- tracked entry: a file, settings key or list element agentfiles wrote and records in its state file. Avoid: owned key, managed key.
- drift: a difference between what agentfiles would install and what a machine or repo has; an entry is in sync, missing, outdated, edited, unshipped or in conflict. Avoid: diff, mismatch, drifted.
- loop: one of the strategy, feature and execution cycles of the development process, each with its own artifacts and review. Avoid: phase, stage, step.
- chunk: one testable outcome of a plan, done in one agent session and one PR. Avoid: task, step.
- orchestrator: the session that runs `execute-plan` for one plan. Avoid: coordinator, lead.
- implementer: the subagent that does one chunk for the orchestrator. Avoid: worker, dev agent.
