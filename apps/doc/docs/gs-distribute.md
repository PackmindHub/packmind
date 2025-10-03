# Make standards and recipes available to your coding assistant

Let’s see how to distribute your **Standards** and **Recipes** in a format your coding agent understands.

:::warning
An authenticated connection to a Git repository is required.

Read the page dedicated to [Git configuration](./git-repository-connection.md).
:::

## Deploy your artifacts

1. Go to the **Standards** or **Recipes** list.
2. Select one or more items and click **Deploy**.
3. Choose a target (learn more about targets [on this page](./git-repository-connection.md#deployment-targets)).
4. Run the deployment.

Packmind will push the selected artifacts as Markdown files and update your coding agent configuration files (for example: `copilot-instructions.md`, `AGENTS.md`, etc.).

## Use your artifacts

When you prompt your coding assistant, **Standards** and **Recipes** are automatically included in its context.
For complex tasks, the context can grow large, and the generated code may stop following your standards and recipes.

If this happens, re-add the `.packmind` directory to the agent’s context and try again.
