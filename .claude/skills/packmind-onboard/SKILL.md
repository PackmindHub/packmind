---
name: 'packmind-onboard'
description: 'Read-only codebase analysis to identify non-linter architectural patterns and generate draft Packmind Standards and Commands.'
license: 'Complete terms in LICENSE.txt'
---

# packmind-onboard

Action skill. Performs **read-only** repository analysis to discover **non-obvious, non-linter** patterns ("exotic insights"), then drafts **Standards** and **Commands** aligned with the codebase's real conventions.

## Guarantees

- **Read-only by default.** No files are written unless the user explicitly chooses to apply.
- **Preserve existing.** Never overwrite existing artifacts. If a slug already exists, create `-2`, `-3`, etc.
- **Evidence required.** Every reported insight must include file-path evidence (and line ranges when feasible).
- **Focused output.** Max **5 Standards** and **5 Commands** generated per run.

## Definitions

- **Exotic insight:** a pattern a linter cannot reliably enforce (architecture, module boundaries, workflow gaps, cross-module conventions).
- **Evidence:** list of file paths; when feasible include line ranges or minimal snippets (≤10 lines total per insight).
- **Dominant pattern:** ≥60% of observations OR at least 2× the next most common pattern.

## Step 1 — Mode Selection

Present the user with two onboarding modes using AskUserQuestion:

- **Quick** - Fast analysis (~4 checks), basic standards & commands. Best for getting started quickly or smaller codebases.
- **Optimal** - Deep analysis (17 checks), comprehensive insights. Best for thorough understanding or larger codebases.

Wait for user selection before proceeding.

## Step 2 — Announce

Print exactly:

```
packmind-onboard: analyzing codebase (read-only) — [QUICK|OPTIMAL] mode...
```

## Step 3 — Detect Existing Packmind and Agent Configuration

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
- **agent_md**: any markdown under `.claude/`, `.agents/`, or any `skills/` or `rules/` directory outside `.packmind`

If any exist, print:

```
Found existing configuration:
  - [N] standards
  - [M] commands
  - [P] agent docs

These will be preserved. New artifacts will be added alongside them.
```

## Step 4 — Detect Project Stack (Minimal, Evidence-Based)

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

Output a short stack summary:

- languages detected
- monorepo vs single package
- any architecture marker match

## Step 5 — Run Analyses

Select and run analyses based on the chosen mode. Read each reference file for detailed search patterns, thresholds, and insight templates.

### Quick Mode Analyses (4 checks)

Run only these analyses for fast, high-value insights:

| Analysis                  | Reference File                            | Focus                                        |
| ------------------------- | ----------------------------------------- | -------------------------------------------- |
| File Template Consistency | `references/file-template-consistency.md` | Scaffolding patterns → Commands              |
| CI/Local Workflow Parity  | `references/ci-local-workflow-parity.md`  | CI steps vs local scripts → Commands         |
| Role Taxonomy Drift       | `references/role-taxonomy-drift.md`       | Service/Handler/UseCase meanings → Standards |
| Test Data Construction    | `references/test-data-construction.md`    | Factories, fixtures, inline → Standards      |

### Optimal Mode Analyses (17 checks)

Run all analyses for comprehensive insights:

| Analysis                   | Reference File                                 | Focus                            |
| -------------------------- | ---------------------------------------------- | -------------------------------- |
| File Template Consistency  | `references/file-template-consistency.md`      | Scaffolding patterns             |
| CI/Local Workflow Parity   | `references/ci-local-workflow-parity.md`       | CI steps vs local scripts        |
| Role Taxonomy Drift        | `references/role-taxonomy-drift.md`            | Service/Handler/UseCase meanings |
| Test Data Construction     | `references/test-data-construction.md`         | Factories, fixtures, inline      |
| Cross-Domain Communication | `references/cross-domain-communication.md`     | Events vs direct coupling        |
| Module Boundaries          | `references/module-boundaries-dependencies.md` | Dependency violations            |
| Shared Kernel Drift        | `references/shared-kernel-drift.md`            | Utils as gravity wells           |
| Public API Discipline      | `references/public-api-deep-imports.md`        | Entrypoint vs deep imports       |
| Error Semantics            | `references/error-semantics.md`                | Exception vs Result vs sentinel  |
| Data Boundary Leakage      | `references/data-boundary-leakage.md`          | ORM/DTO in core logic            |
| Transaction Conventions    | `references/transaction-atomicity.md`          | Multi-write coordination         |
| Concurrency Style          | `references/concurrency-style.md`              | Async model consistency          |
| Config/Feature Flags       | `references/config-feature-flags.md`           | Centralized vs scattered         |
| Observability Contract     | `references/observability-contract.md`         | Logging, tracing, context        |
| Authorization Boundaries   | `references/authorization-boundary.md`         | Authz check placement            |
| Schema Generation Boundary | `references/schema-generation-boundary.md`     | Generated code discipline        |
| Cross-Cutting Hotspots     | `references/cross-cutting-hotspots.md`         | God files, high coupling         |

