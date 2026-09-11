# Feature: <name>

- slug: `<kebab-case>` — the directory name under `.claude/features/`
- status: `framing` | `building` | `done`
- opened: `YYYY-MM-DD`

## Problem

One paragraph. What is wrong today, and for whom. Not a solution.

## In scope

- …

## Out of scope

Non-goals, stated so the orchestrator can recognise one. A unit that needs
something on this list is not a design question — it is rung 4 of the escalation
ladder, and halts to the human.

- …

## Acceptance criteria

Each AC is **one user-observable behaviour**, and becomes at least one named test.
If a criterion cannot be phrased as an observable behaviour, it is a design
decision, not an acceptance criterion — it belongs in `decisions.md`.

`verified by` starts empty. The orchestrator fills it with the literal command
from the unit that satisfied the AC. That column is the feature's completion
check: **the feature is done when every AC has a passing named test.**

| id | criterion | user-visible | verified by |
|----|-----------|--------------|-------------|
| AC-1 | A space owner can remove a member | yes | |
| AC-2 | Removing the last owner is refused | yes | |
| AC-3 | Member removal is written to the audit log | no | |

## Known unknowns

Deliberately undecided at framing time. Each one is a question the orchestrator
may hit; `resolve by` says who answers it and when. An unknown left here is not
a blocker — it is a flagged one.

| id | question | resolve by |
|----|----------|-----------|
| UK-1 | Does removal cascade to the member's drafts? | design session |

## Size and sessions

**Empty at framing. Filled at the close of the design session** — size is only
knowable once the decisions exist, because a fork settled one way is two units
and settled the other way is seven.

`unit count` is a rough read, not a plan: units are never enumerated in advance.
It exists to answer one question — does this go to the orchestrator in one run,
or does it get cut into runs that each end somewhere a human would want to look?

A `split` verdict names which ACs belong to which session and why the cut falls
there. Each session is a separate orchestrator run over the same charter and the
same decision log; nothing is re-framed and nothing is re-decided between them.

- rough unit count: `<n>-<m>`
- verdict: `one session` | `split`
- session boundaries — omit if `one session`:

  | id | ACs | what it lands | depends on |
  |----|-----|---------------|------------|
  | S1 | AC-1, AC-2 | schema and the write path | — |
  | S2 | AC-3 | the audit log | S1 |

- why here: `<what makes this the right cut — a dependency, a deferred unknown,`
  `a point where the feature is releasable, or a context budget>`

## Done

Every AC has a passing named test recorded in `records.jsonl`, and the full
suite is green at the feature boundary.

When the verdict was `split`, that is the bar for the **feature**, not for each
session. A session ending green with its own ACs covered is a session done; the
feature is done when the last one is.
