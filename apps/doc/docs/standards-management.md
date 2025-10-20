# Standards: enforce your coding guidelines

## Why Standards Matter with AI Agents

Context engineering is key to making the most of AI coding assistants. Standards are guidelines that drive the output of agents, ensuring they generate code that follows your team's conventions and best practices.

Many teams struggle with documentation that nobody reads or maintains—wikis and Markdown files that become outdated quickly. With AI coding assistants, this problem becomes even more critical. Standards make your written documentation useful again by providing consistent, actionable guidance that AI agents can follow automatically.

## Understand Standards and Rules

A standard is an agreed-upon, documented set of rules or criteria that ensures consistent, compatible, and high-quality code across your team.

Here is a basic example of standard:

---

**Standard**: Back-end unit tests

**Rules for this standard**:

- Use assertive names in test names (`it("returns ..."` instead of `it("should return")` ))
- Structure tests with the AAA pattern
- Single expect per test

---

## Create a Standard with MCP

You can create a standard directly from your IDE using the MCP server. This is particularly useful when you want to extract coding rules from existing code files.

The AI agent will automatically follow a **guided workflow** to ensure high-quality standards. Simply use natural language prompts like:

_"Create a Packmind standard 'Unit tests with Jest' and extract coding rules by analyzing the file @test.spec.ts"_

The agent will:

1. Use the `packmind_create_standard_workflow` tool to get step-by-step guidance
2. Gather context from your codebase and iterate with you on the draft
3. Create the standard with rules and code examples using `packmind_create_standard`

Rules are optional when creating a standard through MCP - you can create the standard first and add rules later.

:::tip
For detailed information about available MCP tools and workflows, see the [MCP Server reference](./mcp-server.md).
:::

## Add Rule to an Existing Standard with MCP

While working with your AI Agent, you often provide instructions regarding code guidelines and standards.

To capitalize on it and not keep it locally, you can use natural language to add rules to existing standards:

_"Add a rule to our standard 'Back-end unit tests' that states that one single expect must be set for each test"_

The agent will:

1. Use the `packmind_add_rule_to_standard_workflow` tool to get guidance
2. Validate the rule content and ensure it fits the standard's context
3. Add the rule (with optional code examples) using `packmind_add_rule_to_standard`
4. Create a new version of the standard

This creates a new version of the standard with the added rule, maintaining a complete version history.

## Create Standards Through UI

Go in the **Standards** menu and create your first standard.
The description area supports Markdown so you can give more context about it.

Add your first rules, ideally with one clear detailed sentence.

The _scope_ let you define files and folders patterns where the standard applies.
For instance, you may want to use `**/*.spec.ts` if your standards is related to tests.

You can update your standard later to add and remove rules. Each rule can be documented with code examples as well.

## Standards Versions

Every time you update a standard, this creates a new version.
This keeps track of the history of your changes, and it's useful to keep track of which versions are currently deployed on Git repositories.
