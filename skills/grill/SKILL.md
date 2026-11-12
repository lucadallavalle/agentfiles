---
name: grill
description: Relentless interview to stress-test a plan, decision, idea, PRD, ADR or design until every decision is settled, sharpening the domain words and writing the outcomes into the docs as we go. Use when the owner says "grill", "grill this" or "grill me".
disable-model-invocation: true
---

# Grill

The owner's review of a strategy or feature document before it merges (development process: `docs/documentation/development_process.md`).

The common documentation is the repo's `docs/documentation/`; when the repo has none, read the machine copy in `${XDG_CONFIG_HOME:-~/.config}/agentfiles/documentation/` instead. Every `docs/documentation/` path below means whichever of the two you read.

Interview the owner relentlessly until you reach a shared understanding: nothing left silently assumed, so agents can later execute without reopening decisions.

Before starting, read what exists of: `AGENTS.md`, `docs/documentation/README.md` (formats, decision levels), `docs/decisions.md`, the document under review and the ADRs it touches.

## Interview in rounds

Map the design as a **design tree**: every decision branches into the decisions that hang off it.
The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round (or one question at a time if the owner asks), numbered, each with your recommended answer. Then wait.

```
❓ **Q1** - **<question title>**: <question body, with the options when there are several>

➡️ <your recommended answer>

---

❓ **Q2** - ...
```

- Word each question so "yes" accepts your recommendation.
- A question whose answer depends on another one still open in this round belongs to a later round.
- Each round of answers reshapes the tree: recompute the frontier and ask the next round.
- **Facts are your job, decisions are the owner's.** Never ask for anything you can look up in the code, docs or tools. Dispatch a sub-agent with a fresh context to find it; only the questions downstream of it wait, ask the rest of the frontier now.
- Cross-reference with the code: when the owner states how something works and the code disagrees, say so. "The code cancels whole orders, but you said partial cancellation is possible. Which is right?"
- Be adversarial: hunt for contradictions with existing ADRs and decisions, missing error paths, compliance gaps, and scope that doesn't serve the stated goal. Invent concrete edge-case scenarios that force a precise answer.

## Domain words

- When the owner uses a term that conflicts with the `Domain words` in `AGENTS.md`, say so at once: "AGENTS.md defines X as …, you seem to mean …. Which is it?"
- When a term is vague or overloaded, propose one canonical word.
- When a term is settled, update the `Domain words` section of `AGENTS.md` right away (create the section if missing): one line, what it is, not what it does, plus words to avoid. No implementation details.
  `- draft: the editable set of resources for one environment. Avoid: workspace, working copy.`
- Only terms specific to this product, never general programming concepts.

## Writing outcomes down

Record each settled decision at its level (see "Which level a decision belongs to" in `docs/documentation/README.md`):

- **Design** (what the feature does): edit the document under review in place, if it is not yet merged: in a plan, change the sections the decision touches and take the question it settles out of Open questions (`None.` once empty), with no amendment. A merged PRD or plan is immutable: add an amendment instead. A merged ADR is superseded by a new one, never edited.
- **Implementation** choice the docs don't cover: a row in `docs/decisions.md`, `Made By:` the owner's name, no ADR.
- **Architecture**: only when all three hold: hard to reverse, surprising without context, a real trade-off between alternatives. Propose an ADR (`docs/adr/ADR-NNN_short-name.md`, next number, `docs/documentation/adr_template.md`) and add a decision log row linking to it. Otherwise it's a decision log row.

Write as you go, not in a batch at the end; when the document under review has an open PR, on that PR's branch. Be succinct. Create files only when you have something to write. If the repo has no `docs/documentation/` of its own, ask the owner where outcomes go before writing any file.

## Done

The session ends when the frontier is empty: every branch of the design tree visited.

When the document under review has an open PR, run the gate of `AGENTS.md`, when there is one, then commit the outcomes (`docs/documentation/source_control.md`) and push them to the PR's branch. If the gate fails on something you didn't write, don't push: say what failed. Without an open PR, commit nothing.

Summarize the settled decisions and where each was written, list anything still open, and wait for the owner to confirm shared understanding before the document merges. Do not plan or write code in this skill.

Next, once the owner has merged the document: `execute-plan <plan path>` for a plan; `write-plan` for a PRD or a roadmap step.
