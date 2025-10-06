# MCP Server: Connect AI Agents to Packmind

The Packmind MCP (Model Context Protocol) server enables AI coding assistants like Claude, Cursor, and GitHub Copilot to interact directly with your organization's recipes and coding standards, allowing them to capture knowledge and enforce best practices during development.

Once you've configured your MCP server (see [MCP Server Setup](gs-mcp-server-setup.md)), you can use these tools through your AI agent.

## Available Tools

### Onboarding Workflows

**Tool:** `packmind_onboarding`

Provides guided workflows for creating coding standards based on different information sources.

### Create Recipe

**Tool:** `packmind_create_recipe`

Captures a reusable process or procedure as a structured Packmind recipe.

**Parameters:**

- `name` (required) - The name of the recipe to create
- `content` (required) - A description of the recipe in markdown format
- `summary` (optional) - A concise sentence describing what the recipe does, why it's useful, and when to use it

### Track Recipe Usage

**Tool:** `packmind_notify_recipe_usage`

Records when a deployed recipe is used by an AI agent to track adoption and usage analytics.

**Parameters:**

- `recipesSlug` (required) - Array of recipe slugs that were used
- `aiAgent` (required) - Name of the AI agent (e.g., "Cursor", "Claude Code", "GitHub Copilot")
- `gitRepo` (optional) - Git repository in "owner/repo" format where recipes were used
- `target` (optional) - Path where recipes are distributed (e.g., "/", "/src/frontend/")

### Add Rule to Standard

**Tool:** `packmind_add_rule_to_standard`

Adds a new coding rule to an existing standard in your organization.

**Parameters:**

- `standardSlug` (required) - Slug of the standard to add the rule to
- `ruleContent` (required) - Descriptive rule name starting with a verb explaining its intention
- `positiveExample` (optional) - Code snippet showing correct implementation of the rule
- `negativeExample` (optional) - Code snippet showing incorrect implementation
- `language` (optional) - Programming language of the code snippets

### List Standards

**Tool:** `packmind_list_standards`

Retrieves all coding standards created in your organization.

**Parameters:** None

### Create Standard

**Tool:** `packmind_create_standard`

Creates a new coding standard with multiple rules and code examples in a single operation.

**Parameters:**

- `name` (required) - Name of the standard to create
- `description` (required) - Comprehensive description in markdown format explaining the standard's purpose
- `summary` (optional) - Concise sentence describing when to apply this standard
- `rules` (optional) - Array of rules, each containing:
  - `content` (required) - Rule description starting with a verb
  - `examples` (optional) - Array of code examples with `positive`, `negative`, and `language` fields
