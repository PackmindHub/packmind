import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';

function getOnboardSkillMd(): string {
  return `---
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
- **Preserve existing.** Never overwrite existing artifacts. If a slug already exists, create \`-2\`, \`-3\`, etc.
- **Evidence required.** Every reported insight must include file-path evidence (and line ranges when feasible).
- **Focused output.** Max **5 Standards** and **5 Commands** generated per run.
- **Graceful failure.** Partial failures don't lose successful work; failed drafts are preserved.
- **User control.** When packages exist, users confirm package selection before creation.

## Definitions

- **Pattern (non-linter):** a convention a linter cannot reliably enforce (module boundaries, cross-domain communication, workflow parity, error semantics, etc).
- **Evidence:** \`path[:line-line]\` entries; omit line ranges only when the file isn't text-searchable.

---

## Step 0 — Introduction

Print exactly:

\`\`\`
I'll start the Packmind onboarding process. I'll create your first standards and commands and send them to your Packmind organization. This usually takes ~3 minutes.
\`\`\`

---

## Step 1 — Get Repository Name

Get the repository name for package naming:

\`\`\`bash
basename "$(git rev-parse --show-toplevel)"
\`\`\`

Remember this as the repository name for package creation in Step 2.

---

## Step 2 — Package Handling

Handle package creation or selection.

### Check existing packages

List available packages:

\`\`\`bash
packmind-cli install --list
\`\`\`

Parse the output to get package names.

### No packages exist

Auto-create package using repository name:

\`\`\`bash
packmind-cli packages create "\${REPO_NAME}-standards"
\`\`\`

Print:
\`\`\`
No existing packages found — created a new one: \${REPO_NAME}-standards
\`\`\`

### One package exists

Ask via AskUserQuestion:
- "Add to \`{package-name}\`?"
- "Create new package instead"

### Multiple packages exist

Ask via AskUserQuestion:
- List each existing package as an option
- Include "Create new package" option

### If "Create new package" is selected

- Ask for package name (suggest \`\${REPO_NAME}-standards\` as default)
- Run: \`packmind-cli packages create <name>\`

Remember the selected/created package name for later reference.

---

## Step 3 — Announce

Print exactly:

\`\`\`
packmind-onboard: analyzing codebase (read-only)
Target package: [package-name]
\`\`\`

---

## Step 4 — Detect Existing Packmind and Agent Configuration

Before analyzing, detect and preserve any existing Packmind/agent configuration.

### Glob (broad, future-proof)
Glob for markdown in these roots (recursive):
- \`.packmind/**/*.md\`
- \`.claude/**/*.md\`
- \`.agents/**/*.md\`
- \`**/skills/**/*.md\`
- \`**/rules/**/*.md\`

### Classify
Classify found files into counts:
- **standards**: \`.packmind/standards/**/*.md\`
- **commands**: \`.packmind/commands/**/*.md\`
- **other_docs**: any markdown under \`.claude/\`, \`.agents/\`, or any \`skills/\` or \`rules/\` directory outside \`.packmind\`

If any exist, print exactly:

\`\`\`
Existing Packmind/agent docs detected:

    Standards: [N]

    Commands: [M]

    Other docs: [P]
\`\`\`

No overwrites. New files (if you Export) will be added next to the existing ones.

---

## Step 5 — Detect Project Stack (Minimal, Evidence-Based)

### Language markers (check presence)
- JS/TS: \`package.json\`, \`pnpm-lock.yaml\`, \`yarn.lock\`, \`tsconfig.json\`
- Python: \`pyproject.toml\`, \`requirements.txt\`, \`setup.py\`
- Go: \`go.mod\`
- Rust: \`Cargo.toml\`
- Ruby: \`Gemfile\`
- JVM: \`pom.xml\`, \`build.gradle\`, \`build.gradle.kts\`
- .NET: \`*.csproj\`, \`*.sln\`
- PHP: \`composer.json\`

### Architecture markers (check directories)
- Hexagonal/DDD: \`src/application/\`, \`src/domain/\`, \`src/infra/\`
- Layered/MVC: \`src/controllers/\`, \`src/services/\`
- Monorepo: \`packages/\`, \`apps/\`

Print exactly:

\`\`\`
Stack detected (heuristic):

    Languages: [..]

    Repo shape: [monorepo|single]

    Architecture markers: [..|none]
\`\`\`

---

## Step 6 — Run Analyses

Read each reference file for detailed search patterns, thresholds, and insight templates.

| Analysis | Reference File | Output focus |
|----------|----------------|--------------|
| File Template Consistency | \`references/file-template-consistency.md\` | Commands |
| CI/Local Workflow Parity | \`references/ci-local-workflow-parity.md\` | Commands |
| Role Taxonomy Drift | \`references/role-taxonomy-drift.md\` | Standards |
| Test Data Construction | \`references/test-data-construction.md\` | Standards |

### Output schema (internal; do not print as-is to user)
For every finding, keep an internal record:

\`\`\`
INSIGHT:
title: ...
why_it_matters: ...
confidence: [high|medium|low]
evidence:
- path[:line-line]
where_it_doesnt_apply:
- path[:line-line]
\`\`\`

---

## Step 7 — Generate All Drafts

Generate all draft files in one batch, using the formats defined above.

### Standard Draft Format

For each Standard insight, create a Markdown file at \`.packmind/standards/_drafts/<slug>.draft.md\`:

\`\`\`markdown
# Standard Name

What the standard covers and why.

## Scope

Where this standard applies (e.g., 'TypeScript files', 'React components').

## Rules

### Rule starting with action verb

Another rule can follow...

## Examples

### Good

\`\`\`typescript
// Valid code example
\`\`\`

### Bad

\`\`\`typescript
// Invalid code example
\`\`\`
\`\`\`

### Command Draft Format

For each Command insight, create a Markdown file at \`.packmind/commands/_drafts/<slug>.draft.md\`:

\`\`\`markdown
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

\`\`\`typescript
// Optional code example
\`\`\`

### 2. Another Step

Description of next step...
\`\`\`

### Generation Rules

- Generate drafts **only from discovered insights** (no invention)
- Use evidence from analysis to populate rules/steps
- Cap output: max **5 Standards** + **5 Commands**
- Never overwrite existing files; append \`-2\`, \`-3\`, etc. if slug exists

---

## Step 8 — Present Summary & Confirm

Present the generated draft files and ask for confirmation:

\`\`\`
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
\`\`\`

Then ask via AskUserQuestion with three options:

- **Create all now** — Proceed with creating all standards and commands
- **Let me review drafts first** — Pause to allow editing, re-run skill when ready
- **Cancel** — Exit without creating anything

---

## Step 9 — Create Items

### If user selected "Create all now"

**IMPORTANT:** The CLI only accepts JSON playbook files, not markdown. Before calling the CLI, convert each \`.draft.md\` file to a \`.json\` file.

#### Standard JSON Schema

Convert the markdown draft to this JSON format:

\`\`\`json
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
\`\`\`

#### Command JSON Schema

Convert the markdown draft to this JSON format:

\`\`\`json
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
\`\`\`

#### Conversion and Creation Process

**For each standard draft:**

1. Read the \`.draft.md\` file
2. Convert to JSON matching the schema above
3. Write the JSON to \`.packmind/standards/_drafts/<slug>.json\`
4. Run CLI command to create:
\`\`\`bash
packmind-cli standards create .packmind/standards/_drafts/<slug>.json
\`\`\`
5. If creation succeeded, add to package:
\`\`\`bash
packmind-cli packages add --to <package-slug> --standard <slug>
\`\`\`
6. Track result (success/failure)

**For each command draft:**

1. Read the \`.draft.md\` file
2. Convert to JSON matching the schema above
3. Write the JSON to \`.packmind/commands/_drafts/<slug>.json\`
4. Run CLI command to create:
\`\`\`bash
packmind-cli commands create .packmind/commands/_drafts/<slug>.json
\`\`\`
5. If creation succeeded, add to package:
\`\`\`bash
packmind-cli packages add --to <package-slug> --command <slug>
\`\`\`
6. Track result (success/failure)

**Show progress:**
\`\`\`
Sending standards and commands to your Packmind organization...
✓ error-handling-pattern
✓ naming-conventions
✗ test-factory-patterns (error: duplicate name exists)
✓ run-full-test-suite

Done: 3 created, 1 failed
\`\`\`

### If user selected "Let me review drafts first"

Print:
\`\`\`
Draft files ready for review at:
  - .packmind/standards/_drafts/
  - .packmind/commands/_drafts/

Edit them as needed, then re-run this skill to continue.
\`\`\`

Exit the skill.

### If user selected "Cancel"

Print:
\`\`\`
Onboarding cancelled.
Draft files remain at .packmind/*/_drafts/ if you want to review them later.
\`\`\`

Exit the skill.

---

## Step 10 — Completion Summary

### All items created successfully

\`\`\`
============================================================
  ✅ ONBOARDING COMPLETE
============================================================

Package: [package-name]
Created: [N] standards, [M] commands

Your standards and commands have been created and deployed locally.
They are now active in your AI coding assistant.

Next steps:
  - Visit app.packmind.com to manage your standards and commands
  - Run \`packmind-cli install\` in other repos to distribute them
============================================================
\`\`\`

Clean up successful draft files after creation.

### Partial success (some items failed)

\`\`\`
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
  packmind-cli standards create <file>
  packmind-cli packages add --to <package-slug> --standard <slug>
  packmind-cli commands create <file>
  packmind-cli packages add --to <package-slug> --command <slug>
============================================================
\`\`\`

Keep failed draft files for user to fix and retry.

### No patterns discovered

If analysis found no patterns:

\`\`\`
============================================================
  ℹ️ NO PATTERNS DISCOVERED
============================================================

The analysis didn't find enough recurring patterns to generate standards or commands.

This can happen with smaller codebases or projects with very diverse coding styles.
You can try again later as the codebase grows, or create standards manually with:
  packmind-cli standards create <file>
============================================================
\`\`\`

---

## Edge Cases

### Package creation fails

If \`packmind-cli packages create\` fails:

\`\`\`
❌ Failed to create package: [error message]

Please check:
  - You are logged in: \`packmind-cli login\`
  - Your network connection is working
  - The package name is valid

Cannot proceed with onboarding until package is created.
\`\`\`

Exit the skill. Do not proceed to analysis.

### Not logged in

If CLI commands fail with authentication errors:

\`\`\`
❌ Not logged in to Packmind

Please run:
  packmind-cli login

Then re-run this skill.
\`\`\`

### No packages available

If \`packmind-cli install --list\` returns no packages:

Auto-create a package using the repository name.

---

### 9.1 Deploy Locally (after successful creation)

Since the onboard skill is present, the user has configured an AI agent. Deploy the created artifacts locally:

\`\`\`bash
packmind-cli install
\`\`\`

This deploys to agent-specific folders:

| Agent | Standards | Commands |
|-------|-----------|----------|
| Claude | \`.claude/rules/packmind/standard-[slug].md\` | \`.claude/commands/packmind/[slug].md\` |
| Cursor | \`.cursor/rules/packmind/standard-[slug].mdc\` | \`.cursor/commands/packmind/[slug].mdc\` |
| Copilot | \`.github/instructions/packmind-standard-[slug].instructions.md\` | \`.github/prompts/packmind-[slug].prompt.md\` |

### 9.2 Cleanup and Summary

Delete the draft files, then print final summary:

\`\`\`
============================================================
  PUBLISHED & DEPLOYED
============================================================

Standards and commands have been sent to your Packmind organization
and deployed to your AI coding assistant's configuration files.

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
\`\`\`

**If user declines (N):**

Print:

\`\`\`
Draft files ready for review at:
  - .packmind/standards/_drafts/
  - .packmind/commands/_drafts/

Edit them as needed, then re-run this skill to create them.
\`\`\`
`;
}

