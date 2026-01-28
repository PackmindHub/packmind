Create a CLI release with version {{version}}. Follow these steps:

1. **Verify clean git status**: Check that `git status` shows no uncommitted changes. If there are changes, fail and ask the user to commit or stash them first.

2. **Update apps/cli/package.json and apps/cli/CHANGELOG.MD for release (First commit)**:
   - Update the version in apps/cli/package.json to `{{version}}`
   - in apps/cli/CHANGELOG.md:
     - drop the empty sections under [Unreleased]
     - Replace the `[Unreleased]` heading with `[{{version}}] - {{today_date}}` (use ISO 8601 format YYYY-MM-DD for the date)
     - Update the unreleased comparison link at the bottom to point to the new release:
       ```
       [{{version}}]: https://github.com/PackmindHub/packmind/compare/release-cli/{{previous_version}}...release-cli/{{version}}
       ```
     - Extract the previous version from the existing comparison links in apps/cli/CHANGELOG.MD
   - Commit with message: `chore(cli): release {{version}}`

3. **Create and push release tag**:
   - Create tag: `release-cli/{{version}}`
   - Push the tag to GitHub

4. **Prepare next development cycle (Second commit)**:
   - Add a new `[Unreleased]` section at the top of apps/cli/CHANGELOG.MD:

     ```markdown
     # [Unreleased]

     ## Added

     ## Changed

     ## Fixed

     ## Removed
     ```

   - Add the unreleased comparison link at the bottom:
     ```
     [Unreleased]: https://github.com/PackmindHub/packmind/compare/release-cli/{{version}}...HEAD
     ```
   - Commit with message: `chore(cli): prepare next development cycle`

5. **Push all commits** to GitHub

Important notes:

- Do NOT use `--no-verify` when committing
- Verify each commit was successful before proceeding to the next step
- The date must be in ISO 8601 format (YYYY-MM-DD)
