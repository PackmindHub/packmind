---
name: 'doc-audit'
description: 'Audit Packmind end-user documentation (apps/doc/) for broken links, outdated CLI references, non-existent concepts, misleading information, and missing coverage. Produces a structured markdown report at project root. Use when docs may have drifted from the codebase, before a release, or on a regular cadence.'
---

# Documentation Audit

Detect outdated, broken, or misleading documentation by cross-referencing MDX pages against the actual codebase. Produces a structured `doc-audit-report.md` at the project root.

**This skill only detects issues — it does not fix them.**

## Phase 1: Build Ground Truth

Before launching any sub-agents, build a concise ground truth summary by gathering these four data sources:

1. **Navigation structure** — Read `apps/doc/docs.json` and extract all navigation groups with their page lists
2. **CLI commands** — List files in `apps/cli/src/infra/commands/` to get current command files
3. **Domain packages** — List directories in `packages/` to get current package names
4. **Doc MDX files** — Glob `apps/doc/**/*.mdx` to get all actual pages on disk

Compile these into a **ground truth summary** string formatted as:

```
## Ground Truth

### Navigation Groups (from docs.json)
- Getting Started: index, getting-started/gs-install-cloud, ...
- Concepts: concepts/standards-management, ...
[list all groups]

### CLI Commands (from apps/cli/src/infra/commands/)
[list all *Command.ts and *Handler.ts files]

### Domain Packages (from packages/)
[list all package directory names]

### MDX Files on Disk (from apps/doc/**/*.mdx)
[list all .mdx file paths relative to apps/doc/]

### Current Date
{today's date}
```

## Phase 2: Launch Parallel Sub-Agents

Launch **5 Explore sub-agents** in parallel (`subagent_type: Explore`), one per section group. Each agent receives:
- The ground truth summary from Phase 1
- The full contents of `references/section-audit-instructions.md` (read this file and include its contents in each prompt)
- Its assigned section and list of MDX files to audit

### Agent Assignments

| Agent | Sections | Pages to Audit |
|-------|----------|----------------|
| 1 | Getting Started + root pages | `index.mdx`, `home.mdx` + all `getting-started/*.mdx` |
| 2 | Concepts | All `concepts/*.mdx` + `tools/import-from-knowledge-base.mdx` |
| 3 | Tools & Integrations | `tools/cli.mdx` |
| 4 | Governance + Playbook Maintenance + Linter | All `governance/*.mdx` + `playbook-maintenance/*.mdx` + `linter/*.mdx` |
| 5 | Administration + Security | All `administration/*.mdx` + `security/*.mdx` |

### Agent Prompt Template

Each agent's prompt should follow this structure:

```
You are auditing the {section_name} section of the Packmind documentation.

## Your Assigned Pages
{list of MDX file paths to read and audit}

## Ground Truth
{ground truth summary from Phase 1}

## Audit Instructions
{full contents of references/section-audit-instructions.md}

Read each assigned MDX page completely and apply all detection categories. Return your findings in the exact format specified in the instructions.
```

### Sequential Fallback

If the Agent tool is unavailable, perform the audit sequentially: read each section's pages one by one and apply the same checks from `references/section-audit-instructions.md` directly.

## Phase 3: Consolidate Report

After all sub-agents complete:

1. **Collect** all findings from the 5 agents
2. **Deduplicate** — remove exact duplicates (same page, same line, same issue)
3. **Sort** by severity: ERROR first, then WARNING, then INFO
4. **Group** by category within each severity level
5. **Write** the report to `doc-audit-report.md` at the project root

### Report Format

```markdown
# Documentation Audit Report
Generated: {date} | Pages audited: {count}

## Summary
| Severity | Count |
|----------|-------|
| ERROR    | N     |
| WARNING  | N     |
| INFO     | N     |

## Errors

### [A] Broken Internal Links
- **{page}** (line ~{N}): Link to `{target}` — no matching MDX file exists
[... more findings]

### [B] Outdated CLI Commands
- **{page}** (line ~{N}): References `packmind-cli {cmd}` — command not found in CLI source
[... more findings]

### [C] Non-Existent Concepts
- **{page}** (line ~{N}): References `{concept}` — not found in codebase
[... more findings]

## Warnings

### [D] Misleading Information
- **{page}** (line ~{N}): "{quoted text}" — {reason}
[... more findings]

## Info

### [E] Missing Documentation Coverage
- CLI command `{cmd}` has no documentation
- Package `{pkg}` has no documentation page
[... more findings]
```

**Omit any category section that has zero findings.** Only include sections with actual results.

After writing the report, print a brief summary:
- Total issues found per severity
- Top 3 most problematic pages (by issue count)
- The report file path