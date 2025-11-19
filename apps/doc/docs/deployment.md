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

Go on the respective **Recipes** and **Standards** menu to deploy them on Git repositories.

You can either deploy a single or multiple standards/recipes at the same time.
This can be achieved on the page that lists standards and recipes, or in the dedicated page for each standard and recipes.

When deploying, you must choose one or several targets where your standards and recipes will be applied. This allows you to customize which parts of your repositories receive specific guidelines.

This distribution creates a single commit for each target repository.

## Deploying Packages

Instead of deploying individual recipes and standards, you can organize them into **Packages** and deploy them as a single unit.

A package is a curated collection of recipes and standards grouped together (e.g., "Frontend React Standards", "Backend API Guidelines"). When you deploy a package:

- All recipes and standards in the package are deployed together
- The latest version of each item is used
- A single commit contains all the package content
- You can deploy multiple packages at once to the same target

To deploy packages:

1. Navigate to the **Packages** section
2. Select the package(s) you want to deploy
3. Click **Deploy** and choose your target repositories
4. Confirm the deployment

This approach is useful when you want to:

- Deploy related guidelines together
- Maintain consistent sets of standards across projects
- Organize guidelines by technology, team, or project structure

For more information on creating and managing packages, see [Packages Management](./packages-management.md).
