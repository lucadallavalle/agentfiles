---
name: write-plan
description: Write the implementation plan for a feature or roadmap step from the common plan template, with execution chunks and open questions, on a docs PR. Use when asked to write, draft or prepare a plan.
---

# Write plan

The feature loop's plan (development process: `docs/documentation/development_process.md`): how one feature or roadmap step gets built, in chunks agents can execute unattended. You write the plan and open its PR; you don't write code, and you don't settle what only the owner can.

The common documentation is the repo's `docs/documentation/`; when the repo has none, read the machine copy in `${XDG_CONFIG_HOME:-~/.config}/agentfiles/documentation/` instead. Every `docs/documentation/` path below means whichever of the two you read.

Input: the request, in a line or more: a feature, a roadmap step, a PRD.

Before starting, read `docs/documentation/plan_template.md` whole: it is the plan's format, and this skill carries no copy of it. Then what exists of: `AGENTS.md` (gate, domain words), `docs/documentation/README.md` (Which level a decision belongs to), `development_process.md`, `source_control.md`, `docs/ROADMAP.md`, `docs/HANDOVER.md`, `docs/decisions.md`, the PRD and ADRs the request touches, the latest plan in `docs/plans/` (the repo's own style) and the code the plan will change.

## Number and branch

- **Number:** `git fetch origin` when there is a remote. `NNN` is one more than the highest number among the `docs/plans/NNN_*.md` of every local and remote branch (`git for-each-ref refs/heads refs/remotes`, `git ls-tree --name-only <ref> docs/plans/`) and those branches' `docs/plan-NNN-*` names, so a plan on an open branch keeps its number; `001` when there is none.
- **Slug:** two to four lowercase words, hyphenated; the file is `docs/plans/NNN_<slug>.md`.
- **Branch:** `docs/plan-NNN-<slug>` from the fresh default branch of `origin`, in a worktree of its own when the checkout has uncommitted work. Without a remote, from the local default branch.

## Write

Follow the template: its sizing guide picks the sections, its Execution Chunks rules shape the chunks. Leave out the template's bracketed markers and the sections that don't apply. Title: `# NNN: <title>`.

- **Facts are your job.** Look up in the code, the docs and the tools whatever the plan states: file paths, existing patterns, what a dependency does. Never guess one, never leave one as a question.
- **Decisions are the owner's.** A choice the request, the roadmap, the PRD, the ADRs and the decision log already make is a Key Decision (in a small plan, a line of the approach), with where it was made as its rationale. A choice none of them makes goes in **Open questions**, with your recommended answer and what it changes in the plan; write the rest of the plan on that recommendation. Never present your own choice as decided.
- **Always** an `## Open questions` and an `## Execution` section, also in a small plan, where Execution replaces the minimum plan's closing `Accept:` line: `grill` works from the first, `execute-plan` from the second. Open questions is `None.` only when nothing is open.
- **Chunks:** each one testable outcome, a sentence that is true when it's done, small enough for one agent session and one PR, with an `Accept:` a command can prove and a `Depends:` where it needs another. Chunks without a dependency path between them touch disjoint files. The `Gate:` line is the gate of `AGENTS.md`; when the repo names none, it is your recommended gate and an open question.
- **What and why,** with enough how to show the intent: no code, no file contents. In a plan with more than one chunk, the file tables have a Chunk column.
- Use the domain words of `AGENTS.md`. Be succinct: a plan is read by the owner once and by every agent that executes it.
- When the feature changes what the product does and has no PRD, say so in Open questions; don't write the PRD here.

## Commit and PR

1. Run the gate of `AGENTS.md`, when there is one: it also checks docs.
2. Commit the plan alone, `docs: plan NNN, <title>`, shortened to the subject limit of `source_control.md`.
3. With a remote: push the branch and open a PR ready for review, the title the commit subject, the body the plan's Overview in a line or two and its open questions.
4. Without a remote: stop at the commit and say that no PR was opened.

## Done

Report the plan's path, the branch, the PR and the open questions. Next: `grill` on the PR (without one, on the branch), which settles the open questions and empties the section; the owner approves the plan by merging it, then `execute-plan <plan path>`.
