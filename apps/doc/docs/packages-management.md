# Packages: organize your coding guidelines

## What are Packages?

A **Package** is a curated collection of recipes and standards grouped together. Packages organize your coding guidelines in a way that matches how your team actually works—whether by technology, domain, team, or architectural layer.

Instead of managing and deploying dozens of individual items, packages let you group related guidelines and distribute them as a single unit.

## Creating Packages

Create packages through the web interface:

1. Navigate to **Packages** in the Packmind UI
2. Click **Create Package**
3. Provide a name and description
4. Select recipes and standards to include
5. Save the package

You can also add items to packages automatically when creating recipes or standards via the MCP server by including the `packageSlugs` parameter.

## Using Packages

### Pull Locally

Download package content directly to your machine:

```bash
packmind-cli pull --list
```

```bash
packmind-cli pull backend-api frontend-web
```

See the [CLI documentation](./cli.md#using-the-pull-command) for details.

### Deploy to Repositories

Push packages to your Git repositories through the web interface:

1. Navigate to **Packages**
2. Select packages to deploy
3. Choose target paths
4. Click **Deploy**

All recipes and standards in the package are deployed together. Learn more in the [distribution guide](./gs-distribute.md).

### Via MCP Server

AI agents can work with packages using these tools:

- `packmind_list_packages` - View available packages
- `packmind_get_package_details` - Inspect package contents
- `packmind_add_recipe_to_packages` - Add recipes to packages
- `packmind_add_standard_to_packages` - Add standards to packages

When creating recipes or standards via MCP, use the `packageSlugs` parameter to add them to packages automatically.

See the [MCP Server reference](./mcp-server.md#packages-tools) for details.

## Best Practices

- Keep packages focused with a clear, specific purpose
- Use descriptive names that convey what the package contains
- Design packages that mirror your code structure
- Start with 2-3 core packages, add more as needed

## Package Versions

Packages are dynamic collections without their own versions. When you deploy a package, it always includes the latest version of each recipe and standard it contains.

To see which repositories have outdated versions, check the [deployment overview](./deployment.md).
