---
name: 'playbook-audit'
description: 'Audit deployed Packmind playbook artifacts for contradictions, duplications, and coverage gaps. Produces `playbook-audit-report.md` at project root. Use after bulk artifact updates, before onboarding, or on a regular cadence.'
---

# Playbook Audit

Detect contradictions, duplications, and broken cross-references between playbook artifacts (standards, commands, skills) deployed in `.claude/` directories. Produces a structured `playbook-audit-report.md` at the project root.

**This skill only detects issues — it does not fix them.**

## Phase 1: Discover Artifacts

Before launching any sub-agents, build an artifact inventory by scanning `.claude/` directories:

### 1. Standards

Glob `.claude/rules/**/*.md` to find all standard files. For each file:
- Extract YAML frontmatter fields: `name`, `paths`, `alwaysApply`, `description`
- Extract the body content (everything after the frontmatter closing `---`)
- If frontmatter is malformed, log a WARNING and use the filename as the name

### 2. Commands

Glob `.claude/commands/**/*.md` to find all command files. For each file:
- Extract YAML frontmatter field: `description`
- Extract the body content
- If frontmatter is malformed, log a WARNING and use the filename as the name

### 3. Skills

Glob `.claude/skills/*/SKILL.md` to find all skill entry points. For each skill directory:
- Extract YAML frontmatter fields from SKILL.md: `name`, `description`
- Extract the SKILL.md body content
- Glob `references/*.md` and `scripts/*` within the skill directory — include a one-line summary of each
- If a skill directory exists but has no SKILL.md, flag as an INFO finding

### 4. Compile Artifact Inventory

Build a markdown document structured as:

```
## Artifact Inventory

### Standards ({count} found)
For each: **{name}** — `{path}` — alwaysApply: {yes/no}
> {first 2-3 lines of body or description}

### Commands ({count} found)
For each: **{name}** — `{path}`
> {first 2-3 lines of body or description}

### Skills ({count} found)
For each: **{name}** — `{path}` — references: {list} — scripts: {list}
> {first 2-3 lines of body or description}
```

### Edge Cases

- **Empty directory** (e.g., no standards found) → skip related comparison agents, note in final report
- **Skill directory without SKILL.md** → flag as INFO finding in the inventory
- **Malformed frontmatter** → log WARNING in the inventory, use filename as artifact name

## Phase 2: Launch 3 Parallel Comparison Agents

Launch 3 `Agent(general-purpose)` sub-agents in parallel. Each receives:
1. The full artifact inventory from Phase 1
2. The full contents of its reference file (read the file and include its contents in the prompt)

| Agent | Reference File | Compares |
|-------|---------------|----------|
| 1 | `references/standards-vs-skills-agent.md` | Every standard ↔ every skill |
| 2 | `references/standards-vs-commands-agent.md` | Every standard ↔ every command |
| 3 | `references/commands-vs-skills-agent.md` | Every command ↔ every skill |

### Agent Prompt Template

```
You are auditing Packmind playbook artifacts for issues. Here is the artifact inventory:

{artifact inventory from Phase 1}

Here are your detailed instructions:

{full contents of the agent's reference file}

Read every artifact file referenced in the inventory fully before making comparisons.
Return your findings in the exact format specified in the instructions.
If you find no issues, return: NO_ISSUES_FOUND
```

### Sequential Fallback

If the Agent tool is unavailable, perform the comparisons sequentially: read each artifact pair and apply the same checks from the reference files directly.

## Phase 3: Consolidate Findings

After all 3 sub-agents complete:

1. **Collect** all findings from the 3 agents
2. **Deduplicate** — remove findings that reference the same artifact pair with the same issue type
3. **Compile** into a single raw findings list, preserving the structured format from each agent

Do **not** write the report yet — pass the raw findings to Phase 4 first.

## Phase 4: Review and Report

Launch a single `Agent(general-purpose)` sub-agent with:
1. The raw findings from Phase 3
2. The artifact inventory from Phase 1
3. The full contents of `references/report-agent.md`

This agent acts as a skeptical reviewer — its job is to verify each finding against the actual artifacts and produce the final formatted report. See `references/report-agent.md` for the full prompt template.

### Sequential Fallback

If the Agent tool is unavailable, perform the review yourself: for each finding, read both referenced artifacts and verify the claim before including it in the report.

## Phase 5: Write Report

Using the verified and formatted report from Phase 4:

1. **Write** the report to `playbook-audit-report.md` at the project root
2. **Print a summary** to the user:
   - Total issues found per severity (CRITICAL / WARNING / INFO)
   - Top 3 most problematic artifacts (by issue count)
   - The report file path