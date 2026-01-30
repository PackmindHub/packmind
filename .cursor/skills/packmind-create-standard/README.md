# Standard Creator

A skill that guides AI coding agents through the process of creating coding standards via the Packmind CLI.

## What is a Coding Standard?

Coding standards are collections of rules that capture team conventions, best practices, and coding guidelines. They enable AI coding agents to follow your team's specific practices.

## How to Use

Ask the AI agent to create a coding standard. The agent will automatically use this skill to guide the process.

### Example Prompts

- "Create a standard for TypeScript naming conventions"
- "Help me build a coding standard for our React components"
- "I want to create a standard for error handling in our API"
- "Create a new standard for test file conventions"

The AI agent will:

1. Ask clarifying questions to understand the standard's purpose
2. Help you define rules with proper formatting
3. Create a playbook JSON file
4. Get your approval before submission
5. Run the CLI command to create the standard

## Prerequisites

Before using this skill, ensure you have:

- **packmind-cli**: Required for standard creation
- **Packmind account**: Login via `packmind-cli login`

## License

Apache 2.0 - See LICENSE.txt for details.
