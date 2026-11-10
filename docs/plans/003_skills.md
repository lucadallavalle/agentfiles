# 003: Skills from repeated practice

## Overview

Ship the skills that encode how plans are written, reviewed and executed, replacing the prompts the owner pasted by hand for every plan (ROADMAP step 5). Four skill changes plus the common documentation rules they rely on; done when the new `execute-plan` runs this plan's own last two chunks.

## References

- [ROADMAP step 5](../ROADMAP.md): evidence, decided order, Needs, Depends
- [Decision log](../decisions.md): rows dated 2026-11-10
- [ADR-001](../adr/ADR-001_general-design.md): D1, D2, D6 (exception for `review-chunk`), D7
- [Development process](../documentation/development_process.md), [Agent Execution](../documentation/README.md#agent-execution)
- `skills/grill/SKILL.md`: the format and tone every skill follows
- Plan 002's execution prompt (ROADMAP step 5 evidence): the source of `execute-plan`'s per-chunk steps

## Prerequisites

| Prerequisite                                   | Status | Notes                                                                     |
| ---------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| Step 2: manifests generated from `SKILL.md`    | Done   | A new `skills/<id>/` needs only `pnpm generate`                           |
| Step 4: `doctor --fix` moves plugins to `main` | Done   | Loads `execute-plan` on the machine before C04                            |
| Plan 002 C03: shipped documentation hash list  | Done   | C01's rule changes append hashes (`pnpm generate`); owned repos see drift |

## Breaking Changes

- [x] **No breaking changes**. C01 changes the common documentation, so owned repos' copies report `outdated` until `doctor --fix`.

## Scope

### In Scope

- Common documentation rules (C01) and this repo's fake-home Accept setup in `AGENTS.md`.
- `review-chunk`, `execute-plan`, `write-plan`: new skills. `grill`: changed.

### Out of Scope

- Hand-off of code review to spiral-review: waits for its `pr` and `dismiss` (ROADMAP step 5 Needs).
- Skills for closing a plan, reviewing agent rows, a retrospective (ROADMAP Later).
- Any TypeScript change: skills need none.

## Technical Approach

Each skill is one `skills/<id>/SKILL.md`, written once for every harness, in `grill`'s style: short, imperative, pointing at `AGENTS.md` and the common documentation instead of restating them. Single file: the OpenCode plugin registers only the `SKILL.md` body, so a skill can't rely on sibling files. Project-specific steps (gate, Accept environment, extra checks) come from the repo's `AGENTS.md` and the plan's `Accept:` lines, never from the skill. Each skill ends by naming the next one.

### Key Decisions

| Decision                       | Chosen Option                                                                                                                                                                                                                                                                                                                            | Rationale                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Invocation                     | `review-chunk`, `write-plan` model-invoked; `execute-plan`, `grill` manual-only (`disable-model-invocation: true`)                                                                                                                                                                                                                       | Decision log 2026-11-10                                                |
| `execute-plan` arguments       | `<plan path> [merge]`; without a path, the plan named in `HANDOVER.md`'s Active chunk or Next action                                                                                                                                                                                                                                     | Resume after usage limits or a locked key                              |
| Per-chunk steps (orchestrator) | Branch `<type>/plan-NNN-cNN-<slug>` from fresh `origin/main`; implementer subagent in its own worktree; tests first; gate and Accept (as `AGENTS.md` and the plan say); chunk box; `Made By: agent` rows, `questionable` where judgement was used; PR; `review-chunk`; orchestrator re-runs gate and Accept; handover; merge per `merge` | Plans 001, 002 and the owner's later prompts elsewhere                 |
| PR body                        | First line `Plan NNN CNN: <chunk line>`; bullets; `## Gate` and `## Accept` with real output, no machine-specific paths; decision rows and deviations listed                                                                                                                                                                             | Plan 002's PRs; replaced by spiral-review's format once `ship` is used |
| Implementer brief              | The chunk line, Accept and the plan sections it touches, files to read (paths, not content), what parallel chunks it must not touch; returns PR, gate output, rows, deviations                                                                                                                                                           | BMAD's worker contract; the owner's prompts                            |
| Final report                   | Merged PRs, decision rows (questionable first), fallbacks used, anything open, next step                                                                                                                                                                                                                                                 | Plan 002's prompt                                                      |
| `review-chunk` input           | A PR number (or the current branch); finds the plan and chunk from the PR body or branch; reads the plan and the diff only                                                                                                                                                                                                               | Never the implementer's summary                                        |
| `write-plan` output            | `docs/plans/NNN_<slug>.md` (next free number, checking open branches), on `docs/plan-NNN-<slug>`, a ready docs PR; undecided points in Open questions for the grill                                                                                                                                                                      | Plans 001, 002 and the owner's plan prompts                            |

### Risks & Trade-offs

| Risk/Trade-off                                                                            | Impact | Mitigation                                                                                 |
| ----------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| A skill's behaviour can't be proven by the gate                                           | High   | C04 and C05 run through `execute-plan`; `review-chunk` runs on a merged PR in C02's Accept |
| Continuing a subagent differs per harness                                                 | Medium | A new implementer with the findings where SendMessage isn't available                      |
| `execute-plan` loaded mid-plan: the session that runs C04 must start after `doctor --fix` | Low    | Handover's Next action after C03 says so                                                   |
| Model-invoked skills add descriptions to every session's context                          | Low    | Descriptions stay short                                                                    |

## Implementation

### Files to Create

| File Path                      | Purpose                                     | Chunk |
| ------------------------------ | ------------------------------------------- | ----- |
| `skills/review-chunk/SKILL.md` | Review one PR against its plan and its code | C02   |
| `skills/execute-plan/SKILL.md` | Orchestrate a merged plan's chunks          | C03   |
| `skills/write-plan/SKILL.md`   | Write a plan from the common template       | C04   |

### Files to Modify

| File Path                                          | Why                                                                                                   | Chunk   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------- |
| `docs/documentation/plan_template.md`              | An Open questions section, empty before merge; disjoint files include shared config, schema and setup | C01     |
| `docs/documentation/README.md`                     | Handover written as of after its PR merges                                                            | C01     |
| `docs/documentation/decision_log_template.md`      | `questionable` marker on agent rows                                                                   | C01     |
| `config/documentation-hashes.json`                 | New shipped hashes (`pnpm generate`)                                                                  | C01     |
| `AGENTS.md`                                        | Fake-home Accept setup                                                                                | C01     |
| `skills/grill/SKILL.md`                            | Push to the PR branch after the gate; edit an unmerged plan in place; name the next skill             | C05     |
| Generated manifests, `skills/*/agents/openai.yaml` | `pnpm generate`                                                                                       | C02–C05 |
| `README.md`                                        | Skills list                                                                                           | C02–C05 |
| `docs/ROADMAP.md`                                  | Step 5's box                                                                                          | C05     |

## Testing Strategy

No code changes; the gate checks manifests, `openai.yaml` for manual-only skills and the documentation hash list. Each skill chunk checks in a fake home (setup in `AGENTS.md` after C01) that the harnesses list it with the right invocation. Behaviour is proven by use: `review-chunk` on a merged PR (C02), `execute-plan` on C04 and C05.

## Acceptance Criteria

- The four skills load in Claude Code, Codex and OpenCode with the decided invocation.
- C04 and C05 merged through `/agentfiles:execute-plan docs/plans/003_skills.md merge`, its report in C05's PR.
- All tests passing.

## Open questions

- How a fake home proves OpenCode's invocation for a plugin skill (`autoinvoke`): step 2 verified it once; which command does C02's Accept use?

## Execution

Gate: `pnpm check && pnpm compile`

- [ ] C01 — The common documentation has the four rules, the machine copy updates through `doctor --fix`, and `AGENTS.md` has the fake-home Accept setup
      Accept: `pnpm generate && git diff --exit-code config/` after committing, then in a fake home `node bin/agentfiles.js doctor --fix` writes the new copies and a second `doctor` exits 0
- [ ] C02 — `review-chunk` loads model-invoked in all three harnesses, and run on PR #36 against plan 002 C08 it reports plan conformance and triaged findings
      Accept: gate; fake home: `codex debug prompt-input` lists `agentfiles:review-chunk`, Claude Code and OpenCode list it (Open question); its report on #36 in the PR
      Depends: C01
- [ ] C03 — `execute-plan` loads manual-only in all three harnesses, and the handover's Next action tells the owner to run `doctor --fix`, start a new session and run `/agentfiles:execute-plan docs/plans/003_skills.md merge`
      Accept: gate; fake home: `codex debug prompt-input` omits `agentfiles:execute-plan` and `$agentfiles:execute-plan` loads; Claude Code and OpenCode likewise
      Depends: C02
- [ ] C04 — `write-plan` loads model-invoked in all three harnesses; run through `execute-plan`
      Accept: gate; fake home as C02; the PR was opened by `execute-plan`'s implementer and reviewed by `review-chunk`
      Depends: C03
- [ ] C05 — `grill` pushes outcomes to the PR branch after the gate, edits an unmerged plan in place and names the next skill; run through `execute-plan`, whose final report is in this PR, which checks step 5's box
      Accept: gate; fake home: `grill` still manual-only; the PR has `execute-plan`'s report
      Depends: C04
