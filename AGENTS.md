_# Nx Monorepo Structure

This is an Nx monorepo containing applications and reusable packages.

## Core Technologies

- **Runtime**: Node.js (version specified in `.nvmrc`)
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM for entity persistence
- **Cache**: Redis for caching
- **Background Jobs**: BullMQ for job queue management
- **Testing**: Jest with @swc/jest as test runner. Tests are run with `./node_modules/.bin/nx run <project-name>` as detailed below.

## Directory Structure

- `apps/` - Deployable applications (API, frontend, CLI, MCP server, e2e tests, docs)
- `packages/` - Reusable domain and infrastructure packages shared across apps
- `.github/workflows/` - CI/CD pipelines for build, test, quality checks, and deployment

## Local Development Environment

Local development uses Docker Compose to run all services (API, frontend, database, Redis, etc.):

```bash
docker compose up
```

This starts the entire development environment.
Docker Compose automatically provisions PostgreSQL and Redis - no manual setup required.
## Working with Nx

The following commands apply for both NX apps and packages (use `./node_modules/.bin/nx show projects` to list actual apps and packages.)
- Test a project: `./node_modules/.bin/nx test <project-name>`
- Lint a project: `./node_modules/.bin/nx lint <project-name>`
- Build a project: `./node_modules/.bin/nx build <project-name>`
- Test affected projects: `npm run test:staged`
- Lint affected projects: `npm run lint:staged`

## Code Quality

- **Linting**: `./node_modules/.bin/nx lint <project-name>` runs ESLint, using the config file `eslint.config.mjs`.
- **Formatting**: Prettier is used for code formatting. You don't have to run it, it's set as a pre-commit hook.

## Commands

- When running commands, ensure you use the correct Node version (see .nvmrc at the project's root level)
- When renaming or moving a file that is commited to git, use `git mv` instead of `mv`
- Ensure the env variable `PACKMIND_EDITION` is properly set to `oss`

## Git Workflow

- The project uses **trunk-based development** (all work on `main` branch)
- Do NOT create branches yourself - let developers decide on branching strategy
- Each sub-task should have its own commit (as per Task splitting section)

## Security

- **Secrets Detection**: GitGuardian runs in CI to detect leaked secrets
- **Secrets Retrieval**: Always use `Configuration.getConfig()` from `@packmind/node-utils` to access secrets in code
- **Secrets Storage**: Infisical or environment variables are used for secrets management - never hardcode secrets

## Documentation

Public end-user documentation is maintained in the `apps/doc/` folder (Mintlify-based).

## Task splitting

- For any task you perform, you MUST split it into multiple into sub-tasks which have a logical increment (eg: new endpoint, new component, new use case etc). When a task is done, run all the validation steps (lint, test, packmind etc) and ask me for validation of the work you did.
- Each sub task MUST have its own commit.
- Use the `./node_modules/.bin/nx lint` and `./node_modules/.bin/nx test` commands on the apps and packages you've edited

<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

# Standard: Backend Tests Redaction

Enforce Jest backend test conventions in Packmind **/*.spec.ts (verb-first names, behavioral assertions, nested `describe('when...')`, one `expect`, `afterEach` cleanup with `datasource.destroy()` and `jest.clearAllMocks()`, `toEqual` for arrays, and `stubLogger()` for typed `PackmindLogger` stubs) to improve readability, consistency, and debuggability while preventing inter-test pollution. :
* Avoid asserting on stubbed logger output like specific messages or call counts; instead verify observable behavior or return values
* Avoid testing that a method is a function; instead invoke the method and assert its observable behavior
* Avoid testing that registry components are defined; instead test the actual behavior and functionality of the registry methods like registration, retrieval, and error handling
* Move 'when' contextual clauses from `it()` into nested `describe('when...')` blocks
* Never write dummy tests without logic (like expect.true.toBe(true))
* Remove explicit 'Arrange, Act, Assert' comments from tests and structure them so the setup, execution, and verification phases are clear without redundant labels
* Use afterEach to call datasource.destroy() to clean up the test database whenever you initialize it in beforeEach
* Use afterEach(() => jest.clearAllMocks()) instead of beforeEach(() => jest.clearAllMocks()) to clear mocks after each test and prevent inter-test pollution
* Use assertive, verb-first unit test names instead of starting with 'should'
* Use expect(actualArray).toEqual(expectedArray) for deep array equality in Jest tests instead of manual length and index checks
* Use one expect per test case for better clarity and easier debugging; group related tests in describe blocks with shared setup in beforeEach
* Use stubLogger() in Jest tests to get a fully typed PackmindLogger stub instead of manually creating a jest.Mocked<PackmindLogger> object with jest.fn() methods

Full standard is available here for further request: [Backend Tests Redaction](.packmind/standards/backend-tests-redaction.md)
<!-- end: Packmind standards -->_
