# agentfiles

My agent development setup, like dotfiles but for coding agents: Claude Code, OpenCode and Codex.
It encodes my development process once and applies it on every machine I code on, local or cloud. It never adds a committed file to a repo I only contribute to.

Status: the Claude Code plugin is installable; other plugins, user-level config and the `agentfiles` CLI are planned in the [roadmap](docs/ROADMAP.md). Design: [ADR-001](docs/adr/ADR-001_general-design.md); all decisions: [decision log](docs/decisions.md).

## How it works

|              | Plugins                                                    | CLI `agentfiles`                                                                                          |
| ------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| What         | skills, hooks and commands, one plugin per harness         | sets up and checks: installs the plugins, merges user-level config, sets up repos                         |
| Runs         | inside a harness session (`/grill`, a hook firing)         | in the shell, once per machine (`bootstrap`) or repo (`attach`, `scaffold`), and to find drift (`doctor`) |
| Installed by | the CLI, then updated by the harness's own plugin commands | `npx github:lucadallavalle/agentfiles …`, no prior install                                                |

Like dotfiles: the plugins are the config files, the CLI is what puts them in place. Plugins, not files copied by the CLI, so each harness installs, updates and namespaces them itself and nothing overwrites my edits; the cost is one adapter per plugin format. Both are planned ([roadmap](docs/ROADMAP.md) steps 2 and 4).

## Install

Codex plugin: roadmap step 2. `agentfiles bootstrap` will run these.

```sh
claude plugin install agentfiles --marketplace lucadallavalle/agentfiles -s user
opencode plugin add github:lucadallavalle/agentfiles
```

Claude Code: skills run as `/agentfiles:<skill>`; update with `claude plugin update agentfiles@lucadallavalle`. OpenCode: skill IDs are flat (`@grill`); a same-ID skill you already have wins. Skill links made by the former `install.sh` in `~/.claude/skills/` stay until removed by hand.

## Layout

```
docs/
  documentation/   common documentation: rules and templates, copied into owned repos
  adr/             architecture decisions
  decisions.md     decision log
  ROADMAP.md
  HANDOVER.md      current state for the next session
skills/<name>/     skills, one SKILL.md each, shared by every harness
src/               TypeScript: core/, adapters/<harness>/, generate.ts (cli/ planned)
.claude-plugin/    Claude Code marketplace, generated
.githooks/         this repo's git hooks
AGENTS.md          gate command, domain words
```

## Skills

| Skill   | Step of the development process                                          |
| ------- | ------------------------------------------------------------------------ |
| `grill` | 2. Relentless interview on a plan, PRD, ADR or design (`/grill`, manual) |

## Development

Gate: `pnpm install && pnpm check && pnpm compile` (see [AGENTS.md](AGENTS.md)).
Manifests are generated from `package.json` and the skills: `pnpm generate`, then commit; the gate fails when they are stale. Test local edits with `claude --plugin-dir .` from a checkout named `agentfiles` (without `plugin.json` the directory name is the plugin name).
Pre-commit hooks (no commits to `main`, file hygiene, gitleaks, the gate): need [pre-commit](https://pre-commit.com/) (`pipx install pre-commit`); `pnpm install` enables them through `.githooks/pre-commit` (`pnpm:devPreinstall` sets `core.hooksPath`). Don't run `pre-commit install`: it refuses while `core.hooksPath` is set, and unsetting it disables the hooks in `.githooks/`.
