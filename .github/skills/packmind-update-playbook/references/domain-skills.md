# Skills Domain Analysis

Scan existing skills, identify which are relevant to the session, then perform deep analysis on those in one pass.

## What Skills Are

Skills are modular packages providing specialized knowledge and workflows. Each skill has a \`SKILL.md\` with YAML frontmatter (\`name\`, \`description\`) and markdown body, plus optional \`references/\`, \`scripts/\`, and \`assets/\`. The \`description\` field determines when the skill auto-loads. Skills live in \`.claude/skills/<skill-name>/\`.

## Instructions

### Step 1: List Skills

Run \`packmind-cli skills list\` to get slugs, names, and descriptions. Do NOT read SKILL.md bodies or reference files yet.

### Step 2: Filter Relevant Skills

For each skill in the list, ask: **Does the work done in this session overlap with this skill's domain?**

Relevant means: the session involved the domain or technology this skill covers, domain knowledge was applied that this skill should provide, an anti-pattern was hit that this skill should document, or a pattern/API changed that the skill might document incorrectly.

Be GENEROUS in flagging existing skills for review — it's cheap to check and expensive to let skills go stale.

Also identify **new skill ideas** from context. A new skill is warranted if:
- Specialized knowledge was needed that no existing skill covers
- A decision table or heuristic was used that a general model wouldn't know
- The same context had to be re-established from scratch

### Step 3: Deep Analyze Flagged Skills

For each relevant skill, read the full \`SKILL.md\` and note its reference files. Keeping skills accurate is critical — stale skills actively mislead agents. Evaluate:
- Do decision tables or patterns still reflect what was done in the session?
- Does the skill reference APIs, paths, patterns, or versions that changed? (update immediately)
- Was domain knowledge needed that the skill doesn't provide? (add content or reference)
- Were anti-patterns hit that aren't documented?
- Was the skill auto-loaded when it should have been? (description may need tuning)

Flag even small inaccuracies — a skill that gives wrong guidance is worse than no skill.

For each new skill idea, verify:
- This is knowledge a general model genuinely lacks
- It will be needed in future sessions (not a one-off)
- SKILL.md would stay under 5k words (plan references for overflow)

## Output Format

\`\`\`markdown
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
\`\`\`
