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

Use commands like:

_"Create a Packmind standard 'Unit tests with Jest' and extract coding rules by analyzing the file @test.spec.ts"_

Rules are optional when creating a standard through MCP - you can create the standard first and add rules later.

## Add Rule to an Existing Standard with MCP

While working with your AI Agent, you often provide instructions regarding code guidelines and standards.

To capitalize on it and not keep it locally, you can use one tool from the MCP like this:

_"Add a rule to our standards 'Back-end unit tests' that states that one single expect must be set for each test"_

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
