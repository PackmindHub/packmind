# Standards Domain Analysis

Scan existing standards, identify which are relevant to the user's validated intent, then perform deep analysis on those in one pass.

## What Standards Are

Standards are coding conventions distributed to AI coding agents. Each standard has a name (with `[TAG]` prefix), description, rules (imperative, ~25 words max each), and scope (file glob). Source files live in `**/.packmind/standards/<slug>.md`. Installed copies also exist in agent directories:
- Claude Code: `**/.claude/rules/packmind/`
- Cursor: `**/.cursor/rules/packmind/`
- GitHub Copilot: `**/.github/instructions/packmind-*`
Search the project root and all subdirectories.

## Instructions

### Step 1: List Standards

Run `packmind-cli standards list` to get slugs, names, and descriptions. Do NOT read individual standard files yet.

### Step 2: Filter Relevant Standards

For each standard in the list, ask: **Does the user's stated intent relate to the domain this standard covers?**

Relevant means: the intent targets this standard directly, involves changes to files matching the standard's scope, or describes modifications that could add, change, or invalidate a rule. Match by topic using slug, name, and description — no deep reading yet.

Also identify **new standard ideas** if the user's intent suggests capturing a new convention. A new standard must meet ALL of:
- **Lintable**: mechanically verifiable by reading code (not subjective judgment)
- **Recurring**: pattern applies broadly or is a hard constraint (not a one-off)
- **Uncovered**: no existing standard already addresses it

Skip general best practices any competent developer already knows.

### Step 3: Deep Analyze Flagged Standards

For each relevant existing standard, read `**/.packmind/standards/<slug>.md` and evaluate every rule against the user's intent:
- Rule aligns with the requested change → apply the modification
- Rule conflicts with the intent → update or remove as requested
- Intent describes a pattern this standard should cover but doesn't → gap, propose adding a rule
- If conversation context exists, use it as supporting evidence for the evaluation

For each new standard idea, draft concrete rules and apply the lintability gate:
- **Mechanically verifiable**: can an agent check compliance by reading code?
- **Clear scope**: does it have a file glob where it applies?
- **Actionable**: does it say exactly what to do (not "prefer X" or "consider Y")?
- **Non-obvious**: would a senior developer NOT already do this without the rule?

Prefer fewer, sharper rules. When in doubt, leave it out.

## Output Format

```markdown
## Standards Change Report

### New Standards
(If none: "No new standards needed.")

#### [TAG] Standard Name
- **Scope**: `file/glob/pattern`
- **Reason**: why this pattern warrants a standard
- **Rules**:
  - Rule in imperative form (~25 words max)

### Standard Updates
(If none: "No updates needed.")

#### [TAG] Standard Name (`<slug>`)
- **Reason**: what changed or what's missing
- **Rules to add**: new rule text
- **Rules to modify**: "old text" → "new text"
- **Rules to remove**: "rule text" — reason

### Standards to Deprecate
(If none: "No deprecations needed.")

#### [TAG] Standard Name (`<slug>`)
- **Reason**: why no longer relevant
```
