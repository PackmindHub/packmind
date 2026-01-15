- When running commands, ensure you use the correct Node version (see .nvmrc at the project's root level)
- When renaming or moving a file that is commited to git, use `git mv` instead of `mv`
- ensure the env variable `PACKMIND_EDITION` is properly set to `oss`

# Artefact Usage Logging

After reading `CLAUDE.md`, `.claude/rules/**`, `.claude/skills/**`, `.skills/commands/**`, `.claude/agents/**` files, or invoking Skills, append to `.claude/artefacts.yaml`:

```yaml
- name: <filename or skill/agent name>
  path: <relative path or identifier>
  type: claude_md | rule | skill | command | agent
  date: <ISO 8601 timestamp>
```

**Do NOT log internal Task tool agents** (Explore, Plan, Bash, general-purpose, etc.) - only log custom agents defined in `.claude/agents/**`.

Create if missing. Log each access. Best effort tracking.

# Task splitting

- For any task you perform, you MUST split it into multiple into sub-tasks which have a logical increment (eg: new endpoint, new component, new use case etc). When a task is done, run all the validation steps (lint, test, packmind etc) and ask me for validation of the work you did.
- Each sub task MUST have its own commit.
- Before commiting anything, you must ensure that `npm run quality-gate` does not raise any issue.

# Post-Task Skills Check

**MANDATORY CHECK**: After completing ANY task, you MUST systematically check for opportunities to invoke these skills. Review the work you just completed and actively look for content worth capturing. If nothing is relevant or worthwhile, that's acceptable - but you MUST perform this check every time.

Check for:
- **command-capture** - Did you complete a multi-step workflow worth standardizing? (e.g., "added UseCase with tests and wiring", "set up new API endpoint with validation and tests")
- **signal-capture** - Did the user express a preference that should become a standard? (e.g., "Use snake_case for DB columns", "Always add loading states to async operations")
- **pattern-discovery-capture** - Did you find 3+ files following the same undocumented convention? (e.g., "all controllers use a consistent error handling pattern", "service classes follow similar initialization patterns")
- **implicit-decision-capture** - Did you make technical choices without explicit user guidance during implementation? (e.g., "chose 300ms debounce", "used compound component pattern")
- **consistency-violation-capture** - Did you discover inconsistencies in the codebase while working? (e.g., "some error handling uses try-catch, others use error boundaries", "some UseCases extend AbstractMemberUseCase, others don't")
- **codebase-assumption-capture** - Did reality differ from your initial expectations during the work? (e.g., "assumed Redux but found Context API", "expected REST but discovered GraphQL", "assumed Jest but found Vitest")

# Commiting

- When referencing an issue (example #123), DO NOT write "Close" or "Fix", as this closes the issue which has not been validated by other developers.
- Before proposing to commit, ALWAYS run `npm run quality-gate` and fix the issues found
- NEVER use the `--no-verify` argument when commiting
- After commiting, ALWAYS ensure that the commit was successful.
- NEVER run a commit message without asking for permission first to allow user to review the commit
- ALWAYS ensure which GitHub issue is worked on, do not assume it based on previous commit.
