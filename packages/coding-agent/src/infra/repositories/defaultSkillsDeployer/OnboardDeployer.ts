import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';

function getOnboardSkillMd(): string {
  return `---
name: 'packmind-onboard'
description: "Read-only codebase analysis to identify non-linter architectural patterns and generate draft Packmind Standards and Commands."
license: 'Complete terms in LICENSE.txt'
---

# packmind-onboard

Action skill. Performs **read-only** repository analysis to discover **non-obvious, non-linter** patterns ("exotic insights"), then drafts **Standards** and **Commands** aligned with the codebase's real conventions.

## Guarantees

- **Read-only by default.** No files are written unless the user explicitly chooses to apply.
- **Preserve existing.** Never overwrite existing artifacts. If a slug already exists, create \`-2\`, \`-3\`, etc.
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

\`\`\`
packmind-onboard: analyzing codebase (read-only) — [QUICK|OPTIMAL] mode...
\`\`\`

## Step 3 — Detect Existing Packmind and Agent Configuration

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
- **agent_md**: any markdown under \`.claude/\`, \`.agents/\`, or any \`skills/\` or \`rules/\` directory outside \`.packmind\`

If any exist, print:

\`\`\`
Found existing configuration:
  - [N] standards
  - [M] commands
  - [P] agent docs

These will be preserved. New artifacts will be added alongside them.
\`\`\`

## Step 4 — Detect Project Stack (Minimal, Evidence-Based)

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

Output a short stack summary:
- languages detected
- monorepo vs single package
- any architecture marker match

## Step 5 — Run Analyses

Select and run analyses based on the chosen mode. Read each reference file for detailed search patterns, thresholds, and insight templates.

### Quick Mode Analyses (4 checks)

Run only these analyses for fast, high-value insights:

| Analysis | Reference File | Focus |
|----------|---------------|-------|
| File Template Consistency | \`references/file-template-consistency.md\` | Scaffolding patterns → Commands |
| CI/Local Workflow Parity | \`references/ci-local-workflow-parity.md\` | CI steps vs local scripts → Commands |
| Role Taxonomy Drift | \`references/role-taxonomy-drift.md\` | Service/Handler/UseCase meanings → Standards |
| Test Data Construction | \`references/test-data-construction.md\` | Factories, fixtures, inline → Standards |

### Optimal Mode Analyses (17 checks)

Run all analyses for comprehensive insights:

| Analysis | Reference File | Focus |
|----------|---------------|-------|
| File Template Consistency | \`references/file-template-consistency.md\` | Scaffolding patterns |
| CI/Local Workflow Parity | \`references/ci-local-workflow-parity.md\` | CI steps vs local scripts |
| Role Taxonomy Drift | \`references/role-taxonomy-drift.md\` | Service/Handler/UseCase meanings |
| Test Data Construction | \`references/test-data-construction.md\` | Factories, fixtures, inline |
| Cross-Domain Communication | \`references/cross-domain-communication.md\` | Events vs direct coupling |
| Module Boundaries | \`references/module-boundaries-dependencies.md\` | Dependency violations |
| Shared Kernel Drift | \`references/shared-kernel-drift.md\` | Utils as gravity wells |
| Public API Discipline | \`references/public-api-deep-imports.md\` | Entrypoint vs deep imports |
| Error Semantics | \`references/error-semantics.md\` | Exception vs Result vs sentinel |
| Data Boundary Leakage | \`references/data-boundary-leakage.md\` | ORM/DTO in core logic |
| Transaction Conventions | \`references/transaction-atomicity.md\` | Multi-write coordination |
| Concurrency Style | \`references/concurrency-style.md\` | Async model consistency |
| Config/Feature Flags | \`references/config-feature-flags.md\` | Centralized vs scattered |
| Observability Contract | \`references/observability-contract.md\` | Logging, tracing, context |
| Authorization Boundaries | \`references/authorization-boundary.md\` | Authz check placement |
| Schema Generation Boundary | \`references/schema-generation-boundary.md\` | Generated code discipline |
| Cross-Cutting Hotspots | \`references/cross-cutting-hotspots.md\` | God files, high coupling |

### Analysis Selection Strategy

**Quick mode:**
- Run all 4 Quick Mode analyses
- Skip conditional checks — focus on speed

**Optimal mode:**
1. **Always run**: All 17 analyses listed above
2. **Run if detected**: Additional depth for analyses matching detected stack
3. **Run on request**: Extra detail if user asks

### Output Schema (use for every insight)

\`\`\`
INSIGHT:
  id: [PREFIX]-[n]
  title: ...
  summary: ...
  confidence: [high|medium|low]
  evidence:
    - path[:line-line]
  exceptions:
    - path[:line-line]
\`\`\`

## Step 6 — Generate Draft Artifacts (Max 5 each)

Generate artifacts **only from reported exotic insights**.

### Standard format (draft)

\`\`\`yaml
name: "..."
summary: "..."
why_now: "Derived from observed repo patterns"
evidence:
  - path[:line-line]
rules:
  - content: "..."
    rationale: "..."
    examples:
      positive: "path[:line-line] — short snippet or description"
      negative: "path[:line-line] — short snippet or description"
\`\`\`

### Command format (draft)

\`\`\`yaml
name: "..."
summary: "..."
why_now: "..."
evidence:
  - path[:line-line]
contextValidationCheckpoints:
  - "..."
steps:
  - name: "..."
    codeSnippet: |
      ...
\`\`\`

## Step 7 — Present Results

Present a summary of findings:

\`\`\`
============================================================
  PACKMIND ONBOARDING RESULTS — [QUICK|OPTIMAL] MODE
============================================================

Existing configuration:
  - [N] standards | [M] commands | [P] agent docs

Stack detected: [languages], [monorepo?], [architecture markers]

Analyses run: [N] checks

INSIGHTS (exotic patterns only):
  1. [Title]
     evidence: [paths...]

GENERATED ARTIFACTS (draft, max 5 each):
  Standards ([N]):
    * [Name] - [one-line summary]
  Commands ([M]):
    * [Name] - [one-line summary]

============================================================
\`\`\`

Then use AskUserQuestion to offer options:
- **Apply** - Write all generated artifacts to the repository
- **Preview** - Show full content of a specific artifact before deciding
- **Quit** - Exit without writing any files

## Step 8 — Handle Choice

**Apply:**
- Write new files:
  - \`.packmind/standards/[slug].md\`
  - \`.packmind/commands/[slug].md\`
- Never overwrite. If slug exists, append \`-2\`, \`-3\`, etc.
- Show exactly what was written (paths + titles).

**Preview:**
- Show full content of selected artifact, then return to the options.

**Quit:**
- Print: \`Done. Run this skill again anytime.\`
`;
}

