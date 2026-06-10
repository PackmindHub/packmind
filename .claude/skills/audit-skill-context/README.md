# audit-skill-context

A meta-skill that audits another agent skill for context-inflation hotspots and writes a priority-ranked report with a 1–10 efficiency score.

## Purpose

Skills pay a context tax every time they trigger. SKILL.md, the description, and any eagerly-cited reference file get loaded into the conversation — whether the agent ends up needing them or not. This skill scans a target skill folder and surfaces where that footprint can be cut: bloated descriptions, oversized SKILL.md, eager loads that should be lazy, decision trees the agent has to evaluate every run, formulaic boilerplate, broken or unused references.

Output: `./audit-skill-context-<skill-name>.md` at project root.

## Philosophy

- **Detect, don't rewrite.** The audit produces findings; the skill author decides what to apply. Never edit the target.
- **Eager vs lazy is the central distinction.** What loads on every trigger is the budget that matters; lazy references are nearly free.
- **Frequency-weighted.** A skill that fires on every commit needs to be leaner than one that fires monthly. Penalties scale with how often the skill triggers.
- **Mechanical where possible, judgment where necessary.** A preflight script handles inventory, citation classification, and pattern detection that can be regex-matched. The agent applies semantic judgment for patterns scripts can't reliably catch (decision trees, meta prose, sequential commands).
- **Single-skill scope.** No cross-skill comparison, no audit history, no diffs against past audits. One skill, one report.

## Convictions

- **Most bloat lives in always-loaded surfaces.** SKILL.md and the description are where leverage is highest; reference files matter only if they're cited eagerly.
- **The score is qualitative, not measured.** It's an opinionated heuristic over file size, eager-load footprint, and finding counts — not a runtime token count. Don't mistake the number for a benchmark.
- **When in doubt, downgrade priority.** False positives cost more than missed low-value findings; they teach the user to ignore the report.
- **Specifics over generalities.** Every finding must point to a verbatim line range and excerpt. Speculative findings are dropped.
- **Reports inform, they don't enforce.** The skill author is the authority on their skill; this audit is one input.

## How it runs

1. Preflight (`scripts/preflight.js`) walks the folder, computes inventory and footprint, and pre-fires mechanical detectors.
2. The agent validates script-emitted candidates (drops false positives, confirms priority).
3. The agent applies judgment-only detectors against the corpus.
4. Findings are scored and ranked using the rubric in `references/patterns.md`.
5. The agent writes the report from `references/report-template.md`.

See `SKILL.md` for the full runtime contract and `references/scope.md` for explicit non-goals.
