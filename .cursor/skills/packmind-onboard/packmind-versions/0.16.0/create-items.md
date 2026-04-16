## Draft Format (CLI 0.16.0)

### Standard Draft Format

For each Standard insight, create a Markdown file at `.packmind/standards/_drafts/<slug>.draft.md`:

```markdown
# Standard Name

What the standard covers and why.

## Scope

Where this standard applies (e.g., 'TypeScript files', 'React components').

## Rules

### Rule starting with action verb

Another rule can follow...

## Examples

### Good

```typescript
// Valid code example
```

### Bad

```typescript
// Invalid code example
```
```

### Command Draft Format

For each Command insight, create a Markdown file at `.packmind/commands/_drafts/<slug>.draft.md`:

```markdown
# Command Name

What the command does, why it's useful, and when it's relevant.

## When to Use

- Scenario when this command applies
- Another scenario...

## Checkpoints

- Question to validate before proceeding?

## Steps

### 1. Step Name

What this step does and how to implement it.

```typescript
// Optional code example
```

### 2. Another Step

Description of next step...
```

---

## Create Items (CLI 0.16.0)

### If user selected "Create all now"

**IMPORTANT:** The CLI only accepts JSON playbook files, not markdown. Before calling the CLI, convert each `.draft.md` file to a `.json` file.

#### Standard JSON Schema

Convert the markdown draft to this JSON format:

```json
{
  "name": "Standard name (from # heading)",
  "description": "What the standard covers (from intro paragraph)",
  "scope": "Where it applies (from ## Scope section)",
  "rules": [
    {
      "content": "Rule starting with action verb (from ### Rule headings under ## Rules)",
      "examples": {
        "positive": "Valid code example (from ### Good section)",
        "negative": "Invalid code example (from ### Bad section)",
        "language": "TYPESCRIPT"
      }
    }
  ]
}
```

#### Command JSON Schema

Convert the markdown draft to this JSON format:

```json
{
  "name": "Command name (from # heading)",
  "summary": "What it does and when (from intro paragraph)",
  "whenToUse": ["Scenario 1", "Scenario 2 (from ## When to Use bullets)"],
  "contextValidationCheckpoints": ["Question 1? (from ## Checkpoints bullets)"],
  "steps": [
    {
      "name": "Step name (from ### N. Step Name)",
      "description": "Step description (from step content)",
      "codeSnippet": "Optional code fence content"
    }
  ]
}
```

#### Conversion and Creation Process

**For each standard draft:**

1. Read the `.draft.md` file
2. Convert to JSON matching the schema above
3. Write the JSON to `.packmind/standards/_drafts/<slug>.json`
4. Run CLI command to create:
```bash
packmind-cli standards create .packmind/standards/_drafts/<slug>.json
```
5. If creation succeeded, add to package:
```bash
packmind-cli packages add --to <package-slug> --standard <slug>
```
6. Track result (success/failure)

**For each command draft:**

1. Read the `.draft.md` file
2. Convert to JSON matching the schema above
3. Write the JSON to `.packmind/commands/_drafts/<slug>.json`
4. Run CLI command to create:
```bash
packmind-cli commands create .packmind/commands/_drafts/<slug>.json
```
5. If creation succeeded, add to package:
```bash
packmind-cli packages add --to <package-slug> --command <slug>
```
6. Track result (success/failure)

**Show progress:**
```
Sending standards and commands to your Packmind organization...
✓ error-handling-pattern
✓ naming-conventions
✗ test-factory-patterns (error: duplicate name exists)
✓ run-full-test-suite

Done: 3 created, 1 failed
```

### If user selected "Let me review drafts first"

Print:
```
Draft files ready for review at:
  - .packmind/standards/_drafts/
  - .packmind/commands/_drafts/

Edit them as needed, then re-run this skill to continue.
```

Exit the skill.

### If user selected "Cancel"

Print:
```
Onboarding cancelled.
Draft files remain at .packmind/*/_drafts/ if you want to review them later.
```

Exit the skill.

---

### 9.1 Deploy Locally (after successful creation)

Since the onboard skill is present, the user has configured an AI agent. Deploy the created artifacts locally using the package selected/created in Step 2:

```bash
packmind-cli install <package-slug>
```

This deploys to agent-specific folders:

| Agent | Standards | Commands |
|-------|-----------|----------|
| Claude | `.claude/rules/packmind/standard-[slug].md` | `.claude/commands/packmind/[slug].md` |
| Cursor | `.cursor/rules/packmind/standard-[slug].mdc` | `.cursor/commands/packmind/[slug].mdc` |
| Copilot | `.github/instructions/packmind-standard-[slug].instructions.md` | `.github/prompts/packmind-[slug].prompt.md` |

### 9.2 Cleanup and Summary

Delete the draft files, then print final summary:

```
============================================================
  PUBLISHED & DEPLOYED
============================================================

Standards and commands have been sent to your Packmind organization
and deployed to your AI coding assistant's configuration files.

Standards: [N]
  - [Name] (slug: [slug])
    → .packmind/standards/[slug].md
    → [agent-specific path]

Commands: [M]
  - [Name] (slug: [slug])
    → .packmind/commands/[slug].md
    → [agent-specific path]

Draft files cleaned up.
============================================================
```

**If user declines (N):**

Print:

```
Draft files ready for review at:
  - .packmind/standards/_drafts/
  - .packmind/commands/_drafts/

Edit them as needed, then re-run this skill to create them.
```
