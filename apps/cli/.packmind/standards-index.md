# Packmind Standards Index

This standards index contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards

- [CLI Command Structure](./standards/cli-command-structure.md) : Enforce clear separation of concerns between command definition (parameters and metadata) and handler logic (validation, execution, and output) in apps/cli commands to improve testability, maintainability, and consistency.
- [CLI Gateway Implementation](./standards/cli-packmindgateway-method-implementation.md) : When adding new methods to the PackmindGateway class in the CLI application, use the PackmindHttpClient abstraction to avoid code duplication and maintain consistency. The older methods contain extensive boilerplate (manual API key decoding, JWT parsing, duplicated error handling) that should not be replicated.
- [CLI Use Case Structure](./standards/cli-use-case-structure.md) : Enforce clean separation between domain contracts and application logic in apps/cli use cases, ensuring use cases focus purely on business operations without presentation concerns like user output or generic error handling.


---

*This standards index was automatically generated from deployed standard versions.*