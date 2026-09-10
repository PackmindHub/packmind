# Decisions — <feature name>

Append-only. A decided entry is never edited and never deleted.

**When implementation reveals a decision was wrong** — not merely ambiguous —
append a new entry carrying `supersedes: D-00n`, and append `superseded-by: D-0nn`
to the old one. That single line is the only permitted mutation of a decided
entry. The wrong decision stays in the file with its reasoning intact, because
the reason it looked right is what stops it being re-proposed in three weeks.

**Rejected alternatives are load-bearing.** The orchestrator re-encounters every
fork when writing specs. Without the reasoning it will either re-open the
question or quietly contradict it.

**`user-visible`** drives documentation. Set it to `yes` when the decision
changes something a user of the product can observe — a behaviour, a default, a
limit, an error message. Internal structure is `no`.

---

## D-001 — <short imperative title>

- status: `active` | `superseded`
- user-visible: `yes` | `no`
- decided: `YYYY-MM-DD`
- supersedes: —
- superseded-by: —
- relates to: `AC-1`, `UK-1`

**Decision.** One or two sentences. What was chosen, stated flatly.

**Reasoning.** Why. The argument, not a restatement of the decision.

**Rejected.**

- `<alternative>` — `<why it was rejected>`
- `<alternative>` — `<why it was rejected>`

**Constrains implementation.** What a unit must or must not do as a result.
This is the part that gets quoted verbatim into subagent prompts, so write it
as an instruction to an implementer who has read nothing else.

---
