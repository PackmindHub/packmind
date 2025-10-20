# MCP Server: Connect AI Agents to Packmind

The Packmind MCP (Model Context Protocol) server enables AI coding assistants like Claude, Cursor, and GitHub Copilot to interact directly with your organization's recipes and coding standards, allowing them to capture knowledge and enforce best practices during development.

Once you've configured your MCP server (see [MCP Server Setup](gs-mcp-server-setup.md)), you can use these tools through your AI agent.

## Understanding Workflows

Packmind MCP provides **workflow tools** that guide AI agents through a structured process for creating high-quality standards and recipes. These workflows ensure consistency and completeness by providing step-by-step instructions that the AI agent follows to:

1. Gather appropriate context from your codebase
2. Draft initial content with user collaboration
3. Iterate and refine based on feedback
4. Finalize and submit to Packmind

The workflow tools don't create content themselves—they provide guidance that the AI agent uses to interact with you and your codebase, ensuring the final output meets quality standards.

## Available Tools

### Onboarding Workflows

**Tool:** `packmind_onboarding`

Provides guided workflows for creating coding standards based on different information sources. This is particularly useful when first setting up standards for your organization.

**Parameters:**

- `workflow` (optional) - The workflow name to retrieve. Available workflows:
  - `codebase-analysis` - Guide for analyzing existing codebase to extract standards
  - `git-history` - Guide for deriving standards from git commit patterns
  - `documentation` - Guide for converting existing documentation to standards
  - `ai-instructions` - Guide for transforming AI agent instructions into standards
  - `web-research` - Guide for incorporating best practices from external sources

When no workflow is specified, returns a mode selection guide to help choose the appropriate workflow.

---

## Standards Tools

### List Standards

**Tool:** `packmind_list_standards`

Retrieves all coding standards created in your organization. Returns up to 20 standards sorted alphabetically by slug.

**Parameters:** None

**Returns:** A formatted list showing `• slug: name` for each standard

### Standard Creation Workflow

**Tool:** `packmind_create_standard_workflow`

Provides step-by-step guidance for creating a new coding standard. This workflow ensures the AI agent gathers appropriate context, collaborates with you to draft the standard, and prepares it properly for submission.

**Parameters:**

- `step` (optional) - Workflow step identifier. Defaults to `initial-request` when omitted.
  - `initial-request` - Initial guidance for understanding the user's intent and gathering context
  - `drafting` - Instructions for creating the standard draft and iterating with the user
  - `finalization` - Final checks and instructions before calling `packmind_create_standard`

**Usage:** The AI agent will automatically progress through these steps. You typically don't need to specify the step parameter.

### Create Standard

**Tool:** `packmind_create_standard`

Creates a new coding standard with multiple rules and code examples in a single operation.

:::warning
Do not call this tool directly. AI agents must first complete the standard creation workflow using `packmind_create_standard_workflow`.
:::

**Parameters:**

- `name` (required) - Name of the standard (e.g., "Error Handling", "Unit Test Conventions")
- `description` (required) - Comprehensive description explaining the standard's purpose, context, and when it applies. Must NOT contain code examples (those go in rule examples). Maximum one paragraph.
- `summary` (optional) - A concise one-sentence description of the standard's intent and when to apply its rules
- `rules` (optional) - Array of rules, each containing:
  - `content` (required) - Clear, concise rule description starting with a verb (e.g., "Use assertive names in test descriptions")
  - `examples` (optional) - Array of code examples, each with:
    - `positive` (required) - Code snippet showing correct implementation
    - `negative` (required) - Code snippet showing incorrect implementation
    - `language` (required) - Programming language of the snippet (e.g., "typescript", "javascript", "python")

### Add Rule to Standard Workflow

**Tool:** `packmind_add_rule_to_standard_workflow`

Provides step-by-step guidance for adding a new rule to an existing standard. Ensures the rule is well-formed, includes appropriate examples, and fits within the standard's context.

