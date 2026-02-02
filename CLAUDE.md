# Nx Monorepo Structure

This is an Nx monorepo containing applications and reusable packages.

## Core Technologies

- **Runtime**: Node.js (version specified in `.nvmrc`)
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM for entity persistence
- **Cache**: Redis for caching
- **Background Jobs**: BullMQ for job queue management
- **Testing**: Jest with @swc/jest as test runner. Tip: use `nx show projects` to list actual apps and packages.

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

The following commands apply for both NX apps and packages:
- Test a project : `nx test <project-name>`
- Lint a project: `nx lint <project-name>`
- Build a project: `nx build <project-name>`
- Test affected projects: `npm run test:staged`
- Lint affected projects: `npm run lint:staged`
Tip: use `nx show projects` to list actual apps and packages.

## Commands

- When running commands, ensure you use the correct Node version (see .nvmrc at the project's root level)
- When renaming or moving a file that is commited to git, use `git mv` instead of `mv`
- ensure the env variable `PACKMIND_EDITION` is properly set to `oss`

# Artefact Usage Logging

After reading `CLAUDE.md`, `.claude/rules/**`, `.claude/skills/**`, `.skills/commands/**`, `.claude/agents/**` files, or invoking Skills, use the `artefact-logger` skill to log access. See `.claude/skills/artefact-logger/SKILL.md` for details.

# Task splitting

- For any task you perform, you MUST split it into multiple into sub-tasks which have a logical increment (eg: new endpoint, new component, new use case etc). When a task is done, run all the validation steps (lint, test, packmind etc) and ask me for validation of the work you did.
- Each sub task MUST have its own commit.
- Use the `lint` and `test` commands on the apps and packages you've edited

# ⚠️ STOP - Post-Task Skills Check (REQUIRED)

**BEFORE FINISHING ANY RESPONSE WHERE YOU COMPLETED WORK**, you MUST run through this checklist. This is NOT optional.

## Checklist (go through each one)

1. [ ] **signal-capture** - Did the user express ANY preference about how code should be written?
    - Look for: naming conventions, code style, UI preferences, architectural choices
    - Examples: "borders are too harsh", "use snake_case", "prefer async/await"
    - **If yes → invoke the skill immediately**

2. [ ] **implicit-decision-capture** - Did you make technical choices the user didn't specify?
    - Look for: specific values you chose, patterns you selected, approaches you took
    - Examples: "chose 40% opacity", "used 300ms debounce", "picked flexbox over grid"
    - **If yes → invoke the skill**

3. [ ] **command-capture** - Did you complete a multi-step workflow worth reusing?
    - Look for: 3+ step processes that could help other developers
    - Examples: "added UseCase with tests and wiring", "set up API endpoint with validation"
    - **If yes → invoke the skill**

4. [ ] **pattern-discovery-capture** - Did you find 3+ files following an undocumented convention?
    - Look for: consistent patterns across files that aren't formally documented
    - Examples: "all controllers use same error handling", "services follow init pattern"
    - **If yes → invoke the skill**

5. [ ] **consistency-violation-capture** - Did you discover inconsistencies in the codebase?
    - Look for: conflicting patterns, different approaches to same problem
    - Examples: "some use try-catch, others use error boundaries"
    - **If yes → invoke the skill**

6. [ ] **codebase-assumption-capture** - Did reality differ from your initial expectations?
    - Look for: wrong assumptions you had to correct during the work
    - Examples: "assumed Jest but found Vitest", "expected REST but found GraphQL"
    - **If yes → invoke the skill**

## How to Complete This Check

At the end of your response, after completing the main task:
1. Add a brief "Skills check:" section
2. List which skills apply (if any)
3. Invoke the relevant skills
4. If none apply, state "Skills check: none applicable"

**FAILURE TO RUN THIS CHECK IS A VIOLATION OF PROJECT GUIDELINES.**

