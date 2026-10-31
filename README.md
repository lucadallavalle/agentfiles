# agentfiles

My agent development setup, like dotfiles but for coding agents: Claude Code, OpenCode and Codex.
It encodes my development process once and applies it on every machine I code on, local or cloud. It never adds a committed file to a repo I only contribute to.

Status: foundations only. Plugins, user-level config and the `agentfiles` CLI are planned in the [roadmap](docs/ROADMAP.md). Design: [ADR-001](docs/adr/ADR-001_general-design.md); all decisions: [decision log](docs/decisions.md).

## How it works

|              | Plugins                                                    | CLI `agentfiles`                                                                                          |
| ------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| What         | skills, hooks and commands, one plugin per harness         | sets up and checks: installs the plugins, merges user-level config, sets up repos                         |
| Runs         | inside a harness session (`/grill`, a hook firing)         | in the shell, once per machine (`bootstrap`) or repo (`attach`, `scaffold`), and to find drift (`doctor`) |
| Installed by | the CLI, then updated by the harness's own plugin commands | `npx github:lucadallavalle/agentfiles …`, no prior install                                                |

Like dotfiles: the plugins are the config files, the CLI is what puts them in place. Plugins, not files copied by the CLI, so each harness installs, updates and namespaces them itself and nothing overwrites my edits; the cost is one adapter per plugin format. Both are planned ([roadmap](docs/ROADMAP.md) steps 2 and 4).

## Install

Interim, Claude Code only: `install.sh` is temporary. The plugins and `agentfiles bootstrap` replace its skill links; a `prepare` script replaces its git hooks setup.

```sh
gh repo clone lucadallavalle/agentfiles ~/dev/agentfiles && ~/dev/agentfiles/install.sh
```

`install.sh` links every skill into `~/.claude/skills/` and enables `.githooks/`, so `post-merge` reruns it after each pull.
It never overwrites a real directory or a link to somewhere else; it replaces dangling links and removes links to skills deleted from the repo.

## Layout

```
docs/
  documentation/   common documentation: rules and templates, copied into owned repos
  adr/             architecture decisions
  decisions.md     decision log
  ROADMAP.md
  HANDOVER.md      current state for the next session
skills/<name>/     skills, one SKILL.md each, shared by every harness
src/               TypeScript (planned): cli/, core/, adapters/<harness>/
.githooks/         this repo's git hooks
AGENTS.md          gate command, domain words
```

## Skills

| Skill   | Step of the development process                                          |
| ------- | ------------------------------------------------------------------------ |
| `grill` | 2. Relentless interview on a plan, PRD, ADR or design (`/grill`, manual) |

## Development

Gate: `pnpm install && pnpm check && pnpm build` (see [AGENTS.md](AGENTS.md)).
Pre-commit hooks (no commits to `main`, file hygiene, gitleaks, the gate): need [pre-commit](https://pre-commit.com/) (`pipx install pre-commit`); `install.sh` enables them through `.githooks/pre-commit`. Don't run `pre-commit install`: it refuses while `core.hooksPath` is set, and unsetting it disables the hooks in `.githooks/`.
