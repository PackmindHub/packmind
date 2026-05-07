# Create Command Procedure

Write a new command file locally at `.packmind/commands/<slug>.md`.

## Slug Derivation

Derive the slug from the command title: lowercase, replace spaces with hyphens, remove special characters.

**Example**: "Create API Endpoint" → `create-api-endpoint`

**Write path**: `.packmind/commands/<slug>.md`

**Directory check**: If `.packmind/commands/` does not exist, create it before writing the file.

## File Format

Use YAML frontmatter with a `description:` field, followed by the command body:

```markdown
---
description: 'One-sentence description of the command purpose and when to use it.'
---

Opening paragraph describing what this command does and its scope.

## When to Use

* When scenario 1

* When scenario 2

## Context Validation Checkpoints

* [ ] What is the key input or configuration needed?

* [ ] Does the target directory or file already exist?

* [ ] Are there any prerequisites that must be met?

* [ ] Is the current state clean enough to proceed?

## Steps

### Step 1: Verify prerequisites

Explanatory text describing what this step does and why.

\`\`\`language
// code example showing exactly what to do
\`\`\`

### Step 2: Create core implementation

Explanatory text describing what this step does and why.

\`\`\`language
// code example showing exactly what to do
\`\`\`
```

### Critical Format Constraints

- **File must be non-empty** — the parser rejects empty files
- **Without frontmatter**, the display name is auto-derived from the filename (only the first character is capitalized, e.g. `create-api-endpoint` → "Create-api-endpoint")
- **Use frontmatter `description:`** to provide a one-sentence summary of the command's purpose and when to use it
- The command body content is stored as-is — the parser is permissive about structure

## Command Writing Guidelines

### Body Structure

1. **Opening paragraph** (required) — one paragraph directly after frontmatter, no `# H1` heading. Describes what the command does and its scope.
2. **"When to Use"** section (optional for procedural commands) — 2-6 bullet points using the "When..." pattern (e.g., `* When adding support for a new AI coding assistant`).
3. **"Context Validation Checkpoints"** section (optional for procedural commands) — 4-6 `* [ ]` checkbox questions the agent should verify before executing.
4. **"Steps"** section (required) — the core of the command.

### Step Writing

- Use `### Step N: Verb Object` format (e.g., `### Step 1: Add RenderMode enum value`, `### Step 5: Register deployer in registry`)
- Always start the step title with a verb: Add, Create, Implement, Write, Register, Update, Verify, Export
- Target 6-16 steps for complex commands
- Every step includes explanatory text followed by a code example showing exactly what to do
- End with a verification or quality gate step when applicable (e.g., "Verify link paths", "Run integration tests")

### Template Variables

- Use `{{variable}}` syntax for user-provided values (e.g., `{{version}}`, `{{today_date}}`)
- Use sparingly — only for values that change per invocation

### Cross-References

- Reference existing files and patterns as concrete examples to follow
- Use actual file paths from the codebase (e.g., `packages/types/src/deployments/RenderMode.ts`)
- Point to existing implementations as models (e.g., "Follow the pattern of existing integration tests like `cursor-deployment.spec.ts`")

### Variant: Procedural Commands

Simpler structure for release-style or operational commands:
- Skip "When to Use" and "Context Validation Checkpoints" sections
- Use numbered list steps (`1. **Step name**: description`) instead of `###` headers
- Include code blocks inline within list items where needed
- See `release-app.md` as an example of this pattern
