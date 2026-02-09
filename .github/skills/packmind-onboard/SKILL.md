---
name: "packmind-onboard"
description: "Complete automated onboarding: analyzes codebase, creates package, and generates standards & commands via CLI. Automatic package creation when none exist, user selection when packages are available."
license: "Complete terms in LICENSE.txt"
---

# packmind-onboard

Action skill. Provides **complete automated onboarding** for Packmind:
1. Creates or selects a package
2. Analyzes codebase for patterns
3. Generates draft Standards and Commands
4. Creates items via CLI

Automatic package creation when none exist, user selection when packages are available.

## Guarantees

- **Read-only analysis.** Analysis phase does not modify any project files.
- **Drafts before creation.** All items are written as drafts first, allowing review before creation.
- **Preserve existing.** Never overwrite existing artifacts. If a slug already exists, create `-2`, `-3`, etc.
- **Evidence required.** Every reported insight must include file-path evidence (and line ranges when feasible).
- **Focused output.** Max **5 Standards** and **5 Commands** generated per run.
- **Graceful failure.** Partial failures don't lose successful work; failed drafts are preserved.
- **User control.** When packages exist, users confirm package selection before creation.

## Definitions

- **Pattern (non-linter):** a convention a linter cannot reliably enforce (module boundaries, cross-domain communication, workflow parity, error semantics, etc).
- **Evidence:** `path[:line-line]` entries; omit line ranges only when the file isn't text-searchable.

---

## Step 1 — Get Repository Name

Get the repository name for package naming:

```bash
basename "$(git rev-parse --show-toplevel)"
```

Remember this as the repository name for package creation in Step 3.

---

## Step 2 — Analysis Depth Selection

Present two modes using AskUserQuestion:

- **Quick** — Fast scan (≈2–5 min). Generates a small starter set of Standards/Commands.
- **Optimal** — Deep scan (≈10–20 min). More cross-module patterns + better evidence coverage.

Wait for user selection before proceeding.

---

## Step 3 — Package Handling

Handle package creation or selection.

### Check existing packages

List available packages:

```bash
packmind-cli install --list
```

Parse the output to get package names.

### No packages exist

Auto-create package using repository name:

```bash
packmind-cli packages create "${REPO_NAME}-standards" --origin-skill=onboard
```

Print:
```
Created package: ${REPO_NAME}-standards
```

### One package exists

Ask via AskUserQuestion:
- "Add to `{package-name}`?"
- "Create new package instead"

### Multiple packages exist

Ask via AskUserQuestion:
- List each existing package as an option
- Include "Create new package" option

### If "Create new package" is selected

- Ask for package name (suggest `${REPO_NAME}-standards` as default)
- Run: `packmind-cli packages create <name> --origin-skill=onboard`

Remember the selected/created package name for later reference.

---

## Step 4 — Announce

Print exactly:

```
packmind-onboard: analyzing codebase (read-only) — [QUICK|OPTIMAL] mode
Target package: [package-name]
```

---

## Step 5 — Detect Existing Packmind and Agent Configuration

Before analyzing, detect and preserve any existing Packmind/agent configuration.

### Glob (broad, future-proof)
Glob for markdown in these roots (recursive):
- `.packmind/**/*.md`
- `.claude/**/*.md`
- `.agents/**/*.md`
- `**/skills/**/*.md`
- `**/rules/**/*.md`

### Classify
Classify found files into counts:
- **standards**: `.packmind/standards/**/*.md`
- **commands**: `.packmind/commands/**/*.md`
- **other_docs**: any markdown under `.claude/`, `.agents/`, or any `skills/` or `rules/` directory outside `.packmind`

If any exist, print exactly:

```
Existing Packmind/agent docs detected:

    Standards: [N]

    Commands: [M]

    Other docs: [P]
```

No overwrites. New files (if you Export) will be added next to the existing ones.

---

## Step 6 — Detect Project Stack (Minimal, Evidence-Based)

