# Skills Domain Analysis

Scan existing skills, identify which are relevant to the user's validated intent, then perform deep analysis on those in one pass.

## What Skills Are

Skills are modular packages providing specialized knowledge and workflows. Each skill has a `SKILL.md` with YAML frontmatter (`name`, `description`) and markdown body, plus optional `references/`, `scripts/`, and `assets/`. The `description` field determines when the skill auto-loads. Skills live in a platform-specific agent directory, at the project root or in any subdirectory (e.g. `src/backend/.cursor/skills/`):
- Claude Code: `**/.claude/skills/<skill-name>/`
- Cursor: `**/.cursor/skills/<skill-name>/`
- GitHub Copilot: `**/.github/skills/<skill-name>/`
Search recursively for these directories. If multiple agent directories exist, pick one.

For the complete format specification (frontmatter fields, naming rules, directory structure, progressive disclosure), see [agent-skills-specification.md](agent-skills-specification.md).

## Instructions

### Step 1: List Skills

Run `packmind-cli skills list` to get slugs, names, and descriptions. Do NOT read SKILL.md bodies or reference files yet.

### Step 2: Filter Relevant Skills

For each skill in the list, ask: **Does the user's intent relate to this skill?**

Relevant means: the intent explicitly targets this skill, describes changes to its domain or behavior, or highlights issues with its current content.

Be GENEROUS in flagging existing skills for review — it's cheap to check and expensive to let skills go stale.

Also identify **new skill ideas** if the user's intent suggests creating one. A new skill is warranted if:
- The intent describes specialized knowledge that no existing skill covers
- A decision table or heuristic is needed that a general model wouldn't know
- The user explicitly requests a new skill for a specific domain

### Step 3: Deep Analyze Flagged Skills

For each relevant skill, read the full `SKILL.md` and note its reference files. Keeping skills accurate is critical — stale skills actively mislead agents. Evaluate against the user's intent:
- Does the intent request changes to decision tables, patterns, or workflows?
- Does the intent highlight APIs, paths, patterns, or versions that changed? (update immediately)
- Does the intent describe domain knowledge the skill should provide but doesn't? (add content or reference)
- Does the intent flag anti-patterns that aren't documented?
- Does the intent suggest the skill's auto-load triggers need adjustment? (description may need tuning)
- If conversation context exists, use it as supporting evidence for the evaluation

Flag even small inaccuracies — a skill that gives wrong guidance is worse than no skill.

For each new skill idea, verify:
- This fits at least one skill archetype: team-specific conventions/domain logic not in public docs, a multi-step workflow with project-specific tools or paths, or a curated bundle of resources/knowledge that provides task-relevant context to agents
- It will be needed in future sessions (not a one-off)
- SKILL.md would stay under 5k words (plan references for overflow)

For each new skill that passes validation, follow the procedure in [create-skill-procedure.md](create-skill-procedure.md) to write the skill directory.

## Output Format

```markdown
## Skills Change Report

### New Skills
(If none: "No new skills needed.")

#### skill-name
- **Reason**: why this skill is needed
- **Auto-load triggers**: when it should activate
- **Key contents**: decision tables, anti-patterns, references needed

### Skill Updates
(If none: "No updates needed.")

#### skill-name
- **Reason**: what changed or what's missing
- **SKILL.md changes**: sections to add/modify/remove
- **Reference file changes**: files to add/update/remove
- **Description update**: new description if auto-load triggers need adjustment

### Skills to Deprecate
(If none: "No deprecations needed.")

#### skill-name
- **Reason**: why no longer relevant
```
