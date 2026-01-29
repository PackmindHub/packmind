Create a Packmind release with version {{version}}. Follow these steps:

1. **Verify clean git status**: Check that `git status` shows no uncommitted changes. If there are changes, fail and ask the user to commit or stash them first.

2. **Update package.json files and CHANGELOG.MD for release (First commit)**:
   * Update the version in `package.json` to `{{version}}`
   * Update the version in `apps/api/docker-package.json` to `{{version}}`
   * In CHANGELOG.md:
     * drop the empty sections under \[Unreleased]
     * Replace the `[Unreleased]` heading with `[{{version}}] - {{today_date}}` (use ISO 8601 format YYYY-MM-DD for the date)
     * Update the unreleased comparison link at the bottom to point to the new release:
       ```
       [{{version}}]: https://github.com/PackmindHub/packmind/compare/release/{{previous_version}}...release/{{version}}
       ```
     * Extract the previous version from the existing comparison links inCHANGELOG.MD
   * Commit with message: `chore: release {{version}}`

3. **Create and push release tag**:
   * Create tag: `release/{{version}}`
   * Push the tag to GitHub

4. **Prepare next development cycle (Second commit)**:
   * Add a new `[Unreleased]` section at the top of CHANGELOG.MD:

     ```markdown
     # [Unreleased]

     ## Added

     ## Changed

     ## Fixed

     ## Removed
     ```

   * Add the unreleased comparison link at the bottom:
     ```
     [Unreleased]: https://github.com/PackmindHub/packmind/compare/release/{{version}}...HEAD
     ```

   * Commit with message: `chore: prepare next development cycle`

5. **Push all commits** to GitHub

<br />

Important notes:

* Do NOT use `--no-verify` when committing
* Verify each commit was successful before proceeding to the next step
* The date must be in ISO 8601 format (YYYY-MM-DD)