// Reference file contents
function getCrossDomainCommunicationMd(): string {
  return `# Cross-Domain Communication Patterns

Identify how modules/domains communicate: event-driven, direct coupling, or hybrid.

## Search Patterns

### Event-Driven Patterns

\`\`\`
# Emitters and dispatchers
emit(
dispatch(
publish(
fire(
trigger(
broadcast(
notify(

# Event infrastructure
EventEmitter
EventBus
EventDispatcher
MessageBroker
MessageQueue
PubSub

# Listeners and handlers
Listener
Handler
Subscriber
Observer
@OnEvent
@Subscribe
@EventHandler
@Listener
on('
addEventListener
\`\`\`

### Direct Coupling Patterns

\`\`\`
# Cross-module imports (look for sibling package imports)
from '../packages/
from '@packages/
from '../../modules/
import { } from '@domain/

# Service injection patterns
@Inject(
constructor(private readonly
\`\`\`

### Message Queue / Broker Patterns

\`\`\`
# Queue-based
BullMQ
Bull
RabbitMQ
amqplib
kafka
KafkaJS
SQS
sendMessage
receiveMessage

# Mediator patterns
Mediator
MediatR
CommandBus
QueryBus
send(
request(
\`\`\`

## Classification Criteria

| Pattern | Indicators |
|---------|------------|
| **Event-driven** | ≥60% of cross-module communication uses events; event infrastructure present |
| **Direct coupling** | Modules import each other directly; no event layer |
| **Hybrid** | Mix of event-driven and direct imports; no dominant pattern |
| **Message-queue** | Async communication via external broker (Bull, RabbitMQ, Kafka) |

## Reporting Threshold

Report only if:
- ≥5 evidence files showing communication patterns, OR
- ≥2 clear boundary violations (direct imports where events expected)

## Insight Template

\`\`\`
INSIGHT:
  id: COMM-[n]
  title: "COMMUNICATION: [Event-driven|Direct coupling|Hybrid|Message-queue] is dominant"
  summary: "Cross-module communication primarily uses [pattern]. [exceptions if any]"
  confidence: [high|medium|low]
  evidence:
    - path[:line-line]
  exceptions:
    - path[:line-line] — direct import where event expected
\`\`\`

## Standard/Command Suggestions

- **Standard**: "Use domain events for cross-module communication" (if event-driven is dominant but exceptions exist)
- **Standard**: "Decouple modules via message broker" (if direct coupling dominant but some event usage)
- **Command**: "Create domain event" (if event infrastructure exists but pattern unclear)
`;
}

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

function getModuleBoundariesDependenciesMd(): string {
  return `# Module Boundaries & Dependency Direction

Detect allowed vs actual dependencies, deep imports, and boundary violations.

## Search Patterns

### Module/Package Detection

\`\`\`
# Monorepo packages
packages/*/
apps/*/
libs/*/
modules/*/

# Domain modules (single repo)
src/modules/*/
src/domains/*/
src/features/*/
src/bounded-contexts/*/

# Layer-based
src/application/
src/domain/
src/infrastructure/
src/infra/
src/presentation/
\`\`\`

### Dependency Configuration Files

\`\`\`
# Nx
nx.json
project.json (implicitDependencies, tags)

# Lerna
lerna.json

# pnpm
pnpm-workspace.yaml

# Yarn
workspaces field in package.json

# TypeScript
tsconfig.json (paths, references)
tsconfig.base.json

# ESLint boundaries
.eslintrc.* (import/no-restricted-paths, boundaries/*)

# Go
go.mod
go.work

# Rust
Cargo.toml (workspace members)

# Python
pyproject.toml (packages)
\`\`\`

### Import Pattern Detection

\`\`\`
# Relative cross-module imports (violations)
from '../packages/
from '../../modules/
from '../../../domain/

# Absolute cross-module imports
from '@packages/
from '@modules/
from '@libs/
from '@app/

# Deep imports (potential violations)
from '@package/internal/
from '@module/src/
from '@lib/utils/helpers/
/private/
/internal/
/_internal/
\`\`\`

### Dependency Direction Rules (Common)

\`\`\`
# Hexagonal / Clean Architecture
domain <- application <- infrastructure
domain <- application <- presentation

# Typical violations
infrastructure -> domain (should be inverted)
presentation -> infrastructure (should go through application)

# Layer imports
/infra/ importing from /domain/ directly
/controllers/ importing from /repositories/
\`\`\`

## Analysis Method

1. **Enumerate modules**: List packages/apps/modules
2. **Build dependency graph**: For each module, extract imports
3. **Infer allowed dependencies**:
   - From config (Nx tags, ESLint rules, tsconfig paths)
   - From architecture markers (hexagonal layers)
4. **Detect violations**:
   - Cross-boundary imports not in allowed list
   - Deep imports bypassing entrypoints
   - Circular dependencies

## Dependency Graph Construction

\`\`\`
For each source file in module A:
  For each import statement:
    If import targets module B:
      Add edge A -> B
      Record import path (entrypoint vs deep)
\`\`\`

## Violation Categories

| Violation | Pattern | Severity |
|-----------|---------|----------|
| **Layer breach** | infra imports domain internals | High |
| **Deep import** | \`@pkg/src/internal/helper\` | Medium |
| **Circular** | A -> B -> C -> A | High |
| **Sibling coupling** | feature-a imports feature-b | Medium |
| **Upward dependency** | domain imports application | High |

## Reporting Threshold

Report only if:
- ≥3 modules exist AND
- ≥1 boundary violation detected

## Insight Template

\`\`\`
INSIGHT:
  id: DEPS-[n]
  title: "BOUNDARIES: [N] dependency violations across [M] modules"
  summary: "Module boundaries are [mostly respected|frequently violated]. [top violations]"
  confidence: [high|medium|low]
  evidence:
    violations:
      - from: "module-a"
        to: "module-b"
        type: "[layer-breach|deep-import|circular|sibling]"
        files:
          - path[:line] — imports [target]
  allowed_dependencies:
    - inferred from: "[config file or architecture]"
\`\`\`

## Standard/Command Suggestions

- **Standard**: "Respect module boundaries - no deep imports" (if deep imports common)
- **Standard**: "Domain layer has no infrastructure dependencies" (if layer breaches found)
- **Standard**: "Features must not import sibling features directly" (if sibling coupling found)
`;
}

function getSharedKernelDriftMd(): string {
  return `# Shared Kernel Drift

Find common/shared/utils packages that act as gravity wells and classify their contents.

## Search Patterns

### Shared Package Locations

\`\`\`
# Common directory names
packages/common/
packages/shared/
packages/utils/
packages/core/
packages/lib/
libs/shared/
libs/common/
libs/utils/
src/common/
src/shared/
src/utils/
src/helpers/
src/lib/

# Utility modules
**/utils/
**/helpers/
**/common/
**/shared/
**/core/
**/toolkit/
\`\`\`

### Content Classification Patterns

\`\`\`
# Pure utilities (acceptable in shared)
date.
time.
string.
array.
object.
math.
format.
parse.
validate.
sanitize.
hash.
crypto.
uuid.
logger.
config.

# Domain concepts (should NOT be in shared)
User
Account
Order
Product
Payment
Customer
Invoice
Entity
Aggregate
ValueObject
DomainEvent

# Infrastructure concerns (questionable in shared)
Database
Repository
Http
Api
Client
Service
Cache
Queue

# Type definitions
types.
interfaces.
*.d.ts
models/
schemas/
\`\`\`

### Import Analysis

\`\`\`
# Count inbound dependencies
import from '@shared/
import from '@common/
import from '@utils/
import from '../common/
import from '../shared/
from common import
from shared import
\`\`\`

## Analysis Method

1. **Identify shared packages**: Glob for common/shared/utils directories
2. **Count inbound dependencies**: How many modules import from shared?
3. **Classify contents**:
   - List all exports from shared package
   - Categorize: pure utility, domain concept, infrastructure
4. **Detect drift**: Domain concepts in shared = architectural smell

## Gravity Well Indicators

| Indicator | Threshold | Concern |
|-----------|-----------|---------|
| **High fan-in** | ≥50% of modules import shared | Potential coupling point |
| **Domain leakage** | ≥1 domain entity in shared | Architecture violation |
| **Growth rate** | Shared package is largest | Likely dumping ground |
| **Mixed concerns** | Utils + domain + infra | No clear boundary |

## Content Categories

| Category | Belongs in Shared? | Examples |
|----------|-------------------|----------|
| **Pure utilities** | Yes | \`formatDate()\`, \`slugify()\`, \`deepClone()\` |
| **Type guards** | Yes | \`isString()\`, \`isNonNull()\` |
| **Constants** | Maybe | \`HTTP_STATUS\`, \`REGEX_PATTERNS\` |
| **Domain types** | No | \`User\`, \`Order\`, \`Money\` |
| **Base classes** | Maybe | \`AbstractRepository\` (depends) |
| **Infrastructure** | No | \`HttpClient\`, \`DatabaseConnection\` |

## Reporting Threshold

Report only if:
- Shared package exists AND
- (≥5 modules depend on it OR domain concepts detected)

## Insight Template

\`\`\`
INSIGHT:
  id: SHARED-[n]
  title: "SHARED KERNEL: [package] is a gravity well with [N] dependents"
  summary: "[package] contains [classification]. [concerns if any]"
  confidence: [high|medium|low]
  evidence:
    package: "path/to/shared"
    dependents: [N]
    contents:
      pure_utilities: [count]
      domain_concepts: [count] — [list if >0]
      infrastructure: [count]
    concerning_exports:
      - name — "[domain|infra] concept in shared"
\`\`\`

## Standard/Command Suggestions

- **Standard**: "Shared packages contain only pure utilities" (if domain leakage found)
- **Standard**: "Domain concepts live in their bounded context" (if domain in shared)
- **Command**: "Extract domain concept from shared" (refactoring guidance)
`;
}

