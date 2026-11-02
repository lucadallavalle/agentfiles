# Handover

Updated: 2026-11-02, PRs #10 and #11

## Where we are

Step 2 PRs 1, 2 and 4 are merged. #9 is the TypeScript scaffold. #10 adds a generated Claude Code marketplace, installed as `agentfiles@lucadallavalle`. #11 adds the OpenCode v2 plugin (`opencode plugin add github:lucadallavalle/agentfiles`, `@opencode/plugin` 2.2.5). Both plugins are installed on the owner's machine from `main` and load `grill` as manual-only. Left: PR 3 (Codex) and PR 5 (git hooks via `pnpm:devPreinstall`, delete `install.sh` and `post-merge`).

## Prove it

Run: `pnpm install && pnpm check && pnpm compile && pre-commit run --all-files`
Expect: `All matched files use Prettier code style!`, `Tests  38 passed (38)`, `✔ Validation passed`, every hook `Passed`.

## Active chunk

None.

## Next action

Step 2 PR 3: Codex adapter in `src/adapters/codex/`. It writes the portable root `plugin.json`, `.agents/plugins/marketplace.json` (marketplace `lucadallavalle`) and `agents/openai.yaml` for each manual-only skill, all from `generatedFiles()` in `src/generate.ts`, with zod schemas in vitest. Codex CLI isn't installed on the owner's machine yet; the real install output must come from it before merge.

## Decisions not to reopen

- User level only, one plugin per harness, neutral core plus adapters, spiral-review owns its setup: [ADR-001](adr/ADR-001_general-design.md).
- This repo is the marketplace and the plugin. The marketplace is named after the GitHub owner (`lucadallavalle`), the plugin is `agentfiles`, and there's no `version`. Manifests are generated (`pnpm generate`), committed and checked for staleness by the gate: [decision log](decisions.md).
- No `build`, `prepare` or other install script in `package.json`; the build script is `compile`: [decision log](decisions.md).
- pnpm stays, although Claude Code plugin installs skip its lockfile. `zod` is a devDependency until the CLI needs it: [decision log](decisions.md).
- TypeScript 6 until typescript-eslint supports 7; move this repo and spiral-review together: [decision log](decisions.md).
- Common documentation copies are read-only in owned repos: [decision log](decisions.md). Squash merge only: [source control](documentation/source_control.md).

## Open questions

- In OpenCode, does `@grill` load by hand in a session? Unconfirmed: `opencode run` failed on the account's model privacy setting (owner to check).
- How does an OpenCode user update the plugin? In 2.2.5, `plugin check` and `plugin update` ignore git plugins, and re-adding the same ref reuses the cached commit. This belongs to `doctor` (step 4).
- Does `pnpm:devPreinstall` run on `pnpm install` with pnpm 12 and stay a no-op outside this checkout? Verify in PR 5.
- Make this repo and spiral-review public (decided, owner's action).
- spiral-review R13 (user-level config, `.git/info/exclude`) and R14 (scriptable `init`) are not yet in spiral-review's roadmap.
