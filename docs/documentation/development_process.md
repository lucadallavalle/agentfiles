# Development Process

Work runs in three loops, usually in sequence. A loop is defined by its scope, not by the document type: an ADR can come out of any loop. Each loop has its own review; its merged output informs the next loop.

| Loop         | Scope              | Artifacts                                                            | Review                                | Human       |
| ------------ | ------------------ | -------------------------------------------------------------------- | ------------------------------------- | ----------- |
| 1. Strategy  | product or epic    | `STRATEGY.md`, `ROADMAP.md`, ADRs                                    | dedicated docs PR                     | yes         |
| 2. Feature   | one feature        | PRD (when product behaviour changes), implementation plan with tasks | dedicated docs PR                     | most likely |
| 3. Execution | one task of a plan | code, tests, decision log rows (`Made By: agent`)                    | code PR against the gate and the plan | not usually |

Document formats and update policies: [README](./README.md). Where each decision is written: [Which level a decision belongs to](./README.md#which-level-a-decision-belongs-to).

## Loops

1. **Strategy:** sets direction. Product documents (strategy, roadmap) and architecture (ADRs). Reviewed with the owner, e.g. a `grill` session, then merged.
2. **Feature:** specifies one roadmap step. A PRD for what the feature does, an implementation plan ([template](./plan_template.md)) for how. The plan breaks the work into tasks and states which depend on each other and which can run in parallel. Reviewed like loop 1.
3. **Execution:** agents implement the plan's tasks unattended. Done means the gate passes with real output ([Gate and Definition of Done](./README.md#gate-and-definition-of-done)). Reviewed by code review; an agent asks the owner only by the existing rules (e.g. a test or the gate looks wrong).

## Feedback to an earlier loop

A later loop never silently changes an earlier loop's merged documents. What it learns goes back up through the controlled mechanisms:

- a plan or PRD amendment ([Handling Changes to Immutable Documents](./README.md#handling-changes-to-immutable-documents));
- a new ADR that supersedes one ([Superseding an ADR](./README.md#superseding-an-adr)).

The amendment is reviewed in the same PR as the ongoing work. A PR that touches loop 1 artifacts needs the owner's review.

## Open

- Which rules make a PR that touches loop 1 or 2 artifacts need human review, and which low-risk docs changes or amendments may merge automatically. This logic lives in spiral-review (PR classification: docs-only or code; risk of the change).
- A task command that turns a plan's tasks into an agent-friendly dependency graph (DAG), so independent tasks run in parallel. Tool and format TBD; the plan template gains dependencies and parallel groups with it.
- How plan tasks map to the existing execution chunks and to PRs.
