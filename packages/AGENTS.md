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

- Build a package: `./node_modules/.bin/nx build <package-name>`
- Test a package: `./node_modules/.bin/nx test <package-name>`
- Lint a package: `./node_modules/.bin/nx lint <package-name>`

**Example packages**: `types`, `logger`, `accounts`, `standards`, `ui`, `node-utils`, `test-utils`

<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

# Standard: Back-end repositories SQL queries using TypeORM

Standardize use of TypeORM QueryBuilder with parameterized WHERE/AND WHERE and IN (:...param) clauses in /infra/repositories/*.ts, including correct handling of soft-deleted entities via withDeleted() or includeDeleted options, to ensure type safety, prevent SQL injection, and improve maintainability and testability of all repository queries. :
* Handle soft-deleted entities properly using withDeleted() or includeDeleted options. Always respect the QueryOption parameter when provided, and only include deleted entities when explicitly requested.
* Use IN clause with array parameterization for filtering by multiple values. Always pass arrays as spread parameters using :...paramName syntax to ensure proper parameterization.
* Use TypeORM's QueryBuilder with parameterized queries instead of raw SQL strings. Always pass parameters as objects to where(), andWhere(), and other query methods to prevent SQL injection and ensure type safety.

Full standard is available here for further request: [Back-end repositories SQL queries using TypeORM](.packmind/standards/back-end-repositories-sql-queries-using-typeorm.md)

# Standard: Back-end TypeScript Clean Code Practices

Establish back-end TypeScript clean code rules in the Packmind monorepo (/packages/**/*.ts)—including PackmindLogger constructor injection, disciplined logger.info/error usage, top-of-file static imports, custom Error subclasses, and adapter-created use cases with their own loggers—to improve maintainability, debuggability, and consistent architecture across services. :
* Avoid excessive logger.debug calls in production code and limit logging to essential logger.info statements. Use logger.info for important business events, logger.error for error handling, and add logger.debug manually only when debugging specific issues.
* Inject PackmindLogger as a constructor parameter with a default value using a variable or a string representing the class name.
* Instantiate use cases in adapters without passing the adapter's logger; use cases must create their own logger for proper origin tracking.
* Keep all import statements at the top of the file before any other code. Never use dynamic imports in the middle of the code unless absolutely necessary for code splitting or lazy loading.
* Use dedicated error types instead of generic Error instances to enable precise error handling and improve code maintainability. Create custom error classes that extend Error with descriptive names and context-specific information.

Full standard is available here for further request: [Back-end TypeScript Clean Code Practices](.packmind/standards/back-end-typescript-clean-code-practices.md)

# Standard: Domain Events

Standardize TypeScript domain events by defining `{EventName}Payload` interfaces and `Event`-suffixed classes in `packages/types/src/{domain}/events/` (barrel `index.ts`) extending `UserEvent`/`SystemEvent` with `static override readonly eventName` in `domain.entity.action` format, emitting via `eventEmitterService.emit(new MyEvent(payload))`, and handling via `PackmindListener<TAdapter>.registerHandlers()` with `this.subscribe(EventClass, this.handlerMethod)` and arrow-function handlers to enable decoupled cross-domain communication and reliable subscriptions. :
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

# Standard: Port-Adapter Cross-Domain Integration

Define port interfaces and cross-domain contracts in @packmind/types and packages/types/src/<domain>/contracts/, expose adapters via Hexa getters, and use async HexaFactory.initialize() with registry isRegistered()/get() checks to prevent circular dependencies, maintain loose coupling, and support resilient synchronous and asynchronous cross-domain operations. :
* Declare all Command and Response types that define contracts between domains in packages/types/src/<domain>/contracts/ to ensure a single source of truth and prevent import cycles between domain packages.
* Define port interfaces in @packmind/types with domain-specific contracts that expose only the operations needed by consumers, where each method accepts a Command type and returns a Response type or domain entity.
* Expose adapters through public getter methods in the Hexa class that return the port interface implementation, as this is the only way external domains should access another domain's functionality.
* Import only port interfaces from @packmind/types in consumer domain Hexas, allowing direct imports of provider Hexa classes only for retrieving the adapter via the registry, but storing the reference typed as the port interface.
* Use async initialize methods for deferred cross-domain dependencies by implementing an async initialize() method on the HexaFactory when a domain needs dependencies that aren't available during construction, retrieving dependencies from the registry using isRegistered() checks before calling get().