function getPublicApiDeepImportsMd(): string {
  return `# Public API vs Deep Import Discipline

Check whether consumers import from module entrypoints or reach into internal paths.

## Search Patterns

### Entrypoint Conventions

\`\`\`
# Index files (common entrypoints)
index.ts
index.js
index.tsx
index.jsx
mod.rs
__init__.py
package.json (main, exports)

# Explicit public API
/public/
/api/
/exports/

# TypeScript barrel exports
export * from './
export { } from './
\`\`\`

### Deep Import Indicators

\`\`\`
# Reaching into src
from '@pkg/src/
from '@module/src/

# Reaching into internals
from '@pkg/internal/
from '@pkg/_internal/
from '@pkg/private/
from '@pkg/lib/
from '@pkg/utils/
from '@pkg/helpers/

# Skipping index
from '@pkg/components/Button/Button'  # vs '@pkg/components/Button'
from '@pkg/services/UserService/impl'  # vs '@pkg/services'

# Path depth indicator
from '@pkg/a/b/c/d'  # Deep path = likely internal
../../packages/foo/src/bar/baz  # Relative deep import
\`\`\`

### Package.json Exports Field

\`\`\`json
{
  "exports": {
    ".": "./dist/index.js",
    "./utils": "./dist/utils/index.js"
  }
}
\`\`\`

### TypeScript Path Mapping

\`\`\`json
{
  "paths": {
    "@pkg": ["packages/pkg/src/index.ts"],
    "@pkg/*": ["packages/pkg/src/*"]  // Allows deep imports
  }
}
\`\`\`

## Analysis Method

1. **Identify modules with entrypoints**: Check for index files or exports field
2. **Scan imports across codebase**: Extract all cross-module imports
3. **Classify each import**:
   - Entrypoint: imports from module root or declared export
   - Deep: imports from internal path
4. **Calculate discipline ratio**: % entrypoint vs % deep
5. **Flag modules lacking entrypoints**: No index file, consumers forced to deep import

## Import Classification

| Import Pattern | Classification |
|----------------|----------------|
| \`from '@pkg'\` | Entrypoint |
| \`from '@pkg/index'\` | Entrypoint |
| \`from '@pkg/submodule'\` (if exported) | Entrypoint |
| \`from '@pkg/src/internal'\` | Deep |
| \`from '@pkg/components/X/X'\` | Deep |
| \`from '../pkg/src/foo'\` | Deep (relative) |

## Reporting Threshold

Report only if:
- ≥3 modules exist AND
- (Deep imports ≥20% OR ≥1 module lacks entrypoint)

## Insight Template

\`\`\`
INSIGHT:
  id: API-[n]
  title: "PUBLIC API: [N]% of imports bypass module entrypoints"
  summary: "Import discipline is [strong|weak|mixed]. [details]"
  confidence: [high|medium|low]
  evidence:
    stats:
      total_cross_module_imports: [N]
      entrypoint_imports: [N] ([%])
      deep_imports: [N] ([%])
    modules_lacking_entrypoint:
      - path — no index file, [N] deep imports from consumers
    worst_offenders:
      - path[:line] — deep import to [target]
\`\`\`

## Standard/Command Suggestions

- **Standard**: "Import from module entrypoints only" (if deep imports common)
- **Standard**: "Every module exports via index file" (if entrypoints missing)
- **Command**: "Add module entrypoint" (create index.ts with proper exports)
`;
}

function getErrorSemanticsMd(): string {
  return `# Error Semantics Convergence

Map how errors propagate and flag mixed semantics in the same call chain.

## Search Patterns

### Exception-Based Patterns

\`\`\`
# Throwing
throw new Error
throw new
throw Error(
raise Exception
raise ValueError
raise RuntimeError
panic(
panic!

# Catching
try {
} catch
except
rescue
catch (
.catch(
try:
except:

# Custom exception classes
extends Error
extends Exception
class.*Error
class.*Exception
\`\`\`

### Result/Either Patterns

\`\`\`
# Rust-style Result
Result<
Ok(
Err(
.unwrap()
.expect(
.map_err(
?;

# Functional Either
Either<
Left(
Right(
fold(
bimap(
mapLeft(

# neverthrow (TypeScript)
ok(
err(
Result.ok
Result.err
.mapErr(
.andThen(
fromPromise(
fromThrowable(

# fp-ts
E.left
E.right
E.fold
E.map
E.mapLeft
pipe(

# True Myth
Result.ok
Result.err
Maybe.just
Maybe.nothing

# Go-style
error
errors.New
errors.Wrap
if err != nil
return nil, err
\`\`\`

### Sentinel/Null Return Patterns

\`\`\`
# Null/undefined returns
return null
return undefined
return None
return nil

# Optional patterns
Option<
Optional<
Maybe<
Some(
None
.orElse(
.getOrElse(

# Sentinel values
return -1
return false
return ""
return []
return {}
\`\`\`

### Mixed Semantics Indicators

\`\`\`
# Throwing inside Result-returning function
async function.*Result.*throw
fn.*Result.*panic

# Catching and converting
.catch(.*=> err(
try.*return ok(
except.*return Left(

# Null checks after Result
result?.value
result && result.value
if (result)
\`\`\`

## Analysis Method

1. **Sample functions**: Take 20-30 functions across different modules
2. **Classify error handling style** per function:
   - Exception-based: throws/catches
   - Result-based: returns Result/Either
   - Sentinel-based: returns null/special value
   - Mixed: multiple styles in same function
3. **Trace call chains**: For key flows, check if style is consistent
4. **Flag transitions**: Where does Result become throw? Vice versa?

## Error Style Distribution

| Style | Indicators | Consistency Concern |
|-------|------------|---------------------|
| **Exceptions** | try/catch throughout | Need consistent catch boundaries |
| **Result/Either** | All functions return Result | Need consistent unwrapping |
| **Sentinel** | null checks everywhere | Need null safety patterns |
| **Mixed** | Some throw, some Result | Conversion points are error-prone |

## Call Chain Analysis

\`\`\`
Example problematic chain:
  controller (throws)
    -> service (returns Result)
      -> repository (throws)
        -> database (throws)

Issues:
  - service must catch repository throws
  - controller must handle both Result and throws
\`\`\`

## Reporting Threshold

Report only if:
- ≥2 error styles detected AND
- Mixed styles found in same module or call chain

## Insight Template

\`\`\`
INSIGHT:
  id: ERR-[n]
  title: "ERROR SEMANTICS: [N] styles coexist ([list])"
  summary: "Error handling uses [styles]. Mixed semantics in [areas]."
  confidence: [high|medium|low]
  evidence:
    styles_detected:
      exceptions: [N] files
      result_either: [N] files
      sentinel_null: [N] files
    mixed_semantics:
      - path[:line] — throws inside Result-returning function
      - path[:line] — catches and converts to Result
    call_chain_issues:
      - chain: "A -> B -> C"
        problem: "B returns Result but C throws"
\`\`\`

## Standard/Command Suggestions

- **Standard**: "Use Result type for recoverable errors" (if mixed found)
- **Standard**: "Exceptions for truly exceptional cases only" (if overused)
- **Standard**: "Convert exceptions at boundaries" (if mixed in chains)
`;
}

