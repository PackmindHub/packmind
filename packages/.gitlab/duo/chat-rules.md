<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

# Standard: Back-end repositories SQL queries using TypeORM

This standard provides guidelines for writing SQL queries using TypeORM in back-end repositories located in /infra/repositories/\*Repository.ts. TypeORM offers multiple approaches to query data, but f... :
* Handle soft-deleted entities properly using withDeleted() or includeDeleted options. Always respect the QueryOption parameter when provided, and only include deleted entities when explicitly requested.
* Use IN clause with array parameterization for filtering by multiple values. Always pass arrays as spread parameters using :...paramName syntax to ensure proper parameterization.
* Use TypeORM's QueryBuilder with parameterized queries instead of raw SQL strings. Always pass parameters as objects to where(), andWhere(), and other query methods to prevent SQL injection and ensure type safety.

Full standard is available here for further request: [Back-end repositories SQL queries using TypeORM](../../.packmind/standards/back-end-repositories-sql-queries-using-typeorm.md)

# Standard: Back-end TypeScript Clean Code Practices

This standard establishes clean code practices in TypeScript for back-end development to enhance maintainability and ensure consistent patterns across services. It covers logging best practices, error... :
* Avoid excessive logger.debug calls in production code and limit logging to essential logger.info statements. Use logger.info for important business events, logger.error for error handling, and add logger.debug manually only when debugging specific issues.
* Inject PackmindLogger as a constructor parameter with a default value using a variable or a string representing the class name.
* Instantiate use cases in adapters without passing the adapter's logger; use cases must create their own logger for proper origin tracking.
* Keep all import statements at the top of the file before any other code. Never use dynamic imports in the middle of the code unless absolutely necessary for code splitting or lazy loading.
* Use dedicated error types instead of generic Error instances to enable precise error handling and improve code maintainability. Create custom error classes that extend Error with descriptive names and context-specific information.

Full standard is available here for further request: [Back-end TypeScript Clean Code Practices](../../.packmind/standards/back-end-typescript-clean-code-practices.md)

# Standard: Domain Events

Domain events enable communication between hexas without creating direct dependencies. Apply these rules when creating events, emitting them, or implementing listeners to react to events from other do... :
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

Full standard is available here for further request: [Domain Events](../../.packmind/standards/domain-events.md)

# Standard: Port-Adapter Cross-Domain Integration

This standard defines how domain packages communicate with each other through the Port/Adapter pattern in our DDD monorepo architecture. By following these rules, you prevent circular dependencies, ma... :
* Declare all Command and Response types that define contracts between domains in packages/types/src/<domain>/contracts/ to ensure a single source of truth and prevent import cycles between domain packages.
* Define port interfaces in @packmind/types with domain-specific contracts that expose only the operations needed by consumers, where each method accepts a Command type and returns a Response type or domain entity.
* Expose adapters through public getter methods in the Hexa class that return the port interface implementation, as this is the only way external domains should access another domain's functionality.
* Import only port interfaces from @packmind/types in consumer domain Hexas, allowing direct imports of provider Hexa classes only for retrieving the adapter via the registry, but storing the reference typed as the port interface.
* Use async initialize methods for deferred cross-domain dependencies by implementing an async initialize() method on the HexaFactory when a domain needs dependencies that aren't available during construction, retrieving dependencies from the registry using isRegistered() checks before calling get().

Full standard is available here for further request: [Port-Adapter Cross-Domain Integration](../../.packmind/standards/port-adapter-cross-domain-integration.md)

# Standard: Scoped Repository Patterns

Enforce data isolation and consistent query patterns in repositories extending SpaceScopedRepository or OrganizationScopedRepository, ensuring tenant-safe data access across the Packmind codebase. :
* Delegate write operations (`save`, `update`) to the inherited `this.add()` method
* Do not override `findById` in scoped repositories — the base class handles soft delete via `QueryOption.includeDeleted`
* Include `spaceId` or `organizationId` as a parameter on all collection-returning domain interface methods
* Test cross-scope isolation for every finder method returning collections
* Use `createScopedQueryBuilder(spaceId)` or `createScopedQueryBuilder(organizationId)` for all finder methods in scoped repositories

Full standard is available here for further request: [Scoped Repository Patterns](../../.packmind/standards/scoped-repository-patterns.md)

# Standard: Use Case Architecture Patterns

This standard defines how to structure use cases in the Packmind monorepo following hexagonal architecture principles. Use cases represent the entry points to domain logic and must follow consistent p... :
* Accept commands as single parameters in adapter methods rather than multiple individual parameters to ensure consistency and easier parameter additions
* Define each use case contract in its own file at packages/types/src/{domain}/contracts/{UseCaseName}.ts with Command type, Response type, and UseCase interface exports
* Export exactly three type definitions from each use case contract file: {Name}Command for input parameters, {Name}Response for return value, and I{Name}UseCase as the interface combining both
* Extend AbstractAdminUseCase and implement executeForAdmins method for use cases requiring admin privileges, with automatic validation that the user is a member with admin role
* Extend AbstractMemberUseCase and implement executeForMembers method for organization-scoped use cases that do NOT operate within a specific space, with automatic user and organization validation
* Extend AbstractSpaceMemberUseCase and implement executeForSpaceMembers method for use cases operating within a specific space (command includes spaceId), with automatic user, organization, and space membership validation
* Extend PackmindCommand for authenticated use case commands that include userId and organizationId, or extend PublicPackmindCommand for public endpoints without authentication
* Extend SpaceMemberCommand instead of PackmindCommand for use case commands that include a spaceId to get both organizationId and spaceId typing
* Implement IPublicUseCase interface directly with an execute method for public use cases that don't require authentication, without extending any abstract use case class
* Never directly call Repositories in Adapter classes, repos must be called from Use Cases
* Never spread commands as multiple arguments in hexagon or UseCase classes; always pass the complete command object to maintain type safety and reduce errors
* Response and Commands must not be defined in the same file than the associated UseCase class
* Restrict use case classes to expose only the execute method for public use cases or executeForMembers/executeForAdmins methods for member/admin use cases, with no other public methods
* Reuse existing use cases through port/adapter interfaces instead of instantiating them directly within use cases
* UseCase must be associated with a Command and Response type

Full standard is available here for further request: [Use Case Architecture Patterns](../../.packmind/standards/use-case-architecture-patterns.md)
<!-- end: Packmind standards -->