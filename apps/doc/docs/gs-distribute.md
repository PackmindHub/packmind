# Distribute standards and recipes

This guide shows you how to pull your **Standards** and **Recipes** locally using the Packmind CLI, making them available to your AI coding assistant.

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

## Pull artifacts locally with CLI

:::warning API Key Required
The pull command requires a valid API key to authenticate with Packmind.

See the [CLI documentation](./cli.md#authentication) for setup instructions.
:::

Use the Packmind CLI to pull packages locally:

**List available packages:**

```bash
packmind-cli pull --list
```

**View package details:**

```bash
packmind-cli pull --show <package-slug>
```

**Pull one or more packages:**

```bash
packmind-cli pull <package-slug> [additional-package-slugs...]
```

This downloads all recipes and standards from the specified packages and creates the appropriate files for your AI coding assistant.

For detailed CLI usage, see the [CLI documentation](./cli.md#using-the-pull-command).

## Alternative: Deploy to Git repositories

Instead of pulling locally, you can deploy packages directly to your Git repositories. This pushes standards and recipes as files that are committed to your codebase.

To learn about deploying to Git repositories, see the [Deployment documentation](./deployment.md).

## Use your artifacts

When you prompt your coding assistant, **Standards** and **Recipes** are automatically included in its context.
For complex tasks, the context can grow large, and the generated code may stop following your standards and recipes.

If this happens, re-add the `.packmind` directory to the agent's context and try again.
