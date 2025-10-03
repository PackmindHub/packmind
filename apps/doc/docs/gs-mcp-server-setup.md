# Configure MCP server

The MCP (Model Context Protocol) server lets you interact with Packmind within your AI Agents sessions, to create new recipes and standards for instances.

## Getting Your MCP Access Token

1. Go into **Account Settings** in Packmind
2. Get your MCP Access token

:::warning
On the self-hosted version, make sure the URL of Packmind matches the current URL you're using to accessing Packmind.
If not, add the $PACKMIND_MCP_BASE_URL [env variable](./gs-install-self-hosted.md) in your setup.
:::

## Configuring Your AI Agent

Once you have your MCP access token, you can configure your AI agent to connect to Packmind. The specific configuration steps depend on which AI agent you're using (Cursor, Claude Code, etc.).

Your AI agent will need:

- The MCP server URL (typically `{PACKMIND_URL}/mcp`)
- Your MCP access token

## Using the MCP Server

Once configured, you can use MCP commands directly in your AI agent conversations to:

- Create standards
- Add rules to existing standards
- Create recipes from your workflow

See the [Standards Management](./standards-management.md) and [Recipes Management](./recipes-management.md) sections for specific usage examples.
