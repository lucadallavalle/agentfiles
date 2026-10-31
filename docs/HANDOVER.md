# Handover

Updated: 2026-10-31, branch `docs/packaging-formats`

## Where we are

Step 1, pre-commit hooks and the `install.sh` replacement plan are merged (#1–#4). Step 2: plugin formats verified from official docs and written into ROADMAP step 2 (branch `docs/packaging-formats`, not yet merged). No code yet.

## Prove it

Run: `pnpm install && pnpm check && pnpm build && pre-commit run --all-files`
Expect: `All matched files use Prettier code style!`, `no code to build yet (docs/ROADMAP.md, step 2)`, every hook `Passed`.

## Active chunk

None.

## Next action

Grill round 1 on packaging is asked, answers pending: repo as marketplace for Claude Code and Codex, names, versioning, OpenCode route, skill ID collisions, Codex CLI for testing, install source on the owner's machine. Record the answers in `docs/decisions.md`, then ask round 2: generated or hand-written manifests, manifest validation in the gate, PR split.

## Decisions not to reopen

- User level only, one plugin per harness, neutral core plus adapters, spiral-review owns its setup: [ADR-001](adr/ADR-001_general-design.md).
- Layout: content at the root (`skills/`), TypeScript in `src/`: [decision log](decisions.md).
- Common documentation copies are read-only in owned repos; sync is mechanical, first alignment per repo by an agent: [decision log](decisions.md).
- Branch types are the Conventional Commits types plus `experiment`; squash merge only: [source control](documentation/source_control.md).
- `install.sh` is replaced by the plugins and a `prepare` script: [decision log](decisions.md).

## Open questions

- Packaging grill round 1 (above).
- Does npm run `prepare` when installing from git (`npx github:…`, `opencode plugin add github:…`)? Unverified: docs.npmjs.com was unreachable. If yes, `prepare` must do nothing outside this repo's own checkout.
- Make this repo and spiral-review public (decided, owner's action).
- spiral-review R13 (user-level config, `.git/info/exclude`) and R14 (scriptable `init`) are not yet in spiral-review's roadmap.
