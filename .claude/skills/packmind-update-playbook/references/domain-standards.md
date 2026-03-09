# Standards Domain Analysis

Scan existing standards, identify which are relevant to the user's validated intent, then perform deep analysis on those in one pass.

## What Standards Are

Standards are coding rules and conventions distributed to AI coding agents. Each standard has a name, description, and a list of rules (imperative, verb-first bullets). Source files live in `.packmind/standards/<slug>.md`. Installed copies also exist in agent directories:
- Claude Code: `.claude/rules/packmind/`
- Cursor: `.cursor/rules/packmind/`
- GitHub Copilot: `.github/instructions/packmind-*`

Search the project root and all subdirectories.

## Instructions

### Step 1: List Standards

Run `packmind-cli standards list` to get slugs, names, and descriptions. Do NOT read individual standard files yet.

### Step 2: Filter Relevant Standards

For each standard in the list, ask: **Does the user's intent involve updating this standard?**

Relevant means: the intent explicitly targets this standard, describes changes to its rules or conventions, or references issues with its current content. Match by topic using slug and name — no deep reading yet.

Also identify **new standard opportunities** if the user's intent suggests creating one. A new standard is warranted if:
- The intent describes a coding convention or best practice that no existing standard covers
- A recurring pattern or anti-pattern emerged that should be codified
- The user explicitly requests a new standard for a specific topic

### Step 3: Deep Analyze Flagged Standards

For each relevant standard, read `.packmind/standards/<slug>.md`. Evaluate the standard against the user's requested changes:
- Intent requests adding rules → propose adding them
- Intent requests modifying rules → propose the specific modifications
- Intent requests removing rules → propose removal with rationale
- Intent requests changing the description → propose the new description
- If conversation context exists, use it as supporting evidence for the evaluation

Apply a HIGH BAR — only propose updates when there is strong evidence:
- The user's intent clearly describes a needed change
- A rule references a pattern, API, or tool that no longer applies
- A critical gap is identified that the intent highlights

Do NOT propose updates for minor wording or changes not supported by the user's intent.

For each new standard that passes validation, follow the procedure in [create-standard-procedure.md](create-standard-procedure.md) to write the standard file.

## Output Format

```markdown
## Standards Change Report

### New Standards
(If none: "No new standards needed.")

#### Standard Name (`<slug>`)
- **Reason**: why this standard is needed
- **Rules**: key rules to include

### Standard Updates
(If none: "No updates needed.")

#### Standard Name (`<slug>`)
- **Reason**: what changed or what's missing
- **Rules to add**: rule text
- **Rules to modify**: old → new
- **Rules to remove**: rule text — reason

### Standards to Deprecate
(If none: "No deprecations needed.")

#### Standard Name (`<slug>`)
- **Reason**: why no longer relevant
```
