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
3. Initialize a playbook template using the bundled scripts
4. Validate the playbook before submission
5. Run the CLI command to create the standard
6. Verify the standard was created correctly

## Prerequisites

Before using this skill, ensure you have:

- **Python 3**: Required for playbook initialization and validation
- **packmind-cli**: Required for standard creation
- **Packmind account**: Login via `packmind-cli login`

## Directory Structure

```
packmind-standard-creator/
├── SKILL.md           # Instructions for the AI agent
├── README.md          # This file (for humans)
├── LICENSE.txt        # Apache 2.0 license
└── scripts/
    ├── init_playbook.py      # Initialize a new playbook from template
    └── validate_playbook.py  # Validate playbook format and rules
```

## License

Apache 2.0 - See LICENSE.txt for details.
