# Handover

Updated: 2026-10-31, PR #4

## Where we are

Step 1 (foundations, #1), pre-commit hooks (#2) and the plugins vs CLI docs with the `install.sh` replacement plan (#3) are merged. No code yet: `install.sh` is the interim installer for Claude Code.

## Prove it

Run: `pnpm install && pnpm check && pnpm build && pre-commit run --all-files`
Expect: `All matched files use Prettier code style!`, `no code to build yet (docs/ROADMAP.md, step 2)`, every hook `Passed`.

## Active chunk

None.

## Next action

ROADMAP step 2: verify the plugin formats from official docs (the "Needs" list), then propose the packaging decisions to the owner before writing code.

## Decisions not to reopen

- User level only, one plugin per harness, neutral core plus adapters, spiral-review owns its setup: [ADR-001](adr/ADR-001_general-design.md).
- Layout: content at the root (`skills/`), TypeScript in `src/`: [decision log](decisions.md).
- Common documentation copies are read-only in owned repos; sync is mechanical, first alignment per repo by an agent: [decision log](decisions.md).
- Branch types are the Conventional Commits types plus `experiment`; squash merge only: [source control](documentation/source_control.md).
- `install.sh` is replaced by the plugins and a `prepare` script: [decision log](decisions.md).

## Open questions

- Make this repo and spiral-review public (decided, owner's action).
- spiral-review R13 (user-level config, `.git/info/exclude`) and R14 (scriptable `init`) are not yet in spiral-review's roadmap.
