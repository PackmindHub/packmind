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

Standardize PackmindGateway methods in apps/cli/src/infra/repositories/*Gateway.ts to use PackmindHttpClient (getAuthContext for organizationId and request<ResponseType>() with Promise<ResponseType> return types and options-based non-GET bodies) to eliminate duplicated API key/JWT parsing and error-handling boilerplate and keep gateway logic consistent and concise. :
* Define the method return type using `Promise<ResponseType>` for type safety
* Keep gateway methods concise by delegating authentication and error handling to `PackmindHttpClient`
* PackmindGateway must delegate to sub-gateways for each hexa
* Pass HTTP method and body via options object to `httpClient.request()` for non-GET requests (e.g., `{ method: 'POST', body: data }`)
* Use `this.httpClient.getAuthContext()` to retrieve `organizationId` instead of manually decoding the API key and JWT
* Use `this.httpClient.request<ResponseType>()` for all HTTP calls instead of manual fetch with duplicated error handling

Full standard is available here for further request: [CLI Gateway Implementation](.packmind/standards/cli-packmindgateway-method-implementation.md)
<!-- end: Packmind standards -->