// Reference file contents
function getTestDataConstructionMd(): string {
  return `# Test Data Construction Patterns

Determine how tests construct data: helpers/builders, inline literals, fixtures, or mixed.

## Search Patterns

### Test File Locations

\`\`\`
# Directories
test/
tests/
__tests__/
spec/
specs/

# File patterns
*.test.ts
*.test.js
*.test.tsx
*.test.jsx
*.spec.ts
*.spec.js
*.spec.tsx
*.spec.jsx
*_test.go
*_test.py
test_*.py
*Test.java
*Spec.scala
\`\`\`

### Helper/Builder Patterns

\`\`\`
# Factory functions
Factory
factory(
createMock
buildMock
make(
build(
generate(
fake(
stub(

# Builder patterns
Builder
.build()
.create()
.with(
.having(

# Test data libraries
faker
Faker
@faker-js
factory-girl
fishery
test-data-bot
FactoryBot
factory_bot
Fabricator
\`\`\`

### Fixture/Seed Patterns

\`\`\`
# Fixture files
fixtures/
__fixtures__/
seeds/
mocks/
stubs/

# Fixture loading
loadFixture
readFixture
importFixture
fixture(
seed(
\`\`\`

### Inline Construction Indicators

\`\`\`
# Direct object creation in tests
const mock = {
let testData = {
const input = {
new TestEntity(
Object.assign(
{ ...baseData,
\`\`\`

## Classification Criteria

| Pattern | Indicators |
|---------|------------|
| **Helpers/builders** | Dedicated factory functions reused across ≥3 test files |
| **Inline** | Objects created directly in test bodies; no shared helpers |
| **Fixtures** | External JSON/YAML files or fixture directories |
| **Mixed** | Multiple patterns without dominant approach |

## Sampling Method

1. List test files by path, sort ascending
2. Sample first 10 files (or all if <10)
3. For each file, classify primary data construction method
4. Detect shared builders: same helper imported in ≥3 tests

## Reporting Threshold

Report only if:
- ≥2 patterns appear in sample, OR
- Shared builder exists but many tests still use inline (inconsistency)

## Insight Template

\`\`\`
INSIGHT:
  id: TEST-[n]
  title: "TEST DATA: construction patterns vary ([X]% helpers, [Y]% inline, [Z]% fixtures)"
  summary: "Test data is constructed using [dominant pattern]. [inconsistencies if any]"
  confidence: [high|medium|low]
  evidence:
    - path[:line-line] — uses [pattern]
  exceptions:
    - path[:line-line] — diverges from dominant pattern
\`\`\`

## Standard/Command Suggestions

- **Standard**: "Use test factories for domain entities" (if inline dominant but factories exist)
- **Standard**: "Prefer builder pattern for complex test data" (if mixed patterns)
- **Command**: "Create test factory" (if helpers pattern established)
`;
}

