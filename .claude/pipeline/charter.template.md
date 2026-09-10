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

## Done

Every AC has a passing named test recorded in `records.jsonl`, and the full
suite is green at the feature boundary.
