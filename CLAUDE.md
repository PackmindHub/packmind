- When running commands, ensure you use the correct Node version (see .nvmrc at the project's root level)
- When renaming or moving a file that is commited to git, use `git mv` instead of `mv`
- ensure the env variable `PACKMIND_EDITION` is properly set to `oss`

# Task splitting

- For any task you perform, you MUST split it into multiple into sub-tasks which have a logical increment (eg: new endpoint, new component, new use case etc). When a task is done, run all the validation steps (lint, test, packmind etc) and ask me for validation of the work you did.
- Each sub task MUST have its own commit.
- Before commiting anything, you must ensure that `npm run quality-gate` does not raise any issue.

# Commiting

- When referencing an issue (example #123), DO NOT write "Close" or "Fix", as this closes the issue which has not been validated by other developers.
- Before proposing to commit, ALWAYS run `npm run quality-gate` and fix the issues found
- NEVER use the `--no-verify` argument when commiting
- After commiting, ALWAYS ensure that the commit was successful.
- NEVER run a commit message without asking for permission first to allow user to review the commit
- ALWAYS ensure which GitHub issue is worked on, do not assume it based on previous commit.

<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

## Standard: Changelog

Maintain CHANGELOG.MD using Keep a Changelog format with a top [Unreleased] section linked to HEAD, ISO 8601 dates (YYYY-MM-DD), and per-release comparison links like [X.Y.Z]: https://github.com/PackmindHub/packmind/compare/release/<previous>...release/X.Y.Z to ensure accurate, consistent release documentation and version links. :
* Ensure all released versions have their corresponding comparison links defined at the bottom of the CHANGELOG.MD file in the format [X.Y.Z]: https://github.com/PackmindHub/packmind/compare/release/<previous>...release/X.Y.Z
* Format all release dates using the ISO 8601 date format YYYY-MM-DD (e.g., 2025-11-21) to ensure consistent and internationally recognized date representation
* Maintain an [Unreleased] section at the top of the changelog with its corresponding link at the bottom pointing to HEAD to track ongoing changes between releases

Full standard is available here for further request: [Changelog](.packmind/standards/changelog.md)

## Standard: Typescript code standards

Adopt TypeScript code standards by prefixing interfaces with "I" and abstract classes with "Abstract" while choosing "Type" for plain objects and "Interface" for implementations to enhance clarity and maintainability when writing .ts files. :
* Prefix abstract classes with Abstract
* Prefix interfaces with I
* Use Type for plain objects, Interface when implmentation is required

Full standard is available here for further request: [Typescript code standards](.packmind/standards/typescript-code-standards.md)

## Standard: Tests redaction

Apply good practices for test redaction in **/*.spec.ts files using single expectations, assertive titles, and nested describe blocks for workflows to improve test clarity and maintainability during the development and testing of TypeScript applications. :
* Tests have a single expectation
* Tests have an assertive title and do not start with should
* Tests that show a workflow uses multiple describe to nest steps

Full standard is available here for further request: [Tests redaction](.packmind/standards/tests-redaction.md)
<!-- end: Packmind standards -->

<!-- start: Packmind recipes -->
# Packmind Recipes

🚨 **MANDATORY STEP** 🚨

Before writing, editing, or generating ANY code:

**ALWAYS READ**: the available recipes below to see what recipes are available

## Recipe Usage Rules:
- **MANDATORY**: Always check the recipes list first
- **CONDITIONAL**: Only read/use individual recipes if they are relevant to your task
- **OPTIONAL**: If no recipes are relevant, proceed without using any

## Recipe Usage Tracking:
When you DO use or apply a relevant Packmind recipe from .packmind/recipes/, you MUST call the 'packmind_notify_recipe_usage' MCP tool with:
* Recipe slugs array (e.g., ["recipe-name"] from "recipe-name.md")
* aiAgent: "Claude Code"
* gitRepo: "repository"
* target: "/"

**Remember: Always check the recipes list first, but only use recipes that actually apply to your specific task.**`

## Available recipes

* [Create New Package in Monorepo](.packmind/recipes/create-new-package-in-monorepo.md): Create a new buildable TypeScript package in the Packmind monorepo using Nx tools to establish a shared library for code reuse across applications and packages when setting up common utilities or implementing domain-specific logic.
* [How to Write TypeORM Migrations in Packmind](.packmind/recipes/how-to-write-typeorm-migrations-in-packmind.md): Write TypeORM migrations in the Packmind monorepo to manage and version database schema changes with consistent logging, reversible rollbacks, and shared helpers so you can safely create or modify tables, columns, and foreign-key relationships whenever schema changes need to be tracked and reversible.
<!-- end: Packmind recipes -->