function getDataBoundaryLeakageMd(): string {
  return `# Data Boundary Leakage

Detect whether persistence/transport types leak into core logic.

## Search Patterns

### ORM Entity Indicators

\`\`\`
# TypeORM
@Entity(
@Column(
@PrimaryGeneratedColumn
@ManyToOne
@OneToMany
@ManyToMany
@JoinColumn
@JoinTable
getRepository(
.createQueryBuilder(

# Prisma
prisma.
PrismaClient
@prisma/client

# Sequelize
@Table
@Column
Model.init
sequelize.define

# Mongoose
mongoose.Schema
mongoose.model
@Schema(
@Prop(

# SQLAlchemy
Base.metadata
Column(
relationship(
ForeignKey(

# ActiveRecord
belongs_to
has_many
has_one

# Hibernate/JPA
@Entity
@Table
@Column
@Id
@GeneratedValue
EntityManager
\`\`\`

### Generated DTO/Type Indicators

\`\`\`
# OpenAPI/Swagger generated
/* tslint:disable */
/* eslint-disable */
// Generated by
@ApiProperty(
swagger-typescript-api
openapi-generator
openapi-typescript

# Protocol Buffers
.proto
protobuf
google.protobuf
_pb.ts
_pb.js
_pb2.py

# GraphQL generated
__generated__
.graphql.ts
gql.tada
graphql-codegen
type.*Query
type.*Mutation
type.*Subscription

# gRPC
grpc.
@grpc/
_grpc_pb.ts

# Thrift
.thrift
\`\`\`

### SQL Builder Patterns

\`\`\`
# Raw SQL indicators in non-repository files
.query(\`SELECT
.query("SELECT
.raw(\`
.raw("
sql\`
sql"
Knex
knex(
.select(
.where(
.join(
QueryBuilder
\`\`\`

### Core Logic Locations

\`\`\`
# Domain layer (should be clean)
src/domain/
src/core/
src/model/
src/entities/ (domain entities, not ORM)
src/value-objects/
src/aggregates/

# Application layer (should be clean)
src/application/
src/use-cases/
src/usecases/
src/services/ (application services)

# Acceptable locations for data types
src/infra/
src/infrastructure/
src/persistence/
src/repositories/
src/adapters/
src/api/
src/http/
src/graphql/
\`\`\`

## Analysis Method

1. **Identify core logic files**: Domain, application layer files
2. **Scan for leakage indicators**: ORM decorators, generated type imports, SQL builders
3. **Check import sources**: Are domain files importing from infra/generated?
4. **Map type flow**: Where do ORM entities get used vs domain models?

## Leakage Categories

| Type | Leakage Pattern | Severity |
|------|-----------------|----------|
| **ORM in domain** | \`@Entity\` decorator in domain model | High |
| **Generated in core** | Import from \`__generated__\` in use case | High |
| **SQL in service** | Query builder in application service | Medium |
| **No mapping** | ORM entity returned from use case | Medium |
| **Coupled tests** | Tests depend on ORM entities directly | Low |

## Clean Architecture Expectation

\`\`\`
Transport Types (HTTP/gRPC/GraphQL)
         ↓ map to
Application DTOs
         ↓ map to
Domain Models (pure, no decorators)
         ↓ map to
Persistence Entities (ORM)
\`\`\`

## Reporting Threshold

Report only if:
- ≥1 leakage found in domain/application layer

## Insight Template

\`\`\`
INSIGHT:
  id: LEAK-[n]
  title: "DATA LEAKAGE: [type] types found in [layer]"
  summary: "[N] [ORM|generated|SQL] usages in core logic."
  confidence: [high|medium|low]
  evidence:
    leakage_by_type:
      orm_entities:
        - path[:line] — @Entity in domain
      generated_types:
        - path[:line] — imports from __generated__
      sql_builders:
        - path[:line] — raw SQL in service
    clean_files:
      - path — properly isolated
\`\`\`

## Standard/Command Suggestions

- **Standard**: "Domain models are persistence-agnostic" (no ORM decorators)
- **Standard**: "Map generated types at boundaries" (don't pass through)
- **Standard**: "SQL queries live in repositories only"
- **Command**: "Create domain model from ORM entity" (mapping guidance)
`;
}

function getTransactionAtomicityMd(): string {
  return `# Transaction & Atomicity Conventions

Identify how multi-step writes are coordinated and where patterns are bypassed.

## Search Patterns

### Transaction Wrapper Patterns

\`\`\`
# TypeORM
@Transaction(
transaction(
.transaction(
getManager().transaction
queryRunner.startTransaction
queryRunner.commitTransaction
queryRunner.rollbackTransaction
EntityManager (in transaction context)

# Prisma
prisma.$transaction
.$transaction([
.$transaction(async

# Sequelize
sequelize.transaction
t.commit()
t.rollback()
{ transaction: t }

# Knex
knex.transaction
trx.commit()
trx.rollback()

# Generic patterns
BEGIN
COMMIT
ROLLBACK
START TRANSACTION

# Decorators/annotations
@Transactional
@transaction
with_transaction
\`\`\`

### Unit of Work Patterns

\`\`\`
# Explicit UoW
UnitOfWork
unitOfWork
uow.
.commit()
.flush()
.persist(
.save() (batch)

# Repository patterns with UoW
Repository.save(
.saveAll(
.bulkInsert(
.bulkUpdate(
\`\`\`

### Outbox/Saga Patterns

\`\`\`
# Outbox pattern
outbox
OutboxMessage
outbox_messages
publishAfterCommit
eventOutbox

# Saga pattern
Saga
saga
SagaStep
compensate
compensation
rollbackStep
orchestrator

# Event sourcing related
EventStore
eventStore
appendEvents
\`\`\`

### No Transaction Indicators

\`\`\`
# Multiple independent saves
await repo1.save(
await repo2.save(
await repo3.save(

# Fire-and-forget
.save().then(
Promise.all([save1, save2])

# Missing transaction in multi-write
async function.*{
  .*\\.save\\(
  .*\\.save\\(
\`\`\`

## Analysis Method

1. **Identify multi-step write operations**: Functions with ≥2 write calls
2. **Classify coordination pattern**:
   - Transaction wrapper: explicit transaction boundary
   - Unit of Work: batch commits
   - Outbox/Saga: eventual consistency with compensation
   - None: independent writes without coordination
3. **Detect bypass**: Multi-writes without any coordination pattern
4. **Map consistency boundaries**: Where are transaction boundaries?

## Coordination Patterns

| Pattern | Use Case | Indicators |
|---------|----------|------------|
| **Transaction** | ACID within single DB | \`BEGIN/COMMIT\`, \`@Transactional\` |
| **Unit of Work** | Batch persistence | \`uow.commit()\`, \`flush()\` |
| **Outbox** | Cross-service consistency | \`outbox_messages\` table |
| **Saga** | Distributed transactions | Compensation logic |
| **None** | Independent operations | Multiple saves, no wrapper |

## Bypass Detection

Look for patterns like:
\`\`\`typescript
// Potential issue: no transaction wrapping
async function transferMoney(from: Account, to: Account, amount: number) {
  await accountRepo.save(from.withdraw(amount));  // Could fail here
  await accountRepo.save(to.deposit(amount));     // Leaving inconsistent state
  await auditRepo.save(new AuditLog(...));
}
\`\`\`

## Reporting Threshold

Report only if:
- Transaction patterns detected AND
- ≥1 bypass (multi-write without coordination) found

## Insight Template

\`\`\`
INSIGHT:
  id: TXN-[n]
  title: "TRANSACTIONS: [pattern] is dominant, [N] bypasses detected"
  summary: "Multi-step writes use [pattern]. [N] operations lack coordination."
  confidence: [high|medium|low]
  evidence:
    dominant_pattern: "[transaction|uow|outbox|saga|none]"
    pattern_usage:
      - path[:line] — uses [pattern]
    bypasses:
      - path[:line] — [N] writes without coordination
    consistency_risk:
      - description of potential data inconsistency
\`\`\`

## Standard/Command Suggestions

- **Standard**: "Wrap multi-entity writes in transactions" (if bypasses found)
- **Standard**: "Use Unit of Work for aggregate persistence"
- **Standard**: "Use outbox pattern for cross-service events"
- **Command**: "Add transaction wrapper to use case"
`;
}