### Analysis Selection Strategy

**Quick mode:**

- Run all 4 Quick Mode analyses
- Skip conditional checks — focus on speed

**Optimal mode:**

1. **Always run**: All 17 analyses listed above
2. **Run if detected**: Additional depth for analyses matching detected stack
3. **Run on request**: Extra detail if user asks

### Output Schema (use for every insight)

```
INSIGHT:
  id: [PREFIX]-[n]
  title: ...
  summary: ...
  confidence: [high|medium|low]
  evidence:
    - path[:line-line]
  exceptions:
    - path[:line-line]
```

## Step 6 — Generate All Draft Playbooks

Generate all draft playbook files in one batch, using the formats defined in `packmind-create-standard` and `packmind-create-command` skills.

### Standard Playbook Format

For each Standard insight, create a JSON file at `.packmind/standards/_drafts/<slug>.playbook.json`:

```json
{
  "name": "Standard Name",
  "description": "What the standard covers and why",
  "scope": "Where this standard applies (e.g., 'TypeScript files', 'React components')",
  "rules": [
    {
      "content": "Rule starting with action verb",
      "examples": {
        "positive": "Valid code example",
        "negative": "Invalid code example",
        "language": "TYPESCRIPT"
      }
    }
  ]
}
```

### Command Playbook Format

For each Command insight, create a JSON file at `.packmind/commands/_drafts/<slug>.playbook.json`:

```json
{
  "name": "Command Name",
  "summary": "What the command does, why it's useful, and when it's relevant",
  "whenToUse": ["Scenario when this command applies"],
  "contextValidationCheckpoints": ["Question to validate before proceeding?"],
  "steps": [
    {
      "name": "Step Name",
      "description": "What this step does and how to implement it",
      "codeSnippet": "// Optional code example"
    }
  ]
}
```

### Generation Rules

- Generate playbooks **only from discovered insights** (no invention)
- Use evidence from analysis to populate rules/steps
- Cap output: max **5 Standards** + **5 Commands**
- Never overwrite existing files; append `-2`, `-3`, etc. if slug exists

---

## Step 7 — Present Drafts for Single Approval

Present the generated draft files and ask for **one single approval**:

```
============================================================
  PACKMIND ONBOARDING — [QUICK|OPTIMAL] MODE
============================================================

Stack detected: [languages], [monorepo?], [architecture markers]
Analyses run: [N] checks

DRAFT PLAYBOOKS CREATED:

Standards ([N]):
  1. [Name] → .packmind/standards/_drafts/[slug].playbook.json
  2. ...

Commands ([M]):
  1. [Name] → .packmind/commands/_drafts/[slug].playbook.json
  2. ...

============================================================

Please review the draft files above. When ready, confirm to publish
them to Packmind via CLI.
```

Then ask:

```
Ready to publish these Standards and Commands to Packmind?

[Y] Yes, publish all
[N] No, I need to edit them first
```

---

## Step 8 — Apply or Wait

**If user approves (Y):**

Publish all drafts to Packmind using CLI:

```bash
packmind-cli standards create .packmind/standards/_drafts/<slug>.playbook.json
packmind-cli commands create .packmind/commands/_drafts/<slug>.playbook.json
```

Print final summary:

```
============================================================
  PUBLISHED TO PACKMIND
============================================================

Standards: [N]
  - [Name] (slug: [slug])

Commands: [M]
  - [Name] (slug: [slug])

Draft files cleaned up.
============================================================
```

After successful publish, delete the draft playbook files.

**If user declines (N):**

Print:

```
Draft files ready for review at:
  - .packmind/standards/_drafts/
  - .packmind/commands/_drafts/

Edit them as needed, then run:
  packmind-cli standards create <path>
  packmind-cli commands create <path>

Or re-run this skill when ready.
```
