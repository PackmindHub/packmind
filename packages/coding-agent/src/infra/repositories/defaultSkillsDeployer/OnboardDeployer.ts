import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { LICENSE_TXT } from './license';
import { getSkillMd } from './skills/packmind-onboard/skill';
import { README } from './skills/packmind-onboard/readme';

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

export class OnboardDeployer implements ISkillDeployer {
  public readonly slug = 'packmind-onboard';
  public readonly minimumVersion = '0.16.0';

  deploy(_agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-onboard`;
    const referencesPath = `${basePath}/references`;

    return {
      createOrUpdate: [
        {
          path: `${basePath}/SKILL.md`,
          content: getSkillMd(),
        },
        {
          path: `${basePath}/README.md`,
          content: README,
        },
        {
          path: `${basePath}/LICENSE.txt`,
          content: LICENSE_TXT,
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
