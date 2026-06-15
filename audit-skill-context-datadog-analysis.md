# Skill Context Audit — datadog-analysis

**Target**: `.claude/skills/datadog-analysis/`
**Date**: 2026-04-28
**Files analyzed**: 2
**Context efficiency**: 9/10 — one phase-gated template block dominates the eager footprint
**Always-loaded footprint**: SKILL.md ~2623 tokens (214 lines) · description ~157 tokens · eager refs ~0 tokens · **total ~2780 tokens / trigger**
**Eager / lazy references**: 0 / 1
**Frequency tier**: periodic (×0.75) — description signals audit/review/report cadence; matches actual usage as a weekly-ish error triage
**Preamble lag**: 3 lines before first imperative
**Inferred script language**: node

## Corpus inventory

| File                      | Lines | ~Tokens | Role             |
| ------------------------- | ----- | ------- | ---------------- |
| SKILL.md                  | 214   | 2623    | entrypoint       |
| references/datadog_mcp.md | 159   | 1738    | reference (lazy) |

## Summary

**Workflow patterns** (agent-judgment):

| Priority | P1  | P2  | P3  | P5  | P8  | P10 | P12 | Total |
| -------- | --- | --- | --- | --- | --- | --- | --- | ----- |
| HIGH     | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0     |
| MEDIUM   | 0   | 0   | 0   | 0   | 0   | 1   | 0   | 1     |
| LOW      | 0   | 0   | 0   | 0   | 0   | 0   | 1   | 1     |

**Loading patterns** (script-emitted, agent-validated):

| Priority | P4  | P6  | P7  | P9  | P11 | P13 | P14 | P15 | Total |
| -------- | --- | --- | --- | --- | --- | --- | --- | --- | ----- |
| HIGH     | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0     |
| MEDIUM   | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0     |
| LOW      | 0   | 0   | 0   | 1   | 0   | 0   | 0   | 0   | 1     |

Pattern legend: P1 deterministic ops · P2 complex workflow · P3 file edits · P4 large inline content · P5 read-then-grep chain · P6 verbose prose · P7 repeated boilerplate · P8 conditionals · P9 description bloat · P10 phase-gated content · P11 verbose tool prose · P12 meta prose · P13 cross-file duplication · P14 eager-load · P15 preamble lag.

## Findings — MEDIUM

### [MEDIUM] P10 — Phase-gated content kept inline

**Location**: `SKILL.md:L98-L192`
**Excerpt**: "Write the report to `datadog_{YYYY_MM_DD}.md` at the project root, where the date is today's date."
**Issue**: ~90 lines of report template, ordering rubric, occurrence labels, and summary-table scaffold load on every trigger but are only consumed at the final output step.
**Fix**: Move the template + ordering + labels + summary block to `references/report-template.md`; replace Phase 4 in SKILL.md with a one-line "read `references/report-template.md` then write the report".
**Est. tokens saved**: ~1100

## Findings — LOW

### [LOW] P9 — Bloated frontmatter description

**Location**: `SKILL.md:frontmatter`
**Excerpt**: "This skill should be used when investigating production errors … Also triggers when the user mentions Datadog … Also triggers on references to specific Datadog service names…"
**Issue**: 86 words with 4 redundant trigger restatements ("This skill should be used when…", "Also triggers when…", "Also triggers on references…") — each session pays for the duplication.
**Fix**: Collapse to one sentence stating what the skill does plus a single trigger clause naming the user phrases (Datadog, prod errors, service names api/mcp/frontend-proprietary).
**Est. tokens saved**: ~80

### [LOW] P12 — Self-referential / meta prose

**Location**: `SKILL.md:L8`
**Excerpt**: "Analyze production error logs from Packmind Datadog services, group them into patterns, cross-reference stack traces with the codebase, and produce a structured markdown report…"
**Issue**: Lead paragraph restates the description verbatim in different words; the description has already triggered the skill so this re-introduction adds no signal.
**Fix**: Delete line 8 and start directly with the "## Prerequisites" or "## Services" heading.
**Est. tokens saved**: ~55

## Top 3 wins

Tackle in this order for maximum context reduction:

1. **P10 at `SKILL.md:L98-L192`** — saves ~1100 tokens / trigger by moving the report template, ordering rubric, occurrence labels, and summary-table scaffold to `references/report-template.md`.
2. **P9 at `SKILL.md:frontmatter`** — tighten the 86-word description (4 redundant trigger phrases) to one sentence + one trigger clause; saves ~80 tokens per session.
3. **P12 at `SKILL.md:L8`** — drop the meta lead paragraph that restates the description; saves ~55 tokens per trigger.
