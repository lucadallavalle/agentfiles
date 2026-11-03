# Handover

Updated: 2026-11-03, plan 001 PR

## Where we are

Steps 1 and 2 are done. #17 (user-level config decisions), #18 (development process) and #19 (agent rows that replace a decision need the owner) are merged; work now follows the [development process](documentation/development_process.md). Step 3 is in the feature loop: [plan 001](plans/001_user-level-config.md) is in a draft PR, being grilled.

## Prove it

Run: `pnpm install && pnpm check && pnpm compile`
Expect: `All matched files use Prettier code style!`, `Tests  44 passed (44)`, `✔ Validation passed`, `compile` without errors.

## Active chunk

None: plan 001 isn't merged.

## Next action

Grill plan 001 and record the answers in it and in the decision log; once the owner merges it, execute C01.

## Decisions not to reopen

- User level only, one plugin per harness, neutral core plus adapters, spiral-review owns its setup: [ADR-001](adr/ADR-001_general-design.md).
- Work runs in strategy, feature and execution loops; execution starts only from a merged plan; agent rows that replace a decision need the owner: [development process](documentation/development_process.md), [decision log](decisions.md).
- User-level config: tracked entries with one drift rule, plugins carry hooks and MCP servers, env references only, one neutral shell-prefix permissions list, `config/`, the CLI starts in step 3: [decision log](decisions.md).
- This repo is the marketplace and the plugin; manifests are generated, committed and checked by the gate; no `build`, `prepare` or other install script: [decision log](decisions.md).
- pnpm stays; TypeScript 6 until typescript-eslint supports 7: [decision log](decisions.md).
- Common documentation copies are read-only in owned repos: [decision log](decisions.md). Squash merge only: [source control](documentation/source_control.md).

## Open questions

- Plan 001 Q1–Q7, until the grill settles them.
- How does an OpenCode user update the plugin? In 2.2.5, `plugin check` and `plugin update` ignore git plugins. This belongs to `doctor` (step 4).
- `pnpm install` skips `pnpm:devPreinstall` when nothing needs installing, so an existing checkout keeps its old `core.hooksPath` until a real install.
