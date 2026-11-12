---
name: execute-plan
description: Orchestrate a merged plan's chunks unattended, with one implementer subagent per chunk, a `review-chunk` loop, the PRs, the handover and, when asked, the merges. Use when the owner runs `execute-plan <plan path> [merge]`.
disable-model-invocation: true
---

# Execute plan

The execution loop of the development process (`docs/documentation/development_process.md`), for one merged plan. You are the orchestrator: implementers do the chunks, a reviewer checks each, and you verify, open the PRs, keep the handover and merge when asked. The run is unattended: you decide and log, you don't ask.

The common documentation is the repo's `docs/documentation/`; when the repo has none, read the machine copy in `${XDG_CONFIG_HOME:-~/.config}/agentfiles/documentation/` instead. Every `docs/documentation/` path below means whichever of the two you read.

Arguments: `<plan path> [merge]`. Without a path, the plan is the one `docs/HANDOVER.md` names in Active chunk or Next action; if it names none, stop and say so. With `merge` you merge each chunk's PR; without it you open the PRs and stop.

Before starting, `git fetch origin` and read: `AGENTS.md`, the whole plan, `docs/HANDOVER.md`, `docs/decisions.md`, and from `docs/documentation/`: `README.md` (Agent Execution, Which level a decision belongs to), `plan_template.md` (Execution Chunks, Amendment Format), `handover_template.md`, `decision_log_template.md`, `development_process.md`, `source_control.md`. The gate, the environment `Accept:` runs in and any extra check come from `AGENTS.md` and the chunk's `Accept:` line, never from this skill. The plan must be on the default branch of `origin` (`main` below): execution starts only from a merged plan, otherwise stop.

## Where to resume

The state is on `origin`, not in a session: the plan's boxes on `origin/main` (a checked box is a merged chunk), the branches `<type>/plan-NNN-cNN-<slug>`, their PRs (`gh pr list --state all --head <branch>`) and the handover's Active chunk. For each unchecked chunk, in plan order:

- **An open PR:** verify (4), then the review comment and the handover if they are missing, then merge (7).
- **A pushed branch without a PR:** the review loop (3) with a fresh reviewer, a new implementer for its findings, then on from there.
- **Neither:** start it (1), once every chunk in its `Depends:` is merged.
- **It depends on a chunk whose PR is unmerged:** report and stop.

Chunks run serially, in plan order. Run two in parallel only when no `Depends:` path joins them and their files are disjoint, shared config, schema, setup and generated files included; when unsure, serially. Parallel chunks still merge one at a time: before each later merge, merge `origin/main` into the branch (both sides' plan boxes and decision rows stay), verify again, then write its handover.

## Per chunk

1. **Branch:** `<type>/plan-NNN-cNN-<slug>` from fresh `origin/main` in a worktree of its own (`git worktree add -b <branch> <dir> origin/main`), `<type>` being the type of the PR title (`source_control.md`).
2. **Implementer:** one subagent, working only in that worktree, given the brief below.
3. **Review loop**, below, on the pushed branch, before any PR.
4. **Verify:** run the gate and every `Accept:` clause yourself, in a checkout at the pushed head, and keep the output. The implementer's reported output is a claim. A failure is a fix finding: back to the implementer, then the reviewer again.
5. **PR:** open it ready for review, the title a Conventional Commits subject (it becomes the squash commit). Body: first line `Plan NNN CNN: <chunk line>`; bullets of what changed; `## Gate` and `## Accept` with the real output of your own run, machine-specific paths replaced; the decision rows and the deviations. Post every round's review report, in order, as one comment. Then do the `Accept:` clauses that need the PR and add their evidence to it.
6. **Handover:** rewrite `docs/HANDOVER.md` on the chunk's branch from `handover_template.md`, as of after this PR merges: the chunk done with its PR number; Prove it from your own gate run; Active chunk the plan's next chunk, or None after its last; Next action `execute-plan <plan path>` with `merge` if you were given it, or what follows the plan; decisions not to reopen; in Open questions the defer findings and what only the owner can answer, without those now answered. Commit and push it: since the reviewed head, nothing but the handover may have changed.
7. **Merge**, only with `merge`: wait for CI on the pushed head (`gh pr checks <n> --watch`), then `gh pr merge <n> --squash --match-head-commit <that head>`. Red CI is a fix finding. After the merge, run the gate at fresh `origin/main` and remove the worktree. If the gate is red on `main`, no next chunk starts: fix it first, on a `fix/plan-NNN-cNN-<slug>` branch through these same steps. Without `merge`, go on to the chunks that don't depend on this one, then stop.

A chunk the plan marks as an owner check is never merged by you: open its PR, say in it what the owner has to check, and stop.

### Implementer brief

- The plan's path, the chunk's line with its `Accept:` and `Depends:`, the plan sections it touches by name, and the files to read as paths, not content: `AGENTS.md`, the common documentation above, the code it will change.
- Its worktree and branch, and the files parallel chunks own, which it must not touch.
- Which `Accept:` clauses are yours, not its: those that need the PR or a run only the orchestrator can make.
- Its work: tests first where code exists; the gate and its `Accept:` clauses, passing; the chunk's box checked and nothing else in the plan changed (and the roadmap step's box when the chunk completes the step); one decision row per choice the plan and the docs don't cover, **Made By** `agent`, or `agent (questionable)` where it used judgement; commits per `source_control.md`; the branch pushed.
- It must not: open a PR, edit `docs/HANDOVER.md`, weaken, skip or delete a test, bypass commit signing or a hook, add a decision row that replaces an earlier one or carries the owner's name, or work around a stop condition (below). It stops and reports instead.
- It returns: the branch and the pushed head commit, the real output of the gate and of `Accept:`, its decision rows, its deviations from the plan.