function getFileTemplateConsistencyMd(): string {
  return `# File Template Consistency

Detect repeatable file templates and propose "Create X" commands for scaffolding.

## Search Patterns

### Common File Roles

\`\`\`
# Controllers / Handlers
*Controller.ts
*Controller.js
*Handler.ts
*Handler.js
*controller.py
*_controller.rb
*Controller.java

# Services
*Service.ts
*Service.js
*service.py
*_service.rb
*Service.java

# Use Cases
*UseCase.ts
*UseCase.js
*Interactor.ts
*usecase.go
*_use_case.rb

# Repositories
*Repository.ts
*Repository.js
*Repo.ts
*repository.py
*_repository.rb
*Repository.java

# DTOs / Value Objects
*DTO.ts
*Dto.ts
*Request.ts
*Response.ts
*VO.ts
*ValueObject.ts

# Mappers / Adapters
*Mapper.ts
*Adapter.ts
*Converter.ts

# Components (Frontend)
*.component.tsx
*.component.ts
*Component.tsx
*Component.vue

# Hooks (React)
use*.ts
use*.tsx
\`\`\`

### Structure Markers to Extract

\`\`\`
# Base classes / interfaces
extends Abstract
extends Base
implements I
implements Interface

# Decorators / annotations
@Controller
@Injectable
@Service
@Repository
@Component
@Module
@Entity
@UseCase

# Constructor injection
constructor(
  private readonly
  private final
  @Inject
  @Autowired

# Standard methods
async execute(
async handle(
async run(
async invoke(
def execute(
def handle(
def call(

# Required exports
export class
export default
export const
module.exports
\`\`\`

### Directory Conventions

\`\`\`
# Check for consistent placement
src/controllers/
src/services/
src/useCases/
src/use-cases/
src/application/
src/domain/
src/infra/
src/infrastructure/
src/repositories/
src/handlers/
\`\`\`

## Analysis Method

1. Identify file categories with ≥5 instances (by naming + directory)
2. Read 3-5 representative files per category
3. Extract shared structure:
   - Base class/interface
   - Required decorators
   - Constructor pattern
   - Standard method signatures
   - Export pattern

## Reporting Threshold

Report only if:
- ≥5 files in category AND
- ≥3 share ≥2 structure markers

## Insight Template

\`\`\`
INSIGHT:
  id: TMPL-[n]
  title: "FILE PATTERN: [FileType] follows consistent template"
  summary: "[N] [FileType] files share [markers]. Scaffolding can be automated."
  confidence: [high|medium|low]
  evidence:
    - path[:line-line] — shows [marker]
  template_markers:
    - base_class: [name or none]
    - decorators: [list]
    - constructor_pattern: [description]
    - required_methods: [list]
    - export_pattern: [description]
\`\`\`

## Command Template

When a file pattern is detected, propose a command:

\`\`\`yaml
name: "create-[file-type]"
summary: "Scaffold a new [FileType] with standard structure"
whenToUse:
  - "Adding a new [file-type] to the codebase"
  - "Need consistent [file-type] structure"
contextValidationCheckpoints:
  - "What is the name of the new [file-type]?"
  - "Which module/domain does it belong to?"
steps:
  - name: "Create file"
    description: "Create [file-type] with standard template"
    codeSnippet: |
      [extracted template]
  - name: "Add to index"
    description: "Export from module index if pattern requires"
  - name: "Create test file"
    description: "Create corresponding test file"
\`\`\`
`;
}

