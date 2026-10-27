---
name: grill
description: Adversarial review of a PRD, ADR or design before planning. Interview the owner in rounds until every decision is settled, sharpen the domain words, and write the outcomes back into the docs. Use when the owner says "grill", "grill this", or asks to stress-test a spec or design.
disable-model-invocation: true
---

# Grill

Step 2 of the development process: docs first → **grill** → plan → plan review → execution → code review.
The goal is a design with nothing left silently assumed, so agents can later execute without reopening decisions.

Before starting, read `AGENTS.md` and `docs/documentation/README.md` (formats, decision levels), the document under review, `docs/decisions.md`, and the ADRs it touches.

## Interview in rounds

Map the design as a **tree**: every decision branches into the decisions that depend on it.
The **frontier** is every open decision whose prerequisites are settled. Ask the whole frontier in one round, then wait.

```
❓ **Q1** - **<title>**: <question, with the options when there are several>

➡️ <your recommended answer>

---

❓ **Q2** - ...
```

- Word each question so "yes" accepts your recommendation.
- A question that depends on another one still open belongs to a later round.
- Recompute the frontier after each round of answers.
- **Facts are your job, decisions are the owner's.** Never ask for something you can look up in the code, docs or tools; use a sub-agent and don't block the other questions on it.
- Be adversarial: look for contradictions with the code, existing ADRs and decisions, missing error paths, compliance gaps, and scope that doesn't serve the stated goal. Invent concrete edge-case scenarios that force a precise answer.

## Domain words

- When the owner uses a term that conflicts with the `Domain words` in `AGENTS.md`, say so at once: "AGENTS.md defines X as …, you seem to mean …. Which is it?"
- When a term is vague or overloaded, propose one canonical word.
- When a term is settled, update the `Domain words` section of `AGENTS.md` right away (create the section if missing): one line, what it is, not what it does, plus words to avoid.
  `- draft: the editable set of resources for one environment. Avoid: workspace, working copy.`
- Only terms specific to this product, never general programming concepts.

## Writing outcomes down

Record each settled decision at its level (see "Which level a decision belongs to" in `docs/documentation/README.md`):

- **Design** (what the feature does): update the document under review, if it is not yet merged. A merged PRD or plan is immutable: add an amendment instead.
- **Implementation** choice the docs don't cover: a row in `docs/decisions.md`, `Made By: owner`, no ADR.
- **Architecture**: only when all three hold: hard to reverse, surprising without context, a real trade-off between alternatives. Propose an ADR (`docs/adr/ADR-NNN_short-name.md`, next number, `docs/documentation/adr_template.md`) and add a decision log row linking to it. Otherwise it's a decision log row.

Write as you go, not in a batch at the end. Be succinct.

## Done

The session ends when the frontier is empty. Summarize the settled decisions and where each was written, list anything still open, and wait for the owner to confirm shared understanding before planning starts. Do not plan or write code in this skill.
