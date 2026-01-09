# Packmind Standards Index

This standards index contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards

- [Back-end repositories SQL queries using TypeORM](./standards/back-end-repositories-sql-queries-using-typeorm.md) : Utilize TypeORM's Repository or QueryBuilder methods for writing SQL queries in back-end repositories located in /infra/repositories/*Repository.ts to enhance type safety, ensure automatic parameterization, and improve maintainability of the codebase.
- [Back-end Typescript](./standards/back-end-typescript.md) : Establish clean code practices in TypeScript for back-end development by limiting logger.debug calls in production, organizing import statements, using dedicated error types, and injecting PackmindLogger to enhance maintainability and ensure consistent logging across services.
- [Front-end UI and Design Systems](./standards/front-end-ui-and-design-systems.md) : Adopt consistent UI component usage by importing from '@packmind/ui' instead of '@chakra-ui' in React applications to ensure uniformity in design and maintainability across the front-end codebase.
- [Frontend data flow](./standards/frontend-data-flow.md) : Establish a structured frontend data flow pattern using React Router v7, @react-router/fs-routes, and TanStack Query in the Packmind codebase to centralize data fetching logic and ensure data availability before rendering, enhancing maintainability and user experience across applications.
- [qqqqq](./standards/qqqqq.md) : qqqqq
- [TanStack Query Key Management](./standards/tanstack-query-key-management.md) : Structure TanStack Query keys hierarchically with domain-scoped constants and enums to enable predictable cache invalidation and prevent cross-domain dependencies in React applications.


---

*This standards index was automatically generated from deployed standard versions.*