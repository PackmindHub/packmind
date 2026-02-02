# Command Creator

A skill that guides AI coding agents through the process of creating reusable commands via the Packmind CLI.

## What is a Command?

Commands are structured, multi-step workflows that capture repeatable tasks, recipes, and automation patterns. They enable AI coding agents to execute complex tasks consistently following your team's established workflows.

## How to Use

Ask the AI agent to create a command. The agent will automatically use this skill to guide the process.

### Example Prompts

- "Create a command for setting up a new API endpoint"
- "Help me build a command that guides creating React components"
- "I want to create a command for our deployment workflow"
- "Create a new command for database migration setup"

The AI agent will:

1. Ask clarifying questions to understand the command's purpose
2. Help you define steps with proper formatting
3. Create a playbook JSON file
4. Get your approval before submission
5. Run the CLI command to create the command

## Prerequisites

Before using this skill, ensure you have:

- **packmind-cli**: Required for command creation
- **Packmind account**: Login via `packmind-cli login`

## License

Apache 2.0 - See LICENSE.txt for details.
