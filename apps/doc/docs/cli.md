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

**npx** (no installation required):

```bash
npx @packmind/cli lint .
```

This runs the CLI directly without installing it, always using the latest version.

#### Option 2: Standalone Executables

Download the appropriate pre-built executable for your platform from the [GitHub Releases page](https://github.com/PackmindHub/packmind/releases?q=CLI&expanded=true).

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
- Use **npx** for project-specific usage or testing without installation
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

## Related Documentation

- [Linter: Automated Detection](./linter.md): Learn about how detection programs work
- [Standards Management](./standards-management.md): Create rules and add code examples
