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

# Standard: Back-end TypeScript Clean Code Practices

Establish back-end TypeScript clean code rules in the Packmind monorepo (/packages/**/*.ts)—including PackmindLogger constructor injection, disciplined logger.info/error usage, top-of-file static imports, custom Error subclasses, and adapter-created use cases with their own loggers—to improve maintainability, debuggability, and consistent architecture across services. :
* Avoid excessive logger.debug calls in production code and limit logging to essential logger.info statements. Use logger.info for important business events, logger.error for error handling, and add logger.debug manually only when debugging specific issues.
* Inject PackmindLogger as a constructor parameter with a default value using a variable or a string representing the class name.
* Instantiate use cases in adapters without passing the adapter's logger; use cases must create their own logger for proper origin tracking.
* Keep all import statements at the top of the file before any other code. Never use dynamic imports in the middle of the code unless absolutely necessary for code splitting or lazy loading.
* Use dedicated error types instead of generic Error instances to enable precise error handling and improve code maintainability. Create custom error classes that extend Error with descriptive names and context-specific information.

Full standard is available here for further request: [Back-end TypeScript Clean Code Practices](.packmind/standards/back-end-typescript-clean-code-practices.md)

# Standard: Changelog

Maintain CHANGELOG.MD using Keep a Changelog format with a top [Unreleased] section linked to HEAD, ISO 8601 dates (YYYY-MM-DD), and per-release comparison links like [X.Y.Z]: https://github.com/PackmindHub/packmind/compare/release/<previous>...release/X.Y.Z to ensure accurate, consistent release documentation and version links. :
* Ensure all released versions have their corresponding comparison links defined at the bottom of the CHANGELOG.MD file in the format [X.Y.Z]: https://github.com/PackmindHub/packmind/compare/release/<previous>...release/X.Y.Z
* Format all release dates using the ISO 8601 date format YYYY-MM-DD (e.g., 2025-11-21) to ensure consistent and internationally recognized date representation
* Maintain an [Unreleased] section at the top of the changelog with its corresponding link at the bottom pointing to HEAD to track ongoing changes between releases

Full standard is available here for further request: [Changelog](.packmind/standards/changelog.md)

# Standard: Testing good practices

Standardize unit test structure and naming in TypeScript/TSX test files using verb-first descriptions, Arrange-Act-Assert flow without comments, nested describe('when...') context blocks, and single-expect test cases to improve readability, maintainability, and debugging. :
* Follow  'Arrange, Act, Assert' pattern
* Move 'when' contextual clauses from `it()` into nested `describe('when...')` blocks
* Remove explicit 'Arrange, Act, Assert' comments from tests and structure them so the setup, execution, and verification phases are clear without redundant labels
* Use assertive, verb-first unit test names instead of starting with 'should'
* Use one expect per test case for better clarity and easier debugging; group related tests in describe blocks with shared setup in beforeEach

Full standard is available here for further request: [Testing good practices](.packmind/standards/testing-good-practices.md)

# Standard: Typescript good practices

Enforce TypeScript error and DTO conventions by prohibiting Object.setPrototypeOf in custom errors and requiring intersection types (DomainType & { extraField: T }) for presentation DTO enrichment to improve reliability and catch domain-field drift at compile time. :
* Do not use `Object.setPrototypeOf` when defining errors.
* When defining a presentation DTO that enriches a domain type, use an intersection type (`DomainType & { extraField: T }`) instead of manually re-declaring the domain type's fields, so that structural drift is caught at compile time.

Full standard is available here for further request: [Typescript good practices](.packmind/standards/typescript-good-practices.md)
<!-- end: Packmind standards -->_
