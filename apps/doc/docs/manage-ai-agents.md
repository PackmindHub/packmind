# Manage AI Agent Rendering

## Overview

Organization administrators can control which AI coding assistants receive your standards and recipes when you distribute them to Git repositories. This allows you to distribute only the formats your team actually uses.

:::info
Only users with **Admin** privileges can configure AI agent rendering. If you need to change this configuration, contact your organization administrator.
:::

## Configuring AI Agents

To configure which agents are enabled:

1. Go to **Settings** → **Distribution** → **Rendering**
2. Toggle on the agents you want to use
3. Click **Save Changes**

When you distribute standards or recipes, only the enabled agents will have their instruction files updated in your Git repositories.

## Available AI Agents

| AI Agent           | File Location                     | Can be Disabled? |
| ------------------ | --------------------------------- | ---------------- |
| **Packmind**       | `.packmind/`                      | No (Required)    |
| **AGENTS.md**      | `AGENTS.md`                       | Yes              |
| **GitHub Copilot** | `.github/copilot-instructions.md` | Yes              |
| **Cursor**         | `.cursor/rules/`                  | Yes              |
| **Claude Code**    | `CLAUDE.md`                       | Yes              |
| **Junie**          | `.junie/guidelines.md`            | Yes              |

:::info
The **Packmind** renderer cannot be disabled. It creates internal files in the `.packmind/` directory that are used by Packmind and other agents to function properly.
:::

## What Happens When You Change Configuration

- Changes apply immediately to all future distributions
- Existing deployed files in your repositories are not affected
- Only the selected agents will receive updates when you distribute standards or recipes
- The Packmind renderer always creates files regardless of your selection
