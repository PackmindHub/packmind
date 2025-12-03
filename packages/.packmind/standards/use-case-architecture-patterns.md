# Use Case Architecture Patterns

This standard defines how to structure use cases in the Packmind monorepo following hexagonal architecture principles. Use cases represent the entry points to domain logic and must follow consistent patterns for authentication, authorization, and command/response structures. This standard applies when creating new use cases, refactoring existing ones, or implementing cross-domain integrations through hexagon facades. Each use case corresponds to a single business operation and must be properly typed, validated, and accessible through a clean contract interface. The standard enforces separation of concerns between public (unauthenticated), member (organization member), and admin (organization admin) operations.

## Rules

* Define each use case contract in its own file at packages/types/src/{domain}/contracts/{UseCaseName}.ts with Command type, Response type, and UseCase interface exports
* Extend PackmindCommand for authenticated use case commands that include userId and organizationId, or extend PublicPackmindCommand for public endpoints without authentication
* Export exactly three type definitions from each use case contract file: {Name}Command for input parameters, {Name}Response for return value, and I{Name}UseCase as the interface combining both
* Extend AbstractMemberUseCase and implement executeForMembers method for use cases requiring the user to be a member of an organization, with automatic user and organization validation
* Extend AbstractAdminUseCase and implement executeForAdmins method for use cases requiring admin privileges, with automatic validation that the user is a member with admin role
* Implement IPublicUseCase interface directly with an execute method for public use cases that don't require authentication, without extending any abstract use case class
* Restrict use case classes to expose only the execute method for public use cases or executeForMembers/executeForAdmins methods for member/admin use cases, with no other public methods
* Accept commands as single parameters in adapter methods rather than multiple individual parameters to ensure consistency and easier parameter additions
* Never spread commands as multiple arguments in hexagon or UseCase classes; always pass the complete command object to maintain type safety and reduce errors
* Reuse existing use cases through port/adapter interfaces instead of instantiating them directly within use cases
