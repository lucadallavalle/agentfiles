---
name: review-chunk
description: Review one plan chunk's PR or branch against its plan and its code, and report verified findings triaged as fix, defer, wrong plan or owner question. Use when asked to review a chunk or its PR, and when `execute-plan` asks for a chunk review.
---

# Review chunk

The review of one chunk in the execution loop (development process: `docs/documentation/development_process.md`): does the diff do what the plan's chunk says, and is the code right.

The common documentation is the repo's `docs/documentation/`; when the repo has none, read the machine copy in `${XDG_CONFIG_HOME:-~/.config}/agentfiles/documentation/` instead. Every `docs/documentation/` path below means whichever of the two you read.

You review; you never edit, commit or push. Your evidence is the plan and the diff. Whatever the implementer wrote (a summary, a reply to your findings, the PR body's prose) is a claim to check, never a reason to pass.

## Find the diff, the plan and the chunk

Input: a PR number, or nothing for the current branch.

- **PR:** `gh pr view <n> --json title,body,headRefName,baseRefName,headRefOid`; the diff is `gh pr diff <n>`; `git fetch origin pull/<n>/head` gives the head commit, also when the PR is merged.
- **Branch:** `git fetch origin`; the diff is `git diff origin/<default branch>...HEAD`, the head commit is `HEAD`.
- **Plan and chunk:** from what the caller said, else the PR body's first line (`Plan NNN CNN: …`), else the branch name (`<type>/plan-NNN-cNN-<slug>`), else the commit subjects. The plan is `docs/plans/NNN_*.md`. If none of them names one chunk, stop and say so: don't guess.

Read at the head commit (`git show <head>:<path>`), so the rules are the ones the work was done under: the whole plan, `AGENTS.md`, `docs/decisions.md`, and from `docs/documentation/`: `README.md` (Agent Execution, Which level a decision belongs to), `plan_template.md` (Execution Chunks, Amendment Format), `decision_log_template.md`, `development_process.md`. Read every changed file in full, not only its hunks.

## Check

1. **Scope:** the diff does this chunk's work and nothing else. Each changed file is one the plan names for the chunk or follows from it: generated files, the decision log, the handover, the roadmap box when the chunk completes its step. Nothing the plan puts out of scope or in another chunk.
2. **Accept:** every clause of the chunk's sentence and of its `Accept:` is made true by the diff; name the code and the test for each. On a PR, the real output of the gate and of `Accept:` is where Gate and Definition of Done wants it, and fits the diff. Output trimmed and marked as trimmed is still real; missing output, prose in its place, or output the diff contradicts is a finding. On a branch without a PR the caller runs them.
3. **Tests:** against the base, none deleted, skipped, or weakened (an assertion removed, loosened or made unable to fail; an expected value changed to fit the code). New tests assert the behaviour the chunk states, and would fail without the change.
4. **Decision rows:** each choice in the diff that the plan and the docs don't cover has a row, `Made By` `agent`, or `agent (questionable)` where it was a judgement call. No earlier row edited or removed; no row attributed to the owner or replacing an earlier one ("Replaces: …") unless the owner made it.
5. **Plan:** the chunk's box is checked. Nothing else in the plan changed, except an appended `## Amendments` section, which needs a decision row.
6. **Code:** your own review of the changed code: bugs, wrong edge cases, unhandled errors, security, behaviour the tests miss, the rules and domain words of `AGENTS.md`. Not what the gate's formatter and linter already enforce.

## Verify, then triage

Go back to the code for every finding before you report it: the file and line at the head commit, and the plan line, rule or failing input that makes it wrong. Run a test or the code where that settles it, in a temporary worktree if the head isn't checked out, leaving no change behind. Drop what you can't confirm; don't soften it into a maybe.

Give each confirmed finding one class:

- **fix**: the diff breaks the plan, a rule or its own behaviour; the implementer corrects it in this chunk.
- **defer**: true, but outside this chunk; for a later chunk or PR.
- **wrong plan**: the plan itself is wrong or can't be followed as written; it needs an amendment.
- **owner question**: a decision neither the plan nor the docs cover, or one only the owner may make.

When unsure between fix and another class, it isn't a fix.

## Report

```
## review-chunk: Plan NNN CNN, round <n>, <head commit, short>

**Verdict:** pass | <n> to fix

### Fix

- **F1** `path:line`: what is wrong. Rule: the plan line or rule. Evidence: what you saw or ran.

### Defer / Wrong plan / Owner question

- **F2** (defer) …

### Checked

Scope, Accept, Tests, Decision rows, Plan, Code: `ok` or the finding numbers, one line each.

### Earlier findings

- **F1** resolved | open: why
```

The verdict is `pass` when no finding is a fix. Leave out a section with nothing in it, except Checked. Return the report to the caller as your whole answer; on a PR, also post it as a comment (`gh pr comment <n> --body-file <file>`).

## Later rounds

Asked again after fixes: review the whole diff as it now stands, every check, not only the new commits and never from the implementer's reply. Keep the earlier finding numbers, say for each whether it is resolved or open, and number new findings after them. If you don't have your earlier report, ask the caller for it.

## Done

Fix findings go to the implementer and you review again; the rest are for the caller to decide. In an unattended run that caller is `execute-plan`; otherwise the owner.
