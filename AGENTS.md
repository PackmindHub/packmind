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

* [Back-end repositories SQL queries using TypeORM](.packmind/standards/back-end-repositories-sql-queries-using-typeorm.md): Utilize TypeORM's Repository or QueryBuilder methods for writing SQL queries in back-end repositories located in /infra/repositories/*Repository.ts to enhance type safety, ensure automatic parameterization, and improve maintainability of the codebase.
* [Back-end Typescript](.packmind/standards/back-end-typescript.md): Establish clean code practices in TypeScript for back-end development by limiting logger.debug calls in production, organizing import statements, using dedicated error types, and injecting PackmindLogger to enhance maintainability and ensure consistent logging across services.
* [DDD monorepo architecture](.packmind/standards/ddd-monorepo-architecture.md): Establish DDD monorepo architecture by implementing domain adapters through shared/types and managing dependencies lazily with dependency injection to prevent circular dependencies and maintain clean separation of concerns across TypeScript projects.
* [Front-end UI and Design Systems](.packmind/standards/front-end-ui-and-design-systems.md): Adopt consistent UI component usage by importing from '@packmind/ui' instead of '@chakra-ui' in React applications to ensure uniformity in design and maintainability across the front-end codebase.
* [Frontend data flow](.packmind/standards/frontend-data-flow.md): Establish a structured frontend data flow pattern using React Router v7, @react-router/fs-routes, and TanStack Query in the Packmind codebase to centralize data fetching logic and ensure data availability before rendering, enhancing maintainability and user experience across applications.
* [Tests redaction](.packmind/standards/tests-redaction.md): Redefine testing practices for both back-end and front-end applications using Jest by removing redundant comments, structuring tests for clarity, and employing assertive naming conventions to enhance test readability and reliability in TypeScript projects.
* [Use cases](.packmind/standards/use-cases.md): Define use cases for each public method in a hexagonal architecture using TypeScript, ensuring they are stored in `types/<domain>/contracts/` and properly typed with commands and responses to enhance code organization and maintainability across shared packages.
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

## Recipe Usage Tracking:
When you DO use or apply a relevant Packmind recipe from .packmind/recipes/, you MUST call the 'packmind_notify_recipe_usage' MCP tool with:
* Recipe slugs array (e.g., ["recipe-name"] from "recipe-name.md")
* aiAgent: "AGENTS.md"
* gitRepo: "PackmindHub/packmind-monorepo"
* target: "/"

**Remember: Always check the recipes list first, but only use recipes that actually apply to your specific task.**`

## Available recipes

* [Check GitHub Webhook Headers](.packmind/recipes/check-github-webhook-headers.md): Validate GitHub webhook headers to ensure only push events are processed, enhancing event handling efficiency in your application.
* [Create or update model and TypeORM schemas](.packmind/recipes/create-or-update-model-and-typeorm-schemas.md): "Create new models and update existing ones with TypeORM to ensure proper database structure and maintainability when adapting to evolving business requirements."
* [Create Organization-Scoped Page with React Router Navigation](.packmind/recipes/create-organization-scoped-page-with-react-router-navigation.md): "Create organization-scoped pages in a React Router application to enhance navigation and user experience by ensuring secure access to relevant data for each organization."
* [Create UseCase Test Class Template](.packmind/recipes/create-usecase-test-class-template.md): "Create a comprehensive test class for UseCases to ensure consistent testing patterns and thorough coverage of various execution scenarios in the Packmind monorepo."
* [Creating a new test factory](.packmind/recipes/creating-a-new-test-factory.md): "Create a test factory for each entity to generate consistent and randomized test data, ensuring reliable and efficient testing of your application."
* [Creating End-User Documentation for Packmind](.packmind/recipes/creating-end-user-documentation-for-packmind.md): Create clear and concise end-user documentation for Packmind features to empower users in accomplishing their tasks effectively while avoiding unnecessary technical details.
* [Gateway Pattern Implementation in Packmind Frontend](.packmind/recipes/gateway-pattern-implementation-in-packmind-frontend.md): Implement gateways in the Packmind frontend to create a clean abstraction for API communication, enhancing maintainability and testability across the application.
* [Hexa Entities Migration to Shared Types](.packmind/recipes/hexa-entities-migration-to-shared-types.md): Migrate cross-domain entities to a shared types folder to eliminate circular dependencies and establish a single source of truth for improved code organization and maintainability.
* [hexagonal usecase port-adapter refactoring](.packmind/recipes/hexagonal-usecase-port-adapter-refactoring.md): Refactor hexagonal use cases to implement a domain Port interface that simplifies dependency management and enhances testability and maintainability when integrating multiple use cases at the service layer.
* [How to Write TypeORM Migrations in Packmind](.packmind/recipes/how-to-write-typeorm-migrations-in-packmind.md): "Write TypeORM migrations in the Packmind monorepo to manage database schema changes effectively while ensuring proper logging and rollback capabilities."
* [Refactor Use Case to Follow IUseCase Pattern](.packmind/recipes/refactor-use-case-to-follow-iusecase-pattern.md): Refactor existing use cases to implement the IUseCase pattern for consistent command/response typing and enhanced business rule enforcement, ensuring maintainability and clarity across your application's architecture.
* [Repository Implementation and Testing Pattern](.packmind/recipes/repository-implementation-and-testing-pattern.md): Implement a standardized repository with soft delete functionality and comprehensive tests to ensure maintainable code and reliable data access patterns in the Packmind codebase.
* [Using Environment Variables with Configuration.getConfig](.packmind/recipes/using-environment-variables-with-configurationgetconfig.md): Access environment variables using `Configuration.getConfig()` to streamline configuration management across local and production environments, ensuring secure and consistent access to sensitive data.
* [Wrapping Chakra UI with Slot Components](.packmind/recipes/wrapping-chakra-ui-with-slot-components.md): "Create slot components to wrap Chakra UI primitives for enhanced custom composition and API consistency in your design system."
<!-- end: Packmind recipes -->
