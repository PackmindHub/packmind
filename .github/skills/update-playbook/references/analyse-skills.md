# Analyse Skills (Deep)

Perform a detailed analysis of the pre-filtered skills listed in the "Relevant Artifacts" section above. Determine exactly what needs to change.

## What Skills Are

Skills are modular packages providing specialized knowledge and workflows. Each skill has:
- A **SKILL.md** with YAML frontmatter (`name`, `description`) and markdown body
- Optional **references/** — documentation loaded into context as needed
- Optional **scripts/** — executable code for deterministic tasks
- Optional **assets/** — files used in output

Skills live in `.claude/skills/<skill-name>/`.

## Instructions

### Step 1: Read Flagged Skills

For each skill listed in the "Relevant Artifacts" section, read the full SKILL.md and list its reference files. Note:
- Decision tables present
- Anti-pattern checklists present
- Reference files and their topics
- Auto-load description text

### Step 2: Compare Content Against Context (priority: accuracy)

Keeping skills accurate is critical — stale skills actively mislead agents. For each flagged skill:
- Were decision tables used and still accurate? (up to date)
- Does the skill reference APIs, paths, patterns, or versions that changed in this session? (update immediately)
- Was domain knowledge needed that the skill doesn't provide? (add content or reference)
- Were anti-patterns hit that aren't documented? (add to checklist)
- Was the skill auto-loaded when it should have been? (description may need tuning)
- Is any reference file outdated or missing?

Flag even small inaccuracies — a skill that gives wrong guidance is worse than no skill.

### Step 3: Evaluate New Skill Ideas

For each new skill idea from triage:
- Outline key sections (decision tables, anti-patterns, references)
- Draft the auto-load description
- Verify this is knowledge a general model genuinely lacks
- Verify it will be needed in future sessions
- Verify SKILL.md would stay under 5k words (plan references for overflow)

### Step 4: Viability Check

For each proposed change, verify:
- Does the skill follow progressive disclosure? (metadata → SKILL.md → references)
- Is the auto-load description specific enough to avoid false positives?
- Is information in the right place? (SKILL.md for core, references for detail)

## Output Format

```markdown
## Skills Analysis Report

### New Skills Proposed

#### skill-name
- **Reason**: Why this skill is needed
- **Auto-load triggers**: When it should activate
- **Key contents**:
  - Decision tables or heuristics
  - Anti-patterns to document
  - Reference files needed
- **Bundled resources**:
  - `references/`: files and purpose
  - `scripts/`: executables (if any)
  - `assets/`: output files (if any)

(If none, write "No new skills needed.")

### Updates to Existing Skills

#### skill-name
- **Reason**: What changed or what's missing
- **SKILL.md changes**:
  - Sections to add/modify/remove
- **Reference file changes**:
  - Files to add: `references/filename.md` — purpose
  - Files to update: `references/filename.md` — what to change
  - Files to remove: `references/filename.md` — reason
- **Description update**: New description if triggers need adjustment

(If none, write "No updates needed.")

### Skills to Deprecate

#### skill-name
- **Reason**: Why this skill is no longer relevant

(If none, write "No deprecations needed.")
```
