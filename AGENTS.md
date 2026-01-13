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

## Standard: Back-end repositories SQL queries using TypeORM

Utilize TypeORM's Repository or QueryBuilder methods for writing SQL queries in back-end repositories located in /infra/repositories/*Repository.ts to enhance type safety, ensure automatic parameterization, and improve maintainability of the codebase. :
* Use TypeORM's Repository or QueryBuilder methods (e.g., repository.findOne({ where: { id } })) instead of raw SQL strings to gain type safety, automatic parameterization, and maintainability.

Full standard is available here for further request: [Back-end repositories SQL queries using TypeORM](.packmind/standards/back-end-repositories-sql-queries-using-typeorm.md)

## Standard: Back-end Typescript

Establish clean code practices in TypeScript for back-end development by limiting logger.debug calls in production, organizing import statements, using dedicated error types, and injecting PackmindLogger to enhance maintainability and ensure consistent logging across services. :
* Avoid excessive logger.debug calls in production code and limit logging to essential logger.info statements
* Inject PackmindLogger as constructor parameter with origin constant for consistent logging across services
* Keep all import statements at the top of the file before any other code
* Use dedicated error types instead of generic Error instances to enable precise error handling and improve code maintainability

Full standard is available here for further request: [Back-end Typescript](.packmind/standards/back-end-typescript.md)

## Standard: Front-end UI and Design Systems

Adopt consistent UI component usage by importing from '@packmind/ui' instead of '@chakra-ui' in React applications to ensure uniformity in design and maintainability across the front-end codebase. :
* Never use vanilla HTML tags in frontend code, only @packmind/ui components
* Prefer using the design token 'full' instead of the literal value '100%' for width or height in UI components.
* Use components imported from '@packmind/ui' instead of '@chakra-ui' packages to keep a consistent UI abstraction, e.g.  `import { PMButton } from '@packmind/ui';
* Use only semantic tokens to customize @packmind/ui components.

Full standard is available here for further request: [Front-end UI and Design Systems](.packmind/standards/front-end-ui-and-design-systems.md)

## Standard: Frontend data flow

Establish a structured frontend data flow pattern using React Router v7, @react-router/fs-routes, and TanStack Query in the Packmind codebase to centralize data fetching logic and ensure data availability before rendering, enhancing maintainability and user experience across applications. :
* Define "crumb" property in "handle" hook of RouteModule to define link for navigation breadcrumb
* Don't use gateways directly in frontend route modules. Always access data via query or mutation hooks in these modules.
* Queries options should be exported as well as hooks that use them
* Resource associated to a route should be loaded by its RouteModule in clientLoader
* Route module component name must end by "RouteModule"

Full standard is available here for further request: [Frontend data flow](.packmind/standards/frontend-data-flow.md)

## Standard: TanStack Query Key Management

Structure TanStack Query keys hierarchically with domain-scoped constants and enums to enable predictable cache invalidation and prevent cross-domain dependencies in React applications. :
* Cross-domain imports must only include query key constants and enums
* Define base query key arrays as const to enable precise invalidation patterns
* Domain query scope must be defined as separate const outside enum
* Query invalidation must use prefix matching from key start in order
* Query keys must be defined in queryKeys.ts file in domain's api folder
* Query keys must follow hierarchical structure: organization scope, domain scope, operation, identifiers

Full standard is available here for further request: [TanStack Query Key Management](.packmind/standards/tanstack-query-key-management.md)
<!-- end: Packmind standards -->
