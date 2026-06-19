# Scope

Boundary notes for `audit-skill-context`. Not loaded at runtime — kept for skill authors deciding whether this skill matches their need.

## What this skill does NOT do

- Rewrite or edit the target skill. The audit produces a report; the user decides what to apply.
- Compare multiple skills against each other. Run the audit per skill.
- Generate the scripts it recommends (e.g. extracting a P1 finding into `scripts/release.js`). The report identifies where a script would help; authoring it is a separate task.
- Run benchmarks or measure runtime token cost. The `Context efficiency` score is qualitative — based on file size, eager-load footprint, and finding counts — not a measured live token count.
- Track audit history or diff against prior audits.
- Detect cross-skill duplication (audit is single-skill scoped).
