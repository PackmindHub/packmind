# CLI Application

Command-line interface for Packmind, built with cmd-ts and tree-sitter parsers.

## Architecture

- **CLI Framework**: cmd-ts for type-safe command definition and argument parsing
- **Code Analysis**: tree-sitter parsers for language-specific AST parsing
- **Output**: Platform-specific executable binaries (Linux, macOS, Windows)
- **Build Tool**: esbuild for fast bundling, Bun for executable creation
- **Parser Strategy**: WASM-embedded parsers for portability

### Command Structure

- Commands defined in `src/commands/` directory
- Each command exports a cmd-ts `command` object
- Root command aggregates subcommands with `subcommands()` helper

## Technologies

- **cmd-ts**: Type-safe CLI argument parsing and command routing
- **tree-sitter**: Language parsers for TypeScript, JavaScript, Python, etc.
- **esbuild**: Fast JavaScript/TypeScript bundler
- **Bun**: Runtime for building standalone executables
- **@packmind/linter-ast**: Shared AST analysis utilities
- **@packmind/logger**: Console logging with levels and formatting

## Main Commands

- Build: `nx build cli`
- Test: `nx test cli`
- Build executable (current platform): `nx build-executable cli`
- Build all platform executables: `nx build-executable-all cli`
- Lint: `nx lint cli`

## Key Patterns

### consoleLogger Utilities

- Use `consoleLogger` from `@packmind/logger` for consistent output
- Methods: `info()`, `warn()`, `error()`, `success()`, `debug()`
- Respects `--verbose` flag for debug output

### WASM-Embedded Parsers

- Tree-sitter parsers compiled to WASM for portability
- Embedded in binary for offline usage
- Located in `assets/` or bundled via esbuild

### Command Registration

- Commands use `command()` builder from cmd-ts
- Arguments and options defined with type inference
- Handler functions receive parsed, typed arguments

### Error Handling

- Throw errors with descriptive messages
- cmd-ts automatically formats and displays errors
- Use exit codes: 0 for success, non-zero for errors

## Configuration

- **Output Directory**: `dist/apps/cli/`
- **Executable Names**: `packmind-linux`, `packmind-macos`, `packmind-windows.exe`
- **Configuration File**: `.packmind/config.yml` in user's project
- **Environment Variables**: Optional for API endpoints or tokens

## Testing

- Unit tests: `*.spec.ts` files colocated with source
- Follow standards in `.claude/rules/packmind/standard-testing-good-practices.md`
- Test command logic separately from CLI framework
- Mock file system operations and tree-sitter parsing

## Usage Examples

```bash
# Analyze codebase
packmind analyze

# Create standard
packmind standard create

# Deploy standards
packmind deploy
```

## Related Documentation

- See `.claude/rules/packmind/` for coding standards
- See `packages/linter-ast/` for AST analysis utilities
- See root `CLAUDE.md` for monorepo-wide rules
