# Package Creator

A skill that guides AI coding agents through the process of creating Packmind packages via the CLI.

## What is a Package?

Packages are logical collections of standards, commands, and skills that can be distributed together. They help organize artifacts by technology, domain, team, or architectural layer.

## How to Use

Ask the AI agent to create a package. The agent will automatically use this skill to guide the process.

### Example Prompts

- "Create a package for our frontend standards"
- "Help me create a backend package"
- "I want to create a package for our NestJS conventions"

The AI agent will:

1. List existing packages to check naming conventions
2. Confirm the package name and description with you
3. Run the CLI command to create the package

## Prerequisites

Before using this skill, ensure you have:

- **packmind-cli**: Required for package creation
- **Packmind account**: Login via `packmind-cli login`

## License

Apache 2.0 - See LICENSE.txt for details.
