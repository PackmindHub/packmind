# Comparison: packmind-standard-create Skill vs MCP Standard Workflow

## Overview

This document compares the two standard creation workflows in Packmind:
- **Skill**: `.claude/skills/packmind-standard-create/SKILL.md`
- **MCP**: `apps/mcp-server/src/app/prompts/packmind-standard-workflow/`

## Comparison Table

| Feature | packmind-standard-create (Skill) | MCP Workflow | Status |
|---------|----------------------------------|--------------|--------|
| **SHARED FEATURES** |
| Rule writing guidelines (start with verb, be specific) | ✅ | ✅ | Implemented in both |
| User approval before submission | ✅ | ✅ | Implemented in both |
| Examples (positive/negative/language) | ✅ | ✅ | Implemented in both |
| Iterative refinement | ✅ | ✅ | Implemented in both |
| Standard name and description | ✅ | ✅ | Implemented in both |
| **IN SKILL ONLY** |
| CLI-based workflow | ✅ | ❌ | Skill only |
| Python scripts (init_playbook.py, validate_playbook.py) | ✅ | ❌ | Skill only |
| JSON playbook file format | ✅ | ❌ | Skill only |
| `scope` field | ✅ | ❌ | Skill only |
| Python 3 prerequisite check | ✅ | ❌ | Skill only |
| Separate validation step | ✅ | ❌ | Skill only |
| Step 6: Verify in UI | ✅ | ❌ | Skill only |
| Step 7: Iterate and improve guidance | ✅ | ❌ | Skill only |
| **IN MCP ONLY** |
| Check for similar standards (Step 1) | ❌ | ✅ | MCP only |
| Draft markdown file in `.packmind/standards/_drafts/` | ❌ | ✅ | MCP only |
| Two-phase iteration (rules first, then examples) | ❌ | ✅ | MCP only |
| TL;DR summary for review | ❌ | ✅ | MCP only |
| Repository access guardrail | ❌ | ✅ | MCP only |
| Advanced rule guidelines (~25 words, avoid rationale, split concerns) | ✅ | ✅ | Implemented in both |
| `summary` field (one-sentence) | ✅ (documented) | ✅ | Both (CLI doesn't support yet) |
| Clarification with 1-5 questions based on request clarity | ❌ | ✅ | MCP only |
| Package selection | ❌ | ✅ | MCP only |
| **NOT IMPLEMENTED YET** |
| CLI package selection during standard creation | ❌ | ❌ | Not implemented (no `packmind-cli standard create --packages` flag) |

## Key Differences

### Technical Implementation
- **Skill**: Uses CLI + Python scripts → creates JSON playbook file → runs `packmind-cli standard create`
- **MCP**: Direct MCP tool calls (`packmind_list_standards`, `packmind_save_standard`) with no CLI or Python scripts

### Workflow Structure
- **Skill**: Linear 7-step process (understand → gather rules → create playbook → review → CLI submit → verify → iterate)
- **MCP**: 4-step iterative workflow:
  1. Check for similar standards
  2. Clarification (1-5 questions)
  3. Draft & iterate (two phases: rules first, then examples)
  4. Finalization with package selection

### Standard Structure
- **Skill**: Includes `scope` field (required) and `summary` field (documented but not yet CLI-supported)
- **MCP**: Has optional `summary` field, no `scope` field

#### Understanding `scope` vs `summary`

| Field | Answers | Focus | Example |
|-------|---------|-------|---------|
| **scope** | WHERE | File patterns, tech stack, specific locations | `"TypeScript test files (*.spec.ts, *.test.ts)"` |
| **summary** | WHEN/WHY | Purpose, trigger condition, high-level intent | `"Apply when writing tests to ensure consistency"` |

**Key Difference:**
- `scope` = Technical filter (what files/technologies)
- `summary` = Semantic filter (what situation/purpose)

**Examples:**

**scope** (Technical applicability):
- `"TypeScript files (*.ts, *.tsx)"`
- `"Jest test files in /src/**/*.spec.ts"`
- `"React functional components using hooks"`
- `"Backend API controllers in /api/controllers/"`

**summary** (Conceptual purpose):
- `"Apply when writing unit tests to ensure consistency and maintainability"`
- `"Use when creating API endpoints to maintain security and error handling standards"`
- `"Apply when handling user data to comply with privacy regulations"`

The MCP workflow prefers `summary` for flexibility and human readability. The CLI currently requires `scope` for backwards compatibility but documents both fields.

### Prerequisites
- **Skill**: Requires Python 3 and Packmind CLI installation
- **MCP**: No external dependencies (works directly via MCP tools)

## Recommendations

**Key insight**: The skill uses CLI/Python workflow while MCP uses direct tool calls. Package selection exists in MCP but not in CLI, so the skill can't support it even if we wanted to add it.

To align these workflows, consider:
1. Port MCP improvements (similar standards check, two-phase iteration, advanced guidelines) to the skill
2. Add CLI support for package selection (`--packages` flag)
3. Decide on unified standard structure (`scope` vs `summary` field)
