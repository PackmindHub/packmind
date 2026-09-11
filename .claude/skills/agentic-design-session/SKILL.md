---
name: 'agentic-design-session'
description: 'Turn a framed feature into an append-only decision log: every design fork made explicit, with the reasoning and the alternatives that were rejected and why. Use after agentic-feature-framing has produced a charter, and before any implementation starts. Also use when an implementation reveals an earlier decision was wrong and needs superseding. Produces .claude/features/<slug>/decisions.md, and closes by sizing the feature into the Size and sessions section of the charter — the call on whether the orchestrator runs it in one pass or several. No code, no other file edits. This is phase 1b of the agentic development pipeline.'
---

# Design session

You are settling **how**, and recording it so it survives. The main output is
`.claude/features/<slug>/decisions.md`, from
`.claude/pipeline/decision-log.template.md`. Read the charter first.

You also close by filling one section of the charter — `Size and sessions` — and
that is the only edit you may make outside the decision log. It is the last step
of this skill, described at the bottom.

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
- **Edit no file but the decision log**, and the charter's `Size and sessions`
  section at the close. Nothing else in the charter is yours to touch — if
  framing got a criterion wrong, say so and let the user reopen phase 1a.
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

## When to stop deciding

Stop when every acceptance criterion has enough decided that a unit could be
specced against it without a judgement call, and every known unknown is either
decided or explicitly deferred.

Do not try to decide everything. Decisions that only matter inside one unit
belong to that unit — over-deciding here wastes the session on forks whose
context will have changed by the time they run. The test is not "is everything
settled", it is **"could a stranger implement any AC from this log without
guessing?"**

## Then size it — the last step, and do not skip it

Framing said what. You said how. Only now is the size of the work knowable, and
**this is the point of having had both conversations**: to decide, before any
code exists, whether this goes to the orchestrator in one run or in several.
Write the answer into the charter's `Size and sessions`.

**The unit count is a rough read, and it stays rough.** Units are never
enumerated in advance — that is the whole cost argument behind the pipeline. You
are estimating an order of magnitude from the decided design: roughly how many
places have to change, and how many of those changes are independent. A range.

**Then give the verdict.** One session or split. Reasons to split:

| Signal | Why it wants its own session |
|---|---|
| A deferred unknown sits mid-feature | Everything past it would be specced on a guess |
| One subset is releasable on its own | A run that ends somewhere a human wants to look |
| A late AC depends on the shape of an early one | The design of S2 is genuinely better informed by S1 having landed |
| The unit count is large enough that the orchestrator's own context is the risk | Its judgement is what degrades, and it is the one part with no gate |

Reasons that are *not* reasons to split: the feature feels big, the feature
touches several packages, a unit looks hard. Unit size is phase 2's problem and
it splits units by itself, on evidence, when a tier ladder is exhausted.

**A split is not a re-framing.** Every session runs against the same charter and
the same decision log. You are cutting the run, not the feature — so name the cut
by ACs, say what each session lands, and say which depends on which.

**Say it out loud too.** The verdict is a call about how the user spends the next
few days, and it belongs in the conversation, not only in a file.

## Mid-implementation use

The orchestrator appends decisions itself when a unit blocks on a fork that sits
inside the charter's scope. Invoke this skill when the harder case comes up: an
implementation revealed a decision was *wrong*, not merely absent. Supersede it,
and record what the implementation taught you in the new entry's reasoning —
that is the most valuable kind of entry in the file.
