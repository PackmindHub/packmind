# Distribute standards and recipes

This guide shows you how to install your **Standards** and **Recipes** locally using the Packmind CLI, making them available to your AI coding assistant.

This approach downloads content directly to your local machine without requiring Git configuration.

## Create your first package

Before distributing your standards and recipes, organize them into **Packages**. A package is a curated collection of recipes and standards grouped together—for example, "Frontend Guidelines" or "Backend API Standards".

Packages make it easy to distribute related guidelines as a single unit.

**To create a package:**

1. Navigate to **Packages** in the Packmind UI
2. Click **Create Package**
3. Provide a name and description
4. Select recipes and standards to include
5. Save the package

You can organize packages by technology, domain, team, or architectural layer—whatever matches how your team works.

For more details on managing packages, see the [Packages Management](./packages-management.md) documentation.

## Install packages with CLI

:::warning API Key Required
The install command requires a valid API key to authenticate with Packmind.

See the [CLI documentation](./cli.md#authentication) for setup instructions.
:::

Use the Packmind CLI to install packages locally:

**List available packages:**

```bash
packmind-cli install --list
```

**View package details:**

```bash
packmind-cli install --show <package-slug>
```

**Install one or more packages:**

```bash
packmind-cli install <package-slug> [additional-package-slugs...]
```

This downloads all recipes and standards from the specified packages and creates the appropriate files for your AI coding assistant.

**Example - First installation:**

```bash
packmind-cli install backend frontend
```

When you run `install` for the first time, it creates a `packmind.json` file in the current directory that tracks which packages are installed. Subsequent runs of `packmind-cli install` (without arguments) will automatically install all packages listed in this file.

**Example - Update from packmind.json:**

```bash
packmind-cli install
```

This installs all packages defined in your `packmind.json` file.

For detailed CLI usage, see the [CLI documentation](./cli.md).

## Understanding packmind.json

The `packmind.json` file is automatically created in your directory when you first run `packmind-cli install` with package names. This file tracks which packages are installed locally, making it easy to keep your standards and recipes up to date.

### File Structure

The file has a simple JSON structure:

```json
{
  "packages": {
    "backend": "*",
    "frontend": "*",
    "security": "*"
  }
}
```

Each package slug maps to a version number. Currently, all packages use `"*"` which means "latest version".

### How It Works

**First Installation:**

When you run `packmind-cli install <package-slug>` for the first time, the CLI:

1. Downloads the specified packages
2. Creates a `packmind.json` file in the current directory
3. Adds the installed packages to the file

**Subsequent Installations:**

When you run `packmind-cli install` (without package names), the CLI:

1. Reads the `packmind.json` file
2. Installs all packages listed in the file
3. Updates your local standards and recipes to the latest versions

**Adding More Packages:**

You can add more packages to an existing installation:

```bash
packmind-cli install additional-package
```

This merges the new package with your existing `packmind.json` configuration.

### Managing packmind.json Manually

You can edit the `packmind.json` file directly to add or remove packages.

**To add a package manually:**

1. Open `packmind.json`
2. Add the package slug to the `packages` object:

```json
{
  "packages": {
    "backend": "*",
    "frontend": "*",
    "new-package": "*"
  }
}
```

3. Run `packmind-cli install` to download the new package

**To remove a package manually:**

1. Open `packmind.json`
2. Remove the package slug from the `packages` object
3. Run `packmind-cli install` to update your local files

:::warning Removal Limitations
Currently, when you remove a package from `packmind.json` and run `install`, only the `CLAUDE.md` and `AGENTS.md` files are updated to remove references. Files specific to GitHub Copilot (`.github/copilot-instructions.md`) and Cursor (`.cursor/rules/`) are not yet automatically removed. This functionality will be added in a future update.

You may need to manually delete these files if you remove packages.
:::

### Using Multiple packmind.json Files

You can run `packmind-cli install` in different directories within your project, and each directory will have its own `packmind.json` file with its own set of packages.

This is useful for:

- **Monorepos**: Different packages or applications can have different standards
- **Layered architectures**: Frontend and backend directories can have separate guidelines
- **Team boundaries**: Different teams working in different directories can maintain their own standards

**Example directory structure:**

```
my-project/
├── packmind.json          # Root-level packages (e.g., general coding standards)
├── frontend/
│   └── packmind.json      # Frontend-specific packages
└── backend/
    └── packmind.json      # Backend-specific packages
```

Each `packmind.json` file operates independently. When you run `packmind-cli install` in a directory, it only affects that directory's configuration.

## Alternative: Deploy to Git repositories

Instead of pulling locally, you can deploy packages directly to your Git repositories. This pushes standards and recipes as files that are committed to your codebase.

To learn about deploying to Git repositories, see the [Deployment documentation](./deployment.md).

## Use your artifacts

When you prompt your coding assistant, **Standards** and **Recipes** are automatically included in its context.
For complex tasks, the context can grow large, and the generated code may stop following your standards and recipes.

If this happens, re-add the `.packmind` directory to the agent's context and try again.
