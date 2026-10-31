# Handover

Updated: 2026-10-31, PR #7

## Where we are

Step 2 (packaging) is fully decided: plugin formats verified (#5, ROADMAP step 2) and every packaging decision recorded (#7, [decision log](decisions.md)). No code yet; `install.sh` still links the skills.

## Prove it

Run: `pnpm install && pnpm check && pnpm build && pre-commit run --all-files`
Expect: `All matched files use Prettier code style!`, `no code to build yet (docs/ROADMAP.md, step 2)`, every hook `Passed`.

## Active chunk

None.

## Next action

Step 2 PR 1: TypeScript scaffold with the full gate (D8: TypeScript 6 strict, Node 24, eslint, vitest, plain `tsc`), no features. After it merges, PR 2 (generator and Claude Code adapter) and PR 4 (OpenCode plugin) can run in parallel; PR 3 (Codex) follows PR 2, PR 5 (`prepare`, delete `install.sh`) comes last.

## Decisions not to reopen

- User level only, one plugin per harness, neutral core plus adapters, spiral-review owns its setup: [ADR-001](adr/ADR-001_general-design.md).
- Layout: content at the root (`skills/`), TypeScript in `src/`: [decision log](decisions.md).
- Packaging (step 2): this repo is the marketplace for Claude Code and Codex, plugin `agentfiles`, no `version`, OpenCode plugin from `package.json` as TypeScript source, unprefixed skill IDs, generated and committed manifests, `claude plugin validate --strict` plus zod in the gate, five PRs: [decision log](decisions.md).
- Common documentation copies are read-only in owned repos; sync is mechanical, first alignment per repo by an agent: [decision log](decisions.md).
- Branch types are the Conventional Commits types plus `experiment`; squash merge only: [source control](documentation/source_control.md).
- `install.sh` is replaced by the plugins and a `prepare` script: [decision log](decisions.md).

## Open questions

- Does npm run `prepare` when installing from git (`npx github:…`, `opencode plugin add github:…`)? Unverified (docs.npmjs.com unreachable); `prepare` must do nothing outside this repo's own checkout either way.
- Does `claude plugin validate` run in CI without a login? Shown by PR 2's CI; fallback is zod only.
- Make this repo and spiral-review public (decided, owner's action).
- spiral-review R13 (user-level config, `.git/info/exclude`) and R14 (scriptable `init`) are not yet in spiral-review's roadmap.
