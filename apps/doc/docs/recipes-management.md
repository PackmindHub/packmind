# Recipes: automate repetitive tasks

## What are Recipes?

In teams using AI coding assistants, sharing and reusing prompts that work is often tedious. A Packmind **Recipe** is an executable, step-by-step guide that tells the AI assistant exactly how to perform a development task so your team's practices are applied consistently and reproducibly.

Recipes are repeatable and predictable instruction patterns that can be applied to achieve a specific outcome.

Examples of recipes can be:

- Create or update domain model and the SQL schema, including database migrations
- Add a new use case in a business domain

## Creating Recipes

Recipes are created through the **MCP server**.
As it's a suite of instructions and steps to follow, we recommend providing the better context to create a recipe:

- When you've accomplished a series of tasks in a session with your AI Agent, and you ask to create a recipe based on what's you've done so far
- A commit or a pull request reflects a recipe, and you can ask explicitly to your AI Agent to create a recipe by analyzing one or several commits or by providing a Pull Request URL.

You can also provide several files as context and provide additional information to get better results. Here is an example of instructions:

_"Synthetize the steps we followed to create a new use case and create a Packmind recipe based on this"_

## Updating Recipes

**Updating recipes** is possible from the web app, on the dedicated section of the recipes.

## Recipes Versions

Every time you update a recipe, this creates a new version.
This keeps track of the history of your changes, and it's useful to keep track of which versions are currently deployed on Git repositories.
