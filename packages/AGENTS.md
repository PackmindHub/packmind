# Packages

This directory contains reusable domain and infrastructure packages shared across applications.

## Package Categories

### Core Infrastructure

- **types** - Shared TypeScript types and interfaces used across packages and apps
- **logger** - Logging utilities with console and structured output support
- **node-utils** - Node.js utility functions for file system, path manipulation, and common operations
- **test-utils** - Test factories, fixtures, and utilities for consistent test data creation
- **migrations** - TypeORM database migrations for schema evolution

### Domain Packages

- **accounts** - User account management, authentication, and user profiles
- **spaces** - Workspace management, space members, roles, and permissions
- **standards** - Coding standards creation, storage, and retrieval
- **recipes** - Multi-step coding recipe definitions and execution
- **skills** - AI agent skill definitions and management
- **editions** - Product edition management (OSS, Enterprise, etc.)

### Integration & Deployment

- **git** - Git repository operations for standards and recipe deployment
- **deployments** - Deployment pipeline for distributing standards, recipes, and skills to AI agents
- **coding-agent** - AI coding agent integration and rendering for multiple agent types (Claude Code, Cursor, etc.)

### Language Analysis

- **linter-ast** - Abstract syntax tree (AST) analysis and manipulation utilities
- **linter-execution** - Linting rule execution engine for coding standards
- **llm** - Large language model integration for AI-powered features

### Frontend

- **frontend** - Shared frontend utilities, hooks, and contexts
- **ui** - Reusable UI components with Chakra UI (PM-prefixed components)

### Supporting

- **assets** - Static assets, WASM files, and embedded resources

## Working with Packages

### Common Nx Commands

- Build a package: `nx build <package-name>`
- Test a package: `nx test <package-name>`
- Lint a package: `nx lint <package-name>`

**Example packages**: `types`, `logger`, `accounts`, `standards`, `ui`, `node-utils`, `test-utils`

<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

## Standard: UseCase Test Structure and Validation

Define testing patterns for use case unit tests to ensure consistent organization and comprehensive validation coverage in the Packmind hexagonal architecture. :
* Group test scenarios by execution context using nested describe blocks with shared setup in beforeEach to eliminate duplication and improve test readability
* Test all validation error scenarios individually with distinct test cases to ensure each validation rule is properly enforced and error messages are accurate

Full standard is available here for further request: [UseCase Test Structure and Validation](.packmind/standards/usecase-test-structure-and-validation.md)

## Standard: Domain Events

Use when creating domain events, emitting events from use cases, or implementing listeners. :
* Define event classes in `packages/types/src/{domain}/events/` with an `index.ts` barrel file
* Define payload as a separate `{EventName}Payload` interface
* Extend `PackmindListener<TAdapter>` and implement `registerHandlers()` to subscribe to events
* Extend `UserEvent` for user-triggered actions, `SystemEvent` for background/automated processes
* Include `userId` and `organizationId` in UserEvent payloads; include `organizationId` in SystemEvent payloads when applicable
* Suffix event class names with `Event` (e.g., `StandardUpdatedEvent`)
* Use `eventEmitterService.emit(new MyEvent(payload))` to emit events
* Use `static override readonly eventName` with `domain.entity.action` pattern
* Use `this.subscribe(EventClass, this.handlerMethod)` to register handlers
* Use arrow functions for handlers to preserve `this` binding

Full standard is available here for further request: [Domain Events](.packmind/standards/domain-events.md)

## Standard: Back-end TypeScript Clean Code Practices

Establish back-end TypeScript clean code rules in the Packmind monorepo (/packages/**/*.ts)—including PackmindLogger constructor injection, disciplined logger.info/error usage, top-of-file static imports, custom Error subclasses, and adapter-created use cases with their own loggers—to improve maintainability, debuggability, and consistent architecture across services. :
* Avoid excessive logger.debug calls in production code and limit logging to essential logger.info statements. Use logger.info for important business events, logger.error for error handling, and add logger.debug manually only when debugging specific issues.
* Inject PackmindLogger as a constructor parameter with a default value using a variable or a string representing the class name.
* Instantiate use cases in adapters without passing the adapter's logger; use cases must create their own logger for proper origin tracking.
* Keep all import statements at the top of the file before any other code. Never use dynamic imports in the middle of the code unless absolutely necessary for code splitting or lazy loading.
* Use dedicated error types instead of generic Error instances to enable precise error handling and improve code maintainability. Create custom error classes that extend Error with descriptive names and context-specific information.

Full standard is available here for further request: [Back-end TypeScript Clean Code Practices](.packmind/standards/back-end-typescript-clean-code-practices.md)

## Standard: Use Case Architecture Patterns

Standardize Packmind monorepo use case architecture using hexagonal principles, typed command/response contracts, and role-specific base classes (AbstractMemberUseCase, AbstractAdminUseCase, IPublicUseCase, PackmindCommand/PublicPackmindCommand) to ensure consistent authentication/authorization behavior, clean interfaces, and type-safe command passing via full command objects and port/adapter reuse. :
* Accept commands as single parameters in adapter methods rather than multiple individual parameters to ensure consistency and easier parameter additions
* Define each use case contract in its own file at packages/types/src/{domain}/contracts/{UseCaseName}.ts with Command type, Response type, and UseCase interface exports
* Export exactly three type definitions from each use case contract file: {Name}Command for input parameters, {Name}Response for return value, and I{Name}UseCase as the interface combining both
* Extend AbstractAdminUseCase and implement executeForAdmins method for use cases requiring admin privileges, with automatic validation that the user is a member with admin role
* Extend AbstractMemberUseCase and implement executeForMembers method for use cases requiring the user to be a member of an organization, with automatic user and organization validation
* Extend PackmindCommand for authenticated use case commands that include userId and organizationId, or extend PublicPackmindCommand for public endpoints without authentication
* Implement IPublicUseCase interface directly with an execute method for public use cases that don't require authentication, without extending any abstract use case class
* Never spread commands as multiple arguments in hexagon or UseCase classes; always pass the complete command object to maintain type safety and reduce errors
* Restrict use case classes to expose only the execute method for public use cases or executeForMembers/executeForAdmins methods for member/admin use cases, with no other public methods
* Reuse existing use cases through port/adapter interfaces instead of instantiating them directly within use cases