function getConcurrencyStyleMd(): string {
  return `# Concurrency Style Consistency

Identify the dominant async/concurrency model and exceptions where styles are bridged ad-hoc.

## Search Patterns

### Async/Await Patterns

\`\`\`
# JavaScript/TypeScript
async function
async (
await
Promise<
.then(
.catch(
Promise.all(
Promise.race(
Promise.allSettled(

# Python
async def
await
asyncio.
aiohttp
trio
anyio

# Rust
async fn
.await
tokio::
async-std

# C#
async Task
await
Task<
Task.Run
async void  # (anti-pattern)

# Go (goroutines)
go func
go
chan
<-
select {
\`\`\`

### Callback Patterns

\`\`\`
# Node.js callbacks
(err, result) =>
callback(
cb(
done(
next(

# Event-based
.on(
.once(
.emit(
EventEmitter
addEventListener

# Continuation passing
continuation
cont(
\`\`\`

### Sync-in-Async Anti-Patterns

\`\`\`
# Blocking calls in async context
.wait()
.Result  # C# blocking
.get()   # Java Future blocking
sync_to_async
asyncio.run(  # Inside async
run_sync(
block_on(

# Explicit sync wrappers
toSync(
makeSync(
synchronous(
blocking(
\`\`\`

### Async-to-Sync Bridges

\`\`\`
# Python
asyncio.get_event_loop().run_until_complete
nest_asyncio
async_to_sync

# JavaScript
deasync
synchronize
\`\`\`

### Thread/Process Patterns

\`\`\`
# Threading
Thread(
threading.
pthread
std::thread
thread::spawn

# Process
Process(
multiprocessing
subprocess
fork(
spawn(

# Thread pools
ThreadPoolExecutor
Executors.newFixedThreadPool
rayon::
tokio::spawn
\`\`\`

### Reactive Patterns

\`\`\`
# RxJS
Observable
Subject
pipe(
subscribe(
map(
filter(
switchMap(
mergeMap(

# Reactive Streams
Flux
Mono
Publisher
Subscriber
\`\`\`

## Analysis Method

1. **Identify dominant async model**: async/await, callbacks, reactive, threads
2. **Scan for bridging patterns**: sync-in-async, async-to-sync wrappers
3. **Check consistency per module**: Does each module use one style?
4. **Flag anti-patterns**: Blocking calls in async context

## Concurrency Models

| Model | Language Examples | Indicators |
|-------|-------------------|------------|
| **async/await** | JS/TS, Python, Rust, C# | \`async\`, \`await\`, \`Promise\` |
| **Callbacks** | Node.js (legacy), C | \`(err, result)\`, \`callback\` |
| **Reactive** | RxJS, Reactor | \`Observable\`, \`subscribe\` |
| **Threads** | Java, Go, Rust | \`Thread\`, \`goroutine\`, \`spawn\` |
| **Actors** | Akka, Erlang | \`Actor\`, \`!\`, \`receive\` |

## Bridge Anti-Patterns

| Anti-Pattern | Risk | Detection |
|--------------|------|-----------|
| **Sync in async** | Blocks event loop | \`.wait()\` in async fn |
| **Async to sync** | Deadlock risk | \`run_until_complete\` nested |
| **Mixed models** | Confusing flow | Callbacks + async in same file |
| **Fire-and-forget** | Lost errors | Unhandled promise |

## Reporting Threshold

Report only if:
- ≥2 concurrency styles detected OR
- ≥1 bridging anti-pattern found

## Insight Template

\`\`\`
INSIGHT:
  id: ASYNC-[n]
  title: "CONCURRENCY: [model] is dominant, [N] style bridges detected"
  summary: "Codebase primarily uses [model]. [concerns if any]"
  confidence: [high|medium|low]
  evidence:
    dominant_model: "[async-await|callbacks|reactive|threads]"
    distribution:
      async_await: [N] files
      callbacks: [N] files
      reactive: [N] files
      threads: [N] files
    bridges:
      - path[:line] — sync call in async context
      - path[:line] — async-to-sync wrapper
    anti_patterns:
      - path[:line] — [description]
\`\`\`

## Standard/Command Suggestions

- **Standard**: "Use async/await consistently, avoid callbacks" (if mixed)
- **Standard**: "Never block in async context" (if sync-in-async found)
- **Standard**: "Handle all promises (no fire-and-forget)"
`;
}

