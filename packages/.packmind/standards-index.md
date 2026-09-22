# Packmind Standards Index

This standards index contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards

- [Back-end repositories SQL queries using TypeORM](./standards/back-end-repositories-sql-queries-using-typeorm.md) : This standard provides guidelines for writing SQL queries using TypeORM in back-end repositories located in /infra/repositories/\*Repository.ts. TypeORM offers multiple approaches to query data, but following consistent patterns enhances type safety, ensures automatic parameterization to prevent SQL injection, improves code maintainability, and makes queries easier to test and debug. This standard applies to all database queries in repository classes, including simple lookups, complex joins, filtering with WHERE clauses, and handling soft-deleted entities.
- [Back-end TypeScript Clean Code Practices](./standards/back-end-typescript-clean-code-practices.md) : This standard establishes clean code practices in TypeScript for back-end development to enhance maintainability and ensure consistent patterns across services. It covers logging best practices, error handling, code organization, and dependency injection patterns. These rules apply when writing services, use cases, controllers, and any back-end TypeScript code in the Packmind monorepo. Following these practices ensures code is maintainable, debuggable, and follows established architectural patterns.
- [Domain Error Handling](./standards/domain-error-handling.md) : Failures raised by a use case are answered centrally by `DomainExceptionFilter`, which maps them to an HTTP status and a log level. A failure carrying no `kind` reaches Nest's `ExceptionsHandler` as an unrecognised exception: it answers 500 and logs a full stack at error level, even when the right answer was a 404. Three interfaces carrying a `kind`, whose values do not overlap, are declared in `packages/types/src/errors/` — `DomainError` (`DomainErrorKind` = `not_found` | `forbidden` | `invalid_input` | `conflict`) for failures the caller caused and can correct, `InternalError` (`kind: 'internal'`, base class `PackmindInternalError`) for broken invariants that are our own bug, and `UpstreamError` (`UpstreamErrorKind` = `upstream_unavailable` | `upstream_rate_limited`, base class `PackmindUpstreamError`) for failures owned by a third party we depend on. The three partition failures by *fault* — the caller's, ours, a third party's — and fault is the axis rather than the HTTP status class, which is why `upstream_rate_limited` answers a 4xx and is still not a `DomainErrorKind`.

| kind | HTTP | Log level | Message returned to the caller | Retried by the frontend |
| --- | --- | --- | --- | --- |
| `not_found` | 404 | warn | yes | no |
| `forbidden` | 403 | warn | yes | no |
| `invalid_input` | 400 | warn | yes | no |
| `conflict` | 409 | warn | yes | no |
| `internal` | 500 | error, with stack | no — Nest's generic body | yes, once |
| `upstream_unavailable` (`PackmindUpstreamError`) | 502 | warn | yes | yes, once |
| `upstream_rate_limited` (`PackmindUpstreamError`) | 429 | warn | yes, plus `Retry-After` | no |

Reference implementations: `packages/node-utils/src/nest/filters/DomainExceptionFilter.ts` holds the `KIND_POLICY` and `UPSTREAM_KIND_POLICY` tables and is registered as a global `APP_FILTER`; `packages/node-utils/src/application/UserAccessErrors.ts` and `packages/deployments/src/domain/errors/DeploymentsError.ts` show the class shape; `packages/deployments/src/domain/errors/SpaceNotAccessibleError.ts` shows a message that does not leak; `packages/types/src/errors/UpstreamError.ts` declares the upstream family, `packages/git/src/domain/errors/GitUpstreamError.ts` shows a package's upstream base, `packages/git/src/domain/errors/GithubRateLimitedError.ts` shows a throttle carrying `retryAfterSeconds`, and `packages/git/src/infra/repositories/http/githubRateLimit.ts` shows classifying from the provider's response instead of its message.


packages/**/*.ts,apps/api/**/*.controller.ts
- [Domain Events](./standards/domain-events.md) : Domain events enable communication between hexas without creating direct dependencies. Apply these rules when creating events, emitting them, or implementing listeners to react to events from other domains.
- [Port-Adapter Cross-Domain Integration](./standards/port-adapter-cross-domain-integration.md) : This standard defines how domain packages communicate with each other through the Port/Adapter pattern in our DDD monorepo architecture. By following these rules, you prevent circular dependencies, maintain loose coupling between domains, and enable both synchronous and asynchronous cross-domain operations with graceful degradation for optional dependencies.
- [Scoped Repository Patterns](./standards/scoped-repository-patterns.md) : Enforce data isolation and consistent query patterns in repositories extending SpaceScopedRepository or OrganizationScopedRepository, ensuring tenant-safe data access across the Packmind codebase.
- [Use Case Architecture Patterns](./standards/use-case-architecture-patterns.md) : This standard defines how to structure use cases in the Packmind monorepo following hexagonal architecture principles. Use cases represent the entry points to domain logic and must follow consistent patterns for authentication, authorization, and command/response structures. This standard applies when creating new use cases, refactoring existing ones, or implementing cross-domain integrations through hexagon facades. Each use case corresponds to a single business operation and must be properly typed, validated, and accessible through a clean contract interface. The standard enforces separation of concerns between public (unauthenticated), member (organization member), and admin (organization admin) operations.


---

*This standards index was automatically generated from deployed standard versions.*