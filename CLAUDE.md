- When running commands, ensure you use the correct Node version (see .nvmrc at the project's root level)
- When renaming or moving a file that is commited to git, use `git mv` instead of `mv`
- ensure the env variable `PACKMIND_EDITION` is properly set to `oss`

# Task splitting

- For any task you perform, you MUST split it into multiple into sub-tasks which have a logical increment (eg: new endpoint, new component, new use case etc). When a task is done, run all the validation steps (lint, test, packmind etc) and ask me for validation of the work you did.
- Each sub task MUST have its own commit.
- Before commiting anything, you must ensure that `npm run quality-gate` does not raise any issue.

# Proactive Skills - Use During Work

After completing exploration or coding tasks, check if any of these skills should be triggered:

- **consistency-violation-capture** - Did you find different approaches to the same concern across modules/packages?
- **pattern-discovery-capture** - Did you observe recurring patterns or conventions that aren't formally documented?
- **implicit-decision-capture** - Did you make technical decisions without explicit user guidance during coding?
- **command-capture** - Did you complete a multi-step workflow that could benefit other developers?
- **signal-capture** - Did the user express technical preferences or coding practices that should become standards?
- **codebase-assumption-capture** - Did you discover that initial assumptions about architecture or patterns were incorrect?

These skills should be triggered DURING work, not just at the end. When you notice something relevant, invoke the skill immediately.

# Commiting

- When referencing an issue (example #123), DO NOT write "Close" or "Fix", as this closes the issue which has not been validated by other developers.
- Before proposing to commit, ALWAYS run `npm run quality-gate` and fix the issues found
- NEVER use the `--no-verify` argument when commiting
- After commiting, ALWAYS ensure that the commit was successful.
- NEVER run a commit message without asking for permission first to allow user to review the commit
- ALWAYS ensure which GitHub issue is worked on, do not assume it based on previous commit.
