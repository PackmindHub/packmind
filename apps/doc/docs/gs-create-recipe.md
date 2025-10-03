# Create your first recipe

In teams using coding assistants, sharing and reusing _prompts that work_ is often tedious.

A Packmind **Recipe** is an executable, step-by-step guide that tells the AI assistant exactly how to perform a development task so your team’s practices are applied consistently and reproducibly.

**Examples**

- “Add a new REST endpoint” — steps to define the route, implement the handler, add input validation, write tests, and update API docs.
- “Set up a CI pipeline for a project” — steps to configure the workflow, run lint/tests/build on each push/PR, and report status checks.

:::warning
The MCP server **must** be configured to create Recipes.
See the setup guide: [Get started with the MCP server](./gs-mcp-server-setup.md).
:::

## How to

1. Open your IDE and your coding assistant in **agentic mode**.
2. For this demo, we will create a **language-agnostic recipe**. (You can also target a specific language or framework.)
3. Type this prompt:

```text
Analyze our codebase and create a Packmind recipe to add a new endpoint to our API.
```

## Tips

The quality of the generated recipe depends mostly on the level of detail you provide to your coding assistant.

When capturing a **Recipe**, you can, for example:

- **Use the current conversation**

  **Example**

  ```text
  Create a Packmind recipe for adding a new endpoint based on your last suggested changes.
  ```

- **Mention example files or directories**

  **Example**

  ```text
  Using the file `MyPageFile.tsx`, create a Packmind recipe for bootstrapping a new page in the frontend.
  ```

- **Use a Git commit diff**

  **Example**

  ```text
  Read commit abcd123 and create a recipe for migrating an Angular component to React.
  ```
