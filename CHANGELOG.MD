# [Unreleased]

## Added

- A standard submitted from the CLI can now carry its scope. A `## Scope` section in a `.packmind/standards/*.md` file is read as the standard's glob patterns, so the coding agents that filter on file patterns get that filtering from a CLI publish instead of only from the web app. Patterns can be written comma-separated on one line or one per bullet. Standards distributed to `.packmind/standards/` now render their scope in that same section, so editing the file and submitting it back keeps the scope instead of dropping it. Previously the heading and its patterns silently became part of the description
- Check what Packmind tracks for the repository you are in with the new `packmind git info` command: it names the tracked branch, warns when the branch you are on is not the tracked one — distributions from there are not recorded — and tells you how to start tracking when the repository is not tracked at all. Reading the state needs no admin rights
- A marketplace with no Packmind plugin yet now carries the publish action instead of describing it, in one of three variants read from your data: the packages that can become plugins are listed with their space and their commands and skills, and each can be published from there with this marketplace already selected in the dialog; when none of your packages can become a plugin, the page states that a plugin needs at least one skill or command and links to each package so one can be added; when there is no package at all, it links to package creation in the default space. All three name the repository and branch behind the marketplace, so a marketplace linked to the wrong repository shows up immediately. When the marketplace descriptor already lists plugins Packmind does not manage, the page scopes its message to Packmind and counts those plugins instead of claiming the marketplace is empty.
- The marketplace page now checks the Git connection behind the marketplace when you open it, and leads with an alert whenever that connection is what blocks you: it names the connection, states the failure and the recovery in the same words as the Git page, and offers the repair before the re-check. When the credentials work again but the marketplace still carries the recorded authentication failure, the alert offers to reconcile it instead. A check that gets no answer stays silent rather than blaming the connection for a failure Packmind could not attribute.

## Changed

- **Breaking (CLI)**: `packmind track` and `packmind untrack` moved under the `git` command and are now `packmind git track` and `packmind git untrack`, joining `packmind git info`. Both flag spellings moved with them (`git track --branch <name>`, `git track --update`, and the two combined). The old names still parse but exit with an error naming their replacement, so scripts and CI jobs calling them must be updated
- The marketplace list now names the Git connection behind each marketplace ("via Acme GitHub") and states its health in words, replacing an 8px dot only readable on hover. Severity follows who has to act: a credential that stopped working or a transient failure is a warning an admin can clear from Packmind, while a repository that is gone or a descriptor that does not parse is an error nobody clears from here. The tooltip names the connection at fault and the recovery instead of restating the state.
- A disabled Sync button now names its cause: authentication when the connection's credentials stopped working, the repository when it can no longer be reached, the descriptor when it does not parse. It previously offered "Marketplace is unreachable or its descriptor is invalid" in every case, and never mentioned the one an admin can clear themselves. "Nothing to sync" still wins when no plugin has drifted.
- The Overview tab of a marketplace plugin now separates what the plugin ships from what it does not. Commands and skills are listed under "In this plugin"; the package's standards move to a "Not shipped" section stating that standards are distributed to repositories, not to marketplaces, with a tooltip explaining that the Claude Code plugin format has no slot for instruction files and pointing to repository distribution instead. Previously all three were listed together under "Bundled artifacts", which suggested standards were published to the marketplace when they never are.
- The "Publish to a marketplace" dialog now states what a publish will actually put on the marketplace — "Publishes 2 commands and 1 skill. 3 standards stay in the package: plugins don't carry standards." Previously it mentioned standards only when it refused a standards-only package, so a mixed package was published minus its standards without warning.
- On a marketplace with no plugin published yet, a publishable package now reads "2 skills, 3 commands · 4 standards not shipped" instead of listing the three counts together, so the standards are not presented as part of what the Publish button would send.

## Fixed

