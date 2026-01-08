- When running commands, ensure you use the correct Node version (see .nvmrc at the project's root level)
- When renaming or moving a file that is commited to git, use `git mv` instead of `mv`

# Issues Management

- Issues are defined and tracked in the **Packmind MonoRepo GitHub Project** (Project #2)
- All development work should reference the appropriate GitHub issue number when applicable
- Issues follow a structured workflow: Backlog → Todo → In Progress → To review → Done

## GitHub MCP Issue Operations

The GitHub MCP provides tools to interact with issues programmatically:

### List Issues
```typescript
mcp_github_list_issues({
  owner: "PackmindHub",
  repo: "packmind-monorepo",
  state: "OPEN",        // "OPEN", "CLOSED", or omit for all
  perPage: 50           // Number of results per page
})
```

### Get Specific Issue
```typescript
mcp_github_get_issue({
  owner: "PackmindHub",
  repo: "packmind-monorepo", 
  issue_number: 197     // The issue number (not ID)
})
```

### Add Comment to Issue
```typescript
mcp_github_add_issue_comment({
  owner: "PackmindHub",
  repo: "packmind-monorepo",
  issue_number: 197,
  body: "## Your comment content\n\nMarkdown is supported for formatting."
})
```

**Note**: Use these tools to track progress, document decisions, and communicate with the team directly through GitHub issues.

# Task splitting

- For any task you perform, you MUST split it into multiple into sub-tasks which have a logical increment (eg: new endpoint, new component, new use case etc). When a task is done, run all the validation steps (lint, test, packmind etc) and ask me for validation of the work you did.
- Each sub task MUST have its own commit.
- Before commiting anything, you must ensure that `npm run quality-gate` does not raise any issue.

# Commiting

- When referencing an issue (example #123), DO NOT write "Close" or "Fix", as this closes the issue which has not been validated by other developers.
- Before proposing to commit, ALWAYS run `npm run quality-gate` and fix the issues found
- NEVER use the `--no-verify` argument when commiting
- After commiting, ALWAYS ensure that the commit was successful.

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

Define unit test structure and naming in *.spec.ts(x) files by using verb-first assertive titles, Arrange-Act-Assert organization without comments, nested describe('when...') blocks, and one expect per test to improve readability, maintainability, and debugging clarity. :
* Follow  'Arrange, Act, Assert' pattern
* Move 'when' contextual clauses from `it()` into nested `describe('when...')` blocks
* Remove explicit 'Arrange, Act, Assert' comments from tests and structure them so the setup, execution, and verification phases are clear without redundant labels
* Use assertive, verb-first unit test names instead of starting with 'should'
* Use one expect per test case for better clarity and easier debugging; group related tests in describe blocks with shared setup in beforeEach

Full standard is available here for further request: [Testing good practices](.packmind/standards/testing-good-practices.md)
<!-- end: Packmind standards -->

<!-- start: Packmind recipes -->
# Packmind Recipes

🚨 **MANDATORY STEP** 🚨

Before writing, editing, or generating ANY code:

**ALWAYS READ**: the available recipes below to see what recipes are available

## Recipe Usage Rules:
- **MANDATORY**: Always check the recipes list first
- **CONDITIONAL**: Only read/use individual recipes if they are relevant to your task
- **OPTIONAL**: If no recipes are relevant, proceed without using any

**Remember: Always check the recipes list first, but only use recipes that actually apply to your specific task.**`

## Available recipes

* [Working with Git Worktrees in Cursor](.packmind/commands/working-with-git-worktrees-in-cursor.md): Enable parallel development on multiple branches simultaneously without switching contexts, with automatic setup and clean commit integration.
* [Creating End-User Documentation for Packmind](.packmind/commands/creating-end-user-documentation-for-packmind.md): Create clear and concise end-user documentation for Packmind features to empower users in accomplishing their tasks effectively while avoiding unnecessary technical details.
* [Adding ai-agent rendering system](.packmind/commands/adding-ai-agent-rendering-system.md): Implement a new AI agent rendering pipeline in Packmind that wires a deployer, type mappings, frontend configuration, documentation, and comprehensive tests to support both single-file and multi-file formats for distributing standards and recipes whenever you add or extend integrations for AI coding assistants.
* [Create New Package](.packmind/commands/create-new-package-in-monorepo.md): Create a new buildable TypeScript package in the Packmind Nx monorepo, wiring up TypeScript paths, TypeORM, and Webpack so it can serve as a reusable shared or domain-specific library for consistent, type-safe code reuse across applications.
* [Create or update model and TypeORM schemas](.packmind/commands/create-or-update-model-and-typeorm-schemas.md): Create and evolve TypeORM-backed domain models, schemas, repositories, and migrations to keep your database structure consistent, maintainable, and backward compatible when business requirements or existing entities change.
* [Gateway Pattern Implementation in Packmind Frontend](.packmind/commands/gateway-pattern-implementation-in-packmind-frontend.md): Implement gateways in the Packmind frontend to create a clean abstraction for API communication, enhancing maintainability and testability across the application.
* [How to Write TypeORM Migrations in Packmind](.packmind/commands/how-to-write-typeorm-migrations-in-packmind.md): Write TypeORM migrations in the Packmind monorepo to manage and version database schema changes with consistent logging, reversible rollbacks, and shared helpers so you can safely create or modify tables, columns, and foreign-key relationships whenever schema changes need to be tracked and reversible.
* [Repository Implementation and Testing Pattern](.packmind/commands/repository-implementation-and-testing-pattern.md): Implement a standardized repository with soft delete functionality and comprehensive tests to ensure maintainable code and reliable data access patterns in the Packmind codebase.
* [Wrapping Chakra UI with Slot Components](.packmind/commands/wrapping-chakra-ui-with-slot-components.md): Create slot components to wrap Chakra UI primitives for enhanced custom composition and API consistency in your design system.
<!-- end: Packmind recipes -->