**Parameters:**

- `step` (optional) - Workflow step identifier. Defaults to `initial-request` when omitted.
  - `initial-request` - Guidance for understanding what rule to add and to which standard
  - `validation` - Instructions for validating the rule content and examples
  - `finalization` - Final checks before calling `packmind_add_rule_to_standard`

### Add Rule to Standard

**Tool:** `packmind_add_rule_to_standard`

Adds a new coding rule to an existing standard in your organization. Creates a new version of the standard.

:::warning
Do not call this tool directly. AI agents must first complete the add rule workflow using `packmind_add_rule_to_standard_workflow`.
:::

**Parameters:**

- `standardSlug` (required) - Slug of the existing standard (use `packmind_list_standards` to find it)
- `ruleContent` (required) - Descriptive rule starting with a verb explaining its intention and how/when to use it
- `positiveExample` (optional) - Code snippet showing correct implementation of the rule
- `negativeExample` (optional) - Code snippet showing incorrect implementation
- `language` (optional) - Programming language of the code snippets

**Returns:** Confirmation message with the new standard version number

---

## Recipes Tools

### List Recipes

**Tool:** `packmind_list_recipes`

Retrieves all recipes created in your organization. Returns up to 20 recipes sorted alphabetically by slug.

**Parameters:** None

**Returns:** A formatted list showing `• slug: name` for each recipe

### Recipe Creation Workflow

**Tool:** `packmind_create_recipe_workflow`

Provides step-by-step guidance for creating a new recipe. This workflow ensures the AI agent properly structures the recipe with clear steps, appropriate context validation checkpoints, and usage scenarios.

**Parameters:**

- `step` (optional) - Workflow step identifier. Defaults to `initial-request` when omitted.
  - `initial-request` - Initial guidance for understanding the process to capture as a recipe
  - `drafting` - Instructions for structuring the recipe with steps, checkpoints, and scenarios
  - `finalization` - Final validation before calling `packmind_create_recipe`

**Usage:** The AI agent will automatically progress through these steps. You typically don't need to specify the step parameter.

### Create Recipe

**Tool:** `packmind_create_recipe`

Captures a reusable development process or procedure as a structured Packmind recipe with clear, actionable steps.

:::warning
Do not call this tool directly. AI agents must first complete the recipe creation workflow using `packmind_create_recipe_workflow`.
:::

**Parameters:**

- `name` (required) - The name of the recipe (e.g., "Add REST Endpoint", "Create Domain Model")
- `summary` (required) - A concise sentence describing the intent (what it does), value (why useful), and relevance (when to use)
- `whenToUse` (required) - Array of specific, actionable scenarios when this recipe applies
- `contextValidationCheckpoints` (required) - Array of checkpoints (questions or validation points) to ensure context is clarified before implementing steps
- `steps` (required) - Array of atomic, actionable steps, each containing:
  - `name` (required) - The step title (e.g., "Setup Dependencies", "Create Database Schema")
  - `description` (required) - Sentence describing the step's intent and how to implement it (supports Markdown)
  - `codeSnippet` (optional) - Brief, focused code example demonstrating the step (Markdown with language-specific code blocks)

### Track Recipe Usage

**Tool:** `packmind_notify_recipe_usage`

Records when a deployed recipe is used by an AI agent. This tracks adoption and provides usage analytics for your organization.

**Parameters:**

- `recipesSlug` (required) - Array of recipe slugs that were used (e.g., `["add-rest-endpoint", "create-use-case"]`)
- `aiAgent` (required) - Name of the AI agent using the recipe (e.g., "Cursor", "Claude Code", "GitHub Copilot")
- `gitRepo` (optional) - Git repository in "owner/repo" format where recipes were used
- `target` (optional) - Path where recipes are distributed (e.g., "/", "/src/frontend/", "/src/backend/")

**Usage:** This tool is typically called automatically when AI agents apply deployed recipes from your `.packmind/recipes/` directory.