- A connection created through the GitHub App now keeps the name you typed. The name travels with the install and is applied when the connection is created, including on-prem where the app is registered first and the name has to survive two round trips to GitHub. Previously it was dropped the moment you left for GitHub and every App connection came back as "Unnamed GitHub connection". If the name was taken by another connection while you were on GitHub, the connection is still created — unnamed, ready to be renamed — rather than the install failing (#743).
- A Git connection whose credentials no longer work can no longer be picked in the "Link a marketplace" drawer. Every connection is checked when the drawer opens, and one that cannot authenticate stays listed and named but is disabled, with the failure and a link to repair it under the field; it is no longer auto-selected either when it is the organization's only connection. Previously it passed the drawer's filter on having stored credentials and dead-ended on a repository list that failed to load (#751).
- Editing a standard no longer marks the plugins published from its package as outdated. Drift is now measured over the artifacts a plugin actually carries — commands and skills — so a standard edit no longer raises "Changes to publish" nor opens a pull request that changes no file. For the same reason, the plugin "Changes" tab lists command and skill changes only.

## Removed

# [1.16.2] - 2026-08-12

## Chores

- Removed most of the dead code under packages

# [1.16.1] - 2026-08-07

## Fixed

- Fix release to ensure correct versioning between OSS and proprietary.

# [1.16.0] - 2026-08-07

## Added

- Import skills from the web app: drag a folder onto the Skills import dialog, or choose one, and every skill it contains is listed and imported with a per-skill result. A skill that fails does not stop the others, and the summary says how many were imported
- Edit a skill's SKILL.md body and supporting Markdown files directly from the web app, with each save creating a new attributed version
- Set the repository and branch Packmind tracks from the CLI: new `packmind track` command (`--branch` to name a branch other than the one checked out, `--update` to move the tracked branch) and a tracking prompt during `packmind init` (organization admins only)
- Remove a repository's tracking from the CLI with `packmind untrack` (organization admins only). The repository leaves the Deployments overview and the Distribution History, and every distribution already recorded is kept — track the same branch again and the history reappears with new distributions appended

## Changed

- `packmind playbook add` accepts several paths at once, so a whole collection of skills can be staged in one command. A path that cannot be staged is reported on its own and no longer prevents the others
- `packmind playbook submit` applies what it can instead of aborting the whole batch. An artifact whose name is already taken is skipped and stays staged, the rest are submitted, and the command exits 1 so the skipped ones are not missed
- `packmind install` now records a distribution in Packmind only when it runs on the tracked repository and branch. Installing on an untracked repository, on a different branch, or outside a git repository completes locally but is not recorded, and the CLI explains why.
- Distribution History and the Deployments overview now show the branch your organization currently tracks, so a repository no longer appears twice under two branches. Moving the tracked branch is reversible: distributions recorded on the branch you leave are kept — never deleted — they simply stop being displayed, and they reappear with new ones appended if tracking moves back. Repositories that were never tracked keep showing every branch.

## Fixed

- Support registering the GitHub App on a GitHub organization by providing an optional organization when connecting

## Removed

- Do not generate `installedAt` property of `packmind-lock.json`

# [1.15.1] - 2026-06-15

## Added

- Enable rendering packmind artifacts in `~/.claude` #332
- Add GitHub App connection method in organization git settings

# [1.15.0] - 2026-05-23

## Added

- Add a "Distribute all" button on the space deployment overview to redistribute all outdated packages in one batch action
- Show the last distribution status and date for each package on the space deployment overview
- Support new skill frontmatter fields: `arguments` for Claude Code, `paths` for Cursor, and `context` (experimental) for GitHub Copilot
- Add a button to add artifacts to packages from the standards/commands/skills lists and detail pages

## Fixed

- Skill descriptions longer than 1024 characters are now rejected with a clear 400 error on the playbook accept path instead of failing with a generic server error

# [1.14.0] - 2026-05-06

## Added

- Support new Claude Code skill frontmatter fields: `when_to_use`, `paths`, and `shell` (validated to `bash` or `powershell`)
- Added `--skip-installed-at` flag on `install` command to avoid merge issues when working with multiple branches.
- Space admins can now configure space identity (name and color) from the space general settings page - Enterprise version only
- Org admins can manage all spaces from a dedicated management page with search, filters, and per-space drawer - Enterprise version only

## Changed

- Default skill set reduced from 4 to 2: `packmind-create-package` and `packmind-cli-list-commands` are deprecated and removed from the setup page. Package creation is handled by `packmind-onboard`; artifact discovery is handled directly by the CLI (`packmind-cli packages list`, `standards list`, `commands list`, `skills list`).

## Fixed

- Make the skill files tree scrollable on skill details page

# [1.13.1] - 2026-04-15

## Fixed

- Fix issue with feature-flag that prevented users to create new space

# [1.13.0] - 2026-04-15

## Added

- Support OpenCode as a new AI coding agent: standards rendered in `AGENTS.md`, commands and skills deployed to `.opencode/commands/` and `.opencode/skills/`
- Support Codex as a new AI coding agent: standards rendered in `AGENTS.md`, skills deployed to `.agents/skills/`
- Introduce spaces to organize artifacts and packages in an organization - Enterprise version only

## Changed

- Updated `packmind-playbook-update` skill to support the new `playbook` commands of the cli

# [1.12.0] - 2026-03-25

## Added

- Support custom additional properties in skills (e.g. Claude Code fields like `argument-hint`, `model`, `hooks`) stored as JSONB and tracked via change proposals (#206)

## Changed

- Improve UI of the sidebar

## Fixed

- Fixed navigation issues when switching across spaces and organizations

# [1.11.1] - 2026-03-23

## Fixed

- Distribution analytics were broken because `@space/package` slug format from the CLI was not matched against bare `package` slugs in the database, resulting in no `distributed_packages` or artifact version associations being created

# [1.11.0] - 2026-03-20

## Added

- Reviewers can now edit change proposals before accepting them — edited proposals show both the original and edited diffs, with an "Edited" badge and a "Reset to original" option
- Add Dart programming language support: `.dart` file recognition, syntax highlighting, and language selection (#183)
- Show package inclusion on artifact list and detail pages with improved dropdown UX (#188)
- Rules can now be linted with severity error (default) or warning - Enterprise version only
- A user can provide a message when submitting change proposals (#142)
- The `diff` command now detects updated rules using similarity matching: when a rule is modified rather than deleted and re-added, it is submitted as an `updateRule` change proposal
- Add API support for `packmind-lock` file generation and version tracking
- Render skills for GitLab Duo in `.gitlab/duo/skills/` using multi-file deployment with YAML frontmatter

## Changed

- Commands are now rendered directly in `.claude/commands/` and `.cursor/commands/` instead of the `packmind` subdirectory, with automatic cleanup of the legacy path on next deploy

## Fixed

- Skill subfiles (references/, scripts/, assets/) were lost during push deployment for previously deployed skills (#125)
- Claude Code scope paths are now correctly rendered as YAML block sequences (#282)
- `packmind-create-standard` skill now documents scope as comma-separated glob patterns instead of natural language, preventing standards from never matching files (#181)
- File permissions are now correctly preserved during Git deployments to GitHub and GitLab, preventing spurious commits and mode resets (#218)

# [1.10.0] - 2026-02-24

## Added

- Support social login thanks to WorkOS
- Creators or standards, commands and skills are now displayed

## Changed

- Added blank-states for standards, commands and skills

## Fixed

- Fix organization name field auto-refilling instead of showing validation error during sign-up
- Several security issues following a pentest report led by external auditor
- Several improvements to the default skills `packmind-create-standard` and `packmind-create-skills`

# [1.9.0] - 2026-02-06

## Added

- Post-signup onboarding flow with MCP setup guide for AI coding assistants
- Create packages with the CLI using `packmind-cli packages create <name>`
- Create commands with the CLI using `packmind-cli commands create <playbook.json>`
- List standards, commands, and skills with the CLI using `packmind-cli standards list`, `packmind-cli commands list`, and `packmind-cli skills list`
- packmind-onboard skill with structured step-based guidance and AI-driven project analysis
- Add `agents` property in `packmind.json` to configure agents rendering for a target level

# [1.8.0] - 2025-01-28

## Added

- Render skills for GitHub Copilot, Claude Code and Skills (#71)
- Provide downloadable skills to ease managing the playbook
- Delete skills from the app
- Create commands from the app

## Changed

- Overview now displays artifacts that need removal from repositories

# [1.7.0] - 2025-01-07

## Added

## Changed

- split `install_package` MCP tool into two tools (`install_package` and `render_package`) to ensure the agents do not skip some tasks.
- renamed `recipe` to `command` #85
- render commands for Cursor #88
- render commands for Claude Code #86
- render standards as Claude Code rules #87
- render commands in `.packmind/commands/` folder (renamed from `recipes/`) #90

## Fixed

## Removed

# [1.6.0] - 2025-12-22

## Added

- Add possibility to install a package through MCP #54
- Track distribution of packages installed using the command line #38
- Support rendering for Continue.dev #52
- Enable removing packages from the app.

## Changed

- Package form badges for standards and recipes are now clickable links that open in new tabs for easy preview

## Fixed

- On self-hosted versions, fixed a case where the `APP_WEB_URL` ends with a `/` and raised issues

## Removed

- Recipe usage analytics and tracking system
- Deleted standards are properly removed from packages #34

# [1.5.0] - 2025-12-05

## Added

- AI provider is now configurable at organization level from the settings menu (#11)

## Changed

- Structure and formulation of the rules generated through MCP has been improved (#13)

## Fixed

- Server error when switching organization from the rule pages
- Deleted standards and recipes are now properly removed from packages, preventing UUID display and edit issues (#34)

# [1.4.1] - 2025-11-25

## Fixed

- Navigation issues on code examples for rules

# [1.4.0] - 2025-11-21

## Added

- Create and deploy packages to bundle standards and recipes together for organized distribution (#7)

# [1.3.1] - 2025-10-28

## Changed

- Improved the capture of Standards & Recipes through MCP, adding feedback loop and validation from the users (#265)
- The navigation is now scoped to the space `global`, as we're working on the concept of spaces to organize Standards & Recipes (#291)
- UI/UX of overview has been improved (#263)

## Fixed

- Ensure emails are not displayed in server logs (#270)

# [1.3.0] - 2025-10-09

## Added

- Rendering for AI Agents can be configured for each organization (#236)

## Changed

- The Overview layout has improved for better navigation (#263)

## Fixed

- Git repositories and target were not available in the web app until refreshed (#254)
- Issue with Webhook URL has been fixed (#239)
- Docker images are now available in Arm64 in addition to Amd64 (#225)

# [1.2.1] - 2025-10-03

## Changed

- Various UI/UX improvements

# [1.2.0] - 2025-10-02

## Added

- Add admin/member role system (#187)
- A user can create multiple organizations (#186)
- A user can reset their password (#188)

## Changed

- Redesign organization dashboard (#216)
- Harmonize standards/recipes pages (#136)

# [1.1.1] - 2025-09-26

## Changed

- Overview is now grouped by Targets (#172)
- Multiple UI improvements
- Add MCP tool to create first standards

# [1.1.0] - 2025-09-22

## Added

- Introduce the concept of `Targets` to distribute recipes and standards in specific folders on a repo, which makes sense in a mono-repo context (#137)
- Creation of standards is now available through MCP (#178)

## Changed

- Improve rendering of the standards and recipes for AI Agents (#181)
- Improve UI/UX settings for the configuration of Git providers (#155)

## Fixed

- Rendering of recipes index was not properly updated in some edge cases (#101)

# [1.0.1] - 2025-09-11

## Added

- Support AGENTS.md as new target AI Agent (#123)

## Changed

- Improve UI for recipes deployments (#109)
- Better support for programming languages in rule code examples (#116)
- Improve UI/UX and sign-up and sign-in pages (#117)
- Rules are no longer required when creating or updating a standard (#120)

## Fixed

- Code examples for rules are properly saved when new standard versions are created (#121)
- A standard with the same name as a previously deleted one can now be deleted (#135)
- Fix redirection after deleting a standard (#145)

# [1.0.0] - 2025-09-05

## Added

- Create and manage versioned coding standards with rules and guidelines
- Build structured coding recipes for repeatable development workflows
- Deploy standards and recipes to GitHub and GitLab repositories
- Generate AI agent instructions for Cursor, GitHub Copilot, Claude Code, and Junie
- Connect multiple Git providers with token-based authentication
- Create recipes directly from AI agent sessions via MCP server integration
- Add rules to standards using natural language commands
- Track deployment status and identify outdated content across repositories
- Bulk deployment across multiple repositories with atomic commits
- Optional OpenAI integration for enhanced AI-powered features

[Unreleased]: https://github.com/PackmindHub/packmind/compare/release/1.16.2...HEAD
[1.16.2]: https://github.com/PackmindHub/packmind/compare/release/1.16.1...release/1.16.2
[1.16.1]: https://github.com/PackmindHub/packmind/compare/release/1.16.0...release/1.16.1
[1.16.0]: https://github.com/PackmindHub/packmind/compare/release/1.15.1...release/1.16.0
[1.15.1]: https://github.com/PackmindHub/packmind/compare/release/1.15.0...release/1.15.1
[1.15.0]: https://github.com/PackmindHub/packmind/compare/release/1.14.0...release/1.15.0
[1.14.0]: https://github.com/PackmindHub/packmind/compare/release/1.13.1...release/1.14.0
[1.13.1]: https://github.com/PackmindHub/packmind/compare/release/1.13.0...release/1.13.1
[1.13.0]: https://github.com/PackmindHub/packmind/compare/release/1.12.0...release/1.13.0
[1.12.0]: https://github.com/PackmindHub/packmind/compare/release/1.11.1...release/1.12.0
[1.11.1]: https://github.com/PackmindHub/packmind/compare/release/1.11.0...release/1.11.1
[1.11.0]: https://github.com/PackmindHub/packmind/compare/release/1.10.0...release/1.11.0
[1.10.0]: https://github.com/PackmindHub/packmind/compare/release/1.9.0...release/1.10.0
[1.9.0]: https://github.com/PackmindHub/packmind/compare/release/1.8.0...release/1.9.0
[1.8.0]: https://github.com/PackmindHub/packmind/compare/release/1.7.0...release/1.8.0
[1.7.0]: https://github.com/PackmindHub/packmind/compare/release/1.6.0...release/1.7.0
[1.6.0]: https://github.com/PackmindHub/packmind/compare/release/1.5.0...release/1.6.0
[1.5.0]: https://github.com/PackmindHub/packmind/compare/release/1.4.1...release/1.5.0
[1.4.1]: https://github.com/PackmindHub/packmind/compare/release/1.4.0...release/1.4.1
[1.4.0]: https://github.com/PackmindHub/packmind/compare/release/1.3.1...release/1.4.0
[1.3.1]: https://github.com/PackmindHub/packmind/compare/release/1.3.0...release/1.3.1
[1.3.0]: https://github.com/PackmindHub/packmind/compare/release/1.2.1...release/1.3.0
[1.2.1]: https://github.com/PackmindHub/packmind/compare/release/1.2.0...release/1.2.1
[1.2.0]: https://github.com/PackmindHub/packmind/compare/release/1.1.1...release/1.2.0
[1.1.1]: https://github.com/PackmindHub/packmind/compare/release/1.1.0...release/1.1.1
[1.1.0]: https://github.com/PackmindHub/packmind/compare/release/1.0.1...release/1.1.0
[1.0.1]: https://github.com/PackmindHub/packmind/compare/release/1.0.0...release/1.0.1
[1.0.0]: https://github.com/PackmindHub/packmind/compare/97dce6228693e6f477654dd0018cca583cc95e8c...release/1.0.0
