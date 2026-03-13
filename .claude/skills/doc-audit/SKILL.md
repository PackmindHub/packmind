---
name: doc-audit
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

Dynamically distribute MDX files across parallel Explore sub-agents based on the actual pages discovered in Phase 1.

### Dynamic Agent Assignment

1. **Group by top-level directory** — from the MDX files globbed in Phase 1, group them by their first path segment (e.g., `getting-started/`, `concepts/`, `tools/`, `governance/`, `administration/`, `security/`, `linter/`, `playbook-maintenance/`). Root-level files (`index.mdx`, `home.mdx`, etc.) form their own "root" group.
2. **Merge small groups** — combine groups with fewer than 3 files into adjacent groups to avoid launching agents with very little work.
3. **Distribute across N agents** — aim for roughly balanced workload (similar page count per agent). Typically 4–6 agents, but adjust based on total page count.
4. **Launch agents in parallel** (`subagent_type: Explore`) — each agent receives:
   - The ground truth summary from Phase 1
   - The full contents of `references/section-audit-instructions.md` (read this file and include its contents in each prompt)
   - Its assigned section name(s) and the specific list of MDX files to audit

### Agent Prompt Template

Each agent's prompt should use the template from `references/section-audit-agent-prompt.md`, with the placeholders filled in.

### Sequential Fallback

If the Agent tool is unavailable, perform the audit sequentially: read each section's pages one by one and apply the same checks from `references/section-audit-instructions.md` directly.

## Phase 3: Consolidate Raw Findings

After all sub-agents complete:

1. **Collect** all findings from the 5 agents
2. **Deduplicate** — remove exact duplicates (same page, same line, same issue)
3. **Compile** into a single raw findings list, preserving the structured format from each agent

Do **not** write the report yet — pass the raw findings to Phase 4 first.

## Phase 4: Review and Filter

Launch a single **general-purpose sub-agent** (`subagent_type: general-purpose`) to independently review the raw findings. This agent acts as a skeptical external reviewer — its job is to verify each finding against the actual codebase and filter out false positives.

### Reviewer Agent Prompt

The reviewer agent's prompt should use the template from `references/reviewer-agent-prompt.md`, with the placeholders filled in.

### Sequential Fallback

If the Agent tool is unavailable, perform the review yourself: for each finding, read the referenced file and verify the claim before including it in the report.

## Phase 5: Write Report

Using only the **verified findings** from Phase 4:

1. **Sort** by severity: ERROR first, then WARNING
2. **Group** by category within each severity level
3. **Write** the report to `doc-audit-report.md` at the project root

### Report Format

```markdown
# Documentation Audit Report
Generated: {date} | Pages audited: {count}

## Summary
| Severity | Count |
|----------|-------|
| ERROR    | N     |
| WARNING  | N     |

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

### [D] Misleading Information
- **{page}** (line ~{N}): "{quoted text}" — {reason}
[... more findings]

## Warnings

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
