# Create skill

A skill that guides AI coding agents through the process of creating effective skills.

## What is a Skill?

Skills are modular, self-contained packages that extend AI coding agents' capabilities by providing specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific domains or tasks.

## How to Use

Simply ask the AI agent to create a skill. The agent will automatically use this skill to guide the process.

### Example Prompts

- "Create a skill for working with PDF files"
- "Help me build a skill that guides API integration with our backend"
- "I want to create a skill for our team's coding standards"
- "Create a new skill about adding CLI commands to the project"

The AI agent will:

1. Ask clarifying questions to understand the skill's purpose
2. Initialize the skill structure using the bundled scripts
3. Guide you through editing the SKILL.md content
4. Validate the skill before distribution
5. Help you distribute it via packmind-cli

## Prerequisites

Before using this skill, ensure you have:

- **Python 3**: Required for skill initialization and validation
- **packmind-cli**: Required for skill distribution

## Directory Structure

```
create-skill/
├── SKILL.md           # Instructions for the AI agent
├── README.md          # This file (for humans)
├── LICENSE.txt        # Apache 2.0 license
└── scripts/
    ├── init_skill.py      # Initialize a new skill from template
    └── quick_validate.py  # Validate skill structure
```

## Attribution

This skill is based on the original [skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) from Anthropic's skills repository.

## License

Apache 2.0 - See LICENSE.txt for details.
