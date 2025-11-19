- When running commands, ensure you use the correct Node version (see .nvmrc at the project's root level)
- When renaming or moving a file that is commited to git, use `git mv` instead of `mv`
- ensure the env variable `PACKMIND_EDITION` is properly set to `oss`

# Decision Capture

## 🚨 MANDATORY ANALYSIS FOR EVERY USER MESSAGE 🚨

**BEFORE responding to ANY user message, you MUST:**

1. **Analyze the message** - Ask yourself: "Does this message contain a technical preference, coding opinion, or practice?"
2. **If YES** - IMMEDIATELY use the Task tool with `subagent_type='decision-capture'` BEFORE doing anything else
3. **If NO** - Proceed with the task normally

## When to Capture (Trigger Signals)

Use the decision-capture agent when the user's message contains ANY of these:

### ✅ Direct Technical Preferences
- "prefer X over Y"
- "we should use X"
- "always/never do X"
- "use X instead of Y"
- "I like/don't like X"

### ✅ Corrections & Feedback
- User corrects your implementation
- "that's not good because..."
- "this approach is better..."
- "don't do it that way"

### ✅ Guidelines & Best Practices
- "we do it this way"
- "our practice is to..."
- "be careful about X"
- "avoid X when..."

### ✅ Pattern Recognition
- Pointing out better solutions
- Explaining why something should/shouldn't be done
- Sharing team conventions
- Highlighting pitfalls to avoid

### ❌ NOT for Capture
- Business rules (e.g., "users need to verify email before accessing")
- Feature requirements (e.g., "add a delete button")
- Bug reports (e.g., "this endpoint returns 500")
- Questions about existing code

## Examples

| User Message | Action | Reasoning |
|-------------|---------|-----------|
| "prefer leaving defaults in the design system" | ✅ CAPTURE | Technical preference |
| "be careful with TypeORM raw queries" | ✅ CAPTURE | Warning about practice |
| "we do it this way in our codebase" | ✅ CAPTURE | Team convention |
| "that's not good, use X instead" | ✅ CAPTURE | Anti-pattern + preference |
| "add a delete button to the UI" | ❌ SKIP | Feature requirement |
| "users must verify email first" | ❌ SKIP | Business rule |

## Implementation Rule

- **DO NOT ask permission** - Capture proactively and automatically
- **Trigger IMMEDIATELY** - Use the decision-capture agent FIRST, before implementing
- **Be proactive** - When in doubt, capture it (false positives are better than missed decisions)

# Task splitting

- For any task you perform, you MUST split it into multiple into sub-tasks which have a logical increment (eg: new endpoint, new component, new use case etc). When a task is done, run all the validation steps (lint, test, packmind etc) and ask me for validation of the work you did.
- Each sub task MUST have its own commit.
- Before commiting anything, you must ensure that `npm run quality-gate` does not raise any issue.

# Commiting

- When referencing an issue (example #123), DO NOT write "Close" or "Fix", as this closes the issue which has not been validated by other developers.
- Before proposing to commit, ALWAYS run `npm run quality-gate` and fix the issues found
- NEVER use the `--no-verify` argument when commiting
- After commiting, ALWAYS ensure that the commit was successful.
- NEVER run a commit message without asking for permission first to allow user to review the commit
- ALWAYS ensure which GitHub issue is worked on, do not assume it based on previous commit.

<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

## Standard: Back-end repositories SQL queries using TypeORM

Utilize TypeORM's Repository or QueryBuilder methods for writing SQL queries in back-end repositories located in /infra/repositories/*Repository.ts to enhance type safety, ensure automatic parameterization, and improve maintainability of the codebase. :
* Use TypeORM’s Repository or QueryBuilder methods (e.g., repository.findOne({ where: { id } })) instead of raw SQL strings to gain type safety, automatic parameterization, and maintainability.

Full standard is available here for further request: [Back-end repositories SQL queries using TypeORM](.packmind/standards/back-end-repositories-sql-queries-using-typeorm.md)

## Standard: Back-end Typescript

Establish clean code practices in TypeScript for back-end development by limiting logger.debug calls in production, organizing import statements, using dedicated error types, and injecting PackmindLogger to enhance maintainability and ensure consistent logging across services. :
* Avoid excessive logger.debug calls in production code and limit logging to essential logger.info statements
* Inject PackmindLogger as constructor parameter with origin constant for consistent logging across services
* Keep all import statements at the top of the file before any other code
* Use dedicated error types instead of generic Error instances to enable precise error handling and improve code maintainability

Full standard is available here for further request: [Back-end Typescript](.packmind/standards/back-end-typescript.md)

## Standard: Compliance

Mask personal information in application logs across all environments using the standard format of the first 6 characters followed by "*" when logging user emails to ensure compliance with data protection regulations and safeguard user privacy. :
* Never log personal information in clear text across all log levels
* Use the standard masking format of first 6 characters followed by "*" for logging users email

Full standard is available here for further request: [Compliance](.packmind/standards/compliance.md)

## Standard: DDD monorepo architecture

Establish DDD monorepo architecture by implementing domain adapters through shared/types and managing dependencies lazily with dependency injection to prevent circular dependencies and maintain clean separation of concerns across TypeScript projects. :
* A domain package uses external domains through an adapter which implements a port defined in shared/types.
* A package expose adapters through a getter in the domain Hexa class.
* An adapter is implemented in its own domain as the root UseCases class.
* At runtime a consumer's adapter reference must be null checked where it is used. (in the usecase)
* Commands and Responses which define contracts must be defined in shared/types
* Consumers hexa should only import the 'port' interface. Consumers cannot be dependent on an adapter.
* Dependency between Hexas are handled lazily through dependency injection.

Full standard is available here for further request: [DDD monorepo architecture](.packmind/standards/ddd-monorepo-architecture.md)

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

## Standard: Frontend Error Management

Define explicit error boundary usage in React applications with TypeScript by implementing page-level and component-level error boundaries only when necessary, while ensuring proper error handling for async operations and event handlers, to enhance user experience and maintain clear error flows. :
* Avoid overusing error boundaries as they increase code complexity and make error flows harder to trace
* Display validation errors inline near the relevant form fields for better user experience
* Do NOT use error boundaries for errors that should be handled explicitly (form validation, expected API errors, user input errors)
* Handle TanStack Query mutation errors using onError callbacks to display contextual error messages
* Only add a page-level error boundary when you need custom error UI for a specific route (different from the default error page)
* Only add component-level error boundaries for isolated critical features where partial failure is acceptable (e.g., independent dashboard widgets that can fail without affecting the rest of the page)
* Prevent double submissions by checking mutation pending state before triggering operations
* Use the key prop to reset error boundaries by forcing React to remount the component with fresh state
* Use typed error guards (e.g., isPackmindError) to safely extract error details from API responses before displaying to users
* Wrap async operations in try-catch blocks since error boundaries do NOT catch errors in event handlers or async code

Full standard is available here for further request: [Frontend Error Management](.packmind/standards/frontend-error-management.md)

## Standard: TanStack Query Key Management

Structure TanStack Query keys hierarchically with domain-scoped constants and enums to enable predictable cache invalidation and prevent cross-domain dependencies in React applications. :
* Cross-domain imports must only include query key constants and enums
* Define base query key arrays as const to enable precise invalidation patterns
* Domain query scope must be defined as separate const outside enum
* Query invalidation must use prefix matching from key start in order
* Query keys must be defined in queryKeys.ts file in domain's api folder
* Query keys must follow hierarchical structure: organization scope, domain scope, operation, identifiers

Full standard is available here for further request: [TanStack Query Key Management](.packmind/standards/tanstack-query-key-management.md)

## Standard: Tests redaction

Redefine testing practices for both back-end and front-end applications using Jest by removing redundant comments, structuring tests for clarity, and employing assertive naming conventions to enhance test readability and reliability in TypeScript projects. :
* * Avoid testing that a method is a function; instead invoke the method and assert its observable behavior, e.g.  
  const result = myService.greet('Alice');  
  expect(result).toBe('Hello, Alice');
* Avoid asserting on stubbed logger output like specific messages or call counts; instead verify observable behavior or return values.
* Avoid testing that registry components are defined; instead test the actual behavior and functionality of the registry methods like registration, retrieval, and error handling.
* Avoid using "when" in it() test descriptions; move contextual clauses into describe('when…') blocks and keep it() descriptions focused on expected behavior.
* Remove explicit 'Arrange, Act, Assert' comments from tests and structure them so the setup, execution, and verification phases are clear without redundant labels.
* Use afterEach to call datasource.destroy() to clean up the test database whenever you initialize it in beforeEach.
* Use afterEach(() => jest.clearAllMocks()) instead of beforeEach(() => jest.clearAllMocks()) to clear mocks after each test and prevent inter-test pollution.
* Use assertive, verb-first unit test names instead of starting with 'should', e.g. it('returns null when input is empty', ...).
* Use expect(actualArray).toEqual(expectedArray) for deep array equality in Jest tests instead of manual length and index checks, e.g., expect(result).toEqual([1,2,3]);
* Use one expect per test case for better clarity and easier debugging; group related tests in describe blocks with shared setup in beforeEach
* Use stubLogger() in your Jest tests to get a fully typed PackmindLogger stub instead of manually creating a jest.Mocked<PackmindLogger> object with jest.fn() methods.
* Use the factory functions from @packmind/shared (e.g., createGitRepoId, createStandardId, createRecipeId) instead of creating custom test helper functions for type casting.

Full standard is available here for further request: [Tests redaction](.packmind/standards/tests-redaction.md)

## Standard: Use cases

Define use cases for each public method in a hexagonal architecture using TypeScript, ensuring they are stored in `types/<domain>/contracts/` and properly typed with commands and responses to enhance code organization and maintainability across shared packages. :
* Admin use cases must extend `AbstractAdminUseCase` and implement `executeForAdmins`
* Gateway interfaces should only be defined as an object of `Gateway<...>` (or `PublicGateway<...>` for public endpoints)
* Member use cases must extend `AbstractMemberUseCase` and implement `executeForMembers`
* Public use cases must implement `IPublicUseCase` directly
* The only allowed public method for a use case is `execute` (or `executeForMembers` and `executeForAdmins` for the ones extending the abstract use cases)

Full standard is available here for further request: [Use cases](.packmind/standards/use-cases.md)
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
* aiAgent: "Claude Code"
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