function getCiLocalWorkflowParityMd(): string {
  return `# CI / Local Workflow Parity

Identify CI steps that cannot be run locally; propose "Pre-PR Quality Check" command.

## Search Patterns

### CI Configuration Files

\`\`\`
# GitHub Actions
.github/workflows/*.yml
.github/workflows/*.yaml

# GitLab CI
.gitlab-ci.yml
.gitlab-ci.yaml

# CircleCI
.circleci/config.yml

# Azure Pipelines
azure-pipelines.yml
azure-pipelines.yaml

# Jenkins
Jenkinsfile

# Travis CI
.travis.yml

# Bitbucket Pipelines
bitbucket-pipelines.yml

# Generic
ci.yml
ci.yaml
pipeline.yml
\`\`\`

### Local Script Definitions

\`\`\`
# Node.js
package.json (scripts section)
pnpm-workspace.yaml

# Make
Makefile
makefile
GNUmakefile

# Task runners
Taskfile.yml
Taskfile.yaml
Justfile
justfile

# Python
pyproject.toml ([tool.poetry.scripts], [project.scripts])
setup.py (entry_points)
tox.ini
noxfile.py

# Ruby
Rakefile
bin/*

# Go
Makefile
mage.go

# Nx / Monorepo
nx.json
project.json
\`\`\`

### Pre-commit Hooks

\`\`\`
.husky/
.husky/pre-commit
.husky/pre-push
.pre-commit-config.yaml
lefthook.yml
lint-staged.config.js
\`\`\`

### Common CI Steps to Check

\`\`\`
# Testing
npm test
npm run test
yarn test
pnpm test
pytest
go test
cargo test
dotnet test
mvn test
gradle test

# Linting
npm run lint
eslint
prettier
pylint
flake8
golangci-lint
cargo clippy
rubocop

# Type checking
tsc --noEmit
mypy
pyright

# Building
npm run build
yarn build
go build
cargo build
dotnet build
mvn package

# Security scanning
npm audit
snyk
trivy
safety check
cargo audit

# Code coverage
coverage
nyc
jest --coverage
codecov

# E2E tests
cypress
playwright
selenium

# Docker operations
docker build
docker-compose
\`\`\`

## Analysis Method

1. Parse local script definitions (package.json scripts, Makefile targets, etc.)
2. Parse CI config files (extract \`run:\` commands)
3. For each CI command:
   - Check if equivalent exists locally
   - Flag if no local entrypoint
4. Identify Docker-dependent steps that assume CI environment

## Reporting Threshold

Report only if:
- ≥1 meaningful CI step lacks local entrypoint

## Insight Template

\`\`\`
INSIGHT:
  id: CILOCAL-[n]
  title: "WORKFLOW GAP: [N] CI steps lack local entrypoints"
  summary: "CI runs [steps] that cannot be easily reproduced locally."
  confidence: [high|medium|low]
  evidence:
    ci_only_steps:
      - step: "[command]"
        ci_file: path[:line]
        local_equivalent: "none" | "[partial match]"
  local_scripts:
    - path — defines [N] scripts
\`\`\`

## Command Template

When workflow gaps exist, propose:

\`\`\`yaml
name: "pre-pr-quality-check"
summary: "Run all CI checks locally before creating a PR"
whenToUse:
  - "Before creating a pull request"
  - "After completing a feature to verify CI will pass"
  - "When CI fails and you want to debug locally"
contextValidationCheckpoints:
  - "Are all dependencies installed?"
  - "Is the development environment configured?"
steps:
  - name: "Run linting"
    description: "Execute lint checks"
    codeSnippet: |
      [extracted from CI or local scripts]
  - name: "Run type checking"
    description: "Verify type correctness"
    codeSnippet: |
      [extracted from CI or local scripts]
  - name: "Run tests"
    description: "Execute test suite"
    codeSnippet: |
      [extracted from CI or local scripts]
  - name: "Run build"
    description: "Verify build succeeds"
    codeSnippet: |
      [extracted from CI or local scripts]
\`\`\`

## Gap Categories

| Category | CI Example | Local Gap |
|----------|------------|-----------|
| **Security** | \`npm audit --audit-level=high\` | Often not in package.json scripts |
| **Coverage** | \`--coverage --coverageThreshold\` | Thresholds may differ locally |
| **E2E** | \`cypress run\` | May require specific env setup |
| **Docker** | \`docker build\` | Requires Docker daemon |
| **Secrets** | env var checks | Secrets not available locally |
`;
}
function getRoleTaxonomyDriftMd(): string {
  return `# Role Taxonomy Drift

Infer what Service/Handler/UseCase/Controller/Repository mean in practice and surface misnamed or mixed-responsibility hotspots.

## Search Patterns

### Common Role Names

\`\`\`
# Controllers (HTTP/presentation)
*Controller.ts
*Controller.js
*controller.py
*_controller.rb
*Controller.java
*Controller.go

# Handlers (event/command)
*Handler.ts
*Handler.js
*handler.py
*_handler.rb
*Handler.java

# Services (business logic)
*Service.ts
*Service.js
*service.py
*_service.rb
*Service.java

# Use Cases (application layer)
*UseCase.ts
*UseCase.js
*Interactor.ts
*use_case.py
*_use_case.rb

# Repositories (data access)
*Repository.ts
*Repository.js
*Repo.ts
*repository.py
*_repository.rb
*Repository.java

# Managers (ambiguous)
*Manager.ts
*Manager.js
*manager.py

# Helpers/Utils (utility)
*Helper.ts
*Utils.ts
*helper.py
*_helper.rb
\`\`\`

### Responsibility Indicators

\`\`\`
# IO operations (should be in repos/adapters)
.save(
.find(
.delete(
.update(
fetch(
axios.
http.
database.
query(
.execute(

# Business logic (should be in services/use cases)
validate
calculate
process
transform
apply
execute business rule

# Presentation concerns (should be in controllers)
@Get(
@Post(
@Put(
@Delete(
res.json(
res.send(
response.
request.
@Query(
@Body(
@Param(

# Event handling (should be in handlers)
@OnEvent(
@Subscribe(
.handle(
.process(
eventEmitter
\`\`\`

### Mixed Responsibility Indicators

\`\`\`
# Controller doing business logic
Controller.*{
  .*validate.*
  .*calculate.*
  .*process.*

# Service doing IO directly
Service.*{
  .*\\.save\\(
  .*\\.find\\(
  .*fetch\\(
  .*database\\.

# Repository doing business logic
Repository.*{
  .*validate.*
  .*calculate.*
  .*transform.*

# Handler doing presentation
Handler.*{
  .*res\\.json\\(
  .*response\\.
\`\`\`

## Analysis Method

1. **Enumerate files by role name**: Group by Controller/Service/UseCase/etc.
2. **Sample and analyze**: Read 3-5 files per role
3. **Classify actual responsibilities**:
   - Presentation: HTTP handling, request/response
   - Business logic: Validation, calculation, rules
   - Data access: Persistence, external calls
   - Orchestration: Coordinating other components
4. **Compare name vs actual**: Does "Service" do service things?
5. **Find mixed responsibilities**: Single file doing multiple concerns

## Expected Responsibilities

| Role | Expected | Red Flags |
|------|----------|-----------|
| **Controller** | HTTP handling, request mapping | Business logic, direct DB access |
| **Service** | Business logic, orchestration | HTTP concerns, raw queries |
| **UseCase** | Single business operation | Multiple concerns, infrastructure |
| **Handler** | Event/command processing | HTTP responses |
| **Repository** | Data access abstraction | Business rules, validation |
| **Manager** | Ambiguous - investigate | Often a code smell |

## Drift Categories

| Drift Type | Example | Impact |
|------------|---------|--------|
| **Bloated controller** | Controller with business logic | Hard to test, coupled |
| **Anemic service** | Service just delegates | Unnecessary layer |
| **Fat repository** | Repo with business rules | Logic in wrong layer |
| **Confused handler** | Handler doing everything | Unclear boundaries |
| **God manager** | Manager with all concerns | Unmaintainable |

## Reporting Threshold

Report only if:
- ≥3 files with same role name AND
- (Inconsistent responsibilities OR mixed concerns detected)

## Insight Template

\`\`\`
INSIGHT:
  id: ROLE-[n]
  title: "ROLE TAXONOMY: [role] has inconsistent meaning across codebase"
  summary: "[role] files show [N] different responsibility patterns."
  confidence: [high|medium|low]
  evidence:
    role_analysis:
      - role: "Service"
        expected: "business logic"
        actual_patterns:
          - "business logic" — [N] files
          - "data access" — [N] files (drift)
          - "HTTP handling" — [N] files (drift)
    mixed_responsibility_hotspots:
      - path[:line] — [role] doing [unexpected concern]
    naming_inconsistencies:
      - "UserService vs UserManager" — same responsibility
    recommendations:
      - "[file] should be renamed to [better name]"
\`\`\`

## Standard/Command Suggestions

- **Standard**: "Controllers handle HTTP only, delegate to use cases"
- **Standard**: "Services contain business logic, no IO"
- **Standard**: "Repositories abstract data access only"
- **Command**: "Extract business logic from controller"
`;
}
const ONBOARD_README = `# Packmind Onboarding Skill

Read-only codebase analysis skill that identifies non-linter architectural patterns and generates draft Packmind Standards and Commands.

## What It Does

1. **Detects existing configuration** - Shows what's already configured (standards, commands, agent docs)
2. **Detects your stack** - Language, monorepo structure, architecture markers
3. **Analyzes for non-linter patterns** - 4 architectural analyses across code organization, workflows, and testing
4. **Generates draft artifacts** - Max 5 Standards and 5 Commands per run
5. **Applies on your choice** - Nothing written without explicit confirmation

**Works with any language** - JavaScript, TypeScript, Python, Go, Ruby, Java, and more.

## Available Analyses

| Category | Analyses |
|----------|----------|
| **Infrastructure** | CI/Local Workflow Parity |
| **Code Organization** | File Template Consistency, Role Taxonomy Drift |
| **Testing** | Test Data Construction |

## Usage

Ask your AI agent to onboard:
- "Onboard this project to Packmind"
- "Analyze this codebase for standards"
- "Generate coding standards for this project"

## What You'll Discover

- **Test data patterns**: "23 factories with 1166 usages across test files"
- **File boilerplate**: "All UseCases extend AbstractMemberUseCase with same structure"
- **Workflow gaps**: "CI runs security scan, no local equivalent"
- **Role drift**: "3 role definitions with inconsistent naming across modules"

## What It Skips (Linter-Enforceable)

- ESLint disable counts
- TypeScript strict violations
- Formatting issues
- Import ordering

## License

Apache 2.0 - See LICENSE.txt for details.
`;

const ONBOARD_LICENSE = `
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS
`;

export class OnboardDeployer implements ISkillDeployer {
  public readonly slug = 'packmind-onboard';
  public readonly minimumVersion = 'unreleased';

  deploy(_agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-onboard`;
    const referencesPath = `${basePath}/references`;

    return {
      createOrUpdate: [
        {
          path: `${basePath}/SKILL.md`,
          content: getOnboardSkillMd(),
        },
        {
          path: `${basePath}/README.md`,
          content: ONBOARD_README,
        },
        {
          path: `${basePath}/LICENSE.txt`,
          content: ONBOARD_LICENSE,
        },
        // Reference files
        {
          path: `${referencesPath}/file-template-consistency.md`,
          content: getFileTemplateConsistencyMd(),
        },
        {
          path: `${referencesPath}/ci-local-workflow-parity.md`,
          content: getCiLocalWorkflowParityMd(),
        },
        {
          path: `${referencesPath}/role-taxonomy-drift.md`,
          content: getRoleTaxonomyDriftMd(),
        },
        {
          path: `${referencesPath}/test-data-construction.md`,
          content: getTestDataConstructionMd(),
        },
      ],
      delete: [],
    };
  }
}
