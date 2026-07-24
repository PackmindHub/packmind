---
name: 'Scoped Repository Patterns'
paths:
  - "Repositories extending SpaceScopedRepository or OrganizationScopedRepository (**/infra/repositories/*Repository.ts)"
alwaysApply: false
description: 'Enforce data isolation and consistent query patterns in repositories extending SpaceScopedRepository or OrganizationScopedRepository, ensuring tenant-safe data access across the Packmind codebase.'
---

# Standard: Scoped Repository Patterns

Enforce data isolation and consistent query patterns in repositories extending SpaceScopedRepository or OrganizationScopedRepository, ensuring tenant-safe data access across the Packmind codebase. :
* Delegate write operations (`save`, `update`) to the inherited `this.add()` method
* Do not override `findById` in scoped repositories — the base class handles soft delete via `QueryOption.includeDeleted`
* Include `spaceId` or `organizationId` as a parameter on all collection-returning domain interface methods
* Test cross-scope isolation for every finder method returning collections
* Use `createScopedQueryBuilder(spaceId)` or `createScopedQueryBuilder(organizationId)` for all finder methods in scoped repositories

Full standard is available here for further request: [Scoped Repository Patterns](../../../.packmind/standards/scoped-repository-patterns.md)