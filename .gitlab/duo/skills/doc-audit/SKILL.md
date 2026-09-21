---
name: 'doc-audit'
description: 'Audit Packmind end-user documentation (apps/doc/) for broken links, outdated CLI references, non-existent concepts, misleading information, and missing coverage. Produces a structured markdown report at project root. Use when docs may have drifted from the codebase, before a release, or on a regular cadence.'
---

# Documentation Audit

Detect outdated, broken, or misleading documentation by cross-referencing MDX pages against the actual codebase. Produces a structured `doc-audit-report.md` at the project root.

**This skill only detects issues — it does not fix them.**

## Tooling

Reach for `Read`, `Glob` and `Grep` before a shell. Every check here is "open a file" or
"search the tree", and those three cover both. It matters because the scheduled run
(`.github/workflows/weekly-doc-review.yml`) is non-interactive: it grants a small
read-only shell allowlist and nobody is there to approve anything outside it, so a
refused call spends a turn of a fixed budget and returns nothing. Paging through a file
with `head` or `sed` when `Read` opens it whole loses either way. Pass this on to the
sub-agents.

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

## Tools
Use `Read`, `Glob` and `Grep`. `Read` opens any file you need, whole or by offset, and
`Grep` searches the tree — between them there is nothing here a shell is needed for. Do
not shell out to `head`, `sed`, `rg` or `jq`: this run is non-interactive, so a command
outside its read-only allowlist is refused with nobody to approve it, and the turn is
gone.

Read each assigned MDX page completely and apply all detection categories. Return your findings in the exact format specified in the instructions.
```

### Sequential Fallback

If the Agent tool is unavailable **or a launch is refused** — a permission denial counts, and in a non-interactive run (CI) there is nobody to approve one — do not abandon the audit. Fall back to auditing sequentially: read each section's pages one by one and apply the same checks from `references/section-audit-instructions.md` directly.

Narrow the scope if the whole set does not fit (fewest pages dropped first, and say which), but never end the run without Phase 3: a partial report beats no report, and an empty run leaves whoever scheduled it with nothing to read.

## Phase 3: Consolidate Report

After all sub-agents complete:

1. **Collect** all findings from the 5 agents
2. **Deduplicate** — remove exact duplicates (same page, same line, same issue)
3. **Sort** by severity: ERROR first, then WARNING, then INFO
4. **Group** by category within each severity level
5. **Write** the report to `doc-audit-report.md` at the project root — always, even when the audit is partial or found nothing. Writing the file is the deliverable; a summary in the reply is not, since the caller may be a script that only reads the file. When sections were skipped or audited without sub-agents, say so at the top of the report so a short report is not mistaken for a clean one.

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

## Verified Clean

The following areas were checked in depth and found accurate, and are recorded here so a short report is not mistaken for a shallow one:

- **{area}** — what was cross-referenced against what, and that it came back clean
[... one line per area that was audited without findings]
```

**Omit any category section that has zero findings.** Only include sections with actual results.

**Keep `## Verified Clean` even when there are findings.** A reader cannot tell a clean
page from an unread one, so name what came back accurate and against which sources —
that is what makes a two-finding report trustworthy instead of suspicious. Cover the
sections and categories that produced nothing, and say plainly if a section was skipped
or narrowed rather than listing it as clean.

After writing the report, print a brief summary:
- Total issues found per severity
- Top 3 most problematic pages (by issue count)
- The report file path