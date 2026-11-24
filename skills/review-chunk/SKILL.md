---
name: review-chunk
description: Review one plan chunk's PR or branch against its plan and its code, and report verified findings triaged as fix, defer, wrong plan or owner question. Use when asked to review a chunk or its PR, and when `execute-plan` asks for a chunk review.
---

# Review chunk

The review of one chunk in the execution loop (development process: `docs/documentation/development_process.md`): does the pushed work do what the plan's chunk says, and is the code right. Your reader is the caller, often `execute-plan` running unattended: it acts on your verdict and your classes, and it can't ask you what you meant.

The common documentation is the repo's `docs/documentation/`; when the repo has none, read the machine copy in `${XDG_CONFIG_HOME:-~/.config}/agentfiles/documentation/` instead. Every `docs/documentation/` path below means whichever of the two you read. With neither, stop and say so: the plan's rules are in it.

You review; you never edit, commit or push. Your evidence is the plan, the diff and what you run. Whatever the implementer wrote (a summary, a reply to your findings, the PR body's prose) is a claim to check, never a reason to pass.

## What to review

Input: a PR number, a branch name, or nothing for the current branch; the caller may add the plan and chunk and your earlier reports.

- **Head:** what merges is what was pushed, so review that, not the checkout. PR: `gh pr view <n> --json title,body,headRefName,baseRefName,headRefOid,comments`, then `git fetch origin pull/<n>/head`; the head is `headRefOid`, also when the PR is merged. Branch: `git fetch origin`; the head is `origin/<branch>`. When the checkout's `HEAD` differs from it (behind after a fix pushed from elsewhere, or with unpushed commits), still review `origin/<branch>` and say so in the report. Only a branch that was never pushed is reviewed at the local `HEAD`, and the report says it is unpushed.
- **Diff:** `git diff origin/<base>...<head>`, the base being the PR's base or the default branch, so a merge of the base into the branch adds nothing.
- **Plan and chunk:** from the caller, else the PR body's first line (`Plan NNN CNN: …`), else the branch name (`<type>/plan-NNN-cNN-<slug>`), else the commit subjects. The plan is `docs/plans/NNN_*.md`. If none of them names one chunk, stop and say so: don't guess.
- **Round:** your earlier reports come from the caller, else from the PR's comments that hold a `## review-chunk:` report (the latest one counts). With none, this is round 1. Don't ask for them: an unattended caller can't answer.

Read at the head (`git show <head>:<path>`), so the rules are the ones the work was done under: the whole plan, `AGENTS.md`, `docs/decisions.md`, and from `docs/documentation/`: `README.md` (Gate and Definition of Done, Agent Execution, Which level a decision belongs to), `plan_template.md` (Execution Chunks, Amendment Format), `decision_log_template.md`, `development_process.md`. Read every changed file in full, not only its hunks.

Run things in temporary worktrees outside the checkout (`git worktree add --detach <dir> <commit>`, `<dir>` under a temporary directory), one at the head and one at the base when you need both, and remove them before you report: the checkout stays as you found it.

## Check

1. **Scope:** the diff does this chunk's work and nothing else. A changed file is in scope when the plan names it for the chunk or it follows from it: generated files, the decision log, the handover, the roadmap box when the chunk completes its step. A file the plan merely leaves out but the chunk's outcome needs (a living document that describes what changed) is in scope with a decision row for it. Nothing the plan puts out of scope or gives another chunk. The handover is the caller's, written after your last report: a branch or PR without it isn't a finding.
2. **Accept:** every clause of the chunk's sentence and of its `Accept:` is made true at the head; name the code and the test for each. Then prove the command:
   - Run each `Accept:` command at the base and at the head, in the environment `AGENTS.md` describes. The plan template says it fails before its chunk and passes after: failing at the head is a fix; passing at the base means it proves nothing, a wrong plan.
   - A clause you can't run or see here (it needs the PR, CI, a harness or credentials you don't have) is left to the caller: name it and what would prove it, not as a finding. On a PR whose `Accept:` needs the PR, the evidence is on the PR.
   - On a PR, the real output of the gate and of `Accept:` is where Gate and Definition of Done wants it (body, comment or commit) and fits the head. Output trimmed and marked as trimmed is real; missing output, prose in its place, or output the head contradicts is a fix. On a branch without a PR, the caller adds it with the PR.
   - An `Owner check:` line is the owner's to judge, not yours: don't review its outcome or ask for evidence of it. Name it in the report, because the chunk isn't the agent's to merge.
