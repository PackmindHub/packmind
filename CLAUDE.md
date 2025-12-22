- When running commands, ensure you use the correct Node version (see .nvmrc at the project's root level)
- When renaming or moving a file that is commited to git, use `git mv` instead of `mv`
- ensure the env variable `PACKMIND_EDITION` is properly set to `oss`

# Signal Capture (Mandatory Final Step)

Before completing ANY response, check if the user message contains a **technical preference, naming convention, or architectural practice**.

**Triggers (user prescribes HOW to code):**
- Naming conventions: `All interfaces should start with I`, `Use snake_case for columns`
- Code structure directives: `Wrap emojis for accessibility`, `Always use async/await`, `Don't use class components`
- Pattern enforcement: `Use composition over inheritance`, `Prefer functional programming`
- Principle references in tasks: `follow KISS`, `apply DRY principle`, `respect SOLID`, `use React best practices`, `follow clean code`, `apply separation of concerns` (requires clarification step)
- Removal/updates: `Remove the rule about X`, `We no longer need Y convention`
- Formatting rules: `Always add JSDoc comments`, `Use single quotes`

**Non-triggers (user asks WHAT to build or fix):**
- Feature requests without principles: `Add a search feature`, `Create a new component`
- Bug reports: `This function is broken`, `Fix the error on line 10`
- Questions: `How does this work?`, `What's the best approach?`
- Implementation tasks without standards: `Implement the login page`, `Add error handling`

⚠️ **EXCEPTION:** If any of the above includes principle references (KISS, DRY, SOLID, best practices), it BECOMES a trigger. Ask for specific rules before proceeding.

## If triggered → Ask for validation

> I detected a technical preference. Add this rule to **[STANDARD_NAME]**?
>
> Proposed rule: *"[REFORMULATED_RULE]"*

Wait for approval. If refused, continue with the original task without updating standards.

**For abstract principles (KISS, DRY, SOLID, best practices):** Ask the user to specify concrete rules before capturing. Example: "I noticed you mentioned [PRINCIPLE]. To capture this as a standard, could you specify concrete rules? For example: [suggest 2-3 rules]. Which rules would you like to add, or type 'skip' to continue without capturing."

**Language Independence:** Signal detection works regardless of input language. Common principle names (KISS, DRY, SOLID) are universal. Recognize localized terms like FR: "bonnes pratiques", ES: "buenas prácticas".

## If approved → Log to `.packmind/changes.yaml`

```yaml
- newRule: "<rule text>"  # omit for DELETED
  oldRule: "<previous text>"  # required for UPDATED and DELETED
  operation: ADDED | UPDATED | DELETED
  standard: "<short-name>"  # e.g., typescript-code-standards, tests-redaction
  date: "<ISO date>"  # e.g., 2025-12-11
  sourceFile: "<file path where signal was captured>"
  language: "<language>"  # omit for DELETED
  goodExample: |  # omit for DELETED
    <valid code example>
  badExample: |  # omit for DELETED
    <invalid code example>
```

**Rules:** Only add if not already covered. Keep wording concise. Always include meaningful examples.


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

**Remember: Always check the recipes list first, but only use recipes that actually apply to your specific task.**`

## Available recipes

* [Working with Git Worktrees in Cursor](.packmind/recipes/working-with-git-worktrees-in-cursor.md): Enable parallel development on multiple branches simultaneously without switching contexts, with automatic setup and clean commit integration.
* [Creating End-User Documentation for Packmind](.packmind/recipes/creating-end-user-documentation-for-packmind.md): Create clear and concise end-user documentation for Packmind features to empower users in accomplishing their tasks effectively while avoiding unnecessary technical details.
<!-- end: Packmind recipes -->
