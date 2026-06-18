---
name: 'audit-skill-context'
description: 'Audit a single agent skill folder for context-inflation hotspots (eager vs lazy loads, decision-tree bloat, redundant prose) and produce a priority-ranked report with a 1–10 efficiency score. Triggers on phrases like "audit skill context", "optimize this skill", "reduce skill context", "skill efficiency review", or "check if this skill is bloated".'
---

# Audit Skill Context

Detect context-inflation patterns in one target skill folder and produce a priority-ranked markdown report at project root. The skill detects only — it does not rewrite the target.

## Input

One argument: path to the target skill folder, e.g. `.claude/skills/<skill-name>/`. If absent, ask the user.

## Phase 1 — Run the preflight

Run the bundled preflight to collect inventory, classify citations (eager vs lazy), pre-fire mechanical detectors, and compute a preliminary efficiency score:

```
node .claude/skills/audit-skill-context/scripts/preflight.js <path>
```

Parse the JSON. Key fields you will use:

- `skillName`, `skillPath`, `inferredScriptLanguage`, `fileCount` — header data.
- `inventory` — `[{path, lines, chars, tokenEstimate, role, binary}]`.
- `description` — `{text, wordCount, tokenEstimate, redundantPhraseCount}`.
- `skillMdMetrics`, `loadedFootprint`, `referenceUsage` — header metrics for the report.
- `citations`, `unreferenced`, `broken` — for the report's tail sections (broken citations are already filtered for double-quoted false positives).
- `candidates` — script-emitted findings for P4, P6, P7, P9, P11, P13, P14, P15. Each has `pattern`, `location`, `span`, `excerpt`, `confidence`, plus pattern-specific fields.
- `efficiencyScore` — `{preliminary, raw, breakdown, frequency}`. The frequency tier is heuristic; you may override it.

If the script exits non-zero, surface the error and stop.

## Phase 2 — Validate script-emitted candidates

Walk `candidates[]`. For each, decide keep / drop / re-prioritize:

- **Drop** when the match is a false positive (e.g. P14 fires on a JSON-shape description; P7 fires on incidental separator lines). The validation guidance in `references/patterns.md` lists drop conditions per pattern.
- **Keep** when the match is real. Confirm the priority using the rubric in Phase 4.
- **Read `references/patterns.md` only when uncertain** about a specific pattern — it is not loaded by default.

## Phase 3 — Apply judgment-only detectors

The script cannot semantic-match these; you must scan the corpus yourself. Apply on SKILL.md and any reference file you have already read:

- **P1** — sequential parameter-free commands the agent runs in order.
- **P2** — decision trees with 3+ branches in prose.
- **P3** — formulaic multi-file edits with cross-file consistency.
- **P5** — read → grep → read chains the agent cannot parallelize.
- **P8** — `if version / if file exists / if count` conditionals a script could resolve.
- **P10** — phase-gated content blocks ≥30 lines.
- **P12** — self-referential / meta prose ("This skill detects…", scope enumerations).

For each finding emit: `pattern_id`, `location` (`path:L<start>-L<end>`), `excerpt` (≤20 verbatim words), `issue` (one sentence), `proposed_fix` (one sentence; mention `inferredScriptLanguage` if a script is recommended), `priority`, `est_tokens_saved`.

Read `references/patterns.md` for the exact signal/fix wording when needed.

## Phase 4 — Score and rank

Priority rubric (per finding):

- **HIGH** — block ≥100 lines and lives in SKILL.md (loaded every trigger), OR a >3-way decision tree the agent must evaluate, OR a 4+-step deterministic operation, OR description >150 words.
- **MEDIUM** — block 40–100 lines in SKILL.md, OR ≥3 repetitions of the same boilerplate, OR a 2–3 step read-then-grep chain, OR description 100–150 words.
- **LOW** — prose trims under 40 lines, isolated rationale, or edge-path branches the agent rarely evaluates.

When in doubt, downgrade.

**Compute the final efficiency score** using the formula in `references/patterns.md` → "Score formula appendix". If the script's frequency tier looks wrong (e.g. a "create" skill that actually fires every commit), override it and recompute the eager-footprint penalty per the same appendix.

## Phase 5 — Write report

Read `references/report-template.md` and follow it verbatim. Write to `./audit-skill-context-<skillName>.md` at project root. Overwrite if present. The template is the single source of truth for the section list, ordering, and omit rules.

If you need to know what this skill explicitly does NOT do, see `references/scope.md` (authoring-time reference, not loaded at runtime).
