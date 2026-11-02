# Handover

Updated: 2026-11-02, PRs #13 and #14

## Where we are

Step 2 is done. All three plugins install from GitHub and load `grill` as manual-only: Claude Code (`agentfiles@lucadallavalle`), OpenCode (`opencode plugin add github:lucadallavalle/agentfiles`) and Codex (#14: root `plugin.json`, `.agents/plugins/marketplace.json`, `agents/openai.yaml`; `$agentfiles:grill` confirmed in a session; `@grill` in OpenCode too). #13 enables `.githooks/` through `pnpm:devPreinstall` and deletes `install.sh` and `post-merge`.

## Prove it

Run: `pnpm install && pnpm check && pnpm compile && pre-commit run --all-files`
Expect: `pnpm:devPreinstall: Done` (fresh checkout), `All matched files use Prettier code style!`, `Tests  44 passed (44)`, `✔ Validation passed`, every hook `Passed`.

## Active chunk

None.

## Next action

Step 3, user-level config: settle its "Needs" in the [roadmap](ROADMAP.md) with the owner (merge mechanism, plugin vs settings, secrets, permissions model) before any code.

## Decisions not to reopen

- User level only, one plugin per harness, neutral core plus adapters, spiral-review owns its setup: [ADR-001](adr/ADR-001_general-design.md).
- This repo is the marketplace and the plugin. The marketplace is named after the GitHub owner (`lucadallavalle`), the plugin is `agentfiles`, and there's no `version` (Codex doesn't need one). Manifests are generated (`pnpm generate`), committed and checked for staleness by the gate: [decision log](decisions.md).
- No `build`, `prepare` or other install script in `package.json`; the build script is `compile`; git hooks come from `pnpm:devPreinstall`: [decision log](decisions.md).
- pnpm stays, although Claude Code plugin installs skip its lockfile. `zod` is a devDependency until the CLI needs it: [decision log](decisions.md).
- TypeScript 6 until typescript-eslint supports 7; move this repo and spiral-review together: [decision log](decisions.md).
- Common documentation copies are read-only in owned repos: [decision log](decisions.md). Squash merge only: [source control](documentation/source_control.md).

## Open questions

- How does an OpenCode user update the plugin? In 2.2.5, `plugin check` and `plugin update` ignore git plugins, and re-adding the same ref reuses the cached commit. This belongs to `doctor` (step 4).
- `pnpm install` skips `pnpm:devPreinstall` when nothing needs installing, so an existing checkout keeps its old `core.hooksPath` until a real install.
