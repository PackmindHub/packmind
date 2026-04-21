# Create Skill Procedure

Write a new skill directory locally in an agent skills directory.

## Write Path Selection

Skills are stored in agent-specific directories:
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

**When to use each resource type:**
- **scripts/**: Executable code for tasks requiring deterministic reliability or repeatedly rewritten code (e.g. `scripts/rotate_pdf.py`). Token-efficient — may be executed without loading into context.
- **references/**: Documentation loaded into context as needed (schemas, API docs, domain knowledge). Keeps SKILL.md lean — avoid duplicating content between SKILL.md and references.
- **assets/**: Files used in output (templates, images, boilerplate) — not loaded into context, copied or modified by Claude during execution.

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
- **Both the directory path and the `SKILL.md` path** are valid references to a skill (they resolve to the same directory)

### Description Writing Guidelines

The description determines when the skill auto-loads. Write it to:
- Describe what the skill does in **third-person form** (e.g. "This skill should be used when..." not "Use this skill when...")
- Include trigger phrases the user might say (e.g. "extract text from PDF", "fill PDF forms")
- Mention relevant keywords for discoverability

**Good**: `'Extract text and tables from PDF files, fill PDF forms, and merge multiple PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction.'`

**Poor**: `'Helps with PDFs.'`

### Writing Style

- Use **imperative/infinitive form** (verb-first instructions), not second person (e.g. "To accomplish X, do Y" not "You should do X")
- Write for another Claude instance — focus on non-obvious procedural knowledge, not general capabilities
- **File placement rule**: create files directly in their target subdirectory (`references/`, `scripts/`, `assets/`), never at skill root then move

### Body Content Guidelines

- Provide step-by-step instructions for the main workflow
- Include examples of inputs and outputs
- Document common edge cases
- **Progressive disclosure**: metadata (~100 words, always in context) → SKILL.md body (<5k words, loaded on trigger) → bundled resources (loaded as needed). Structure content accordingly.
- **No duplication**: information should live in either SKILL.md or references, not both. Keep SKILL.md lean with essential workflow guidance; move detailed schemas, specs, and examples to `references/`.
- **Large references**: if reference files exceed ~10k words, include grep search patterns in SKILL.md so Claude can locate relevant sections without loading the entire file

For the complete format specification, see [agent-skills-specification.md](agent-skills-specification.md).
