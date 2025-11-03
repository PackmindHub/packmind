# CLI: Command-Line Interface

:::info Enterprise Feature
This functionality is only available in the **Enterprise** version of Packmind.
:::

## Overview

The Packmind CLI allows you to run detection programs against your codebase from the command line. This is useful for testing draft detection programs, verifying active programs, and integrating linting into your development workflow or CI/CD pipelines.

:::info Git Repository Required
The CLI must be run from within a Git repository. Packmind identifies your repository and applies detection programs from standards that have been deployed to it. See [Deployment](./deployment.md) to learn how to deploy standards to your repositories.
:::

## Get Started

### Installation Methods

#### Option 1: `npm` Package

**Global Installation**:

```bash
npm install -g @packmind/cli
```

After installation, the `packmind-cli` command will be available globally.

**Local Installation** (for project-specific version):

```bash
npm install --save-dev @packmind/cli
```

Then run via npm scripts in `package.json` or directly with npx:

```bash
npx packmind-cli lint .
```

**npx** (no installation required):

```bash
npx @packmind/cli lint .
```

This runs the CLI directly without installing it, always using the latest version.

#### Option 2: Standalone Executables

Download the appropriate pre-built executable for your platform from the [GitHub Releases page](https://github.com/PackmindHub/packmind-monorepo/releases?q=CLI&expanded=true).

**Available platforms:**

- **Linux x64**: `packmind-cli-linux-x64-{version}`
- **Linux arm64**: `packmind-cli-linux-arm64-{version}`
- **macOS arm64**: `packmind-cli-macos-arm64-{version}` (signed and notarized)
- **Windows x64**: `packmind-cli-windows-x64-{version}.exe`

**For Linux/macOS**, make the executable runnable:

```bash
chmod +x packmind-cli-*-{version}
```

**Optional**: Move to a directory in your PATH for easy access:

```bash
# Linux/macOS
sudo mv packmind-cli-*-{version} /usr/local/bin/packmind-cli

# Windows: Move to a directory in your PATH or run directly
```

:::tip Choosing an Installation Method

- Use **npm global** if you want `packmind-cli` always available system-wide
- Use **npm local** or **npx** for project-specific usage or testing
- Use **standalone executables** if you don't have Node.js installed or need a specific binary for your environment
  :::

## Authentication

The CLI requires an API key to authenticate with your Packmind instance.

### Getting Your API Key

1. Log in to your Packmind instance (Cloud or self-hosted)
2. Navigate to **Settings** (click your profile icon in the top right)
3. Scroll to the **API Key** section
4. Click **Generate New Key** to create an API key (valid for 90 days)
5. Copy the generated key

### Setting the API Key

Set the API key as an environment variable:

```bash
export PACKMIND_API_KEY_V3="your-api-key-here"
```

To make this permanent, add it to your shell configuration file (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
echo 'export PACKMIND_API_KEY_V3="your-api-key-here"' >> ~/.zshrc
source ~/.zshrc
```

:::tip Regenerating Your API Key
If you need to regenerate your API key (e.g., if it expires or is compromised), simply generate a new one from the Settings page. The old key will stop working immediately.
:::

## Using the Lint Command

### Basic Usage

Run the linter on your codebase:

```bash
packmind-cli lint .
```

This command:

- Identifies your Git repository
- Loads detection programs from standards deployed to your repository
- Scans all files in the current directory (excluding `node_modules`, `dist`, and other common build folders)
- Runs all active detection programs that apply to your repository
- Reports any violations found

### Specify a Path

Lint a specific directory or file:

```bash
# Lint a specific directory
packmind-cli lint src/

# Lint from a different location
packmind-cli lint /path/to/your/project
```

### Test a Specific Rule

Run detection for a single rule using the `--rule` option:

```bash
packmind-cli lint . --rule=@standard-slug/ruleId
```

The format is `@standard-slug/ruleId` where:

- `standard-slug` is your standard's identifier
- `ruleId` is the specific rule identifier

**Example:**

```bash
packmind-cli lint . --rule=@backend-typescript/use-logger-info
```

### Test Draft Programs

To test a draft detection program before activating it, use the `--draft` flag with the `--rule` option:

```bash
packmind-cli lint . --draft --rule=@standard-slug/ruleId
```

**Important**: The `--draft` flag requires the `--rule` option. You must specify which rule's draft program you want to test.

For more information about testing draft programs, see [Testing Draft Programs](./linter.md#testing-draft-programs) in the Linter documentation.

### Output Formats

Choose between human-readable and IDE-friendly output:

```bash
# Human-readable output (default)
packmind-cli lint .

# IDE-friendly output (for integration with editors)
packmind-cli lint . --logger=ide
```

**Human-readable format** shows:

- File paths with violations
- Line and character positions
- Rule identifiers
- Summary of total violations found

**IDE format** provides structured output that can be parsed by editors and CI/CD tools.

### Debug Mode

Enable detailed logging to troubleshoot issues:

```bash
packmind-cli lint . --debug
```

Debug mode shows:

- Which detection programs are being loaded
- Files being analyzed
- Internal processing steps

### Exit Codes

The CLI uses standard exit codes:

- **Exit 0**: No violations found (success)
- **Exit 1**: Violations found or an error occurred

This makes it easy to integrate with CI/CD pipelines:

```bash
# CI/CD script example
packmind-cli lint .
if [ $? -eq 0 ]; then
  echo "Code quality check passed"
else
  echo "Code quality check failed"
  exit 1
fi
```

## Related Documentation

- [Linter: Automated Detection](./linter.md): Learn about how detection programs work
- [Standards Management](./standards-management.md): Create rules and add code examples
