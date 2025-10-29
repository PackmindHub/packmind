# Packmind CLI

A command-line interface for Packmind linting and code quality checks.

## Features

- **Lint code**: Analyze code files against Packmind standards
- **Multiple output formats**: Human-readable and IDE-friendly output
- **Draft mode**: Test detection programs before production use
- **Single Executable**: Distribute as standalone binaries (no Node.js required)

## Development

### Running from Source

```bash
# Install dependencies
npm install

# Run the CLI in development
nx run packmind-cli:run -- lint <path>

# Or use npm script
npm run packmind-cli:v3:lint
```

### Building

#### Standard Build (requires Node.js)

```bash
nx run packmind-cli:build
```

This creates a non-bundled version in `dist/apps/cli/`.

#### Bundled Build (single JS file, requires Node.js)

```bash
nx run packmind-cli:bundle
```

This creates a single bundled JavaScript file in `dist/apps/cli-bundle/main.js`.

## Standalone Executables

The CLI can be built as a standalone executable using Bun, which includes the Bun runtime and all dependencies. This allows distribution to systems without Node.js or Bun installed.

### Prerequisites

- **Bun** (for building) - Install from [bun.sh](https://bun.sh)

### Building Executables

#### Build for Current Platform

```bash
# Build for your current platform
nx run packmind-cli:build-executable
# or: bun run apps/cli/bun-build.ts
```

**Output**: `dist/apps/cli-executables/packmind-cli-<platform>-<arch>`

#### Build for Specific Platforms

```bash
# Build for Linux (x64 + ARM64)
nx build-executable-linux packmind-cli

# Build for macOS (x64 + ARM64)
nx build-executable-macos packmind-cli

# Build for Windows (x64)
nx build-executable-windows packmind-cli
```

#### Build for All Platforms

```bash
# Build for Linux (x64, ARM64), Windows (x64), and macOS (x64, ARM64)
nx run packmind-cli:build-executable-all
# or: bun run apps/cli/bun-build.ts --target=all
```

**Output**: Multiple executables in `dist/apps/cli-executables/`:

- `packmind-cli-linux-x64` / `packmind-cli-linux-x64-baseline`
- `packmind-cli-linux-arm64`
- `packmind-cli-windows-x64.exe` / `packmind-cli-windows-x64-baseline.exe`
- `packmind-cli-macos-x64`
- `packmind-cli-macos-arm64`

> **Note**: Baseline versions support older CPUs (pre-2013). Use these for maximum compatibility.

### Testing the Executable

```bash
# Test the executable
./dist/apps/cli-executables/packmind-cli-macos-arm64 lint --help

# Run a lint
./dist/apps/cli-executables/packmind-cli-macos-arm64 lint .
```

### Cross-Platform Building

Bun supports true cross-compilation - you can build for any platform from any platform:

```bash
# Build for Linux from macOS
bun build --compile --target=bun-linux-x64 apps/cli/src/main.ts --outfile dist/packmind-cli-linux

# Build for Windows from macOS
bun build --compile --target=bun-windows-x64 apps/cli/src/main.ts --outfile dist/packmind-cli-windows.exe
```

### How It Works

Bun's compilation process:

1. **Bundling**: All TypeScript code is compiled and bundled
2. **Asset Embedding**: All dependencies and WASM files are embedded
3. **Runtime Inclusion**: Bun runtime is included in the executable
4. **Bytecode**: Code is pre-compiled to bytecode for faster startup

### File Size

The resulting binary is approximately **60-80 MB** because it includes:

- Bun runtime (~40-50 MB)
- Bundled application code with dependencies (~10-20 MB)
- 18 tree-sitter WASM files (~10-15 MB, compressed)

### Platform Support

- ✅ **Linux x64** (glibc and musl)
- ✅ **Linux ARM64** (including Raspberry Pi, AWS Graviton)
- ✅ **Windows x64**
- ✅ **macOS x64** (Intel)
- ✅ **macOS ARM64** (Apple Silicon)

### Code Signing (macOS)

For macOS distribution, the binary must be signed to run without warnings. The CLI requires specific entitlements for proper operation.

#### Entitlements

The `entitlements.plist` file defines the minimal permissions needed for the CLI to function:

- **`com.apple.security.cs.allow-jit`**: Required for Bun's JavaScript JIT compilation (running detection programs)
- **`com.apple.security.cs.allow-unsigned-executable-memory`**: Required for Bun's dynamic code execution (WASM parsers)
- **`com.apple.security.cs.disable-executable-page-protection`**: Required for Bun's memory management

These permissions allow the CLI to:

- Execute JavaScript detection programs dynamically
- Load and run tree-sitter WASM parsers
- Read local files and make HTTP API calls to Packmind server

#### Local Signing

```bash
# Ad-hoc signing with entitlements (for local testing)
codesign --sign - --force --entitlements apps/cli/entitlements.plist \
  dist/apps/cli-executables/packmind-cli-macos-arm64

# Verify signature
codesign --verify --verbose dist/apps/cli-executables/packmind-cli-macos-arm64

# Check entitlements
codesign -d --entitlements - dist/apps/cli-executables/packmind-cli-macos-arm64
```

#### Production Signing (CI/CD)

For production distribution, the GitHub Actions workflow automatically signs macOS binaries with a Developer ID certificate. See `.github/workflows/sign-macos-cli.yml` and `MACOS_SIGNING_SETUP.md` for details.

## Usage

### Basic Commands

```bash
# Show help
packmind-cli --help

# Lint current directory
packmind-cli lint .

# Lint specific path
packmind-cli lint src/

# Show lint command help
packmind-cli lint --help
```

### Output Formats

```bash
# Human-readable output (default)
packmind-cli lint .

# IDE-friendly output
packmind-cli lint . --logger=ide
```

### Draft Mode

Test detection programs before they're in production:

```bash
# Run draft detection for a specific rule
packmind-cli lint . --draft --rule=@standard-slug/ruleId

# Specify language
packmind-cli lint . --draft --rule=@standard-slug/ruleId --language=typescript
```

## Architecture

The CLI follows hexagonal architecture:

```
apps/cli/
├── src/
│   ├── main.ts                 # Entry point, command handling
│   ├── PackmindCliHexa.ts      # Main hexagon facade
│   ├── PackmindCliHexaFactory.ts
│   ├── application/            # Use cases and services
│   ├── domain/                 # Business logic
│   └── infra/                  # Infrastructure (loggers, gateways)
├── scripts/
│   ├── build-bun.sh            # Bun executable build script (current platform)
│   └── build-bun-all.sh        # Bun executable build script (all platforms)
└── bunfig.toml                 # Bun configuration
```

## Troubleshooting

### "WASM file not found" Error

If running the bundled version, ensure WASM files are in the correct location. The standalone executable embeds WASM files, so this error should not occur.

### "Module not found" Error

The bundle excludes certain dependencies (OpenAI, Infisical, Redis, TypeORM, etc.) that aren't needed for CLI operation. This is intentional.

### Bun Not Found

Install Bun from [bun.sh](https://bun.sh):

```bash
curl -fsSL https://bun.sh/install | bash
```

### Build Fails with "Could not resolve"

Ensure all external packages are listed in the `--external` flags in the build script. These packages are intentionally excluded as they're not needed for the CLI.

## Contributing

When modifying the CLI:

1. Test with standard build: `nx run packmind-cli:build`
2. Test with bundle: `nx run packmind-cli:bundle`
3. Test with executable: `nx run packmind-cli:build-executable`
4. Verify all output formats work correctly
5. Run quality checks: `npm run quality-gate`

## References

- [Bun](https://bun.sh)
- [Bun Single Executable Applications](https://bun.sh/docs/bundler/executables)
- [Tree-sitter](https://tree-sitter.github.io/)