Full standard is available here for further request: [Use Case Architecture Patterns](.packmind/standards/use-case-architecture-patterns.md)

## Standard: Port-Adapter Cross-Domain Integration

Define port interfaces and cross-domain contracts in @packmind/types and packages/types/src/<domain>/contracts/, expose adapters via Hexa getters, and use async HexaFactory.initialize() with registry isRegistered()/get() checks to prevent circular dependencies, maintain loose coupling, and support resilient synchronous and asynchronous cross-domain operations. :
* Declare all Command and Response types that define contracts between domains in packages/types/src/<domain>/contracts/ to ensure a single source of truth and prevent import cycles between domain packages.
* Define port interfaces in @packmind/types with domain-specific contracts that expose only the operations needed by consumers, where each method accepts a Command type and returns a Response type or domain entity.
* Expose adapters through public getter methods in the Hexa class that return the port interface implementation, as this is the only way external domains should access another domain's functionality.
* Import only port interfaces from @packmind/types in consumer domain Hexas, allowing direct imports of provider Hexa classes only for retrieving the adapter via the registry, but storing the reference typed as the port interface.
* Use async initialize methods for deferred cross-domain dependencies by implementing an async initialize() method on the HexaFactory when a domain needs dependencies that aren't available during construction, retrieving dependencies from the registry using isRegistered() checks before calling get().

Full standard is available here for further request: [Port-Adapter Cross-Domain Integration](.packmind/standards/port-adapter-cross-domain-integration.md)

## Standard: Jest Test Suite Organization and Patterns

Establish Jest test suite organization and patterns governing test file structure, describe/it hierarchy, typed mocking using jest.Mocked<ServiceType> and createMockInstance, factory-based test data and @packmind/types createUserId/createOrganizationId/createStandardId helpers, assertion conventions (single primary assertion, .not.toHaveBeenCalled()), test ordering (happy path, error cases, edge cases, complex scenarios), and validation/error-handling patterns for TypeScript/Node.js monorepo code (including Express or frontend React/Vue components where applicable) and toolchains (ESLint, Prettier, Webpack/Vite) with CI/infrastructure considerations (Docker, Kubernetes, AWS) to ensure reliable, maintainable, and debuggable unit and integration tests when writing or refactoring test suites with Jest. :
* Define reusable test data at the describe block level before test cases when the data is shared across multiple tests
* Group related complex scenarios in dedicated describe blocks (e.g., 'rate limiting', 'multiple organizations') with multiple test cases covering different aspects
* Order tests within each describe block: happy path first, then error cases, then edge cases (null/undefined/empty/whitespace), then complex scenarios
* Organize describe blocks using 'with...' prefix for input/state conditions and 'when...' prefix for action-based scenarios
* Test all validation edge cases systematically in separate describe blocks: empty string, whitespace-only, null, undefined, and minimal valid input
* Use .not.toHaveBeenCalled() to verify services were not invoked in error or validation failure scenarios
* Use `createXXXId` functions from @packmind/types (createUserId, createOrganizationId, createStandardId, createRecipeId) for creating typed IDs in test data
* Use createMockInstance to create mock instances
* Use typed mocks with 'jest.Mocked<ServiceType>' and initialize them in beforeEach using the pattern '{ methodName: jest.fn() } as unknown as jest.Mocked<ServiceType>'

Full standard is available here for further request: [Jest Test Suite Organization and Patterns](.packmind/standards/jest-test-suite-organization-and-patterns.md)

## Standard: Compliance - Logging Personal Information

Enforce masking of personal information in TypeScript logs, using a standard first-6-characters-plus-* format for emails and similar patterns for other identifiers, to protect user privacy, comply with data protection regulations, and reduce security risks when handling user-related log entries. :
* Never log personal information in clear text across all log levels. Always mask sensitive data such as emails, phone numbers, IP addresses, and other personally identifiable information before logging.
* Use the standard masking format of first 6 characters followed by "*" for logging user emails. This ensures consistency across the codebase and makes it easier to audit logs for compliance.

Full standard is available here for further request: [Compliance - Logging Personal Information](.packmind/standards/compliance-logging-personal-information.md)

## Standard: Backend Tests Redaction

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

## Standard: Back-end repositories SQL queries using TypeORM

Standardize use of TypeORM QueryBuilder with parameterized WHERE/AND WHERE and IN (:...param) clauses in /infra/repositories/*.ts, including correct handling of soft-deleted entities via withDeleted() or includeDeleted options, to ensure type safety, prevent SQL injection, and improve maintainability and testability of all repository queries. :
* Handle soft-deleted entities properly using withDeleted() or includeDeleted options. Always respect the QueryOption parameter when provided, and only include deleted entities when explicitly requested.
* Use IN clause with array parameterization for filtering by multiple values. Always pass arrays as spread parameters using :...paramName syntax to ensure proper parameterization.
* Use TypeORM's QueryBuilder with parameterized queries instead of raw SQL strings. Always pass parameters as objects to where(), andWhere(), and other query methods to prevent SQL injection and ensure type safety.

Full standard is available here for further request: [Back-end repositories SQL queries using TypeORM](.packmind/standards/back-end-repositories-sql-queries-using-typeorm.md)
<!-- end: Packmind standards -->