### Language markers (check presence)
- JS/TS: `package.json`, `pnpm-lock.yaml`, `yarn.lock`, `tsconfig.json`
- Python: `pyproject.toml`, `requirements.txt`, `setup.py`
- Go: `go.mod`
- Rust: `Cargo.toml`
- Ruby: `Gemfile`
- JVM: `pom.xml`, `build.gradle`, `build.gradle.kts`
- .NET: `*.csproj`, `*.sln`
- PHP: `composer.json`

### Architecture markers (check directories)
- Hexagonal/DDD: `src/application/`, `src/domain/`, `src/infra/`
- Layered/MVC: `src/controllers/`, `src/services/`
- Monorepo: `packages/`, `apps/`

Print exactly:

```
Stack detected (heuristic):

    Languages: [..]

    Repo shape: [monorepo|single]

    Architecture markers: [..|none]
```

---

## Step 7 — Run Analyses

Select and run analyses based on chosen mode. Read each reference file for detailed search patterns, thresholds, and insight templates.

### Quick Mode Analyses (4 checks)

| Analysis | Reference File | Output focus |
|----------|----------------|--------------|
| File Template Consistency | `references/file-template-consistency.md` | Commands |
| CI/Local Workflow Parity | `references/ci-local-workflow-parity.md` | Commands |
| Role Taxonomy Drift | `references/role-taxonomy-drift.md` | Standards |
| Test Data Construction | `references/test-data-construction.md` | Standards |

### Optimal Mode Analyses (17 checks)

| Analysis | Reference File |
|----------|----------------|
| File Template Consistency | `references/file-template-consistency.md` |
| CI/Local Workflow Parity | `references/ci-local-workflow-parity.md` |
| Role Taxonomy Drift | `references/role-taxonomy-drift.md` |
| Test Data Construction | `references/test-data-construction.md` |
| Cross-Domain Communication | `references/cross-domain-communication.md` |
| Module Boundaries | `references/module-boundaries-dependencies.md` |
| Shared Kernel Drift | `references/shared-kernel-drift.md` |
| Public API Discipline | `references/public-api-deep-imports.md` |
| Error Semantics | `references/error-semantics.md` |
| Data Boundary Leakage | `references/data-boundary-leakage.md` |
| Transaction Conventions | `references/transaction-atomicity.md` |
| Concurrency Style | `references/concurrency-style.md` |
| Config/Feature Flags | `references/config-feature-flags.md` |
| Observability Contract | `references/observability-contract.md` |
| Authorization Boundaries | `references/authorization-boundary.md` |
| Schema Generation Boundary | `references/schema-generation-boundary.md` |
| Cross-Cutting Hotspots | `references/cross-cutting-hotspots.md` |

### Output schema (internal; do not print as-is to user)
For every finding, keep an internal record:

```
INSIGHT:
title: ...
why_it_matters: ...
confidence: [high|medium|low]
evidence:
- path[:line-line]
where_it_doesnt_apply:
- path[:line-line]
```

---

## Step 8 — Generate All Drafts

Generate all draft files in one batch, using the formats defined above.

### Standard Draft Format

For each Standard insight, create a Markdown file at `.packmind/standards/_drafts/<slug>.draft.md`:

```markdown
# Standard Name

What the standard covers and why.

## Scope

Where this standard applies (e.g., 'TypeScript files', 'React components').

## Rules

### Rule starting with action verb

Another rule can follow...

## Examples

### Good

```typescript
// Valid code example
```

### Bad

```typescript
// Invalid code example
```
```

### Command Draft Format

For each Command insight, create a Markdown file at `.packmind/commands/_drafts/<slug>.draft.md`:

```markdown
# Command Name

What the command does, why it's useful, and when it's relevant.

## When to Use

- Scenario when this command applies
- Another scenario...

## Checkpoints

- Question to validate before proceeding?

## Steps

### 1. Step Name

What this step does and how to implement it.

```typescript
// Optional code example
```

### 2. Another Step

Description of next step...
```

### Generation Rules

- Generate drafts **only from discovered insights** (no invention)
- Use evidence from analysis to populate rules/steps
- Cap output: max **5 Standards** + **5 Commands**
- Never overwrite existing files; append `-2`, `-3`, etc. if slug exists

