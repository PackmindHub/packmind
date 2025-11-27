- When running commands, ensure you use the correct Node version (see .nvmrc at the project's root level)
- When renaming or moving a file that is commited to git, use `git mv` instead of `mv`
- ensure the env variable `PACKMIND_EDITION` is properly set to `oss`

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

## Standard: UseCase Test Structure and Validation

Define testing patterns for use case unit tests to ensure consistent organization and comprehensive validation coverage in the Packmind hexagonal architecture. :
* Group test scenarios by execution context using nested describe blocks with shared setup in beforeEach to eliminate duplication and improve test readability
* Test all validation error scenarios individually with distinct test cases to ensure each validation rule is properly enforced and error messages are accurate

Full standard is available here for further request: [UseCase Test Structure and Validation](.packmind/standards/usecase-test-structure-and-validation.md)

## Standard: Back-end TypeScript Clean Code Practices

Apply back-end TypeScript clean code practices by implementing logging best practices, error handling with custom error types, and organized code structure to enhance maintainability and ensure consistent patterns across services in the Packmind monorepo when writing services, use cases, controllers, and any back-end TypeScript code. :
* Avoid excessive logger.debug calls in production code and limit logging to essential logger.info statements. Use logger.info for important business events, logger.error for error handling, and add logger.debug manually only when debugging specific issues.
* Inject PackmindLogger as constructor parameter with origin constant for consistent logging across services. Define a const origin at the top of the file with the class name, then inject PackmindLogger with a default value using that origin.
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

## Standard: Compliance - Logging Personal Information

Ensure personal information is masked in logs using a standard format in TypeScript projects to maintain user privacy and comply with data protection regulations when logging user-related information or debugging authentication flows. :
* Never log personal information in clear text across all log levels. Always mask sensitive data such as emails, phone numbers, IP addresses, and other personally identifiable information before logging.
* Use the standard masking format of first 6 characters followed by "*" for logging user emails. This ensures consistency across the codebase and makes it easier to audit logs for compliance.

Full standard is available here for further request: [Compliance - Logging Personal Information](.packmind/standards/compliance-logging-personal-information.md)

## Standard: Backend Tests Redaction

Enforce backend test practices for /**/*.spec.ts in the Packmind monorepo by prescribing Jest-based TypeScript patterns—behavioral testing that invokes methods (not asserting a method is a function), clear describe/it scoping (move "when" into describe), verb-first test names, one expect per test, expect(actualArray).toEqual(expectedArray) for deep array equality, avoid asserting on stubbed logger messages or registry definedness, remove explicit "Arrange/Act/Assert" comments, use afterEach(() => datasource.destroy()) for DB cleanup and afterEach(() => jest.clearAllMocks()) to prevent inter-test pollution, and prefer stubLogger() for a fully typed PackmindLogger stub—to ensure clarity, maintainability, consistency, and reliable, easy-to-debug backend unit, integration, and service tests when writing or refactoring tests. :
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

## Standard: Back-end repositories SQL queries using TypeORM

Implement SQL query guidelines using TypeORM's QueryBuilder in back-end repositories under /infra/repositories/*Repository.ts to enhance type safety, prevent SQL injection, and improve code maintainability when writing database queries, including lookups, joins, and handling soft-deleted entities. :
* Handle soft-deleted entities properly using withDeleted() or includeDeleted options. Always respect the QueryOption parameter when provided, and only include deleted entities when explicitly requested.
* Use IN clause with array parameterization for filtering by multiple values. Always pass arrays as spread parameters using :...paramName syntax to ensure proper parameterization.
* Use TypeORM's QueryBuilder with parameterized queries instead of raw SQL strings. Always pass parameters as objects to where(), andWhere(), and other query methods to prevent SQL injection and ensure type safety.

Full standard is available here for further request: [Back-end repositories SQL queries using TypeORM](.packmind/standards/back-end-repositories-sql-queries-using-typeorm.md)

## Standard: NestJS Module Hierarchy

Establish a consistent NestJS module hierarchy using RouterModule.register() for routing and dedicated modules for each resource in the apps/api/src/app/ directory to enhance maintainability and scalability by mirroring the URL hierarchy and ensuring clear separation of concerns across the codebase, applicable to all modules including controllers, services, and modules. :
* Configure all hierarchical routing exclusively in AppModule using RouterModule.register() with nested children arrays to ensure a single source of truth for the entire API route structure
* Create a dedicated NestJS module for each resource type, preventing controllers from handling sub-resource routes to maintain clear separation of concerns
* Define controller routes using empty @Controller() decorators to inherit path segments from RouterModule configuration and avoid path duplication
* Import child modules in parent module's imports array and register them as children in AppModule's RouterModule configuration to establish proper module dependencies
* Include all parent resource IDs in URL paths to make hierarchical relationships explicit and enable proper resource scoping and validation
* Place module files in directories that mirror the URL path hierarchy to make the codebase structure immediately understandable
* Use organization ID from route parameters (@Param('orgId')) instead of extracting it from AuthRequest to ensure consistency with the URL hierarchy

Full standard is available here for further request: [NestJS Module Hierarchy](.packmind/standards/nestjs-module-hierarchy.md)

## Standard: TypeScript Naming Practices

Apply these rules whenever defining TypeScript interfaces or abstract classes. :
* Prefix abstract classes with Abstract to distinguish them from concrete implementations.
* Prefix interfaces with I so their role is immediately recognizable.

Full standard is available here for further request: [TypeScript Naming Practices](.packmind/standards/typescript-naming-practices.md)
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
* gitRepo: "repository"
* target: "/"

**Remember: Always check the recipes list first, but only use recipes that actually apply to your specific task.**`

## Available recipes

* [Create New Package in Monorepo](.packmind/recipes/create-new-package-in-monorepo.md): Create a new buildable TypeScript package in the Packmind monorepo using Nx tools to establish a shared library for code reuse across applications and packages when setting up common utilities or implementing domain-specific logic.
* [How to Write TypeORM Migrations in Packmind](.packmind/recipes/how-to-write-typeorm-migrations-in-packmind.md): Write TypeORM migrations in the Packmind monorepo to manage and version database schema changes with consistent logging, reversible rollbacks, and shared helpers so you can safely create or modify tables, columns, and foreign-key relationships whenever schema changes need to be tracked and reversible.
<!-- end: Packmind recipes -->
