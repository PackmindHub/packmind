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

Units are neither planned nor split in advance. A unit is split only once it has
exhausted the model tiers, because a unit the strongest model cannot do from a
complete spec is evidence about the unit rather than about the executor. That is
as-needed decomposition — it adapts to the task and to the executor at the same
time, with no size threshold to tune.

So **nothing upfront is a spec**. Phase 1a settles scope, non-goals and
acceptance criteria; phase 1b settles the design forks inside that scope and then
sizes the result. The only specs are the inline ones the orchestrator writes, one
at a time, for the unit about to run.

What phase 1 does decide in advance is *how many orchestrator runs this takes* —
one pass, or a cut into sessions that each end somewhere a human would want to
look. That is a different question from unit decomposition and it is the reason
both phase-1 conversations happen before anything is built.

## Phases

| | Skill | Produces |
|---|---|---|
| 1a | `agentic-feature-framing` | `charter.md` — scope, non-goals, acceptance criteria |
| 1b | `agentic-design-session` | `decisions.md` — decisions, rejected alternatives, constraints; and the charter's `Size and sessions` |
| 2 | `agentic-orchestrator` | units, records, commits |
| — | `agentic-doc-ingest` | documentation, downstream and on demand |

## Running it

Nothing here is a command you have to remember. Each phase is a skill that
triggers on what you say; what follows is the shape of the conversation and
where it stops.

### 1a · frame — say what you want to build

"I want to build X", a ticket, or a rough idea. The session settles scope,
non-goals and acceptance criteria, and writes `charter.md`. It will push on
non-goals harder than feels necessary: the orchestrator halts to you when a unit
needs something on that list, and an empty non-goals section means a cheap model
decides instead.

It ends before any design. If it offers to start implementing, something has
gone wrong.

### 1b · decide — "let us do the design session"

Every fork made explicit, each with the alternative that lost and why it lost.
Writes `decisions.md`, append-only. The rejected reasoning is the load-bearing
part: without it the orchestrator either re-opens a settled question weeks later
or contradicts it without noticing.

It closes by filling `Size and sessions` in the charter — a rough unit count,
and the verdict of **one orchestrator run or several**. That verdict is the
reason both of these conversations happen before any code exists. It is not
unit decomposition; units are still never planned in advance.

### 2 · build — "start building"

The orchestrator reads the charter and the log once, then loops. Per unit:
baseline, choose the unit, retrieve context, write an inline spec, dispatch one
`unit-executor`, gate, route on which stage failed, record, commit.

You see a line per unit, not a transcript. What you act on:

| What you see | What it means |
|---|---|
| `OK` | the unit landed and was committed |
| `FAIL <stage>` | it is routing on its own — no action |
| `HALT` | it needs you |

A `HALT` is the escalation ladder having run out: the answer was not in an
acceptance criterion, not in the decision log, and not a new decision inside
scope. Rung 4 is you. That is the mechanism working, not a failure.

### Ending, and re-entering

At the feature boundary the orchestrator runs the reconcile check — tests catch
"did it wrong", not "did the wrong thing correctly". Documentation is separate
and can be run months later from the records alone.

**Starting a fresh orchestrator session is cheap and is often correct.** The
charter, the log and the records are the entire state, and a new session reads
them in a few thousand tokens. Do that when first-attempt pass rate slides —
that is the orchestrator degrading, and specs written from a degraded session
are worse specs. A `split` verdict is the same move, decided in advance.

### Before the first run

- `nvm use` — the repo needs the version in `.nvmrc`, and the gate halts on the
  wrong one rather than producing confusing failures.
- `export PACKMIND_EDITION=oss`.
- Work from a clean tree. The scope check's only input is `git status`, so an
  unrelated edit of yours registers as the executor's scope violation.

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
files, `nx run-many` repo-wide, then the unit's named test.

Two things the last two stages check that an exit code alone does not. `scope`
fails a unit that changed **no files**, because an empty diff is inside any
declared scope and would sail through every later stage. `tests` reads jest's
`Tests:` line and fails a criterion that exited 0 having run **no assertion** —
a `--testNamePattern` matching nothing skips every test and still exits 0. A
refactor declares `"kind": "characterization"` on its exit criterion instead,
and is then gated on the existing tests passing with no test file modified. Scoped and repo-wide
both run on purpose: a scope-filtered check cannot detect a signature change
that breaks a caller the unit never touched, because the evidence was filtered
out.

Measured warm on this repo: about **12s** for a change to a leaf package, **30s**
when a shared package like `types` rebuilds 23 of 32 projects, and **37s** for the
frontend, which pays an extra `frontend:typecheck`. `scoped` is most of that. The
repo-wide pass costs about **1.5s**, because `scoped` has just warmed the cache
and the two stages never both pay. A cold cache roughly triples the leaf case.

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
