## Step 6 — Run Analyses

Read each reference file for detailed search patterns, thresholds, and insight templates.

| Analysis | Reference File | Output focus |
|----------|----------------|--------------|
| File Template Consistency | `references/file-template-consistency.md` | Commands |
| CI/Local Workflow Parity | `references/ci-local-workflow-parity.md` | Commands |
| Role Taxonomy Drift | `references/role-taxonomy-drift.md` | Standards |
| Test Data Construction | `references/test-data-construction.md` | Standards |

### Output schema (internal; do not print as-is to user)
For every finding, keep an internal record:

```
INSIGHT:
title: ...
why_it_matters: ...
confidence: [high|medium|low]
evidence:
- path[:line-line]
where_it_doesnt_apply:
- path[:line-line]
```
