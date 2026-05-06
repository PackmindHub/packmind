---
name: 'packmind-onboard'
description: 'Complete automated onboarding: analyzes codebase, creates package, and generates standards & commands via CLI. Automatic package creation when none exist, user selection when packages are available.'
license: 'Complete terms in LICENSE.txt'
---

# packmind-onboard
Run "packmind-cli --version" to get the current cli installation.
    
Find the highest version at or below the cli version in this list:
- 0.16.0
- 0.23.0
Remember this value as $PACKMIND_CLI_VERSION for the rest of the skill.


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

## Step 0 — Introduction

Print exactly:

```
I'll start the Packmind onboarding process. I'll create your first standards and commands and send them to your Packmind organization. This usually takes ~3 minutes.
```


---

## Step 1 — Get Repository Name

Get the repository name for package naming:

```bash
basename "$(git rev-parse --show-toplevel)"
```

Remember this as the repository name for package creation in Step 2.

Also run `packmind-cli whoami` and extract the `Host:` value from the output. Remember this URL for the completion summary.


---

## Step 2 — Package Handling

Handle package creation or selection.

### Check existing packages

List available packages by following [`packmind-versions/$PACKMIND_CLI_VERSION/list-packages.md`](packmind-versions/$PACKMIND_CLI_VERSION/list-packages.md).

Parse the output to get package names and slugs.

### No packages exist

Auto-create a package using the repository name. Follow [`packmind-versions/$PACKMIND_CLI_VERSION/create-package.md`](packmind-versions/$PACKMIND_CLI_VERSION/create-package.md) using `${REPO_NAME}-standards` as the package name.

The create-package step will determine the space. Capture the chosen space slug as `$SPACE_SLUG` and the new package slug as `$PACKAGE_SLUG`.

Print:
```
No existing packages found — created a new one: ${REPO_NAME}-standards
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
- Follow [`packmind-versions/$PACKMIND_CLI_VERSION/create-package.md`](packmind-versions/$PACKMIND_CLI_VERSION/create-package.md) using the chosen name.
- The create-package step will determine the space. Capture the chosen space slug as `$SPACE_SLUG` and the new package slug as `$PACKAGE_SLUG`.

### If an existing package is selected

Follow [`packmind-versions/$PACKMIND_CLI_VERSION/select-package.md`](packmind-versions/$PACKMIND_CLI_VERSION/select-package.md).

### After this step

Remember `$PACKAGE_SLUG` (the slug of the selected/created package) and `$SPACE_SLUG` for later reference — they will be used together in Step 9 to ensure items are added to the correct package in the correct space (as `@$SPACE_SLUG/$PACKAGE_SLUG`).


---

## Step 3 — Announce

Print exactly:

```
packmind-onboard: analyzing codebase (read-only)
Target package: [package-name]
```


---

## Step 4 — Detect Existing Packmind and Agent Configuration

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

## Step 5 — Detect Project Stack (Minimal, Evidence-Based)

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

## Step 6 — Run Analyses

Read each reference file for detailed search patterns, thresholds, and insight templates.

| Analysis | Reference File | Output focus |
|----------|----------------|--------------|
| File Template Consistency | `references/file-template-consistency.md` | Commands |
| CI/Local Workflow Parity | `references/ci-local-workflow-parity.md` | Commands |
| Role Taxonomy Drift | `references/role-taxonomy-drift.md` | Standards |
| Test Data Construction | `references/test-data-construction.md` | Standards |

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

## Step 7 — Generate All Drafts

Generate all draft files in one batch, using the format defined for your CLI version.

Read the **Draft Format** section in [`packmind-versions/$PACKMIND_CLI_VERSION/create-items.md`](packmind-versions/$PACKMIND_CLI_VERSION/create-items.md) and create draft files accordingly.

### Generation Rules (all versions)

- Generate drafts **only from discovered insights** (no invention)
- Use evidence from analysis to populate rules/steps
- Cap output: max **5 Standards** + **5 Commands**
- Never overwrite existing files; append `-2`, `-3`, etc. if slug exists


---

## Step 8 — Present Summary & Confirm

Present the generated draft files and ask for confirmation:

```
============================================================
  ANALYSIS COMPLETE
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

Drafts are saved in .packmind/*/_drafts/ — you can review or edit them before creating.
============================================================
```

Then ask via AskUserQuestion with three options:

- **Create all now** — Proceed with creating all standards and commands
- **Let me review drafts first** — Pause to allow editing, re-run skill when ready
- **Cancel** — Exit without creating anything


---

## Step 9 — Create Items

Follow [`packmind-versions/$PACKMIND_CLI_VERSION/create-items.md`](packmind-versions/$PACKMIND_CLI_VERSION/create-items.md).


---

## Step 10 — Completion Summary

Follow [`packmind-versions/$PACKMIND_CLI_VERSION/completion-summary.md`](packmind-versions/$PACKMIND_CLI_VERSION/completion-summary.md).


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

If the package listing command returns no packages:

Auto-create a package using the repository name.


