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

When you distribute standards or recipes, only the enabled agents will receive updates. The Packmind renderer is always active and creates files in the `.packmind/` directory that are used by other agents.

:::tip Need support for a new AI agent?
You can create an issue in our [repository](https://github.com/PackmindHub/packmind) to request support for additional AI coding assistants
:::

## How to Deploy

To distribute standards and recipes, you need to add them to a package.

A package is a curated collection of recipes and standards grouped together (e.g., "Frontend React Standards", "Backend API Guidelines"). When you distribute a package:

- All recipes and standards in the package are deployed together
- The latest version of each item is used
- A single commit contains all the package content
- You can distribute multiple packages at once to the same target

To distribute packages:

1. Navigate to the **Packages** section
2. Select the package(s) you want to distribute
3. Click **Distribute** and choose your target repositories
4. Confirm the Distribution

This approach is useful when you want to:

- Deploy related guidelines together
- Maintain consistent sets of standards across projects
- Organize guidelines by technology, team, or project structure

For more information on creating and managing packages, see [Packages Management](./packages-management.md).
