# Triage Skills

Quickly scan all existing skills and determine which ones are relevant to the work done in this session. Also flag if any new skills should be created.

## What Skills Are

Skills are modular packages providing specialized knowledge and workflows. Each skill has:
- A **SKILL.md** with YAML frontmatter (`name`, `description`)
- Optional **references/**, **scripts/**, **assets/**

The `description` field determines when the skill auto-loads.

Skills are managed org-wide via the Packmind CLI and installed locally in `.claude/skills/<skill-name>/`.

## Instructions

### Step 1: List All Skills via CLI

Run `packmind skills list` to get the full catalog. The output provides slug, name, and description (auto-load trigger text) for each skill.

Do NOT read SKILL.md bodies or reference files at this stage.

### Step 2: Check Relevance (priority: keep skills current)

Keeping skills up to date is the PRIMARY goal of skill triage. For each skill in the list, answer one question: **Does the work done in this session overlap with this skill's domain?**

A skill is relevant if:
- The session involved the domain or technology this skill covers
- Domain knowledge was applied that this skill should provide
- An anti-pattern was hit that this skill should document
- The skill's auto-load description would have matched this session's work
- A pattern or API changed that the skill might document incorrectly

Be GENEROUS in flagging existing skills for review — it's cheap to check and expensive to let skills go stale.

Match by domain using the slug, name, and description — no deep content analysis.

### Step 3: Flag New Skill Ideas

From the conversation context, identify areas where:
- Specialized knowledge was needed that no existing skill covers
- A decision table or heuristic was used that a general model wouldn't know
- Reference material was wished for but not available
- The same context had to be re-established from scratch

## Output Format

Return exactly this format:

```markdown
## Skills Triage

### Relevant Existing Skills
- `<skill-name>`: <one-line reason why it's relevant>

(If none, write "No existing skills are relevant to this session.")

### New Skill Ideas
- <skill-name>: <one-line description of what it would cover>

(If none, write "No new skills needed.")
```
