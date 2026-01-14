# MCP Server: Connect AI Agents to Packmind

The Packmind MCP (Model Context Protocol) server enables AI coding assistants like Claude, Cursor, and GitHub Copilot to interact directly with your organization's commands and coding standards, allowing them to capture knowledge and enforce best practices during development.

Once you've configured your MCP server (see [MCP Server Setup](gs-mcp-server-setup.md)), you can use these tools through your AI agent.

## Understanding Workflows

Packmind MCP provides **workflow tools** that guide AI agents through a structured process for creating high-quality standards and commands. These workflows ensure consistency and completeness by providing step-by-step instructions that the AI agent follows to:

1. Gather appropriate context from your codebase
2. Draft initial content with user collaboration
3. Iterate and refine based on feedback
4. Finalize and submit to Packmind

The workflow tools don't create content themselves—they provide guidance that the AI agent uses to interact with you and your codebase, ensuring the final output meets quality standards.

## Available Tools

### Onboarding Workflows

**Tool:** `onboarding`

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

**Tool:** `list_standards`

Retrieves all coding standards created in your organization. Returns up to 20 standards sorted alphabetically by slug.

**Parameters:** None

**Returns:** A formatted list showing `• slug: name` for each standard

### Get Standard Details

**Tool:** `get_standard_details`

Retrieves the full content of a specific standard including all its rules and code examples by its slug identifier.

**Parameters:**

- `standardSlug` (required) - The slug identifier of the standard

**Returns:** Complete standard details including description, rules, and code examples

### Standard Creation Workflow

**Tool:** `create_standard`

Provides step-by-step guidance for creating a new coding standard. This workflow ensures the AI agent gathers appropriate context, collaborates with you to draft the standard, and prepares it properly for submission.

**Parameters:**

- `step` (optional) - Workflow step identifier. Defaults to `initial-request` when omitted.
  - `initial-request` - Initial guidance for understanding the user's intent and gathering context
  - `clarify` - Instructions for clarifying requirements and scope
  - `drafting` - Instructions for creating the standard draft and iterating with the user
  - `finalization` - Final checks and instructions before calling `save_standard`

**Usage:** The AI agent will automatically progress through these steps. You typically don't need to specify the step parameter.

### Save Standard

**Tool:** `save_standard`

Creates a new coding standard with multiple rules and code examples in a single operation.

:::warning
Do not call this tool directly. AI agents must first complete the standard creation workflow using `create_standard`.
:::

:::tip
When creating new standard using `save_standard`, you can include the optional `packageSlugs` parameter to automatically add it to packages during creation.
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

**Tool:** `create_standard_rule`

Provides step-by-step guidance for adding a new rule to an existing standard. Ensures the rule is well-formed, includes appropriate examples, and fits within the standard's context.

**Parameters:**

- `step` (optional) - Workflow step identifier. Defaults to `initial-request` when omitted.
  - `initial-request` - Guidance for understanding what rule to add and to which standard
  - `drafting` - Instructions for drafting the rule content and examples
  - `finalization` - Final checks before calling `save_standard_rule`

### Save Standard Rule

**Tool:** `save_standard_rule`

Adds a new coding rule to an existing standard in your organization. Creates a new version of the standard.

:::warning
Do not call this tool directly. AI agents must first complete the add rule workflow using `create_standard_rule`.
:::

**Parameters:**

- `standardSlug` (required) - Slug of the existing standard (use `list_standards` to find it)
- `ruleContent` (required) - Descriptive rule starting with a verb explaining its intention and how/when to use it
- `positiveExample` (optional) - Code snippet showing correct implementation of the rule
- `negativeExample` (optional) - Code snippet showing incorrect implementation
- `language` (optional) - Programming language of the code snippets

**Returns:** Confirmation message with the new standard version number

---

## Commands Tools

### List Commands

**Tool:** `list_commands`

Retrieves all commands created in your organization. Returns up to 20 commands sorted alphabetically by slug.

**Parameters:** None

**Returns:** A formatted list showing `• slug: name` for each command

### Get Command Details

**Tool:** `get_command_details`

Retrieves the full content of a specific command by its slug identifier.

**Parameters:**

- `commandSlug` (required) - The slug identifier of the command

**Returns:** Complete command details including name, slug, version, and full markdown content

### Command Creation Workflow

**Tool:** `create_command`

