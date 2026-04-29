# Scoped Repository Patterns

Enforce data isolation and consistent query patterns in repositories extending SpaceScopedRepository or OrganizationScopedRepository, ensuring tenant-safe data access across the Packmind codebase.

## Rules

* Use `createScopedQueryBuilder(spaceId)` or `createScopedQueryBuilder(organizationId)` for all finder methods in scoped repositories
* Do not override `findById` in scoped repositories — the base class handles soft delete via `QueryOption.includeDeleted`
* Include `spaceId` or `organizationId` as a parameter on all collection-returning domain interface methods
* Delegate write operations (`save`, `update`) to the inherited `this.add()` method
* Test cross-scope isolation for every finder method returning collections
