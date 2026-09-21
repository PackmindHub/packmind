# Scoped Repository Patterns

Enforce data isolation and consistent query patterns in repositories extending SpaceScopedRepository or OrganizationScopedRepository, ensuring tenant-safe data access across the Packmind codebase.

## Scope

Repositories extending SpaceScopedRepository or OrganizationScopedRepository (**/infra/repositories/*Repository.ts)

## Rules

* Use `createScopedQueryBuilder(spaceId)` or `createScopedQueryBuilder(organizationId)` for all finder methods in scoped repositories
* Do not override `findById` in scoped repositories — the base class handles soft delete via `QueryOption.includeDeleted`
* Delegate write operations (`save`, `update`) to the inherited `this.add()` method
* Test cross-scope isolation for every finder method returning collections
* Declare `spaceId` or `organizationId` as a required parameter on collection-returning interface methods not already narrowed by a tenant-owned parent id — never optional
* Justify every deliberately cross-tenant read with a comment naming the caller that requires it
