# WASM File Embedding in CLI Executables

## Problem

Previously, the CLI executables required WASM files to be distributed alongside them in a `tree-sitter/` directory. When users ran the executable from a different directory, it would fail with errors like:

```
Error: ENOENT: no such file or directory, open '/Users/username/Downloads/tree-sitter.wasm'
```

## Solution

The WASM files are now **embedded directly into the executable** as base64-encoded strings. At runtime, the CLI extracts these files to a temporary directory and uses them for parsing.

### How It Works

1. **Build Time** (`apps/cli/scripts/embed-wasm-files.ts`):
   - Reads all WASM files from `packages/linter-ast/res/`
   - Encodes them as base64 strings
   - Generates `apps/cli/src/embedded-wasm.ts` with the embedded data
   - **Only runs during executable builds**, not during npm package builds

2. **Runtime** (`apps/cli/src/wasm-runtime.ts`):
   - Checks if embedded WASM files exist via `hasEmbeddedWasmFiles()`
   - **If embedded files exist (executable mode)**:
     - Extracts WASM files to `/tmp/packmind-wasm-{pid}/`
     - Sets this as the WASM directory for parsers
     - Caches extracted files for faster subsequent runs
   - **If no embedded files (npm package mode)**:
     - Does nothing, parsers use default locations
     - WASM files are in `node_modules/@packmind/cli/*.wasm` (copied via assets)

3. **Parser Integration** (`packages/linter-ast/src/core/BaseParser.ts`):
   - Added `setWasmDirectory()` method to specify where WASM files are located
   - Prioritizes the external WASM directory when set
   - Falls back to default locations for npm package mode

### Build Process

The build process is now:

```bash
bun run apps/cli/bun-build.ts --target=all
```

This automatically:

1. Embeds WASM files
2. Bundles the CLI
3. Compiles to executables for all platforms

### File Sizes

The embedded WASM files add approximately **33 MB** to each executable:

- macOS ARM64: ~94 MB
- macOS x64: ~100 MB
- Linux ARM64: ~129 MB
- Linux x64: ~136 MB
- Windows x64: ~150 MB

### Distribution

**Standalone Executables:**

- Distributed as **single files** without any external dependencies
- WASM files embedded (~33 MB added to executable size)
- No need to distribute WASM files separately

**NPM Package:**

- Published to npm registry as `@packmind/cli`
- WASM files copied to package during build (via assets config)
- Located in `node_modules/@packmind/cli/*.wasm`
- Parsers automatically find them using default search paths
- No extraction needed, uses files directly from node_modules

### Development Notes

- The `apps/cli/src/embedded-wasm.ts` file is auto-generated
- **Committed as empty placeholder** for TypeScript compilation
- **Populated with WASM data** during executable builds (not committed)
- The embedding script runs automatically during executable build process
- For npm package builds, the placeholder remains empty and WASM files are copied via assets
- For development, WASM files are loaded from the source location in `packages/linter-ast/res/`
