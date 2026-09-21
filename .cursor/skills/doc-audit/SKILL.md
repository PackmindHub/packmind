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
with `head` or `sed` when `Read` opens it whole loses either way.

Never `cd`. Every tool here takes a path relative to the repository root, so there is
nothing to change directory for, and `cd somewhere && ...` is the one shape the
allowlist can never admit: a prefix rule is matched against the whole command, so it
does not match a compound one. That refusal cannot be granted by adding a rule — the
only fix is not to write the command. Pass a path instead.

## Phase 1: Build Ground Truth

Before auditing anything, build a concise ground truth summary by gathering these four data sources:

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

### Land the report file before auditing anything

With the ground truth in hand and **before auditing a single page**, `Write`
`doc-audit-report.md` at the project root with exactly this placeholder:

```markdown
<!-- doc-audit: incomplete -->
# Documentation Audit Report

This run did not get as far as writing its findings. The placeholder was written
before the audit began and never replaced, so whatever stopped the run did so
between Phase 1 and Phase 3.
```

The first line is a marker the caller greps for, so reproduce it exactly and keep
it as the very first line. Phase 3 overwrites this whole file, marker included.

Do this even though Phase 3 writes the real report: a run that dies in between
otherwise leaves the caller with no file and no clue, which is the one outcome
this skill must never produce. It costs one `Write`.

## Phase 2: Audit Each Section Group in Turn

Audit the five section groups below **yourself, one after another**, in a single pass:
read the group's pages, apply every check in `references/section-audit-instructions.md`,
hold the findings, then move to the next group. Read
`references/section-audit-instructions.md` once, before the first group.

**Do not launch sub-agents for this.** A sub-agent runs in the background and reports
back through a notification, and this skill's scheduled run
(`.github/workflows/weekly-doc-review.yml`) is non-interactive: the run ends the moment
you produce a reply, so the notification never arrives and the findings are lost. The
run then exits *successfully* with the Phase 1 placeholder still on disk and nothing to
show. That is not a hypothetical — it is how the audit failed on 2026-09-21, twice, once
the `Agent` tool became asynchronous. Fanning out is the one shape this phase cannot
take, whatever the turn budget looks like.

For the same reason, never end a reply with work still outstanding. There is nobody to
resume you. Carry on to Phase 3 in the same pass.

### Section Groups

| Group | Sections | Pages to Audit |
|-------|----------|----------------|
| 1 | Getting Started + root pages | `index.mdx` + all `getting-started/*.mdx` |
| 2 | Concepts | All `concepts/*.mdx` + `tools/import-from-knowledge-base.mdx` |
| 3 | Tools & Integrations | `tools/cli.mdx` |
| 4 | Governance + Playbook Maintenance + Linter | All `governance/*.mdx` + `playbook-maintenance/*.mdx` + `linter/*.mdx` |
| 5 | Administration + Security | All `administration/*.mdx` + `security/*.mdx` |

Read each page completely and apply all detection categories. Keep each group's findings
in the exact format the instructions specify, so Phase 3 only has to merge them.

### The table is a split, not the page list

Take the pages from the MDX files Phase 1 found on disk, using the table only to decide
which group a page belongs to. Reconcile the two before you start: a page on disk that no
row claims joins the group owning its section, and a page named in a row that is not on
disk is dropped. Say so in the report's coverage line either way.

Where no group owns the section — `tools/` is split across groups 2 and 3 by filename, so
a page added there is claimed by nobody — put it in group 3 and name it in the coverage
line. Any group will do; what must not happen is the page going unread because no rule
picked one.

The table is maintained by hand and the docs are not, so it drifts — it carried a
`home.mdx` that had not existed for some time. A phantom page is the harmless direction;
the costly one is a page added to `apps/doc/` that no row mentions and is therefore never
read, which a table trusted as the page list would hide behind a clean report.

### If the budget runs short

Narrow the scope rather than the phases: drop the fewest pages you can, audit what
remains, and name what you dropped in the report. Never end the run without Phase 3 — a
partial report beats no report, and an empty run leaves whoever scheduled it with nothing
to read.

## Phase 3: Consolidate Report

After all five groups are audited:

1. **Collect** the findings from all five groups
2. **Deduplicate** — remove exact duplicates (same page, same line, same issue)
3. **Sort** by severity: ERROR first, then WARNING, then INFO
4. **Group** by category within each severity level
5. **Write** the report to `doc-audit-report.md` at the project root, overwriting the Phase 1 placeholder — always, even when the audit is partial or found nothing. Writing the file is the deliverable; a summary in the reply is not, since the caller may be a script that only reads the file. When sections were skipped or narrowed, say so at the top of the report so a short report is not mistaken for a clean one.

   The real report must **not** carry the `<!-- doc-audit: incomplete -->` marker — the
   caller reads that line as "this run produced nothing" and fails the job on it. Replace
   the file wholesale rather than appending to the placeholder.

   Write the file before composing your reply, not after. The reply is not the deliverable
   and a run that ends having only described its findings has failed, however good the
   description.

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