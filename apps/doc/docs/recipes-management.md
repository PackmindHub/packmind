# Recipes: automate repetitive tasks

## What are Recipes?

In teams using AI coding assistants, sharing and reusing prompts that work is often tedious. A Packmind **Recipe** is an executable, step-by-step guide that tells the AI assistant exactly how to perform a development task so your team's practices are applied consistently and reproducibly.

Recipes are repeatable and predictable instruction patterns that can be applied to achieve a specific outcome.

Examples of recipes can be:

- Create or update domain model and the SQL schema, including database migrations
- Add a new use case in a business domain

## Creating Recipes

Recipes are created through the **MCP server** using a guided workflow that ensures they are well-structured and reusable.

The AI agent will automatically follow the **recipe creation workflow** which:

1. Identifies the development process you want to capture
2. Structures it into clear, actionable steps with context validation checkpoints
3. Defines specific "when to use" scenarios
4. Adds optional code examples to demonstrate each step

### Best Practices for Recipe Creation

To get the best results, provide rich context to your AI agent:

- **After completing a task**: When you've accomplished a series of tasks in a session with your AI Agent, ask it to create a recipe based on what you've done

  _"Synthesize the steps we followed to create a new use case and create a Packmind recipe based on this"_

- **From Git history**: A commit or pull request can reflect a recipe. Ask your agent to analyze commits or a Pull Request URL

  _"Create a recipe by analyzing the changes in pull request #123"_

- **From existing code**: Provide files as context to extract patterns

  _"Create a recipe for adding a new API endpoint based on @routes/users.ts and @controllers/UserController.ts"_

The workflow ensures your recipe includes:

- Clear step-by-step instructions
- Context validation checkpoints (questions to ask before starting)
- Usage scenarios (when this recipe applies)
- Optional code snippets for each step

:::tip
For detailed information about the recipe creation workflow and available MCP tools, see the [MCP Server reference](./mcp-server.md).
:::

## Updating Recipes

**Updating recipes** is possible from the web app, on the dedicated section of the recipes.

## Recipes Versions

Every time you update a recipe, this creates a new version.
This keeps track of the history of your changes, and it's useful to keep track of which versions are currently distributed to Git repositories.