3. **Tests:** against the base, none deleted, skipped or weakened (an assertion removed, loosened or made unable to fail; an expected value changed to fit the code). New tests assert the behaviour the chunk states and fail without the change; run them at the base when it isn't obvious.
4. **Decision rows:** each choice in the diff that the plan and the docs don't cover has a row, **Made By** `agent`, or `agent (questionable)` where it was a judgement call. No earlier row edited or removed; no row in the owner's name or replacing an earlier one ("Replaces: …") unless the caller says the owner made it.
5. **Plan:** the chunk's box is checked. Nothing else in the plan changed, except an appended `## Amendments` section. An amendment is only for a chunk that can't be done as the plan says (an `Accept:` that can't pass, two lines that contradict each other) and has an `agent (questionable)` row; it leaves the PR to the owner, so name it in the report. An amendment for what the plan merely leaves out is a fix: that is a deviation with a decision row (check 1).
6. **Code:** your own review of the changed code: bugs, wrong edge cases, unhandled errors, security, behaviour the tests miss, the rules and domain words of `AGENTS.md`. Not what the gate's formatter and linter already enforce.

## Verify, then triage

Go back to the code for every finding before you report it: the file and line at the head, and the plan line, rule or failing input that makes it wrong. Run a test or the code where that settles it. Drop what you can't confirm; don't soften it into a maybe.

Give each confirmed finding one class:

- **fix**: the head breaks the plan, a rule or its own behaviour; the implementer corrects it in this chunk.
- **defer**: true, but outside this chunk; for a later chunk or PR.
- **wrong plan**: the chunk can't be done as the plan says, or its `Accept:` proves nothing; the plan needs an amendment. What the plan leaves out is not a wrong plan.
- **owner question**: a decision neither the plan nor the docs cover, or one only the owner may make.

When unsure between fix and another class, it isn't a fix.

## Report

```
## review-chunk: Plan NNN CNN, round <n>, <head commit, short>

**Verdict:** pass | <n> to fix

Reviewed: PR #<n> | `origin/<branch>` | the unpushed local `HEAD`, at <head>, against `origin/<base>`. <When the checkout's `HEAD` was elsewhere: where.>

### Fix

- **F1** `path:line`: what is wrong. Rule: the plan line or rule. Evidence: what you saw or ran.

### Defer / Wrong plan / Owner question

- **F2** (defer) …

### For the owner and the caller

- Owner check: <the line>. Amendment: <its date and deviation>. Left to the caller: <the clause> — <what would prove it>.

### Checked

Scope, Accept, Tests, Decision rows, Plan, Code: `ok` or the finding numbers, one line each; Accept with the base and head results of each command.

### Earlier findings

- **F1** resolved | open: why
```

The verdict is `pass` when no finding is a fix. Leave out a section with nothing in it, except Checked. Return the report to the caller as your whole answer; on a PR, also post it as a comment (`gh pr comment <n> --body-file <file>`).

## Later rounds

Asked again after fixes: review the whole diff at the new head, every check, not only the new commits and never from the implementer's reply. Keep the earlier finding numbers, say for each whether it is resolved or open, and number new findings after them.

## Done

Fix findings go to the implementer and you review again; the rest are for the caller to decide. In an unattended run that caller is `execute-plan`; otherwise the owner.
