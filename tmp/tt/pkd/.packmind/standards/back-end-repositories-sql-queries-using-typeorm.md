# Back-end repositories SQL queries using TypeORM

This standard provides guidelines for writing SQL queries using TypeORM in back-end repositories located in /infra/repositories/\*Repository.ts. TypeORM offers multiple approaches to query data, but following consistent patterns enhances type safety, ensures automatic parameterization to prevent SQL injection, improves code maintainability, and makes queries easier to test and debug. This standard applies to all database queries in repository classes, including simple lookups, complex joins, filtering with WHERE clauses, and handling soft-deleted entities.

## Rules

* Use TypeORM's QueryBuilder with parameterized queries instead of raw SQL strings. Always pass parameters as objects to where(), andWhere(), and other query methods to prevent SQL injection and ensure type safety.
* Handle soft-deleted entities properly using withDeleted() or includeDeleted options. Always respect the QueryOption parameter when provided, and only include deleted entities when explicitly requested.
* Use IN clause with array parameterization for filtering by multiple values. Always pass arrays as spread parameters using :...paramName syntax to ensure proper parameterization.