function getConfigFeatureFlagsMd(): string {
  return `# Configuration & Feature Flag Access Pattern

Detect whether config/flags are centralized or scattered; list read points and naming issues.

## Search Patterns

### Configuration Access

\`\`\`
# Environment variables
process.env.
process.env[
os.environ
os.getenv
ENV[
System.getenv
std::env::var
env::var

# Config objects
config.
Config.
configuration.
settings.
appConfig.
appSettings.

# Config files
config.json
config.yaml
config.yml
.env
.env.local
.env.production
appsettings.json
application.yml
application.properties

# Config libraries
dotenv
convict
config (npm)
ConfigService
@ConfigModule
@Value("\${
@ConfigurationProperties
\`\`\`

### Feature Flag Patterns

\`\`\`
# Flag checks
isEnabled(
isFeatureEnabled
featureFlag(
feature.
flags.
FF_
FEATURE_
enabledFeatures
toggles.

# Flag libraries
LaunchDarkly
launchdarkly
Unleash
unleash
Split
split-io
Flagsmith
ConfigCat
GrowthBook

# Inline conditionals
if (config.feature
if (flags.
if (process.env.ENABLE_
if (featureEnabled
\`\`\`

### Centralized Config Patterns

\`\`\`
# Config module/service
ConfigService
ConfigProvider
ConfigModule
config/index
settings/index

# Validated config
z.object(  # Zod
Joi.object(
class-validator
@IsString()
@IsNumber()

# Type-safe config
interface Config
type Config =
ConfigSchema
\`\`\`

### Scattered Config Indicators

\`\`\`
# Direct env access in business logic
// In service/use-case files:
process.env.
os.environ

# Hardcoded defaults with env
process.env.X || 'default'
getenv('X') or 'default'

# Magic strings
'production'
'development'
'staging'
\`\`\`

## Analysis Method

1. **Find all config read points**: Grep for env access, config objects
2. **Map locations**: Are reads in dedicated config module or scattered?
3. **Check centralization**:
   - Centralized: Config service/module, validated schema
   - Scattered: Direct env reads in business logic
4. **Analyze naming**: Consistent prefixes? Type-safe access?
5. **Feature flags**: Separate system or mixed with config?

## Access Pattern Categories

| Pattern | Indicators | Quality |
|---------|------------|---------|
| **Centralized + validated** | ConfigService, Zod/Joi schema | Best |
| **Centralized** | Config module, single source | Good |
| **Mixed** | Some centralized, some direct | Needs work |
| **Scattered** | Direct env access everywhere | Poor |

## Naming Consistency Checks

\`\`\`
# Check for consistent prefixes
DATABASE_  vs  DB_
REDIS_     vs  CACHE_
API_       vs  SERVICE_
FEATURE_   vs  FF_  vs  ENABLE_

# Check for type indicators
_URL
_PORT
_HOST
_TIMEOUT
_ENABLED
_COUNT
\`\`\`

## Reporting Threshold

Report only if:
- Config reads found AND
- (Scattered pattern detected OR naming inconsistencies found)

## Insight Template

\`\`\`
INSIGHT:
  id: CONFIG-[n]
  title: "CONFIG: [centralized|scattered] access with [N] read points"
  summary: "Configuration is [pattern]. [concerns if any]"
  confidence: [high|medium|low]
  evidence:
    pattern: "[centralized|mixed|scattered]"
    config_module: "path or none"
    read_points:
      centralized: [N]
      scattered:
        - path[:line] — direct env access in [layer]
    naming_issues:
      - "DATABASE_ vs DB_" — inconsistent prefix
      - "Missing type suffix for [var]"
    feature_flags:
      system: "[library or custom or none]"
      flag_count: [N]
      scattered_checks:
        - path[:line] — inline flag check
\`\`\`

## Standard/Command Suggestions

- **Standard**: "Access configuration through ConfigService only" (if scattered)
- **Standard**: "Validate configuration at startup" (if no schema)
- **Standard**: "Use consistent config naming: PREFIX_TYPE_NAME"
- **Command**: "Add config value" (through proper channel)
`;
}

function getObservabilityContractMd(): string {
  return `# Observability Contract

Detect structured logging and correlation/tracing context propagation consistency.

## Search Patterns

### Logging Patterns

\`\`\`
# Structured logging
logger.info({
logger.error({
log.info({
log.error({
logging.info(
logging.error(
logger.log({
console.log(JSON.stringify(

# Structured logging libraries
winston
pino
bunyan
structlog
loguru
zerolog
zap
slog

# Log levels
.debug(
.info(
.warn(
.error(
.fatal(
.trace(
.verbose(

# Unstructured logging (anti-pattern in prod)
console.log(
console.error(
print(
fmt.Println(
System.out.println(
puts
\`\`\`

### Correlation/Trace Context

\`\`\`
# Trace IDs
traceId
trace_id
correlationId
correlation_id
requestId
request_id
x-request-id
x-correlation-id
X-Trace-ID

# OpenTelemetry
@opentelemetry
opentelemetry
otel
tracer.
span.
trace.
Span(
withSpan(
startSpan(
startActiveSpan(

# Distributed tracing
Jaeger
Zipkin
DataDog
dd-trace
newrelic
@sentry

# Context propagation
AsyncLocalStorage
cls-hooked
continuation-local-storage
contextvars
Context.current
context.Background()
\`\`\`

### Metric Patterns

\`\`\`
# Metrics
metrics.
counter.
gauge.
histogram.
timer.
increment(
decrement(
observe(
record(

# Metric libraries
prometheus
prom-client
statsd
micrometer
metrics (go)
\`\`\`

### Context Dropping Indicators

\`\`\`
# New context without propagation
new Context(
Context.create(
asyncLocalStorage.run(  # without parent context

# Missing context in async
Promise.all([  # without context propagation
setTimeout(    # loses context
setInterval(
process.nextTick(

# Log without context
logger.info('message')  # no metadata
log.error(err)          # no trace context
\`\`\`

## Analysis Method

1. **Identify logging approach**: Structured vs unstructured
2. **Check for correlation IDs**: Are trace/correlation IDs present?
3. **Trace context propagation**:
   - Is context passed through call chains?
   - Is context preserved across async boundaries?
4. **Find context drops**: Where is tracing context lost?
5. **Module coverage**: Which modules participate in tracing?

## Observability Maturity

| Level | Indicators |
|-------|------------|
| **None** | \`console.log\`, no structure |
| **Basic** | Structured logger, no correlation |
| **Good** | Correlation IDs in logs |
| **Excellent** | Full distributed tracing, context propagation |

## Context Drop Patterns

| Pattern | Risk | Detection |
|---------|------|-----------|
| **Async without context** | Lost trace | \`setTimeout\` without propagation |
| **New request handler** | Orphan trace | Handler doesn't extract trace headers |
| **Background job** | No correlation | Job processor ignores context |
| **Error boundary** | Lost context | Catch without re-adding context |

## Reporting Threshold

Report only if:
- Logging found AND
- (Unstructured logging in prod code OR context propagation gaps)

## Insight Template

\`\`\`
INSIGHT:
  id: OBS-[n]
  title: "OBSERVABILITY: [level] maturity, [N] context drops"
  summary: "Logging is [structured|unstructured]. Tracing [present|absent|inconsistent]."
  confidence: [high|medium|low]
  evidence:
    logging:
      structured: [N] files
      unstructured: [N] files
      library: "[winston|pino|etc]"
    tracing:
      present: [true|false]
      library: "[opentelemetry|etc|none]"
      correlation_id_usage: [N] files
    context_drops:
      - path[:line] — async without context propagation
      - path[:line] — log without trace context
    modules_without_tracing:
      - path — no observability instrumentation
\`\`\`

## Standard/Command Suggestions

- **Standard**: "Use structured logging with correlation IDs"
- **Standard**: "Propagate trace context across async boundaries"
- **Standard**: "Include trace context in all log entries"
- **Command**: "Add observability to module" (instrument new code)
`;
}