Provides step-by-step guidance for creating a new command. This workflow ensures the AI agent properly structures the command with clear steps, appropriate context validation checkpoints, and usage scenarios.

**Parameters:**

- `step` (optional) - Workflow step identifier. Defaults to `initial-request` when omitted.
  - `initial-request` - Initial guidance for understanding the process to capture as a command
  - `drafting` - Instructions for structuring the command with steps, checkpoints, and scenarios
  - `finalization` - Final validation before calling `save_command`

**Usage:** The AI agent will automatically progress through these steps. You typically don't need to specify the step parameter.

### Save Command

**Tool:** `save_command`

Captures a reusable development process or procedure as a structured Packmind command with clear, actionable steps.

:::warning
Do not call this tool directly. AI agents must first complete the command creation workflow using `create_command`.
:::

:::tip
When creating new command using `save_command`, you can include the optional `packageSlugs` parameter to automatically add them to packages during creation.
:::

**Parameters:**

- `name` (required) - The name of the command (e.g., "Add REST Endpoint", "Create Domain Model")
- `summary` (required) - A concise sentence describing the intent (what it does), value (why useful), and relevance (when to use)
- `whenToUse` (required) - Array of specific, actionable scenarios when this command applies
- `contextValidationCheckpoints` (required) - Array of checkpoints (questions or validation points) to ensure context is clarified before implementing steps
- `steps` (required) - Array of atomic, actionable steps, each containing:
  - `name` (required) - The step title (e.g., "Setup Dependencies", "Create Database Schema")
  - `description` (required) - Sentence describing the step's intent and how to implement it (supports Markdown)
  - `codeSnippet` (optional) - Brief, focused code example demonstrating the step (Markdown with language-specific code blocks)

---

## Packages Tools

### List Packages

**Tool:** `list_packages`

Retrieves all packages created in your organization. Packages are collections of commands, standards, and skills that can be distributed together.

**Parameters:** None

**Returns:** A formatted list showing package slugs and their descriptions

**Usage Example:**

```plaintext
"List all available Packmind packages"
```

### Get Package Details

**Tool:** `get_package_details`

Retrieves the full content of a specific package including all its commands, standards, and skills.

**Parameters:**

- `packageSlug` (required) - The slug identifier of the package

**Returns:** Complete package details including:

- Package name, slug, and description
- List of all commands in the package with their summaries
- List of all standards in the package with their summaries
- List of all skills in the package with their descriptions

**Usage Example:**

```plaintext
"Show me the details of the frontend-react package"
```

### Install Package

**Tool:** `install_package`

Provides installation instructions for Packmind packages. This tool returns guidance that directs the AI agent to either use the `packmind-cli` (if available) or call the `render_package` tool to generate file updates.

**Parameters:**

- `packageSlug` (required) - The slug of the package to install. Use `list_packages` to find available packages.
- `relativePath` (required) - The target directory where files should be installed (e.g., `"/"` for project root, `"/packages/my-app/"` for a monorepo subfolder)

**Returns:** Step-by-step installation instructions that guide the AI agent to:

1. Check if `packmind-cli` is installed
2. Use the CLI if available, or call `render_package` if not

**Usage Example:**

```plaintext
"Install the typescript-best-practices package in my project"
```

### Render Package

**Tool:** `render_package`

Generates file updates for the AI agent to apply when installing a Packmind package. This tool is called by the AI agent after `install_package` when the `packmind-cli` is not available.

**Parameters:**

- `packageSlug` (required) - The slug of the package to render. Use `list_packages` to find available packages.
- `installedPackages` (optional) - Array of already installed package slugs from your `packmind.json` file. Read the file and extract the package slugs from the `packages` section to preserve existing installations.
- `relativePath` (required) - The target directory where files should be installed (e.g., `"/"` for project root, `"/packages/my-app/"` for a monorepo subfolder)
- `gitRemoteUrl` (required) - The git remote URL of your repository. Run `git remote get-url origin` to obtain it. Use an empty string if unable to retrieve.
- `gitBranch` (required) - The current git branch name. Run `git branch --show-current` to obtain it. Use an empty string if unable to retrieve.

**Returns:** File contents to create or update, which the AI agent will apply to your project. The response includes:

- Files to create or update with their content
- Files to delete
- Section-based updates for files like `CLAUDE.md`

:::note
You typically don't call this tool directly. The AI agent will automatically use it based on the instructions from `install_package` when `packmind-cli` is not available.
:::
