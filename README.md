# agentfiles

My agent development setup, like dotfiles but for coding agents: Claude Code, OpenCode and Codex.
It encodes my development process once and applies it on every machine I code on, local or cloud. It never adds a committed file to a repo I only contribute to.

Status: foundations only. Plugins, user-level config and the `agentfiles` CLI are planned in the [roadmap](docs/ROADMAP.md). Design: [ADR-001](docs/adr/ADR-001_general-design.md); all decisions: [decision log](docs/decisions.md).

## Install

Interim, Claude Code only, until the plugins land:

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
Pre-commit hooks (no commits to `main`, file hygiene, gitleaks, the gate): need [pre-commit](https://pre-commit.com/) (`pipx install pre-commit`); `install.sh` enables them through `.githooks/pre-commit`.
