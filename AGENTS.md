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

## Standard: Typescript code standards

Adopt TypeScript code standards by prefixing interfaces with "I" and abstract classes with "Abstract" while choosing "Type" for plain objects and "Interface" for implementations to enhance clarity and maintainability when writing .ts files. :
* Prefix abstract classes with Abstract
* Prefix interfaces with I
* Use Type for plain objects, Interface when implmentation is required

Full standard is available here for further request: [Typescript code standards](.packmind/standards/typescript-code-standards.md)

## Standard: Tests redaction

Apply good practices for test redaction in **/*.spec.ts files using single expectations, assertive titles, and nested describe blocks for workflows to improve test clarity and maintainability during the development and testing of TypeScript applications. :
* Tests have a single expectation
* Tests have an assertive title and do not start with should
* Tests that show a workflow uses multiple describe to nest steps

Full standard is available here for further request: [Tests redaction](.packmind/standards/tests-redaction.md)
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

* [Working with Git Worktrees in Cursor](.packmind/recipes/working-with-git-worktrees-in-cursor.md): Enable parallel development on multiple branches simultaneously without switching contexts, with automatic setup and clean commit integration.
* [Creating End-User Documentation for Packmind](.packmind/recipes/creating-end-user-documentation-for-packmind.md): Create clear and concise end-user documentation for Packmind features to empower users in accomplishing their tasks effectively while avoiding unnecessary technical details.
* [Adding ai-agent rendering system](.packmind/recipes/adding-ai-agent-rendering-system.md): Implement a new AI agent rendering pipeline in Packmind that wires a deployer, type mappings, frontend configuration, documentation, and comprehensive tests to support both single-file and multi-file formats for distributing standards and recipes whenever you add or extend integrations for AI coding assistants.
* [Create New Package](.packmind/recipes/create-new-package-in-monorepo.md): Create a new buildable TypeScript package in the Packmind Nx monorepo, wiring up TypeScript paths, TypeORM, and Webpack so it can serve as a reusable shared or domain-specific library for consistent, type-safe code reuse across applications.
* [Create or update model and TypeORM schemas](.packmind/recipes/create-or-update-model-and-typeorm-schemas.md): Create and evolve TypeORM-backed domain models, schemas, repositories, and migrations to keep your database structure consistent, maintainable, and backward compatible when business requirements or existing entities change.
* [Gateway Pattern Implementation in Packmind Frontend](.packmind/recipes/gateway-pattern-implementation-in-packmind-frontend.md): Implement gateways in the Packmind frontend to create a clean abstraction for API communication, enhancing maintainability and testability across the application.
* [How to Write TypeORM Migrations in Packmind](.packmind/recipes/how-to-write-typeorm-migrations-in-packmind.md): Write TypeORM migrations in the Packmind monorepo to manage and version database schema changes with consistent logging, reversible rollbacks, and shared helpers so you can safely create or modify tables, columns, and foreign-key relationships whenever schema changes need to be tracked and reversible.
* [Repository Implementation and Testing Pattern](.packmind/recipes/repository-implementation-and-testing-pattern.md): Implement a standardized repository with soft delete functionality and comprehensive tests to ensure maintainable code and reliable data access patterns in the Packmind codebase.
* [Wrapping Chakra UI with Slot Components](.packmind/recipes/wrapping-chakra-ui-with-slot-components.md): Create slot components to wrap Chakra UI primitives for enhanced custom composition and API consistency in your design system.
<!-- end: Packmind recipes -->
