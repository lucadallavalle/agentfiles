---
name: write-plan
description: Write the implementation plan for a feature or roadmap step from the common plan template, with execution chunks and open questions, on a docs PR. Use when asked to write, draft or prepare a plan.
---

# Write plan

The feature loop's plan (development process: `docs/documentation/development_process.md`): how one feature or roadmap step gets built, in chunks agents execute unattended. It has two readers: the owner, who reads it once and approves it, and the implementers, who each get one chunk and can't ask what you meant. You write the plan and open its PR; you don't write code, and you don't settle what only the owner can.

The common documentation is the repo's `docs/documentation/`; when the repo has none, read the machine copy in `${XDG_CONFIG_HOME:-~/.config}/agentfiles/documentation/` instead. Every `docs/documentation/` path below means whichever of the two you read. With neither, stop and say so: the plan has no format to follow.

Input: the request, in a line or more: a feature, a roadmap step, a PRD.

## Whose repo

A plan is a committed file, and a foreign repo gets none the owner didn't ask for. So before writing anything, look at `git remote -v` and the `owners` of `${XDG_CONFIG_HOME:-~/.config}/agentfiles/config.json`:

- **No remote:** the owner's local repo. Go on.
- **Every remote's owner** (the path segment before the repo's name) is listed, case-insensitive: an owned repo. Go on.
- **Anything else,** a missing config included: ask the owner whether the plan is committed here, and where it goes if not, then stop until they answer. When nobody can answer (another skill called you), the question is your whole report. A request that already says where the plan goes needs no question.

## Read

`docs/documentation/plan_template.md` whole: it is the plan's format, and this skill carries no copy of it. Then what exists of: `AGENTS.md` (gate, domain words), `docs/documentation/README.md` (Which level a decision belongs to), `development_process.md`, `source_control.md`, `docs/ROADMAP.md`, `docs/HANDOVER.md`, `docs/decisions.md`, the PRD and ADRs the request touches, the latest plan in `docs/plans/` (the repo's own style) and the code the plan will change.

## Number and branch

- **Number:** `git fetch origin` when there is a remote. `NNN` is one more than the highest number among the `docs/plans/NNN_*.md` of every local and remote branch (`git for-each-ref refs/heads refs/remotes`, `git ls-tree --name-only <ref> docs/plans/`) and those branches' `docs/plan-NNN-*` names, so a plan on an open branch keeps its number; `001` when there is none.
- **Slug:** two to four lowercase words, hyphenated; the file is `docs/plans/NNN_<slug>.md`.
- **Branch:** `docs/plan-NNN-<slug>` from the fresh default branch of `origin`; without a remote, from the local default branch. In a clean checkout, switch to it: `grill` edits the plan there next. With uncommitted work, leave the checkout alone and use a worktree of its own.

## Write

Follow the template: its sizing guide picks the sections, its Execution Chunks rules shape the chunks. Leave out the template's bracketed markers and the sections that don't apply. Title: `# NNN: <title>`. Say what and why, with enough how to show the intent: no code, no file contents. Use the domain words of `AGENTS.md`, and be succinct.

Every statement in a plan is a fact, a decision already made, a choice of yours or a question. Keep them apart, because the owner approves the plan on what it says is settled:

- **Facts** you look up in the code, the docs and the tools: file paths, existing patterns, what a dependency does. Never guess one, never leave one as a question.
- **Decisions already made** by the request, the roadmap, the PRD, the ADRs or the decision log are Key Decisions (in a small plan, lines of the approach), with where each was made as its rationale.
- **Small choices** you make yourself and state in the approach as the plan's choice, with the reason: a file's name or place, an internal name, a helper, which existing pattern to follow. The test: the owner would take either answer, and changing it later costs one edit.
- **Open questions** are the choices left: the ones that change what the product does, the scope, the chunks or their order, a name or interface users see, or that are hard to reverse. Each has your recommended answer and what it changes in the plan; write the rest of the plan on that recommendation, and never present it as decided.

Each open question costs the owner a round of `grill`, so ask what they would want to be asked. A small change seldom has more than two or three; with more, look for small choices and facts among them. When the feature changes what the product does and has no PRD, that is an open question; don't write the PRD here.

Two sections are in every plan, a small one included, because the next skills work from them: `## Open questions` (`grill`; `None.` when nothing is open) and `## Execution` (`execute-plan`), which replaces the minimum plan's closing `Accept:` line.

- **Chunks:** each one testable outcome, a sentence that is true when it's done, small enough for one agent session and one PR, with an `Accept:` a command can prove and a `Depends:` where it needs another. Chunks without a dependency path between them touch disjoint files, since they may run in parallel. In a plan with more than one chunk, the file tables have a Chunk column.
- **Accept:** the implementer has only this and the gate to know the chunk is done, so run each command before you commit: it fails today, where the implementer will work, for the reason the chunk removes. One that passes already, or fails for want of a tool, proves nothing. When nothing in the repo can prove an outcome, an earlier chunk builds the means; what only the owner can check is an `Owner check:` line.
- **Gate:** the gate of `AGENTS.md`. When the repo names none, recommend one from commands that pass in the repo today, and make it an open question. Every chunk runs the gate, the first one too, so a check that needs something the plan creates is that chunk's `Accept:`, not the gate.

## Commit and PR

1. Run the gate of `AGENTS.md`, when there is one: it also checks docs.
2. Commit the plan alone, `docs: plan NNN, <title>`, shortened to the subject limit of `source_control.md`.
3. With a remote: push the branch and open a PR ready for review, the title the commit subject, the body the plan's Overview in a line or two and its open questions.
4. Without a remote: stop at the commit.

## Done

Report the plan's path, its branch and where that is checked out (the checkout, now off the branch it was on, or the worktree's path), the PR, or that there is none, and the open questions.

Next: `grill` on the PR, which settles the open questions and empties the section; the owner approves the plan by merging the PR, then `execute-plan <plan path>`. Without a remote: `grill` on the branch, which leaves its edits uncommitted; the owner approves by committing them and merging the branch into the default branch.
