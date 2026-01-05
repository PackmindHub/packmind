# Commands: automate repetitive tasks

## What are Commands?

In teams using AI coding assistants, sharing and reusing prompts that work is often tedious. A Packmind **Command** is an executable, step-by-step guide that tells the AI assistant exactly how to perform a development task so your team's practices are applied consistently and reproducibly.

Commands are repeatable and predictable instruction patterns that can be applied to achieve a specific outcome.

Examples of commands can be:

- Create or update domain model and the SQL schema, including database migrations
- Add a new use case in a business domain

## Creating Commands

Commands are created through the **MCP server** using a guided workflow that ensures they are well-structured and reusable.

The AI agent will automatically follow the **command creation workflow** which:

1. Identifies the development process you want to capture
2. Structures it into clear, actionable steps with context validation checkpoints
3. Defines specific "when to use" scenarios
4. Adds optional code examples to demonstrate each step

### Best Practices for Command Creation

To get the best results, provide rich context to your AI agent:

- **After completing a task**: When you've accomplished a series of tasks in a session with your AI Agent, ask it to create a command based on what you've done

  _"Synthesize the steps we followed to create a new use case and create a Packmind command based on this"_

- **From Git history**: A commit or pull request can reflect a command. Ask your agent to analyze commits or a Pull Request URL

  _"Create a command by analyzing the changes in pull request #123"_

- **From existing code**: Provide files as context to extract patterns

  _"Create a command for adding a new API endpoint based on @routes/users.ts and @controllers/UserController.ts"_

The workflow ensures your command includes:

- Clear step-by-step instructions
- Context validation checkpoints (questions to ask before starting)
- Usage scenarios (when this command applies)
- Optional code snippets for each step

:::tip
For detailed information about the command creation workflow and available MCP tools, see the [MCP Server reference](./mcp-server.md).
:::

## Updating Commands

**Updating commands** is possible from the web app, on the dedicated section of the commands.

## Commands Versions

Every time you update a command, this creates a new version.
This keeps track of the history of your changes, and it's useful to keep track of which versions are currently distributed to Git repositories.
