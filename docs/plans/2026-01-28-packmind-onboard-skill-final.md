# packmind-onboard Skill - Language Agnostic Design

**Goal:** A skill that guides Claude to discover insights in ANY codebase, regardless of language/framework.

**Key principle:** Discover what exists, don't assume conventions.

---

## Skill Content

```markdown
---
name: 'packmind-onboard'
description: "Analyze any codebase to discover insights, generate personalized Standards and Commands"
license: 'Complete terms in LICENSE.txt'
---

# packmind-onboard

Action skill. Analyzes your codebase to discover things you didn't know, then generates personalized Standards and Commands.

**Works with any language.** The analysis adapts to what your codebase actually uses.

**Draft-first:** nothing is written or sent unless you explicitly choose it.

## What This Skill Produces

- **Insights** - Non-obvious discoveries about YOUR codebase
- **Standards** - Rules derived from insights, tailored to your conventions
- **Commands** - Workflows derived from insights, matching your project structure

## Execution

### Step 1: Announce

Print:
```
packmind-onboard: analyzing codebase (read-only)...
```

### Step 2: Detect Project Stack

Before analyzing, understand what you're working with:

1. **Check for language markers:**
   - `package.json` → JavaScript/TypeScript
   - `pyproject.toml`, `requirements.txt`, `setup.py` → Python
   - `go.mod` → Go
   - `Cargo.toml` → Rust
   - `Gemfile` → Ruby
   - `pom.xml`, `build.gradle` → Java/Kotlin
   - `*.csproj`, `*.sln` → C#/.NET
   - `composer.json` → PHP

2. **Check for config files:**
   - Linters: `.eslintrc*`, `pylintrc`, `.rubocop.yml`, `golangci.yml`, `.flake8`
   - Formatters: `.prettierrc*`, `black.toml`, `.rustfmt.toml`
   - Type checkers: `tsconfig.json`, `mypy.ini`, `pyrightconfig.json`

3. **Check for CI:**
   - `.github/workflows/*.yml`
   - `.gitlab-ci.yml`
   - `Jenkinsfile`
   - `.circleci/config.yml`

Note what you find - this guides which analyses are relevant.

### Step 3: Run Relevant Analyses

For each analysis, adapt to the detected stack. Skip analyses that don't apply.

---

#### Analysis A: Config vs Reality Gaps

**Goal:** Find configs that exist but aren't enforced in code.

**Approach:** For each config file found, check if the codebase respects it.

| If you find... | Grep for violations... |
|----------------|----------------------|
| `tsconfig.json` with `strict: true` | `@ts-ignore`, `@ts-expect-error`, `: any` |
| `.eslintrc*` or `eslint.config.*` | `eslint-disable`, `eslint-disable-line`, `eslint-disable-next-line` |
| `mypy.ini` or `pyproject.toml` [tool.mypy] | `# type: ignore`, `# mypy: ignore` |
| `.flake8` or `setup.cfg` [flake8] | `# noqa`, `# noqa:` |
| `golangci.yml` | `//nolint`, `// nolint` |
| `.rubocop.yml` | `# rubocop:disable` |
| `Cargo.toml` with strict lints | `#[allow(` |

**Steps:**
1. Read the config file to confirm it's active
2. Grep for violation patterns in source files
3. Count total violations
4. Note top 5 file paths as evidence

**Report if:** config exists AND violations > 0

**Insight format:**
```
CONFIG GAP: [Config] is configured but [N] bypass comments found in code
Evidence: [file1], [file2], ...
Severity: high (>20) | medium (5-20) | low (<5)
```

---

#### Analysis B: Naming Convention Patterns

**Goal:** Discover what naming patterns exist and find inconsistencies.

**Approach:** Don't assume patterns - discover them from the codebase.

**Steps:**
1. Glob for common architectural patterns in `src/` or project root:
   ```
   **/*[Cc]ontroller*    **/*[Ss]ervice*     **/*[Rr]epository*
   **/*[Hh]andler*       **/*[Mm]odel*       **/*[Ee]ntity*
   **/*[Uu]se[Cc]ase*    **/*[Cc]ommand*     **/*[Qq]uery*
   **/*_test.*           **/*_spec.*         **/*.test.*
   ```

2. For each pattern with 3+ matches, analyze:
   - What suffix/prefix is dominant? (e.g., `.service.ts` vs `Service.ts` vs `_service.py`)
   - Are there files that look like they should match but don't?
   - What's the consistency percentage?

3. Check file casing consistency:
   - Glob all source files in key directories
   - Categorize: `kebab-case`, `snake_case`, `camelCase`, `PascalCase`
   - Identify dominant pattern and exceptions

**Report if:** a pattern exists with exceptions (consistency < 100%)

**Insight format:**
```
NAMING PATTERN: [N] files use [pattern], but [M] exceptions found
Dominant: user.service.ts, auth.service.ts, ...
Exceptions: legacyUserSvc.ts, oldAuthController.ts
Consistency: [X]%
```

---

#### Analysis C: Test Structure Patterns

**Goal:** Discover how tests are written and find inconsistencies.

**Approach:** Sample test files and detect patterns.

**Steps:**
1. Find test files (adapt to language):
   - JS/TS: `**/*.spec.ts`, `**/*.test.ts`, `**/*.spec.js`, `**/*.test.js`
   - Python: `**/test_*.py`, `**/*_test.py`
   - Go: `**/*_test.go`
   - Ruby: `**/*_spec.rb`
   - Java: `**/*Test.java`, `**/*Tests.java`

2. Sample 5-10 test files and read them

3. Detect language-appropriate patterns:

   **JS/TS (Jest/Vitest/Mocha):**
   - Factory functions: `create*Factory`, `build*`, `Factory(`
   - Nested describes: `describe(` inside `describe(`
   - Setup hooks: `beforeEach(`, `beforeAll(`
   - Mocking: `jest.mock(`, `vi.mock(`, `sinon.`

   **Python (pytest):**
   - Fixtures: `@pytest.fixture`, `def fixture_`
   - Parametrize: `@pytest.mark.parametrize`
   - Factory pattern: `factory`, `create_`, `build_`
   - Mocking: `@patch`, `mock.`, `MagicMock`

   **Go:**
   - Table-driven tests: `tests := []struct`
   - Subtests: `t.Run(`
   - Test helpers: `testutil`, `helper`

   **Ruby (RSpec):**
   - Factories: `FactoryBot`, `factory :`, `build(:`, `create(:`
   - Contexts: `context "when`
   - Let blocks: `let(:`, `let!(`

4. Calculate frequency of each pattern
5. Find files that don't follow dominant patterns

**Report if:** pattern frequency is 40-90% (interesting variation)

**Insight format:**
```
TEST PATTERN: [X]% of tests use [pattern], [Y]% don't
Using it: [test1], [test2], ...
Not using it: [test3], [test4], ...
```

---

#### Analysis D: CI vs Local Workflow Gaps

**Goal:** Find CI commands that can't be run locally.

**Approach:** Compare CI config with local scripts/commands.

**Steps:**
1. Read project manifest for available scripts:
   - `package.json` → `scripts` object
   - `pyproject.toml` → `[tool.poetry.scripts]` or `[project.scripts]`
   - `Makefile` → targets
   - `Taskfile.yml` → tasks
   - `justfile` → recipes

2. Read CI configuration:
   - `.github/workflows/*.yml` → extract `run:` commands
   - `.gitlab-ci.yml` → extract `script:` commands
   - Other CI files → extract commands

3. Parse CI to find script invocations:
   - `npm run X`, `yarn X`, `pnpm X`
   - `python -m X`, `poetry run X`
   - `make X`
   - `go X`

4. Compare: which CI commands have no local equivalent?

**Report if:** at least 1 CI command has no local equivalent

**Insight format:**
```
WORKFLOW GAP: CI runs [N] commands that aren't available locally
CI commands: lint, test, typecheck, security-scan, ...
Local scripts: lint, test, ...
Missing locally: typecheck, security-scan
```

---

#### Analysis E: File Creation Patterns

**Goal:** Find boilerplate patterns to generate creation commands.

**Approach:** Sample similar files and extract what's common.

**Steps:**
1. Identify file types with 3+ instances:
   - Controllers, Services, Repositories, Handlers
   - Models, Entities, DTOs
   - UseCases, Commands, Queries
   - Components, Views, Pages

2. For each file type, sample 3-5 files and read them

3. Extract common elements (language-appropriate):

   **Object-oriented languages:**
   - Base class: `extends X`, `: X`, `< X`
   - Interfaces: `implements X`, `: X`
   - Decorators/Annotations: `@X`, `[X]`
   - Common imports (appear in ALL samples)
   - Constructor/init dependencies
   - Common method signatures

   **Functional languages:**
   - Module structure
   - Common imports
   - Function signatures
   - Type definitions

4. Extract variable elements:
   - Name (always varies)
   - Specific business logic
   - Domain-specific dependencies

**Report if:** clear common structure found (same base class/interface OR same decorators OR same imports)

**Insight format:**
```
FILE PATTERN: All [N] [FileType] files share common structure
Common: [base class], [decorators], [imports], [methods]
Variable: [name], [specific logic]
Evidence: [sample files]
```

---

### Step 4: Generate Artifacts

Based on discovered insights, generate Standards and Commands.

#### From CONFIG GAP insights → Standard

```yaml
name: "[Config Name] Enforcement"
summary: "Enforce [config] rules by eliminating bypass patterns"
description: |
  Discovered: [insight description]
  Evidence: [N] violations found across [M] files
rules:
  - content: "Avoid [bypass pattern] - address the underlying issue instead"
    examples:
      positive: "[fix the issue properly]"
      negative: "[example bypass from codebase]"
```

#### From NAMING PATTERN insights → Standard

```yaml
name: "Naming Conventions"
summary: "Consistent [pattern] naming based on existing codebase patterns"
description: |
  Discovered: [X]% of files follow this pattern
  Exceptions: [list exceptions]
rules:
  - content: "Name [file type] files using [detected pattern]"
    examples:
      positive: "[dominant pattern example]"
      negative: "[exception example]"
```

#### From TEST PATTERN insights → Standard

```yaml
name: "Test Structure"
summary: "Consistent test patterns based on codebase conventions"
description: |
  Discovered: [X]% of tests use this pattern
rules:
  - content: "[pattern description]"
    examples:
      positive: "[from file that follows]"
      negative: "[from file that doesn't]"
```

#### From WORKFLOW GAP insights → Command

```yaml
name: "Pre-Commit Check"
summary: "Run the same checks CI runs, locally"
whenToUse:
  - "Before pushing changes"
  - "After significant modifications"
steps:
  - name: "[Step]"
    description: "[What it does]"
    codeSnippet: "[command]"
  # Include steps for missing commands with "TODO: add this script"
```

#### From FILE PATTERN insights → Command

```yaml
name: "Create [FileType]"
summary: "Create a new [FileType] following project conventions"
whenToUse:
  - "Adding a new [filetype]"
contextValidationCheckpoints:
  - "What is the name?"
  - "What module/domain does it belong to?"
steps:
  - name: "Create file"
    description: "Create with standard structure"
    codeSnippet: |
      [common imports]

      [common decorators/annotations]
      [class/function definition with common structure]
        [common methods/functions]
  - name: "Create test"
    description: "Create corresponding test file"
  - name: "Register/Export"
    description: "Add to module/index as needed"
```

---

### Step 5: Present Results

```
============================================================
  PACKMIND ONBOARDING RESULTS
============================================================

Stack detected: [language], [frameworks], [tools]

INSIGHTS:

  1. [Insight title]
     evidence: [files]

  2. [Insight title]
     evidence: [files]

  3. [Insight title]
     evidence: [files]

GENERATED ARTIFACTS:

  Standards ([N]):
    • [Name] ([M] rules)
    ...

  Commands ([N]):
    • [Name] ([M] steps)
    ...

============================================================

[a] Apply to repo | [p] Preview artifact | [q] Quit
```

### Step 6: Handle User Choice

**[a] Apply:**
- Create `.packmind/standards/[name].yaml` for each Standard
- Create `.packmind/commands/[name].yaml` for each Command
- Confirm what was written

**[p] Preview:**
- Show full YAML for selected artifact
- Return to menu

**[q] Quit:**
- Exit without writing

---

## Rules

- **Language agnostic.** Detect what exists, don't assume conventions.
- **Evidence required.** Every insight needs file paths.
- **Skip irrelevant analyses.** No Python tests in a Go project.
- **Discover, don't assume.** Find patterns from the code itself.
- **Wow factor.** Report surprises, not obvious facts.

## Quality Checklist

Before reporting an insight:
- [ ] It applies to THIS codebase's detected stack
- [ ] It reveals something non-obvious
- [ ] It has concrete file path evidence
- [ ] It maps to an actionable artifact
```

---

## Implementation

Update `OnboardDeployer.ts` with this skill content. Single file change.

---

## Key Differences from Previous Version

| Before | After |
|--------|-------|
| Hardcoded: `@ts-ignore`, `.controller.ts` | Adapts to detected stack |
| Assumes TypeScript/NestJS | Works with any language |
| Fixed patterns to search | Discovers patterns from codebase |
| Language-specific examples | Language-appropriate analysis |