---

## Step 9 — Present Summary & Confirm

Present the generated draft files and ask for confirmation:

```
============================================================
  PACKMIND ONBOARDING — [QUICK|OPTIMAL] MODE
============================================================

Target package: [package-name]
Stack detected: [languages], [monorepo?], [architecture markers]
Analyses run: [N] checks

DRAFTS CREATED:

Standards ([N]):
  1. [Name] → .packmind/standards/_drafts/[slug].draft.md
  2. ...

Commands ([M]):
  1. [Name] → .packmind/commands/_drafts/[slug].draft.md
  2. ...

Drafts are in .packmind/*/_drafts/ if you want to edit them first.
============================================================
```

Then ask via AskUserQuestion with three options:

- **Create all now** — Proceed with creating all standards and commands
- **Let me review drafts first** — Pause to allow editing, re-run skill when ready
- **Cancel** — Exit without creating anything

---

## Step 10 — Create Items

### If user selected "Create all now"

**IMPORTANT:** The CLI only accepts JSON playbook files, not markdown. Before calling the CLI, convert each `.draft.md` file to a `.json` file.

#### Standard JSON Schema

Convert the markdown draft to this JSON format:

```json
{
  "name": "Standard name (from # heading)",
  "description": "What the standard covers (from intro paragraph)",
  "scope": "Where it applies (from ## Scope section)",
  "rules": [
    {
      "content": "Rule starting with action verb (from ### Rule headings under ## Rules)",
      "examples": {
        "positive": "Valid code example (from ### Good section)",
        "negative": "Invalid code example (from ### Bad section)",
        "language": "TYPESCRIPT"
      }
    }
  ]
}
```

#### Command JSON Schema

Convert the markdown draft to this JSON format:

```json
{
  "name": "Command name (from # heading)",
  "summary": "What it does and when (from intro paragraph)",
  "whenToUse": ["Scenario 1", "Scenario 2 (from ## When to Use bullets)"],
  "contextValidationCheckpoints": ["Question 1? (from ## Checkpoints bullets)"],
  "steps": [
    {
      "name": "Step name (from ### N. Step Name)",
      "description": "Step description (from step content)",
      "codeSnippet": "Optional code fence content"
    }
  ]
}
```

#### Conversion and Creation Process

**For each standard draft:**

1. Read the `.draft.md` file
2. Convert to JSON matching the schema above
3. Write the JSON to `.packmind/standards/_drafts/<slug>.json`
4. Run CLI command to create:
```bash
packmind-cli standards create .packmind/standards/_drafts/<slug>.json --origin-skill=onboard
```
5. If creation succeeded, add to package:
```bash
packmind-cli packages add --to <package-slug> --standard <slug> --origin-skill=onboard
```
6. Track result (success/failure)

**For each command draft:**

1. Read the `.draft.md` file
2. Convert to JSON matching the schema above
3. Write the JSON to `.packmind/commands/_drafts/<slug>.json`
4. Run CLI command to create:
```bash
packmind-cli commands create .packmind/commands/_drafts/<slug>.json --origin-skill=onboard
```
5. If creation succeeded, add to package:
```bash
packmind-cli packages add --to <package-slug> --command <slug> --origin-skill=onboard
```
6. Track result (success/failure)

**Show progress:**
```
Creating standards and commands...
✓ error-handling-pattern
✓ naming-conventions
✗ test-factory-patterns (error: duplicate name exists)
✓ run-full-test-suite

Done: 3 created, 1 failed
```

### If user selected "Let me review drafts first"

Print:
```
Draft files ready for review at:
  - .packmind/standards/_drafts/
  - .packmind/commands/_drafts/

Edit them as needed, then re-run this skill to continue.
```

Exit the skill.

### If user selected "Cancel"

Print:
```
Onboarding cancelled.
Draft files remain at .packmind/*/_drafts/ if you want to review them later.
```

Exit the skill.

---

## Step 11 — Completion Summary

