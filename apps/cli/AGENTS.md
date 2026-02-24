# CLI Application

Command-line interface for Packmind, built with cmd-ts and tree-sitter parsers.

## Architecture

- **CLI Framework**: cmd-ts for type-safe command definition and argument parsing
- **Code Analysis**: tree-sitter parsers for language-specific AST parsing
- **Output**: Platform-specific executable binaries (Linux, macOS, Windows)
- **Build Tool**: esbuild for fast bundling, Bun for executable creation
- **Parser Strategy**: WASM-embedded parsers for portability

### Command Structure

- Commands defined in `src/infra/commands/` directory
- Each command exports a cmd-ts `command` object
- Root command aggregates subcommands with `subcommands()` helper

## Technologies

- **cmd-ts**: Type-safe CLI argument parsing and command routing
- **tree-sitter**: Language parsers for TypeScript, JavaScript, Python, etc.
- **esbuild**: Fast JavaScript/TypeScript bundler
- **Bun**: Runtime for building standalone executables

## Main Commands

- Build: `nx build cli`
- Test: `nx test cli`
- Build npm executable (current platform): `npm run packmind-cli:build`
- Build portable bun executables: `bun run apps/cli/bun-build.ts --target=all`
- Lint: `nx lint cli`

<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

## Standard: CLI Gateway Implementation

Standardize apps/cli/src/infra/repositories/*Gateway.ts PackmindGateway methods to use PackmindHttpClient (getAuthContext and typed request<T> with options for non-GET), delegate to sub-gateways, and expose only Gateway<UseCase> interfaces to reduce boilerplate, enforce type safety, and keep authentication and error handling consistent. :
* Define the method return type using `Promise<ResponseType>` for type safety
* Gateway implementations methods should always be typed using `Gateway<UseCase>`
* Gateway interfaces should only expose `Gateway<UseCase>`
* Gateway should never expose custom command or response types
* Keep gateway methods concise by delegating authentication and error handling to `PackmindHttpClient`
* PackmindGateway must delegate to sub-gateways for each hexa
* Pass HTTP method and body via options object to `httpClient.request()` for non-GET requests (e.g., `{ method: 'POST', body: data }`)
* Use `this.httpClient.getAuthContext()` to retrieve `organizationId` instead of manually decoding the API key and JWT
* Use `this.httpClient.request<ResponseType>()` for all HTTP calls instead of manual fetch with duplicated error handling

Full standard is available here for further request: [CLI Gateway Implementation](.packmind/standards/cli-packmindgateway-method-implementation.md)

## Standard: CLI Command Structure

Enforce cmd-ts CLI command definitions (Command.ts) to contain only name/description/args and delegate to separate Handler.ts functions that validate inputs, run PackmindCliHexa with PackmindLogger, handle domain errors, and standardize output/exit codes via consoleLogger utilities to improve testability, maintainability, and consistent user feedback. :
* Call exit(1) after outputting error messages and exit(0) after success messages
* Create a separate handler file (ending in Handler.ts) that exports the handler function for each command
* Define command files (ending in Command.ts) using cmd-ts with only name, description, and args—do not implement handler logic inline
* Execute the use case through the hexa instance and capture the response
* Handle known domain errors explicitly with catch blocks checking error types (e.g., PackageNotFoundError, AccessDenied)
* Include helpful contextual messages with outputHelp() when domain errors occur (e.g., suggest relevant commands to run)
* Instantiate PackmindCliHexa with PackmindLogger within the handler after validation
* Organize commands in subdirectories under infra/commands/ grouped by their hexa or domain (e.g., infra/commands/auth/, infra/commands/standard/)
* Reference the corresponding handler function from the handler property of the command definition
* Use outputError() for error messages, outputSuccess() for success messages, and outputHelp() for guidance from consoleLogger utilities
* Validate and transform input arguments at the start of the handler before any business logic
* Write comprehensive tests for all handler functions covering validation, success paths, and all error scenarios

Full standard is available here for further request: [CLI Command Structure](.packmind/standards/cli-command-structure.md)

## Standard: CLI Use Case Structure

Enforce CLI use case separation by defining IPublicUseCase<Command, Response> interfaces with co-located Command/Response types in apps/cli/src/domain/useCases/ and implementing business-only logic in apps/cli/src/application/useCases/ using custom errors from apps/cli/src/domain/errors/ (no console or output handlers) to improve modularity, reuse, and predictable error handling. :
* Base all use case interfaces on IPublicUseCase<Command, Response> from @packmind/types
* Create new error classes for domain-specific failure scenarios when existing errors do not apply
* Define Command and Response types in the same file as the use case interface
* Define use case interfaces in src/domain/useCases/ directory
* Document the errors that a use case can throw so handlers know which error types to catch
* Export error classes from individual files in src/domain/errors/ for reusability across use cases
* Implement use cases in src/application/useCases/ directory
* Keep use cases focused on business logic without any user output (no console logging, no outputError/outputSuccess calls)
* Name error classes descriptively to indicate the specific failure condition (e.g., PackageNotFoundError, AccessDenied, InvalidStandardFormat)
* Throw custom domain errors defined in src/domain/errors/ instead of generic Error instances

Full standard is available here for further request: [CLI Use Case Structure](.packmind/standards/cli-use-case-structure.md)
<!-- end: Packmind standards -->