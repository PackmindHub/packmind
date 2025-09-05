When running commands, ensure you use the correct Node version (see .nvmrc at the project's root level)

# Task splitting

- For any task you perform, you MUST split it into multiple into sub-tasks which have a logical increment (eg: new endpoint, new component, new use case etc). When a task is done, run all the validation steps (lint, test, packmind etc) and ask me for validation of the work you did.
- Each sub task MUST have its own commit.
- Before commiting anything, you must ensure that `npm run quality-gate` does not raise any issue.

# Commiting

- Before proposing to commit, ALWAYS run `npm run quality-gate` and fix the issues found
- NEVER use the `--no-verify` argument when commiting
- After commiting, ALWAYS ensure that the commit was successful.

# Packmind Recipes

🚨 **MANDATORY STEP** 🚨

Before writing, editing, or generating ANY code:

**ALWAYS READ**: @.packmind/recipes-index.md to see what recipes are available

## Writing a recipe

- After you have generated the markdown for the recipe description, create a scratch file with the markdown content so a human can read your proposal.

## Recipe Usage Rules:

- **MANDATORY**: Always check the recipes index first
- **CONDITIONAL**: Only read/use individual recipes if they are relevant to your task
- **OPTIONAL**: If no recipes are relevant, proceed without using any

## Recipe Usage Tracking:

When you DO use or apply a relevant Packmind recipe from .packmind/recipes/, you MUST call the 'packmind_notify_recipe_usage' MCP tool with:

- Recipe slugs array (e.g., ["recipe-name"] from "recipe-name.md")
- aiAgent: "Claude Code"
- gitRepo: "PackmindHub/packmind-monorepo"

**Remember: Always check the recipes index first, but only use recipes that actually apply to your specific task.**

## Packmind Standards

Follow the coding standards defined in @.packmind/standards-index.md