### All items created successfully

```
============================================================
  ✅ ONBOARDING COMPLETE
============================================================

Package: [package-name]
Created: [N] standards, [M] commands

Your package is ready. Standards will be distributed to AI tools
when you run `packmind-cli install [package-slug]` in your repos.

Next steps:
  - Visit the webapp to add standards/commands to your package
  - Run `packmind-cli deploy` to distribute to AI tools
============================================================
```

Clean up successful draft files after creation.

### Partial success (some items failed)

```
============================================================
  ⚠️ ONBOARDING COMPLETED WITH ERRORS
============================================================

Package: [package-name]
Created: [N] standards, [M] commands
Failed: [X] items

Failed items:
  • [item-name]: [error message]

Failed drafts remain in .packmind/*/_drafts/ for review.
You can fix and re-run, or create manually with:
  packmind-cli standards create <file> --origin-skill=onboard
  packmind-cli packages add --to <package-slug> --standard <slug> --origin-skill=onboard
  packmind-cli commands create <file> --origin-skill=onboard
  packmind-cli packages add --to <package-slug> --command <slug> --origin-skill=onboard
============================================================
```

Keep failed draft files for user to fix and retry.

### No patterns discovered

If analysis found no patterns:

```
============================================================
  ℹ️ NO PATTERNS DISCOVERED
============================================================

The analysis did not find any non-obvious patterns to capture.

Consider running again with Optimal mode for deeper analysis.

Suggestions:
  - Ensure your codebase has consistent patterns
  - Check that files are not ignored by .gitignore
  - Try running on a more mature codebase section
============================================================
```

---

## Edge Cases

### Package creation fails

If `packmind-cli packages create` fails:

```
❌ Failed to create package: [error message]

Please check:
  - You are logged in: `packmind-cli login`
  - Your network connection is working
  - The package name is valid

Cannot proceed with onboarding until package is created.
```

Exit the skill. Do not proceed to analysis.

### Not logged in

If CLI commands fail with authentication errors:

```
❌ Not logged in to Packmind

Please run:
  packmind-cli login

Then re-run this skill.
```

### No packages available

If `packmind-cli install --list` returns no packages:

Auto-create a package using the repository name.

---

### 10.1 Deploy Locally (after successful creation)

Since the onboard skill is present, the user has configured an AI agent. Deploy the created artifacts locally:

```bash
packmind-cli install
```

This deploys to agent-specific folders:

| Agent | Standards | Commands |
|-------|-----------|----------|
| Claude | `.claude/rules/packmind/standard-[slug].md` | `.claude/commands/packmind/[slug].md` |
| Cursor | `.cursor/rules/packmind/standard-[slug].mdc` | `.cursor/commands/packmind/[slug].mdc` |
| Copilot | `.github/instructions/packmind-standard-[slug].instructions.md` | `.github/prompts/packmind-[slug].prompt.md` |

### 8.3 Cleanup and Summary

Delete the draft files, then print final summary:

```
============================================================
  PUBLISHED TO PACKMIND & DEPLOYED LOCALLY
============================================================

Standards: [N]
  - [Name] (slug: [slug])
    → .packmind/standards/[slug].md
    → [agent-specific path]

Commands: [M]
  - [Name] (slug: [slug])
    → .packmind/commands/[slug].md
    → [agent-specific path]

Draft files cleaned up.
============================================================
```

**If user declines (N):**

Print:

```
Draft files ready for review at:
  - .packmind/standards/_drafts/
  - .packmind/commands/_drafts/

Edit them as needed, then convert to JSON and run:
  packmind-cli standards create <path-to-json> --origin-skill=onboard
  packmind-cli packages add --to <package-slug> --standard <slug> --origin-skill=onboard
  packmind-cli commands create <path-to-json> --origin-skill=onboard
  packmind-cli packages add --to <package-slug> --command <slug> --origin-skill=onboard
  packmind-cli install

Note: The CLI requires JSON playbook files, not markdown.
See Step 10 for the JSON schema format.

Or re-run this skill when ready.
```
