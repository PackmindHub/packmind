# Create Command Procedure

Write a new command file locally at `.packmind/commands/<slug>.md`. Do NOT call any CLI commands — Phase 4 handles submission via `packmind-cli diff add`.

## Slug Derivation

Derive the slug from the command title: lowercase, replace spaces with hyphens, remove special characters.

**Example**: "Create API Endpoint" → `create-api-endpoint`

**Write path**: `.packmind/commands/<slug>.md`

**Directory check**: If `.packmind/commands/` does not exist, create it before writing the file.

## File Format

Use YAML frontmatter for the display name, followed by the command body:

```markdown
---
name: 'Command Display Name'
---

# Command Name

Summary paragraph describing what this command does.

## When to Use
- Scenario 1
- Scenario 2

## Context Validation Checkpoints
* [ ] Question 1?
* [ ] Question 2?

## Steps
### Step 1: Name
Description and instructions.

### Step 2: Name
Description and instructions.
```

### Critical Format Constraints

- **File must be non-empty** — the parser rejects empty files
- **Without frontmatter `name:`**, the display name is auto-derived from the filename (only the first character is capitalized, e.g. `create-api-endpoint` → "Create-api-endpoint")
- **Use frontmatter `name:`** to get proper Title Case display names (e.g. "Create API Endpoint")
- The command body content is stored as-is — the parser is permissive about structure

## Command Writing Guidelines

- **Summary**: one paragraph explaining the command's purpose
- **When to Use**: 2-4 bullet points describing trigger scenarios
- **Context Validation Checkpoints**: questions the agent should verify before executing (use `* [ ]` checkboxes)
- **Steps**: numbered subsections with clear, actionable instructions
- Keep steps sequential and each step focused on one action
- Include expected outputs or verification checks where relevant
