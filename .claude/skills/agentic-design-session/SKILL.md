---
name: 'agentic-design-session'
description: 'Turn a framed feature into an append-only decision log: every design fork made explicit, with the reasoning and the alternatives that were rejected and why. Use after agentic-feature-framing has produced a charter, and before any implementation starts. Also use when an implementation reveals an earlier decision was wrong and needs superseding. Produces .claude/features/<slug>/decisions.md and nothing else — no code, no file edits. This is phase 1b of the agentic development pipeline.'
---

# Design session

You are settling **how**, and recording it so it survives. The output is one
file: `.claude/features/<slug>/decisions.md`, from
`.claude/pipeline/decision-log.template.md`. Read the charter first.

## Why the rejected alternatives matter more than the decisions

An orchestrator will re-encounter every fork you settle here when it writes
specs, weeks of context later. Given only the decision, it does one of two
things: re-opens the question, or contradicts it without noticing. Given the
decision plus *why the obvious alternative was rejected*, it recognises the fork
and moves on.

So a `Rejected` bullet with no reason is worth nothing. "We rejected polling" is
not a record; "we rejected polling because the p99 gap has to stay under a
second and the poll interval that allows would cost more than the socket" is.

The same applies when you turn out to be wrong. A superseded decision keeps its
reasoning in the file, because the reason it looked right is exactly what stops
someone re-proposing it in three weeks.

## Hard rules

- **Write no code.** Types, signatures and schemas are decisions, and you may
  quote a signature in a decision. You may not implement one.
- **Edit no file but the decision log.**
- **Append only.** Never rewrite a decided entry. To change one, add a new entry
  with `supersedes: D-00n`, and append `superseded-by:` to the old one. That one
  line is the only permitted mutation.
- **Never leave a fork implicit.** If you notice yourself assuming something,
  that assumption is a decision, and it goes in the log.

## How to run the conversation

**Surface the assumptions first.** Before proposing anything, say out loud what
the charter appears to take for granted. Most bad designs are not chosen; they
are inherited from an unexamined premise. Ask about each one.

**Give a recommendation, then argue against it.** Not a survey of options — a
position, and then the strongest case you can make for the alternative. If the
counter-case wins, that is the session working. Record whichever loses, with
the reason it lost.

**Challenge the user's first answer once, properly.** Not to be difficult: the
first design is usually the one that fits the problem as stated, and framing is
never quite right. One serious push per fork, then take the answer.

**Set `user-visible` on every entry.** Yes when the decision changes something
a user can observe — a behaviour, a default, a limit, an error message. This is
what tells the documentation pass later which decisions need surfacing, and it
cannot be recovered afterwards.

**Write `Constrains implementation` as an instruction to a stranger.** That line
gets quoted verbatim into subagent prompts, in front of a model that has read
nothing else — not the charter, not the rest of the log, not this conversation.
If it only makes sense in context, it is not written yet.

**Resolve or deliberately defer every known unknown in the charter.** A deferred
unknown needs a note saying who decides it and when. Silence is not deferral.

## When to stop

Stop when every acceptance criterion has enough decided that a unit could be
specced against it without a judgement call, and every known unknown is either
decided or explicitly deferred.

Do not try to decide everything. Decisions that only matter inside one unit
belong to that unit — over-deciding here wastes the session on forks whose
context will have changed by the time they run. The test is not "is everything
settled", it is **"could a stranger implement any AC from this log without
guessing?"**

## Mid-implementation use

The orchestrator appends decisions itself when a unit blocks on a fork that sits
inside the charter's scope. Invoke this skill when the harder case comes up: an
implementation revealed a decision was *wrong*, not merely absent. Supersede it,
and record what the implementation taught you in the new entry's reasoning —
that is the most valuable kind of entry in the file.
