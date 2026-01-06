---
name: Back-end repositories SQL queries using TypeORM
globs: '**/infra/repositories/*.ts'
alwaysApply: false
description: Standardize use of TypeORM QueryBuilder with parameterized WHERE/AND WHERE and IN (:...param) clauses in /infra/repositories/*.ts, including correct handling of soft-deleted entities via withDeleted() or includeDeleted options, to ensure type safety, prevent SQL injection, and improve maintainability and testability of all repository queries.
---

## Standard: Back-end repositories SQL queries using TypeORM

Standardize use of TypeORM QueryBuilder with parameterized WHERE/AND WHERE and IN (:...param) clauses in /infra/repositories/\*.ts, including correct handling of soft-deleted entities via withDeleted() or includeDeleted options, to ensure type safety, prevent SQL injection, and improve maintainability and testability of all repository queries. :

- Handle soft-deleted entities properly using withDeleted() or includeDeleted options. Always respect the QueryOption parameter when provided, and only include deleted entities when explicitly requested.
- Use IN clause with array parameterization for filtering by multiple values. Always pass arrays as spread parameters using :...paramName syntax to ensure proper parameterization.
- Use TypeORM's QueryBuilder with parameterized queries instead of raw SQL strings. Always pass parameters as objects to where(), andWhere(), and other query methods to prevent SQL injection and ensure type safety.

Full standard is available here for further request: [Back-end repositories SQL queries using TypeORM](../../../.packmind/standards/back-end-repositories-sql-queries-using-typeorm.md)
