# Skills

Personal agent skills, one directory per skill. Private: they stay out of project repos.

## Install

```sh
gh repo clone lucadallavalle/skills ~/dev/skills && ~/dev/skills/install.sh
```

`install.sh` links every skill into `~/.claude/skills/` and enables `hooks/`, so `post-merge` re-runs it after each pull.
It never overwrites a real directory or a foreign link, and removes links to skills deleted from the repo.

## Skills

| Skill   | Step of the development process                                 |
| ------- | --------------------------------------------------------------- |
| `grill` | 2. Adversarial review of a PRD, ADR or design (`/grill`, manual) |
