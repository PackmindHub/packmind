# Create Skill Procedure

Write a new skill directory locally in an agent skills directory. Do NOT call any CLI commands — Phase 4 handles submission via `packmind-cli diff add`.

## Write Path Selection

The `diff add` command recognizes skill paths in these agent directories (defined in `CODING_AGENT_ARTEFACT_PATHS`):
- `.claude/skills/` (agent: claude)
- `.cursor/skills/` (agent: cursor)
- `.github/skills/` (agent: copilot)

**Selection logic**: check which directories exist at the project root. Pick the first one found in priority order:
1. `.claude/skills/`
2. `.cursor/skills/`
3. `.github/skills/`

If none exist, create `.claude/skills/` as the default.

**Write path**: `<agent-skills-dir>/<skill-name>/SKILL.md`

## Slug Derivation

Derive the skill name from the title: lowercase, replace spaces with hyphens, remove special characters.

**Example**: "PDF Processing" → `pdf-processing`

**Naming rules**:
- 1-64 characters
- Lowercase letters, numbers, and hyphens only
- Must not start or end with a hyphen
- Must not contain consecutive hyphens (`--`)
- Directory name MUST match the `name` field in SKILL.md frontmatter

## Directory Structure

```
<skill-name>/
├── SKILL.md          # Required
├── references/       # Optional — detailed docs, specs, lookup tables
├── scripts/          # Optional — executable code agents can run
└── assets/           # Optional — templates, images, data files
```

## SKILL.md Format

```markdown
---
name: skill-name
description: 'What the skill does and when to use it. Third-person form. Include trigger keywords for auto-load.'
---

# Skill Title

Body content with instructions, examples, and edge cases.
```

### Critical Format Constraints

- **Directory name must match `name` field** — e.g. directory `pdf-processing/` requires `name: pdf-processing`
- **`name`**: 1-64 chars, lowercase + hyphens only, no leading/trailing/consecutive hyphens
- **`description`**: 1-1024 chars, include specific keywords that help agents identify when to activate
- **Keep SKILL.md under 500 lines** — use `references/` for detailed content overflow
- **`diff add` accepts either** the directory path or the `SKILL.md` path (the handler normalizes to the directory)

### Description Writing Guidelines

The description determines when the skill auto-loads. Write it to:
- Describe what the skill does in third-person form
- Include trigger phrases the user might say (e.g. "extract text from PDF", "fill PDF forms")
- Mention relevant keywords for discoverability

**Good**: `'Extract text and tables from PDF files, fill PDF forms, and merge multiple PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction.'`

**Poor**: `'Helps with PDFs.'`

### Body Content Guidelines

- Provide step-by-step instructions for the main workflow
- Include examples of inputs and outputs
- Document common edge cases
- Structure content for progressive disclosure — keep the main flow in SKILL.md, move detailed references to `references/`

For the complete format specification, see [agent-skills-specification.md](agent-skills-specification.md).
