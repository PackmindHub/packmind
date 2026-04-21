---
name: 'release-app'
description: 'Create and push a Packmind release by verifying a clean git state, bumping package versions, updating CHANGELOG links and dates, tagging `release/{{version}}`, and preparing the next Unreleased section to ensure a consistent, traceable release workflow when publishing a new version.'
---

Create a Packmind release with version {{version}}. Follow these steps:

0. **Confirm Feature Flag Audit has been run (MANDATORY PRE-CHECK)**:

   Before doing ANY other step, stop and ask the user to confirm that the `feature-flags-audit` skill has been invoked on the `packmind-proprietary` repository. The purpose of this check is to avoid shipping a release that still contains feature flags which should have been removed.

   Ask the user explicitly:

   > Has the `feature-flags-audit` skill been run on `packmind-proprietary` prior to this release? (yes / no)

   * If the user answers **yes**, proceed to step 1.
   * If the user answers **no** (or anything other than an explicit yes), **abort the release** and instruct the user to run the `feature-flags-audit` skill first, review the resulting report, remove any stale/shipped flags, and then re-invoke this skill.

   Do NOT proceed to step 1 until the user has explicitly confirmed with `yes`.

1. **Verify clean git status**: Check that `git status` shows no uncommitted changes. If there are changes, fail and ask the user to commit or stash them first.

2. **Update package.json files and CHANGELOG.MD for release (First commit)**:

   * Update the version in `package.json` to `{{version}}`

   * Update the version in `apps/api/docker-package.json` to `{{version}}`

   * Run `npm install` to update `package-lock.json` with the new version

   * In CHANGELOG.MD:

     * drop the empty sections under \[Unreleased]

     * Replace the `[Unreleased]` heading with `[{{version}}] - {{today_date}}` (use ISO 8601 format YYYY-MM-DD for the date)

     * Update the unreleased comparison link at the bottom to point to the new release:

       ```
       [{{version}}]: https://github.com/PackmindHub/packmind/compare/release/{{previous_version}}...release/{{version}}
       ```

     * Extract the previous version from the existing comparison links inCHANGELOG.MD

   * Commit with message: `chore: release {{version}}` (this commit will include package.json, apps/api/docker-package.json, package-lock.json, and CHANGELOG.MD)

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