### Review loop

One reviewer per chunk: a fresh subagent told to follow the `review-chunk` skill, given the plan's path, the chunk, the branch and a checkout at the pushed head (the implementer's worktree after its push, clean, or a new one), since on a branch without a PR `review-chunk` diffs the checkout's `HEAD`. Never give it the implementer's summary or reply. Its report's head commit must equal the pushed head; if not, it reviewed something else: run it again.

- **Verdict `pass`:** go on to verify (4).
- **Fix findings:** send them, as written, to the same implementer; when it has pushed, the same reviewer reviews the whole diff again at the new head. Where the harness can't continue a subagent, start a new one: an implementer with the brief, the branch and the findings; a reviewer with the branch and its previous reports.
- **At most 3 rounds.** A third report that isn't `pass` is a stop.
- **Owner question:** decide it yourself as any uncovered decision: an `agent (questionable)` row.
- **Wrong plan:** an `## Amendments` entry in the plan on the chunk's branch, with an `agent (questionable)` row.
- **Defer:** into the final report and the handover's Open questions.

Rows and amendments from findings go to the implementer with the fixes, so the reviewer sees them; when no round follows, commit them to the branch yourself before you verify.

Without subagents in the harness, do each chunk yourself by the brief, serially, then follow `review-chunk` yourself, and name this fallback in the final report.

## Decide, don't ask

Anything the plan and the docs don't cover: choose, log an `agent (questionable)` row on the chunk's branch, continue. Stop only for:

- a test that would have to be weakened, skipped or deleted;
- an owner check in the plan;
- a locked signing key or missing credentials: never bypass signing;
- a decision that changes behaviour beyond the plan, an amendment that does, or one that would replace an earlier decision row or need a row in the owner's name;
- 3 review rounds without a `pass`.

At a stop, change nothing more: give the final report with what stopped you, the chunk, its branch or PR, and what the owner has to do before running `execute-plan` again.

## Final report

When no chunk is left to run, or at a stop:

- the merged PRs, and those left open;
- every decision row of the run, verbatim, the `agent (questionable)` ones first;
- the fallbacks used: a new subagent in place of a continued one, chunks done without subagents, anything skipped;
- what is open: defer findings, unanswered owner questions, amendments for the owner to read;
- the next step.

It is your answer to the owner; with `merge`, also a comment on the last chunk's PR after its merge.

## Done

The run ends when every chunk's box is checked on `origin/main`, or, without `merge`, when every PR that can be opened is open. Next: `write-plan` for the next roadmap step, then `grill` on its PR.
