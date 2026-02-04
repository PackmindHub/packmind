---
name: packmind-create-package
description: 'Guide for creating Packmind packages via the CLI. This skill should be used when users want to create a new package to organize standards, commands, and skills for distribution.'
license: 'Complete terms in LICENSE.txt'
---

# Package Creator

Create Packmind packages—logical collections of standards, commands, and skills that can be distributed together.

## About Packages

A **Package** groups related artifacts by technology, domain, team, or architectural layer. Instead of managing individual items, packages let you distribute related content as a single unit.

Examples: `frontend`, `backend-api`, `nestjs`, `e2e`

## Prerequisites

Verify packmind-cli is available:

```bash
packmind-cli --version
```

If not installed:

```bash
npm install -g @packmind/cli
packmind-cli login
```

## Workflow

### Step 1: Check Existing Packages

List existing packages to identify naming conventions:

```bash
packmind-cli install --list
```

Review the output to:
- Avoid duplicate or conflicting names
- Follow existing naming conventions (lowercase, kebab-case slugs)
- Understand how packages are organized in this workspace

### Step 2: Confirm with User

Before creating, confirm the package details:

```
Package name: <name>
Description: <description or "none">

Proceed?
```

Wait for explicit user approval.

### Step 3: Create the Package

Run the CLI command:

```bash
packmind-cli packages create "<name>" --description="<description>"
```

Or without description:

```bash
packmind-cli packages create "<name>"
```

### Expected Output

On success:

```
Created: <slug>
You can see it at: https://app.packmind.com/packages/<slug>
You can install it with: packmind-cli packages install <slug>
```

## Naming Guidelines

- **Name**: Human-readable, can include spaces (e.g., "Backend API")
- **Slug**: Auto-generated from name, lowercase with hyphens (e.g., "backend-api")
- **Collision handling**: If slug exists, server auto-increments (e.g., "frontend-2")

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Not authenticated" | Run `packmind-cli login` |
| "Network error" | Check connection, retry |
| "Name must be at least 3 characters" | Use a longer name |

## Next Steps

After creating a package, content can be added via:

1. **MCP tools**: Use `packageSlugs` parameter when creating standards/commands
2. **Web interface**: Navigate to the package URL and add items manually
3. **CLI command**: Use `packmind packages add` to add items

## Adding Content to Packages

After creating a package, use the `packages add` command:

```bash
# Add standards
packmind-cli packages add --to <package-slug> --standard <standard-slug>

# Add multiple standards
packmind-cli packages add --to <package-slug> --standard std-1 --standard std-2

# Add commands
packmind-cli packages add --to <package-slug> --command <command-slug>

# Add skills
packmind-cli packages add --to <package-slug> --skill <skill-slug>
```

**Note:** Only one item type per command. Run separate commands for different types.

### Post-Add Workflow

After successfully adding items to a package:

1. Report the output to the user
2. Use AskUserQuestion to ask: "Would you like me to run `packmind install` to sync the changes?"
3. If yes, run `packmind-cli install`
