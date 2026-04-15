# Packmind Commands Index

This file contains all available coding commands that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and use proven patterns in coding tasks.

## Available Commands

- [Create handoff](commands/create-handoff.md) : Generate a concise, structured handoff document from the current conversation—including scope, relevant files with line numbers, discoveries, work done, status, next steps, and key code snippets—so another agent can immediately resume the task with full context, especially when transferring work between agents or pausing and resuming complex projects.
- [Create New Package](commands/create-new-package-in-monorepo.md) : Create a new buildable TypeScript package in the Packmind Nx monorepo, wiring up TypeScript paths, TypeORM, and Webpack so it can serve as a reusable shared or domain-specific library for consistent, type-safe code reuse across applications.
- [Create or update model and TypeORM schemas](commands/create-or-update-model-and-typeorm-schemas.md) : Create and evolve TypeORM-backed domain models, schemas, repositories, and migrations to keep your database structure consistent, maintainable, and backward compatible when business requirements or existing entities change.
- [Creating End-User Documentation for Packmind](commands/creating-end-user-documentation-for-packmind.md) : Create user-focused Packmind documentation within `apps/doc/` that explains features in clear task-oriented language without technical implementation details to help end users accomplish specific goals effectively when adding or updating guides for new or existing functionality.
- [Gateway Pattern Implementation in Packmind Frontend](commands/gateway-pattern-implementation-in-packmind-frontend.md) : Implement gateways in the Packmind frontend to create a clean abstraction for API communication, enhancing maintainability and testability across the application.
- [How to Write TypeORM Migrations in Packmind](commands/how-to-write-typeorm-migrations-in-packmind.md) : Write TypeORM migrations in the Packmind monorepo to manage and version database schema changes with consistent logging, reversible rollbacks, and shared helpers so you can safely create or modify tables, columns, and foreign-key relationships whenever schema changes need to be tracked and reversible.
- [Release app](commands/release-app.md) : Create and push a Packmind release by verifying a clean git state, bumping package versions, updating CHANGELOG links and dates, tagging `release/{{version}}`, and preparing the next Unreleased section to ensure a consistent, traceable release workflow when publishing a new version.
- [Repository Implementation and Testing Pattern](commands/repository-implementation-and-testing-pattern.md) : Implement a Packmind-standard TypeORM repository with soft-delete support and comprehensive factory-driven tests to enforce consistent, reliable data access patterns and prevent regressions when adding new entities or domain-specific finder methods.
- [Resume handoff](commands/resume-handoff.md) : Resume work from a handoff document by parsing its scope, context, progress, and next steps so you can seamlessly continue execution with full situational awareness whenever you pick up a task started by someone else or from an earlier session.
- [Update Handoff](commands/update-handoff.md) : Update an existing handoff document with the current session's progress, preserving prior work history while refreshing status and next steps. Falls back to creating a new handoff if no source file is found.
- [Wrapping Chakra UI with Slot Components](commands/wrapping-chakra-ui-with-slot-components.md) : Create slot components to wrap Chakra UI primitives for enhanced custom composition and API consistency in your design system.


---

*This file was automatically generated from deployed command versions.*