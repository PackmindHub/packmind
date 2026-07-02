# Report Template

The skill writes to `./audit-skill-context-<skill-name>.md` at project root. Use the template below verbatim. Omit any section whose data is empty, except the Header, Corpus inventory, and Summary — those are always present.

---

````markdown
# Skill Context Audit — <skill-name>

**Target**: `<path/to/skill>`
**Date**: <YYYY-MM-DD>
**Files analyzed**: <N>
**Context efficiency**: <X>/10 — <one-line justification>
**Always-loaded footprint**: SKILL.md ~<S> tokens (<L> lines) · description ~<D> tokens · eager refs ~<E> tokens · **total ~<T> tokens / trigger**
**Eager / lazy references**: <e> / <l>
**Frequency tier**: <rare | periodic | regular> (×<m>) — <reason>
**Preamble lag**: <P> lines before first imperative
**Inferred script language**: <node | python | bash>

## Corpus inventory

| File | Lines | ~Tokens | Role |
|---|---|---|---|
| SKILL.md | 89 | 1329 | entrypoint |
| references/patterns.md | 200 | 2200 | reference |
| scripts/preflight.js | 678 | 5450 | script (invoked, not loaded) |
| ... | ... | ... | ... |

## Summary

**Workflow patterns** (agent-judgment):

| Priority | P1 | P2 | P3 | P5 | P8 | P10 | P12 | Total |
|---|---|---|---|---|---|---|---|---|
| HIGH | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| MEDIUM | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| LOW | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

**Loading patterns** (script-emitted, agent-validated):

| Priority | P4 | P6 | P7 | P9 | P11 | P13 | P14 | P15 | Total |
|---|---|---|---|---|---|---|---|---|---|
| HIGH | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| MEDIUM | 0 | 0 | 0 | 1 | 0 | 0 | 1 | 0 | 2 |
| LOW | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Pattern legend: P1 deterministic ops · P2 complex workflow · P3 file edits · P4 large inline content · P5 read-then-grep chain · P6 verbose prose · P7 repeated boilerplate · P8 conditionals · P9 description bloat · P10 phase-gated content · P11 verbose tool prose · P12 meta prose · P13 cross-file duplication · P14 eager-load · P15 preamble lag.

## Findings — HIGH

### [HIGH] P1 — Deterministic ops → script

**Location**: `SKILL.md:L52-L104`
**Excerpt**: "Run `git rev-parse`, then `my-cli whoami`, then parse output and branch..."
**Issue**: Five sequential commands with output-parsing prose loaded on every trigger.
**Fix**: Extract to `scripts/preflight.js` returning `{version, user, context}`; SKILL.md calls it once.
**Est. tokens saved**: ~520

<!-- one entry per finding. Repeat the same shape for every HIGH finding. -->

## Findings — MEDIUM

<!-- Omit the entire section if zero MEDIUM findings. Otherwise, one entry per finding in the same shape. -->

## Findings — LOW

<!-- Omit the entire section if zero LOW findings. Otherwise, one entry per finding in the same shape. -->

## Top 3 wins

Tackle in this order for maximum context reduction:

1. **P4 at `SKILL.md:L197-L303`** — saves ~1,060 tokens / trigger by moving Examples 1–8 to `assets/examples.md`.
2. **P1 at `SKILL.md:L52-L104`** — preflight script collapses 5 sequential commands into one Read.
3. **P6 at `SKILL.md:L10-L22`** — move Context block to `references/context.md`.

## Unreferenced files

<!-- Omit this section if all files are referenced. Otherwise list with line counts. -->

These files exist in the folder but are never mentioned in SKILL.md. Review for dead weight:

- `references/old-notes.md` (84 lines)

## Broken references

<!-- Omit this section if no broken references. Otherwise list each with the citing location. -->

These references appear in SKILL.md but point to files that do not exist. Fix or remove:

- `references/missing.md` — cited at `SKILL.md:L145`
````

---

## Field rules

- **`<skill-name>`** — pull from `skillName` in preflight output.
- **`<path/to/skill>`** — `skillPath` from preflight, ending with a `/`.
- **`<YYYY-MM-DD>`** — current date in ISO format.
- **`<X>/10`** — final efficiency score per `references/patterns.md` → "Score formula appendix" (start from `efficiencyScore.raw`, then apply HIGH/MEDIUM adjustments, floor 1, round). Justification is one short clause naming the dominant penalty (e.g. "eager footprint dominates", "5 HIGH findings", "near-optimal").
- **`<S>/<L>/<D>/<E>/<T>`** — from `loadedFootprint`. `<T> = eagerTotal`.
- **`<e>/<l>`** — from `referenceUsage.eager` / `referenceUsage.lazy`.
- **`<rare|periodic|regular>` and `<m>`** — from `efficiencyScore.frequency.tier` and `.multiplier`. If you override the tier in Phase 4, state the override in the reason.
- **`<P>`** — from `skillMdMetrics.preambleLines`.
- **Priority section order** — always HIGH first, then MEDIUM, then LOW. Omit any section with zero findings.
- **Finding heading format** — `### [PRIORITY] P<N> — <short-pattern-name>` — exactly that shape.
- **Excerpt rule** — ≤20 words, verbatim from the quoted line range. No paraphrasing.
- **Fix rule** — one sentence. If the fix involves a script, include the inferred language (e.g. "a Node script", "a Bash one-liner").
- **Est. tokens saved rule** — for extraction patterns (P4/P6/P10), use `span.tokenEstimate` from the candidate. For collapse-into-script patterns (P1/P3/P5), estimate 0.6 × `span.tokenEstimate`. For description bloat (P9), the saving is the full `tokenEstimate` × number-of-sessions-per-day (use 1× as a per-session estimate). For P11, estimate 5 tokens × number of occurrences.
- **Do not include** — a preamble, an executive summary paragraph, or recommendations beyond the Top 3 wins section.
