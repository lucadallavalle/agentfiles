# Development Process

Work runs in three loops, usually in sequence; a small change takes the [fast path](#fast-path). A loop is defined by its scope, not by the document type: an ADR can come out of any loop. Every PR of every loop runs the same [PR cycle](#pr-cycle); its merged output informs the next loop.

| Loop      | Scope                                        | Artifacts                                                                  | PR                                    | Personas                            |
| --------- | -------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------- |
| Strategy  | product or epic                              | `STRATEGY.md`, `ROADMAP.md`, ADRs                                          | dedicated docs PR                     | strategist, architect               |
| Feature   | one feature                                  | PRD (when product behaviour changes), then implementation plan with chunks | a dedicated docs PR each              | product manager, planner            |
| Execution | one chunk of a plan, or one fast-path change | code, tests, decision log rows (`Made By: agent`)                          | code PR against the gate and the plan | orchestrator, implementer, reviewer |

A persona names who the session acts as; skills and artifacts set its behaviour.

Document formats and update policies: [README](./README.md). Where each decision is written: [Which level a decision belongs to](./README.md#which-level-a-decision-belongs-to).

## Loops

- **Strategy:** sets direction. Product documents (strategy, roadmap) and architecture (ADRs), written by the owner with the session, e.g. in a `grill` session. The owner reviews and merges every PR.
- **Feature:** specifies one roadmap step. A PRD for what the feature does, then an implementation plan ([template](./plan_template.md)) for how. The owner approves a PRD by merging it. The plan breaks the work into execution chunks, one PR each, and states which depend on each other; the others can run in parallel. Execution starts only from a merged plan or on the fast path.
- **Execution:** agents implement the plan's chunks unattended. Done means the gate passes with real output ([Gate and Definition of Done](./README.md#gate-and-definition-of-done)). An agent asks the owner only by the existing rules (e.g. a test or the gate looks wrong). The owner reads `Made By: agent` decision log rows after merge.

## Fast path

A change that needs no decision from an earlier loop skips the strategy and feature loops: one execution PR without a plan, through the same PR cycle and merge rule. All three must hold:

- it touches only execution paths ([Loop of a path](#loop-of-a-path));
- it changes no product behaviour except to fix a defect, and takes no architecture-level decision ([Which level a decision belongs to](./README.md#which-level-a-decision-belongs-to));
- it fits one PR and one session.

The PR says it took the fast path and states what changes and why, in place of a plan, so its review checks the three conditions; a fix comes with a test that fails without it. Work that turns out to break one of them stops and moves to the loop that decides it.

## PR cycle

1. **Write:** one session writes the loop's artifacts on a branch; in execution it is the orchestrator, whose implementer does one chunk in its own worktree.
2. **Local review:** before the PR opens, spiral-review reviews the branch: documents in the strategy and feature loops, code in execution, where `review-chunk` also checks the chunk against its plan. Findings go back to the writer until the review is clear or its round cap is reached.
3. **CI:** the PR runs the gate and spiral-review; what else reviews it there is undecided.
4. **Watch:** that same session opens the PR, watches it and fixes red checks, findings and comments with new pushes; in execution the orchestrator watches and its implementer fixes.
5. **Merge:** once the PR is green. The owner approves every strategy PR and every PRD, and a plan or execution PR only when it is `needs-human`; any other merges without the owner, by its session (the orchestrator, when `execute-plan` runs with `merge`) or by spiral-review's merge policy.

spiral-review decides the depth of every review (the PR's loop, risk tier, lenses, round cap) and whether a PR is `needs-human`: high-risk by its risk classifier, with unresolved findings, or changing an earlier loop's merged documents (below). A PR spiral-review hasn't classified is the owner's to merge or to delegate.

## Feedback to an earlier loop

A later loop never silently changes an earlier loop's merged documents. What it learns goes back up through the controlled mechanisms:

- a plan or PRD amendment ([Handling Changes to Immutable Documents](./README.md#handling-changes-to-immutable-documents));
- a new ADR that supersedes one ([Superseding an ADR](./README.md#superseding-an-adr)).

The amendment or new ADR goes in the same PR as the ongoing work, and makes that PR `needs-human`. Checking off execution chunks, or the roadmap step they complete, is not an amendment. Classification, tiers and the merge policy live in spiral-review (its PRD-001).

## Loop of a path

Which loop a changed file belongs to, so spiral-review can classify a PR. A PR's loop is the highest among its files.

| Loop      | Paths                                                                             |
| --------- | --------------------------------------------------------------------------------- |
| Strategy  | `**/docs/adr/**`, `**/ROADMAP.md`, `**/STRATEGY.md`                               |
| Feature   | `**/docs/prd/**`, `**/docs/plans/**`, `**/docs/design/**`, `**/docs/decisions.md` |
| Execution | everything else                                                                   |

Exception: a change to `docs/decisions.md` that only appends `Made By: agent` rows is execution. Editing or removing a row, adding one made by the owner, or adding one that replaces an earlier row ("Replaces: …") is feature.

Exception: a change to `ROADMAP.md` that only checks a step's box is execution; it goes in the PR of the step's last chunk. Any other change to it is strategy.

Classification, tiers, escalators and the merge policy live in spiral-review (its PRD-001); only this convention lives here.
