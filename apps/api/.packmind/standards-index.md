# Packmind Standards Index

This standards index contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards

- [NestJS Module Hierarchy](./standards/nestjs-module-hierarchy.md) : Establish a consistent NestJS module structure in the API application where each resource is encapsulated in its own module with proper hierarchical organization to enhance maintainability, scalability, and clear separation of concerns across the codebase. This standard applies to all modules (new and existing) in apps/api/src/app/ and ensures that the module structure mirrors the URL hierarchy, making it easier to navigate and understand the application's architecture.
- [REST API Endpoint Design](./standards/rest-api-endpoint-design.md) : Conventions for designing REST API endpoints that are predictable, self-documenting, and aligned with distinct business actions. Favors dedicated action endpoints over generic status updates, and routes that reflect the ownership hierarchy without unrelated resource IDs.


---

*This standards index was automatically generated from deployed standard versions.*