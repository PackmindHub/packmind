# Signal Capture (Mandatory Final Step)

Before completing ANY response, check if the user message contains a **technical preference, naming convention, or architectural practice**.

**Triggers (user prescribes HOW to code):**
- Naming conventions: `All interfaces should start with I`, `Use snake_case for columns`
- Code structure directives: `Wrap emojis for accessibility`, `Always use async/await`, `Don't use class components`
- Pattern enforcement: `Use composition over inheritance`, `Prefer functional programming`
- Principle references in tasks: `follow KISS`, `apply DRY principle`, `respect SOLID`, `use React best practices`, `follow clean code`, `apply separation of concerns` (requires clarification step)
- Removal/updates: `Remove the rule about X`, `We no longer need Y convention`
- Formatting rules: `Always add JSDoc comments`, `Use single quotes`

**Non-triggers (user asks WHAT to build or fix):**
- Feature requests without principles: `Add a search feature`, `Create a new component`
- Bug reports: `This function is broken`, `Fix the error on line 10`
- Questions: `How does this work?`, `What's the best approach?`
- Implementation tasks without standards: `Implement the login page`, `Add error handling`

⚠️ **EXCEPTION:** If any of the above includes principle references (KISS, DRY, SOLID, best practices), it BECOMES a trigger. Ask for specific rules before proceeding.

## If triggered → Ask for validation

> I detected a technical preference. Add this rule to **[STANDARD_NAME]**?
> 
> Proposed rule: *"[REFORMULATED_RULE]"*

Wait for approval. If refused, continue with the original task without updating standards.

**For abstract principles (KISS, DRY, SOLID, best practices):** Ask the user to specify concrete rules before capturing. Example: "I noticed you mentioned [PRINCIPLE]. To capture this as a standard, could you specify concrete rules? For example: [suggest 2-3 rules]. Which rules would you like to add, or type 'skip' to continue without capturing."

**Language Independence:** Signal detection works regardless of input language. Common principle names (KISS, DRY, SOLID) are universal. Recognize localized terms like FR: "bonnes pratiques", ES: "buenas prácticas".

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
