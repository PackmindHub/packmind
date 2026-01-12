# Understanding Where Your Artifacts Appear

After distributing your standards and commands through Packmind, they appear in specific locations in your Git repositories. Each AI coding assistant reads from its own designated folder or file, allowing it to apply your team's guidelines automatically.

## Overview

When you distribute a package containing standards and commands:

1. **Standards** are automatically loaded by your AI assistant when you're coding. They guide the AI to follow your team's conventions without any action on your part.

2. **Commands** are instructions you can run on-demand when you need to perform a specific task. You invoke them manually when needed.

Your organization administrator controls which AI assistants receive updates in **Settings** → **Distribution** → **Rendering**. See [Manage AI Agent Rendering](./manage-ai-agents.md) for details.

## Where Standards Appear

Standards are placed in specific folders that your AI assistant monitors. Once distributed, they're automatically applied when the AI generates or reviews code.

| AI Assistant   | Where Standards Appear                |
| -------------- | ------------------------------------- |
| Claude Code    | `.claude/rules/packmind/` folder      |
| Cursor         | `.cursor/rules/packmind/` folder      |
| GitHub Copilot | `.github/instructions/` folder        |
| Continue       | `.continue/rules/packmind/` folder    |
| GitLab Duo     | `.gitlab/duo/chat-rules.md` file      |
| Junie          | `.junie/guidelines.md` file           |
| AGENTS.md      | `AGENTS.md` file (in repository root) |

:::tip
Standards work automatically—you don't need to do anything special to activate them. Your AI assistant reads them and applies the guidelines when generating code.
:::

### Standard Scopes and File Patterns

When you define a standard, you can specify a **scope** using glob patterns (like `**/*.spec.ts` for test files or `src/components/**/*.tsx` for React components).

For AI assistants that support native integration (**Claude Code**, **Cursor**, **GitHub Copilot**, and **Continue**), these glob patterns are included in the rendered files. The AI assistant will automatically apply the standard only to files matching the specified patterns.

For other AI assistants (GitLab Duo, Junie, AGENTS.md), standards are included in a single file without scope filtering—the AI applies them based on context.

## Where Commands Appear and How to Use Them

Commands are placed in specific locations, but unlike standards, you need to invoke them manually when you want to use them.

| AI Assistant   | Where Commands Are Rendered         | How to Use                                  |
| -------------- | ----------------------------------- | ------------------------------------------- |
| Claude Code    | `.claude/commands/packmind/` folder | Type `/command-name` in chat                |
| Cursor         | `.cursor/commands/packmind/` folder | Type `/command-name` in chat                |
| GitHub Copilot | `.github/prompts/`                  | Type `/command-name` in chat                |
| Continue       | `.continue/prompts/`                | Type `/command-name` in chat                |
| GitLab Duo     | Not rendered (use source)           | Execute @.packmind/commands/command-name.md |
| Junie          | Not rendered (use source)           | Execute @.packmind/commands/command-name.md |
| AGENTS.md      | Not rendered (use source)           | Execute @.packmind/commands/command-name.md |

### Using Slash Commands (Claude Code, Cursor, GitHub Copilot)

For AI assistants with native slash command support (**Continue**, **Claude Code**, **Cursor**, and **GitHub Copilot**), commands are rendered in dedicated folders and can be invoked using slash commands:

```
/create-new-use-case
```

The AI assistant will recognize the command and execute the instructions defined in it.

### Direct Source File Invocation (Continue, GitLab Duo, Junie, AGENTS.md)

For AI assistants without native command rendering (**GitLab Duo**, **Junie**, and **AGENTS.md**), commands are not rendered in agent-specific files. Instead, you must reference the source command file directly from the `.packmind/commands/` folder:

```
Execute @.packmind/commands/create-new-use-case.md
```

The AI assistant will read the command file from the `.packmind/commands/` folder and follow its instructions.

:::info
All commands are **user-invoked**—they only run when you explicitly call them. This is different from standards, which are applied automatically by the AI.
:::

## Where Skills Appear

Skills are folders of instructions, scripts, and resources that AI agents can discover and use to perform tasks more accurately. Unlike commands which require explicit invocation, skills are **agent-discovered**—the AI automatically loads relevant skills based on the task at hand.

| AI Assistant   | Where Skills Appear                    |
| -------------- | -------------------------------------- |
| GitHub Copilot | `.github/skills/{skill-slug}/SKILL.md` |
| Claude Code    | `.claude/skills/{skill-slug}/SKILL.md` |
| Cursor         | Uses Claude Code skills                |

Skills contain YAML frontmatter with metadata (name, description, license, compatibility, allowed-tools) followed by the skill instructions.

:::note
Skills are currently only available for GitHub Copilot and Claude Code. Cursor uses the Claude Code skills. Other AI assistants do not support skill rendering.
:::

## The Source Files

Regardless of which AI assistant you use, Packmind always creates source files in the `.packmind/` folder:

- **Standards**: `.packmind/standards/` folder
- **Commands**: `.packmind/commands/` folder
- **Skills**: `.packmind/skills/` folder

These source files are the single source of truth. The files in AI assistant-specific folders (like `.claude/` or `.cursor/`) are generated from these sources during distribution.

## Troubleshooting

### I don't see my commands available with slash commands

**Solution**: Slash commands (`/command-name`) are only supported by Claude Code, Cursor, and GitHub Copilot. For other AI assistants, reference the command file directly using "Execute @.packmind/commands/command-name.md".

### My standards aren't being applied

**Solution**:

1. Verify your organization has enabled the AI assistant in **Settings** → **Distribution** → **Rendering**
2. Make sure you've distributed the package containing the standards
3. Check that the standard files exist in the appropriate folder for your AI assistant

### I can't find the command files

**Solution**:

1. Ensure you've distributed the package containing the commands
2. Check the `.packmind/commands/` folder for the source files
3. For Claude Code, Cursor, or GitHub Copilot: Verify the AI assistant-specific folder exists (e.g., `.cursor/commands/packmind/`)
4. For Continue, GitLab Duo, Junie, or AGENTS.md: Commands are not rendered separately—use the files directly from `.packmind/commands/`

### The AI assistant isn't following my standards

**Solution**:

1. Check that the standard scope (file patterns) matches the files you're working with
2. Verify the standard was distributed to the correct AI assistant
3. Try referencing the standard explicitly in your prompt if needed

### I can't find my skills

**Solution**:

1. Skills are only rendered for GitHub Copilot and Claude Code (Cursor uses Claude Code skills)
2. Check the `.packmind/skills/` folder for the source files
3. For GitHub Copilot: Check `.github/skills/{skill-slug}/SKILL.md`
4. For Claude Code/Cursor: Check `.claude/skills/{skill-slug}/SKILL.md`

## Related Documentation

- [Manage AI Agent Rendering](./manage-ai-agents.md) - Configure which AI assistants receive your artifacts
- [Distribute Artifacts](./distribution.md) - Learn how to distribute packages to repositories
- [Standards Management](./standards-management.md) - Create and manage coding standards
- [Commands Management](./commands-management.md) - Create and manage reusable commands
