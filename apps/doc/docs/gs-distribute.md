# Make standards and recipes available to your coding assistant

There are two ways to distribute your **Standards** and **Recipes** in a format your coding agent understands:

1. **Pull locally via CLI** - Download content directly to your local machine (no Git required)
2. **Deploy to Git repositories** - Push standards and recipes to your repositories (requires Git configuration)

## Pull artifacts locally with CLI

:::warning API Key Required
The pull command requires a valid API key to authenticate with Packmind.

See the [CLI documentation](./cli.md#authentication) for setup instructions.
:::

Use the Packmind CLI to pull packages locally:

**List available packages:**

```bash
packmind-cli pull --list
```

**View package details:**

```bash
packmind-cli pull --show <package-slug>
```

**Pull one or more packages:**

```bash
packmind-cli pull <package-slug> [additional-package-slugs...]
```

This downloads all recipes and standards from the specified packages and creates the appropriate files for your AI coding assistant.

For detailed CLI usage, see the [CLI documentation](./cli.md#using-the-pull-command).

## Deploy your artifacts to Git repositories

:::warning Git Configuration Required
Deploying to Git repositories requires an authenticated connection.

Read the page dedicated to [Git configuration](./git-repository-connection.md).
:::

You can deploy standards and recipes either individually or grouped together in packages.

### Deploy Individual Standards and Recipes

1. Go to the **Standards** or **Recipes** list.
2. Select one or more items and click **Deploy**.
3. Choose a target (learn more about targets [on this page](./git-repository-connection.md#deployment-targets)).
4. Run the deployment.

### Deploy Packages

For better organization, you can group related recipes and standards into **Packages** and deploy them as a single unit:

1. Navigate to the **Packages** section
2. Select one or more packages and click **Deploy**
3. Choose a target for deployment
4. Run the deployment

When you deploy a package, all its recipes and standards are deployed together. This is useful for maintaining consistent sets of guidelines across different parts of your codebase. Learn more about packages in the [Packages Management](./packages-management.md) documentation.

Packmind will push the selected artifacts as Markdown files and update your coding agent configuration files (for example: `copilot-instructions.md`, `AGENTS.md`, etc.).

## Use your artifacts

When you prompt your coding assistant, **Standards** and **Recipes** are automatically included in its context.
For complex tasks, the context can grow large, and the generated code may stop following your standards and recipes.

If this happens, re-add the `.packmind` directory to the agent's context and try again.
