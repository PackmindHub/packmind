# Packmind Standards Index

This standards index contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards

- [Back-end repositories SQL queries using TypeORM](./standards/back-end-repositories-sql-queries-using-typeorm.md) : Implement SQL query guidelines using TypeORM's QueryBuilder in back-end repositories under /infra/repositories/*Repository.ts to enhance type safety, prevent SQL injection, and improve code maintainability when writing database queries, including lookups, joins, and handling soft-deleted entities.
- [Backend Tests Redaction](./standards/backend-tests-redaction.md) : Enforce backend test conventions for .spec.ts files in the Packmind monorepo using Jest with TypeScript/Node.js by favoring behavioral assertions over implementation checks, organizing context in describe('when…') blocks with verb-first it names, preferring expect(...).toEqual for deep array equality and one expect per test, using afterEach(() => jest.clearAllMocks()) and afterEach(() => datasource.destroy()) to prevent inter-test pollution and clean the test database (TypeORM DataSource or equivalent), and using stubLogger() for typed PackmindLogger stubs to ensure readable, reliable, maintainable unit, integration and service tests when writing or refactoring backend tests
- [Front-end UI and Design Systems](./standards/front-end-ui-and-design-systems.md) : Adopt guidelines for using Chakra UI v3 through the @packmind/ui design system in React applications to ensure consistent UI implementation and visual consistency, applying this standard when building or modifying any frontend components.


---

*This standards index was automatically generated from deployed standard versions.*