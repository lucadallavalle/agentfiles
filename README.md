# agentfiles

My agent development setup, like dotfiles but for coding agents: Claude Code, OpenCode and Codex.
It encodes my [development process](docs/documentation/development_process.md) once and applies it on every machine I code on, local or cloud. It never adds a committed file to a repo I only contribute to.

Status: the Claude Code, OpenCode and Codex plugins are installable; `agentfiles doctor` merges user-level config into Claude Code (Codex and OpenCode: [plan 001](docs/plans/001_user-level-config.md)). Design: [ADR-001](docs/adr/ADR-001_general-design.md); all decisions: [decision log](docs/decisions.md).

## How it works

|              | Plugins                                                    | CLI `agentfiles`                                                                                          |
| ------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| What         | skills, hooks and commands, one plugin per harness         | sets up and checks: installs the plugins, merges user-level config, sets up repos                         |
| Runs         | inside a harness session (`/grill`, a hook firing)         | in the shell, once per machine (`bootstrap`) or repo (`attach`, `scaffold`), and to find drift (`doctor`) |
| Installed by | the CLI, then updated by the harness's own plugin commands | `npx github:lucadallavalle/agentfiles …`, no prior install                                                |

Like dotfiles: the plugins are the config files, the CLI is what puts them in place. Plugins, not files copied by the CLI, so each harness installs, updates and namespaces them itself and nothing overwrites my edits; the cost is one adapter per plugin format. Both are planned ([roadmap](docs/ROADMAP.md) steps 2 and 4).

## Install

`agentfiles bootstrap` will run these.

```sh
claude plugin install agentfiles --marketplace lucadallavalle/agentfiles -s user
opencode plugin add github:lucadallavalle/agentfiles
codex plugin marketplace add lucadallavalle/agentfiles && codex plugin add agentfiles@lucadallavalle
```

Claude Code: skills run as `/agentfiles:<skill>`; update with `claude plugin update agentfiles@lucadallavalle`. OpenCode: skill IDs are flat (`@grill`); a same-ID skill you already have wins. Codex: skills run as `$agentfiles:<skill>`; update with `codex plugin marketplace upgrade`. Skill links made by the former `install.sh` in `~/.claude/skills/` stay until removed by hand.

## User-level config

```sh
npx github:lucadallavalle/agentfiles doctor        # report drift; exit 0 in sync, 1 drift, 2 error
npx github:lucadallavalle/agentfiles doctor --fix  # write missing and outdated entries, remove unshipped ones
```

`config/` is the shipped config; `doctor --fix` copies `config/instructions.md` to `~/.config/agentfiles/instructions.md` and merges files, settings keys and list elements into each installed harness (Claude Code: `rules/agentfiles.md` importing it, `settings.json` `attribution` and `Bash(<prefix> *)` permission rules), recording what it wrote in `~/.local/state/agentfiles/state.json` (XDG variables honored). An entry you edited, or one you already had with another value, is reported with the shipped value and never overwritten: restore that value, or, for a value you already had, remove yours and run `--fix`. To change shipped config, change `config/`. A harness running during `--fix` may rewrite its settings and drop our entries; the next `doctor` reports them as edited.

## Layout

```
docs/
  documentation/   common documentation: rules and templates, copied into owned repos
  adr/             architecture decisions
  decisions.md     decision log
  ROADMAP.md
  HANDOVER.md      current state for the next session
skills/<name>/     skills, one SKILL.md each, shared by every harness
config/            shipped user-level config: instructions, permissions, <harness>.json keys
src/               TypeScript: cli/, core/, adapters/<harness>/, generate.ts
bin/agentfiles.js  CLI bundle, generated
.claude-plugin/    Claude Code marketplace, generated
.agents/plugins/   Codex marketplace, generated
plugin.json        Codex plugin manifest, generated
.githooks/         this repo's git hooks
AGENTS.md          gate command, domain words
```

## Skills

| Skill   | Loop of the [development process](docs/documentation/development_process.md)                               |
| ------- | ---------------------------------------------------------------------------------------------------------- |
| `grill` | Strategy and feature: the owner's review of a PRD, plan, ADR or design before it merges (`/grill`, manual) |

## Development

Gate: `pnpm install && pnpm check && pnpm compile` (see [AGENTS.md](AGENTS.md)).
Manifests are generated from `package.json` and the skills, the CLI bundle from `src/cli/` (rolldown): `pnpm generate`, then commit; the gate fails when they are stale. Test local edits with `claude --plugin-dir .` from a checkout named `agentfiles` (without `.claude-plugin/plugin.json` the directory name is the plugin name).
Pre-commit hooks (no commits to `main`, file hygiene, gitleaks, the gate): need [pre-commit](https://pre-commit.com/) (`pipx install pre-commit`); `pnpm install` enables them through `.githooks/pre-commit` (`pnpm:devPreinstall` sets `core.hooksPath`). Don't run `pre-commit install`: it refuses while `core.hooksPath` is set, and unsetting it disables the hooks in `.githooks/`.
