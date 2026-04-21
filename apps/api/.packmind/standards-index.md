# Packmind Standards Index

This standards index contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards

- [NestJS Module Hierarchy](./standards/nestjs-module-hierarchy.md) : Enforce a NestJS module structure where AppModule configures all hierarchical routes via RouterModule.register() and each resource lives in its own module with empty @Controller() paths, URL-mirroring directories, explicit parent IDs (using @Param('orgId')), and command-object service inputs to improve maintainability, scalability, and separation of concerns.
- [REST API Endpoint Design](./standards/rest-api-endpoint-design.md) : Define REST API route and controller endpoint conventions using dedicated POST action endpoints and ownership-chain IDs with one endpoint per business action to keep endpoints predictable, self-documenting, and aligned with business intent.


---

*This standards index was automatically generated from deployed standard versions.*