function getAuthorizationBoundaryMd(): string {
  return `# Authorization Boundary Placement

Detect where authz checks live and highlight inconsistent placement.

## Search Patterns

### Authorization Check Patterns

\`\`\`
# Permission checks
canAccess(
hasPermission(
checkPermission(
authorize(
isAuthorized(
can(
cannot(
allowed(
forbidden(

# Role checks
hasRole(
isAdmin(
isOwner(
isMember(
checkRole(
requireRole(
@Roles(
@RequireRole

# Policy checks
policy.
Policy.
evaluate(
enforce(
@Policy(
@Authorize(
@PreAuthorize(
@Secured(

# Guard patterns (NestJS, etc.)
@UseGuards(
Guard
CanActivate
canActivate(

# Middleware auth
authMiddleware
authenticate
requireAuth
ensureAuthenticated
isAuthenticated(
\`\`\`

### Authorization Libraries

\`\`\`
# Node.js
casl
@casl/ability
accesscontrol
acl
node-casbin
oso
permit.io

# Python
django-guardian
django-rules
casbin
oso

# Ruby
pundit
cancancan
action_policy

# Java/Kotlin
Spring Security
@PreAuthorize
@PostAuthorize
@Secured

# Go
casbin
opa
\`\`\`

### Placement Locations

\`\`\`
# Edge layer (expected)
src/api/
src/http/
src/controllers/
src/routes/
src/middleware/
src/guards/
src/presentation/

# Service layer (sometimes)
src/services/
src/application/

# Domain layer (policy objects)
src/domain/policies/
src/domain/authorization/

# Repository layer (anti-pattern for authz)
src/repositories/
src/infra/persistence/
\`\`\`

### Inline Authorization (Scattered)

\`\`\`
# Direct checks in business logic
if (user.role === 'admin')
if (currentUser.id === resource.ownerId)
user.permissions.includes(
roles.includes(

# Hardcoded permission strings
'admin'
'owner'
'read'
'write'
'delete'
\`\`\`

## Analysis Method

1. **Find all authz checks**: Grep for permission/role/policy checks
2. **Map check locations**: Edge, service, domain, or scattered?
3. **Identify patterns**:
   - Centralized: Guards/middleware/policies
   - Decentralized: Inline checks in services
   - Mixed: Both patterns used
4. **Detect issues**:
   - Bypass risk: Missing checks at edge
   - Duplication: Same check in multiple places
   - Inconsistency: Different approaches in same layer

## Placement Patterns

| Pattern | Location | Trade-offs |
|---------|----------|------------|
| **Edge-only** | Controllers/guards | Simple, but coarse-grained |
| **Service layer** | Application services | Reusable, but can be bypassed |
| **Domain policies** | Policy objects | Fine-grained, clean separation |
| **Scattered** | Throughout codebase | Hard to audit, inconsistent |

## Common Issues

| Issue | Risk | Detection |
|-------|------|-----------|
| **No edge check** | Bypass via direct service call | Service has authz, controller doesn't |
| **Duplicate checks** | Maintenance burden | Same check in controller + service |
| **Hardcoded roles** | Inflexible | \`if (role === 'admin')\` |
| **Missing for route** | Security hole | Route handler without guard/check |

## Reporting Threshold

Report only if:
- Authorization checks found AND
- (Inconsistent placement OR potential bypasses detected)

## Insight Template

\`\`\`
INSIGHT:
  id: AUTHZ-[n]
  title: "AUTHORIZATION: [pattern] placement with [N] inconsistencies"
  summary: "Authz checks are [centralized|scattered|mixed]. [concerns]"
  confidence: [high|medium|low]
  evidence:
    pattern: "[edge-only|service-layer|domain-policies|scattered]"
    check_locations:
      edge: [N] checks
      service: [N] checks
      domain: [N] checks
      other: [N] checks
    inconsistencies:
      - path[:line] — authz in [layer] but not at edge
      - path[:line] — duplicate check (also at [other path])
    potential_bypasses:
      - path[:line] — service authz without controller check
    hardcoded_roles:
      - path[:line] — \`'admin'\` literal
\`\`\`

## Standard/Command Suggestions

- **Standard**: "Authorize at the edge, then trust downstream" (if duplicated)
- **Standard**: "Use policy objects for complex authorization rules"
- **Standard**: "Never hardcode role names - use constants/enums"
- **Command**: "Add authorization guard to controller"
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

function getSchemaGenerationBoundaryMd(): string {
  return `# Schema / Generation Boundary Discipline

Detect where generated code is consumed and flag direct usage in core logic.

## Search Patterns

### OpenAPI / Swagger Generated

\`\`\`
# Generated file markers
/* tslint:disable */
/* eslint-disable */
// This file was automatically generated
// Generated by openapi
// Auto-generated
@generated
DO NOT EDIT

# Generated directories
__generated__/
generated/
gen/
api-client/
openapi/

# Generator tools
openapi-generator
swagger-codegen
openapi-typescript
orval
swagger-typescript-api
NSwag
autorest
\`\`\`

### Protocol Buffers / gRPC

\`\`\`
# Proto files
*.proto
syntax = "proto3"
syntax = "proto2"

# Generated files
*_pb.ts
*_pb.js
*_pb2.py
*_pb.go
*.pb.h
*.pb.cc

# gRPC generated
*_grpc_pb.ts
*_grpc.pb.go
*_grpc_pb2.py

# Proto imports
google.protobuf
import "google/protobuf/
\`\`\`

### GraphQL Generated

\`\`\`
# Generated files
*.graphql.ts
*.generated.ts
__generated__/
gql/

# Codegen tools
graphql-codegen
gql.tada
graphql-request
urql

# Generated types
type.*Query
type.*Mutation
type.*Subscription
type.*Fragment
\`\`\`

### Thrift / Avro / Other

\`\`\`
# Thrift
*.thrift
gen-*

# Avro
*.avsc
*.avro

# JSON Schema
*.schema.json
json-schema-to-typescript
\`\`\`

### Core Logic Locations (Should Not Import Generated)

\`\`\`
# Domain layer
src/domain/
src/core/
src/model/
src/entities/
src/value-objects/
src/aggregates/

# Application layer
src/application/
src/use-cases/
src/usecases/
src/services/
\`\`\`

### Acceptable Generated Usage Locations

\`\`\`
# Infrastructure/Adapters
src/infra/
src/infrastructure/
src/adapters/
src/api/
src/http/
src/clients/
src/gateways/

# Mapping layer
src/mappers/
src/converters/
src/transformers/
\`\`\`

## Analysis Method

1. **Identify generated code**: Find generated directories/files
2. **Build import graph**: Who imports from generated?
3. **Classify consumers**:
   - Adapter layer: Expected, acceptable
   - Core logic: Violation, needs mapping
4. **Check for mappers**: Are generated types mapped to domain types?
5. **Detect leakage**: Generated types in function signatures of core logic

## Boundary Discipline Levels

| Level | Description | Indicators |
|-------|-------------|------------|
| **Clean** | Generated types never in core | Mappers at boundaries |
| **Partial** | Some mapping, some leakage | Mixed usage |
| **Leaky** | Generated types throughout | No mapping layer |

## Violation Patterns

| Pattern | Location | Issue |
|---------|----------|-------|
| **Import in domain** | \`domain/\` imports \`__generated__/\` | Couples domain to external schema |
| **Return generated** | UseCase returns generated DTO | API contract leaks into app |
| **Accept generated** | Service accepts proto message | Tight coupling |
| **No mapping** | Generated → domain direct cast | Type confusion |

## Expected Architecture

\`\`\`
External API/Service
       ↓
Generated Types (__generated__/)
       ↓
Adapter/Gateway (maps to domain)
       ↓
Domain Types (pure, owned)
       ↓
Use Cases / Services
\`\`\`

## Reporting Threshold

Report only if:
- Generated code exists AND
- ≥1 import from core logic into generated

## Insight Template

\`\`\`
INSIGHT:
  id: GEN-[n]
  title: "GENERATED CODE: [N] core logic files import generated types"
  summary: "Generated types from [source] leak into [layers]."
  confidence: [high|medium|low]
  evidence:
    generated_sources:
      - type: "[openapi|proto|graphql]"
        location: "path/"
        files: [N]
    violations:
      - path[:line] — [layer] imports from [generated]
    missing_mappers:
      - "[generated type] has no domain equivalent"
    acceptable_usage:
      - path — adapter correctly maps generated
\`\`\`

## Standard/Command Suggestions

- **Standard**: "Map generated types at adapter boundaries"
- **Standard**: "Domain models never depend on generated schemas"
- **Standard**: "Create domain DTOs for external API contracts"
- **Command**: "Create mapper for generated type"
`;
}

