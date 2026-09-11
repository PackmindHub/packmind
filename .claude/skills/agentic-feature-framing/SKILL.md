---
name: 'agentic-feature-framing'
description: 'Frame a piece of work before any design or implementation: what is in scope, what is explicitly not, and the acceptance criteria that will judge it. Use at the very start of a new feature, when the user says "I want to build X", "we need a way to Y", or hands over a ticket or a rough idea. Produces .claude/features/<slug>/charter.md and nothing else — no code, no design decisions, no file edits. This is phase 1a of the agentic development pipeline; agentic-design-session is 1b and agentic-orchestrator is phase 2.'
---

# Feature framing

You are settling **what** is being built. Not how. The output is one file:
`.claude/features/<slug>/charter.md`, from `.claude/pipeline/charter.template.md`.

## Why this exists

Two reasons, and the second is the one that gets forgotten.

**Scope and criteria are the escalation ladder.** Downstream, an orchestrator
dispatches cheap subagents that cannot ask you anything. When one of them hits an ambiguity, it walks an escalation ladder:
does an acceptance criterion answer this, does a decision entry answer it, is it
a new decision inside scope — and only if all three fail does it stop and wait
for a human.

**Every rung of that ladder is something you write here or in the design
session.** A charter that is vague about scope does not produce a flexible
pipeline; it produces one that halts constantly, or worse, one whose subagents
quietly decide for themselves.

**And this phase, with 1b, is how the size of the work becomes visible.** Not so
that units can be planned — they never are — but so that the decision to hand
this to the orchestrator in one run, or to cut it into several, is made
deliberately and before anything is built. That verdict is written at the close
of the design session, into the charter's `Size and sessions`. What you owe it
here is a coarser read: whether this is *one* feature at all.

## Hard rules

- **Write no code.** Not an example, not a sketch, not a type definition.
- **Edit no file but the charter.**
- **Do not design.** "We could use a queue for this" is a decision-session
  question. If the user offers implementation, write down the *requirement* it
  implies and move on.
- **Do not accept the first plausible framing.** The first answer to "what are
  we building" is almost always the solution the user already has in mind, not
  the problem.

## How to run the conversation

**Start with the problem, and stay there longer than feels natural.** Who hits
this today, how often, what do they do instead. You are looking for the sentence
that makes the acceptance criteria obvious.

**Force acceptance criteria into observable form.** An AC is something a person
could watch happen and say yes or no. It becomes a named test, and that test
becomes a unit's exit criterion — so an AC that cannot be observed cannot be
gated, and a unit boundary without a gate is pure overhead.

When the user offers something unobservable, sort it:

| They said | It actually is |
|---|---|
| "It should be fast" | An AC with a number, or a non-goal |
| "It should be well structured" | A design decision — note it for phase 1b |
| "It should handle errors properly" | Several ACs, one per error a user can see |
| "It should use the existing service" | A design constraint, not a criterion |

**Push hard on non-goals.** This is the part users skip and the part that does
the most work later. The orchestrator halts to a human when a unit needs
something on the non-goals list — that is the mechanism working. An empty
non-goals section means every scope question becomes a judgement call made by
a cheap model at three in the morning.

Ask directly: what is the nearest thing to this that we are *not* doing? What
would you refuse if I proposed it?

**Mark each AC user-visible or not.** It decides whether the feature's
documentation has to mention it.

**Write down what you deliberately did not settle.** Known unknowns are not
failures of framing. An unknown recorded with "resolve by: design session" is
handled; the same unknown unrecorded is a halt at unit fourteen.

## Before you finish: is this one feature?

The coarse read. Not a unit count — you cannot have one yet, because the
decisions that set it have not been made. The question is whether the ACs in
front of you describe a single thing.

They do not when the charter has ACs that share no problem statement, when one
AC would still make sense shipped alone months later, or when two of them would
be argued about by different people. That is two charters, and saying so now is
cheap; saying it at unit eleven is not.

If it is one feature, say what you expect the shape of the work to be in a
sentence — "mostly one package, one migration" — and leave `Size and sessions`
empty for the design session to fill. Do not guess a unit count into it.

## Finishing

Stop when every AC is observable, non-goals are non-empty, the one-feature
question has an answer, and the user has read the charter back. Then say what
happens next: the design session turns these criteria into decisions, and closes
by sizing the result — one orchestrator run or several. Only after that does
anything get built.

Do not offer to start implementing. That is a different phase with a different
skill, and the value of this one is that it ends before code exists.
