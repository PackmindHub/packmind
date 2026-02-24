---
name: 'Use Case Architecture Patterns'
alwaysApply: true
description: 'Standardize Packmind monorepo use case architecture using hexagonal principles, typed command/response contracts, and role-specific base classes (AbstractMemberUseCase, AbstractAdminUseCase, IPublicUseCase, PackmindCommand/PublicPackmindCommand) to ensure consistent authentication/authorization behavior, clean interfaces, and type-safe command passing via full command objects and port/adapter reuse.'
---

## Standard: Use Case Architecture Patterns

Standardize Packmind monorepo use case architecture using hexagonal principles, typed command/response contracts, and role-specific base classes (AbstractMemberUseCase, AbstractAdminUseCase, IPublicUseCase, PackmindCommand/PublicPackmindCommand) to ensure consistent authentication/authorization behavior, clean interfaces, and type-safe command passing via full command objects and port/adapter reuse. :

- Accept commands as single parameters in adapter methods rather than multiple individual parameters to ensure consistency and easier parameter additions
- Define each use case contract in its own file at packages/types/src/{domain}/contracts/{UseCaseName}.ts with Command type, Response type, and UseCase interface exports
- Export exactly three type definitions from each use case contract file: {Name}Command for input parameters, {Name}Response for return value, and I{Name}UseCase as the interface combining both
- Extend AbstractAdminUseCase and implement executeForAdmins method for use cases requiring admin privileges, with automatic validation that the user is a member with admin role
- Extend AbstractMemberUseCase and implement executeForMembers method for use cases requiring the user to be a member of an organization, with automatic user and organization validation
- Extend PackmindCommand for authenticated use case commands that include userId and organizationId, or extend PublicPackmindCommand for public endpoints without authentication
- Implement IPublicUseCase interface directly with an execute method for public use cases that don't require authentication, without extending any abstract use case class
- Never spread commands as multiple arguments in hexagon or UseCase classes; always pass the complete command object to maintain type safety and reduce errors
- Restrict use case classes to expose only the execute method for public use cases or executeForMembers/executeForAdmins methods for member/admin use cases, with no other public methods
- Reuse existing use cases through port/adapter interfaces instead of instantiating them directly within use cases

Full standard is available here for further request: [Use Case Architecture Patterns](../../../.packmind/standards/use-case-architecture-patterns.md)
