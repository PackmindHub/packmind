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

Implement SQL query guidelines using TypeORM's QueryBuilder in back-end repositories under /infra/repositories/*Repository.ts to enhance type safety, prevent SQL injection, and improve code maintainability when writing database queries, including lookups, joins, and handling soft-deleted entities. :
* Handle soft-deleted entities properly using withDeleted() or includeDeleted options. Always respect the QueryOption parameter when provided, and only include deleted entities when explicitly requested.
* Use IN clause with array parameterization for filtering by multiple values. Always pass arrays as spread parameters using :...paramName syntax to ensure proper parameterization.
* Use TypeORM's QueryBuilder with parameterized queries instead of raw SQL strings. Always pass parameters as objects to where(), andWhere(), and other query methods to prevent SQL injection and ensure type safety.

Full standard is available here for further request: [Back-end repositories SQL queries using TypeORM](.packmind/standards/back-end-repositories-sql-queries-using-typeorm.md)

## Standard: Backend Tests Redaction

Enforce backend test conventions for .spec.ts files in the Packmind monorepo using Jest with TypeScript/Node.js by favoring behavioral assertions over implementation checks, organizing context in describe('when…') blocks with verb-first it names, preferring expect(...).toEqual for deep array equality and one expect per test, using afterEach(() => jest.clearAllMocks()) and afterEach(() => datasource.destroy()) to prevent inter-test pollution and clean the test database (TypeORM DataSource or equivalent), and using stubLogger() for typed PackmindLogger stubs to ensure readable, reliable, maintainable unit, integration and service tests when writing or refactoring backend tests :
* Avoid asserting on stubbed logger output like specific messages or call counts; instead verify observable behavior or return values
* Avoid testing that a method is a function; instead invoke the method and assert its observable behavior
* Avoid testing that registry components are defined; instead test the actual behavior and functionality of the registry methods like registration, retrieval, and error handling
* Avoid using "when" in it() test descriptions; move contextual clauses into describe('when…') blocks and keep it() descriptions focused on expected behavior
* Remove explicit 'Arrange, Act, Assert' comments from tests and structure them so the setup, execution, and verification phases are clear without redundant labels
* Use afterEach to call datasource.destroy() to clean up the test database whenever you initialize it in beforeEach
* Use afterEach(() => jest.clearAllMocks()) instead of beforeEach(() => jest.clearAllMocks()) to clear mocks after each test and prevent inter-test pollution
* Use assertive, verb-first unit test names instead of starting with 'should'
* Use expect(actualArray).toEqual(expectedArray) for deep array equality in Jest tests instead of manual length and index checks
* Use one expect per test case for better clarity and easier debugging; group related tests in describe blocks with shared setup in beforeEach
* Use stubLogger() in Jest tests to get a fully typed PackmindLogger stub instead of manually creating a jest.Mocked<PackmindLogger> object with jest.fn() methods

Full standard is available here for further request: [Backend Tests Redaction](.packmind/standards/backend-tests-redaction.md)

## Standard: Front-end UI and Design Systems

Adopt guidelines for using Chakra UI v3 through the @packmind/ui design system in React applications to ensure consistent UI implementation and visual consistency, applying this standard when building or modifying any frontend components. :
* Never use vanilla HTML tags (div, span, button, input, etc.) in frontend component code; always use corresponding @packmind/ui components (PMBox, PMText, PMButton, PMInput, etc.) to ensure consistent styling and theming.
* Prefer using the design token 'full' instead of the literal value '100%' for width or height properties in UI components to maintain consistency with the design system.
* Use components imported from '@packmind/ui' instead of '@chakra-ui' packages to maintain a consistent UI abstraction layer, e.g., import { PMButton } from '@packmind/ui'; not import { Button } from '@chakra-ui/react';
* Use only semantic tokens to customize @packmind/ui components, such as colorPalette for color schemes, background.primary/secondary/tertiary for backgrounds, text.primary/secondary/tertiary for text colors, and border.primary/secondary/tertiary for borders, rather than hardcoded color values.

Full standard is available here for further request: [Front-end UI and Design Systems](.packmind/standards/front-end-ui-and-design-systems.md)
<!-- end: Packmind standards -->

