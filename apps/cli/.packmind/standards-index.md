# Packmind Standards Index

This standards index contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards

- [CLI Command Structure](./standards/cli-command-structure.md) : Enforce cmd-ts CLI command definitions (Command.ts) to contain only name/description/args and delegate to separate Handler.ts functions that validate inputs, run PackmindCliHexa with PackmindLogger, handle domain errors, and standardize output/exit codes via consoleLogger utilities to improve testability, maintainability, and consistent user feedback.
- [CLI Gateway Implementation](./standards/cli-packmindgateway-method-implementation.md) : Standardize apps/cli/src/infra/repositories/*Gateway.ts PackmindGateway methods to use PackmindHttpClient (getAuthContext and typed request<T> with options for non-GET), delegate to sub-gateways, and expose only Gateway<UseCase> interfaces to reduce boilerplate, enforce type safety, and keep authentication and error handling consistent.
- [CLI Use Case Structure](./standards/cli-use-case-structure.md) : Enforce CLI use case separation by defining IPublicUseCase<Command, Response> interfaces with co-located Command/Response types in apps/cli/src/domain/useCases/ and implementing business-only logic in apps/cli/src/application/useCases/ using custom errors from apps/cli/src/domain/errors/ (no console or output handlers) to improve modularity, reuse, and predictable error handling.


---

*This standards index was automatically generated from deployed standard versions.*