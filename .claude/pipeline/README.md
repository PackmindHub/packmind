# Agentic development pipeline

An orchestrator plans and specifies; cheap subagents implement; a deterministic
gate decides whether each unit landed. The orchestrator never edits code and
never reads code to judge a result.

## Why it is shaped this way

Decomposition on its own buys nothing — under a constant-hazard model, one
sixty-minute task and six ten-minute subtasks succeed at the same rate. All of
the gain has to come from tighter context lowering the failure rate, or from
verification plus localized retry. So: **a unit boundary without a
machine-checkable gate is pure overhead**, and the gate is the load-bearing
part of this directory.

## Phases

| | Skill | Produces |
|---|---|---|
| 1a | `agentic-feature-framing` | `charter.md` — scope, non-goals, acceptance criteria |
| 1b | `agentic-design-session` | `decisions.md` — decisions, rejected alternatives, constraints |
| 2 | `agentic-orchestrator` | units, records, commits |
| — | `agentic-doc-ingest` | documentation, downstream and on demand |

## Pieces

```
.claude/pipeline/
  charter.template.md          filled by phase 1a
  decision-log.template.md     filled by phase 1b
  unit-spec.template.md        filled inline into each subagent prompt, never to disk
  return-record.schema.json    what a subagent must return
  models.json                  tier → model, and the escalation ladder
  gate.config.json             commands, guardrails, always-in-scope paths

.claude/agents/
  context-scout    read-only retrieval, returns verbatim extracts
  unit-executor    implements one unit; the orchestrator sets its model per call
  reconcile        feature-boundary drift check over charter + log + records

scripts/
  agent-gate.mjs     scope · autofix · scoped · repo-wide · named test
  agent-record.mjs   validate a return record, append it to the feature
```

## Per feature

```
.claude/features/<slug>/
  charter.md  decisions.md  units/U-nnn.json  records.jsonl  metrics.jsonl
```

All committed. That is what makes a later bisect land on a unit with its scope
and its check attached, and what lets `agentic-doc-ingest` describe the feature
months later without reading the code.

## The gate

```
node scripts/agent-gate.mjs baseline
node scripts/agent-gate.mjs unit --spec .claude/features/<slug>/units/U-014.json
node scripts/agent-gate.mjs sweep
```

Prints `OK`, or the failing stage alone with the command that reproduces it —
because the orchestrator reads this output as tokens.

Stages run cheapest-first and fail fast: scope check, autofix (not a gate —
never something the executor is asked to satisfy), `nx affected` on the changed
files, `nx run-many` repo-wide, then the unit's named test. Scoped and repo-wide
both run on purpose: a scope-filtered check cannot detect a signature change
that breaks a caller the unit never touched, because the evidence was filtered
out.

Repo-wide costs about 2.6s warm here, so this is affordable per unit.

## The invariant

**The repo is lint-clean, typecheck-clean and build-clean at the start of every
unit.** Verified before each dispatch. Red at start is a fourth outcome —
`HALT`, to a human — never a unit failure, because misattributing environment
breakage to the executor corrupts the routing signal and the pass-rate metric.

Under the invariant, attribution is free: any violation after a unit belongs to
that unit, with no baseline subtraction.

## Guardrails

Lint, TypeScript, Nx, Jest and CI configuration, `package.json`, the lockfile,
`.gitignore`, and this directory are outside any unit's scope. Touching one
fails the gate. When a unit repeatedly fails a strict rule, the cheapest
available fix is relaxing the rule — so that route is closed, and a legitimate
rule change goes through its own human-authored commit.

`.gitignore` is on the list because adding a path to it hides that path from
`git status`, which is the scope check's only input.
