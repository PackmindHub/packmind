# Distribute artifacts

Now that Packmind contains coding standards and recipes, let's distribute them to your Git Repositories.

The distribution will commit instructions files that will be used by AI Agents (Claude Code, Cursor, etc.).

## Supported AI Agents

Here is an overview of the supported agents:

| AI Agent           | What It Does                 | File Location                     |
| ------------------ | ---------------------------- | --------------------------------- |
| **Cursor**         | Creates rules in YAML format | `.cursor/rules/`                  |
| **GitHub Copilot** | Updates instructions file    | `.github/copilot-instructions.md` |
| **Claude Code**    | Updates instructions file    | `CLAUDE.md`                       |
| **AGENTS.md**      | Updates instructions file    | `AGENTS.md`                       |
| **Junie**          | Updates guidelines file      | `.junie/guidelines.md`            |

Files are also written in the `.packmind` folder to be reused by these agents.

:::tip Need support for a new AI agent?
You can create an issue in our [repository](https://github.com/PackmindHub/packmind) to request support for additional AI coding assistants
:::

## How to Deploy

Go on the respective **Recipes** and **Standards** menu to deploy them on Git repositories.

You can either deploy a single or multiple standards/recipes at the same time.
This can be achieved on the page that lists standards and recipes, or in the dedicated page for each standard and recipes.

When deploying, you must choose one or several targets where your standards and recipes will be applied. This allows you to customize which parts of your repositories receive specific guidelines.

This distribution creates a single commit for each target repository.
