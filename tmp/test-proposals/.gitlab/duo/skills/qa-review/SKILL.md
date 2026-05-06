---
name: 'qa-review'
description: 'Review a user story implementation against its Example Mapping (EM) specification.'
---

# QA Review

Audit a user story implementation against its Example Mapping specification. Reads the EM
markdown, finds all implementing code in the codebase, then runs two parallel agents — one for
functional coverage, one for code review. Produces a single compact report.

**This skill only detects issues — it does not fix them.**

## Reference

A ready-to-fill EM template is available at `em_template.md` (in this skill's directory). Share it with the user when they need to write a new spec from scratch.

## 1. Parse the EM Spec

Read the markdown file at the provided path. Extract a structured summary with these sections:

### What to extract

1. **User Story title** — the first line or heading describing the US
2. **Rules** — each `# Rule N: <title>` block. For each rule, extract:
   - Rule number and title
   - Each `## Example N` with its setup/action/outcome narrative (preserve the full text)
3. **Technical Rules** — bullet points under a `# Technical rules` heading (implementation-focused constraints)
4. **User Events** — content under `# User Events` heading: event names, properties, schemas
5. **Check Also items** — bullet points after "Check also" markers (additional rules/constraints, often separated by dashes)
6. **Code References** — all backtick-quoted terms across the entire spec (class names, field names, event names like `ConflictDetector`, `space_created`, `decision`)
7. **Domain Keywords** — key nouns and verbs from rule titles and examples (e.g., "space", "create", "slug", "rename", "conflict")

### Handling ambiguity

If a spec item is ambiguous or explicitly deferred (e.g., "TBD", "on verra plus tard", "later"), flag it in the Parsed Spec Summary but exclude it from coverage assessment. Note it in the report as "Deferred — not assessed."

Compile everything into a **Parsed Spec Summary** formatted as below. The "Full Examples" section preserves the complete raw text of every example — sub-agents need this full context to accurately assess coverage.

```
## Parsed Spec Summary

### User Story
{title}

### Rules and Examples
Rule 1: {title}
  Example 1: {one-line summary of scenario}
  Example 2: {one-line summary of scenario}
Rule 2: {title}
  Example 1: {one-line summary of scenario}
[...]

### Full Examples (raw text)
{Copy the complete text of every example verbatim from the spec, preserving setup/action/outcome narratives. Do not summarize here — this section is passed to sub-agents so they can assess nuanced behaviors.}

### Technical Rules
- {rule text}
[...]

### Deferred Items
- {item text} — Deferred, not assessed
[...]

### User Events
- {event_name}: {properties}
[...]

### Check Also
- {constraint text}
[...]

### Code References (from backticks)
{list of all backtick-quoted terms}

### Domain Keywords
{list of distinctive nouns/verbs extracted from rules}
```

## 2. Select Target Domains

Ask the user which domains this user story touches. Use **AskUserQuestion** with `multiSelect: true`:

| Option | Directories |
|--------|-------------|
| CLI (apps/cli) | `apps/cli/src/**` |
| API (apps/api) | `apps/api/src/**` |
| Packages (packages/*) | `packages/*/src/**`, `packages/types/src/**` |
| Frontend (apps/frontend) | `apps/frontend/app/**`, `apps/frontend/src/**` |
| MCP (apps/mcp-server) | `apps/mcp-server/src/**` |

**Packages is always included**, even if the user does not select it — it contains domain logic, contracts, events, and infra that all other layers depend on.

Store the user's selection as `{target_domains}` — a list of domain labels and their directory patterns. All subsequent steps use this to scope their searches.

## 3. Validate Implementation Exists

Grep 2–3 of the most distinctive backtick-quoted terms from the spec, **scoped to the `{target_domains}` directories only**. If fewer than 3 implementing files are found, **stop and ask the user** to confirm that the US has been fully implemented. Do not proceed with a full review on a partially-implemented or not-yet-started US — the report would be misleading.

## 4. Build Code Map

Launch a **Code Map Agent** (`subagent_type: general-purpose`) using the prompt from `agents/code-map-agent.md`. Replace:
- `{parsed_spec_summary}` with the Parsed Spec Summary from step 1
- `{target_domains}` with the selected domains and their directory patterns from step 2

The agent will search only within the target domain directories, then return a structured Code Map organized by architectural layer. Only layers matching the selected domains will appear in the output.

Wait for the agent to complete before proceeding to step 5.

## 5. Pre-filter Packmind Standards

Before launching the review agents, collect the applicable Packmind coding standards:

1. Glob for `**/.claude/rules/packmind/*.md` across the repository
2. Read the YAML frontmatter of each file to extract its `paths` glob patterns
3. Match the Code Map file paths against each standard's `paths` patterns
4. For each standard that matches at least one Code Map file, read its full content

Compile the applicable standards into `{applicable_standards}` — the full text of each matching standard, prefixed with its name. If no standards match, set `{applicable_standards}` to "None".

## 6. Launch Parallel Sub-Agents

Launch **two sub-agents in parallel** (same turn), each receiving the Parsed Spec Summary (including the Full Examples section with raw text), Code Map, and target domains as context:

1. **Functional Coverage Agent** (`subagent_type: general-purpose`) — prompt built from `agents/functional-coverage-agent.md`. Replace `{parsed_spec_summary}`, `{code_map}`, and `{target_domains}`.
2. **Code Review Agent** (`subagent_type: general-purpose`) — prompt built from `agents/code-review-agent.md`. Replace `{parsed_spec_summary}`, `{code_map}`, `{target_domains}`, and `{applicable_standards}`.

Launch both agents simultaneously. The full raw example text is critical — sub-agents need the complete setup/action/outcome narratives to assess nuanced behaviors, not just one-line summaries.

### Sequential Fallback

If the Agent tool is unavailable, perform both reviews sequentially yourself, following the instructions from each agent prompt file.

## 7. Combine & Write Report

Once both agents complete, merge their outputs into a single report.

### Output path

Derive from the input path: if input is `path/to/my-spec.md`, output is `path/to/my-spec-report.md`.

### Report template

```markdown
# QA Review Report

**Spec**: {filename} | **Date**: {date} | **Branch**: {branch} | **Commit**: {short-sha}
**Rules**: {N} | **Examples**: {N} | **Tech Rules**: {N} | **Events**: {N}

## Summary

| Metric | Count |
|--------|-------|
| Covered | N |
| Partially Covered | N |
| Not Covered | N |
| Code Findings | N (Critical: X, High: Y, Medium: Z) |
| Standards Violations | N |

## Functional Coverage

### Coverage Matrix

{coverage matrix table from functional coverage agent}

### Gaps

{reproduction steps from functional coverage agent — omit this subsection if all items are Covered}

## Code Review

### Findings

{findings from code review agent — omit this section if no issues found}

## Deferred Items

{list of items marked as deferred/TBD in the spec — not assessed in this review}

---
*Static analysis only. No code was executed during this review.*
```

**Omit any section that has zero content.** Only include sections with actual results.

### Print Summary

After writing the report, print a brief summary to the console:
- Total rules/examples in the spec
- Coverage stats (Covered / Partially / Not Covered counts)
- Code review findings count by severity
- The report file path