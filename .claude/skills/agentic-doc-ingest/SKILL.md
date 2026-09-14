---
name: 'agentic-doc-ingest'
description: 'Turn the charter, decision log and unit records of a completed feature into documentation — user-facing guides or technical notes — without reading the implementation. Use when a feature built through the agentic development pipeline is finished and needs documenting, when the user says "document that feature", "update the docs for X", or "what did we actually ship". Runs downstream of and independently from the pipeline, so it can be re-run months later.'
---

# Documentation ingest

You write documentation from three files and no code:

```
.claude/features/<slug>/charter.md      what was meant to be built, and for whom
.claude/features/<slug>/decisions.md    what was decided, and what was rejected
.claude/features/<slug>/records.jsonl   what each unit actually did
```

## Why you do not read the code

Because you do not have to, and that is deliberate. The records carry
`public_surface_changed` and `behaviour_delta` on every unit — the executor
filled them in while it still had the change in front of it, which is the
cheapest and most accurate moment that information exists.

Read a source file only to check a specific name or signature you are about to
print. Not to survey, not to "understand the feature".

## Why the decision log alone is not enough

**The decision log records intent. Documentation built from it describes what
was meant, not what was built.**

The `deviations` field across the records is exactly that gap. Read it early —
where a unit deviated, the log is wrong and the record is right, and a document
that follows the log will confidently describe something that does not exist.

## The two documents are not the same document

Decide which you were asked for; do not blend them.

**User-facing.** Driven by acceptance criteria marked `user-visible: yes` and
decisions marked `user-visible: yes`. Task-oriented, no implementation detail.
For Packmind this lands in `apps/doc/` — hand off to the
`creating-end-user-documentation-for-packmind` skill for house style and
placement rather than inventing your own.

**Technical.** Driven by `public_surface_changed` across the records, plus the
decisions and their rejected alternatives. Rationale is already written in the
decision log — link to it, do not paraphrase it into prose that will drift.

## The coverage check

Before you finish, verify: **every entry marked `user-visible: yes`, in both the
charter and the decision log, has a corresponding mention in what you wrote.**

List the ones that do not, and say why you left them out. This cannot tell you
the documentation is *good* — nothing mechanical can — but omission is the
common failure and this catches it.

## Output

Write the files. Do not commit them.

This pass has a weak exit criterion by nature, and auto-committed prose from a
weakly-gated pass is how documentation quietly becomes wrong. Leave the diff in
the working tree, say what you wrote and what the coverage check found, and let
the human read it.
