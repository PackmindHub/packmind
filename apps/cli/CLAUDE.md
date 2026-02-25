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

- Build: `nx build packmind-cli`
- Test: `nx test packmind-cli`
- Build npm executable (current platform): `npm run packmind-cli:build`
- Build portable bun executables: `bun run apps/cli/bun-build.ts --target=all`
- Lint: `nx lint packmind-cli`