function getCrossCuttingHotspotsMd(): string {
  return `# Cross-Cutting Hotspot Detection

Identify "god files/modules" by fan-in/fan-out heuristics and recommend refactor boundaries.

## Search Patterns

### High Fan-In Indicators (Many Dependents)

\`\`\`
# Files imported by many others
# Detect by counting: grep -r "from './[file]" | wc -l

# Common hotspot names
utils.
helpers.
common.
shared.
constants.
types.
index. (barrel exports)
config.
\`\`\`

### High Fan-Out Indicators (Many Dependencies)

\`\`\`
# Files with many imports
# Count import statements per file

# Long import blocks
import {
import {
import {
import {
import {
...

# Many from different modules
from '@module-a/
from '@module-b/
from '@module-c/
from '@module-d/
\`\`\`

### God File Patterns

\`\`\`
# Very large files
# Lines > 500-1000

# Many exports
export const
export function
export class
export type
export interface
export enum

# Many public methods
public method1(
public method2(
public method3(
...

# Multiple responsibilities in name
UserOrderPaymentService
EverythingManager
MasterController
\`\`\`

### Coupling Patterns

\`\`\`
# Circular dependency indicators
# A imports B, B imports C, C imports A

# Tight coupling
# Multiple files import same set of dependencies

# Facade that knows too much
# Single file orchestrating many modules
\`\`\`

## Analysis Method

1. **Build dependency graph**: For each file, track imports and importers
2. **Calculate metrics**:
   - Fan-in: Number of files that import this file
   - Fan-out: Number of files this file imports
   - Coupling score: Fan-in × Fan-out
3. **Identify hotspots**: Files with high coupling score
4. **Analyze hotspot contents**: What responsibilities does it have?
5. **Recommend boundaries**: How to split the hotspot?

## Hotspot Thresholds

| Metric | Threshold | Interpretation |
|--------|-----------|----------------|
| **Fan-in** | >10 | Many dependents, high impact changes |
| **Fan-out** | >10 | Many dependencies, fragile |
| **Coupling score** | >50 | Critical hotspot |
| **Lines of code** | >500 | Likely too many responsibilities |
| **Exports** | >20 | Possible kitchen sink |

## Hotspot Categories

| Type | Fan-in | Fan-out | Example |
|------|--------|---------|---------|
| **Gravity well** | High | Low | \`utils.ts\`, \`constants.ts\` |
| **Octopus** | Low | High | Orchestrator with too many deps |
| **God object** | High | High | Central service doing everything |
| **Stable base** | High | Low | Core types, interfaces (acceptable) |

## Refactoring Recommendations

| Hotspot Type | Recommendation |
|--------------|----------------|
| **Gravity well** | Split by domain/concern |
| **Octopus** | Introduce facades, reduce direct deps |
| **God object** | Extract single-responsibility classes |
| **Barrel re-export** | Consider direct imports |

## Reporting Threshold

Report only if:
- ≥1 file with coupling score >50 OR
- ≥3 files with fan-in >10

## Insight Template

\`\`\`
INSIGHT:
  id: HOTSPOT-[n]
  title: "HOTSPOTS: [N] files have critical coupling scores"
  summary: "High-coupling files detected that may impede maintainability."
  confidence: [high|medium|low]
  evidence:
    hotspots:
      - path:
          fan_in: [N] (files that import this)
          fan_out: [N] (files this imports)
          coupling_score: [N]
          lines: [N]
          exports: [N]
          type: "[gravity-well|octopus|god-object]"
          top_importers:
            - path
          top_dependencies:
            - path
    recommended_splits:
      - path:
          reason: "[too many responsibilities]"
          suggested_modules:
            - "[extracted-concern-1]"
            - "[extracted-concern-2]"
\`\`\`

## Standard/Command Suggestions

- **Standard**: "Keep files under 500 lines"
- **Standard**: "Limit module fan-out to 10 direct dependencies"
- **Standard**: "Split utility files by domain concern"
- **Command**: "Analyze module coupling" (run this analysis on demand)
`;
}

const ONBOARD_README = `# Packmind Onboarding Skill

Read-only codebase analysis skill that identifies non-linter architectural patterns and generates draft Packmind Standards and Commands.

## What It Does

1. **Detects existing configuration** - Shows what's already configured (standards, commands, agent docs)
2. **Detects your stack** - Language, monorepo structure, architecture markers
3. **Analyzes for non-linter patterns** - 17 architectural analyses across dependencies, data flow, concurrency, and more
4. **Generates draft artifacts** - Max 5 Standards and 5 Commands per run
5. **Applies on your choice** - Nothing written without explicit confirmation

**Works with any language** - JavaScript, TypeScript, Python, Go, Ruby, Java, and more.

## Available Analyses

| Category | Analyses |
|----------|----------|
| **Architecture** | Module Boundaries, Shared Kernel Drift, Public API Discipline, Cross-Cutting Hotspots |
| **Communication** | Cross-Domain Communication, Error Semantics |
| **Data** | Data Boundary Leakage, Schema Generation Boundary, Transaction Conventions |
| **Infrastructure** | CI/Local Workflow Parity, Config & Feature Flags, Observability Contract |
| **Code Organization** | File Template Consistency, Role Taxonomy Drift, Authorization Boundaries |
| **Testing** | Test Data Construction |
| **Concurrency** | Concurrency Style Consistency |

## Usage

Ask your AI agent to onboard:
- "Onboard this project to Packmind"
- "Analyze this codebase for standards"
- "Generate coding standards for this project"

## What You'll Discover

- **Architecture patterns**: "Event-driven communication via domain events"
- **Dependency violations**: "15 deep imports bypassing module entrypoints"
- **Test data patterns**: "23 factories with 1166 usages across test files"
- **File boilerplate**: "All UseCases extend AbstractMemberUseCase with same structure"
- **Workflow gaps**: "CI runs security scan, no local equivalent"
- **Structure consistency**: "12 packages follow hexagonal, 2 don't"

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
          path: `${referencesPath}/cross-domain-communication.md`,
          content: getCrossDomainCommunicationMd(),
        },
        {
          path: `${referencesPath}/test-data-construction.md`,
          content: getTestDataConstructionMd(),
        },
        {
          path: `${referencesPath}/file-template-consistency.md`,
          content: getFileTemplateConsistencyMd(),
        },
        {
          path: `${referencesPath}/ci-local-workflow-parity.md`,
          content: getCiLocalWorkflowParityMd(),
        },
        {
          path: `${referencesPath}/module-boundaries-dependencies.md`,
          content: getModuleBoundariesDependenciesMd(),
        },
        {
          path: `${referencesPath}/shared-kernel-drift.md`,
          content: getSharedKernelDriftMd(),
        },
        {
          path: `${referencesPath}/public-api-deep-imports.md`,
          content: getPublicApiDeepImportsMd(),
        },
        {
          path: `${referencesPath}/error-semantics.md`,
          content: getErrorSemanticsMd(),
        },
        {
          path: `${referencesPath}/data-boundary-leakage.md`,
          content: getDataBoundaryLeakageMd(),
        },
        {
          path: `${referencesPath}/transaction-atomicity.md`,
          content: getTransactionAtomicityMd(),
        },
        {
          path: `${referencesPath}/concurrency-style.md`,
          content: getConcurrencyStyleMd(),
        },
        {
          path: `${referencesPath}/config-feature-flags.md`,
          content: getConfigFeatureFlagsMd(),
        },
        {
          path: `${referencesPath}/observability-contract.md`,
          content: getObservabilityContractMd(),
        },
        {
          path: `${referencesPath}/authorization-boundary.md`,
          content: getAuthorizationBoundaryMd(),
        },
        {
          path: `${referencesPath}/role-taxonomy-drift.md`,
          content: getRoleTaxonomyDriftMd(),
        },
        {
          path: `${referencesPath}/schema-generation-boundary.md`,
          content: getSchemaGenerationBoundaryMd(),
        },
        {
          path: `${referencesPath}/cross-cutting-hotspots.md`,
          content: getCrossCuttingHotspotsMd(),
        },
      ],
      delete: [],
    };
  }
}
