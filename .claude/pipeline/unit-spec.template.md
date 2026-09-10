# Unit spec template

The orchestrator fills this in and passes it as the `prompt` of a single `Agent`
call. **It is never written to disk as a spec file.** A spec that lives in a file
drifts out of sync with the unit it describes; an inline one cannot.

Two things do get written, and they are not the spec:

- `.claude/features/<slug>/units/U-nnn.json` — four fields the gate needs to run
  (`unit_id`, `feature`, `files_in_scope`, `exit_criterion`). Committed, so a
  later bisect lands on a unit with its scope and its check attached.
- `.claude/features/<slug>/records.jsonl` — what came back.

Everything below the line is prompt text. Angle brackets are fill-ins; the prose
is deliberate and should survive substitution mostly intact. It is written as one
consolidated statement rather than a conversation opener on purpose: the same
information delivered across turns instead of up front costs about 25 points of
task performance, and the loss does not recover once the model has committed to
a wrong reading.

---

## Goal

<One sentence. What is true after this unit that is not true now.>

## Context

<Verbatim extracts from the context-scout packet: exact signatures, exact
existing call sites, exact type definitions. Never a summary of the codebase —
repo-level summaries measurably fail to help a cheap executor and distract from
instance-specific signal. Quote code; do not describe it.>

## Decisions that bind this unit

<Quote the relevant decision-log entries in full — the Decision line and the
Constrains-implementation line at minimum. Do not reference them by ID. The
executor will not read the log and must not be asked to.>

> **D-007.** <decision text>
> **Constrains implementation.** <constraint text>

## Files in scope

<Exact paths or narrow globs. This list is a gate input, not advice: anything
modified outside it fails the scope check.>

- `packages/spaces/src/removeMember.ts`
- `packages/spaces/src/removeMember.test.ts`

## Files explicitly out of scope

<Name the ones you expect to be tempting. "Everything else" is already implied
by the list above; this section is for the near misses.>

- `packages/spaces/src/index.ts` — the export already exists, do not touch it
- anything under `apps/frontend/` — the UI lands in a later unit

## Exit criterion

This command must pass, and it is how the unit is judged:

```
<./node_modules/.bin/nx test spaces -t 'removeMember'>
```

<If the test does not exist yet, say so explicitly and say that writing it is
part of the unit. If it does exist, say that it must not be modified.>

## What not to do

- **Do not format.** Prettier and `eslint --fix` run on your output automatically,
  before anything is checked. Spending effort on layout costs you the capacity
  that produces valid edits, and buys nothing.
- **Do not touch lint, TypeScript, Nx, Jest or CI configuration.** Any edit there
  fails the gate outright. If a rule seems wrong, that is a `blocked`, not a fix.
- **Do not change tests outside the exit criterion** to make something pass.
- **Do not fix unrelated problems you notice.** Note them in `notes` instead.

## If you cannot proceed

Return `status: "blocked"` rather than guessing. A wrong guess that typechecks
is the most expensive failure this pipeline has — it passes every check and is
found weeks later. Blocking is cheap and correct. Block when:

- the spec is ambiguous in a way that changes the implementation,
- the context you were given contradicts the code you found,
- doing the job needs a file outside the scope list.

Say what you would need to know, and what options you considered. Do not
implement one of them "provisionally".

## Return

Reply with exactly one JSON object matching this shape and nothing else — no
preamble, no explanation, no code fences around prose:

```json
{
  "unit_id": "<U-nnn>",
  "feature": "<slug>",
  "status": "done",
  "files_touched": [{ "path": "…", "action": "created|modified|deleted" }],
  "decisions_applied": ["D-007"],
  "public_surface_changed": ["removeMember(spaceId, userId): Promise<void>"],
  "behaviour_delta": "Space owners can remove members; previously admin-only.",
  "deviations": [{ "spec_said": "…", "did": "…", "why": "…" }],
  "self_check": { "command": "<exit criterion>", "passed": true },
  "blocked": null,
  "notes": null
}
```

`public_surface_changed` and `behaviour_delta` are how this work reaches
documentation later. Fill them from what you just did — an exported symbol, an
endpoint, a CLI flag, a user-visible string. Leave `behaviour_delta` null when
nothing a user could observe changed.

`deviations` is the difference between what the spec said and what you actually
did, including small ones. An empty list when you deviated is worse than the
deviation.

Run the exit-criterion command yourself before returning. It is cheap, it is
the same command that will judge you, and `self_check.passed: false` with an
honest record is a better outcome than a hopeful `true`.
