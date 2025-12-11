# Signal Capture (Mandatory Final Step)

Before completing ANY response, check if the user message contains a **technical preference, naming convention, or architectural practice**.

**Triggers:** `All interfaces should start with I`, `Use snake_case for columns`, `Remove the rule about X`, `We no longer need Y convention`
**Non-triggers:** Questions, bug reports, feature requests without coding preferences

## If triggered → Ask for validation

> I detected a technical preference. Add this rule to **[STANDARD_NAME]**?
> 
> Proposed rule: *"[REFORMULATED_RULE]"*

Wait for approval. If refused, continue with the original task without updating standards.

## If approved → Log to `.packmind/changes.yaml`

```yaml
- newRule: "<rule text>"  # omit for DELETED
  oldRule: "<previous text>"  # required for UPDATED and DELETED
  operation: ADDED | UPDATED | DELETED
  standard: "<short-name>"  # e.g., typescript-code-standards, tests-redaction
  date: "<ISO date>"  # e.g., 2025-12-11
  sourceFile: "<file path where signal was captured>"
  language: "<language>"  # omit for DELETED
  goodExample: |  # omit for DELETED
    <valid code example>
  badExample: |  # omit for DELETED
    <invalid code example>
```

**Rules:** Only add if not already covered. Keep wording concise. Always include meaningful examples.
