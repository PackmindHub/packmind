# Distribute artifacts

Now that Packmind contains coding standards and recipes, let's distribute them to your Git Repositories.

The distribution will commit instructions files that will be used by AI Agents (Claude Code, Cursor, etc.).

## Supported AI Agents

Packmind supports multiple AI coding assistants. Organization administrators can choose which agents to enable in **Settings** → **Distribution** → **Rendering**. See [Manage AI Agent Rendering](./manage-ai-agents.md) for details.

Here is an overview of the supported agents:

| AI Agent           | What It Does                 | File Location                     |
| ------------------ | ---------------------------- | --------------------------------- |
| **Packmind**       | Internal renderer (required) | `.packmind/`                      |
| **AGENTS.md**      | Updates instructions file    | `AGENTS.md`                       |
| **GitHub Copilot** | Updates instructions file    | `.github/copilot-instructions.md` |
| **Cursor**         | Creates rules in YAML format | `.cursor/rules/`                  |
| **Claude Code**    | Updates instructions file    | `CLAUDE.md`                       |
| **Junie**          | Updates guidelines file      | `.junie/guidelines.md`            |
| **Gitlab Duo**     | Updates chat rules file      | `.gitlab/duo/chat-rules.md`       |

When you distribute standards or recipes, only the enabled agents will receive updates. The Packmind renderer is always active and creates files in the `.packmind/` directory that are used by other agents.

:::tip Need support for a new AI agent?
You can create an issue in our [repository](https://github.com/PackmindHub/packmind) to request support for additional AI coding assistants
:::

## How to Distribute

There are two ways to distribute packages to your repositories:

1. **Using the Packmind app** - Distribute packages through the web interface with full control over targets and repositories
2. **Using packmind-cli** - Install packages directly from your terminal, useful for CI/CD pipelines and local development

### Distribution Methods Overview

| Method  | Best For                                    | Git Provider Management                  |
| ------- | ------------------------------------------- | ---------------------------------------- |
| **App** | Centralized distribution, team coordination | Full control via connected Git providers |
| **CLI** | CI/CD pipelines, local development          | Creates read-only provider entries       |

## Distribute via the App

To distribute standards and recipes, you need to add them to a package.

A package is a curated collection of recipes and standards grouped together (e.g., "Frontend React Standards", "Backend API Guidelines"). When you distribute a package:

- All recipes and standards in the package are distributed together
- The latest version of each item is used
- A single commit contains all the package content
- You can distribute multiple packages at once to the same target

To distribute packages:

1. Navigate to the **Packages** section
2. Select the package(s) you want to distribute
3. Click **Distribute** and choose your target repositories
4. Confirm the Distribution

This approach is useful when you want to:

- Distribute related guidelines together
- Maintain consistent sets of standards across projects
- Organize guidelines by technology, team, or project structure

For more information on creating and managing packages, see [Packages Management](./packages-management.md).

## Distribute via packmind-cli

You can also distribute packages directly from your terminal using the `packmind-cli` command:

```bash
packmind-cli install <package-slug>
```

For example:

```bash
packmind-cli install backend-standards frontend-react
```

This will:

1. Fetch the specified packages from Packmind
2. Generate the instruction files for all enabled AI agents
3. Write the files to your local repository
4. Notify Packmind that a distribution occurred

### CLI Distribution Considerations

When you distribute packages using the CLI, Packmind automatically creates a Git provider entry to track the distribution. However, these CLI-created providers have some limitations:

:::warning Limited Provider Management
Git providers created through CLI distributions do not have an associated token. This means:

- **You cannot trigger new distributions** from the app for these repositories
- **You cannot add new targets** to these providers from the app
- The provider appears in your organization's Git settings but with limited functionality

To enable full management from the app, connect a Git provider with a valid token in **Settings** → **Git Providers**.
:::

### When to Use CLI Distribution

The CLI approach is ideal for:

- **CI/CD pipelines** - Automate distribution as part of your deployment process
- **Local development** - Quickly install packages without leaving your terminal
- **Monorepos** - Use `packmind-cli install --recursive` to install packages for all `packmind.json` files in the repository
- **Self-hosted Git instances** - Distribute to repositories that aren't connected to the app