Full standard is available here for further request: [Port-Adapter Cross-Domain Integration](.packmind/standards/port-adapter-cross-domain-integration.md)

# Standard: Scoped Repository Patterns

Enforce tenant-safe repository query and write patterns in Packmind repositories extending SpaceScopedRepository or OrganizationScopedRepository by using createScopedQueryBuilder, avoiding findById overrides, requiring scope IDs on collection methods, delegating saves/updates to this.add(), and testing cross-scope isolation to ensure consistent data isolation and soft-delete correctness. :
* Delegate write operations (`save`, `update`) to the inherited `this.add()` method
* Do not override `findById` in scoped repositories — the base class handles soft delete via `QueryOption.includeDeleted`
* Include `spaceId` or `organizationId` as a parameter on all collection-returning domain interface methods
* Test cross-scope isolation for every finder method returning collections
* Use `createScopedQueryBuilder(spaceId)` or `createScopedQueryBuilder(organizationId)` for all finder methods in scoped repositories

Full standard is available here for further request: [Scoped Repository Patterns](.packmind/standards/scoped-repository-patterns.md)

# Standard: Use Case Architecture Patterns

Standardize hexagonal-architecture use case contracts and implementations in the Packmind monorepo by defining typed Command/Response/IUseCase exports under packages/types/src/{domain}/contracts, extending PackmindCommand/PublicPackmindCommand/SpaceMemberCommand and AbstractMemberUseCase/AbstractAdminUseCase/AbstractSpaceMemberUseCase with command-object-only execution methods to enforce consistent auth/validation, clean contracts, and safer reuse via ports/adapters. :
* Accept commands as single parameters in adapter methods rather than multiple individual parameters to ensure consistency and easier parameter additions
* Define each use case contract in its own file at packages/types/src/{domain}/contracts/{UseCaseName}.ts with Command type, Response type, and UseCase interface exports
* Export exactly three type definitions from each use case contract file: {Name}Command for input parameters, {Name}Response for return value, and I{Name}UseCase as the interface combining both
* Extend AbstractAdminUseCase and implement executeForAdmins method for use cases requiring admin privileges, with automatic validation that the user is a member with admin role
* Extend AbstractMemberUseCase and implement executeForMembers method for organization-scoped use cases that do NOT operate within a specific space, with automatic user and organization validation
* Extend AbstractSpaceMemberUseCase and implement executeForSpaceMembers method for use cases operating within a specific space (command includes spaceId), with automatic user, organization, and space membership validation
* Extend PackmindCommand for authenticated use case commands that include userId and organizationId, or extend PublicPackmindCommand for public endpoints without authentication
* Extend SpaceMemberCommand instead of PackmindCommand for use case commands that include a spaceId to get both organizationId and spaceId typing
* Implement IPublicUseCase interface directly with an execute method for public use cases that don't require authentication, without extending any abstract use case class
* Never spread commands as multiple arguments in hexagon or UseCase classes; always pass the complete command object to maintain type safety and reduce errors
* Restrict use case classes to expose only the execute method for public use cases or executeForMembers/executeForAdmins methods for member/admin use cases, with no other public methods
* Reuse existing use cases through port/adapter interfaces instead of instantiating them directly within use cases

Full standard is available here for further request: [Use Case Architecture Patterns](.packmind/standards/use-case-architecture-patterns.md)
<!-- end: Packmind standards -->
