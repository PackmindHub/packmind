- When running commands, ensure you use the correct Node version (see .nvmrc at the project's root level)
- When renaming or moving a file that is commited to git, use `git mv` instead of `mv`
- ensure the env variable `PACKMIND_EDITION` is properly set to `oss`

# Artefact Usage Logging

After reading `CLAUDE.md`, `.claude/rules/**`, `.claude/skills/**`, `.skills/commands/**`, `.claude/agents/**` files, or invoking Skills/Task agents, append to `.claude/artefacts.yaml`:

```yaml
- name: <filename or skill/agent name>
  path: <relative path or identifier>
  type: claude_md | rule | skill | command | agent
  date: <ISO 8601 timestamp>
```

Create if missing. Log each access. Best effort tracking.

# Task splitting

- For any task you perform, you MUST split it into multiple into sub-tasks which have a logical increment (eg: new endpoint, new component, new use case etc). When a task is done, run all the validation steps (lint, test, packmind etc) and ask me for validation of the work you did.
- Each sub task MUST have its own commit.
- Before commiting anything, you must ensure that `npm run quality-gate` does not raise any issue.

# Proactive Skills - Use During Work

These skills should be triggered **DURING** work, not just at the end. When you notice something relevant, invoke the skill immediately without asking the user.

## During Exploration (when searching for patterns to follow)

- **consistency-violation-capture** - Found conflicting patterns? (e.g., "some UseCases extend AbstractMemberUseCase, others don't", "validation in controllers here, in entities there")
- **pattern-discovery-capture** - Found 3+ files following the same undocumented convention?
- **codebase-assumption-capture** - Reality different from expectation? (e.g., "assumed Jest but found Vitest", "assumed REST but found GraphQL")

## During Implementation (while coding)

- **implicit-decision-capture** - Chose between valid alternatives without user guidance? (e.g., "picked 300ms debounce", "used compound component pattern")
- **consistency-violation-capture** - Your implementation approach differs from similar code elsewhere?
- **codebase-assumption-capture** - Started coding with wrong assumption and had to change approach?

## After Completing Work

- **command-capture** - Completed a multi-step workflow worth standardizing? (e.g., "added UseCase with tests and wiring")
- **signal-capture** - User expressed a preference that should become a standard? (e.g., "Use snake_case for DB columns")

# Commiting

- When referencing an issue (example #123), DO NOT write "Close" or "Fix", as this closes the issue which has not been validated by other developers.
- Before proposing to commit, ALWAYS run `npm run quality-gate` and fix the issues found
- NEVER use the `--no-verify` argument when commiting
- After commiting, ALWAYS ensure that the commit was successful.
- NEVER run a commit message without asking for permission first to allow user to review the commit
- ALWAYS ensure which GitHub issue is worked on, do not assume it based on previous commit.
