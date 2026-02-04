# Nx Monorepo Structure

This is an Nx monorepo containing applications and reusable packages.

## Core Technologies

- **Runtime**: Node.js (version specified in `.nvmrc`)
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM for entity persistence
- **Cache**: Redis for caching
- **Background Jobs**: BullMQ for job queue management
- **Testing**: Jest with @swc/jest as test runner. Tests are run with `nx run <project-name>` as detailed below.

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
Don't use `nx serve` commands for local development, let user starts the stack with `docker compose up`

## Working with Nx

The following commands apply for both NX apps and packages (use `nx show projects` to list actual apps and packages.)
- Test a project: `nx test <project-name>`
- Lint a project: `nx lint <project-name>`
- Build a project: `nx build <project-name>`
- Test affected projects: `npm run test:staged`
- Lint affected projects: `npm run lint:staged`


## Commands

- When running commands, ensure you use the correct Node version (see .nvmrc at the project's root level)
- When renaming or moving a file that is commited to git, use `git mv` instead of `mv`
- Ensure the env variable `PACKMIND_EDITION` is properly set to `oss`

# Artefact Usage Logging

After reading `CLAUDE.md`, `.claude/rules/**`, `.claude/skills/**`, `.skills/commands/**`, `.claude/agents/**` files, or invoking Skills, use the `artefact-logger` skill to log access. See `.claude/skills/artefact-logger/SKILL.md` for details.

# Task splitting

- For any task you perform, you MUST split it into multiple into sub-tasks which have a logical increment (eg: new endpoint, new component, new use case etc). When a task is done, run all the validation steps (lint, test, packmind etc) and ask me for validation of the work you did.
- Each sub task MUST have its own commit.
- Use the `lint` and `test` commands on the apps and packages you've edited

<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

## Standard: Changelog

Maintain CHANGELOG.MD using Keep a Changelog format with a top [Unreleased] section linked to HEAD, ISO 8601 dates (YYYY-MM-DD), and per-release comparison links like [X.Y.Z]: https://github.com/PackmindHub/packmind/compare/release/<previous>...release/X.Y.Z to ensure accurate, consistent release documentation and version links. :
* Ensure all released versions have their corresponding comparison links defined at the bottom of the CHANGELOG.MD file in the format [X.Y.Z]: https://github.com/PackmindHub/packmind/compare/release/<previous>...release/X.Y.Z
* Format all release dates using the ISO 8601 date format YYYY-MM-DD (e.g., 2025-11-21) to ensure consistent and internationally recognized date representation
* Maintain an [Unreleased] section at the top of the changelog with its corresponding link at the bottom pointing to HEAD to track ongoing changes between releases

Full standard is available here for further request: [Changelog](.packmind/standards/changelog.md)

## Standard: Testing good practices

Standardize unit test structure and naming in TypeScript/TSX test files using verb-first descriptions, Arrange-Act-Assert flow without comments, nested describe('when...') context blocks, and single-expect test cases to improve readability, maintainability, and debugging. :
* Follow  'Arrange, Act, Assert' pattern
* Move 'when' contextual clauses from `it()` into nested `describe('when...')` blocks
* Remove explicit 'Arrange, Act, Assert' comments from tests and structure them so the setup, execution, and verification phases are clear without redundant labels
* Use assertive, verb-first unit test names instead of starting with 'should'
* Use one expect per test case for better clarity and easier debugging; group related tests in describe blocks with shared setup in beforeEach

Full standard is available here for further request: [Testing good practices](.packmind/standards/testing-good-practices.md)
<!-- end: Packmind standards -->
